/// <reference types="node" />

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  CARD_IDS,
  advanceRound,
  applyGameplayCommand,
  assertValidAuthoritativeState,
  canonicalStringifyV1,
  createSeededRandomSource,
  deepFreeze,
  projectPlayerObservation,
  sha256Hex,
  startMatch,
  type AdvanceRoundCommandV1,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type GameplayCommandV1,
  type LegalActionV1,
  type MatchLength,
  type PlayerId,
  type RoundResultV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { chooseRolloutCpuDecision } from "../../../apps/web/src/ai/rollout";
import {
  CPU_DIFFICULTIES,
  CPU_PERSONALITIES,
  type CpuDifficultyV1,
  type CpuPersonalityV1,
} from "../../../apps/web/src/ai/types";

declare const console: { log: (message: string) => void };

const CPU_PLAYER_ID = "player-b" as const;
const MATCH_LENGTHS = [3, 6, 12] as const satisfies readonly MatchLength[];
const DEFAULT_SEED_OFFSET = 0;
const DEFAULT_SEEDS = 1;
const DEFAULT_SHARD = 1;
const DEFAULT_SHARDS = 1;
const DEFAULT_ELAPSED_BUDGET_MS = 240_000;
const MAX_COMMANDS_PER_MATCH = 2_000;
const MATRIX_CELLS = CPU_PERSONALITIES.length * CPU_DIFFICULTIES.length * MATCH_LENGTHS.length;
const REPORT_DIRECTORY = resolve(process.cwd(), "output/phase-6c/reports");

interface ZeroCountersV1 {
  commandLimitExceeded: number;
  illegalActions: number;
  invalidStates: number;
  noActionReturns: number;
  nonFiniteMetrics: number;
}

interface CellAccumulatorV1 {
  automaticRounds: number;
  bankChoices: number;
  bankMultiplierTotal: number;
  bothLuckyDrawRounds: number;
  commands: number;
  cpuLosses: number;
  cpuScoreTotal: number;
  cpuTies: number;
  cpuWins: number;
  fieldCancellationRounds: number;
  firstPlayerLosses: number;
  firstPlayerTies: number;
  firstPlayerWins: number;
  forcedKoiChoices: number;
  koiKoiChoices: number;
  luckyWinRounds: number;
  matches: number;
  noScoreRounds: number;
  rounds: number;
  turns: number;
  yakuDecisions: number;
}

interface TrialConfigurationV1 {
  readonly difficulty: CpuDifficultyV1;
  readonly matchLength: MatchLength;
  readonly personality: CpuPersonalityV1;
  readonly seedIndex: number;
}

interface TrialResultV1 {
  readonly cell: CellAccumulatorV1;
  readonly state: AuthoritativeGameStateV1;
}

type Phase6cEnvironmentName =
  | "PHASE6C_GENERATED_SEED_OFFSET"
  | "PHASE6C_GENERATED_SEEDS"
  | "PHASE6C_GENERATED_SHARD"
  | "PHASE6C_GENERATED_SHARDS"
  | "PHASE6C_GENERATED_SHARD_TIMEOUT_MS";

