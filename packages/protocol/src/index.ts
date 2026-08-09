import {
  CANONICAL_HASH_ALGORITHM,
  CANONICAL_JSON_VERSION,
  deepFreeze,
  hashCanonicalV1,
  type CanonicalHashV1,
  type PlayerId,
  type PublicGameEventV1,
  type PublicGameStateV1,
} from "@koikoi4x/engine";

import {
  ProtocolValidationError,
  assertExactKeys,
  assertNonnegativeInteger,
  assertPlayerOrNull,
  assertPositiveInteger,
  assertPublicGameEventsV1,
  assertPublicGameStateV1,
  rejectProtocol,
} from "./validation";

export { ProtocolValidationError } from "./validation";

export const PROTOCOL_PACKAGE_ID = "@koikoi4x/protocol" as const;
export const PUBLIC_TURN_PROTOCOL_VERSION = 1 as const;

export interface PublicTurnRecordV1 {
  readonly protocolVersion: typeof PUBLIC_TURN_PROTOCOL_VERSION;
  readonly canonicalizationVersion: typeof CANONICAL_JSON_VERSION;
  readonly hashAlgorithm: typeof CANONICAL_HASH_ALGORITHM;
  readonly recordSequence: number;
  readonly matchId: string;
  readonly roundNumber: number;
  readonly turnNumber: number;
  readonly recordKind: "playerTurn" | "system";
  readonly actorId: PlayerId | null;
  readonly nextActorId: PlayerId | null;
  readonly previousStateVersion: number;
  readonly resultingStateVersion: number;
  readonly beforePublicState: PublicGameStateV1;
  readonly publicEvents: readonly PublicGameEventV1[];
  readonly resultingPublicStateHash: CanonicalHashV1;
  readonly endedRound: boolean;
  readonly endedMatch: boolean;
  readonly committedAt: string;
}

export interface CreatePublicTurnRecordInputV1 {
  readonly recordSequence: number;
  readonly roundNumber: number;
  readonly turnNumber: number;
  readonly recordKind: "playerTurn" | "system";
  readonly actorId: PlayerId | null;
  readonly nextActorId: PlayerId | null;
  readonly beforePublicState: PublicGameStateV1;
  readonly publicEvents: readonly PublicGameEventV1[];
  readonly resultingPublicState: PublicGameStateV1;
  readonly endedRound: boolean;
  readonly endedMatch: boolean;
  readonly committedAt: string;
}

const TURN_RECORD_KEYS = [
  "protocolVersion",
  "canonicalizationVersion",
  "hashAlgorithm",
  "recordSequence",
  "matchId",
  "roundNumber",
  "turnNumber",
  "recordKind",
  "actorId",
  "nextActorId",
  "previousStateVersion",
  "resultingStateVersion",
  "beforePublicState",
  "publicEvents",
  "resultingPublicStateHash",
  "endedRound",
  "endedMatch",
  "committedAt",
] as const;

function assertRecordMetadata(input: {
  readonly recordSequence: unknown;
  readonly roundNumber: unknown;
  readonly turnNumber: unknown;
  readonly recordKind: unknown;
  readonly actorId: unknown;
  readonly nextActorId: unknown;
  readonly committedAt: unknown;
}): void {
  assertPositiveInteger(input.recordSequence, "recordSequence");
  assertPositiveInteger(input.roundNumber, "roundNumber");
  assertNonnegativeInteger(input.turnNumber, "turnNumber");
  assertPlayerOrNull(input.actorId, "actorId");
  assertPlayerOrNull(input.nextActorId, "nextActorId");
  if (input.recordKind !== "playerTurn" && input.recordKind !== "system") {
    rejectProtocol("TURN_RECORD_INVALID", "recordKind is invalid.");
  }
  if (input.recordKind === "system" ? input.actorId !== null : input.actorId === null) {
    rejectProtocol("TURN_RECORD_ACTOR_INVALID", "Record actor does not match recordKind.");
  }
  if (typeof input.committedAt !== "string" || input.committedAt.trim().length === 0) {
    rejectProtocol("TURN_RECORD_TIMESTAMP_INVALID", "committedAt is required transport metadata.");
  }
}

