import type { RngSnapshotV1 } from "../random/types";
import { restoreRandomSource, validateRngSnapshot } from "../random/xoshiro128ss";
import { advanceRound } from "../rules/round-advance";
import { startMatch } from "../rules/round-setup";
import { applyGameplayCommand } from "../rules/turn";
import {
  CANONICAL_HASH_ALGORITHM,
  CANONICAL_JSON_VERSION,
  canonicalStringifyV1,
  hashCanonicalV1,
  type CanonicalHashV1,
} from "../serialization/canonical-json";
import { rejectCommand } from "../state/errors";
import { deepFreeze } from "../state/freeze";
import { hashPublicStateV1, type EngineEventV1 } from "../state/projection";
import type {
  AdvanceRoundCommandV1,
  AuthoritativeGameStateV1,
  EngineCheckpointV1,
  EngineTransitionV1,
  GameplayCommandV1,
  GameplayTransitionV1,
  PlayerId,
  RoundAdvanceTransitionV1,
  StartMatchCommandV1,
} from "../state/types";

export const AUTHORITATIVE_REPLAY_VERSION = 1 as const;

export type ReplayCommandV1 = StartMatchCommandV1 | GameplayCommandV1 | AdvanceRoundCommandV1;
export type RecordedTransitionV1 =
  EngineTransitionV1 | GameplayTransitionV1 | RoundAdvanceTransitionV1;
export type CommandPrincipalV1 = PlayerId | "system";

export interface ReplayBoundaryHashV1 {
  readonly stateVersion: number;
  readonly stateHash: CanonicalHashV1 | null;
  readonly checkpointHash: CanonicalHashV1;
}

export interface ReplayAfterHashV1 extends ReplayBoundaryHashV1 {
  readonly eventsHash: CanonicalHashV1;
  readonly publicStateHash: CanonicalHashV1;
}

export interface AuthoritativeReplayEntryV1 {
  readonly sequence: number;
  readonly command: ReplayCommandV1;
  readonly commandHash: CanonicalHashV1;
  readonly before: ReplayBoundaryHashV1;
  readonly after: ReplayAfterHashV1;
}

export interface AuthoritativeReplayLogV1 {
  readonly replayVersion: typeof AUTHORITATIVE_REPLAY_VERSION;
  readonly canonicalizationVersion: typeof CANONICAL_JSON_VERSION;
  readonly hashAlgorithm: typeof CANONICAL_HASH_ALGORITHM;
  readonly matchId: string;
  readonly initialRng: RngSnapshotV1;
  readonly entries: readonly AuthoritativeReplayEntryV1[];
}

export interface AcceptedCommandReceiptV1 {
  readonly matchId: string;
  readonly commandId: string;
  readonly commandHash: CanonicalHashV1;
  readonly principal: CommandPrincipalV1;
  readonly sequence: number;
  readonly transition: RecordedTransitionV1;
}

export interface AuthoritativeRuntimeV1 {
  readonly state: AuthoritativeGameStateV1 | null;
  readonly checkpoint: EngineCheckpointV1 | null;
  readonly log: AuthoritativeReplayLogV1;
  readonly acceptedCommandReceipts: readonly AcceptedCommandReceiptV1[];
}

export interface IdempotentExecutionV1 {
  readonly runtime: AuthoritativeRuntimeV1;
  readonly transition: RecordedTransitionV1;
  readonly receipt: AcceptedCommandReceiptV1;
  readonly replayed: boolean;
}

export class ReplayVerificationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "ReplayVerificationError";
    this.code = code;
  }
}

function replayReject(code: string, message: string): never {
  throw new ReplayVerificationError(code, message);
}

function principalForCommand(command: ReplayCommandV1): CommandPrincipalV1 {
  return "actorId" in command ? command.actorId : "system";
}

function currentBoundary(runtime: AuthoritativeRuntimeV1): ReplayBoundaryHashV1 {
  return deepFreeze({
    stateVersion: runtime.state?.stateVersion ?? 0,
    stateHash: runtime.state === null ? null : hashCanonicalV1(runtime.state),
    checkpointHash: hashCanonicalV1(runtime.checkpoint ?? runtime.log.initialRng),
  });
}

function eventsFromTransition(transition: RecordedTransitionV1): readonly EngineEventV1[] {
  return transition.events;
}

function checkpointFromTransition(
  transition: RecordedTransitionV1,
  fallback: EngineCheckpointV1 | null,
): EngineCheckpointV1 {
  if ("checkpoint" in transition) return transition.checkpoint;
  if (fallback === null)
    replayReject("REPLAY_CHECKPOINT_MISSING", "Gameplay requires a checkpoint.");
  return fallback;
}

function executeNewCommand(
  runtime: AuthoritativeRuntimeV1,
  command: ReplayCommandV1,
): RecordedTransitionV1 {
  if (command.matchId !== runtime.log.matchId) {
    rejectCommand("MATCH_ID_MISMATCH", "Command matchId does not identify this replay runtime.");
  }
  if (runtime.state === null) {
    if (command.type !== "startMatch") {
      rejectCommand("MATCH_NOT_STARTED", "The first replay command must start the match.");
    }
    return startMatch(command, restoreRandomSource(runtime.log.initialRng));
  }
  if (command.type === "startMatch") {
    rejectCommand("MATCH_ALREADY_STARTED", "A replay runtime can start only once.");
  }
  if (command.type === "advanceRound") {
    if (runtime.checkpoint === null) {
      replayReject("REPLAY_CHECKPOINT_MISSING", "Round advancement requires a checkpoint.");
    }
    return advanceRound(runtime.state, command, runtime.checkpoint);
  }
  return applyGameplayCommand(runtime.state, command);
}

