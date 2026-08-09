import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import { CARD_ZONES } from "../board/types";
import type { CardPresentationState } from "../cards/types";
import type { PresentationBoardProjection } from "./types";

const CARD_ID_SET = new Set<CardId>(CARD_IDS);
const CARD_ZONE_SET = new Set<string>(CARD_ZONES);

function freezeState(state: CardPresentationState): CardPresentationState {
  return Object.freeze({ ...state });
}

export function createPresentationProjection(
  states: readonly CardPresentationState[],
): PresentationBoardProjection {
  if (!Array.isArray(states) || states.length !== CARD_IDS.length) {
    throw new Error(`A presentation projection requires exactly ${CARD_IDS.length} cards.`);
  }
  const seen = new Set<CardId>();
  const projection = states.map((state) => {
    if (!CARD_ID_SET.has(state.cardId) || seen.has(state.cardId)) {
      throw new Error(`Invalid or duplicate presentation CardId: ${state.cardId}.`);
    }
    if (!CARD_ZONE_SET.has(state.zone)) {
      throw new Error(`Unknown presentation zone: ${state.zone}.`);
    }
    if (!Number.isInteger(state.slotIndex) || state.slotIndex < 0) {
      throw new Error(`Invalid slot index for ${state.cardId}.`);
    }
    if (!Number.isInteger(state.zIndex) || state.zIndex < 0) {
      throw new Error(`Invalid z-index for ${state.cardId}.`);
    }
    if (typeof state.slotId !== "string" || state.slotId.length === 0) {
      throw new Error(`Invalid slot ID for ${state.cardId}.`);
    }
    seen.add(state.cardId);
    return freezeState(state);
  });
  if (CARD_IDS.some((cardId) => !seen.has(cardId))) {
    throw new Error("A presentation projection must contain every canonical CardId exactly once.");
  }
  return Object.freeze(projection);
}

export function projectionByCardId(
  projection: PresentationBoardProjection,
): ReadonlyMap<CardId, CardPresentationState> {
  const validated = createPresentationProjection(projection);
  return new Map(validated.map((state) => [state.cardId, state]));
}

export function changedCardIds(
  from: PresentationBoardProjection,
  to: PresentationBoardProjection,
): readonly CardId[] {
  const fromById = projectionByCardId(from);
  const toById = projectionByCardId(to);
  return Object.freeze(
    CARD_IDS.filter((cardId) => {
      const before = fromById.get(cardId);
      const after = toById.get(cardId);
      return (
        before?.zone !== after?.zone ||
        before?.slotId !== after?.slotId ||
        before?.slotIndex !== after?.slotIndex ||
        before?.faceUp !== after?.faceUp ||
        before?.zIndex !== after?.zIndex
      );
    }),
  );
}

export function fingerprintProjection(projection: PresentationBoardProjection): string {
  const byId = projectionByCardId(projection);
  const serialized = CARD_IDS.map((cardId) => {
    const state = byId.get(cardId);
    if (!state) throw new Error(`Missing ${cardId} while fingerprinting a projection.`);
    return `${cardId}|${state.zone}|${state.slotId}|${state.slotIndex}|${Number(state.faceUp)}|${Number(state.interactive)}|${Number(state.selected)}|${state.zIndex}`;
  }).join("\n");
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `projection-v1:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function projectionsEqual(
  left: PresentationBoardProjection,
  right: PresentationBoardProjection,
): boolean {
  const leftById = projectionByCardId(left);
  const rightById = projectionByCardId(right);
  return CARD_IDS.every((cardId) => {
    const leftState = leftById.get(cardId);
    const rightState = rightById.get(cardId);
    return (
      leftState !== undefined &&
      rightState !== undefined &&
      leftState.cardId === rightState.cardId &&
      leftState.zone === rightState.zone &&
      leftState.slotId === rightState.slotId &&
      leftState.slotIndex === rightState.slotIndex &&
      leftState.faceUp === rightState.faceUp &&
      leftState.interactive === rightState.interactive &&
      leftState.selected === rightState.selected &&
      leftState.zIndex === rightState.zIndex
    );
  });
}
