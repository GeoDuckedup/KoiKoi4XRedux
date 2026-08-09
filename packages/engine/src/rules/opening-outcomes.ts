import { CARD_IDS, getCardDefinition, type CardId } from "../cards/catalog";
import type { MonthNumber } from "../cards/months";
import { deepFreeze } from "../state/freeze";
import {
  PLAYER_IDS,
  type AutomaticOpeningResult,
  type CompleteMonthEvidence,
  type LuckyHandEvidence,
  type LuckyQualification,
  type PlayerId,
  type PlayerPair,
} from "../state/types";

function groupCardsByMonth(cards: readonly CardId[]): Map<MonthNumber, CardId[]> {
  const groups = new Map<MonthNumber, CardId[]>();
  for (const cardId of cards) {
    const month = getCardDefinition(cardId).month;
    const group = groups.get(month) ?? [];
    group.push(cardId);
    groups.set(month, group);
  }
  return groups;
}

const CARD_ORDER = new Map(CARD_IDS.map((cardId, index) => [cardId, index]));

function canonicalCardOrder(cardIds: readonly CardId[]): CardId[] {
  return [...cardIds].sort(
    (left, right) =>
      (CARD_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (CARD_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function findCompleteMonths(cards: readonly CardId[]): readonly CompleteMonthEvidence[] {
  const groups = groupCardsByMonth(cards);
  return deepFreeze(
    [...groups.entries()]
      .filter(([, cardIds]) => cardIds.length === 4)
      .sort(([left], [right]) => left - right)
      .map(([month, cardIds]) => ({ month, cardIds: canonicalCardOrder(cardIds) })),
  );
}

export function classifyLuckyHand(hand: readonly CardId[]): LuckyQualification | null {
  if (hand.length !== 8) return null;
  const completeMonths = findCompleteMonths(hand);
  if (completeMonths.length > 0) {
    return deepFreeze({ kind: "fourMonth", completeMonths });
  }

  const groups = [...groupCardsByMonth(hand).entries()].sort(([left], [right]) => left - right);
  if (groups.length === 4 && groups.every(([, cardIds]) => cardIds.length === 2)) {
    return deepFreeze({
      kind: "fourPairs",
      pairs: groups.map(([month, cardIds]) => ({ month, cardIds: canonicalCardOrder(cardIds) })),
    });
  }
  return null;
}

function evidence(
  playerId: PlayerId,
  hand: readonly CardId[],
  qualification: LuckyQualification,
): LuckyHandEvidence {
  return deepFreeze({ playerId, fullHand: [...hand], qualification });
}

export function evaluateOpeningOutcome(
  field: readonly CardId[],
  hands: PlayerPair<readonly CardId[]>,
): AutomaticOpeningResult | null {
  const completeFieldMonths = findCompleteMonths(field);
  if (completeFieldMonths.length > 0) {
    return deepFreeze({
      kind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      pointDeltas: { "player-a": 0, "player-b": 0 },
      completeFieldMonths,
      luckyHandsEvaluated: false,
      yakuDecisionRequired: false,
    });
  }

  const candidates = [
    {
      playerId: PLAYER_IDS[0],
      hand: hands[0],
      qualification: classifyLuckyHand(hands[0]),
    },
    {
      playerId: PLAYER_IDS[1],
      hand: hands[1],
      qualification: classifyLuckyHand(hands[1]),
    },
  ] as const;
  const qualifyingEvidence = candidates.flatMap((candidate) =>
    candidate.qualification === null
      ? []
      : [evidence(candidate.playerId, candidate.hand, candidate.qualification)],
  );

  if (qualifyingEvidence.length === 0) return null;
  if (qualifyingEvidence.length === 2) {
    return deepFreeze({
      kind: "bothLuckyDraw",
      reasonCode: "BOTH_LUCKY_DRAW",
      pointDeltas: { "player-a": 0, "player-b": 0 },
      ordinaryYakuPoints: 0,
      evidence: qualifyingEvidence as unknown as readonly [LuckyHandEvidence, LuckyHandEvidence],
      yakuDecisionRequired: false,
    });
  }

  const winnerEvidence = qualifyingEvidence[0];
  if (winnerEvidence === undefined) throw new Error("OPENING_OUTCOME_INVARIANT: missing winner.");
  const winnerId = winnerEvidence.playerId;
  return deepFreeze({
    kind: "luckyWin",
    reasonCode:
      winnerEvidence.qualification.kind === "fourMonth" ? "LUCKY_FOUR_MONTH" : "LUCKY_FOUR_PAIRS",
    winnerId,
    pointDeltas: {
      "player-a": winnerId === "player-a" ? 6 : 0,
      "player-b": winnerId === "player-b" ? 6 : 0,
    },
    basePoints: 6,
    scoringMultiplier: 1,
    awardedPoints: 6,
    ordinaryYakuPoints: 0,
    evidence: [winnerEvidence],
    yakuDecisionRequired: false,
  });
}
