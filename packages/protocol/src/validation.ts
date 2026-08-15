import {
  MATCH_LENGTHS,
  PLAYER_IDS,
  CARD_IDS,
  YAKU_TRIGGER_KEYS,
  deriveYakuContributingCardIds,
  isCanonicalActiveYaku,
  isCanonicalYakuContributionSnapshot,
  isCardId,
  type ActiveYakuV1,
  type PlayerId,
  type PublicGameEventV1,
  type PublicGameStateV1,
} from "@koikoi4x/engine";

export class ProtocolValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "ProtocolValidationError";
    this.code = code;
  }
}

export function rejectProtocol(code: string, message: string): never {
  throw new ProtocolValidationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) rejectProtocol("PUBLIC_CONTENT_SHAPE_INVALID", `${path} must be a record.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    rejectProtocol("PUBLIC_CONTENT_SHAPE_INVALID", `${path} must be a plain record.`);
  }
}

export function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  assertRecord(value, path);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    rejectProtocol("PUBLIC_CONTENT_FIELD_INVALID", `${path} must not contain symbol fields.`);
  }
  const allowedKeys = new Set(allowed);
  const propertyNames = Object.getOwnPropertyNames(value);
  for (const key of propertyNames) {
    if (!allowedKeys.has(key)) {
      rejectProtocol("PUBLIC_CONTENT_FIELD_INVALID", `${path}.${key} is not in the public schema.`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      rejectProtocol(
        "PUBLIC_CONTENT_FIELD_INVALID",
        `${path}.${key} must be an enumerable own data field.`,
      );
    }
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      rejectProtocol("PUBLIC_CONTENT_FIELD_MISSING", `${path}.${key} is required.`);
    }
  }
}

export function assertPositiveInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    rejectProtocol("PROTOCOL_INTEGER_INVALID", `${path} must be a positive safe integer.`);
  }
}

export function assertNonnegativeInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    rejectProtocol("PROTOCOL_INTEGER_INVALID", `${path} must be a nonnegative safe integer.`);
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    rejectProtocol("PUBLIC_CONTENT_VALUE_INVALID", `${path} must be boolean.`);
  }
}

function assertEnum<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): asserts value is T {
  if (!allowed.includes(value as T)) {
    rejectProtocol("PUBLIC_CONTENT_VALUE_INVALID", `${path} is outside the public enum.`);
  }
}

function assertArray(value: unknown, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    rejectProtocol("PUBLIC_CONTENT_SHAPE_INVALID", `${path} must be an array.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    rejectProtocol("PUBLIC_CONTENT_SHAPE_INVALID", `${path} must not contain symbol fields.`);
  }
  const allowedKeys = new Set([
    "length",
    ...Array.from({ length: value.length }, (_entry, index) => String(index)),
  ]);
  if (Object.getOwnPropertyNames(value).some((key) => !allowedKeys.has(key))) {
    rejectProtocol("PUBLIC_CONTENT_SHAPE_INVALID", `${path} must not contain extra array fields.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      rejectProtocol(
        "PUBLIC_CONTENT_SHAPE_INVALID",
        `${path}[${index}] must be an enumerable own data element.`,
      );
    }
  }
}

function assertPlayer(value: unknown, path: string): asserts value is PlayerId {
  assertEnum(value, PLAYER_IDS, path);
}

export function assertPlayerOrNull(value: unknown, path: string): asserts value is PlayerId | null {
  if (value !== null) assertPlayer(value, path);
}

function assertMonth(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 12) {
    rejectProtocol("PUBLIC_CONTENT_VALUE_INVALID", `${path} must be a month from 1 through 12.`);
  }
}

function assertMultiplierOrNull(value: unknown, path: string): void {
  if (value !== null) assertEnum(value, [1, 2, 3, 4] as const, path);
}

function assertCard(value: unknown, path: string): void {
  if (typeof value !== "string" || !isCardId(value)) {
    rejectProtocol("PUBLIC_CARD_INVALID", `${path} must be a canonical CardId.`);
  }
}

function assertCards(
  value: unknown,
  path: string,
  options: { readonly length?: number; readonly unique?: boolean } = {},
): void {
  assertArray(value, path);
  if (options.length !== undefined && value.length !== options.length) {
    rejectProtocol("PUBLIC_CARD_INVALID", `${path} must contain ${options.length} cards.`);
  }
  value.forEach((cardId, index) => assertCard(cardId, `${path}[${index}]`));
  if (options.unique !== false && new Set(value).size !== value.length) {
    rejectProtocol("PUBLIC_CARD_INVALID", `${path} must not contain duplicate cards.`);
  }
}

function assertCanonicalCardOrder(cardIds: readonly unknown[], path: string): void {
  if (
    cardIds.some(
      (cardId, index) =>
        index > 0 &&
        CARD_IDS.indexOf(cardIds[index - 1] as (typeof CARD_IDS)[number]) >=
          CARD_IDS.indexOf(cardId as (typeof CARD_IDS)[number]),
    )
  ) {
    rejectProtocol("PUBLIC_YAKU_EVIDENCE_INVALID", `${path} must use canonical CardId order.`);
  }
}

function assertContributingCards(value: unknown, path: string): readonly unknown[] {
  assertCards(value, path);
  if ((value as readonly unknown[]).length === 0) {
    rejectProtocol("PUBLIC_YAKU_EVIDENCE_INVALID", `${path} must not be empty.`);
  }
  assertCanonicalCardOrder(value as readonly unknown[], path);
  return value as readonly unknown[];
}

function assertYakuContributionSnapshot(
  yaku: ActiveYakuV1,
  contributingCardIds: readonly unknown[],
  scheduledMonth: number,
  path: string,
): void {
  const cardIds = contributingCardIds as readonly (typeof CARD_IDS)[number][];
  if (
    !isCanonicalYakuContributionSnapshot(yaku, cardIds, scheduledMonth as 1) ||
    JSON.stringify(deriveYakuContributingCardIds(yaku.key, cardIds, scheduledMonth as 1)) !==
      JSON.stringify(cardIds)
  ) {
    rejectProtocol("PUBLIC_YAKU_EVIDENCE_INVALID", `${path} does not prove its recorded Yaku.`);
  }
}

function assertDrawResolution(value: unknown, path: string): void {
  assertRecord(value, path);
  if (value.kind === "placeOnField") {
    assertExactKeys(value, ["kind", "matchingFieldCardIds"], path);
    assertCards(value.matchingFieldCardIds, `${path}.matchingFieldCardIds`, { length: 0 });
  } else if (value.kind === "capturePair") {
    assertExactKeys(value, ["kind", "matchingFieldCardIds"], path);
    assertCards(value.matchingFieldCardIds, `${path}.matchingFieldCardIds`, { length: 1 });
  } else if (value.kind === "captureChoice") {
    assertExactKeys(value, ["kind", "matchingFieldCardIds"], path);
    assertCards(value.matchingFieldCardIds, `${path}.matchingFieldCardIds`, { length: 2 });
  } else if (value.kind === "fourCardSweep") {
    assertExactKeys(value, ["kind", "matchingFieldCardIds"], path);
    assertCards(value.matchingFieldCardIds, `${path}.matchingFieldCardIds`, { length: 3 });
  } else {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.kind is not a draw resolution.`);
  }
}

