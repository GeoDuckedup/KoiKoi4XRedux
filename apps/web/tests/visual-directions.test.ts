import { describe, expect, it } from "vitest";

import {
  findPhase3DVisualDirection,
  PHASE_3D_VISUAL_DIRECTIONS,
  PHASE_3D_VISUAL_DIRECTION_IDS,
} from "../src/presentation/theme/visual-directions";

describe("Phase 3D-A visual directions", () => {
  it("locks the three exact owner-review directions in deterministic order", () => {
    expect(PHASE_3D_VISUAL_DIRECTIONS.map(({ id }) => id)).toEqual(PHASE_3D_VISUAL_DIRECTION_IDS);
    expect(PHASE_3D_VISUAL_DIRECTION_IDS).toEqual([
      "ink-parchment",
      "moonlit-indigo",
      "warm-ivory",
    ]);
    expect(PHASE_3D_VISUAL_DIRECTIONS).toHaveLength(3);
    expect(new Set(PHASE_3D_VISUAL_DIRECTION_IDS).size).toBe(3);
  });

  it("deep-freezes every palette and keeps legal cues separate from escalation", () => {
    for (const direction of PHASE_3D_VISUAL_DIRECTIONS) {
      expect(Object.isFrozen(direction)).toBe(true);
      expect(Object.isFrozen(direction.css)).toBe(true);
      expect(Object.isFrozen(direction.table)).toBe(true);
      expect(direction.css.legal).not.toBe(direction.css.escalation);
      expect(direction.table.legal).not.toBe(direction.table.red);
      expect(direction.table.multiplier1).not.toBe(direction.table.multiplier4);
      for (const color of Object.values(direction.table)) {
        expect(Number.isInteger(color)).toBe(true);
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      }
    }
  });

  it("resolves only an explicit review build direction", () => {
    expect(findPhase3DVisualDirection(undefined)).toBeNull();
    expect(findPhase3DVisualDirection("")).toBeNull();
    expect(findPhase3DVisualDirection("ink-parchment")?.name).toBe("Ink, Parchment & Vermilion");
    expect(findPhase3DVisualDirection("warm-ivory")?.name).toBe("Warm Ivory & Slate Blue");
    expect(() => findPhase3DVisualDirection("unknown")).toThrow(
      "Unknown Phase 3D visual direction",
    );
  });
});
