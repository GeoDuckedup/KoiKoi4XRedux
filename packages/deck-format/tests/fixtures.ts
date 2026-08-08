import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import type { CardSourceMapping, DeckPackageV1, DeckTransformsV1 } from "../src/types.ts";

export function completeCardMappings(): Readonly<Record<CardId, CardSourceMapping>> {
  return Object.freeze(
    Object.fromEntries(
      CARD_IDS.map((cardId) => [cardId, Object.freeze({ file: `source/${cardId}.png` })]),
    ),
  ) as Readonly<Record<CardId, CardSourceMapping>>;
}

type PackageOverrides = {
  [Key in keyof DeckPackageV1]?: DeckPackageV1[Key] | undefined;
};

export function completePackage(overrides: PackageOverrides = {}): DeckPackageV1 {
  return {
    formatVersion: 1,
    id: "complete-base",
    version: "1.0.0",
    name: "Complete Base",
    author: "Test",
    license: "Test-only",
    extends: null,
    framePolicy: "game",
    sourceDefaults: { mode: "auto", fit: "cover", focusX: 0.5, focusY: 0.5 },
    cards: completeCardMappings(),
    backs: { default: "source/card-back.png" },
    preview: { featuredCardIds: ["january-crane"] },
    ...overrides,
  } as DeckPackageV1;
}

export function emptyTransforms(packageId: string): DeckTransformsV1 {
  return { formatVersion: 1, packageId, cards: {} };
}