function assertPointDeltas(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, PLAYER_IDS, path);
  assertNonnegativeInteger(value["player-a"], `${path}.player-a`);
  assertNonnegativeInteger(value["player-b"], `${path}.player-b`);
}

function assertActiveYaku(value: unknown, path: string): asserts value is ActiveYakuV1 {
  assertRecord(value, path);
  assertExactKeys(value, ["key", "name", "points"], path);
  assertEnum(value.key, YAKU_TRIGGER_KEYS, `${path}.key`);
  if (typeof value.name !== "string") {
    rejectProtocol("PUBLIC_YAKU_INVALID", `${path}.name must be a string.`);
  }
  assertNonnegativeInteger(value.points, `${path}.points`);
  if (!isCanonicalActiveYaku(value as unknown as ActiveYakuV1)) {
    rejectProtocol("PUBLIC_YAKU_INVALID", `${path} is not a canonical active Yaku value.`);
  }
}

function assertActiveYakuList(value: unknown, path: string): readonly ActiveYakuV1[] {
  assertArray(value, path);
  value.forEach((entry, index) => assertActiveYaku(entry, `${path}[${index}]`));
  const entries = value as readonly ActiveYakuV1[];
  const indexes = entries.map((entry) => YAKU_TRIGGER_KEYS.indexOf(entry.key));
  if (
    new Set(entries.map((entry) => entry.key)).size !== entries.length ||
    indexes.some((index, position) => position > 0 && index <= (indexes[position - 1] ?? -1))
  ) {
    rejectProtocol("PUBLIC_YAKU_INVALID", `${path} must be unique and canonically ordered.`);
  }
  return entries;
}

function assertCompleteMonth(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["month", "cardIds"], path);
  assertMonth(value.month, `${path}.month`);
  assertCards(value.cardIds, `${path}.cardIds`, { length: 4 });
}

function assertMonthPair(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["month", "cardIds"], path);
  assertMonth(value.month, `${path}.month`);
  assertCards(value.cardIds, `${path}.cardIds`, { length: 2 });
}

