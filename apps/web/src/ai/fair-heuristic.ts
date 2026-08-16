import {
  CARD_IDS,
  evaluateYaku,
  getCardDefinition,
  type CardId,
  type LegalActionV1,
  type PlayerObservationV1,
} from "@koikoi4x/engine";

import { CPU_PERSONALITIES, type CpuPersonalityV1, type FairCpuActionSelectorV1 } from "./types";

export { CPU_PERSONALITIES, type CpuPersonalityV1, type FairCpuActionSelectorV1 } from "./types";

interface ActionFeaturesV1 {
  readonly currentMonthCapture: number;
  readonly denialValue: number;
  readonly futurePotential: number;
  readonly immediateValue: number;
  readonly newYakuPoints: number;
  readonly placedExposure: number;
  readonly yakuTotalDelta: number;
}

interface PersonalityWeightsV1 {
  readonly currentMonthCapture: number;
  readonly denialValue: number;
  readonly futurePotential: number;
  readonly immediateValue: number;
  readonly newYakuPoints: number;
  readonly placedExposure: number;
  readonly yakuTotalDelta: number;
  readonly bankAward: number;
  readonly koiPressure: number;
}

const PERSONALITY_WEIGHTS: Readonly<Record<CpuPersonalityV1, PersonalityWeightsV1>> = Object.freeze(
  {
    timid: Object.freeze({
      immediateValue: 12,
      yakuTotalDelta: 24,
      newYakuPoints: 25,
      futurePotential: 2,
      denialValue: 8,
      currentMonthCapture: 8,
      placedExposure: 12,
      bankAward: 50,
      koiPressure: 7,
    }),
    monk: Object.freeze({
      immediateValue: 8,
      yakuTotalDelta: 18,
      newYakuPoints: 15,
      futurePotential: 8,
      denialValue: 10,
      currentMonthCapture: 5,
      placedExposure: 6,
      bankAward: 35,
      koiPressure: 14,
    }),
    gambler: Object.freeze({
      immediateValue: 4,
      yakuTotalDelta: 12,
      newYakuPoints: 15,
      futurePotential: 15,
      denialValue: 4,
      currentMonthCapture: 4,
      placedExposure: 1,
      bankAward: 17,
      koiPressure: 50,
    }),
  },
);

const CARD_INDEX = new Map(CARD_IDS.map((cardId, index) => [cardId, index]));

function cardIndex(cardId: CardId | undefined): number {
  return cardId === undefined ? CARD_IDS.length : (CARD_INDEX.get(cardId) ?? CARD_IDS.length);
}

function cardValue(cardId: CardId): number {
  const definition = getCardDefinition(cardId);
  const categoryValue =
    definition.category === "bright"
      ? 10
      : definition.category === "animal"
        ? 4
        : definition.category === "scroll"
          ? 3
          : 1;
  return categoryValue + definition.fixedYakuMemberships.length * 3;
}

function sourceCardId(action: LegalActionV1): CardId | undefined {
  return action.type === "playHandCard"
    ? action.cardId
    : action.type === "resolveDrawCard"
      ? action.drawnCardId
      : undefined;
}

function capturedCardIds(action: LegalActionV1): readonly CardId[] {
  const source = sourceCardId(action);
  if (source === undefined || action.type === "chooseYakuDecision") return [];
  if (action.resolution.kind === "placeOnField") return [];
  return [source, ...action.resolution.matchingFieldCardIds];
}

function newlyActiveYakuPoints(
  before: readonly { readonly key: string }[],
  after: readonly { readonly key: string; readonly points: number }[],
): number {
  const beforeKeys = new Set(before.map(({ key }) => key));
  return after
    .filter(({ key }) => !beforeKeys.has(key))
    .reduce((total, { points }) => total + points, 0);
}

function unknownCardCount(observation: PlayerObservationV1): number {
  const publicCardIds = new Set<CardId>([
    ...observation.publicState.round.field,
    ...observation.publicState.players.flatMap(({ captured }) => captured),
    ...(observation.publicState.phase.kind === "awaitingDrawResolution"
      ? [observation.publicState.phase.drawnCardId]
      : []),
  ]);
  return CARD_IDS.filter(
    (cardId) => !publicCardIds.has(cardId) && !observation.ownHand.includes(cardId),
  ).length;
}