function configuredInteger(
  name: Phase6cEnvironmentName,
  fallback: number,
  minimum: number,
): number {
  const configured = process.env[name];
  if (configured === undefined) return fallback;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be a safe integer greater than or equal to ${minimum}.`);
  }
  return value;
}

function startMatchSeed(seedIndex: number): string {
  return (BigInt(seedIndex) + 1n).toString(16).padStart(32, "0");
}

function rolloutRootSeed(configuration: TrialConfigurationV1): string {
  return sha256Hex(
    canonicalStringifyV1({
      namespace: "phase6c-generated-root-v1",
      matrix: configuration.seedIndex,
      personality: configuration.personality,
      difficulty: configuration.difficulty,
      matchLength: configuration.matchLength,
    }),
  );
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

function canonicalFirstLegalAction(actions: readonly LegalActionV1[]): LegalActionV1 {
  const action = [...actions].sort(compareCanonicalAction)[0];
  if (action === undefined) throw new Error("PHASE6C_CANONICAL_POLICY_NO_ACTION");
  return action;
}

function activePlayerId(state: AuthoritativeGameStateV1): PlayerId {
  if (
    state.phase.kind !== "awaitingHandPlay" &&
    state.phase.kind !== "awaitingDrawResolution" &&
    state.phase.kind !== "awaitingYakuDecision"
  ) {
    throw new Error(`PHASE6C_ACTIVE_PLAYER_UNAVAILABLE: ${state.phase.kind}`);
  }
  return state.phase.playerId;
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

function emptyCell(): CellAccumulatorV1 {
  return {
    automaticRounds: 0,
    bankChoices: 0,
    bankMultiplierTotal: 0,
    bothLuckyDrawRounds: 0,
    commands: 0,
    cpuLosses: 0,
    cpuScoreTotal: 0,
    cpuTies: 0,
    cpuWins: 0,
    fieldCancellationRounds: 0,
    firstPlayerLosses: 0,
    firstPlayerTies: 0,
    firstPlayerWins: 0,
    forcedKoiChoices: 0,
    koiKoiChoices: 0,
    luckyWinRounds: 0,
    matches: 0,
    noScoreRounds: 0,
    rounds: 0,
    turns: 0,
    yakuDecisions: 0,
  };
}

function recordRoundResult(cell: CellAccumulatorV1, result: RoundResultV1): void {
  cell.rounds += 1;
  if (result.kind === "fieldCancellation") {
    cell.fieldCancellationRounds += 1;
    cell.automaticRounds += 1;
  } else if (result.kind === "luckyWin") {
    cell.luckyWinRounds += 1;
    cell.automaticRounds += 1;
  } else if (result.kind === "bothLuckyDraw") {
    cell.bothLuckyDrawRounds += 1;
    cell.automaticRounds += 1;
  } else if (result.kind === "endOfPlayNoScore") {
    cell.noScoreRounds += 1;
  }
}

function recordCompletedMatch(
  cell: CellAccumulatorV1,
  state: AuthoritativeGameStateV1,
  initialStarterId: PlayerId,
): void {
  if (state.phase.kind !== "matchComplete") throw new Error("PHASE6C_MATCH_NOT_COMPLETE");
  const result = state.phase.result;
  cell.matches += 1;
  cell.cpuScoreTotal += result.finalScores[CPU_PLAYER_ID];
  if (result.winnerId === CPU_PLAYER_ID) cell.cpuWins += 1;
  else if (result.winnerId === null) cell.cpuTies += 1;
  else cell.cpuLosses += 1;

  if (result.winnerId === initialStarterId) cell.firstPlayerWins += 1;
  else if (result.winnerId === null) cell.firstPlayerTies += 1;
  else cell.firstPlayerLosses += 1;
  for (const roundResult of state.history) recordRoundResult(cell, roundResult);
}

function isForcedKoi(actions: readonly LegalActionV1[]): boolean {
  const choices = actions.filter(
    (action): action is Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }> =>
      action.type === "chooseYakuDecision",
  );
  return choices.length === 1 && choices[0]?.choice === "koiKoi";
}

function assertFiniteCell(cell: Readonly<CellAccumulatorV1>, counters: ZeroCountersV1): void {
  for (const value of Object.values(cell)) {
    if (!Number.isFinite(value)) {
      counters.nonFiniteMetrics += 1;
      throw new Error("PHASE6C_NONFINITE_METRIC");
    }
  }
}

function assertState(state: AuthoritativeGameStateV1, counters: ZeroCountersV1): void {
  try {
    assertValidAuthoritativeState(state);
  } catch (error) {
    counters.invalidStates += 1;
    throw error;
  }
}

function runTrial(configuration: TrialConfigurationV1, counters: ZeroCountersV1): TrialResultV1 {
  const label = `${configuration.personality}-${configuration.difficulty}-${configuration.matchLength}`;
  const matchId = `phase6c-${configuration.seedIndex}-${label}`;
  const initial = startMatch(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength: configuration.matchLength,
      starterPolicy: { kind: "chooseWithRng" },
    },
    createSeededRandomSource(startMatchSeed(configuration.seedIndex)),
  );
  let state = initial.state;
  let checkpoint: EngineCheckpointV1 = initial.checkpoint;
  const cell = emptyCell();
  const initialStarterId = state.round.starterId;
  const rootSeed = rolloutRootSeed(configuration);
  cell.commands = 1;

  for (let sequence = 2; sequence <= MAX_COMMANDS_PER_MATCH; sequence += 1) {
    assertState(state, counters);
    if (state.phase.kind === "matchComplete") {
      recordCompletedMatch(cell, state, initialStarterId);
      assertFiniteCell(cell, counters);
      return Object.freeze({ cell, state });
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
      cell.commands += 1;
    } else {
      const actorId = activePlayerId(state);
      const observation = projectPlayerObservation(state, actorId);
      if (observation.legalActions.length === 0) {
        counters.noActionReturns += 1;
        throw new Error(`PHASE6C_ACTIVE_PLAYER_NO_ACTION: ${label}:${state.phase.kind}`);
      }
      let action: LegalActionV1;
      if (actorId === CPU_PLAYER_ID) {
        const decision = chooseRolloutCpuDecision(
          observation,
          configuration.personality,
          configuration.difficulty,
          rootSeed,
        );
        if (decision === null) {
          counters.noActionReturns += 1;
          throw new Error(`PHASE6C_CPU_RETURNED_NO_ACTION: ${label}:${state.phase.kind}`);
        }
        if (!observation.legalActions.includes(decision.action)) {
          counters.illegalActions += 1;
          throw new Error(`PHASE6C_CPU_ACTION_NOT_OFFERED: ${label}:${state.phase.kind}`);
        }
        if (!Number.isFinite(decision.confidence)) {
          counters.nonFiniteMetrics += 1;
          throw new Error("PHASE6C_NONFINITE_DECISION_CONFIDENCE");
        }
        action = decision.action;
        if (state.phase.kind === "awaitingYakuDecision") {
          cell.yakuDecisions += 1;
          if (action.type === "chooseYakuDecision" && action.choice === "bank") {
            cell.bankChoices += 1;
            cell.bankMultiplierTotal += action.scoringMultiplier;
          } else if (action.type === "chooseYakuDecision" && action.choice === "koiKoi") {
            cell.koiKoiChoices += 1;
            if (isForcedKoi(observation.legalActions)) cell.forcedKoiChoices += 1;
          }
        }
      } else {
        action = canonicalFirstLegalAction(observation.legalActions);
      }
      const transition = applyGameplayCommand(
        state,
        commandFromAction(state, action, `${matchId}:action:${sequence}`),
      );
      cell.turns += transition.events.filter((event) => event.type === "turnCompleted").length;
      state = transition.state;
      cell.commands += 1;
    }
    if (state.stateVersion !== previousVersion + 1) {
      counters.invalidStates += 1;
      throw new Error(`PHASE6C_STATE_VERSION_INVALID: ${previousVersion} -> ${state.stateVersion}`);
    }
  }
  counters.commandLimitExceeded += 1;
  throw new Error(`PHASE6C_COMMAND_LIMIT_EXCEEDED: ${matchId}`);
}

function addCell(target: CellAccumulatorV1, source: Readonly<CellAccumulatorV1>): void {
  for (const key of Object.keys(target) as (keyof CellAccumulatorV1)[]) {
    target[key] += source[key];
  }
}

function ratioMetric(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator < 0) {
    throw new Error("PHASE6C_REPORT_RATIO_INPUT_INVALID");
  }
  const decimal = denominator === 0 ? "0" : (numerator / denominator).toFixed(6);
  return { numerator, denominator, decimal } as const;
}

function reportCell(
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
  matchLength: MatchLength,
  cell: Readonly<CellAccumulatorV1>,
) {
  return {
    personality,
    difficulty,
    matchLength,
    matches: cell.matches,
    outcomes: {
      wins: cell.cpuWins,
      losses: cell.cpuLosses,
      ties: cell.cpuTies,
      winRate: ratioMetric(cell.cpuWins, cell.matches),
    },
    averageScore: ratioMetric(cell.cpuScoreTotal, cell.matches),
    bank: {
      count: cell.bankChoices,
      averageMultiplier: ratioMetric(cell.bankMultiplierTotal, cell.bankChoices),
    },
    koiKoi: {
      count: cell.koiKoiChoices,
      rate: ratioMetric(cell.koiKoiChoices, cell.yakuDecisions),
      forcedCount: cell.forcedKoiChoices,
    },
    rounds: {
      count: cell.rounds,
      automaticCount: cell.automaticRounds,
      automaticRate: ratioMetric(cell.automaticRounds, cell.rounds),
      fieldCancellationCount: cell.fieldCancellationRounds,
      luckyWinCount: cell.luckyWinRounds,
      bothLuckyDrawCount: cell.bothLuckyDrawRounds,
      luckyResultCount: cell.luckyWinRounds + cell.bothLuckyDrawRounds,
      luckyResultRate: ratioMetric(cell.luckyWinRounds + cell.bothLuckyDrawRounds, cell.rounds),
      noScoreCount: cell.noScoreRounds,
      noScoreRate: ratioMetric(cell.noScoreRounds, cell.rounds),
    },
    averages: {
      commandsPerMatch: ratioMetric(cell.commands, cell.matches),
      turnsPerMatch: ratioMetric(cell.turns, cell.matches),
    },
    firstPlayerOutcome: {
      wins: cell.firstPlayerWins,
      losses: cell.firstPlayerLosses,
      ties: cell.firstPlayerTies,
      winRate: ratioMetric(cell.firstPlayerWins, cell.matches),
    },
  } as const;
}

function aggregateByCell(results: readonly (TrialConfigurationV1 & TrialResultV1)[]) {
  const cells = new Map<string, CellAccumulatorV1>();
  for (const personality of CPU_PERSONALITIES) {
    for (const difficulty of CPU_DIFFICULTIES) {
      for (const matchLength of MATCH_LENGTHS) {
        cells.set(`${personality}:${difficulty}:${matchLength}`, emptyCell());
      }
    }
  }
  for (const result of results) {
    const key = `${result.personality}:${result.difficulty}:${result.matchLength}`;
    const cell = cells.get(key);
    if (cell === undefined) throw new Error("PHASE6C_REPORT_CELL_MISSING");
    addCell(cell, result.cell);
  }
  return CPU_PERSONALITIES.flatMap((personality) =>
    CPU_DIFFICULTIES.flatMap((difficulty) =>
      MATCH_LENGTHS.map((matchLength) => {
        const cell = cells.get(`${personality}:${difficulty}:${matchLength}`);
        if (cell === undefined) throw new Error("PHASE6C_REPORT_CELL_MISSING");
        return reportCell(personality, difficulty, matchLength, cell);
      }),
    ),
  );
}

function reportTotals(cells: ReturnType<typeof aggregateByCell>, counters: ZeroCountersV1) {
  return {
    matches: cells.reduce((total, cell) => total + cell.matches, 0),
    rounds: cells.reduce((total, cell) => total + cell.rounds.count, 0),
    automaticRounds: cells.reduce((total, cell) => total + cell.rounds.automaticCount, 0),
    luckyWins: cells.reduce((total, cell) => total + cell.rounds.luckyWinCount, 0),
    bothLuckyDraws: cells.reduce((total, cell) => total + cell.rounds.bothLuckyDrawCount, 0),
    fieldCancellations: cells.reduce(
      (total, cell) => total + cell.rounds.fieldCancellationCount,
      0,
    ),
    noScoreRounds: cells.reduce((total, cell) => total + cell.rounds.noScoreCount, 0),
    bankChoices: cells.reduce((total, cell) => total + cell.bank.count, 0),
    koiKoiChoices: cells.reduce((total, cell) => total + cell.koiKoi.count, 0),
    forcedKoiChoices: cells.reduce((total, cell) => total + cell.koiKoi.forcedCount, 0),
    zeroCounters: { ...counters },
  } as const;
}

function assertAggregateOnlyReport(report: unknown): void {
  const forbiddenKeyFragments = [
    "assignment",
    "candidate",
    "card",
    "checkpoint",
    "commandid",
    "drawpile",
    "hand",
    "rawscore",
    "seed",
    "trace",
    "utility",
  ] as const;
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      if ((CARD_IDS as readonly string[]).includes(value)) {
        throw new Error("PHASE6C_REPORT_CONTAINS_CARD_ID_VALUE");
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
      if (forbiddenKeyFragments.some((fragment) => normalized.includes(fragment))) {
        throw new Error(`PHASE6C_REPORT_FORBIDDEN_KEY: ${key}`);
      }
      walk(entry);
    }
  };
  walk(report);
}

async function writeCanonicalReport(
  shard: number,
  shards: number,
  report: unknown,
): Promise<{ readonly bytes: string; readonly path: string }> {
  const bytes = `${canonicalStringifyV1(report)}\n`;
  const path = resolve(
    REPORT_DIRECTORY,
    `phase6c-simulation-report-shard-${shard}-of-${shards}.json`,
  );
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  await writeFile(path, bytes, "utf8");
  return { bytes, path };
}

describe("Phase 6C generated rollout CPU simulation report", () => {
  it(
    "completes every assigned full matrix and writes one deterministic aggregate-only shard report",
    { timeout: DEFAULT_ELAPSED_BUDGET_MS },
    async () => {
      const seedOffset = configuredInteger("PHASE6C_GENERATED_SEED_OFFSET", DEFAULT_SEED_OFFSET, 0);
      const matrixCount = configuredInteger("PHASE6C_GENERATED_SEEDS", DEFAULT_SEEDS, 1);
      const shard = configuredInteger("PHASE6C_GENERATED_SHARD", DEFAULT_SHARD, 1);
      const shards = configuredInteger("PHASE6C_GENERATED_SHARDS", DEFAULT_SHARDS, 1);
      const elapsedBudgetMs = configuredInteger(
        "PHASE6C_GENERATED_SHARD_TIMEOUT_MS",
        DEFAULT_ELAPSED_BUDGET_MS,
        1,
      );
      if (shard > shards) throw new Error("PHASE6C_SHARD_RANGE_INVALID");
      if (seedOffset > Number.MAX_SAFE_INTEGER - (matrixCount - 1)) {
        throw new Error("PHASE6C_MATRIX_RANGE_INVALID");
      }

      const startedAt = Date.now();
      const counters: ZeroCountersV1 = {
        commandLimitExceeded: 0,
        illegalActions: 0,
        invalidStates: 0,
        noActionReturns: 0,
        nonFiniteMetrics: 0,
      };
      const results: (TrialConfigurationV1 & TrialResultV1)[] = [];
      for (let localMatrix = 0; localMatrix < matrixCount; localMatrix += 1) {
        const seedIndex = seedOffset + localMatrix;
        for (const personality of CPU_PERSONALITIES) {
          for (const difficulty of CPU_DIFFICULTIES) {
            for (const matchLength of MATCH_LENGTHS) {
              const configuration = { personality, difficulty, matchLength, seedIndex } as const;
              results.push({ ...configuration, ...runTrial(configuration, counters) });
            }
          }
        }
      }

      expect(results).toHaveLength(matrixCount * MATRIX_CELLS);
      expect(results.every(({ state }) => state.phase.kind === "matchComplete")).toBe(true);
      const cells = aggregateByCell(results);
      expect(cells).toHaveLength(MATRIX_CELLS);
      expect(cells.every((cell) => cell.matches === matrixCount)).toBe(true);
      // Personality direction is evaluated across the complete 270-match
      // matrix by the host gate. Individual 54/81-match shards are execution
      // boundaries, not statistically independent tuning contracts.
      expect(counters).toEqual({
        commandLimitExceeded: 0,
        illegalActions: 0,
        invalidStates: 0,
        noActionReturns: 0,
        nonFiniteMetrics: 0,
      });

      const unsignedReport = {
        schema: "Phase6CSimulationReportV1",
        configuration: {
          shard,
          shards,
          matrixCount,
          matchCount: results.length,
          matrixShape: {
            personalities: CPU_PERSONALITIES.length,
            difficulties: CPU_DIFFICULTIES.length,
            formats: MATCH_LENGTHS.length,
          },
          formats: MATCH_LENGTHS,
          opponentPolicy: "canonicalFirstLegalV1",
          rolloutPolicy: "observationOnlyBeliefV1",
          rolloutBudgets: {
            easy: { worlds: 4, capturePlies: 1, nodeCeiling: 2_048 },
            standard: { worlds: 12, capturePlies: 2, nodeCeiling: 2_048 },
            hard: { worlds: 24, capturePlies: 4, nodeCeiling: 2_048 },
          },
          maximumCommandsPerMatch: MAX_COMMANDS_PER_MATCH,
          elapsed: {
            budgetMs: elapsedBudgetMs,
            measurement: "consoleOnlyToKeepArtifactDeterministic",
          },
        },
        cells,
        totals: reportTotals(cells, counters),
      } as const;
      assertAggregateOnlyReport(unsignedReport);
      const canonicalSha256 = sha256Hex(canonicalStringifyV1(unsignedReport));
      const report = { ...unsignedReport, canonicalSha256 } as const;
      assertAggregateOnlyReport(report);
      expect(canonicalSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(sha256Hex(canonicalStringifyV1(unsignedReport))).toBe(canonicalSha256);

      const firstSerialization = canonicalStringifyV1(report);
      const secondSerialization = canonicalStringifyV1(report);
      expect(secondSerialization).toBe(firstSerialization);
      const artifact = await writeCanonicalReport(shard, shards, report);
      expect(artifact.bytes).toBe(`${firstSerialization}\n`);

      const elapsedMs = Date.now() - startedAt;
      expect(elapsedMs).toBeLessThan(elapsedBudgetMs);
      console.log(
        `[phase6c-generated] shard=${shard}/${shards} matrices=${matrixCount} matches=${results.length} elapsedMs=${elapsedMs} report=${artifact.path} canonicalSha256=${canonicalSha256}`,
      );
    },
  );
});
