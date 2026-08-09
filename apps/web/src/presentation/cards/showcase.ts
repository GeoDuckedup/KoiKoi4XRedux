import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import type { CardZone } from "../board/types";
import type { CardPresentationState } from "./types";

const SHOWCASE_ZONES = Object.freeze({
  opponentHand: Object.freeze([
    "january-crane",
    "january-red-text-scroll",
    "january-pine-plain-a",
    "january-pine-plain-b",
    "february-bush-warbler",
    "february-red-text-scroll",
    "february-plum-plain-a",
    "february-plum-plain-b",
  ] as const),
  playerHand: Object.freeze([
    "march-curtain",
    "march-red-text-scroll",
    "march-cherry-plain-a",
    "march-cherry-plain-b",
    "april-cuckoo",
    "april-red-scroll",
    "april-wisteria-plain-a",
    "april-wisteria-plain-b",
  ] as const),
  field: Object.freeze([
    "may-bridge",
    "may-red-scroll",
    "may-iris-plain-a",
    "may-iris-plain-b",
    "june-butterfly",
    "june-blue-scroll",
    "june-peony-plain-a",
    "june-peony-plain-b",
  ] as const),
  opponentBrights: Object.freeze(["august-moon"] as const),
  opponentAnimals: Object.freeze(["july-boar"] as const),
  opponentScrolls: Object.freeze(["july-red-scroll"] as const),
  opponentPlains: Object.freeze(["july-bush-clover-plain-a"] as const),
  playerBrights: Object.freeze(["november-rain"] as const),
  playerAnimals: Object.freeze(["september-sake-cup"] as const),
  playerScrolls: Object.freeze(["september-blue-scroll"] as const),
  playerPlains: Object.freeze(["july-bush-clover-plain-b"] as const),
  reveal: Object.freeze(["august-geese"] as const),
  drawPile: Object.freeze([
    "august-pampas-plain-a",
    "august-pampas-plain-b",
    "september-chrysanthemum-plain-a",
    "september-chrysanthemum-plain-b",
    "october-deer",
    "october-blue-scroll",
    "october-maple-plain-a",
    "october-maple-plain-b",
    "november-swallow",
    "november-red-scroll",
    "november-willow-plain",
    "december-phoenix",
    "december-paulownia-plain-a",
    "december-paulownia-plain-b",
    "december-paulownia-plain-c",
  ] as const),
} as const satisfies Readonly<Partial<Record<CardZone, readonly CardId[]>>>);

function buildShowcaseAssignments(): readonly CardPresentationState[] {
  const assignments: CardPresentationState[] = [];
  for (const [zone, cardIds] of Object.entries(SHOWCASE_ZONES) as [CardZone, readonly CardId[]][]) {
    for (const [slotIndex, cardId] of cardIds.entries()) {
      assignments.push(
        Object.freeze({
          cardId,
          zone,
          slotIndex,
          slotId: `${zone}:${slotIndex}`,
          faceUp: zone !== "drawPile" && zone !== "opponentHand",
          selected: false,
          interactive: false,
          zIndex: slotIndex,
        }),
      );
    }
  }

  const assignedIds = assignments.map(({ cardId }) => cardId);
  if (
    assignments.length !== CARD_IDS.length ||
    new Set(assignedIds).size !== CARD_IDS.length ||
    CARD_IDS.some((cardId) => !assignedIds.includes(cardId))
  ) {
    throw new Error("The Phase 2B showcase must assign every canonical CardId exactly once.");
  }
  return Object.freeze(assignments);
}

export const CARD_SHOWCASE_ASSIGNMENTS = buildShowcaseAssignments();
