import { getCardDefinition, getMonthDefinition, type CardId } from "@koikoi4x/engine";

import { getYakuGuideEntriesForCard, type CardYakuGuideEntryV1 } from "./yaku-guide";

export interface CardInspectionPresentationV1 {
  readonly month: string;
  readonly title: string;
  readonly yakuDisclosure: {
    readonly ariaControls: "card-inspector-yaku-entries";
    readonly ariaExpanded: false;
    readonly label: string;
  };
  readonly yakuEntries: readonly CardYakuGuideEntryV1[];
}

/** Formats a static card reference only; it intentionally has no live-game inputs. */
export function createCardInspectionPresentation(cardId: CardId): CardInspectionPresentationV1 {
  const card = getCardDefinition(cardId);
  const month = getMonthDefinition(card.month);
  const yakuEntries = getYakuGuideEntriesForCard(cardId);
  return Object.freeze({
    title: card.displayName,
    month: month.name,
    yakuDisclosure: Object.freeze({
      ariaControls: "card-inspector-yaku-entries",
      ariaExpanded: false,
      label: `Yaku this card can contribute to (${yakuEntries.length})`,
    }),
    yakuEntries,
  });
}
