import { describe, expect, it } from "vitest";

import {
  advanceBootTime,
  BOOT_SCREEN_ID,
  COORDINATE_SYSTEM,
  createBootSnapshot,
  serializeBootSnapshot,
} from "../src/app/boot-state";

describe("boot-state diagnostics", () => {
  it("advances only by the requested deterministic duration", () => {
    expect(advanceBootTime(125, 375)).toBe(500);
    expect(advanceBootTime(0, 1000 / 60)).toBeCloseTo(16.667, 3);
    expect(() => advanceBootTime(0, -1)).toThrow(RangeError);
    expect(() => advanceBootTime(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("serializes a stable, machine-readable boot snapshot", () => {
    const snapshot = createBootSnapshot({
      canvasCount: 1,
      fullscreen: false,
      ready: true,
      simulationTimeMs: 500,
      viewport: { width: 390, height: 844 },
    });

    expect(JSON.parse(serializeBootSnapshot(snapshot))).toEqual({
      screen: BOOT_SCREEN_ID,
      ready: true,
      canvasCount: 1,
      viewport: { width: 390, height: 844 },
      fullscreen: false,
      simulationTimeMs: 500,
      coordinateSystem: COORDINATE_SYSTEM,
    });
  });
});
