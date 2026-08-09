import { CARD_CATALOG, type CardId } from "@koikoi4x/engine";

export const CONTACT_SHEET_PLAN_VERSION = 1 as const;
export type ContactSheetKind = "art-review" | "gameplay-390x844";

export interface ContactSheetSlotV1 {
  readonly cardId: CardId;
  readonly card: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly column: number;
  readonly labelY: number;
  readonly month: number;
  readonly row: number;
}

export interface ContactSheetPlanV1 {
  readonly background: string;
  readonly cardSize: Readonly<{ width: number; height: number }>;
  readonly columns: 4;
  readonly height: number;
  readonly kind: ContactSheetKind;
  readonly slots: readonly ContactSheetSlotV1[];
  readonly version: typeof CONTACT_SHEET_PLAN_VERSION;
  readonly width: number;
}

const CONFIG = Object.freeze({
  "art-review": Object.freeze({
    background: "#efe7d5",
    cardHeight: 320,
    cardWidth: 200,
    gapX: 24,
    gapY: 20,
    labelHeight: 30,
    marginX: 48,
    marginY: 48,
  }),
  "gameplay-390x844": Object.freeze({
    background: "#0b2a20",
    cardHeight: 106,
    cardWidth: 66,
    gapX: 12,
    gapY: 8,
    labelHeight: 18,
    marginX: 45,
    marginY: 24,
  }),
});

export function createContactSheetPlanV1(kind: ContactSheetKind): ContactSheetPlanV1 {
  const config = CONFIG[kind];
  const rowHeight = config.cardHeight + config.labelHeight + config.gapY;
  const width = config.marginX * 2 + config.cardWidth * 4 + config.gapX * 3;
  const height = config.marginY * 2 + rowHeight * 12 - config.gapY;
  const slots = CARD_CATALOG.map((card, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const x = config.marginX + column * (config.cardWidth + config.gapX);
    const y = config.marginY + row * rowHeight;
    return Object.freeze({
      cardId: card.id,
      card: Object.freeze({ x, y, width: config.cardWidth, height: config.cardHeight }),
      column,
      labelY: y + config.cardHeight + Math.floor(config.labelHeight * 0.72),
      month: card.month,
      row,
    });
  });
  return Object.freeze({
    background: config.background,
    cardSize: Object.freeze({ width: config.cardWidth, height: config.cardHeight }),
    columns: 4,
    height,
    kind,
    slots: Object.freeze(slots),
    version: CONTACT_SHEET_PLAN_VERSION,
    width,
  });
}
