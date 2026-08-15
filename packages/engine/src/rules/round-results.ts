import type { MonthNumber } from "../cards/months";
import { deepFreeze } from "../state/freeze";
import {
  PLAYER_IDS,
  type ActiveYakuV1,
  type AutomaticOpeningResult,
  type AuthoritativeGameStateV1,
  type MatchResultV1,
  type NextRoundPlanV1,
  type PlayerId,
  type PointDeltas,
  type RoundResultEvidenceV1,
  type RoundResultKindV1,
  type RoundResultReasonCodeV1,
  type RoundResultV1,
  type TableMultiplier,
} from "../state/types";
import { deriveYakuContributingCardIds } from "./yaku";

export function otherPlayerId(playerId: PlayerId): PlayerId {
  return playerId === PLAYER_IDS[0] ? PLAYER_IDS[1] : PLAYER_IDS[0];
}

export function scorePair(state: AuthoritativeGameStateV1): PointDeltas {
  return deepFreeze({
    "player-a": state.players[0].score,
    "player-b": state.players[1].score,
  });
}

function addDeltas(scores: PointDeltas, deltas: PointDeltas): PointDeltas {
  return deepFreeze({
    "player-a": scores["player-a"] + deltas["player-a"],
    "player-b": scores["player-b"] + deltas["player-b"],
  });
}

export function deriveNextRoundPlan(
  state: Pick<AuthoritativeGameStateV1, "matchLength" | "round">,
  scorerId: PlayerId | null,
  scoringMultiplier: TableMultiplier | null,
): NextRoundPlanV1 | null {
  if (state.round.roundNumber === state.matchLength) return null;
  const roundNumber = state.round.roundNumber + 1;
  if (scorerId !== null && scoringMultiplier !== null) {
    const lowMultiplier = scoringMultiplier <= 2;
    const starterId = lowMultiplier ? otherPlayerId(scorerId) : scorerId;
    return deepFreeze({
      roundNumber,
      scheduledMonth: roundNumber as MonthNumber,
      starterId,
      starterReason: lowMultiplier
        ? "LOW_MULTIPLIER_LOSER_STARTS"
        : "HIGH_MULTIPLIER_WINNER_STARTS",
      specialPrivilege:
        scoringMultiplier === 1
          ? { playerId: starterId, grantedFromRound: state.round.roundNumber, status: "available" }
          : null,
    });
  }
  const januaryZero = state.round.roundNumber === 1;
  return deepFreeze({
    roundNumber,
    scheduledMonth: roundNumber as MonthNumber,
    starterId: januaryZero ? otherPlayerId(state.round.starterId) : state.round.starterId,
    starterReason: januaryZero ? "JANUARY_ZERO_ALTERNATES" : "LATER_ZERO_PRESERVES_STARTER",
    specialPrivilege: null,
  });
}

interface ResultInput {
  readonly kind: RoundResultKindV1;
  readonly reasonCode: RoundResultReasonCodeV1;
  readonly scorerId: PlayerId | null;
  readonly pointDeltas: PointDeltas;
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly basePoints: number;
  readonly tableMultiplierAtDecision: TableMultiplier | null;
  readonly scoringMultiplier: TableMultiplier | null;
  readonly awardedPoints: number;
  readonly evidence: RoundResultEvidenceV1;
  readonly scoresBefore: PointDeltas;
}

function buildRoundResult(
  state: Pick<AuthoritativeGameStateV1, "matchLength" | "round">,
  input: ResultInput,
): RoundResultV1 {
  return deepFreeze({
    roundNumber: state.round.roundNumber,
    scheduledMonth: state.round.scheduledMonth,
    starterId: state.round.starterId,
    kind: input.kind,
    reasonCode: input.reasonCode,
    scorerId: input.scorerId,
    pointDeltas: input.pointDeltas,
    activeYaku: input.activeYaku,
    basePoints: input.basePoints,
    tableMultiplierAtDecision: input.tableMultiplierAtDecision,
    scoringMultiplier: input.scoringMultiplier,
    awardedPoints: input.awardedPoints,
    evidence: input.evidence,
    nextRound: deriveNextRoundPlan(state, input.scorerId, input.scoringMultiplier),
    matchScoresAfter: addDeltas(input.scoresBefore, input.pointDeltas),
  });
}

