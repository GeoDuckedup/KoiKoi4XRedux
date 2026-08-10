import { describe, expect, it } from "vitest";

import {
  advancePreviewTime,
  COORDINATE_SYSTEM,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
  TABLE_PRESENTATION_MODE,
  TABLE_SCREEN_ID,
} from "../src/app/table-preview-state";
import { computeBoardLayout, inspectBoardLayout } from "../src/presentation/board/board-layout";
import { BOARD_LAYER_ORDER, CARD_ZONES } from "../src/presentation/board/types";
import { computeCardPlacements } from "../src/presentation/cards/card-layout";
import { CARD_SHOWCASE_ASSIGNMENTS } from "../src/presentation/cards/showcase";

describe("Phase 2B table diagnostics", () => {
  it("advances only by the requested deterministic duration", () => {
    expect(advancePreviewTime(125, 375)).toBe(500);
    expect(advancePreviewTime(0, 1000 / 60)).toBeCloseTo(16.667, 3);
    expect(() => advancePreviewTime(0, -1)).toThrow(RangeError);
    expect(() => advancePreviewTime(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("serializes visible CardView identity without texture URLs or gameplay state", () => {
    const layout = computeBoardLayout({ width: 390, height: 720 });
    const placements = computeCardPlacements(layout, CARD_SHOWCASE_ASSIGNMENTS);
    const zoneCounts = Object.fromEntries(CARD_ZONES.map((zone) => [zone, 0])) as Record<
      (typeof CARD_ZONES)[number],
      number
    >;
    for (const placement of placements) zoneCounts[placement.zone] += 1;
    const snapshot = createTablePreviewSnapshot({
      animation: {
        status: "completed",
        mode: "normal",
        planId: null,
        activeClip: null,
        queuedPlanCount: 0,
        queuedClipCount: 0,
        speedMultiplier: 1,
        lastCompletion: "completed",
        displayFingerprint: "projection-v1:test",
        targetFingerprint: "projection-v1:test",
      },
      boardViewport: { width: 390, height: 720 },
      canvasCount: 1,
      diagnostics: inspectBoardLayout(layout),
      fullscreen: false,
      input: {
        status: "idle",
        confirmationMode: "guided",
        lockReason: null,
        selectedCardId: null,
        selectableCardIds: ["march-curtain"],
        legalTargetCardIds: [],
        decisionChoices: [],
        confirmAvailable: false,
        cancelAvailable: false,
        focusedCardId: "march-curtain",
        matchId: "technical-input-fixture",
        observationStateVersion: 3,
        lastIntentType: null,
        emittedIntentCount: 0,
      },
      semanticControlCount: 8,
      localRound: {
        viewerId: "player-a",
        activePlayerId: "player-a",
        stateVersion: 3,
        phase: "awaitingHandPlay",
        roundNumber: 1,
        scheduledMonth: 1,
        handoffPending: false,
        recapCount: 1,
        latestRecap: "Round ready. Player A begins.",
        commandCount: 0,
      },
      layout,
      ready: true,
      deck: {
        activeDeckId: "technical-sunrise",
        approvalStatus: "technical-placeholder",
        availableDeckIds: ["technical-sunrise", "technical-moonlight"],
        status: "ready",
      },
      scene: {
        root: { label: "TableScene", token: "root-1" },
        layers: BOARD_LAYER_ORDER.map((label, index) => ({ label, token: `layer-${index + 2}` })),
        cards: {
          activeDeckId: "technical-sunrise",
          cardViewCount: 48,
          uniqueCardIdCount: 48,
          views: placements.map((placement, index) => ({
            cardId: placement.cardId,
            token: `card-view-${index + 1}`,
            zone: placement.zone,
            slotId: placement.slotId,
            layer: placement.layer,
            faceUp: placement.faceUp,
            textureBinding: `technical-sunrise:${placement.faceUp ? placement.cardId : "card-back"}`,
          })),
          zoneCounts,
        },
      },
      simulationTimeMs: 500,
      viewport: { width: 390, height: 844 },
    });
    const serialized = serializeTablePreviewSnapshot(snapshot);
    const decoded = JSON.parse(serialized) as Record<string, unknown>;

    expect(decoded).toMatchObject({
      screen: TABLE_SCREEN_ID,
      presentationMode: TABLE_PRESENTATION_MODE,
      ready: true,
      canvasCount: 1,
      viewport: { width: 390, height: 844 },
      boardViewport: { width: 390, height: 720 },
      fullscreen: false,
      input: {
        status: "idle",
        confirmationMode: "guided",
        semanticControlCount: 8,
        intentExecution: "executedLocally",
      },
      localRound: {
        viewerId: "player-a",
        stateVersion: 3,
        phase: "awaitingHandPlay",
        handoffPending: false,
      },
      simulationTimeMs: 500,
      animation: {
        status: "completed",
        mode: "normal",
        transitCardCount: 0,
      },
      coordinateSystem: COORDINATE_SYSTEM,
      layerOrder: BOARD_LAYER_ORDER,
      scene: {
        root: { label: "TableScene", token: "root-1" },
      },
      deck: {
        activeDeckId: "technical-sunrise",
        approvalStatus: "technical-placeholder",
        availableDeckIds: ["technical-sunrise", "technical-moonlight"],
        status: "ready",
      },
      cards: {
        activeDeckId: "technical-sunrise",
        cardViewCount: 48,
        uniqueCardIdCount: 48,
        visibleViews: expect.any(Array),
      },
      layout: {
        mode: "portrait",
        cardZoneCount: 14,
        fieldSlotCount: 8,
      },
      diagnostics: { clippedZones: [], invalidZones: [], overlapViolations: [] },
    });
    expect(serialized).toContain("march-curtain");
    expect(serialized).not.toContain("january-crane");
    expect(serialized).not.toContain("cards/january-crane.svg");
    expect(serialized).not.toContain("drawPileOrdered");
    expect(serialized).not.toContain("commandId");
    expect(serialized).not.toContain("rng");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.layout)).toBe(true);
    expect(Object.isFrozen(snapshot.cards)).toBe(true);
    expect(Object.isFrozen(snapshot.cards.visibleViews)).toBe(true);
    expect(Object.isFrozen(snapshot.deck.availableDeckIds)).toBe(true);
  });

  it("fans legal field overflow over the stable eight field lanes", () => {
    const layout = computeBoardLayout({ width: 390, height: 565 });
    const overflowIds = ["august-pampas-plain-a", "august-pampas-plain-b"] as const;
    const overflowIdSet = new Set<string>(overflowIds);
    const projection = CARD_SHOWCASE_ASSIGNMENTS.map((state) => {
      const overflowIndex = overflowIds.indexOf(state.cardId as (typeof overflowIds)[number]);
      return overflowIndex < 0
        ? state
        : Object.freeze({
            ...state,
            zone: "field" as const,
            faceUp: true,
            slotIndex: 8 + overflowIndex,
            slotId: `field:${8 + overflowIndex}`,
          });
    });
    const placements = computeCardPlacements(layout, projection);
    const overflow = placements.filter(({ cardId }) => overflowIdSet.has(cardId));

    expect(overflow).toHaveLength(2);
    for (const placement of overflow) {
      expect(placement.bounds.x).toBeGreaterThanOrEqual(layout.cardZones.field.x);
      expect(placement.bounds.y).toBeGreaterThanOrEqual(layout.cardZones.field.y);
      expect(placement.bounds.x + placement.bounds.width).toBeLessThanOrEqual(
        layout.cardZones.field.x + layout.cardZones.field.width,
      );
      expect(placement.bounds.y + placement.bounds.height).toBeLessThanOrEqual(
        layout.cardZones.field.y + layout.cardZones.field.height,
      );
    }
  });
});