export function createAuthoritativeRuntime(
  matchId: string,
  initialRng: RngSnapshotV1,
): AuthoritativeRuntimeV1 {
  if (matchId.trim().length === 0) replayReject("REPLAY_MATCH_ID_INVALID", "matchId is required.");
  validateRngSnapshot(initialRng);
  return deepFreeze({
    state: null,
    checkpoint: null,
    log: {
      replayVersion: AUTHORITATIVE_REPLAY_VERSION,
      canonicalizationVersion: CANONICAL_JSON_VERSION,
      hashAlgorithm: CANONICAL_HASH_ALGORITHM,
      matchId,
      initialRng,
      entries: [],
    },
    acceptedCommandReceipts: [],
  });
}

export function executeIdempotentCommand(
  runtime: AuthoritativeRuntimeV1,
  command: ReplayCommandV1,
): IdempotentExecutionV1 {
  const commandHash = hashCanonicalV1(command);
  const principal = principalForCommand(command);
  const existing = runtime.acceptedCommandReceipts.find(
    (receipt) => receipt.matchId === command.matchId && receipt.commandId === command.commandId,
  );
  if (existing !== undefined) {
    if (existing.commandHash !== commandHash || existing.principal !== principal) {
      rejectCommand(
        "IDEMPOTENCY_KEY_CONFLICT",
        "An accepted command ID cannot be reused with a different command or principal.",
      );
    }
    return deepFreeze({
      runtime,
      transition: existing.transition,
      receipt: existing,
      replayed: true,
    });
  }

  const before = currentBoundary(runtime);
  const transition = executeNewCommand(runtime, command);
  const checkpoint = checkpointFromTransition(transition, runtime.checkpoint);
  const state = transition.state;
  const sequence = runtime.log.entries.length + 1;
  const entry = deepFreeze<AuthoritativeReplayEntryV1>({
    sequence,
    command,
    commandHash,
    before,
    after: {
      stateVersion: state.stateVersion,
      stateHash: hashCanonicalV1(state),
      checkpointHash: hashCanonicalV1(checkpoint),
      eventsHash: hashCanonicalV1(eventsFromTransition(transition)),
      publicStateHash: hashPublicStateV1(state),
    },
  });
  const receipt = deepFreeze<AcceptedCommandReceiptV1>({
    matchId: command.matchId,
    commandId: command.commandId,
    commandHash,
    principal,
    sequence,
    transition,
  });
  const nextRuntime = deepFreeze<AuthoritativeRuntimeV1>({
    state,
    checkpoint,
    log: {
      ...runtime.log,
      entries: [...runtime.log.entries, entry],
    },
    acceptedCommandReceipts: [...runtime.acceptedCommandReceipts, receipt],
  });
  return deepFreeze({ runtime: nextRuntime, transition, receipt, replayed: false });
}

function assertReplayEntry(
  expected: AuthoritativeReplayEntryV1,
  actual: AuthoritativeReplayEntryV1,
): void {
  if (expected.sequence !== actual.sequence) {
    replayReject("REPLAY_SEQUENCE_INVALID", `Expected sequence ${actual.sequence}.`);
  }
  if (canonicalStringifyV1(expected) !== canonicalStringifyV1(actual)) {
    replayReject("REPLAY_HASH_MISMATCH", `Replay entry ${expected.sequence} did not verify.`);
  }
}

export function replayAuthoritativeLog(log: AuthoritativeReplayLogV1): AuthoritativeRuntimeV1 {
  if (
    log.replayVersion !== AUTHORITATIVE_REPLAY_VERSION ||
    log.canonicalizationVersion !== CANONICAL_JSON_VERSION ||
    log.hashAlgorithm !== CANONICAL_HASH_ALGORITHM
  ) {
    replayReject("REPLAY_VERSION_UNSUPPORTED", "Replay/hash version is not supported.");
  }
  let runtime = createAuthoritativeRuntime(log.matchId, log.initialRng);
  for (const expected of log.entries) {
    let execution: IdempotentExecutionV1;
    try {
      execution = executeIdempotentCommand(runtime, expected.command);
    } catch (error) {
      replayReject(
        "REPLAY_COMMAND_REJECTED",
        `Replay command ${expected.sequence} was rejected: ${String(error)}`,
      );
    }
    if (execution.replayed)
      replayReject("REPLAY_COMMAND_DUPLICATE", "Replay log IDs must be unique.");
    const actual = execution.runtime.log.entries.at(-1);
    if (actual === undefined)
      replayReject("REPLAY_ENTRY_MISSING", "Replay command was not recorded.");
    assertReplayEntry(expected, actual);
    runtime = execution.runtime;
  }
  return runtime;
}

export function hashAuthoritativeRuntimeV1(runtime: AuthoritativeRuntimeV1): CanonicalHashV1 {
  return hashCanonicalV1({ state: runtime.state, checkpoint: runtime.checkpoint });
}
