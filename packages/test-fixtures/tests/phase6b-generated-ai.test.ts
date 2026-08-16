import {
  advanceRound,
  applyGameplayCommand,
  assertValidAuthoritativeState,
  createSeededRandomSource,
  deepFreeze,
  projectPlayerObservation,
  startMatch,
  type AdvanceRoundCommandV1,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type GameplayCommandV1,
  type LegalActionV1,
  type MatchLength,
  type PlayerId,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  CPU_DECISION_REASONS,
  CPU_DIFFICULTIES,
  CPU_PERSONALITIES,
  chooseFairCpuDecision,
  type CpuDifficultyV1,
  type CpuPersonalityV1,
} from "../../../apps/web/src/ai/fair-heuristic";

declare const console: { log: (message: string) => void };

const DEFAULT_TRIALS = 270;
const DEFAULT_OFFSET = 0;
const MAX_COMMANDS_PER_MATCH = 2_000;
const CPU_PLAYER_ID = "player-b" as const;
const CELL_SIZE = CPU_PERSONALITIES.length * CPU_DIFFICULTIES.length * 3;

interface CellMetricsV1 {
  bankChoices: number;
  captures: number;
  koiKoiChoices: number;
  score: number;
  trials: number;
}

interface DifficultyEvidenceV1 {
  comparisons: number;
  hardEasyDivergences: number;
  standardEasyDivergences: number;
}

interface GateCountersV1 {
  illegalActions: number;
  noActionReturns: number;
}

interface TrialResultV1 {
  readonly difficulty: CpuDifficultyV1;
  readonly matchLength: MatchLength;
  readonly personality: CpuPersonalityV1;
  readonly state: AuthoritativeGameStateV1;
}

function configuredInteger(
  name: "PHASE6B_GENERATED_OFFSET" | "PHASE6B_GENERATED_TRIALS",
  fallback: number,
): number {
  const configured = (
    globalThis as typeof globalThis & {
      readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> };
    }
  ).process?.env?.[name];
  if (configured === undefined) return fallback;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value < 0 || (name.endsWith("TRIALS") && value < 1)) {
    throw new Error(
      `${name} must be a ${name.endsWith("TRIALS") ? "positive" : "non-negative"} safe integer.`,
    );
  }
  return value;
}

function seedForCell(seedIndex: number): string {
  return (BigInt(seedIndex) + 1n).toString(16).padStart(32, "0");
}

function personalityForTrial(globalTrial: number): CpuPersonalityV1 {
  const value = CPU_PERSONALITIES[globalTrial % CPU_PERSONALITIES.length];
  if (value === undefined) throw new Error("PHASE6B_PERSONALITY_MISSING");
  return value;
}

function difficultyForTrial(globalTrial: number): CpuDifficultyV1 {
  const value =
    CPU_DIFFICULTIES[Math.floor(globalTrial / CPU_PERSONALITIES.length) % CPU_DIFFICULTIES.length];
  if (value === undefined) throw new Error("PHASE6B_DIFFICULTY_MISSING");
  return value;
}

function matchLengthForTrial(globalTrial: number): MatchLength {
  const lengths = [3, 6, 12] as const satisfies readonly MatchLength[];
  const value =
    lengths[
      Math.floor(globalTrial / (CPU_PERSONALITIES.length * CPU_DIFFICULTIES.length)) %
        lengths.length
    ];
  if (value === undefined) throw new Error("PHASE6B_MATCH_LENGTH_MISSING");
  return value;
}

function cellKey(
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
  matchLength: MatchLength,
): string {
  return `${personality}:${difficulty}:${matchLength}`;
}

