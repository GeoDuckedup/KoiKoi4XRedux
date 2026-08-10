import {
  deepFreeze,
  type ActiveYakuV1,
  type MatchResultV1,
  type MonthNumber,
  type NextRoundPlanV1,
  type PlayerId,
  type PlayerObservationV1,
  type PointDeltas,
  type PublicGameEventV1,
  type RoundResultEvidenceV1,
  type RoundResultKindV1,
  type RoundResultReasonCodeV1,
  type RoundResultV1,
  type SpecialPrivilegeStateV1,
  type TableMultiplier,
} from "@koikoi4x/engine";

export interface RoundResultHistoryPresentationV1 {
  readonly awardedPoints: number;
  readonly kind: RoundResultKindV1;
  readonly matchScoresAfter: PointDeltas;
  readonly reasonCode: RoundResultReasonCodeV1;
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly scorerId: PlayerId | null;
}

export interface RoundResultScoringPresentationV1 {
  readonly arithmeticLabel: string;
  readonly awardedPoints: number;
  readonly basePoints: number;
  readonly scoringMultiplier: TableMultiplier;
  readonly scoringMultiplierLabel: string;
  readonly tableMultiplierAtDecision: TableMultiplier | null;
  readonly tableMultiplierLabel: string | null;
}

export interface RoundResultNextRoundPresentationV1 {
  readonly actionLabel: "Start another local round";
  readonly plan: NextRoundPlanV1;
  readonly starterReasonLabel: string;
}

export interface MatchResultPresentationV1 {
  readonly actionLabel: "Start a new local match";
  readonly outcomeLabel: string;
  readonly result: MatchResultV1;
}

/**
 * A render-ready copy of a committed public result. It intentionally contains no
 * rules evaluation or gameplay-command capability.
 */
export interface RoundResultPresentationV1 {
  readonly action: MatchResultPresentationV1 | RoundResultNextRoundPresentationV1;
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly evidence: RoundResultEvidenceV1;
  readonly history: readonly RoundResultHistoryPresentationV1[];
  readonly kind: RoundResultKindV1;
  readonly matchResult: MatchResultV1 | null;
  readonly matchScoresAfter: PointDeltas;
  readonly outcomeLabel: string;
  readonly pointDeltas: PointDeltas;
  readonly reasonCode: RoundResultReasonCodeV1;
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly scorerId: PlayerId | null;
  readonly scoring: RoundResultScoringPresentationV1 | null;
  readonly title: string;
  readonly visibility: "roundResult" | "matchResult";
}

function playerName(playerId: PlayerId): string {
  return playerId === "player-a" ? "Player A" : "Player B";
}

function copyPoints(points: PointDeltas): PointDeltas {
  return deepFreeze({ "player-a": points["player-a"], "player-b": points["player-b"] });
}

function copyYaku(yaku: readonly ActiveYakuV1[]): readonly ActiveYakuV1[] {
  return Object.freeze(yaku.map((entry) => deepFreeze({ ...entry })));
}

function copyPrivilege(privilege: SpecialPrivilegeStateV1 | null): SpecialPrivilegeStateV1 | null {
  return privilege === null ? null : deepFreeze({ ...privilege });
}

function copyNextRound(plan: NextRoundPlanV1): NextRoundPlanV1 {
  return deepFreeze({ ...plan, specialPrivilege: copyPrivilege(plan.specialPrivilege) });
}

function copyEvidence(evidence: RoundResultEvidenceV1): RoundResultEvidenceV1 {
  if (evidence === null) return null;
  if (evidence.kind === "fieldCancellation") {
    return deepFreeze({
      kind: evidence.kind,
      completeFieldMonths: evidence.completeFieldMonths.map((month) =>
        deepFreeze({ month: month.month, cardIds: Object.freeze([...month.cardIds]) }),
      ),
    });
  }
  return deepFreeze({
    kind: evidence.kind,
    hands: evidence.hands.map((hand) =>
      deepFreeze({
        playerId: hand.playerId,
        fullHand: Object.freeze([...hand.fullHand]),
        qualification:
          hand.qualification.kind === "fourMonth"
            ? deepFreeze({
                kind: hand.qualification.kind,
                completeMonths: hand.qualification.completeMonths.map((month) =>
                  deepFreeze({ month: month.month, cardIds: Object.freeze([...month.cardIds]) }),
                ),
              })
            : deepFreeze({
                kind: hand.qualification.kind,
                pairs: hand.qualification.pairs.map((pair) =>
                  deepFreeze({ month: pair.month, cardIds: Object.freeze([...pair.cardIds]) }),
                ),
              }),
      }),
    ),
  });
}

function copyMatchResult(result: MatchResultV1): MatchResultV1 {
  return deepFreeze({
    matchLength: result.matchLength,
    roundsPlayed: result.roundsPlayed,
    finalScores: copyPoints(result.finalScores),
    winnerId: result.winnerId,
  });
}

