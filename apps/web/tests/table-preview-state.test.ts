import { describe, expect, it } from "vitest";

import {
  advancePreviewTime,
  COORDINATE_SYSTEM,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
  TABLE_SCREEN_ID,
} from "../src/app/table-preview-state";
import { computeBoardLayout, inspectBoardLayout } from "../src/presentation/board/board-layout";
import { BOARD_LAYER_ORDER } from "../src/presentation/board/types";

describe("Phase 2A table diagnostics", () => {
  it("advances only by the requested deterministic duration", () => {
    expect(advancePreviewTime(125, 375)).toBe(500);
    expect(advancePreviewTime(0, 1000 / 60)).toBeCloseTo(16.667, 3);
    expect(() => advancePreviewTime(0, -1)).toThrow(RangeError);
    expect(() => advancePreviewTime(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("serializes the visible layout without card identity or gameplay state", () => {
    const layout = computeBoardLayout({ width: 390, height: 720 });
    const snapshot = createTablePreviewSnapshot({
      boardViewport: { width: 390, height: 720 },
      canvasCount: 1,
      diagnostics: inspectBoardLayout(layout),
      fullscreen: false,
      layout,
      ready: true,
      scene: {
        root: { label: "TableScene", token: "root-1" },
        layers: BOARD_LAYER_ORDER.map((label, index) => ({ label, token: `layer-${index + 2}` })),
      },
      simulationTimeMs: 500,
      viewport: { width: 390, height: 844 },
    });
    const serialized = serializeTablePreviewSnapshot(snapshot);
    const decoded = JSON.parse(serialized) as Record<string, unknown>;

    expect(decoded).toMatchObject({
      screen: TABLE_SCREEN_ID,
      ready: true,
      canvasCount: 1,
      viewport: { width: 390, height: 844 },
      boardViewport: { width: 390, height: 720 },
      fullscreen: false,
      simulationTimeMs: 500,
      coordinateSystem: COORDINATE_SYSTEM,
      layerOrder: BOARD_LAYER_ORDER,
      scene: {
        root: { label: "TableScene", token: "root-1" },
      },
      layout: {
        mode: "portrait",
        cardZoneCount: 14,
        fieldSlotCount: 8,
      },
      placeholderCounts: { opponentHand: 8, fieldSlots: 8, playerHand: 8 },
      diagnostics: { clippedZones: [], invalidZones: [], overlapViolations: [] },
    });
    expect(serialized).not.toContain("cardId");
    expect(serialized).not.toContain("drawPileOrdered");
    expect(serialized).not.toContain("commandId");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.layout)).toBe(true);
    expect(Object.isFrozen(snapshot.placeholderCounts)).toBe(true);
  });
});