function commandFromAction(
  state: AuthoritativeGameStateV1,
  action: LegalActionV1,
  commandId: string,
): GameplayCommandV1 {
  const base = {
    commandId,
    matchId: state.matchId,
    actorId: action.actorId,
    expectedStateVersion: state.stateVersion,
  };
  if (action.type === "playHandCard") {
    return deepFreeze({
      ...base,
      type: "playHandCard" as const,
      cardId: action.cardId,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    });
  }
  if (action.type === "resolveDrawCard") {
    return deepFreeze({
      ...base,
      type: "resolveDrawCard" as const,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    });
  }
  return deepFreeze({ ...base, type: "chooseYakuDecision" as const, choice: action.choice });
}

function activePlayerId(state: AuthoritativeGameStateV1): PlayerId {
  if (
    state.phase.kind !== "awaitingHandPlay" &&
    state.phase.kind !== "awaitingDrawResolution" &&
    state.phase.kind !== "awaitingYakuDecision"
  ) {
    throw new Error(`PHASE6B_ACTIVE_PLAYER_UNAVAILABLE: ${state.phase.kind}`);
  }
  return state.phase.playerId;
}

function baselineAction(actions: readonly LegalActionV1[]): LegalActionV1 {
  const action = actions[0];
  if (!action) throw new Error("PHASE6B_BASELINE_NO_LEGAL_ACTION");
  return action;
}

function actionSignature(action: LegalActionV1): string {
  return JSON.stringify(action);
}

function assertCpuDecision(
  observation: ReturnType<typeof projectPlayerObservation>,
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
  counters: GateCountersV1,
) {
  const decision = chooseFairCpuDecision(observation, personality, difficulty);
  if (decision === null) {
    counters.noActionReturns += 1;
    throw new Error(`PHASE6B_CPU_RETURNED_NO_ACTION: ${personality}:${difficulty}`);
  }
  if (!observation.legalActions.includes(decision.action)) {
    counters.illegalActions += 1;
    throw new Error(`PHASE6B_CPU_ACTION_NOT_LEGAL: ${personality}:${difficulty}`);
  }
  if (!CPU_DECISION_REASONS.includes(decision.reason)) {
    throw new Error(`PHASE6B_DECISION_REASON_INVALID: ${decision.reason}`);
  }
  if (
    !Number.isFinite(decision.confidence) ||
    decision.confidence < 0 ||
    decision.confidence > 1 ||
    decision.confidence * 100 !== Math.round(decision.confidence * 100)
  ) {
    throw new Error(`PHASE6B_DECISION_CONFIDENCE_INVALID: ${decision.confidence}`);
  }
  return decision;
}