function assertCompleteMonths(value: unknown, path: string): void {
  assertArray(value, path);
  value.forEach((entry, index) => assertCompleteMonth(entry, `${path}[${index}]`));
}

function assertLuckyQualification(value: unknown, path: string): void {
  assertRecord(value, path);
  if (value.kind === "fourMonth") {
    assertExactKeys(value, ["kind", "completeMonths"], path);
    assertCompleteMonths(value.completeMonths, `${path}.completeMonths`);
    return;
  }
  if (value.kind === "fourPairs") {
    assertExactKeys(value, ["kind", "pairs"], path);
    assertArray(value.pairs, `${path}.pairs`);
    value.pairs.forEach((entry, index) => assertMonthPair(entry, `${path}.pairs[${index}]`));
    return;
  }
  rejectProtocol("PUBLIC_LUCKY_EVIDENCE_INVALID", `${path}.kind is invalid.`);
}

function assertLuckyHand(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["playerId", "fullHand", "qualification"], path);
  assertPlayer(value.playerId, `${path}.playerId`);
  assertCards(value.fullHand, `${path}.fullHand`, { length: 8 });
  assertLuckyQualification(value.qualification, `${path}.qualification`);
}

function assertLuckyHands(value: unknown, path: string): void {
  assertArray(value, path);
  value.forEach((entry, index) => assertLuckyHand(entry, `${path}[${index}]`));
}

function assertPrivilege(value: unknown, path: string): void {
  if (value === null) return;
  assertRecord(value, path);
  assertExactKeys(value, ["playerId", "grantedFromRound", "status"], path);
  assertPlayer(value.playerId, `${path}.playerId`);
  assertNonnegativeInteger(value.grantedFromRound, `${path}.grantedFromRound`);
  if (value.status !== "available") {
    rejectProtocol("PUBLIC_PRIVILEGE_INVALID", `${path}.status must be available.`);
  }
}

function assertNextRound(value: unknown, path: string): void {
  if (value === null) return;
  assertRecord(value, path);
  assertExactKeys(
    value,
    ["roundNumber", "scheduledMonth", "starterId", "starterReason", "specialPrivilege"],
    path,
  );
  assertPositiveInteger(value.roundNumber, `${path}.roundNumber`);
  assertMonth(value.scheduledMonth, `${path}.scheduledMonth`);
  assertPlayer(value.starterId, `${path}.starterId`);
  assertEnum(
    value.starterReason,
    [
      "LOW_MULTIPLIER_LOSER_STARTS",
      "HIGH_MULTIPLIER_WINNER_STARTS",
      "JANUARY_ZERO_ALTERNATES",
      "LATER_ZERO_PRESERVES_STARTER",
    ] as const,
    `${path}.starterReason`,
  );
  assertPrivilege(value.specialPrivilege, `${path}.specialPrivilege`);
}

function assertCompletedYakuFormation(value: unknown, scheduledMonth: number, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["sequence", "playerId", "phase", "yaku", "contributingCardIds"], path);
  assertPositiveInteger(value.sequence, `${path}.sequence`);
  assertPlayer(value.playerId, `${path}.playerId`);
  assertEnum(value.phase, ["hand", "draw"] as const, `${path}.phase`);
  assertActiveYaku(value.yaku, `${path}.yaku`);
  const cards = assertContributingCards(value.contributingCardIds, `${path}.contributingCardIds`);
  assertYakuContributionSnapshot(value.yaku as ActiveYakuV1, cards, scheduledMonth, path);
}

function assertCompletedYakuFormations(value: unknown, scheduledMonth: number, path: string): void {
  assertArray(value, path);
  const seen = new Set<string>();
  value.forEach((formation, index) => {
    assertCompletedYakuFormation(formation, scheduledMonth, `${path}[${index}]`);
    const record = formation as Record<string, unknown>;
    if (record.sequence !== index + 1) {
      rejectProtocol(
        "PUBLIC_YAKU_EVIDENCE_INVALID",
        `${path}[${index}].sequence is not contiguous.`,
      );
    }
    const yaku = record.yaku as Record<string, unknown>;
    const key = `${record.playerId as string}:${yaku.key as string}`;
    if (seen.has(key)) {
      rejectProtocol("PUBLIC_YAKU_EVIDENCE_INVALID", `${path} repeats a player/yaku trigger.`);
    }
    seen.add(key);
  });
}

