import {
  CARD_IDS,
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
  CPU_PERSONALITIES,
  chooseFairCpuAction,
  type CpuPersonalityV1,
} from "../../../apps/web/src/ai/fair-heuristic";

declare const console: { log: (message: string) => void };

const DEFAULT_TRIALS = 90;
const DEFAULT_OFFSET = 0;
const MAX_COMMANDS_PER_MATCH = 2_000;
const CPU_PLAYER_ID = "player-b" as const;

interface PersonalityMetricsV1 {
  bankChoices: number;
  captures: number;
  koiKoiChoices: number;
  score: number;
  trials: number;
}

interface TrialResultV1 {
  readonly commands: number;
  readonly personality: CpuPersonalityV1;
  readonly state: AuthoritativeGameStateV1;
}

interface GateCountersV1 {
  illegalActions: number;
  noActionReturns: number;
}

function configuredInteger(
  name: "PHASE6A_GENERATED_OFFSET" | "PHASE6A_GENERATED_TRIALS",
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

function seedForTrial(globalTrial: number): string {
  return (BigInt(globalTrial) + 1n).toString(16).padStart(32, "0");
}

function cardIndex(cardId: string | undefined): number {
  return cardId === undefined
    ? CARD_IDS.length
    : (CARD_IDS.indexOf(cardId as (typeof CARD_IDS)[number]) ?? CARD_IDS.length);
}

function canonicalActionKey(action: LegalActionV1): readonly number[] {
  if (action.type === "playHandCard") {
    return [0, cardIndex(action.cardId), cardIndex(action.targetFieldCardId), 0];
  }
  if (action.type === "resolveDrawCard") {
    return [1, cardIndex(action.drawnCardId), cardIndex(action.targetFieldCardId), 0];
  }
  return [2, CARD_IDS.length, CARD_IDS.length, action.choice === "bank" ? 0 : 1];
}

function compareCanonicalAction(left: LegalActionV1, right: LegalActionV1): number {
  const leftKey = canonicalActionKey(left);
  const rightKey = canonicalActionKey(right);
  for (let index = 0; index < leftKey.length; index += 1) {
    const difference = (leftKey[index] ?? 0) - (rightKey[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function baselineAction(actions: readonly LegalActionV1[]): LegalActionV1 {
  const action = [...actions].sort(compareCanonicalAction)[0];
  if (!action) throw new Error("PHASE6A_BASELINE_NO_LEGAL_ACTION");
  return action;
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
    throw new Error(`PHASE6A_ACTIVE_PLAYER_UNAVAILABLE: ${state.phase.kind}`);
  }
  return state.phase.playerId;
}

function matchLengthForTrial(globalTrial: number): MatchLength {
  const lengths = [3, 6, 12] as const satisfies readonly MatchLength[];
  const value = lengths[Math.floor(globalTrial / CPU_PERSONALITIES.length) % lengths.length];
  if (value === undefined) throw new Error("PHASE6A_MATCH_LENGTH_MISSING");
  return value;
}

function personalityForTrial(globalTrial: number): CpuPersonalityV1 {
  const value = CPU_PERSONALITIES[globalTrial % CPU_PERSONALITIES.length];
  if (value === undefined) throw new Error("PHASE6A_PERSONALITY_MISSING");
  return value;
}

function runCpuTrial(
  globalTrial: number,
  metrics: Map<CpuPersonalityV1, PersonalityMetricsV1>,
  counters: GateCountersV1,
): TrialResultV1 {
  const personality = personalityForTrial(globalTrial);
  const matchLength = matchLengthForTrial(globalTrial);
  const matchId = `phase6a-${globalTrial}-${personality}-${matchLength}`;
  const initial = startMatch(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength,
      starterPolicy: { kind: "chooseWithRng" },
    },
    createSeededRandomSource(seedForTrial(globalTrial)),
  );
  let state = initial.state;
  let checkpoint: EngineCheckpointV1 = initial.checkpoint;
  let commandCount = 1;
  let cpuBankChoices = 0;
  let cpuKoiKoiChoices = 0;

  for (let sequence = 2; sequence <= MAX_COMMANDS_PER_MATCH; sequence += 1) {
    assertValidAuthoritativeState(state);
    if (state.phase.kind === "matchComplete") {
      const cpu = state.players.find(({ id }) => id === CPU_PLAYER_ID);
      if (!cpu) throw new Error("PHASE6A_CPU_PLAYER_MISSING");
      const aggregate = metrics.get(personality);
      if (!aggregate) throw new Error("PHASE6A_METRICS_PERSONALITY_MISSING");
      aggregate.trials += 1;
      aggregate.captures += cpu.captured.length;
      aggregate.score += cpu.score;
      aggregate.bankChoices += cpuBankChoices;
      aggregate.koiKoiChoices += cpuKoiKoiChoices;
      return Object.freeze({ commands: commandCount, personality, state });
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
      commandCount += 1;
    } else {
      const actorId = activePlayerId(state);
      const observation = projectPlayerObservation(state, actorId);
      const actions = observation.legalActions;
      if (actions.length === 0) {
        if (actorId === CPU_PLAYER_ID) counters.noActionReturns += 1;
        throw new Error(`PHASE6A_ACTIVE_PLAYER_NO_ACTION: ${personality}:${state.phase.kind}`);
      }
      const action =
        actorId === CPU_PLAYER_ID
          ? chooseFairCpuAction(observation, personality)
          : baselineAction(actions);
      if (action === null) {
        counters.noActionReturns += 1;
        throw new Error(`PHASE6A_CPU_RETURNED_NO_ACTION: ${personality}:${state.phase.kind}`);
      }
      if (!actions.includes(action)) {
        if (actorId === CPU_PLAYER_ID) counters.illegalActions += 1;
        throw new Error(`PHASE6A_CPU_ACTION_NOT_LEGAL: ${personality}:${state.phase.kind}`);
      }
      if (actorId === CPU_PLAYER_ID && action.type === "chooseYakuDecision") {
        if (action.choice === "bank") cpuBankChoices += 1;
        else cpuKoiKoiChoices += 1;
      }
      state = applyGameplayCommand(
        state,
        commandFromAction(state, action, `${matchId}:command:${sequence}`),
      ).state;
      commandCount += 1;
    }
    if (state.stateVersion !== previousVersion + 1) {
      throw new Error(`PHASE6A_STATE_VERSION_INVALID: ${previousVersion} -> ${state.stateVersion}`);
    }
  }
  throw new Error(`PHASE6A_COMMAND_LIMIT_EXCEEDED: ${matchId}`);
}

function initialMetrics(): Map<CpuPersonalityV1, PersonalityMetricsV1> {
  return new Map(
    CPU_PERSONALITIES.map((personality) => [
      personality,
      { bankChoices: 0, captures: 0, koiKoiChoices: 0, score: 0, trials: 0 },
    ]),
  );
}

describe("Phase 6A generated fair CPU legality gate", () => {
  it(
    "completes assigned seeded CPU-versus-canonical-baseline matches with legal observation-only actions",
    { timeout: 120_000 },
    () => {
      const offset = configuredInteger("PHASE6A_GENERATED_OFFSET", DEFAULT_OFFSET);
      const trials = configuredInteger("PHASE6A_GENERATED_TRIALS", DEFAULT_TRIALS);
      if (offset > Number.MAX_SAFE_INTEGER - (trials - 1)) {
        throw new Error("PHASE6A_GENERATED_RANGE_INVALID");
      }
      const metrics = initialMetrics();
      const counters: GateCountersV1 = { illegalActions: 0, noActionReturns: 0 };
      const results: TrialResultV1[] = [];
      for (let localTrial = 0; localTrial < trials; localTrial += 1) {
        results.push(runCpuTrial(offset + localTrial, metrics, counters));
      }
      expect(results).toHaveLength(trials);
      expect(results.every(({ state }) => state.phase.kind === "matchComplete")).toBe(true);
      for (const personality of CPU_PERSONALITIES) {
        const metric = metrics.get(personality);
        if (!metric) throw new Error("PHASE6A_METRICS_OUTPUT_MISSING");
        const expectedTrials = Array.from({ length: trials }, (_, index) => offset + index).filter(
          (globalTrial) => personalityForTrial(globalTrial) === personality,
        ).length;
        expect(metric.trials).toBe(expectedTrials);
        expect(metric.captures).toBeGreaterThanOrEqual(0);
        expect(metric.score).toBeGreaterThanOrEqual(0);
      }
      expect(counters.illegalActions).toBe(0);
      expect(counters.noActionReturns).toBe(0);
      const timid = metrics.get("timid");
      const monk = metrics.get("monk");
      const gambler = metrics.get("gambler");
      if (!timid || !monk || !gambler) throw new Error("PHASE6A_DIRECTIONAL_METRICS_MISSING");
      if (
        trials === DEFAULT_TRIALS &&
        timid.trials === 30 &&
        monk.trials === 30 &&
        gambler.trials === 30
      ) {
        expect(timid.bankChoices).toBeGreaterThan(monk.bankChoices);
        expect(monk.bankChoices).toBeGreaterThan(gambler.bankChoices);
        expect(timid.koiKoiChoices).toBeLessThan(monk.koiKoiChoices);
        expect(monk.koiKoiChoices).toBeLessThan(gambler.koiKoiChoices);
      }
      console.log(
        `[phase6a-generated] offset=${offset} trials=${trials} counters=${JSON.stringify(counters)} metrics=${JSON.stringify(Object.fromEntries(metrics))}`,
      );
    },
  );
});
