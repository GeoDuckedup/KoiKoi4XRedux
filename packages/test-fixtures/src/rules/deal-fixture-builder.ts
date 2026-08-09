import { CARD_IDS, isCardId, type CardId } from "@koikoi4x/engine";

export interface InitialDealAllocation {
  readonly playerAHand: readonly CardId[];
  readonly playerBHand: readonly CardId[];
  readonly field: readonly CardId[];
}

export interface OrderedInitialDealAllocation extends InitialDealAllocation {
  readonly drawPile: readonly CardId[];
}

function validateAllocatedCards(allocated: readonly CardId[]): void {
  if (!allocated.every(isCardId)) {
    throw new Error("FIXTURE_UNKNOWN_CARD: allocation contains a noncanonical CardId.");
  }
  if (new Set(allocated).size !== allocated.length) {
    throw new Error("FIXTURE_DUPLICATE_CARD: allocated cards must be unique.");
  }
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
  validateAllocatedCards(allocated);
  const drawPile = CARD_IDS.filter((cardId) => !allocated.includes(cardId));
  if (drawPile.length !== 24) {
    throw new Error("FIXTURE_DRAW_SIZE: canonical complement must contain exactly 24 cards.");
  }
  return Object.freeze([...allocated, ...drawPile]);
}

export function buildExplicitOrderedDeck(
  allocation: OrderedInitialDealAllocation,
): readonly CardId[] {
  if (
    allocation.playerAHand.length !== 8 ||
    allocation.playerBHand.length !== 8 ||
    allocation.field.length !== 8 ||
    allocation.drawPile.length !== 24
  ) {
    throw new Error("FIXTURE_DEAL_SIZE: hands/field must be 8 cards and draw pile must be 24.");
  }
  const allocated = [
    ...allocation.playerAHand,
    ...allocation.playerBHand,
    ...allocation.field,
    ...allocation.drawPile,
  ];
  validateAllocatedCards(allocated);
  if (
    allocated.length !== CARD_IDS.length ||
    !CARD_IDS.every((cardId) => allocated.includes(cardId))
  ) {
    throw new Error(
      "FIXTURE_DECK_COVERAGE: explicit deal must contain every canonical card exactly once.",
    );
  }
  return Object.freeze(allocated);
}
