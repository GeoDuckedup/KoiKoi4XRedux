import {
  deepFreeze,
  type ActiveYakuV1,
  type PlayerId,
  type PlayerObservationV1,
  type PublicGameEventV1,
  type TableMultiplier,
  type YakuDecisionResumeV1,
} from "@koikoi4x/engine";

export interface YakuPlayerPresentationV1 {
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly currentYakuTotal: number;
  readonly playerId: PlayerId;
}

export interface YakuValueChangePresentationV1 {
  readonly currentPoints: number;
  readonly name: string;
  readonly previousPoints: number;
  readonly yakuKey: string;
}

export interface YakuReplacementPresentationV1 {
  readonly current: ActiveYakuV1;
  readonly previous: ActiveYakuV1;
}

export interface YakuFeedbackPresentationV1 {
  readonly actorId: PlayerId | null;
  readonly announcement: string;
  readonly bankAward: null | {
    readonly awardedPoints: number;
    readonly basePoints: number;
    readonly scorerId: PlayerId;
    readonly scoringMultiplier: TableMultiplier;
  };
  readonly chosenDecision: null | {
    readonly choice: "bank" | "koiKoi";
    readonly privilegeUsed: boolean;
  };
  readonly koiKoi: null | {
    readonly currentTableMultiplier: TableMultiplier;
    readonly previousTableMultiplier: TableMultiplier;
    readonly privilegeUsed: boolean;
  };
  readonly newYaku: readonly ActiveYakuV1[];
  readonly replacements: readonly YakuReplacementPresentationV1[];
  readonly valueChanges: readonly YakuValueChangePresentationV1[];
}

export interface YakuDecisionPresentationV1 {
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly actorId: PlayerId;
  readonly bank: null | {
    readonly awardedPoints: number;
    readonly scoringMultiplier: TableMultiplier;
    readonly tableMultiplierAtDecision: TableMultiplier;
  };
  readonly currentYakuTotal: number;
  readonly koiKoi: null | {
    readonly currentTableMultiplier: TableMultiplier;
    readonly resultingTableMultiplier: TableMultiplier;
  };
  readonly newYaku: readonly ActiveYakuV1[];
  readonly phase: "draw" | "hand";
  readonly resume: {
    readonly consequenceLabel: string;
    readonly value: YakuDecisionResumeV1;
  };
}

export interface YakuPresentationStateV1 {
  readonly decision: YakuDecisionPresentationV1 | null;
  readonly feedback: YakuFeedbackPresentationV1 | null;
  readonly players: readonly YakuPlayerPresentationV1[];
  readonly tableMultiplier: TableMultiplier;
}

function copyYaku(yaku: readonly ActiveYakuV1[]): readonly ActiveYakuV1[] {
  return Object.freeze(yaku.map((entry) => Object.freeze({ ...entry })));
}

function resumeConsequenceLabel(resume: YakuDecisionResumeV1): string {
  if (resume.kind === "drawPhase") return "If you call Koi-Koi, continue to the Draw phase.";
  if (resume.kind === "completeTurn") {
    return "If you call Koi-Koi, complete this turn and pass play.";
  }
  return "If you call Koi-Koi, End of Play follows this decision.";
}

function playerName(playerId: PlayerId): string {
  return playerId === "player-a" ? "Player A" : "Player B";
}

function yakuListLabel(yaku: readonly ActiveYakuV1[]): string {
  return yaku
    .map((entry) => `${entry.name} · ${entry.points} ${entry.points === 1 ? "point" : "points"}`)
    .join(", ");
}

