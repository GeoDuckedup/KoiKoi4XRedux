import { isCardId } from "../cards/catalog";
import { validateRngSnapshotProvenance } from "../random/xoshiro128ss";
import { deepFreeze } from "./freeze";
import {
  AUTHORITATIVE_STATE_FORMAT_VERSION,
  MATCH_LENGTHS,
  PLAYER_IDS,
  RULES_VERSION,
  YAKU_TRIGGER_KEYS,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
} from "./types";
import { assertValidAuthoritativeState } from "./validation";

/**
 * The private, JSON-safe engine values required to resume an offline local
 * match. This is deliberately not a public projection or a wire protocol.
 */
export interface LocalAuthoritativeSnapshotV1 {
  readonly state: AuthoritativeGameStateV1;
  readonly checkpoint: EngineCheckpointV1;
}

export class LocalSnapshotDecodeError extends Error {
  constructor(message: string) {
    super(`LOCAL_SNAPSHOT_INVALID: ${message}`);
    this.name = "LocalSnapshotDecodeError";
  }
}

function reject(path: string, message: string): never {
  throw new LocalSnapshotDecodeError(`${path}: ${message}`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Clone only inert JSON values. Accessors, symbols, exotic prototypes, holes,
 * and enumerable extras on arrays are rejected before any domain validation. */
function cloneJsonValue(value: unknown, path: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) reject(path, "must contain only finite JSON numbers");
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      reject(path, "must be a plain array");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) reject(path, "must not contain symbols");
    const allowed = new Set([
      "length",
      ...Array.from({ length: value.length }, (_entry, index) => String(index)),
    ]);
    for (const key of Object.getOwnPropertyNames(value)) {
      if (!allowed.has(key)) reject(path, `contains unexpected array field ${key}`);
    }
    const clone: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        reject(`${path}[${index}]`, "must be an enumerable data value");
      }
      clone.push(cloneJsonValue(descriptor.value, `${path}[${index}]`));
    }
    return clone;
  }
  if (!isPlainRecord(value)) reject(path, "must be a plain record");
  if (Object.getOwnPropertySymbols(value).length > 0) reject(path, "must not contain symbols");
  const clone: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      reject(`${path}.${key}`, "must be an enumerable data value");
    }
    clone[key] = cloneJsonValue(descriptor.value, `${path}.${key}`);
  }
  return clone;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isPlainRecord(value)) reject(path, "must be a plain record");
  return value;
}

function exact(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  const candidate = record(value, path);
  const actual = Object.keys(candidate).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    reject(path, `must contain exactly: ${expected.join(", ")}`);
  }
  return candidate;
}

function array(value: unknown, path: string, length?: number): readonly unknown[] {
  if (!Array.isArray(value)) reject(path, "must be an array");
  if (length !== undefined && value.length !== length)
    reject(path, `must contain ${length} entries`);
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") reject(path, "must be a string");
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") reject(path, "must be a boolean");
  return value;
}

function safeInteger(value: unknown, path: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    reject(path, `must be a safe integer no less than ${minimum}`);
  }
  return value as number;
}

function oneOf<T extends string | number>(value: unknown, values: readonly T[], path: string): T {
  if (!values.includes(value as T)) reject(path, "contains an unsupported value");
  return value as T;
}

function player(value: unknown, path: string): void {
  oneOf(value, PLAYER_IDS, path);
}

function nullablePlayer(value: unknown, path: string): void {
  if (value !== null) player(value, path);
}

function month(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 12) {
    reject(path, "must be a month from 1 through 12");
  }
}

function multiplier(value: unknown, path: string, nullable = false): void {
  if (nullable && value === null) return;
  oneOf(value, [1, 2, 3, 4] as const, path);
}

function card(value: unknown, path: string): void {
  if (typeof value !== "string" || !isCardId(value)) reject(path, "must be a canonical CardId");
}

function cards(value: unknown, path: string, length?: number): void {
  array(value, path, length).forEach((entry, index) => card(entry, `${path}[${index}]`));
}

function pointDeltas(value: unknown, path: string): void {
  const candidate = exact(value, PLAYER_IDS, path);
  safeInteger(candidate["player-a"], `${path}.player-a`);
  safeInteger(candidate["player-b"], `${path}.player-b`);
}

function activeYaku(value: unknown, path: string): void {
  const candidate = exact(value, ["key", "name", "points"], path);
  oneOf(candidate.key, YAKU_TRIGGER_KEYS, `${path}.key`);
  string(candidate.name, `${path}.name`);
  safeInteger(candidate.points, `${path}.points`);
}