function assertScoredYaku(value: unknown, scheduledMonth: number, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["formationSequence", "yaku", "contributingCardIds"], path);
  assertPositiveInteger(value.formationSequence, `${path}.formationSequence`);
  assertActiveYaku(value.yaku, `${path}.yaku`);
  const cards = assertContributingCards(value.contributingCardIds, `${path}.contributingCardIds`);
  assertYakuContributionSnapshot(value.yaku as ActiveYakuV1, cards, scheduledMonth, path);
}

function assertRoundEvidence(value: unknown, scheduledMonth: number, path: string): void {
  if (value === null) return;
  assertRecord(value, path);
  if (value.kind === "fieldCancellation") {
    assertExactKeys(value, ["kind", "completeFieldMonths"], path);
    assertCompleteMonths(value.completeFieldMonths, `${path}.completeFieldMonths`);
    return;
  }
  if (value.kind === "luckyHands") {
    assertExactKeys(value, ["kind", "hands"], path);
    assertLuckyHands(value.hands, `${path}.hands`);
    return;
  }
  if (value.kind === "ordinaryYaku") {
    assertExactKeys(value, ["kind", "completedFormations", "scoredYaku"], path);
    assertCompletedYakuFormations(
      value.completedFormations,
      scheduledMonth,
      `${path}.completedFormations`,
    );
    assertArray(value.scoredYaku, `${path}.scoredYaku`);
    value.scoredYaku.forEach((entry, index) =>
      assertScoredYaku(entry, scheduledMonth, `${path}.scoredYaku[${index}]`),
    );
    return;
  }
  rejectProtocol("PUBLIC_RESULT_EVIDENCE_INVALID", `${path}.kind is invalid.`);
}

