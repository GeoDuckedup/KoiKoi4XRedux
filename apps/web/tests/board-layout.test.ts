import { describe, expect, it } from "vitest";

import { computeBoardLayout, inspectBoardLayout } from "../src/presentation/board/board-layout";
import { BOARD_LAYER_ORDER, CARD_ZONES } from "../src/presentation/board/types";

const layoutVectors = [
  {
    id: "LAYOUT-001",
    viewport: { width: 320, height: 568 },
    then: {
      mode: "compactPortrait",
      layoutFingerprint: "5ebad1b9",
    },
  },
  {
    id: "LAYOUT-002",
    viewport: { width: 360, height: 640 },
    then: {
      mode: "compactPortrait",
      layoutFingerprint: "bcd00888",
    },
  },
  {
    id: "LAYOUT-003",
    viewport: { width: 390, height: 844 },
    then: {
      mode: "portrait",
      layoutFingerprint: "31017911",
    },
  },
  {
    id: "LAYOUT-004",
    viewport: { width: 768, height: 1024 },
    then: {
      mode: "portrait",
      layoutFingerprint: "dcd60fbf",
    },
  },
  {
    id: "LAYOUT-005",
    viewport: { width: 1366, height: 768 },
    then: {
      mode: "desktop",
      layoutFingerprint: "8d23e787",
    },
  },
  {
    id: "LAYOUT-006",
    viewport: { width: 1920, height: 1080 },
    then: {
      mode: "desktop",
      layoutFingerprint: "fab74c74",
    },
  },
  {
    id: "LAYOUT-007",
    viewport: { width: 844, height: 390 },
    then: {
      mode: "landscape",
      layoutFingerprint: "99c62c16",
    },
  },
] as const;

function hashCompleteLayout(layout: ReturnType<typeof computeBoardLayout>): string {
  let hash = 0x811c9dc5;
  const serialized = JSON.stringify(layout);
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

describe("Phase 2A responsive board layout", () => {
  it.each(layoutVectors)(
    "$id matches its literal complete-geometry fingerprint",
    ({ viewport, then }) => {
      const first = computeBoardLayout(viewport);
      const second = computeBoardLayout(viewport);

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(first.mode).toBe(then.mode);
      expect(hashCompleteLayout(first)).toBe(then.layoutFingerprint);
      expect(first.layerOrder).toEqual(BOARD_LAYER_ORDER);
      expect(Object.keys(first.cardZones)).toEqual(CARD_ZONES);
      expect(first.slots.field).toHaveLength(8);
      expect(first.slots.opponentHand).toHaveLength(8);
      expect(first.slots.playerHand).toHaveLength(8);
      expect(inspectBoardLayout(first)).toEqual({
        clippedZones: [],
        invalidZones: [],
        overlapViolations: [],
      });
    },
  );

  it("keeps every 5:8 field silhouette inside the field zone", () => {
    const layout = computeBoardLayout({ width: 390, height: 844 });
    for (const slot of layout.slots.field) {
      expect(slot.width / slot.height).toBeCloseTo(5 / 8, 3);
      expect(slot.x).toBeGreaterThanOrEqual(layout.cardZones.field.x);
      expect(slot.y).toBeGreaterThanOrEqual(layout.cardZones.field.y);
      expect(slot.x + slot.width).toBeLessThanOrEqual(
        layout.cardZones.field.x + layout.cardZones.field.width + 0.002,
      );
      expect(slot.y + slot.height).toBeLessThanOrEqual(
        layout.cardZones.field.y + layout.cardZones.field.height + 0.002,
      );
    }
  });

  it("keeps portrait and desktop hierarchy owned by the layout service", () => {
    const portrait = computeBoardLayout({ width: 390, height: 844 });
    expect(portrait.uiZones.opponentIdentity.y).toBeLessThan(portrait.cardZones.opponentHand.y);
    expect(portrait.cardZones.opponentHand.y).toBeLessThan(portrait.cardZones.opponentBrights.y);
    expect(portrait.cardZones.opponentBrights.y).toBeLessThan(portrait.uiZones.roundStatus.y);
    expect(portrait.uiZones.roundStatus.y).toBeLessThan(portrait.cardZones.field.y);
    expect(portrait.cardZones.field.y).toBeLessThan(portrait.cardZones.playerBrights.y);
    expect(portrait.cardZones.playerBrights.y).toBeLessThan(portrait.cardZones.playerHand.y);
    expect(
      portrait.cardZones.playerHand.y + portrait.cardZones.playerHand.height,
    ).toBeLessThanOrEqual(portrait.safeBounds.y + portrait.safeBounds.height);

    const desktop = computeBoardLayout({ width: 1366, height: 768 });
    expect(desktop.cardZones.opponentHand.y).toBeLessThan(desktop.cardZones.field.y);
    expect(desktop.cardZones.field.y).toBeLessThan(desktop.cardZones.playerHand.y);
    expect(desktop.cardZones.opponentBrights.x).toBeLessThan(desktop.cardZones.field.x);
    expect(desktop.cardZones.field.x).toBeLessThan(desktop.cardZones.playerBrights.x);
    expect(desktop.cardZones.drawPile.x).toBeGreaterThan(desktop.cardZones.field.x);
  });

  it.each([
    { viewport: { width: 320, height: 568 }, minimumHeight: 88 },
    { viewport: { width: 390, height: 844 }, minimumHeight: 118 },
    { viewport: { width: 844, height: 390 }, minimumHeight: 67 },
    { viewport: { width: 1366, height: 768 }, minimumHeight: 100 },
  ])(
    "gives the player hand the reclaimed action-bar space at $viewport",
    ({ viewport, minimumHeight }) => {
      const layout = computeBoardLayout(viewport);
      const first = layout.slots.playerHand[0];
      expect(first).toBeDefined();
      if (!first) throw new Error("Player hand layout is missing its first card slot.");
      expect(first.height).toBeGreaterThanOrEqual(minimumHeight);
      expect(first.width / first.height).toBeCloseTo(5 / 8, 3);
    },
  );

  it("rejects unusable or non-finite viewports", () => {
    expect(() => computeBoardLayout({ width: 239, height: 844 })).toThrow(RangeError);
    expect(() => computeBoardLayout({ width: 240, height: 240 })).toThrow(RangeError);
    expect(() => computeBoardLayout({ width: 390, height: Number.NaN })).toThrow(RangeError);
    expect(inspectBoardLayout(computeBoardLayout({ width: 240, height: 420 }))).toEqual({
      clippedZones: [],
      invalidZones: [],
      overlapViolations: [],
    });
  });

  it("runtime-freezes shared order contracts and returned geometry", () => {
    const layout = computeBoardLayout({ width: 390, height: 844 });
    expect(Object.isFrozen(BOARD_LAYER_ORDER)).toBe(true);
    expect(Object.isFrozen(CARD_ZONES)).toBe(true);
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.cardZones)).toBe(true);
    expect(() => {
      (BOARD_LAYER_ORDER as unknown as string[]).push("HostileLayer");
    }).toThrow(TypeError);
    expect(computeBoardLayout({ width: 390, height: 844 }).layerOrder).toEqual(BOARD_LAYER_ORDER);
  });
});