function reasonOutcome(result: RoundResultV1): {
  readonly title: string;
  readonly outcomeLabel: string;
} {
  if (result.kind === "bankedScore") {
    return {
      title: "Banked score",
      outcomeLabel: `${playerName(result.scorerId as PlayerId)} banked ${result.awardedPoints} points.`,
    };
  }
  if (result.kind === "endOfPlayLastKoiCaller") {
    return {
      title: "End of Play",
      outcomeLabel: `${playerName(result.scorerId as PlayerId)} was the last Koi-Koi caller and receives ${result.awardedPoints} points.`,
    };
  }
  if (result.kind === "endOfPlayNoScore") {
    return { title: "End of Play", outcomeLabel: "No Koi-Koi caller: no points are awarded." };
  }
  if (result.kind === "fieldCancellation") {
    return { title: "Field cancellation", outcomeLabel: "The opening field cancels this round." };
  }
  if (result.kind === "luckyWin") {
    return {
      title: "Lucky win",
      outcomeLabel: `${playerName(result.scorerId as PlayerId)} wins with a lucky hand and receives ${result.awardedPoints} points.`,
    };
  }
  return {
    title: "Both lucky hands",
    outcomeLabel: "Both players have lucky hands; this round is a draw.",
  };
}

function starterReasonLabel(plan: NextRoundPlanV1): string {
  if (plan.starterReason === "LOW_MULTIPLIER_LOSER_STARTS") {
    return "The lower scoring multiplier selects the scorer’s opponent as starter.";
  }
  if (plan.starterReason === "HIGH_MULTIPLIER_WINNER_STARTS") {
    return "The higher scoring multiplier selects the scorer as starter.";
  }
  if (plan.starterReason === "JANUARY_ZERO_ALTERNATES") {
    return "A zero-point January round alternates the starter.";
  }
  return "A later zero-point round preserves the starter.";
}

function scoringPresentation(result: RoundResultV1): RoundResultScoringPresentationV1 | null {
  if (result.scoringMultiplier === null) return null;
  const tableMultiplierLabel =
    result.tableMultiplierAtDecision === null
      ? null
      : `Table multiplier at decision: ${result.tableMultiplierAtDecision}×.`;
  return deepFreeze({
    basePoints: result.basePoints,
    tableMultiplierAtDecision: result.tableMultiplierAtDecision,
    scoringMultiplier: result.scoringMultiplier,
    awardedPoints: result.awardedPoints,
    tableMultiplierLabel,
    scoringMultiplierLabel: `Scoring multiplier: ${result.scoringMultiplier}×.`,
    arithmeticLabel: `${result.basePoints} points × ${result.scoringMultiplier}× = ${result.awardedPoints} points.`,
  });
}

function historyPresentation(
  history: readonly RoundResultV1[],
): readonly RoundResultHistoryPresentationV1[] {
  return Object.freeze(
    history.map((result) =>
      deepFreeze({
        roundNumber: result.roundNumber,
        scheduledMonth: result.scheduledMonth,
        kind: result.kind,
        reasonCode: result.reasonCode,
        scorerId: result.scorerId,
        awardedPoints: result.awardedPoints,
        matchScoresAfter: copyPoints(result.matchScoresAfter),
      }),
    ),
  );
}

function matchOutcome(result: MatchResultV1): string {
  return result.winnerId === null
    ? "The match ends in a tie."
    : `${playerName(result.winnerId)} wins the match.`;
}

/**
 * Projects only a committed public round result for browser presentation.
 * `recentEvents` is intentionally optional: all Phase 3C render facts are already
 * committed in the public phase/history, so no event-derived rule fact is needed.
 */
export function createRoundResultPresentation(input: {
  readonly observation: PlayerObservationV1;
  readonly recentEvents?: readonly PublicGameEventV1[];
}): RoundResultPresentationV1 | null {
  const { phase, history } = input.observation.publicState;
  const isRoundComplete = phase.kind === "roundComplete";
  const isMatchComplete = phase.kind === "matchComplete";
  if (!isRoundComplete && !isMatchComplete) return null;

  const result = isRoundComplete ? phase.result : history.at(-1);
  if (result === undefined) return null;
  const matchResult = isMatchComplete ? copyMatchResult(phase.result) : null;
  const outcome = reasonOutcome(result);
  const nextRound = result.nextRound === null ? null : copyNextRound(result.nextRound);
  let action: RoundResultPresentationV1["action"];
  if (matchResult === null) {
    if (nextRound === null) return null;
    action = deepFreeze({
      actionLabel: "Start another local round" as const,
      plan: nextRound,
      starterReasonLabel: starterReasonLabel(nextRound),
    });
  } else {
    action = deepFreeze({
      actionLabel: "Start a new local match" as const,
      outcomeLabel: matchOutcome(matchResult),
      result: matchResult,
    });
  }

  return deepFreeze({
    visibility: matchResult === null ? "roundResult" : "matchResult",
    kind: result.kind,
    reasonCode: result.reasonCode,
    title: matchResult === null ? outcome.title : "Match complete",
    outcomeLabel: matchResult === null ? outcome.outcomeLabel : matchOutcome(matchResult),
    roundNumber: result.roundNumber,
    scheduledMonth: result.scheduledMonth,
    scorerId: result.scorerId,
    activeYaku: copyYaku(result.activeYaku),
    scoring: scoringPresentation(result),
    pointDeltas: copyPoints(result.pointDeltas),
    matchScoresAfter: copyPoints(matchResult?.finalScores ?? result.matchScoresAfter),
    evidence: copyEvidence(result.evidence),
    history: historyPresentation(history),
    matchResult,
    action,
  });
}