function assertRoundResult(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(
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
  assertPositiveInteger(value.roundNumber, `${path}.roundNumber`);
  assertMonth(value.scheduledMonth, `${path}.scheduledMonth`);
  assertPlayer(value.starterId, `${path}.starterId`);
  assertEnum(
    value.kind,
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
  assertEnum(
    value.reasonCode,
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
  const reasonByKind: Readonly<Record<string, readonly string[]>> = {
    bankedScore: ["BANKED_SCORE"],
    endOfPlayLastKoiCaller: ["END_OF_PLAY_LAST_KOI_CALLER"],
    endOfPlayNoScore: ["END_OF_PLAY_NO_SCORE"],
    fieldCancellation: ["FIELD_FOUR_MONTH_CANCELLED"],
    luckyWin: ["LUCKY_FOUR_MONTH", "LUCKY_FOUR_PAIRS"],
    bothLuckyDraw: ["BOTH_LUCKY_DRAW"],
  };
  if (!(reasonByKind[value.kind as string] ?? []).includes(value.reasonCode as string)) {
    rejectProtocol("PUBLIC_RESULT_INVALID", `${path} kind/reasonCode do not agree.`);
  }
  assertPlayerOrNull(value.scorerId, `${path}.scorerId`);
  assertPointDeltas(value.pointDeltas, `${path}.pointDeltas`);
  const activeYaku = assertActiveYakuList(value.activeYaku, `${path}.activeYaku`);
  assertNonnegativeInteger(value.basePoints, `${path}.basePoints`);
  assertMultiplierOrNull(value.tableMultiplierAtDecision, `${path}.tableMultiplierAtDecision`);
  assertMultiplierOrNull(value.scoringMultiplier, `${path}.scoringMultiplier`);
  assertNonnegativeInteger(value.awardedPoints, `${path}.awardedPoints`);
  assertRoundEvidence(value.evidence, value.scheduledMonth as number, `${path}.evidence`);
  assertNextRound(value.nextRound, `${path}.nextRound`);
  assertPointDeltas(value.matchScoresAfter, `${path}.matchScoresAfter`);
  if (activeYaku.reduce((sum, entry) => sum + entry.points, 0) !== value.basePoints) {
    const luckyBase =
      value.kind === "luckyWin" && value.basePoints === 6 && activeYaku.length === 0;
    if (!luckyBase) rejectProtocol("PUBLIC_RESULT_INVALID", `${path}.basePoints is inconsistent.`);
  }
  const basePoints = value.basePoints as number;
  const awardedPoints = value.awardedPoints as number;
  const scoringMultiplier = value.scoringMultiplier as number | null;
  if (scoringMultiplier !== null && awardedPoints !== basePoints * scoringMultiplier) {
    rejectProtocol("PUBLIC_RESULT_INVALID", `${path}.awardedPoints is inconsistent.`);
  }
  const evidence = value.evidence as Record<string, unknown> | null;
  const ordinaryScored = value.kind === "bankedScore" || value.kind === "endOfPlayLastKoiCaller";
  if (ordinaryScored) {
    if (evidence?.kind !== "ordinaryYaku" || value.scorerId === null) {
      rejectProtocol(
        "PUBLIC_RESULT_EVIDENCE_INVALID",
        `${path}.evidence must contain ordinary Yaku evidence.`,
      );
    }
    const formations = evidence.completedFormations as readonly Record<string, unknown>[];
    const scored = evidence.scoredYaku as readonly Record<string, unknown>[];
    const activeKeys = new Set(activeYaku.map((entry) => entry.key));
    const formationBySequence = new Map(
      formations.map((entry) => [entry.sequence as number, entry]),
    );
    const sequences = scored.map((entry) => entry.formationSequence as number);
    if (
      scored.length !== activeYaku.length ||
      new Set(sequences).size !== sequences.length ||
      sequences.some((sequence, index) => index > 0 && (sequences[index - 1] ?? 0) >= sequence) ||
      scored.some((row) => {
        const yaku = row.yaku as ActiveYakuV1;
        const formation = formationBySequence.get(row.formationSequence as number);
        return (
          !activeKeys.has(yaku.key) ||
          !activeYaku.some((active) => JSON.stringify(active) === JSON.stringify(yaku)) ||
          formation === undefined ||
          formation.playerId !== value.scorerId ||
          (formation.yaku as Record<string, unknown>).key !== yaku.key ||
          !(formation.contributingCardIds as readonly unknown[]).every((cardId) =>
            (row.contributingCardIds as readonly unknown[]).includes(cardId),
          )
        );
      }) ||
      scored.reduce((sum, row) => sum + ((row.yaku as ActiveYakuV1).points ?? 0), 0) !== basePoints
    ) {
      rejectProtocol("PUBLIC_RESULT_EVIDENCE_INVALID", `${path}.ordinaryYaku is inconsistent.`);
    }
  } else if (evidence?.kind === "ordinaryYaku") {
    rejectProtocol(
      "PUBLIC_RESULT_EVIDENCE_INVALID",
      `${path}.ordinaryYaku is only valid for scored rounds.`,
    );
  }
}

function assertMatchResult(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["matchLength", "roundsPlayed", "finalScores", "winnerId"], path);
  assertEnum(value.matchLength, MATCH_LENGTHS, `${path}.matchLength`);
  assertPositiveInteger(value.roundsPlayed, `${path}.roundsPlayed`);
  assertPointDeltas(value.finalScores, `${path}.finalScores`);
  assertPlayerOrNull(value.winnerId, `${path}.winnerId`);
}

function assertYakuContext(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(value, ["phase", "newYaku", "activeYaku", "currentYakuTotal", "resume"], path);
  assertEnum(value.phase, ["hand", "draw"] as const, `${path}.phase`);
  const newYaku = assertActiveYakuList(value.newYaku, `${path}.newYaku`);
  const activeYaku = assertActiveYakuList(value.activeYaku, `${path}.activeYaku`);
  assertNonnegativeInteger(value.currentYakuTotal, `${path}.currentYakuTotal`);
  if (
    newYaku.length === 0 ||
    newYaku.some((entry) => !activeYaku.some((active) => active.key === entry.key)) ||
    activeYaku.reduce((sum, entry) => sum + entry.points, 0) !== value.currentYakuTotal
  ) {
    rejectProtocol("PUBLIC_YAKU_CONTEXT_INVALID", `${path} is internally inconsistent.`);
  }
  assertRecord(value.resume, `${path}.resume`);
  if (value.resume.kind === "drawPhase") {
    assertExactKeys(value.resume, ["kind"], `${path}.resume`);
  } else if (value.resume.kind === "completeTurn" || value.resume.kind === "endOfPlay") {
    assertExactKeys(value.resume, ["kind", "lastActorId"], `${path}.resume`);
    assertPlayer(value.resume.lastActorId, `${path}.resume.lastActorId`);
  } else {
    rejectProtocol("PUBLIC_YAKU_CONTEXT_INVALID", `${path}.resume.kind is invalid.`);
  }
}

function assertPublicPlayer(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(
    value,
    ["id", "score", "handCount", "captured", "activeYaku", "currentYakuTotal"],
    path,
  );
  assertPlayer(value.id, `${path}.id`);
  assertNonnegativeInteger(value.score, `${path}.score`);
  assertNonnegativeInteger(value.handCount, `${path}.handCount`);
  if ((value.handCount as number) > 8) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.handCount cannot exceed 8.`);
  }
  assertCards(value.captured, `${path}.captured`);
  const activeYaku = assertActiveYakuList(value.activeYaku, `${path}.activeYaku`);
  assertNonnegativeInteger(value.currentYakuTotal, `${path}.currentYakuTotal`);
  if (activeYaku.reduce((sum, entry) => sum + entry.points, 0) !== value.currentYakuTotal) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.currentYakuTotal is inconsistent.`);
  }
}

