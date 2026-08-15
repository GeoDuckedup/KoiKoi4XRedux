import { CARD_IDS, isCardId, type CardId } from "../cards/catalog";
import { evaluateOpeningOutcome } from "../rules/opening-outcomes";
import { getHandPlayResolutionPreview } from "../rules/capture";
import {
  createAutomaticRoundResult,
  createMatchResult,
  deriveNextRoundPlan,
  frozenLeader,
} from "../rules/round-results";
import {
  deriveYakuContributingCardIds,
  evaluateYaku,
  hasValidYakuSeenHistory,
  isCanonicalActiveYaku,
  isCanonicalYakuContributionSnapshot,
  isYakuTriggerKey,
} from "../rules/yaku";
import {
  MATCH_LENGTHS,
  PLAYER_IDS,
  type AuthoritativeGameStateV1,
  type CompletedYakuFormationV1,
  type RoundResultV1,
  type ScoredYakuEvidenceV1,
} from "./types";
import { isTrustedValidatedEngineState } from "./trusted-engine-state-cache";

export interface StateValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

/**
 * Engine transitions deep-freeze their evidence. Re-validating an unchanged,
 * already frozen formation/history object on each subsequent command is pure
 * duplicate work, so memoize only demonstrably deep-frozen engine artifacts.
 * Hand-authored or partially frozen external states always take the full path.
 */
const COMPLETED_FORMATION_VALIDITY = new WeakMap<object, boolean>();
const ORDINARY_RESULT_VALIDITY = new WeakMap<object, boolean>();

function issue(code: string, path: string, message: string): StateValidationIssue {
  return Object.freeze({ code, path, message });
}

function otherPlayerId(playerId: (typeof PLAYER_IDS)[number]): (typeof PLAYER_IDS)[number] {
  return playerId === PLAYER_IDS[0] ? PLAYER_IDS[1] : PLAYER_IDS[0];
}

function expectedActivePlayer(
  state: AuthoritativeGameStateV1,
  phaseKind: "awaitingHandPlay" | "awaitingDrawResolution",
): (typeof PLAYER_IDS)[number] | null {
  if (!PLAYER_IDS.includes(state.round.starterId)) return null;
  const starterId = state.round.starterId;
  const opponentId = otherPlayerId(starterId);
  const starterHandCount = state.players.find((player) => player.id === starterId)?.hand.length;
  const opponentHandCount = state.players.find((player) => player.id === opponentId)?.hand.length;
  if (starterHandCount === undefined || opponentHandCount === undefined) return null;
  const handsEqual = starterHandCount === opponentHandCount;
  const starterHasPlayedOneMore = starterHandCount + 1 === opponentHandCount;
  if (phaseKind === "awaitingHandPlay") {
    return handsEqual ? starterId : starterHasPlayedOneMore ? opponentId : null;
  }
  return starterHasPlayedOneMore ? starterId : handsEqual ? opponentId : null;
}

function authoritativeCardZones(state: AuthoritativeGameStateV1): readonly {
  path: string;
  cards: readonly CardId[];
}[] {
  const zones = [
    { path: "$.players[0].hand", cards: state.players[0].hand },
    { path: "$.players[1].hand", cards: state.players[1].hand },
    { path: "$.round.field", cards: state.round.field },
    { path: "$.round.drawPile", cards: state.round.drawPile },
    { path: "$.players[0].captured", cards: state.players[0].captured },
    { path: "$.players[1].captured", cards: state.players[1].captured },
  ];
  return state.phase.kind === "awaitingDrawResolution"
    ? [
        ...zones,
        { path: "$.phase.drawnCardId", cards: [state.phase.drawnCardId] as readonly CardId[] },
      ]
    : zones;
}

function cardIdsAreCanonicalOrder(cardIds: readonly CardId[]): boolean {
  return cardIds.every(
    (cardId, index) =>
      index === 0 || CARD_IDS.indexOf(cardIds[index - 1] ?? cardId) < CARD_IDS.indexOf(cardId),
  );
}

function isDeepFrozenFormationSet(formations: readonly CompletedYakuFormationV1[]): boolean {
  return (
    Object.isFrozen(formations) &&
    formations.every(
      (formation) =>
        Object.isFrozen(formation) &&
        Object.isFrozen(formation.yaku) &&
        Object.isFrozen(formation.contributingCardIds),
    )
  );
}

function completedFormationsAreStructurallyValid(
  formations: readonly CompletedYakuFormationV1[],
  scheduledMonth: number,
): boolean {
  const cacheable = isDeepFrozenFormationSet(formations);
  const cached = cacheable ? COMPLETED_FORMATION_VALIDITY.get(formations) : undefined;
  if (cached !== undefined) return cached;
  const formationKeys = new Set<string>();
  const valid = formations.every((formation, index) => {
    const uniqueKey = `${formation.playerId}:${formation.yaku.key}`;
    const valid =
      formation.sequence === index + 1 &&
      PLAYER_IDS.includes(formation.playerId) &&
      (formation.phase === "hand" || formation.phase === "draw") &&
      isCanonicalActiveYaku(formation.yaku) &&
      formation.contributingCardIds.length > 0 &&
      formation.contributingCardIds.every(isCardId) &&
      new Set(formation.contributingCardIds).size === formation.contributingCardIds.length &&
      cardIdsAreCanonicalOrder(formation.contributingCardIds) &&
      isCanonicalYakuContributionSnapshot(
        formation.yaku,
        formation.contributingCardIds,
        scheduledMonth as 1,
      ) &&
      !formationKeys.has(uniqueKey);
    formationKeys.add(uniqueKey);
    return valid;
  });
  if (cacheable) COMPLETED_FORMATION_VALIDITY.set(formations, valid);
  return valid;
}

