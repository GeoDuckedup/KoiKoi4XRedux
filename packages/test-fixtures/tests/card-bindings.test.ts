import {
  CARD_CATALOG,
  getCardDefinition,
  isCardId,
  type CardId,
  type FixedYakuMembership,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  ALL_BRIGHT_IDS,
  ANIMAL_THRESHOLD_SEQUENCE_IDS,
  ANIMAL_TRIO_IDS,
  BLOSSOM_VIEWING_IDS,
  BLUE_SCROLL_IDS,
  MOON_VIEWING_IDS,
  NON_RAIN_BRIGHT_IDS,
  NONSCHEDULED_MONTH_SET_IDS,
  PHASE_0A_CARD_BINDINGS,
  PLAIN_THRESHOLD_SEQUENCE_IDS,
  RAIN_BRIGHT_ID,
  RED_TEXT_SCROLL_IDS,
  REGULAR_RED_SCROLL_IDS,
  SAKE_CUP_ID,
  SCHEDULED_MONTH_SET_IDS,
  SCROLL_SEVEN_013_IDS,
  SCROLL_THRESHOLD_SEQUENCE_IDS,
} from "../src/rules/card-bindings";

function idsWithMembership(membership: FixedYakuMembership): CardId[] {
  return CARD_CATALOG.filter((card) =>
    (card.fixedYakuMemberships as readonly FixedYakuMembership[]).includes(membership),
  ).map((card) => card.id);
}

describe("Phase 0A CardId bindings", () => {
  it("resolves every bound CardId against the canonical catalog", () => {
    const boundIds = Object.values(PHASE_0A_CARD_BINDINGS).flatMap((binding) =>
      typeof binding === "string" ? [binding] : binding,
    );
    expect(boundIds.every((id) => isCardId(id))).toBe(true);
  });

  it("binds Bright hierarchy and Rain exclusions exactly", () => {
    expect(ALL_BRIGHT_IDS).toEqual([
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
      "december-phoenix",
    ]);
    expect(
      CARD_CATALOG.filter((card) => card.category === "bright").map((card) => card.id),
    ).toEqual(ALL_BRIGHT_IDS);
    expect(NON_RAIN_BRIGHT_IDS).not.toContain(RAIN_BRIGHT_ID);
    expect(getCardDefinition(RAIN_BRIGHT_ID).flags).toContain("rainBright");
  });

  it("binds every named fixed-yaku set independently", () => {
    expect(BLOSSOM_VIEWING_IDS).toEqual(idsWithMembership("blossomViewing"));
    expect(MOON_VIEWING_IDS).toEqual(idsWithMembership("moonViewing"));
    expect(ANIMAL_TRIO_IDS).toEqual(idsWithMembership("animalTrio"));
    expect(RED_TEXT_SCROLL_IDS).toEqual(idsWithMembership("redTextScrolls"));
    expect(BLUE_SCROLL_IDS).toEqual(idsWithMembership("blueScrolls"));
    expect(getCardDefinition(SAKE_CUP_ID).category).toBe("animal");
  });

  it("locks deterministic vector subsets without defining Phase 1 scenarios", () => {
    expect(ANIMAL_THRESHOLD_SEQUENCE_IDS).toHaveLength(7);
    expect(SCROLL_THRESHOLD_SEQUENCE_IDS).toHaveLength(7);
    expect(PLAIN_THRESHOLD_SEQUENCE_IDS).toHaveLength(12);
    expect(SCROLL_SEVEN_013_IDS).toEqual([
      ...RED_TEXT_SCROLL_IDS,
      ...BLUE_SCROLL_IDS,
      "april-red-scroll",
    ]);
    expect(REGULAR_RED_SCROLL_IDS).toContain("april-red-scroll");
    expect(new Set(SCHEDULED_MONTH_SET_IDS.map((id) => getCardDefinition(id).month))).toEqual(
      new Set([1]),
    );
    expect(new Set(NONSCHEDULED_MONTH_SET_IDS.map((id) => getCardDefinition(id).month))).toEqual(
      new Set([2]),
    );
  });
});
