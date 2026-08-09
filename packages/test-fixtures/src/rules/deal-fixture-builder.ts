import { CARD_IDS, isCardId, type CardId } from "@koikoi4x/engine";

export interface InitialDealAllocation {
  readonly playerAHand: readonly CardId[];
  readonly playerBHand: readonly CardId[];
  readonly field: readonly CardId[];
}

export function buildOrderedDeck(allocation: InitialDealAllocation): readonly CardId[] {
  const allocated = [...allocation.playerAHand, ...allocation.playerBHand, ...allocation.field];
  if (
    allocation.playerAHand.length !== 8 ||
    allocation.playerBHand.length !== 8 ||
    allocation.field.length !== 8
  ) {
    throw new Error("FIXTURE_DEAL_SIZE: hands and field must each contain exactly 8 cards.");
  }
  if (!allocated.every(isCardId)) {
    throw new Error("FIXTURE_UNKNOWN_CARD: allocation contains a noncanonical CardId.");
  }
  if (new Set(allocated).size !== allocated.length) {
    throw new Error("FIXTURE_DUPLICATE_CARD: allocated cards must be unique.");
  }
  const drawPile = CARD_IDS.filter((cardId) => !allocated.includes(cardId));
  if (drawPile.length !== 24) {
    throw new Error("FIXTURE_DRAW_SIZE: canonical complement must contain exactly 24 cards.");
  }
  return Object.freeze([...allocated, ...drawPile]);
}