function scoredYakuRowsAreValid(
  result: RoundResultV1,
  scoredYaku: readonly ScoredYakuEvidenceV1[],
  completedFormations: readonly CompletedYakuFormationV1[],
): boolean {
  if (result.scorerId === null || scoredYaku.length !== result.activeYaku.length) return false;
  const sequences = scoredYaku.map((row) => row.formationSequence);
  if (
    new Set(sequences).size !== sequences.length ||
    !sequences.every((entry, index) => index === 0 || (sequences[index - 1] ?? 0) < entry)
  )
    return false;
  const rowsMatchActive = scoredYaku.every((row) =>
    result.activeYaku.some(
      (active) =>
        JSON.stringify(active) === JSON.stringify(row.yaku) &&
        row.contributingCardIds.length > 0 &&
        row.contributingCardIds.every(isCardId) &&
        new Set(row.contributingCardIds).size === row.contributingCardIds.length &&
        cardIdsAreCanonicalOrder(row.contributingCardIds) &&
        isCanonicalYakuContributionSnapshot(
          row.yaku,
          row.contributingCardIds,
          result.scheduledMonth,
        ) &&
        (() => {
          const formation = completedFormations.find(
            (candidate) =>
              candidate.sequence === row.formationSequence &&
              candidate.playerId === result.scorerId &&
              candidate.yaku.key === row.yaku.key,
          );
          return (
            formation !== undefined &&
            formation.contributingCardIds.every((cardId) =>
              row.contributingCardIds.includes(cardId),
            )
          );
        })(),
    ),
  );
  return (
    rowsMatchActive &&
    scoredYaku.reduce((sum, row) => sum + row.yaku.points, 0) === result.basePoints
  );
}

function ordinaryYakuEvidenceIsValid(result: RoundResultV1): boolean {
  if (result.evidence?.kind !== "ordinaryYaku") return false;
  const cacheable =
    Object.isFrozen(result) &&
    Object.isFrozen(result.activeYaku) &&
    Object.isFrozen(result.evidence) &&
    Object.isFrozen(result.evidence.scoredYaku) &&
    result.evidence.scoredYaku.every(
      (row) =>
        Object.isFrozen(row) &&
        Object.isFrozen(row.yaku) &&
        Object.isFrozen(row.contributingCardIds),
    );
  const cached = cacheable ? ORDINARY_RESULT_VALIDITY.get(result) : undefined;
  if (cached !== undefined) return cached;
  const valid =
    completedFormationsAreStructurallyValid(
      result.evidence.completedFormations,
      result.scheduledMonth,
    ) &&
    scoredYakuRowsAreValid(result, result.evidence.scoredYaku, result.evidence.completedFormations);
  if (cacheable) ORDINARY_RESULT_VALIDITY.set(result, valid);
  return valid;
}

function currentRoundResultMatchesLiveState(
  state: AuthoritativeGameStateV1,
  scoresBeforeRound: { readonly "player-a": number; readonly "player-b": number },
): boolean {
  if (state.phase.kind !== "roundComplete" && state.phase.kind !== "matchComplete") return true;
  const result = state.history[state.history.length - 1];
  if (result === undefined) return false;
  if (
    result.kind === "fieldCancellation" ||
    result.kind === "luckyWin" ||
    result.kind === "bothLuckyDraw"
  ) {
    const outcome = evaluateOpeningOutcome(state.round.field, [
      state.players[0].hand,
      state.players[1].hand,
    ]);
    return (
      outcome !== null &&
      JSON.stringify(
        createAutomaticRoundResult(
          { matchLength: state.matchLength, round: state.round },
          outcome,
          scoresBeforeRound,
        ),
      ) === JSON.stringify(result)
    );
  }
  if (result.kind === "endOfPlayNoScore") {
    return (
      state.round.mostRecentKoiKoiCallerId === null &&
      state.players.every((player) => player.hand.length === 0) &&
      state.round.drawPile.length === 8
    );
  }
  if (result.scorerId === null) return false;
  const scorer = state.players.find((player) => player.id === result.scorerId);
  if (
    scorer === undefined ||
    JSON.stringify(result.activeYaku) !== JSON.stringify(scorer.activeYaku) ||
    result.basePoints !== scorer.currentYakuTotal
  ) {
    return false;
  }
  if (
    result.evidence?.kind === "ordinaryYaku" &&
    !result.evidence.scoredYaku.every(
      (row) =>
        JSON.stringify(row.contributingCardIds) ===
        JSON.stringify(
          deriveYakuContributingCardIds(row.yaku.key, scorer.captured, state.round.scheduledMonth),
        ),
    )
  ) {
    return false;
  }
  if (result.kind === "endOfPlayLastKoiCaller") {
    return (
      state.round.mostRecentKoiKoiCallerId === result.scorerId &&
      state.players.every((player) => player.hand.length === 0) &&
      state.round.drawPile.length === 8 &&
      result.tableMultiplierAtDecision === state.round.tableMultiplier &&
      result.scoringMultiplier === state.round.tableMultiplier
    );
  }
  const ordinaryBank =
    result.tableMultiplierAtDecision === state.round.tableMultiplier &&
    result.scoringMultiplier === state.round.tableMultiplier;
  const priorPrivilege =
    state.history[state.history.length - 2]?.nextRound?.specialPrivilege?.playerId ===
    result.scorerId;
  const privilegedBank =
    result.tableMultiplierAtDecision === 1 &&
    result.scoringMultiplier === 2 &&
    state.round.tableMultiplier === 1 &&
    priorPrivilege;
  const forbiddenFinalLeaderBank =
    state.round.isFinalScheduledRound &&
    state.round.frozenFinalRoundLeaderId === result.scorerId &&
    state.round.firstYakuTriggerPlayerId === result.scorerId &&
    result.scoringMultiplier === 1;
  return (ordinaryBank || privilegedBank) && !forbiddenFinalLeaderBank;
}

