import { CARD_IDS, type CardId, type PublicGameEventV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { computeAnimatedCardPlacements } from "../src/presentation/animation/card-animation-frame";
import { planPublicEvents } from "../src/presentation/animation/event-planner";
import { createPresentationProjection } from "../src/presentation/animation/projection";
import type { PresentationBoardProjection } from "../src/presentation/animation/types";
import {
  MAX_PLAYABLE_FIELD_CARD_COUNT,
  computeAdaptiveFieldLayout,
} from "../src/presentation/board/adaptive-field-layout";
import { computeBoardLayout } from "../src/presentation/board/board-layout";
import type { BoardRect } from "../src/presentation/board/types";
import { computeCardPlacements } from "../src/presentation/cards/card-layout";
import { CARD_SHOWCASE_ASSIGNMENTS } from "../src/presentation/cards/showcase";
import type { CardPresentationState } from "../src/presentation/cards/types";
import { computeCardHitAreas } from "../src/presentation/input/hit-areas";

const VIEWPORTS = Object.freeze([
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const);

function projectionWithFieldCount(count: number): PresentationBoardProjection {
  const fieldIds = new Set(CARD_IDS.slice(0, count));
  const counters = new Map<string, number>();
  return createPresentationProjection(
    CARD_SHOWCASE_ASSIGNMENTS.map((state): CardPresentationState => {
      const zone = fieldIds.has(state.cardId)
        ? ("field" as const)
        : state.zone === "field"
          ? ("drawPile" as const)
          : state.zone;
      const slotIndex = counters.get(zone) ?? 0;
      counters.set(zone, slotIndex + 1);
      return Object.freeze({
        ...state,
        zone,
        faceUp: zone === "field" ? true : zone === "drawPile" ? false : state.faceUp,
        slotId: `${zone}:${slotIndex}`,
        slotIndex,
        zIndex: slotIndex,
      });
    }),
  );
}

function contained(outer: BoardRect, inner: BoardRect): boolean {
  const epsilon = 0.002;
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

function overlaps(first: BoardRect, second: BoardRect): boolean {
  const epsilon = 0.002;
  return (
    first.x < second.x + second.width - epsilon &&
    first.x + first.width > second.x + epsilon &&
    first.y < second.y + second.height - epsilon &&
    first.y + first.height > second.y + epsilon
  );
}

function placementFor(
  placements: ReturnType<typeof computeCardPlacements>,
  cardId: CardId,
): BoardRect {
  const placement = placements.find((candidate) => candidate.cardId === cardId);
  if (!placement) throw new Error(`Missing placement for ${cardId}.`);
  return placement.bounds;
}

describe("Phase 3D-D adaptive dense field", () => {
  it.each([
    ["TABLE-DENSITY-001-BASE-EIGHT", 8],
    ["TABLE-DENSITY-002-NINE", 9],
    ["TABLE-DENSITY-003-TWELVE", 12],
    ["TABLE-DENSITY-004-LEGAL-SEVENTEEN", 17],
  ] as const)("%s produces deterministic contained non-overlapping grids", (_id, count) => {
    for (const viewport of VIEWPORTS) {
      const layout = computeBoardLayout(viewport);
      const first = computeAdaptiveFieldLayout(layout, count);
      const second = computeAdaptiveFieldLayout(layout, count);
      const expectedSlotCount = count <= 8 ? 8 : count;
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(first.slots).toHaveLength(expectedSlotCount);
      expect(first.columns * first.rows).toBeGreaterThanOrEqual(expectedSlotCount);
      expect(first.cardMetrics.width / first.cardMetrics.height).toBeCloseTo(5 / 8, 3);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.slots)).toBe(true);
      for (const [index, slot] of first.slots.entries()) {
        expect(
          contained(layout.cardZones.field, slot),
          `${viewport.width}×${viewport.height}`,
        ).toBe(true);
        for (const other of first.slots.slice(index + 1)) expect(overlaps(slot, other)).toBe(false);
      }
    }
  });

  it("TABLE-DENSITY-005-REFLOW separates direct travel from density reflow", () => {
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const before = projectionWithFieldCount(8);
    const addedCardId = CARD_IDS[8];
    if (!addedCardId) throw new Error("Missing ninth canonical card.");
    const transit = createPresentationProjection(
      before.map((state) =>
        state.cardId === addedCardId
          ? Object.freeze({
              ...state,
              zone: "transit" as const,
              faceUp: true,
              slotId: `transit:${addedCardId}`,
              slotIndex: 0,
              zIndex: 1000,
            })
          : state,
      ),
    );
    const after = projectionWithFieldCount(9);
    const event: PublicGameEventV1 = {
      type: "cardPlacedOnField",
      actorId: "player-a",
      phase: "hand",
      cardId: addedCardId,
    };
    const plan = planPublicEvents([event], { projections: [transit, after] });
    const [travel, reflow] = plan.clips;
    if (!travel || !reflow) throw new Error("Missing density transition clips.");
    expect(plan.clips.map(({ kind, settlesProjection }) => ({ kind, settlesProjection }))).toEqual([
      { kind: "travel", settlesProjection: false },
      { kind: "reflow", settlesProjection: true },
    ]);

    const existingCardId = CARD_IDS[0];
    if (!existingCardId) throw new Error("Missing first canonical card.");
    const beforePlacements = computeCardPlacements(layout, transit);
    const afterPlacements = computeCardPlacements(layout, after);
    const travelEnd = computeAnimatedCardPlacements(layout, travel, 1, "normal");
    const reflowMiddle = computeAnimatedCardPlacements(layout, reflow, 0.5, "normal");
    expect(placementFor(travelEnd, existingCardId)).toEqual(
      placementFor(beforePlacements, existingCardId),
    );
    expect(placementFor(travelEnd, addedCardId)).toEqual(
      placementFor(afterPlacements, addedCardId),
    );
    expect(placementFor(reflowMiddle, existingCardId)).not.toEqual(
      placementFor(beforePlacements, existingCardId),
    );
    expect(placementFor(reflowMiddle, existingCardId)).not.toEqual(
      placementFor(afterPlacements, existingCardId),
    );

    const twelve = projectionWithFieldCount(12);
    const transitCardId = CARD_IDS[12];
    const capturedFieldCardId = CARD_IDS[11];
    if (!transitCardId || !capturedFieldCardId) throw new Error("Missing capture-boundary cards.");
    const captureBefore = createPresentationProjection(
      twelve.map((state) =>
        state.cardId === transitCardId
          ? Object.freeze({
              ...state,
              zone: "transit" as const,
              faceUp: true,
              slotId: `transit:${transitCardId}`,
              slotIndex: 0,
            })
          : state,
      ),
    );
    const captureAfter = createPresentationProjection(
      captureBefore.map((state) =>
        state.cardId === transitCardId || state.cardId === capturedFieldCardId
          ? Object.freeze({
              ...state,
              zone: "playerAnimals" as const,
              faceUp: true,
              slotId: `playerAnimals:${state.cardId}`,
              slotIndex: state.cardId === transitCardId ? 0 : 1,
            })
          : state,
      ),
    );
    const captureEvent: PublicGameEventV1 = {
      type: "cardsCaptured",
      actorId: "player-a",
      phase: "hand",
      cardIds: [transitCardId, capturedFieldCardId],
      captureKind: "pair",
    };
    const capturePlan = planPublicEvents([captureEvent], {
      projections: [captureBefore, captureAfter],
    });
    const [capture, captureReflow] = capturePlan.clips;
    if (!capture || !captureReflow) throw new Error("Missing capture density clips.");
    const reflowingCardId = CARD_IDS[10];
    if (!reflowingCardId) throw new Error("Missing capture reflow card.");
    expect(
      capturePlan.clips.map(({ kind, settlesProjection }) => ({ kind, settlesProjection })),
    ).toEqual([
      { kind: "capture", settlesProjection: false },
      { kind: "reflow", settlesProjection: true },
    ]);
    const captureEnd = computeAnimatedCardPlacements(layout, capture, 1, "normal");
    const captureReflowMiddle = computeAnimatedCardPlacements(layout, captureReflow, 0.5, "normal");
    expect(placementFor(captureEnd, reflowingCardId)).toEqual(
      placementFor(computeCardPlacements(layout, captureBefore), reflowingCardId),
    );
    expect(placementFor(captureReflowMiddle, reflowingCardId)).not.toEqual(
      placementFor(captureEnd, reflowingCardId),
    );
  });

  it("TABLE-DENSITY-006-TARGETS keeps all dense target territories distinct and ordered", () => {
    const projection = projectionWithFieldCount(17);
    const legalTargetCardIds = CARD_IDS.slice(0, 17);
    for (const viewport of VIEWPORTS) {
      const targets = computeCardHitAreas({
        layout: computeBoardLayout(viewport),
        projection,
        selectableCardIds: [],
        legalTargetCardIds,
      });
      expect(targets.map(({ cardId }) => cardId)).toEqual(legalTargetCardIds);
      for (const [index, target] of targets.entries()) {
        expect(target.bounds.width, `${viewport.width}×${viewport.height}`).toBeGreaterThanOrEqual(
          24,
        );
        expect(target.bounds.height).toBeGreaterThanOrEqual(36);
        for (const other of targets.slice(index + 1))
          expect(overlaps(target.bounds, other.bounds)).toBe(false);
      }
    }
  });

  it("TABLE-DENSITY-007-RESIZE recomputes geometry without changing field order", () => {
    const projection = projectionWithFieldCount(17);
    const mobile = computeCardPlacements(
      computeBoardLayout({ width: 320, height: 568 }),
      projection,
    ).filter(({ zone }) => zone === "field");
    const desktop = computeCardPlacements(
      computeBoardLayout({ width: 1366, height: 768 }),
      projection,
    ).filter(({ zone }) => zone === "field");
    expect(mobile.map(({ cardId }) => cardId)).toEqual(desktop.map(({ cardId }) => cardId));
    expect(mobile.map(({ bounds }) => bounds)).not.toEqual(desktop.map(({ bounds }) => bounds));
  });

  it("TABLE-DENSITY-008-BOUND fails closed outside the locked legal field bound", () => {
    const layout = computeBoardLayout({ width: 390, height: 844 });
    expect(MAX_PLAYABLE_FIELD_CARD_COUNT).toBe(17);
    expect(() => computeAdaptiveFieldLayout(layout, -1)).toThrow(RangeError);
    expect(() => computeAdaptiveFieldLayout(layout, 17.5)).toThrow(RangeError);
    expect(() => computeAdaptiveFieldLayout(layout, 18)).toThrow(/legal 17-card bound/);
  });
});