function runCpuTrial(
  globalTrial: number,
  metrics: Map<string, CellMetricsV1>,
  counters: GateCountersV1,
  evidence: DifficultyEvidenceV1,
): TrialResultV1 {
  const personality = personalityForTrial(globalTrial);
  const difficulty = difficultyForTrial(globalTrial);
  const matchLength = matchLengthForTrial(globalTrial);
  const seedIndex = Math.floor(globalTrial / CELL_SIZE);
  const matchId = `phase6b-${globalTrial}-${personality}-${difficulty}-${matchLength}`;
  const initial = startMatch(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength,
      starterPolicy: { kind: "chooseWithRng" },
    },
    createSeededRandomSource(seedForCell(seedIndex)),
  );
  let state = initial.state;
  let checkpoint: EngineCheckpointV1 = initial.checkpoint;
  let cpuBankChoices = 0;
  let cpuKoiKoiChoices = 0;

  for (let sequence = 2; sequence <= MAX_COMMANDS_PER_MATCH; sequence += 1) {
    assertValidAuthoritativeState(state);
    if (state.phase.kind === "matchComplete") {
      const cpu = state.players.find(({ id }) => id === CPU_PLAYER_ID);
      if (!cpu) throw new Error("PHASE6B_CPU_PLAYER_MISSING");
      const aggregate = metrics.get(cellKey(personality, difficulty, matchLength));
      if (!aggregate) throw new Error("PHASE6B_METRICS_CELL_MISSING");
      aggregate.trials += 1;
      aggregate.captures += cpu.captured.length;
      aggregate.score += cpu.score;
      aggregate.bankChoices += cpuBankChoices;
      aggregate.koiKoiChoices += cpuKoiKoiChoices;
      return Object.freeze({ difficulty, matchLength, personality, state });
    }
    const previousVersion = state.stateVersion;
    if (state.phase.kind === "roundComplete") {
      const command: AdvanceRoundCommandV1 = deepFreeze({
        type: "advanceRound",
        commandId: `${matchId}:advance:${sequence}`,
        matchId,
        expectedStateVersion: state.stateVersion,
      });
      const transition = advanceRound(state, command, checkpoint);
      state = transition.state;
      checkpoint = transition.checkpoint;
    } else {
      const actorId = activePlayerId(state);
      const observation = projectPlayerObservation(state, actorId);
      if (observation.legalActions.length === 0) {
        if (actorId === CPU_PLAYER_ID) counters.noActionReturns += 1;
        throw new Error(`PHASE6B_ACTIVE_PLAYER_NO_ACTION: ${state.phase.kind}`);
      }
      let action: LegalActionV1;
      if (actorId === CPU_PLAYER_ID) {
        const easy = assertCpuDecision(observation, personality, "easy", counters);
        const standard = assertCpuDecision(observation, personality, "standard", counters);
        const hard = assertCpuDecision(observation, personality, "hard", counters);
        evidence.comparisons += 1;
        if (actionSignature(standard.action) !== actionSignature(easy.action)) {
          evidence.standardEasyDivergences += 1;
        }
        if (actionSignature(hard.action) !== actionSignature(easy.action)) {
          evidence.hardEasyDivergences += 1;
        }
        const selected = difficulty === "easy" ? easy : difficulty === "standard" ? standard : hard;
        action = selected.action;
        if (action.type === "chooseYakuDecision") {
          if (action.choice === "bank") cpuBankChoices += 1;
          else cpuKoiKoiChoices += 1;
        }
      } else {
        action = baselineAction(observation.legalActions);
      }
      state = applyGameplayCommand(
        state,
        commandFromAction(state, action, `${matchId}:command:${sequence}`),
      ).state;
    }
    if (state.stateVersion !== previousVersion + 1) {
      throw new Error(`PHASE6B_STATE_VERSION_INVALID: ${previousVersion} -> ${state.stateVersion}`);
    }
  }
  throw new Error(`PHASE6B_COMMAND_LIMIT_EXCEEDED: ${matchId}`);
}

function initialMetrics(): Map<string, CellMetricsV1> {
  const metrics = new Map<string, CellMetricsV1>();
  for (const personality of CPU_PERSONALITIES) {
    for (const difficulty of CPU_DIFFICULTIES) {
      for (const matchLength of [3, 6, 12] as const satisfies readonly MatchLength[]) {
        metrics.set(cellKey(personality, difficulty, matchLength), {
          bankChoices: 0,
          captures: 0,
          koiKoiChoices: 0,
          score: 0,
          trials: 0,
        });
      }
    }
  }
  return metrics;
}

function expectedTrialsForCell(
  offset: number,
  trials: number,
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
  matchLength: MatchLength,
): number {
  return Array.from({ length: trials }, (_, index) => offset + index).filter(
    (globalTrial) =>
      personalityForTrial(globalTrial) === personality &&
      difficultyForTrial(globalTrial) === difficulty &&
      matchLengthForTrial(globalTrial) === matchLength,
  ).length;
}

