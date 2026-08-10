import {
  CARD_IDS,
  getCardDefinition,
  type CardCategory,
  type CardId,
  type PlayerId,
  type PlayerObservationV1,
  type PublicGameEventV1,
} from "@koikoi4x/engine";

import { createPresentationProjection } from "../presentation/animation/projection";
import type { PresentationBoardProjection } from "../presentation/animation/types";
import type { CardPresentationState } from "../presentation/cards/types";
import type { InteractionSourceV1 } from "../presentation/input/types";

const CAPTURE_ZONE_BY_CATEGORY = Object.freeze({
  player: Object.freeze({
    bright: "playerBrights",
    animal: "playerAnimals",
    scroll: "playerScrolls",
    plain: "playerPlains",
  }),
  opponent: Object.freeze({
    bright: "opponentBrights",
    animal: "opponentAnimals",
    scroll: "opponentScrolls",
    plain: "opponentPlains",
  }),
} as const);

type MutablePresentationState = {
  -readonly [Key in keyof CardPresentationState]: CardPresentationState[Key];
};

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "player-a" ? "player-b" : "player-a";
}

function captureZone(
  category: CardCategory,
  owner: "opponent" | "player",
): CardPresentationState["zone"] {
  return CAPTURE_ZONE_BY_CATEGORY[owner][category];
}

function mutableProjection(
  projection: PresentationBoardProjection,
): Map<CardId, MutablePresentationState> {
  return new Map(projection.map((state) => [state.cardId, { ...state }]));
}

function normalizeProjection(
  states: ReadonlyMap<CardId, MutablePresentationState>,
): PresentationBoardProjection {
  const zoneIndexes = new Map<CardPresentationState["zone"], number>();
  return createPresentationProjection(
    CARD_IDS.map((cardId) => {
      const state = states.get(cardId);
      if (!state) throw new Error(`PRESENTATION_CARD_MISSING: ${cardId}`);
      const slotIndex = zoneIndexes.get(state.zone) ?? 0;
      zoneIndexes.set(state.zone, slotIndex + 1);
      return Object.freeze({
        ...state,
        slotIndex,
        slotId: `${state.zone}:${slotIndex}`,
        zIndex: slotIndex,
        selected: false,
        interactive: false,
      });
    }),
  );
}

function moveCard(
  states: Map<CardId, MutablePresentationState>,
  cardId: CardId,
  zone: CardPresentationState["zone"],
  faceUp: boolean,
): void {
  const state = states.get(cardId);
  if (!state) throw new Error(`PRESENTATION_CARD_MISSING: ${cardId}`);
  state.zone = zone;
  state.faceUp = faceUp;
}

function preserveHiddenAllocation(input: {
  hiddenCardIds: readonly CardId[];
  opponentHandCount: number;
  previous?: PresentationBoardProjection;
}): Readonly<{ opponentHand: readonly CardId[]; drawPile: readonly CardId[] }> {
  const hidden = new Set(input.hiddenCardIds);
  const previousOpponent =
    input.previous
      ?.filter(({ cardId, zone }) => hidden.has(cardId) && zone === "opponentHand")
      .map(({ cardId }) => cardId) ?? [];
  const previousDraw =
    input.previous
      ?.filter(({ cardId, zone }) => hidden.has(cardId) && zone === "drawPile")
      .map(({ cardId }) => cardId) ?? [];
  const remaining = CARD_IDS.filter(
    (cardId) =>
      hidden.has(cardId) && !previousOpponent.includes(cardId) && !previousDraw.includes(cardId),
  );
  const preferred = [...previousOpponent, ...remaining, ...previousDraw];
  const opponentHand = preferred.slice(0, input.opponentHandCount);
  const opponentSet = new Set(opponentHand);
  return Object.freeze({
    opponentHand: Object.freeze(opponentHand),
    drawPile: Object.freeze(input.hiddenCardIds.filter((cardId) => !opponentSet.has(cardId))),
  });
}

export function createInteractionSourceFromObservation(
  observation: PlayerObservationV1,
): InteractionSourceV1 {
  const confirmationTargetCardIds: Partial<Record<CardId, readonly CardId[]>> = {};
  const grouped = new Map<CardId, CardId[]>();
  for (const action of observation.legalActions) {
    if (action.type !== "playHandCard" || action.targetFieldCardId === undefined) continue;
    const targets = grouped.get(action.cardId) ?? [];
    targets.push(action.targetFieldCardId);
    grouped.set(action.cardId, targets);
  }
  for (const [cardId, targets] of grouped) {
    confirmationTargetCardIds[cardId] = Object.freeze([...targets]);
  }
  return Object.freeze({
    observation,
    confirmationTargetCardIds: Object.freeze(confirmationTargetCardIds),
  });
}