export function createScoredRoundResult(
  state: AuthoritativeGameStateV1,
  input: {
    readonly kind: "bankedScore" | "endOfPlayLastKoiCaller";
    readonly reasonCode: "BANKED_SCORE" | "END_OF_PLAY_LAST_KOI_CALLER";
    readonly scorerId: PlayerId;
    readonly activeYaku: readonly ActiveYakuV1[];
    readonly basePoints: number;
    readonly tableMultiplierAtDecision: TableMultiplier;
    readonly scoringMultiplier: TableMultiplier;
  },
): RoundResultV1 {
  const awardedPoints = input.basePoints * input.scoringMultiplier;
  const scorer = state.players.find((player) => player.id === input.scorerId);
  if (scorer === undefined) throw new Error("PLAYER_INVARIANT: scorer missing from round state.");
  const scoredYaku = input.activeYaku
    .map((yaku) => {
      const formation = state.round.completedYakuFormations.find(
        (candidate) => candidate.playerId === input.scorerId && candidate.yaku.key === yaku.key,
      );
      if (formation === undefined) {
        throw new Error(`YAKU_EVIDENCE_MISSING: ${yaku.key} has no completed formation.`);
      }
      return deepFreeze({
        formationSequence: formation.sequence,
        yaku,
        contributingCardIds: deriveYakuContributingCardIds(
          yaku.key,
          scorer.captured,
          state.round.scheduledMonth,
        ),
      });
    })
    .sort((left, right) => left.formationSequence - right.formationSequence);
  return buildRoundResult(state, {
    ...input,
    pointDeltas: deepFreeze({
      "player-a": input.scorerId === "player-a" ? awardedPoints : 0,
      "player-b": input.scorerId === "player-b" ? awardedPoints : 0,
    }),
    awardedPoints,
    evidence: deepFreeze({
      kind: "ordinaryYaku",
      completedFormations: state.round.completedYakuFormations,
      scoredYaku,
    }),
    scoresBefore: scorePair(state),
  });
}

export function createNoScoreRoundResult(state: AuthoritativeGameStateV1): RoundResultV1 {
  return buildRoundResult(state, {
    kind: "endOfPlayNoScore",
    reasonCode: "END_OF_PLAY_NO_SCORE",
    scorerId: null,
    pointDeltas: deepFreeze({ "player-a": 0, "player-b": 0 }),
    activeYaku: deepFreeze([]),
    basePoints: 0,
    tableMultiplierAtDecision: null,
    scoringMultiplier: null,
    awardedPoints: 0,
    evidence: null,
    scoresBefore: scorePair(state),
  });
}

export function createAutomaticRoundResult(
  state: Pick<AuthoritativeGameStateV1, "matchLength" | "round">,
  outcome: AutomaticOpeningResult,
  scoresBefore: PointDeltas,
): RoundResultV1 {
  if (outcome.kind === "fieldCancellation") {
    return buildRoundResult(state, {
      kind: outcome.kind,
      reasonCode: outcome.reasonCode,
      scorerId: null,
      pointDeltas: outcome.pointDeltas,
      activeYaku: deepFreeze([]),
      basePoints: 0,
      tableMultiplierAtDecision: null,
      scoringMultiplier: null,
      awardedPoints: 0,
      evidence: deepFreeze({
        kind: "fieldCancellation",
        completeFieldMonths: outcome.completeFieldMonths,
      }),
      scoresBefore,
    });
  }
  if (outcome.kind === "bothLuckyDraw") {
    return buildRoundResult(state, {
      kind: outcome.kind,
      reasonCode: outcome.reasonCode,
      scorerId: null,
      pointDeltas: outcome.pointDeltas,
      activeYaku: deepFreeze([]),
      basePoints: 0,
      tableMultiplierAtDecision: null,
      scoringMultiplier: null,
      awardedPoints: 0,
      evidence: deepFreeze({ kind: "luckyHands", hands: outcome.evidence }),
      scoresBefore,
    });
  }
  return buildRoundResult(state, {
    kind: outcome.kind,
    reasonCode: outcome.reasonCode,
    scorerId: outcome.winnerId,
    pointDeltas: outcome.pointDeltas,
    activeYaku: deepFreeze([]),
    basePoints: outcome.basePoints,
    tableMultiplierAtDecision: 1,
    scoringMultiplier: outcome.scoringMultiplier,
    awardedPoints: outcome.awardedPoints,
    evidence: deepFreeze({ kind: "luckyHands", hands: outcome.evidence }),
    scoresBefore,
  });
}

export function createMatchResult(
  matchLength: AuthoritativeGameStateV1["matchLength"],
  history: readonly RoundResultV1[],
): MatchResultV1 {
  const finalScores = history.reduce<PointDeltas>(
    (scores, result) => addDeltas(scores, result.pointDeltas),
    { "player-a": 0, "player-b": 0 },
  );
  const winnerId =
    finalScores["player-a"] === finalScores["player-b"]
      ? null
      : finalScores["player-a"] > finalScores["player-b"]
        ? "player-a"
        : "player-b";
  return deepFreeze({ matchLength, roundsPlayed: history.length, finalScores, winnerId });
}

export function frozenLeader(scores: PointDeltas): PlayerId | null {
  return scores["player-a"] === scores["player-b"]
    ? null
    : scores["player-a"] > scores["player-b"]
      ? "player-a"
      : "player-b";
}
