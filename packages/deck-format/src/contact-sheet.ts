import { CARD_CATALOG, CARD_IDS, hashCanonicalV1, type CardId } from "@koikoi4x/engine";

import type { CardTransform } from "./types.ts";

export const CONTACT_SHEET_PLAN_VERSION = 1 as const;
export const CONTACT_SHEET_REVIEW_DIGEST_VERSION = 1 as const;
export type ContactSheetKind = "art-review" | "gameplay-390x844";

export interface ContactSheetReviewCardV1 {
  readonly sourceSha256: string;
  readonly transform: CardTransform;
}

export interface ContactSheetReviewDigestInputV1 {
  readonly backSourceSha256: string | null;
  readonly cards: Readonly<Partial<Record<CardId, ContactSheetReviewCardV1>>>;
  readonly kind: ContactSheetKind;
  readonly packageId: string;
}

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

function digestTransform(transform: CardTransform): readonly string[] {
  return transform.mode === "auto"
    ? Object.freeze(["auto", transform.fit, String(transform.focusX), String(transform.focusY)])
    : Object.freeze([
        "manual",
        String(transform.crop.x),
        String(transform.crop.y),
        String(transform.crop.width),
        String(transform.crop.height),
        String(transform.zoom),
        String(transform.rotationDeg),
      ]);
}

function assertSourceDigest(value: string, path: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${path} must be a lowercase SHA-256 digest.`);
  }
}

/**
 * Produces the platform-independent identity reviewed by an owner.
 *
 * PNG bytes remain useful artifact diagnostics, but encoder metadata and compression can differ
 * between Sharp/libpng builds. Approval therefore binds the ordered immutable source content,
 * transforms, art specification, back, and exact sheet plan instead of encoded PNG bytes.
 */
export function createContactSheetReviewSha256V1(input: ContactSheetReviewDigestInputV1): string {
  const plan = createContactSheetPlanV1(input.kind);
  const cards = CARD_IDS.map((cardId) => {
    const card = input.cards[cardId];
    if (card === undefined) return Object.freeze({ cardId, state: "missing" });
    assertSourceDigest(card.sourceSha256, `cards.${cardId}.sourceSha256`);
    return Object.freeze({
      cardId,
      sourceSha256: card.sourceSha256,
      state: "present",
      transform: digestTransform(card.transform),
    });
  });
  if (input.backSourceSha256 !== null) {
    assertSourceDigest(input.backSourceSha256, "backSourceSha256");
  }
  const canonicalHash = hashCanonicalV1({
    artSpecVersion: 1,
    back:
      input.backSourceSha256 === null
        ? Object.freeze({ state: "missing" })
        : Object.freeze({ sourceSha256: input.backSourceSha256, state: "present" }),
    cards,
    packageId: input.packageId,
    plan,
    reviewDigestVersion: CONTACT_SHEET_REVIEW_DIGEST_VERSION,
  });
  return canonicalHash.slice("sha256:".length);
}