function activeYakuList(value: unknown, path: string): void {
  array(value, path).forEach((entry, index) => activeYaku(entry, `${path}[${index}]`));
}

function completeMonth(value: unknown, path: string): void {
  const candidate = exact(value, ["month", "cardIds"], path);
  month(candidate.month, `${path}.month`);
  cards(candidate.cardIds, `${path}.cardIds`, 4);
}

function monthPair(value: unknown, path: string): void {
  const candidate = exact(value, ["month", "cardIds"], path);
  month(candidate.month, `${path}.month`);
  cards(candidate.cardIds, `${path}.cardIds`, 2);
}

function luckyQualification(value: unknown, path: string): void {
  const candidate = record(value, path);
  if (candidate.kind === "fourMonth") {
    exact(candidate, ["kind", "completeMonths"], path);
    array(candidate.completeMonths, `${path}.completeMonths`).forEach((entry, index) =>
      completeMonth(entry, `${path}.completeMonths[${index}]`),
    );
    return;
  }
  if (candidate.kind === "fourPairs") {
    exact(candidate, ["kind", "pairs"], path);
    array(candidate.pairs, `${path}.pairs`).forEach((entry, index) =>
      monthPair(entry, `${path}.pairs[${index}]`),
    );
    return;
  }
  reject(`${path}.kind`, "must be fourMonth or fourPairs");
}

function luckyHand(value: unknown, path: string): void {
  const candidate = exact(value, ["playerId", "fullHand", "qualification"], path);
  player(candidate.playerId, `${path}.playerId`);
  cards(candidate.fullHand, `${path}.fullHand`, 8);
  luckyQualification(candidate.qualification, `${path}.qualification`);
}

function completedFormation(value: unknown, path: string): void {
  const candidate = exact(
    value,
    ["sequence", "playerId", "phase", "yaku", "contributingCardIds"],
    path,
  );
  safeInteger(candidate.sequence, `${path}.sequence`, 1);
  player(candidate.playerId, `${path}.playerId`);
  oneOf(candidate.phase, ["hand", "draw"] as const, `${path}.phase`);
  activeYaku(candidate.yaku, `${path}.yaku`);
  cards(candidate.contributingCardIds, `${path}.contributingCardIds`);
}

function scoredYaku(value: unknown, path: string): void {
  const candidate = exact(value, ["formationSequence", "yaku", "contributingCardIds"], path);
  safeInteger(candidate.formationSequence, `${path}.formationSequence`, 1);
  activeYaku(candidate.yaku, `${path}.yaku`);
  cards(candidate.contributingCardIds, `${path}.contributingCardIds`);
}

function privilege(value: unknown, path: string): void {
  if (value === null) return;
  const candidate = exact(value, ["playerId", "grantedFromRound", "status"], path);
  player(candidate.playerId, `${path}.playerId`);
  safeInteger(candidate.grantedFromRound, `${path}.grantedFromRound`, 1);
  oneOf(candidate.status, ["available"] as const, `${path}.status`);
}

function nextRound(value: unknown, path: string): void {
  if (value === null) return;
  const candidate = exact(
    value,
    ["roundNumber", "scheduledMonth", "starterId", "starterReason", "specialPrivilege"],
    path,
  );
  safeInteger(candidate.roundNumber, `${path}.roundNumber`, 1);
  month(candidate.scheduledMonth, `${path}.scheduledMonth`);
  player(candidate.starterId, `${path}.starterId`);
  oneOf(
    candidate.starterReason,
    [
      "LOW_MULTIPLIER_LOSER_STARTS",
      "HIGH_MULTIPLIER_WINNER_STARTS",
      "JANUARY_ZERO_ALTERNATES",
      "LATER_ZERO_PRESERVES_STARTER",
    ] as const,
    `${path}.starterReason`,
  );
  privilege(candidate.specialPrivilege, `${path}.specialPrivilege`);
}

