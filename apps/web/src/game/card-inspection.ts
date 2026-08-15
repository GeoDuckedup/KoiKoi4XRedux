import { getCardDefinition, getMonthDefinition, type CardId } from "@koikoi4x/engine";

export interface CardInspectionPresentationV1 {
  readonly category: string;
  readonly factualNotes: readonly string[];
  readonly fixedYaku: readonly string[];
  readonly flower: string;
  readonly month: string;
  readonly title: string;
}

const FIXED_YAKU_LABELS = Object.freeze({
  animalTrio: "Animal Trio",
  blossomViewing: "Blossom Viewing",
  blueScrolls: "Blue Scrolls",
  moonViewing: "Moon Viewing",
  redTextScrolls: "Red Text Scrolls",
});

function sentenceCase(value: string): string {
  return value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

/** Formats catalog facts only; it intentionally has no current-board or scoring inputs. */
export function createCardInspectionPresentation(cardId: CardId): CardInspectionPresentationV1 {
  const card = getCardDefinition(cardId);
  const month = getMonthDefinition(card.month);
  const flags: readonly string[] = card.flags;
  const factualNotes = ["Matches other cards with the same month."];
  if (flags.includes("rainBright")) factualNotes.push("This is the November Rain Bright.");
  if (flags.includes("sakeCup")) factualNotes.push("This is the September Sake Cup.");
  if (card.category === "scroll" && card.scrollKind) {
    factualNotes.push(`${sentenceCase(card.scrollKind.replace(/([A-Z])/g, " $1"))} Scroll.`);
  }
  return Object.freeze({
    title: card.displayName,
    month: month.name,
    flower: month.flower,
    category: sentenceCase(card.category),
    fixedYaku: Object.freeze(
      card.fixedYakuMemberships.map((membership) => FIXED_YAKU_LABELS[membership]),
    ),
    factualNotes: Object.freeze(factualNotes),
  });
}