export function createPublicTurnRecordV1(input: CreatePublicTurnRecordInputV1): PublicTurnRecordV1 {
  assertRecordMetadata(input);
  assertPublicGameStateV1(input.beforePublicState, "beforePublicState");
  assertPublicGameStateV1(input.resultingPublicState, "resultingPublicState");
  assertPublicGameEventsV1(input.publicEvents, "publicEvents");
  if (input.beforePublicState.matchId !== input.resultingPublicState.matchId) {
    rejectProtocol(
      "TURN_RECORD_MATCH_MISMATCH",
      "Before and resulting public states must share a matchId.",
    );
  }
  if (input.resultingPublicState.stateVersion <= input.beforePublicState.stateVersion) {
    rejectProtocol("TURN_RECORD_VERSION_INVALID", "Turn record must advance state version.");
  }
  return deepFreeze({
    protocolVersion: PUBLIC_TURN_PROTOCOL_VERSION,
    canonicalizationVersion: CANONICAL_JSON_VERSION,
    hashAlgorithm: CANONICAL_HASH_ALGORITHM,
    recordSequence: input.recordSequence,
    matchId: input.beforePublicState.matchId,
    roundNumber: input.roundNumber,
    turnNumber: input.turnNumber,
    recordKind: input.recordKind,
    actorId: input.actorId,
    nextActorId: input.nextActorId,
    previousStateVersion: input.beforePublicState.stateVersion,
    resultingStateVersion: input.resultingPublicState.stateVersion,
    beforePublicState: input.beforePublicState,
    publicEvents: input.publicEvents,
    resultingPublicStateHash: hashCanonicalV1(input.resultingPublicState),
    endedRound: input.endedRound,
    endedMatch: input.endedMatch,
    committedAt: input.committedAt,
  });
}

export function decodePublicTurnRecordV1(value: unknown): PublicTurnRecordV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    rejectProtocol("TURN_RECORD_INVALID", "Turn record must be a record.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(record, TURN_RECORD_KEYS, "$");
  if (
    record.protocolVersion !== PUBLIC_TURN_PROTOCOL_VERSION ||
    record.canonicalizationVersion !== CANONICAL_JSON_VERSION ||
    record.hashAlgorithm !== CANONICAL_HASH_ALGORITHM
  ) {
    rejectProtocol("TURN_RECORD_VERSION_UNSUPPORTED", "Turn record version is not supported.");
  }
  assertRecordMetadata(record as unknown as Parameters<typeof assertRecordMetadata>[0]);
  assertPositiveInteger(record.previousStateVersion, "previousStateVersion");
  assertPositiveInteger(record.resultingStateVersion, "resultingStateVersion");
  assertPublicGameStateV1(record.beforePublicState, "beforePublicState");
  assertPublicGameEventsV1(record.publicEvents, "publicEvents");
  if (
    typeof record.matchId !== "string" ||
    record.matchId !== record.beforePublicState.matchId ||
    typeof record.resultingPublicStateHash !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(record.resultingPublicStateHash) ||
    typeof record.endedRound !== "boolean" ||
    typeof record.endedMatch !== "boolean"
  ) {
    rejectProtocol("TURN_RECORD_INVALID", "Turn record fields are malformed.");
  }
  if (
    record.previousStateVersion !== record.beforePublicState.stateVersion ||
    (record.resultingStateVersion as number) <= (record.previousStateVersion as number)
  ) {
    rejectProtocol("TURN_RECORD_SEMANTICS_INVALID", "Turn record version semantics are invalid.");
  }
  return deepFreeze(record as unknown as PublicTurnRecordV1);
}

export function decodePublicTurnRecordSequenceV1(value: unknown): readonly PublicTurnRecordV1[] {
  if (!Array.isArray(value)) {
    rejectProtocol("TURN_RECORD_SEQUENCE_INVALID", "Turn record sequence must be an array.");
  }
  const records = value.map((entry) => decodePublicTurnRecordV1(entry));
  for (const [index, record] of records.entries()) {
    if (record.recordSequence !== index + 1) {
      rejectProtocol(
        "TURN_RECORD_SEQUENCE_INVALID",
        `Record at index ${index} must have sequence ${index + 1}.`,
      );
    }
    const previous = records[index - 1];
    if (
      previous !== undefined &&
      (record.matchId !== previous.matchId ||
        record.previousStateVersion !== previous.resultingStateVersion)
    ) {
      rejectProtocol(
        "TURN_RECORD_SEQUENCE_INVALID",
        `Record ${record.recordSequence} does not continue the prior record.`,
      );
    }
  }
  return deepFreeze(records);
}

export function verifyPublicTurnRecordResult(
  record: PublicTurnRecordV1,
  resultingPublicState: PublicGameStateV1,
): boolean {
  try {
    assertPublicGameStateV1(resultingPublicState, "resultingPublicState");
  } catch (error) {
    if (error instanceof ProtocolValidationError) return false;
    throw error;
  }
  return (
    record.matchId === resultingPublicState.matchId &&
    record.resultingStateVersion === resultingPublicState.stateVersion &&
    record.resultingPublicStateHash === hashCanonicalV1(resultingPublicState)
  );
}