export function projectObservationToBoard(
  observation: PlayerObservationV1,
  previous?: PresentationBoardProjection,
): PresentationBoardProjection {
  const ownPlayer = observation.publicState.players.find(({ id }) => id === observation.playerId);
  const opponentPlayer = observation.publicState.players.find(
    ({ id }) => id === otherPlayer(observation.playerId),
  );
  if (!ownPlayer || !opponentPlayer) throw new Error("OBSERVATION_PLAYERS_INVALID");

  const known = new Set<CardId>();
  const assignments = new Map<CardId, MutablePresentationState>();
  const assign = (cardId: CardId, zone: CardPresentationState["zone"], faceUp: boolean): void => {
    if (known.has(cardId)) throw new Error(`OBSERVATION_CARD_DUPLICATE: ${cardId}`);
    known.add(cardId);
    assignments.set(cardId, {
      cardId,
      zone,
      faceUp,
      interactive: false,
      selected: false,
      slotId: "pending",
      slotIndex: 0,
      zIndex: 0,
    });
  };

  for (const cardId of observation.ownHand) assign(cardId, "playerHand", true);
  for (const cardId of observation.publicState.round.field) assign(cardId, "field", true);
  for (const cardId of ownPlayer.captured) {
    assign(cardId, captureZone(getCardDefinition(cardId).category, "player"), true);
  }
  for (const cardId of opponentPlayer.captured) {
    assign(cardId, captureZone(getCardDefinition(cardId).category, "opponent"), true);
  }
  const phase = observation.publicState.phase;
  if (phase.kind === "awaitingDrawCapture") assign(phase.drawnCardId, "reveal", true);

  const hiddenCardIds = CARD_IDS.filter((cardId) => !known.has(cardId));
  const hidden = preserveHiddenAllocation({
    hiddenCardIds,
    opponentHandCount: opponentPlayer.handCount,
    ...(previous === undefined ? {} : { previous }),
  });
  for (const cardId of hidden.opponentHand) assign(cardId, "opponentHand", false);
  for (const cardId of hidden.drawPile) assign(cardId, "drawPile", false);
  return normalizeProjection(assignments);
}

function ensureDrawSource(
  projection: PresentationBoardProjection,
  events: readonly PublicGameEventV1[],
): PresentationBoardProjection {
  const draw = events.find(
    (event): event is Extract<PublicGameEventV1, { readonly type: "drawCardRevealed" }> =>
      event.type === "drawCardRevealed",
  );
  if (!draw) return projection;
  const states = mutableProjection(projection);
  const drawn = states.get(draw.cardId);
  if (!drawn || drawn.zone === "drawPile") return projection;
  const replacement = projection.find(({ zone }) => zone === "drawPile");
  if (!replacement) throw new Error("PRESENTATION_DRAW_PILE_EMPTY");
  const originalZone = drawn.zone;
  const originalFaceUp = drawn.faceUp;
  moveCard(states, draw.cardId, "drawPile", false);
  moveCard(states, replacement.cardId, originalZone, originalFaceUp);
  return normalizeProjection(states);
}

function applyPublicEvent(
  projection: PresentationBoardProjection,
  event: PublicGameEventV1,
  viewerId: PlayerId,
): PresentationBoardProjection {
  const states = mutableProjection(projection);
  if (event.type === "handCardPlayed") moveCard(states, event.cardId, "transit", true);
  if (event.type === "drawCardRevealed") moveCard(states, event.cardId, "reveal", true);
  if (event.type === "cardPlacedOnField") moveCard(states, event.cardId, "field", true);
  if (event.type === "cardsCaptured") {
    const owner = event.actorId === viewerId ? "player" : "opponent";
    for (const cardId of event.cardIds) {
      moveCard(states, cardId, captureZone(getCardDefinition(cardId).category, owner), true);
    }
  }
  return normalizeProjection(states);
}

export interface TransitionPresentationV1 {
  readonly projections: readonly PresentationBoardProjection[];
  readonly source: PresentationBoardProjection;
  readonly target: PresentationBoardProjection;
}

export function projectTransitionForPlayer(input: {
  before: PresentationBoardProjection;
  events: readonly PublicGameEventV1[];
  nextObservation: PlayerObservationV1;
}): TransitionPresentationV1 {
  const source = ensureDrawSource(input.before, input.events);
  const projections: PresentationBoardProjection[] = [source];
  let current = source;
  for (const event of input.events) {
    current = applyPublicEvent(current, event, input.nextObservation.playerId);
    projections.push(current);
  }
  const target = projectObservationToBoard(input.nextObservation, current);
  projections[projections.length - 1] = target;
  return Object.freeze({ source, target, projections: Object.freeze(projections) });
}