export function validateCardOwnership(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const issues: StateValidationIssue[] = [];
  const seen = new Map<string, string>();
  let count = 0;
  for (const zone of authoritativeCardZones(state)) {
    for (const [index, cardId] of zone.cards.entries()) {
      count += 1;
      if (!isCardId(cardId)) {
        issues.push(
          issue("CARD_ZONE_UNKNOWN_ID", `${zone.path}[${index}]`, `Unknown CardId ${cardId}.`),
        );
        continue;
      }
      const previousPath = seen.get(cardId);
      if (previousPath !== undefined) {
        issues.push(
          issue(
            "CARD_ZONE_DUPLICATE",
            `${zone.path}[${index}]`,
            `${cardId} already exists at ${previousPath}.`,
          ),
        );
      } else {
        seen.set(cardId, `${zone.path}[${index}]`);
      }
    }
  }
  if (count !== CARD_IDS.length) {
    issues.push(
      issue("CARD_ZONE_COUNT", "$", `Authoritative zones contain ${count} cards instead of 48.`),
    );
  }
  for (const cardId of CARD_IDS) {
    if (!seen.has(cardId)) {
      issues.push(issue("CARD_ZONE_MISSING", "$", `Missing canonical card ${cardId}.`));
    }
  }
  return Object.freeze(issues);
}