function futurePotential(observation: PlayerObservationV1, captured: readonly CardId[]): number {
  const heldAndCaptured = new Set([...observation.ownHand, ...captured]);
  const fixedMemberships = CARD_IDS.filter((cardId) => {
    const definition = getCardDefinition(cardId);
    return heldAndCaptured.has(cardId) && definition.fixedYakuMemberships.length > 0;
  }).length;
  const categoryPotential = CARD_IDS.filter((cardId) => {
    const category = getCardDefinition(cardId).category;
    return (
      heldAndCaptured.has(cardId) &&
      (category === "bright" || category === "animal" || category === "scroll")
    );
  }).length;
  // Fewer unknown cards means a visible/owned developing set is more certain.
  return fixedMemberships * 4 + categoryPotential + Math.max(0, 24 - unknownCardCount(observation));
}

function featuresForAction(
  observation: PlayerObservationV1,
  action: LegalActionV1,
): ActionFeaturesV1 {
  if (action.type === "chooseYakuDecision") {
    return Object.freeze({
      immediateValue: 0,
      yakuTotalDelta: 0,
      newYakuPoints: 0,
      futurePotential:
        observation.publicState.phase.kind === "awaitingYakuDecision"
          ? observation.publicState.phase.context.currentYakuTotal
          : 0,
      denialValue: 0,
      currentMonthCapture: 0,
      placedExposure: 0,
    });
  }

  const player = observation.publicState.players.find(({ id }) => id === observation.playerId);
  if (player === undefined) throw new Error("CPU_OBSERVATION_PLAYER_MISSING");
  const captured = capturedCardIds(action);
  const before = evaluateYaku(player.captured, observation.publicState.round.scheduledMonth);
  const after = evaluateYaku(
    [...player.captured, ...captured],
    observation.publicState.round.scheduledMonth,
  );
  const source = sourceCardId(action);
  const targetIds = captured.slice(1);
  const placedExposure =
    action.resolution.kind === "placeOnField" && source !== undefined ? cardValue(source) : 0;
  return Object.freeze({
    immediateValue: captured.reduce((total, cardId) => total + cardValue(cardId), 0),
    yakuTotalDelta: after.currentYakuTotal - before.currentYakuTotal,
    newYakuPoints: newlyActiveYakuPoints(before.activeYaku, after.activeYaku),
    futurePotential: futurePotential(observation, captured),
    denialValue: targetIds.reduce((total, cardId) => total + cardValue(cardId), 0),
    currentMonthCapture: captured.filter(
      (cardId) => getCardDefinition(cardId).month === observation.publicState.round.scheduledMonth,
    ).length,
    placedExposure,
  });
}

function scoreYakuChoice(
  observation: PlayerObservationV1,
  action: Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }>,
  weights: PersonalityWeightsV1,
): number {
  const currentYakuTotal =
    observation.publicState.phase.kind === "awaitingYakuDecision"
      ? observation.publicState.phase.context.currentYakuTotal
      : 0;
  if (action.choice === "bank") return action.awardedPoints * weights.bankAward;
  return (
    currentYakuTotal * action.resultingTableMultiplier * weights.koiPressure +
    action.resultingTableMultiplier * weights.futurePotential
  );
}

function scoreAction(
  observation: PlayerObservationV1,
  action: LegalActionV1,
  weights: PersonalityWeightsV1,
): number {
  if (action.type === "chooseYakuDecision") return scoreYakuChoice(observation, action, weights);
  const features = featuresForAction(observation, action);
  return (
    features.immediateValue * weights.immediateValue +
    features.yakuTotalDelta * weights.yakuTotalDelta +
    features.newYakuPoints * weights.newYakuPoints +
    features.futurePotential * weights.futurePotential +
    features.denialValue * weights.denialValue +
    features.currentMonthCapture * weights.currentMonthCapture -
    features.placedExposure * weights.placedExposure
  );
}

/** A canonical key prevents any legal-action source ordering from deciding a tie. */
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

export const chooseFairCpuAction: FairCpuActionSelectorV1 = (observation, personality) => {
  if (!(CPU_PERSONALITIES as readonly string[]).includes(personality)) {
    throw new Error("CPU_PERSONALITY_INVALID");
  }
  const actions = observation.legalActions;
  if (actions.length === 0) return null;
  const weights = PERSONALITY_WEIGHTS[personality];
  let chosen = actions[0];
  if (chosen === undefined) return null;
  let chosenScore = scoreAction(observation, chosen, weights);
  for (const action of actions.slice(1)) {
    const score = scoreAction(observation, action, weights);
    if (
      score > chosenScore ||
      (score === chosenScore && compareCanonicalAction(action, chosen) < 0)
    ) {
      chosen = action;
      chosenScore = score;
    }
  }
  return chosen;
};