function resultEvidence(value: unknown, path: string): void {
  if (value === null) return;
  const candidate = record(value, path);
  if (candidate.kind === "fieldCancellation") {
    exact(candidate, ["kind", "completeFieldMonths"], path);
    array(candidate.completeFieldMonths, `${path}.completeFieldMonths`).forEach((entry, index) =>
      completeMonth(entry, `${path}.completeFieldMonths[${index}]`),
    );
    return;
  }
  if (candidate.kind === "luckyHands") {
    exact(candidate, ["kind", "hands"], path);
    array(candidate.hands, `${path}.hands`).forEach((entry, index) =>
      luckyHand(entry, `${path}.hands[${index}]`),
    );
    return;
  }
  if (candidate.kind === "ordinaryYaku") {
    exact(candidate, ["kind", "completedFormations", "scoredYaku"], path);
    array(candidate.completedFormations, `${path}.completedFormations`).forEach((entry, index) =>
      completedFormation(entry, `${path}.completedFormations[${index}]`),
    );
    array(candidate.scoredYaku, `${path}.scoredYaku`).forEach((entry, index) =>
      scoredYaku(entry, `${path}.scoredYaku[${index}]`),
    );
    return;
  }
  reject(`${path}.kind`, "contains an unsupported result evidence kind");
}

function roundResult(value: unknown, path: string): void {
  const candidate = exact(
    value,
    [
      "roundNumber",
      "scheduledMonth",
      "starterId",
      "kind",
      "reasonCode",
      "scorerId",
      "pointDeltas",
      "activeYaku",
      "basePoints",
      "tableMultiplierAtDecision",
      "scoringMultiplier",
      "awardedPoints",
      "evidence",
      "nextRound",
      "matchScoresAfter",
    ],
    path,
  );
  safeInteger(candidate.roundNumber, `${path}.roundNumber`, 1);
  month(candidate.scheduledMonth, `${path}.scheduledMonth`);
  player(candidate.starterId, `${path}.starterId`);
  oneOf(
    candidate.kind,
    [
      "bankedScore",
      "endOfPlayLastKoiCaller",
      "endOfPlayNoScore",
      "fieldCancellation",
      "luckyWin",
      "bothLuckyDraw",
    ] as const,
    `${path}.kind`,
  );
  oneOf(
    candidate.reasonCode,
    [
      "BANKED_SCORE",
      "END_OF_PLAY_LAST_KOI_CALLER",
      "END_OF_PLAY_NO_SCORE",
      "FIELD_FOUR_MONTH_CANCELLED",
      "LUCKY_FOUR_MONTH",
      "LUCKY_FOUR_PAIRS",
      "BOTH_LUCKY_DRAW",
    ] as const,
    `${path}.reasonCode`,
  );
  nullablePlayer(candidate.scorerId, `${path}.scorerId`);
  pointDeltas(candidate.pointDeltas, `${path}.pointDeltas`);
  activeYakuList(candidate.activeYaku, `${path}.activeYaku`);
  safeInteger(candidate.basePoints, `${path}.basePoints`);
  multiplier(candidate.tableMultiplierAtDecision, `${path}.tableMultiplierAtDecision`, true);
  multiplier(candidate.scoringMultiplier, `${path}.scoringMultiplier`, true);
  safeInteger(candidate.awardedPoints, `${path}.awardedPoints`);
  resultEvidence(candidate.evidence, `${path}.evidence`);
  nextRound(candidate.nextRound, `${path}.nextRound`);
  pointDeltas(candidate.matchScoresAfter, `${path}.matchScoresAfter`);
}

function matchResult(value: unknown, path: string): void {
  const candidate = exact(value, ["matchLength", "roundsPlayed", "finalScores", "winnerId"], path);
  oneOf(candidate.matchLength, MATCH_LENGTHS, `${path}.matchLength`);
  safeInteger(candidate.roundsPlayed, `${path}.roundsPlayed`, 1);
  pointDeltas(candidate.finalScores, `${path}.finalScores`);
  nullablePlayer(candidate.winnerId, `${path}.winnerId`);
}

function resolution(value: unknown, path: string): void {
  const candidate = exact(value, ["kind", "matchingFieldCardIds"], path);
  const lengths = { placeOnField: 0, capturePair: 1, captureChoice: 2, fourCardSweep: 3 } as const;
  if (typeof candidate.kind !== "string" || !(candidate.kind in lengths)) {
    reject(`${path}.kind`, "contains an unsupported capture resolution");
  }
  cards(
    candidate.matchingFieldCardIds,
    `${path}.matchingFieldCardIds`,
    lengths[candidate.kind as keyof typeof lengths],
  );
}