function assertPublicRound(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactKeys(
    value,
    [
      "roundNumber",
      "scheduledMonth",
      "isFinalScheduledRound",
      "starterId",
      "field",
      "drawPileCount",
      "tableMultiplier",
      "mostRecentKoiKoiCallerId",
      "firstYakuTriggerPlayerId",
      "specialPrivilege",
      "frozenFinalRoundLeaderId",
    ],
    path,
  );
  assertPositiveInteger(value.roundNumber, `${path}.roundNumber`);
  assertMonth(value.scheduledMonth, `${path}.scheduledMonth`);
  assertBoolean(value.isFinalScheduledRound, `${path}.isFinalScheduledRound`);
  assertPlayer(value.starterId, `${path}.starterId`);
  assertCards(value.field, `${path}.field`);
  assertNonnegativeInteger(value.drawPileCount, `${path}.drawPileCount`);
  if ((value.drawPileCount as number) > 24) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.drawPileCount cannot exceed 24.`);
  }
  assertEnum(value.tableMultiplier, [1, 2, 3, 4] as const, `${path}.tableMultiplier`);
  assertPlayerOrNull(value.mostRecentKoiKoiCallerId, `${path}.mostRecentKoiKoiCallerId`);
  assertPlayerOrNull(value.firstYakuTriggerPlayerId, `${path}.firstYakuTriggerPlayerId`);
  assertPrivilege(value.specialPrivilege, `${path}.specialPrivilege`);
  assertPlayerOrNull(value.frozenFinalRoundLeaderId, `${path}.frozenFinalRoundLeaderId`);
}

function assertPublicPhase(value: unknown, path: string): void {
  assertRecord(value, path);
  if (value.kind === "awaitingHandPlay") {
    assertExactKeys(value, ["kind", "playerId"], path);
    assertPlayer(value.playerId, `${path}.playerId`);
  } else if (value.kind === "awaitingDrawResolution") {
    assertExactKeys(value, ["kind", "playerId", "drawnCardId", "resolution"], path);
    assertPlayer(value.playerId, `${path}.playerId`);
    assertCard(value.drawnCardId, `${path}.drawnCardId`);
    assertDrawResolution(value.resolution, `${path}.resolution`);
  } else if (value.kind === "awaitingYakuDecision") {
    assertExactKeys(value, ["kind", "playerId", "context"], path);
    assertPlayer(value.playerId, `${path}.playerId`);
    assertYakuContext(value.context, `${path}.context`);
  } else if (value.kind === "roundComplete") {
    assertExactKeys(value, ["kind", "result", "transitionPending"], path);
    assertRoundResult(value.result, `${path}.result`);
    if (value.transitionPending !== true) {
      rejectProtocol("PUBLIC_STATE_INVALID", `${path}.transitionPending must be true.`);
    }
  } else if (value.kind === "matchComplete") {
    assertExactKeys(value, ["kind", "result"], path);
    assertMatchResult(value.result, `${path}.result`);
  } else {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.kind is invalid.`);
  }
}

export function assertPublicGameStateV1(
  value: unknown,
  path: string,
): asserts value is PublicGameStateV1 {
  assertRecord(value, path);
  assertExactKeys(
    value,
    [
      "formatVersion",
      "rulesVersion",
      "stateVersion",
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
  if (value.formatVersion !== 1 || value.rulesVersion !== "1.0") {
    rejectProtocol("PUBLIC_STATE_VERSION_UNSUPPORTED", `${path} version is unsupported.`);
  }
  assertPositiveInteger(value.stateVersion, `${path}.stateVersion`);
  if (typeof value.matchId !== "string" || value.matchId.trim().length === 0) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.matchId is required.`);
  }
  assertEnum(value.matchLength, MATCH_LENGTHS, `${path}.matchLength`);
  assertEnum(value.status, ["inProgress", "complete"] as const, `${path}.status`);
  assertArray(value.players, `${path}.players`);
  if (value.players.length !== 2) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.players must contain two players.`);
  }
  value.players.forEach((player, index) => assertPublicPlayer(player, `${path}.players[${index}]`));
  if (
    (value.players[0] as Record<string, unknown> | undefined)?.id !== "player-a" ||
    (value.players[1] as Record<string, unknown> | undefined)?.id !== "player-b"
  ) {
    rejectProtocol("PUBLIC_STATE_INVALID", `${path}.players must be in canonical order.`);
  }
  assertPublicRound(value.round, `${path}.round`);
  assertPublicPhase(value.phase, `${path}.phase`);
  assertArray(value.history, `${path}.history`);
  value.history.forEach((result, index) => assertRoundResult(result, `${path}.history[${index}]`));
}

