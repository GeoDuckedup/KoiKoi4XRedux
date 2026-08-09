import { evaluateYaku } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { PHASE_1C_YAKU_FIXTURE_IDS, PHASE_1C_YAKU_FIXTURES } from "../src/rules/yaku-fixtures";

describe("Phase 1C locked yaku vectors", () => {
  it("exports every fixed, hierarchy, increment, stacking, and trigger vector exactly once", () => {
    expect(PHASE_1C_YAKU_FIXTURES.map((fixture) => fixture.id)).toEqual(PHASE_1C_YAKU_FIXTURE_IDS);
    expect(new Set(PHASE_1C_YAKU_FIXTURE_IDS).size).toBe(PHASE_1C_YAKU_FIXTURE_IDS.length);
  });

  it.each(PHASE_1C_YAKU_FIXTURES)("$id evaluates its literal expected result", (fixture) => {
    const before = JSON.stringify(fixture.capturedCardIds);
    const evaluation = evaluateYaku(
      fixture.capturedCardIds,
      fixture.scheduledMonth,
      fixture.seenYakuKeys,
    );
    expect(evaluation.activeYaku, fixture.id).toEqual(fixture.expectedActiveYaku);
    expect(evaluation.currentYakuTotal, fixture.id).toBe(fixture.expectedCurrentYakuTotal);
    expect(
      evaluation.newYaku.map((entry) => entry.key),
      fixture.id,
    ).toEqual(fixture.expectedNewYakuKeys);
    expect(evaluation.categoryCounts, fixture.id).toEqual(fixture.expectedCategoryCounts);
    for (const absentKey of fixture.absentYakuKeys) {
      expect(
        evaluation.activeYaku.some((entry) => entry.key === absentKey),
        `${fixture.id}: ${absentKey} must be absent`,
      ).toBe(false);
    }
    expect(JSON.stringify(fixture.capturedCardIds), fixture.id).toBe(before);
    expect(Object.isFrozen(evaluation), fixture.id).toBe(true);
    expect(Object.isFrozen(evaluation.activeYaku), fixture.id).toBe(true);
    expect(Object.isFrozen(evaluation.newYaku), fixture.id).toBe(true);
    expect(Object.isFrozen(fixture.expectedActiveYaku), fixture.id).toBe(true);
  });
});