function yakuResume(value: unknown, path: string): void {
  const candidate = record(value, path);
  if (candidate.kind === "drawPhase") {
    exact(candidate, ["kind"], path);
    return;
  }
  if (candidate.kind === "completeTurn" || candidate.kind === "endOfPlay") {
    exact(candidate, ["kind", "lastActorId"], path);
    player(candidate.lastActorId, `${path}.lastActorId`);
    return;
  }
  reject(`${path}.kind`, "contains an unsupported Yaku resume");
}

function yakuContext(value: unknown, path: string): void {
  const candidate = exact(
    value,
    ["phase", "newYaku", "activeYaku", "currentYakuTotal", "resume"],
    path,
  );
  oneOf(candidate.phase, ["hand", "draw"] as const, `${path}.phase`);
  activeYakuList(candidate.newYaku, `${path}.newYaku`);
  activeYakuList(candidate.activeYaku, `${path}.activeYaku`);
  safeInteger(candidate.currentYakuTotal, `${path}.currentYakuTotal`);
  yakuResume(candidate.resume, `${path}.resume`);
}

function phase(value: unknown, path: string): void {
  const candidate = record(value, path);
  if (candidate.kind === "awaitingHandPlay") {
    exact(candidate, ["kind", "playerId"], path);
    player(candidate.playerId, `${path}.playerId`);
    return;
  }
  if (candidate.kind === "awaitingDrawResolution") {
    exact(candidate, ["kind", "playerId", "drawnCardId", "resolution"], path);
    player(candidate.playerId, `${path}.playerId`);
    card(candidate.drawnCardId, `${path}.drawnCardId`);
    resolution(candidate.resolution, `${path}.resolution`);
    return;
  }
  if (candidate.kind === "awaitingYakuDecision") {
    exact(candidate, ["kind", "playerId", "context"], path);
    player(candidate.playerId, `${path}.playerId`);
    yakuContext(candidate.context, `${path}.context`);
    return;
  }
  if (candidate.kind === "roundComplete") {
    exact(candidate, ["kind", "result", "transitionPending"], path);
    roundResult(candidate.result, `${path}.result`);
    if (candidate.transitionPending !== true) reject(`${path}.transitionPending`, "must be true");
    return;
  }
  if (candidate.kind === "matchComplete") {
    exact(candidate, ["kind", "result"], path);
    matchResult(candidate.result, `${path}.result`);
    return;
  }
  reject(`${path}.kind`, "contains an unsupported engine phase");
}

function playerState(value: unknown, path: string): void {
  const candidate = exact(
    value,
    ["id", "score", "hand", "captured", "seenYakuKeys", "activeYaku", "currentYakuTotal"],
    path,
  );
  player(candidate.id, `${path}.id`);
  safeInteger(candidate.score, `${path}.score`);
  cards(candidate.hand, `${path}.hand`);
  cards(candidate.captured, `${path}.captured`);
  array(candidate.seenYakuKeys, `${path}.seenYakuKeys`).forEach((entry, index) =>
    oneOf(entry, YAKU_TRIGGER_KEYS, `${path}.seenYakuKeys[${index}]`),
  );
  activeYakuList(candidate.activeYaku, `${path}.activeYaku`);
  safeInteger(candidate.currentYakuTotal, `${path}.currentYakuTotal`);
}

function round(value: unknown, path: string): void {
  const candidate = exact(
    value,
    [
      "roundNumber",
      "scheduledMonth",
      "isFinalScheduledRound",
      "starterId",
      "field",
      "drawPile",
      "tableMultiplier",
      "mostRecentKoiKoiCallerId",
      "firstYakuTriggerPlayerId",
      "specialPrivilege",
      "frozenFinalRoundLeaderId",
      "completedYakuFormations",
    ],
    path,
  );
  safeInteger(candidate.roundNumber, `${path}.roundNumber`, 1);
  month(candidate.scheduledMonth, `${path}.scheduledMonth`);
  boolean(candidate.isFinalScheduledRound, `${path}.isFinalScheduledRound`);
  player(candidate.starterId, `${path}.starterId`);
  cards(candidate.field, `${path}.field`);
  cards(candidate.drawPile, `${path}.drawPile`);
  multiplier(candidate.tableMultiplier, `${path}.tableMultiplier`);
  nullablePlayer(candidate.mostRecentKoiKoiCallerId, `${path}.mostRecentKoiKoiCallerId`);
  nullablePlayer(candidate.firstYakuTriggerPlayerId, `${path}.firstYakuTriggerPlayerId`);
  privilege(candidate.specialPrivilege, `${path}.specialPrivilege`);
  nullablePlayer(candidate.frozenFinalRoundLeaderId, `${path}.frozenFinalRoundLeaderId`);
  array(candidate.completedYakuFormations, `${path}.completedYakuFormations`).forEach(
    (entry, index) => completedFormation(entry, `${path}.completedYakuFormations[${index}]`),
  );
}