function feedbackFromEvents(
  events: readonly PublicGameEventV1[],
  previousObservation: PlayerObservationV1 | undefined,
  observation: PlayerObservationV1,
): YakuFeedbackPresentationV1 | null {
  const newYaku: ActiveYakuV1[] = [];
  const valueChanges: YakuValueChangePresentationV1[] = [];
  let actorId: PlayerId | null = null;
  let mixedActors = false;
  let chosenDecision: YakuFeedbackPresentationV1["chosenDecision"] = null;
  let koiKoi: YakuFeedbackPresentationV1["koiKoi"] = null;
  let bankAward: YakuFeedbackPresentationV1["bankAward"] = null;

  for (const event of events) {
    if (
      event.type === "roundResultCommitted" &&
      event.result.kind === "bankedScore" &&
      event.result.scorerId !== null &&
      event.result.scoringMultiplier !== null
    ) {
      bankAward = Object.freeze({
        scorerId: event.result.scorerId,
        basePoints: event.result.basePoints,
        scoringMultiplier: event.result.scoringMultiplier,
        awardedPoints: event.result.awardedPoints,
      });
      continue;
    }
    if (
      event.type !== "yakuCompleted" &&
      event.type !== "yakuValueChanged" &&
      event.type !== "yakuDecisionChosen" &&
      event.type !== "koiKoiCalled"
    ) {
      continue;
    }
    if (!mixedActors && actorId === null) actorId = event.actorId;
    else if (actorId !== event.actorId) {
      actorId = null;
      mixedActors = true;
    }

    if (event.type === "yakuCompleted") {
      newYaku.push(Object.freeze({ ...event.yaku }));
    } else if (event.type === "yakuValueChanged") {
      valueChanges.push(
        Object.freeze({
          yakuKey: event.yakuKey,
          name: event.name,
          previousPoints: event.previousPoints,
          currentPoints: event.currentPoints,
        }),
      );
    } else if (event.type === "yakuDecisionChosen") {
      chosenDecision = Object.freeze({
        choice: event.choice,
        privilegeUsed: event.privilegeUsed,
      });
    } else {
      koiKoi = Object.freeze({
        previousTableMultiplier: event.previousTableMultiplier,
        currentTableMultiplier: event.currentTableMultiplier,
        privilegeUsed: event.privilegeUsed,
      });
    }
  }

  if (newYaku.length === 0 && valueChanges.length === 0 && !chosenDecision && !koiKoi && !bankAward)
    return null;
  const replacements: YakuReplacementPresentationV1[] = [];
  if (actorId && previousObservation) {
    const previousPlayer = previousObservation.publicState.players.find(({ id }) => id === actorId);
    const currentPlayer = observation.publicState.players.find(({ id }) => id === actorId);
    if (previousPlayer && currentPlayer) {
      const currentKeys = new Set(currentPlayer.activeYaku.map(({ key }) => key));
      const removed = previousPlayer.activeYaku.filter(({ key }) => !currentKeys.has(key));
      if (removed.length === 1 && newYaku.length === 1 && removed[0] && newYaku[0]) {
        replacements.push(deepFreeze({ previous: { ...removed[0] }, current: { ...newYaku[0] } }));
      }
    }
  }
  const parts: string[] = [];
  const actor = actorId ? playerName(actorId) : "A player";
  const replacedCurrentKeys = new Set(replacements.map(({ current }) => current.key));
  const ordinaryNewYaku = newYaku.filter(({ key }) => !replacedCurrentKeys.has(key));
  for (const replacement of replacements) {
    parts.push(
      `${replacement.previous.name} upgraded to ${replacement.current.name}: ${replacement.previous.points} → ${replacement.current.points} points.`,
    );
  }
  if (ordinaryNewYaku.length > 0) {
    parts.push(`${actor} completed ${yakuListLabel(ordinaryNewYaku)}.`);
  }
  for (const change of valueChanges) {
    parts.push(
      `${change.name} upgraded: ${change.previousPoints} → ${change.currentPoints} points.`,
    );
  }
  if (chosenDecision) {
    parts.push(`${actor} chose ${chosenDecision.choice === "bank" ? "Bank" : "Koi-Koi"}.`);
  }
  if (koiKoi) {
    parts.push(
      `Table multiplier ${koiKoi.previousTableMultiplier}× to ${koiKoi.currentTableMultiplier}×${
        koiKoi.privilegeUsed ? " using the special multiplier." : "."
      }`,
    );
  }
  if (bankAward) {
    parts.push(`${playerName(bankAward.scorerId)} banked ${bankAward.awardedPoints} points.`);
  }
  return deepFreeze({
    actorId,
    announcement: parts.join(" "),
    bankAward,
    newYaku: Object.freeze(newYaku),
    replacements: Object.freeze(replacements),
    valueChanges: Object.freeze(valueChanges),
    chosenDecision,
    koiKoi,
  });
}

function decisionFromObservation(
  observation: PlayerObservationV1,
): YakuDecisionPresentationV1 | null {
  const phase = observation.publicState.phase;
  if (phase.kind !== "awaitingYakuDecision" || phase.playerId !== observation.playerId) return null;

  const bankAction = observation.legalActions.find(
    (
      action,
    ): action is Extract<
      typeof action,
      { readonly type: "chooseYakuDecision"; readonly choice: "bank" }
    > =>
      action.type === "chooseYakuDecision" &&
      action.actorId === phase.playerId &&
      action.choice === "bank",
  );
  const koiKoiAction = observation.legalActions.find(
    (
      action,
    ): action is Extract<
      typeof action,
      { readonly type: "chooseYakuDecision"; readonly choice: "koiKoi" }
    > =>
      action.type === "chooseYakuDecision" &&
      action.actorId === phase.playerId &&
      action.choice === "koiKoi",
  );
  const resume = deepFreeze({
    value: { ...phase.context.resume },
    consequenceLabel: resumeConsequenceLabel(phase.context.resume),
  });
  return deepFreeze({
    actorId: phase.playerId,
    phase: phase.context.phase,
    newYaku: copyYaku(phase.context.newYaku),
    activeYaku: copyYaku(phase.context.activeYaku),
    currentYakuTotal: phase.context.currentYakuTotal,
    bank: bankAction
      ? deepFreeze({
          tableMultiplierAtDecision: bankAction.tableMultiplierAtDecision,
          scoringMultiplier: bankAction.scoringMultiplier,
          awardedPoints: bankAction.awardedPoints,
        })
      : null,
    koiKoi: koiKoiAction
      ? deepFreeze({
          currentTableMultiplier: koiKoiAction.currentTableMultiplier,
          resultingTableMultiplier: koiKoiAction.resultingTableMultiplier,
        })
      : null,
    resume,
  });
}

/**
 * Projects only already-public yaku/decision facts for browser presentation.
 * This intentionally does not calculate scoring, thresholds, or forced-rule eligibility.
 */
export function createYakuPresentationState(input: {
  readonly observation: PlayerObservationV1;
  readonly previousObservation?: PlayerObservationV1;
  readonly recentEvents?: readonly PublicGameEventV1[];
}): YakuPresentationStateV1 {
  const { observation } = input;
  return deepFreeze({
    players: observation.publicState.players.map((player) =>
      deepFreeze({
        playerId: player.id,
        activeYaku: copyYaku(player.activeYaku),
        currentYakuTotal: player.currentYakuTotal,
      }),
    ),
    tableMultiplier: observation.publicState.round.tableMultiplier,
    feedback: feedbackFromEvents(input.recentEvents ?? [], input.previousObservation, observation),
    decision: decisionFromObservation(observation),
  });
}
