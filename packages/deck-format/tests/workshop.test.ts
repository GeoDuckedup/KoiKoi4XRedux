import { CARD_IDS } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  ART_SPEC_V1,
  autoAssignCanonicalFilenames,
  createContactSheetPlanV1,
  createManualTransformFromAuto,
  createPostRotationCoverPlanV1,
  createWorkshopGridV1,
  moveManualTransform,
  updateAutoFocus,
  updateManualTransform,
  withTransformOverride,
  type ResolvedDeckPackageDraft,
  type WorkshopSourceSummaryV1,
} from "../src/index.ts";

function resolvedDraft(): ResolvedDeckPackageDraft {
  return Object.freeze({
    formatVersion: 1,
    id: "technical-workshop-proof",
    version: "1.0.0",
    name: "Technical Workshop Proof",
    author: "Tests",
    license: "Technical only",
    framePolicy: "game",
    inheritanceChain: Object.freeze(["technical-workshop-proof"]),
    cardFaces: Object.freeze(
      Object.fromEntries(
        CARD_IDS.map((cardId) => [
          cardId,
          Object.freeze({
            cardId,
            file: `source/${cardId}.png`,
            sourcePackageId: "technical-workshop-proof",
            transform: ART_SPEC_V1.defaultTransform,
            transformPackageId: null,
          }),
        ]),
      ),
    ),
    cardBack: Object.freeze({
      file: "source/card-back.png",
      sourcePackageId: "technical-workshop-proof",
    }),
    preview: null,
  });
}

describe("Phase 2E portable Workshop contracts", () => {
  it("ART2E-001 auto-matches canonical filenames and rejects ambiguous stems", () => {
    const match = autoAssignCanonicalFilenames([
      "drop/january-crane.png",
      "january-crane.webp",
      "august-moon.jpg",
      "notes.txt",
    ]);
    expect(match.assignments).toEqual([{ cardId: "august-moon", fileName: "august-moon.jpg" }]);
    expect(match.duplicates).toEqual(["january-crane"]);
    expect(match.ignored).toEqual(["notes.txt"]);
    expect(Object.isFrozen(match.assignments)).toBe(true);
  });

  it("ART2E-002 groups exactly 48 slots by canonical month with truthful statuses", () => {
    const sources: WorkshopSourceSummaryV1[] = CARD_IDS.map((cardId, index) =>
      Object.freeze({
        cardId,
        exists: index < 4,
        file: `source/${cardId}.png`,
        metadata: index < 4 ? Object.freeze({ format: "png", width: 1600, height: 2560 }) : null,
        sourcePackageId: "technical-workshop-proof",
      }),
    );
    const grid = createWorkshopGridV1({ issues: [], resolved: resolvedDraft(), sources });
    expect(grid.groups).toHaveLength(12);
    expect(grid.groups.every((group) => group.cards.length === 4)).toBe(true);
    expect(grid.groups.flatMap((group) => group.cards).map((card) => card.cardId)).toEqual(
      CARD_IDS,
    );
    expect(grid.statusCounts).toEqual({
      "complete-auto": 4,
      "complete-manual": 0,
      inherited: 0,
      warning: 0,
      missing: 44,
      invalid: 0,
    });
  });

  it("ART2E-003 edits normalized transforms immutably and resolution-independently", () => {
    const auto = updateAutoFocus(ART_SPEC_V1.defaultTransform, 0.27, 0.81);
    const manual = createManualTransformFromAuto({ width: 1800, height: 2400 }, auto);
    const moved = moveManualTransform(manual, 0.03, -0.02);
    const adjusted = updateManualTransform(moved, { zoom: 1.7, rotationDeg: 8.25 });
    expect(auto).toEqual({ mode: "auto", fit: "cover", focusX: 0.27, focusY: 0.81 });
    expect(adjusted.zoom).toBe(1.7);
    expect(adjusted.rotationDeg).toBe(8.25);
    expect(manual).not.toBe(moved);
    expect(Object.isFrozen(adjusted.crop)).toBe(true);
    const manifest = withTransformOverride(
      { formatVersion: 1, packageId: "technical-workshop-proof", cards: {} },
      "january-crane",
      adjusted,
    );
    expect(manifest.cards["january-crane"]).toEqual(adjusted);
    expect(withTransformOverride(manifest, "january-crane", null).cards).toEqual({});

    const rotated = createPostRotationCoverPlanV1(
      { width: 1000, height: 1600 },
      { width: 640, height: 1024 },
      10,
    );
    expect(rotated.destination.width).toBeGreaterThanOrEqual(640);
    expect(rotated.destination.height).toBeGreaterThanOrEqual(1024);
    expect(rotated.scale).toBeGreaterThan(0);
  });

  it("ART2E-004 locks canonical art-review and 390x844 gameplay sheet geometry", () => {
    const art = createContactSheetPlanV1("art-review");
    const gameplay = createContactSheetPlanV1("gameplay-390x844");
    expect({ width: art.width, height: art.height, slots: art.slots.length }).toEqual({
      width: 968,
      height: 4516,
      slots: 48,
    });
    expect({ width: gameplay.width, height: gameplay.height, card: gameplay.cardSize }).toEqual({
      width: 390,
      height: 1624,
      card: { width: 66, height: 106 },
    });
    expect(gameplay.slots.map((slot) => slot.cardId)).toEqual(CARD_IDS);
  });
});