function personalityDifficultyMetrics(
  metrics: ReadonlyMap<string, CellMetricsV1>,
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
): CellMetricsV1 {
  return ([3, 6, 12] as const satisfies readonly MatchLength[]).reduce(
    (total, matchLength) => {
      const metric = metrics.get(cellKey(personality, difficulty, matchLength));
      if (!metric) throw new Error("PHASE6B_DIRECTIONAL_CELL_MISSING");
      return {
        bankChoices: total.bankChoices + metric.bankChoices,
        captures: total.captures + metric.captures,
        koiKoiChoices: total.koiKoiChoices + metric.koiKoiChoices,
        score: total.score + metric.score,
        trials: total.trials + metric.trials,
      };
    },
    { bankChoices: 0, captures: 0, koiKoiChoices: 0, score: 0, trials: 0 },
  );
}

describe("Phase 6B generated fair CPU legality gate", () => {
  it(
    "completes assigned personality, difficulty, format, and seed cells with legal explained actions",
    { timeout: 120_000 },
    () => {
      const offset = configuredInteger("PHASE6B_GENERATED_OFFSET", DEFAULT_OFFSET);
      const trials = configuredInteger("PHASE6B_GENERATED_TRIALS", DEFAULT_TRIALS);
      if (offset > Number.MAX_SAFE_INTEGER - (trials - 1)) {
        throw new Error("PHASE6B_GENERATED_RANGE_INVALID");
      }
      const metrics = initialMetrics();
      const counters: GateCountersV1 = { illegalActions: 0, noActionReturns: 0 };
      const evidence: DifficultyEvidenceV1 = {
        comparisons: 0,
        hardEasyDivergences: 0,
        standardEasyDivergences: 0,
      };
      const results: TrialResultV1[] = [];
      for (let localTrial = 0; localTrial < trials; localTrial += 1) {
        results.push(runCpuTrial(offset + localTrial, metrics, counters, evidence));
      }
      expect(results).toHaveLength(trials);
      expect(results.every(({ state }) => state.phase.kind === "matchComplete")).toBe(true);
      for (const personality of CPU_PERSONALITIES) {
        for (const difficulty of CPU_DIFFICULTIES) {
          for (const matchLength of [3, 6, 12] as const satisfies readonly MatchLength[]) {
            const metric = metrics.get(cellKey(personality, difficulty, matchLength));
            if (!metric) throw new Error("PHASE6B_METRICS_OUTPUT_MISSING");
            expect(metric.trials).toBe(
              expectedTrialsForCell(offset, trials, personality, difficulty, matchLength),
            );
            expect(metric.captures).toBeGreaterThanOrEqual(0);
            expect(metric.score).toBeGreaterThanOrEqual(0);
          }
        }
      }
      expect(counters.illegalActions).toBe(0);
      expect(counters.noActionReturns).toBe(0);
      expect(evidence.comparisons).toBeGreaterThan(0);
      if (trials === DEFAULT_TRIALS && offset % CELL_SIZE === 0) {
        for (const metric of metrics.values())
          expect(metric.trials).toBe(DEFAULT_TRIALS / CELL_SIZE);
        expect(evidence.standardEasyDivergences).toBeGreaterThan(0);
        expect(evidence.hardEasyDivergences).toBeGreaterThan(0);
        for (const difficulty of CPU_DIFFICULTIES) {
          const timid = personalityDifficultyMetrics(metrics, "timid", difficulty);
          const monk = personalityDifficultyMetrics(metrics, "monk", difficulty);
          const gambler = personalityDifficultyMetrics(metrics, "gambler", difficulty);
          expect(timid.bankChoices).toBeGreaterThan(monk.bankChoices);
          expect(monk.bankChoices).toBeGreaterThan(gambler.bankChoices);
          expect(timid.koiKoiChoices).toBeLessThan(monk.koiKoiChoices);
          expect(monk.koiKoiChoices).toBeLessThan(gambler.koiKoiChoices);
        }
      }
      console.log(
        `[phase6b-generated] offset=${offset} trials=${trials} counters=${JSON.stringify(counters)} difficultyEvidence=${JSON.stringify(evidence)} metrics=${JSON.stringify(Object.fromEntries(metrics))}`,
      );
    },
  );
});
