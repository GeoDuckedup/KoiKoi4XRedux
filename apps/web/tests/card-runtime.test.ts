import { ART_SPEC_V1, decodeRuntimeDeckManifestV1 } from "@koikoi4x/deck-format";
import { CARD_IDS, type CardId } from "@koikoi4x/engine";
import { Container, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";

import { computeBoardLayout } from "../src/presentation/board/board-layout";
import { BOARD_LAYER_ORDER, CARD_ZONES } from "../src/presentation/board/types";
import { computeCardPlacements } from "../src/presentation/cards/card-layout";
import { createCardViewRegistry } from "../src/presentation/cards/card-view-registry";
import { CARD_SHOWCASE_ASSIGNMENTS } from "../src/presentation/cards/showcase";
import type { CardPresentationState } from "../src/presentation/cards/types";
import type { ActiveDeckTextures } from "../src/presentation/deck/card-asset-manager";

const viewports = [
  { width: 320, height: 420 },
  { width: 360, height: 520 },
  { width: 390, height: 720 },
  { width: 768, height: 900 },
  { width: 844, height: 340 },
  { width: 1366, height: 650 },
  { width: 1920, height: 900 },
] as const;

function deckTextures(packageId: "technical-moonlight" | "technical-sunrise"): ActiveDeckTextures {
  const manifest = decodeRuntimeDeckManifestV1({
    runtimeFormatVersion: 1,
    artSpecVersion: 1,
    packageId,
    packageVersion: "1.0.0",
    name: packageId,
    author: "tests",
    license: "tests",
    approvalStatus: "technical-placeholder",
    framePolicy: "game",
    inheritanceChain:
      packageId === "technical-sunrise"
        ? ["technical-sunrise"]
        : ["technical-sunrise", "technical-moonlight"],
    cardFaces: Object.fromEntries(
      CARD_IDS.map((cardId) => [
        cardId,
        {
          path: `cards/${cardId}.svg`,
          width: ART_SPEC_V1.derivatives.table.width,
          height: ART_SPEC_V1.derivatives.table.height,
          mediaType: "image/svg+xml",
          sourcePackageId: packageId,
        },
      ]),
    ),
    cardBack: {
      path: "backs/default.svg",
      width: ART_SPEC_V1.derivatives.table.width,
      height: ART_SPEC_V1.derivatives.table.height,
      mediaType: "image/svg+xml",
      sourcePackageId: packageId,
    },
  });
  return Object.freeze({
    manifest,
    faces: Object.freeze(
      Object.fromEntries(CARD_IDS.map((cardId) => [cardId, Texture.WHITE])),
    ) as Readonly<Record<CardId, Texture>>,
    faceBindings: Object.freeze(
      Object.fromEntries(CARD_IDS.map((cardId) => [cardId, `${packageId}:${cardId}`])),
    ) as Readonly<Record<CardId, string>>,
    back: Texture.WHITE,
  });
}

describe("Phase 2B CardView runtime", () => {
  it("CARDVIEW-001 assigns every canonical CardId exactly once across all showcase zones", () => {
    expect(CARD_SHOWCASE_ASSIGNMENTS).toHaveLength(48);
    expect(new Set(CARD_SHOWCASE_ASSIGNMENTS.map(({ cardId }) => cardId))).toEqual(
      new Set(CARD_IDS),
    );
    expect(Object.isFrozen(CARD_SHOWCASE_ASSIGNMENTS)).toBe(true);
    expect(CARD_SHOWCASE_ASSIGNMENTS.every(Object.isFrozen)).toBe(true);
    expect(new Set(CARD_SHOWCASE_ASSIGNMENTS.map(({ zone }) => zone))).toEqual(
      new Set(CARD_ZONES.filter((zone) => zone !== "transit")),
    );
  });

  it.each(viewports)(
    "CARDVIEW-001 computes contained 5:8 placements at $width×$height",
    (viewport) => {
      const layout = computeBoardLayout(viewport);
      const placements = computeCardPlacements(layout, CARD_SHOWCASE_ASSIGNMENTS);

      expect(placements).toHaveLength(48);
      for (const placement of placements) {
        expect(placement.bounds.width / placement.bounds.height).toBeCloseTo(5 / 8, 4);
        const zone = layout.cardZones[placement.zone];
        expect(placement.bounds.x).toBeGreaterThanOrEqual(zone.x - 0.001);
        expect(placement.bounds.y).toBeGreaterThanOrEqual(zone.y - 0.001);
        expect(placement.bounds.x + placement.bounds.width).toBeLessThanOrEqual(
          zone.x + zone.width + 0.001,
        );
        expect(placement.bounds.y + placement.bounds.height).toBeLessThanOrEqual(
          zone.y + zone.height + 0.001,
        );
      }
    },
  );

  it("CARDVIEW-002 preserves all 48 view tokens across zone movement and deck switching", () => {
    const sunrise = deckTextures("technical-sunrise");
    const moonlight = deckTextures("technical-moonlight");
    const registry = createCardViewRegistry(sunrise);
    const layers = new Map(BOARD_LAYER_ORDER.map((layer) => [layer, new Container()]));
    const layout = computeBoardLayout({ width: 390, height: 720 });
    registry.applyPlacements(computeCardPlacements(layout, CARD_SHOWCASE_ASSIGNMENTS), layers);
    const before = registry.inspect();

    const moved = CARD_SHOWCASE_ASSIGNMENTS.map((state) => {
      if (state.cardId === "august-geese") {
        return Object.freeze({
          ...state,
          zone: "drawPile",
          slotId: "drawPile:0",
          slotIndex: 0,
          faceUp: false,
        }) satisfies CardPresentationState;
      }
      if (state.cardId === "august-pampas-plain-a") {
        return Object.freeze({
          ...state,
          zone: "reveal",
          slotId: "reveal:0",
          slotIndex: 0,
          faceUp: true,
        }) satisfies CardPresentationState;
      }
      if (state.zone === "drawPile") {
        return Object.freeze({
          ...state,
          slotIndex: state.slotIndex - 1,
          slotId: `drawPile:${state.slotIndex - 1}`,
        });
      }
      return state;
    });
    registry.applyPlacements(computeCardPlacements(layout, moved), layers);
    registry.applyDeck(moonlight);
    const after = registry.inspect();

    expect(after.views.map(({ cardId, token }) => ({ cardId, token }))).toEqual(
      before.views.map(({ cardId, token }) => ({ cardId, token })),
    );
    expect(after.views.find(({ cardId }) => cardId === "august-geese")).toMatchObject({
      zone: "drawPile",
      faceUp: false,
    });
    expect(after.activeDeckId).toBe("technical-moonlight");
    expect(after.views.map(({ textureBinding }) => textureBinding)).not.toEqual(
      before.views.map(({ textureBinding }) => textureBinding),
    );
    expect(after.cardViewCount).toBe(48);
    expect(after.uniqueCardIdCount).toBe(48);
    registry.destroy();
  });
});