export function validateAuthoritativeState(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const issues = [...validateCardOwnership(state)];
  if (state.formatVersion !== 1 || state.rulesVersion !== "1.0") {
    issues.push(issue("STATE_FORMAT_INVALID", "$", "Unsupported state or rules version."));
  }
  if (!Number.isSafeInteger(state.stateVersion) || state.stateVersion < 1) {
    issues.push(
      issue("STATE_VERSION_INVALID", "$.stateVersion", "State version must be a positive integer."),
    );
  }
  if (
    (state.status !== "inProgress" && state.status !== "complete") ||
    state.matchId.trim().length === 0 ||
    state.lastAcceptedCommandId.trim().length === 0
  ) {
    issues.push(
      issue("MATCH_STATE_INVALID", "$", "Game state must identify a supported match status."),
    );
  }
  if (!MATCH_LENGTHS.includes(state.matchLength)) {
    issues.push(
      issue("MATCH_LENGTH_INVALID", "$.matchLength", "Match length must be 3, 6, or 12."),
    );
  }
  if (
    state.players.length !== 2 ||
    state.players[0].id !== PLAYER_IDS[0] ||
    state.players[1].id !== PLAYER_IDS[1]
  ) {
    issues.push(issue("PLAYER_ID_INVALID", "$.players", "Player positions must be canonical."));
  }
  for (const [index, player] of state.players.entries()) {
    if (!Number.isSafeInteger(player.score) || player.score < 0) {
      issues.push(
        issue("PLAYER_SCORE_INVALID", `$.players[${index}].score`, "Score must be nonnegative."),
      );
    }
    if (player.hand.length > 8) {
      issues.push(
        issue(
          "PLAYER_HAND_COUNT_INVALID",
          `$.players[${index}].hand`,
          "Hand size must be 0 through 8.",
        ),
      );
    }
    const seenYakuKeysValid =
      player.seenYakuKeys.every(isYakuTriggerKey) &&
      new Set(player.seenYakuKeys).size === player.seenYakuKeys.length;
    if (!seenYakuKeysValid) {
      issues.push(
        issue(
          "PLAYER_YAKU_SEEN_INVALID",
          `$.players[${index}].seenYakuKeys`,
          "Seen yaku trigger keys must be canonical and unique.",
        ),
      );
    }
    const scheduledMonthValid =
      Number.isSafeInteger(state.round.scheduledMonth) &&
      state.round.scheduledMonth >= 1 &&
      state.round.scheduledMonth <= 12;
    if (player.captured.every(isCardId) && seenYakuKeysValid && scheduledMonthValid) {
      const expectedYaku = evaluateYaku(
        player.captured,
        state.round.scheduledMonth,
        player.seenYakuKeys,
      );
      if (
        !hasValidYakuSeenHistory(player.captured, state.round.scheduledMonth, player.seenYakuKeys)
      ) {
        issues.push(
          issue(
            "PLAYER_YAKU_SEEN_EVIDENCE_INVALID",
            `$.players[${index}].seenYakuKeys`,
            "Seen yaku keys must be supported by current or historically possible captures.",
          ),
        );
      }
      if (
        JSON.stringify(player.activeYaku) !== JSON.stringify(expectedYaku.activeYaku) ||
        player.currentYakuTotal !== expectedYaku.currentYakuTotal
      ) {
        issues.push(
          issue(
            "PLAYER_YAKU_STATE_INVALID",
            `$.players[${index}]`,
            "Active yaku and current total must match captured cards and scheduled month.",
          ),
        );
      }
      if (expectedYaku.newYaku.length > 0) {
        issues.push(
          issue(
            "PLAYER_YAKU_TRIGGER_UNSEEN",
            `$.players[${index}].seenYakuKeys`,
            "Every active trigger key must be recorded before authoritative state is committed.",
          ),
        );
      }
    }
  }
  if (
    !Number.isSafeInteger(state.round.roundNumber) ||
    state.round.roundNumber < 1 ||
    state.round.roundNumber > state.matchLength ||
    state.round.scheduledMonth !== state.round.roundNumber
  ) {
    issues.push(
      issue(
        "ROUND_SCHEDULE_INVALID",
        "$.round",
        "Round number and scheduled month must align within the match length.",
      ),
    );
  }
  if (state.round.isFinalScheduledRound !== (state.round.roundNumber === state.matchLength)) {
    issues.push(
      issue(
        "FINAL_ROUND_FLAG_INVALID",
        "$.round.isFinalScheduledRound",
        "Final-round flag must match the configured last scheduled round.",
      ),
    );
  }
  const historyScores = state.history.reduce(
    (scores, result) => ({
      "player-a": scores["player-a"] + result.pointDeltas["player-a"],
      "player-b": scores["player-b"] + result.pointDeltas["player-b"],
    }),
    { "player-a": 0, "player-b": 0 },
  );
  if (
    historyScores["player-a"] !== state.players[0].score ||
    historyScores["player-b"] !== state.players[1].score
  ) {
    issues.push(
      issue(
        "HISTORY_SCORE_INVALID",
        "$.history",
        "Player scores must equal the sum of durable round point deltas.",
      ),
    );
  }
  let cumulativeScores = { "player-a": 0, "player-b": 0 };
  for (const [index, result] of state.history.entries()) {
    const expectedRound = index + 1;
    cumulativeScores = {
      "player-a": cumulativeScores["player-a"] + result.pointDeltas["player-a"],
      "player-b": cumulativeScores["player-b"] + result.pointDeltas["player-b"],
    };
    const reasonMatchesKind =
      (result.kind === "bankedScore" && result.reasonCode === "BANKED_SCORE") ||
      (result.kind === "endOfPlayLastKoiCaller" &&
        result.reasonCode === "END_OF_PLAY_LAST_KOI_CALLER") ||
      (result.kind === "endOfPlayNoScore" && result.reasonCode === "END_OF_PLAY_NO_SCORE") ||
      (result.kind === "fieldCancellation" && result.reasonCode === "FIELD_FOUR_MONTH_CANCELLED") ||
      (result.kind === "luckyWin" &&
        (result.reasonCode === "LUCKY_FOUR_MONTH" || result.reasonCode === "LUCKY_FOUR_PAIRS")) ||
      (result.kind === "bothLuckyDraw" && result.reasonCode === "BOTH_LUCKY_DRAW");
    const expectedNextRound = deriveNextRoundPlan(
      {
        matchLength: state.matchLength,
        round: {
          ...state.round,
          roundNumber: result.roundNumber,
          scheduledMonth: result.scheduledMonth,
          isFinalScheduledRound: result.roundNumber === state.matchLength,
          starterId: result.starterId,
        },
      },
      result.scorerId,
      result.scoringMultiplier,
    );
    const activeTotal = result.activeYaku.reduce((total, yaku) => total + yaku.points, 0);
    const activeYakuValid =
      result.activeYaku.every(isCanonicalActiveYaku) &&
      new Set(result.activeYaku.map((entry) => entry.key)).size === result.activeYaku.length;
    const kindFieldsValid =
      result.kind === "luckyWin"
        ? result.scorerId !== null &&
          result.basePoints === 6 &&
          result.scoringMultiplier === 1 &&
          result.activeYaku.length === 0 &&
          result.evidence?.kind === "luckyHands"
        : result.kind === "fieldCancellation"
          ? result.scorerId === null &&
            result.basePoints === 0 &&
            result.activeYaku.length === 0 &&
            result.evidence?.kind === "fieldCancellation"
          : result.kind === "bothLuckyDraw"
            ? result.scorerId === null &&
              result.basePoints === 0 &&
              result.activeYaku.length === 0 &&
              result.evidence?.kind === "luckyHands"
            : result.kind === "bankedScore" || result.kind === "endOfPlayLastKoiCaller"
              ? result.scorerId !== null &&
                result.basePoints === activeTotal &&
                result.activeYaku.length > 0 &&
                ordinaryYakuEvidenceIsValid(result)
              : result.kind === "endOfPlayNoScore" &&
                result.basePoints === 0 &&
                result.activeYaku.length === 0 &&
                result.evidence === null;
    const arithmeticValid =
      result.roundNumber === expectedRound &&
      result.scheduledMonth === expectedRound &&
      PLAYER_IDS.includes(result.starterId) &&
      reasonMatchesKind &&
      kindFieldsValid &&
      activeYakuValid &&
      Number.isSafeInteger(result.pointDeltas["player-a"]) &&
      result.pointDeltas["player-a"] >= 0 &&
      Number.isSafeInteger(result.pointDeltas["player-b"]) &&
      result.pointDeltas["player-b"] >= 0 &&
      Number.isSafeInteger(result.basePoints) &&
      result.basePoints >= 0 &&
      Number.isSafeInteger(result.awardedPoints) &&
      result.awardedPoints >= 0 &&
      (result.scorerId === null
        ? result.awardedPoints === 0 &&
          result.scoringMultiplier === null &&
          result.tableMultiplierAtDecision === null &&
          result.pointDeltas["player-a"] === 0 &&
          result.pointDeltas["player-b"] === 0
        : PLAYER_IDS.includes(result.scorerId) &&
          result.scoringMultiplier !== null &&
          result.tableMultiplierAtDecision !== null &&
          [1, 2, 3, 4].includes(result.scoringMultiplier) &&
          [1, 2, 3, 4].includes(result.tableMultiplierAtDecision) &&
          result.awardedPoints === result.basePoints * result.scoringMultiplier &&
          result.pointDeltas[result.scorerId] === result.awardedPoints &&
          result.pointDeltas[otherPlayerId(result.scorerId)] === 0) &&
      JSON.stringify(result.nextRound) === JSON.stringify(expectedNextRound) &&
      JSON.stringify(result.matchScoresAfter) === JSON.stringify(cumulativeScores) &&
      (index === 0 || state.history[index - 1]?.nextRound?.starterId === result.starterId);
    if (!arithmeticValid) {
      issues.push(
        issue(
          "ROUND_HISTORY_INVALID",
          `$.history[${index}]`,
          "Round history must be contiguous and contain valid score arithmetic.",
        ),
      );
    }
  }
  const phaseHasCommittedResult =
    state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete";
  const expectedHistoryLength = phaseHasCommittedResult
    ? state.round.roundNumber
    : state.round.roundNumber - 1;
  if (state.history.length !== expectedHistoryLength) {
    issues.push(
      issue(
        "ROUND_HISTORY_LENGTH_INVALID",
        "$.history",
        "History must contain exactly the completed scheduled rounds.",
      ),
    );
  }
  const scoresBeforeRound = state.history.slice(0, Math.max(0, state.round.roundNumber - 1)).reduce(
    (scores, result) => ({
      "player-a": scores["player-a"] + result.pointDeltas["player-a"],
      "player-b": scores["player-b"] + result.pointDeltas["player-b"],
    }),
    { "player-a": 0, "player-b": 0 },
  );
  const expectedFrozenLeader = state.round.isFinalScheduledRound
    ? frozenLeader(scoresBeforeRound)
    : null;
  if (state.round.frozenFinalRoundLeaderId !== expectedFrozenLeader) {
    issues.push(
      issue(
        "FROZEN_FINAL_LEADER_INVALID",
        "$.round.frozenFinalRoundLeaderId",
        "Final-round leader must be frozen from scores before the final round.",
      ),
    );
  }
  if (!currentRoundResultMatchesLiveState(state, scoresBeforeRound)) {
    issues.push(
      issue(
        "CURRENT_ROUND_RESULT_INVALID",
        "$.history",
        "The current committed result must match live round evidence and scoring state.",
      ),
    );
  }
  const privilege = state.round.specialPrivilege;
  if (
    (state.round.mostRecentKoiKoiCallerId !== null &&
      !PLAYER_IDS.includes(state.round.mostRecentKoiKoiCallerId)) ||
    (privilege !== null &&
      (!PLAYER_IDS.includes(privilege.playerId) ||
        privilege.status !== "available" ||
        privilege.grantedFromRound !== state.round.roundNumber - 1 ||
        privilege.playerId !== state.round.starterId ||
        state.round.tableMultiplier !== 1)) ||
    ((state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete") &&
      privilege !== null)
  ) {
    issues.push(
      issue(
        "ROUND_PRIVILEGE_INVALID",
        "$.round",
        "Caller and next-round privilege state must follow their canonical lifecycle.",
      ),
    );
  }
  if (!phaseHasCommittedResult && state.round.roundNumber > 1) {
    const priorPlan = state.history[state.history.length - 1]?.nextRound;
    const plannedPrivilege = priorPlan?.specialPrivilege ?? null;
    const plannedPrivilegeWasLegallyConsumed =
      plannedPrivilege !== null && privilege === null && state.round.tableMultiplier > 1;
    if (
      priorPlan === null ||
      priorPlan === undefined ||
      priorPlan.roundNumber !== state.round.roundNumber ||
      priorPlan.starterId !== state.round.starterId ||
      (JSON.stringify(plannedPrivilege) !== JSON.stringify(privilege) &&
        !plannedPrivilegeWasLegallyConsumed)
    ) {
      issues.push(
        issue(
          "ROUND_TRANSITION_PLAN_INVALID",
          "$.round",
          "Active round setup must consume the preceding history transition plan.",
        ),
      );
    }
  }
  if (!PLAYER_IDS.includes(state.round.starterId)) {
    issues.push(issue("STARTER_INVALID", "$.round.starterId", "Starter must be a match player."));
  }
  if (
    !completedFormationsAreStructurallyValid(
      state.round.completedYakuFormations,
      state.round.scheduledMonth,
    )
  ) {
    issues.push(
      issue(
        "ROUND_YAKU_FORMATIONS_INVALID",
        "$.round.completedYakuFormations",
        "Completed yaku formations must be canonical, unique per player/key, and contiguous.",
      ),
    );
  }
  for (const formation of state.round.completedYakuFormations) {
    const owner = state.players.find((player) => player.id === formation.playerId);
    if (
      owner === undefined ||
      !formation.contributingCardIds.every((cardId) => owner.captured.includes(cardId)) ||
      !owner.seenYakuKeys.includes(formation.yaku.key)
    ) {
      issues.push(
        issue(
          "ROUND_YAKU_FORMATION_OWNERSHIP_INVALID",
          "$.round.completedYakuFormations",
          "Formation cards and trigger keys must belong to the recorded player.",
        ),
      );
      break;
    }
  }
  if (
    state.players.some((player) =>
      player.seenYakuKeys.some(
        (key) =>
          !state.round.completedYakuFormations.some(
            (formation) => formation.playerId === player.id && formation.yaku.key === key,
          ),
      ),
    )
  ) {
    issues.push(
      issue(
        "ROUND_YAKU_FORMATION_HISTORY_INVALID",
        "$.round.completedYakuFormations",
        "Every seen yaku trigger must have one immutable completed formation.",
      ),
    );
  }
  if (![1, 2, 3, 4].includes(state.round.tableMultiplier)) {
    issues.push(
      issue("TABLE_MULTIPLIER_INVALID", "$.round.tableMultiplier", "Table must be 1× through 4×."),
    );
  }

  const totalHandCards = state.players[0].hand.length + state.players[1].hand.length;
  const handCardsPlayed = 16 - totalHandCards;
  const drawCardsRevealed = 24 - state.round.drawPile.length;
  if (
    (state.phase.kind === "awaitingHandPlay" || state.phase.kind === "awaitingDrawResolution") &&
    (handCardsPlayed < 0 || handCardsPlayed > 16 || handCardsPlayed !== drawCardsRevealed)
  ) {
    issues.push(
      issue(
        "TURN_CARD_PROGRESS_INVALID",
        "$.round",
        "Normal-turn hand plays and draw reveals must advance together.",
      ),
    );
  }
  if (
    state.phase.kind === "awaitingYakuDecision" &&
    (handCardsPlayed < 0 ||
      handCardsPlayed > 16 ||
      (state.phase.context.phase === "hand"
        ? handCardsPlayed !== drawCardsRevealed + 1
        : handCardsPlayed !== drawCardsRevealed))
  ) {
    issues.push(
      issue(
        "YAKU_DECISION_PROGRESS_INVALID",
        "$.phase",
        "Yaku decision progress must align with its Hand or Draw resolution window.",
      ),
    );
  }

  const playersWithSeenYaku = state.players.filter((player) => player.seenYakuKeys.length > 0);
  if (
    (playersWithSeenYaku.length === 0 && state.round.firstYakuTriggerPlayerId !== null) ||
    (playersWithSeenYaku.length > 0 &&
      (state.round.firstYakuTriggerPlayerId === null ||
        !PLAYER_IDS.includes(state.round.firstYakuTriggerPlayerId) ||
        !state.players.find((player) => player.id === state.round.firstYakuTriggerPlayerId)
          ?.seenYakuKeys.length))
  ) {
    issues.push(
      issue(
        "FIRST_YAKU_TRIGGER_INVALID",
        "$.round.firstYakuTriggerPlayerId",
        "First yaku trigger player must identify a player with seen trigger keys.",
      ),
    );
  }

  if (state.phase.kind === "awaitingHandPlay") {
    const playerId = state.phase.playerId;
    if (!PLAYER_IDS.includes(playerId)) {
      issues.push(issue("PHASE_PLAYER_INVALID", "$.phase.playerId", "Active player is invalid."));
    } else if (state.players.find((player) => player.id === playerId)?.hand.length === 0) {
      issues.push(
        issue(
          "PHASE_PLAYER_HAND_EMPTY",
          "$.phase.playerId",
          "Active player must have a hand card.",
        ),
      );
    }
    if (playerId !== expectedActivePlayer(state, "awaitingHandPlay")) {
      issues.push(
        issue(
          "TURN_PLAYER_ORDER_INVALID",
          "$.phase.playerId",
          "Active player must follow starter order and completed hand plays.",
        ),
      );
    }
  } else if (state.phase.kind === "awaitingDrawResolution") {
    const resolution = state.phase.resolution;
    if (!PLAYER_IDS.includes(state.phase.playerId)) {
      issues.push(issue("PHASE_PLAYER_INVALID", "$.phase.playerId", "Active player is invalid."));
    }
    if (state.phase.playerId !== expectedActivePlayer(state, "awaitingDrawResolution")) {
      issues.push(
        issue(
          "TURN_PLAYER_ORDER_INVALID",
          "$.phase.playerId",
          "Pending draw actor must be the player whose hand play opened this turn.",
        ),
      );
    }
    if (!isCardId(state.phase.drawnCardId)) {
      issues.push(
        issue(
          "DRAW_RESOLUTION_PHASE_INVALID",
          "$.phase",
          "Pending draw resolution must contain one known draw card.",
        ),
      );
    } else if (state.round.field.every(isCardId)) {
      const expectedResolution = getHandPlayResolutionPreview(
        state.round.field,
        state.phase.drawnCardId,
      );
      if (JSON.stringify(resolution) !== JSON.stringify(expectedResolution)) {
        issues.push(
          issue(
            "DRAW_RESOLUTION_INVALID",
            "$.phase.resolution",
            "Pending draw resolution must exactly match the canonical field classification.",
          ),
        );
      }
    } else {
      issues.push(
        issue(
          "DRAW_RESOLUTION_PHASE_INVALID",
          "$.phase",
          "Pending draw resolution cannot reference a malformed field.",
        ),
      );
    }
  } else if (state.phase.kind === "awaitingYakuDecision") {
    const decisionPlayerId = state.phase.playerId;
    const actor = state.players.find((player) => player.id === decisionPlayerId);
    const context = state.phase.context;
    if (
      !PLAYER_IDS.includes(decisionPlayerId) ||
      decisionPlayerId !== expectedActivePlayer(state, "awaitingDrawResolution") ||
      actor === undefined
    ) {
      issues.push(
        issue(
          "YAKU_DECISION_ACTOR_INVALID",
          "$.phase.playerId",
          "Yaku decision actor must be the player whose phase just resolved.",
        ),
      );
    } else {
      const newKeys = context.newYaku.map((entry) => entry.key);
      const newKeysKnown = newKeys.every(isYakuTriggerKey);
      const previousSeenYakuKeys = actor.seenYakuKeys.slice(
        0,
        actor.seenYakuKeys.length - newKeys.length,
      );
      const keysValid =
        context.newYaku.length > 0 &&
        newKeys.length <= actor.seenYakuKeys.length &&
        newKeysKnown &&
        new Set(newKeys).size === newKeys.length &&
        JSON.stringify(actor.seenYakuKeys) ===
          JSON.stringify([...previousSeenYakuKeys, ...newKeys]);
      const decisionEvidenceValid =
        keysValid &&
        actor.captured.every(isCardId) &&
        previousSeenYakuKeys.every(isYakuTriggerKey) &&
        new Set(previousSeenYakuKeys).size === previousSeenYakuKeys.length &&
        Number.isSafeInteger(state.round.scheduledMonth) &&
        state.round.scheduledMonth >= 1 &&
        state.round.scheduledMonth <= 12;
      const expectedDecisionYaku = decisionEvidenceValid
        ? evaluateYaku(actor.captured, state.round.scheduledMonth, previousSeenYakuKeys)
        : null;
      if (
        expectedDecisionYaku === null ||
        JSON.stringify(context.newYaku) !== JSON.stringify(expectedDecisionYaku.newYaku) ||
        JSON.stringify(context.activeYaku) !== JSON.stringify(actor.activeYaku) ||
        context.currentYakuTotal !== actor.currentYakuTotal
      ) {
        issues.push(
          issue(
            "YAKU_DECISION_CONTEXT_INVALID",
            "$.phase.context",
            "Decision context must contain all new active yaku and the exact current total.",
          ),
        );
      }
    }
    const bothHandsEmpty = state.players.every((player) => player.hand.length === 0);
    const resumeValid =
      context.phase === "hand"
        ? context.resume.kind === "drawPhase"
        : context.phase === "draw" && bothHandsEmpty
          ? context.resume.kind === "endOfPlay" && context.resume.lastActorId === decisionPlayerId
          : context.phase === "draw" &&
            context.resume.kind === "completeTurn" &&
            context.resume.lastActorId === decisionPlayerId;
    if (!resumeValid) {
      issues.push(
        issue(
          "YAKU_DECISION_RESUME_INVALID",
          "$.phase.context.resume",
          "Decision resume must match the completed Hand/Draw phase and End-of-Play status.",
        ),
      );
    }
  } else if (state.phase.kind === "roundComplete") {
    const savedResult = state.history[state.history.length - 1];
    if (
      state.status !== "inProgress" ||
      savedResult === undefined ||
      JSON.stringify(state.phase.result) !== JSON.stringify(savedResult) ||
      state.phase.result.nextRound === null
    ) {
      issues.push(
        issue(
          "ROUND_COMPLETE_PHASE_INVALID",
          "$.phase",
          "Round-complete state must expose its latest result and a next-round plan.",
        ),
      );
    }
  } else if (state.phase.kind === "matchComplete") {
    const expectedMatchResult = createMatchResult(state.matchLength, state.history);
    if (
      state.status !== "complete" ||
      state.round.roundNumber !== state.matchLength ||
      JSON.stringify(state.phase.result) !== JSON.stringify(expectedMatchResult)
    ) {
      issues.push(
        issue(
          "MATCH_COMPLETE_PHASE_INVALID",
          "$.phase",
          "Match-complete state must expose the final history-derived result.",
        ),
      );
    }
  } else if (state.status !== "inProgress") {
    issues.push(
      issue("MATCH_STATE_INVALID", "$.status", "Playable phases require an in-progress match."),
    );
  }
  return Object.freeze(issues);
}

export function validateInitialSetupState(
  state: AuthoritativeGameStateV1,
): readonly StateValidationIssue[] {
  const ownershipIssues = validateCardOwnership(state);
  const issues = [...ownershipIssues];
  const historyMetadataValid = state.history.every(
    (result) => Number.isSafeInteger(result.roundNumber) && result.roundNumber >= 1,
  );
  if (state.formatVersion !== 1 || state.rulesVersion !== "1.0") {
    issues.push(issue("STATE_VERSION_INVALID", "$", "Unsupported state or rules version."));
  }
  if (state.stateVersion !== 1) {
    issues.push(
      issue("STATE_VERSION_INVALID", "$.stateVersion", "Initial state version must be 1."),
    );
  }
  if (
    state.status !== "inProgress" ||
    state.matchId.trim().length === 0 ||
    state.lastAcceptedCommandId.trim().length === 0 ||
    !historyMetadataValid
  ) {
    issues.push(
      issue("SETUP_MATCH_STATE_INVALID", "$", "A new match must be in progress and identified."),
    );
  }
  if (!MATCH_LENGTHS.includes(state.matchLength)) {
    issues.push(
      issue("MATCH_LENGTH_INVALID", "$.matchLength", "Match length must be 3, 6, or 12."),
    );
  }
  if (
    state.players.length !== 2 ||
    state.players[0].id !== PLAYER_IDS[0] ||
    state.players[1].id !== PLAYER_IDS[1]
  ) {
    issues.push(issue("PLAYER_ID_INVALID", "$.players", "Player positions must be canonical."));
  }
  for (const [index, player] of state.players.entries()) {
    if (!Number.isSafeInteger(player.score) || player.score < 0) {
      issues.push(
        issue("PLAYER_SCORE_INVALID", `$.players[${index}].score`, "Score must be nonnegative."),
      );
    }
    if (player.hand.length !== 8) {
      issues.push(
        issue("SETUP_HAND_COUNT", `$.players[${index}].hand`, "Initial hand must contain 8 cards."),
      );
    }
    if (player.captured.length !== 0) {
      issues.push(
        issue(
          "SETUP_CAPTURE_NOT_EMPTY",
          `$.players[${index}].captured`,
          "Initial captures must be empty.",
        ),
      );
    }
    if (
      player.seenYakuKeys.length !== 0 ||
      player.activeYaku.length !== 0 ||
      player.currentYakuTotal !== 0
    ) {
      issues.push(
        issue(
          "SETUP_YAKU_NOT_RESET",
          `$.players[${index}].seenYakuKeys`,
          "Initial seen-yaku keys must be empty.",
        ),
      );
    }
  }
  if (state.round.field.length !== 8) {
    issues.push(issue("SETUP_FIELD_COUNT", "$.round.field", "Initial field must contain 8 cards."));
  }
  if (state.round.drawPile.length !== 24) {
    issues.push(
      issue(
        "SETUP_DRAW_PILE_COUNT",
        "$.round.drawPile",
        "Initial draw pile must contain 24 cards.",
      ),
    );
  }
  if (state.round.roundNumber !== 1 || state.round.scheduledMonth !== 1) {
    issues.push(
      issue("SCHEDULED_MONTH_MISMATCH", "$.round", "A new match must begin with January round 1."),
    );
  }
  if (state.round.isFinalScheduledRound) {
    issues.push(
      issue(
        "FINAL_ROUND_FLAG_INVALID",
        "$.round.isFinalScheduledRound",
        "Round 1 is not final for supported match lengths.",
      ),
    );
  }
  if (!PLAYER_IDS.includes(state.round.starterId)) {
    issues.push(issue("STARTER_INVALID", "$.round.starterId", "Starter must be a match player."));
  }
  if (
    state.round.tableMultiplier !== 1 ||
    state.round.mostRecentKoiKoiCallerId !== null ||
    state.round.firstYakuTriggerPlayerId !== null ||
    state.round.specialPrivilege !== null ||
    state.round.frozenFinalRoundLeaderId !== null
  ) {
    issues.push(
      issue("SETUP_ROUND_NOT_RESET", "$.round", "Round-local setup state was not reset."),
    );
  }
  if (state.phase.kind === "awaitingHandPlay") {
    if (state.phase.playerId !== state.round.starterId) {
      issues.push(
        issue(
          "PHASE_PLAYER_INVALID",
          "$.phase.playerId",
          "Starter must be the first active player.",
        ),
      );
    }
  }

  const expectedOutcome = ownershipIssues.some((entry) => entry.code === "CARD_ZONE_UNKNOWN_ID")
    ? null
    : evaluateOpeningOutcome(state.round.field, [state.players[0].hand, state.players[1].hand]);
  const expectedResult =
    expectedOutcome === null
      ? null
      : createAutomaticRoundResult(
          { matchLength: state.matchLength, round: state.round },
          expectedOutcome,
          { "player-a": 0, "player-b": 0 },
        );
  const savedResult = state.phase.kind === "roundComplete" ? state.phase.result : null;
  if (JSON.stringify(savedResult) !== JSON.stringify(expectedResult)) {
    issues.push(
      issue(
        "OPENING_RESULT_EVIDENCE_MISMATCH",
        "$.phase",
        "Opening phase, result, and evidence must match the dealt cards.",
      ),
    );
  }

  const expectedHistory = expectedResult === null ? [] : [expectedResult];
  if (historyMetadataValid && JSON.stringify(state.history) !== JSON.stringify(expectedHistory)) {
    issues.push(
      issue(
        "OPENING_RESULT_HISTORY_INVALID",
        "$.history",
        "An automatic opening result must be recorded once in initial history.",
      ),
    );
  }

  const expectedScores = expectedOutcome?.pointDeltas ?? { "player-a": 0, "player-b": 0 };
  if (
    state.players[0].score !== expectedScores["player-a"] ||
    state.players[1].score !== expectedScores["player-b"]
  ) {
    issues.push(
      issue(
        "OPENING_RESULT_SCORE_INVALID",
        "$.players",
        "Initial scores must equal the committed automatic opening point deltas.",
      ),
    );
  }
  return Object.freeze(issues);
}

export function assertValidAuthoritativeState(state: AuthoritativeGameStateV1): void {
  if (isTrustedValidatedEngineState(state)) return;
  const issues = validateAuthoritativeState(state);
  if (issues.length > 0) {
    throw new Error(
      `STATE_INVARIANT_FAILED:\n${issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n")}`,
    );
  }
}

export function assertValidInitialSetupState(state: AuthoritativeGameStateV1): void {
  const issues = validateInitialSetupState(state);
  if (issues.length > 0) {
    throw new Error(
      `STATE_INVARIANT_FAILED:\n${issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n")}`,
    );
  }
}