function state(value: unknown, path: string): void {
  const candidate = exact(
    value,
    [
      "formatVersion",
      "rulesVersion",
      "stateVersion",
      "lastAcceptedCommandId",
      "matchId",
      "matchLength",
      "status",
      "players",
      "round",
      "phase",
      "history",
    ],
    path,
  );
  if (candidate.formatVersion !== AUTHORITATIVE_STATE_FORMAT_VERSION) {
    reject(`${path}.formatVersion`, "contains an unsupported state version");
  }
  if (candidate.rulesVersion !== RULES_VERSION) reject(`${path}.rulesVersion`, "is unsupported");
  safeInteger(candidate.stateVersion, `${path}.stateVersion`, 1);
  string(candidate.lastAcceptedCommandId, `${path}.lastAcceptedCommandId`);
  string(candidate.matchId, `${path}.matchId`);
  oneOf(candidate.matchLength, MATCH_LENGTHS, `${path}.matchLength`);
  oneOf(candidate.status, ["inProgress", "complete"] as const, `${path}.status`);
  array(candidate.players, `${path}.players`, 2).forEach((entry, index) =>
    playerState(entry, `${path}.players[${index}]`),
  );
  round(candidate.round, `${path}.round`);
  phase(candidate.phase, `${path}.phase`);
  array(candidate.history, `${path}.history`).forEach((entry, index) =>
    roundResult(entry, `${path}.history[${index}]`),
  );
}

function checkpoint(value: unknown, path: string): void {
  const candidate = exact(value, ["version", "matchId", "rng"], path);
  if (candidate.version !== 1)
    reject(`${path}.version`, "contains an unsupported checkpoint version");
  string(candidate.matchId, `${path}.matchId`);
  const rng = exact(
    candidate.rng,
    ["version", "algorithm", "initialSeed", "state", "drawCount"],
    `${path}.rng`,
  );
  if (rng.version !== 1 || rng.algorithm !== "xoshiro128ss") {
    reject(`${path}.rng`, "contains an unsupported RNG version or algorithm");
  }
  const seed = exact(rng.initialSeed, ["version", "algorithm", "hex"], `${path}.rng.initialSeed`);
  if (seed.version !== 1 || seed.algorithm !== "xoshiro128ss") {
    reject(`${path}.rng.initialSeed`, "contains an unsupported seed version or algorithm");
  }
  string(seed.hex, `${path}.rng.initialSeed.hex`);
  array(rng.state, `${path}.rng.state`, 4).forEach((entry, index) =>
    safeInteger(entry, `${path}.rng.state[${index}]`),
  );
  safeInteger(rng.drawCount, `${path}.rng.drawCount`);
}

/**
 * Strictly decode untrusted local storage into a recursively frozen snapshot.
 * Structural validation intentionally precedes semantic engine validation so a
 * malformed IndexedDB value cannot reach typed engine APIs through a cast.
 */
export function decodeLocalAuthoritativeSnapshotV1(value: unknown): LocalAuthoritativeSnapshotV1 {
  try {
    const cloned = cloneJsonValue(value, "$");
    const root = exact(cloned, ["state", "checkpoint"], "$");
    state(root.state, "$.state");
    checkpoint(root.checkpoint, "$.checkpoint");

    const snapshot = {
      state: root.state as unknown as AuthoritativeGameStateV1,
      checkpoint: root.checkpoint as unknown as EngineCheckpointV1,
    };
    if (snapshot.checkpoint.matchId !== snapshot.state.matchId) {
      reject("$.checkpoint.matchId", "must match $.state.matchId");
    }
    // The durable state does not retain the start command's starter policy or
    // every rejection-sampling attempt made while shuffling, so its history
    // cannot independently derive a draw count. Seed/state/draw-count replay,
    // together with full authoritative-state invariants, is the durable
    // integrity boundary for a local continuation snapshot.
    validateRngSnapshotProvenance(snapshot.checkpoint.rng);
    assertValidAuthoritativeState(snapshot.state);
    return deepFreeze(snapshot);
  } catch (error: unknown) {
    if (error instanceof LocalSnapshotDecodeError) throw error;
    reject("$", error instanceof Error ? error.message : "engine validation failed");
  }
}