function assertActor(value: Record<string, unknown>, path: string): void {
  assertPlayer(value.actorId, `${path}.actorId`);
}

function assertCapturePhase(value: unknown, path: string): void {
  assertEnum(value, ["hand", "draw"] as const, path);
}

function assertCaptureKind(value: unknown, path: string): void {
  assertEnum(value, ["pair", "fourCardSweep"] as const, path);
}

function assertPublicEvent(event: unknown, path: string): void {
  assertRecord(event, path);
  if (typeof event.type !== "string") {
    rejectProtocol("PUBLIC_EVENT_INVALID", `${path}.type is required.`);
  }
  switch (event.type) {
    case "matchStarted":
      assertExactKeys(event, ["type", "matchId", "matchLength"], path);
      if (typeof event.matchId !== "string" || event.matchId.trim().length === 0) {
        rejectProtocol("PUBLIC_EVENT_INVALID", `${path}.matchId is required.`);
      }
      assertEnum(event.matchLength, MATCH_LENGTHS, `${path}.matchLength`);
      break;
    case "starterSelected":
      assertExactKeys(event, ["type", "starterId"], path);
      assertPlayer(event.starterId, `${path}.starterId`);
      break;
    case "roundStarted":
      assertExactKeys(event, ["type", "roundNumber", "scheduledMonth", "starterId"], path);
      assertPositiveInteger(event.roundNumber, `${path}.roundNumber`);
      assertMonth(event.scheduledMonth, `${path}.scheduledMonth`);
      assertPlayer(event.starterId, `${path}.starterId`);
      break;
    case "cardsDealt":
      assertExactKeys(event, ["type", "field", "handCounts", "drawPileCount"], path);
      assertCards(event.field, `${path}.field`);
      assertRecord(event.handCounts, `${path}.handCounts`);
      assertExactKeys(event.handCounts, PLAYER_IDS, `${path}.handCounts`);
      assertNonnegativeInteger(event.handCounts["player-a"], `${path}.handCounts.player-a`);
      assertNonnegativeInteger(event.handCounts["player-b"], `${path}.handCounts.player-b`);
      assertNonnegativeInteger(event.drawPileCount, `${path}.drawPileCount`);
      break;
    case "initialFieldCancellationDetected":
      assertExactKeys(event, ["type", "completeFieldMonths"], path);
      assertCompleteMonths(event.completeFieldMonths, `${path}.completeFieldMonths`);
      break;
    case "automaticRoundResultCommitted":
      assertExactKeys(event, ["type", "resultKind", "reasonCode", "pointDeltas"], path);
      assertEnum(
        event.resultKind,
        ["fieldCancellation", "luckyWin", "bothLuckyDraw"] as const,
        `${path}.resultKind`,
      );
      assertEnum(
        event.reasonCode,
        [
          "FIELD_FOUR_MONTH_CANCELLED",
          "LUCKY_FOUR_MONTH",
          "LUCKY_FOUR_PAIRS",
          "BOTH_LUCKY_DRAW",
        ] as const,
        `${path}.reasonCode`,
      );
      assertPointDeltas(event.pointDeltas, `${path}.pointDeltas`);
      break;
    case "luckyHandEvidenceRevealed":
      assertExactKeys(event, ["type", "evidence"], path);
      assertLuckyHands(event.evidence, `${path}.evidence`);
      break;
    case "roundReady":
      assertExactKeys(event, ["type", "activePlayerId"], path);
      assertPlayer(event.activePlayerId, `${path}.activePlayerId`);
      break;
    case "handCardPlayed":
      assertExactKeys(event, ["type", "actorId", "cardId"], path);
      assertActor(event, path);
      assertCard(event.cardId, `${path}.cardId`);
      break;
    case "cardPlacedOnField":
      assertExactKeys(event, ["type", "actorId", "phase", "cardId"], path);
      assertActor(event, path);
      assertCapturePhase(event.phase, `${path}.phase`);
      assertCard(event.cardId, `${path}.cardId`);
      break;
    case "captureStarted":
      assertExactKeys(
        event,
        ["type", "actorId", "phase", "sourceCardId", "targetFieldCardIds", "captureKind"],
        path,
      );
      assertActor(event, path);
      assertCapturePhase(event.phase, `${path}.phase`);
      assertCard(event.sourceCardId, `${path}.sourceCardId`);
      assertCards(event.targetFieldCardIds, `${path}.targetFieldCardIds`);
      assertCaptureKind(event.captureKind, `${path}.captureKind`);
      break;
    case "cardsCaptured":
      assertExactKeys(event, ["type", "actorId", "phase", "cardIds", "captureKind"], path);
      assertActor(event, path);
      assertCapturePhase(event.phase, `${path}.phase`);
      assertCards(event.cardIds, `${path}.cardIds`);
      assertCaptureKind(event.captureKind, `${path}.captureKind`);
      break;
    case "drawCardRevealed":
      assertExactKeys(event, ["type", "actorId", "cardId", "remainingDrawPileCount"], path);
      assertActor(event, path);
      assertCard(event.cardId, `${path}.cardId`);
      assertNonnegativeInteger(event.remainingDrawPileCount, `${path}.remainingDrawPileCount`);
      break;
    case "drawResolutionRequired":
      assertExactKeys(event, ["type", "actorId", "drawnCardId", "resolution"], path);
      assertActor(event, path);
      assertCard(event.drawnCardId, `${path}.drawnCardId`);
      assertDrawResolution(event.resolution, `${path}.resolution`);
      break;
    case "yakuCompleted":
      assertExactKeys(event, ["type", "actorId", "phase", "yaku"], path);
      assertActor(event, path);
      assertCapturePhase(event.phase, `${path}.phase`);
      assertActiveYaku(event.yaku, `${path}.yaku`);
      break;
    case "yakuValueChanged":
      assertExactKeys(
        event,
        ["type", "actorId", "phase", "yakuKey", "name", "previousPoints", "currentPoints"],
        path,
      );
      assertActor(event, path);
      assertCapturePhase(event.phase, `${path}.phase`);
      assertEnum(event.yakuKey, YAKU_TRIGGER_KEYS, `${path}.yakuKey`);
      assertNonnegativeInteger(event.previousPoints, `${path}.previousPoints`);
      assertNonnegativeInteger(event.currentPoints, `${path}.currentPoints`);
      assertActiveYaku({ key: event.yakuKey, name: event.name, points: event.currentPoints }, path);
      break;
    case "yakuDecisionRequired":
      assertExactKeys(event, ["type", "actorId", "context"], path);
      assertActor(event, path);
      assertYakuContext(event.context, `${path}.context`);
      break;
    case "turnCompleted":
      assertExactKeys(event, ["type", "actorId", "nextPlayerId"], path);
      assertActor(event, path);
      assertPlayerOrNull(event.nextPlayerId, `${path}.nextPlayerId`);
      break;
    case "endOfPlayReached":
      assertExactKeys(event, ["type", "actorId", "unusedDrawPileCount"], path);
      assertActor(event, path);
      assertNonnegativeInteger(event.unusedDrawPileCount, `${path}.unusedDrawPileCount`);
      break;
    case "yakuDecisionChosen":
      assertExactKeys(event, ["type", "actorId", "choice", "privilegeUsed"], path);
      assertActor(event, path);
      assertEnum(event.choice, ["bank", "koiKoi"] as const, `${path}.choice`);
      assertBoolean(event.privilegeUsed, `${path}.privilegeUsed`);
      break;
    case "koiKoiCalled":
      assertExactKeys(
        event,
        ["type", "actorId", "previousTableMultiplier", "currentTableMultiplier", "privilegeUsed"],
        path,
      );
      assertActor(event, path);
      assertEnum(
        event.previousTableMultiplier,
        [1, 2, 3, 4] as const,
        `${path}.previousTableMultiplier`,
      );
      assertEnum(
        event.currentTableMultiplier,
        [1, 2, 3, 4] as const,
        `${path}.currentTableMultiplier`,
      );
      assertBoolean(event.privilegeUsed, `${path}.privilegeUsed`);
      break;
    case "roundResultCommitted":
      assertExactKeys(event, ["type", "result"], path);
      assertRoundResult(event.result, `${path}.result`);
      break;
    case "roundTransitionPrepared":
      assertExactKeys(event, ["type", "nextRound"], path);
      assertNextRound(event.nextRound, `${path}.nextRound`);
      if (event.nextRound === null)
        rejectProtocol("PUBLIC_EVENT_INVALID", `${path}.nextRound is required.`);
      break;
    case "matchCompleted":
      assertExactKeys(event, ["type", "result"], path);
      assertMatchResult(event.result, `${path}.result`);
      break;
    default:
      rejectProtocol("PUBLIC_EVENT_INVALID", `${path}.type is not a public event.`);
  }
}

export function assertPublicGameEventsV1(
  value: unknown,
  path: string,
): asserts value is readonly PublicGameEventV1[] {
  assertArray(value, path);
  value.forEach((event, index) => assertPublicEvent(event, `${path}[${index}]`));
}
