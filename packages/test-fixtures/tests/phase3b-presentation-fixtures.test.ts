import { describe, expect, it } from "vitest";

import {
  getPhase3BPresentationFixture,
  PHASE_3B_PRESENTATION_FIXTURE_IDS,
  PHASE_3B_PRESENTATION_FIXTURES,
} from "../src/rules/phase3b-presentation-fixtures";

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

describe("Phase 3B presentation fixture inventory", () => {
  it("exports the ten locked fixture IDs in order with no duplicates", () => {
    expect(PHASE_3B_PRESENTATION_FIXTURES.map((fixture) => fixture.id)).toEqual(
      PHASE_3B_PRESENTATION_FIXTURE_IDS,
    );
    expect(new Set(PHASE_3B_PRESENTATION_FIXTURE_IDS).size).toBe(10);
  });

  it("freezes every nested literal presentation contract", () => {
    expectDeepFrozen(PHASE_3B_PRESENTATION_FIXTURES);
    for (const fixture of PHASE_3B_PRESENTATION_FIXTURES) {
      expect(fixture.ruleRefs.length).toBeGreaterThan(0);
      expect(fixture.given.sourceFixtureIds.length).toBeGreaterThan(0);
    }
  });

  it("retrieves each exact literal contract by stable ID", () => {
    for (const fixture of PHASE_3B_PRESENTATION_FIXTURES) {
      expect(getPhase3BPresentationFixture(fixture.id)).toBe(fixture);
    }
    expect(getPhase3BPresentationFixture("PRES-KOI-003-PRIVILEGE-SPLIT").then).toEqual({
      kind: "privilegeSplit",
      visibleTableMultiplier: 1,
      bankScoringMultiplier: 2,
      basePoints: 10,
      awardedPoints: 20,
      bankLabel: "Bank 10 points × 2× = 20",
      koiKoiLabel: "Koi-Koi → 3×",
      koiKoiTableMultiplier: 3,
    });
  });
});
