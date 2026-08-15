import {
  CARD_CATALOG,
  evaluateYaku,
  getCardDefinition,
  getMonthDefinition,
  type CardId,
  YAKU_TRIGGER_KEYS,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createCardInspectionPresentation } from "../src/game/card-inspection";
import { getYakuGuideEntriesForCard } from "../src/game/yaku-guide";

describe("Phase 3F-G static card yaku reference", () => {
  it("scopes native selection and touch-callout suppression to table card controls", () => {
    const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
    const scopedStart = css.indexOf(".game-host,");
    const scopedEnd = css.indexOf("}", scopedStart);
    expect(scopedStart).toBeGreaterThanOrEqual(0);
    expect(scopedEnd).toBeGreaterThan(scopedStart);
    const scopedBlock = css.slice(scopedStart, scopedEnd);
    expect(scopedBlock).toContain("-webkit-user-select: none;");
    expect(scopedBlock).toContain("user-select: none;");
    expect(scopedBlock).toContain("-webkit-touch-callout: none;");

    for (const selector of ["card-inspector", "utility-dialog"]) {
      const start = css.indexOf(`.${selector} {`);
      const end = css.indexOf("}", start);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      const block = css.slice(start, end);
      expect(block).not.toMatch(
        /(?:-webkit-)?user-select\s*:\s*none|-webkit-touch-callout\s*:\s*none/u,
      );
    }
    expect(css).toMatch(
      /\.card-inspector \.utility-dialog__header\s*\{\s*background:\s*var\(--theme-surface\);\s*\}/u,
    );
  });

  it("maps every canonical card to frozen, ordered, evaluator-coherent qualifying examples", () => {
    for (const { id } of CARD_CATALOG) {
      const entries = getYakuGuideEntriesForCard(id);
      expect(Object.isFrozen(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.map(({ key }) => YAKU_TRIGGER_KEYS.indexOf(key))).toEqual(
        [...entries.map(({ key }) => YAKU_TRIGGER_KEYS.indexOf(key))].sort(
          (left, right) => left - right,
        ),
      );
      for (const entry of entries) {
        expect(Object.isFrozen(entry)).toBe(true);
        expect(Object.isFrozen(entry.exampleCardIds)).toBe(true);
        expect(entry.exampleCardIds).toContain(id);
        expect(
          evaluateYaku(entry.exampleCardIds, entry.scheduledMonth).activeYaku.some(
            ({ key }) => key === entry.key,
          ),
        ).toBe(true);
        if (entry.key === "currentMonthSet") {
          expect(entry.contributionCondition).toBe(
            `Contributes when ${getMonthDefinition(getCardDefinition(id).month).name} is the scheduled month.`,
          );
        }
      }
    }
  });

  it("keeps special-card and category eligibility canonical", () => {
    const keysFor = (cardId: CardId) => getYakuGuideEntriesForCard(cardId).map(({ key }) => key);
    expect(keysFor("september-sake-cup")).toEqual([
      "blossomViewing",
      "moonViewing",
      "currentMonthSet",
      "animals",
    ]);
    expect(keysFor("november-rain")).toEqual([
      "fiveBrights",
      "fourBrightsWithRain",
      "currentMonthSet",
    ]);
    expect(keysFor("december-phoenix")).toEqual([
      "fiveBrights",
      "fourBrights",
      "fourBrightsWithRain",
      "threeBrights",
      "currentMonthSet",
    ]);
    expect(keysFor("june-blue-scroll")).toEqual(["blueScrolls", "currentMonthSet", "scrolls"]);
    expect(keysFor("january-pine-plain-a")).toEqual(["currentMonthSet", "plainCards"]);
    expect(
      getYakuGuideEntriesForCard("september-sake-cup").find(({ key }) => key === "currentMonthSet"),
    ).toMatchObject({
      contributionCondition: "Contributes when September is the scheduled month.",
    });
  });

  it("keeps the inspector presentation static and free of live match data", () => {
    const presentation = createCardInspectionPresentation("september-sake-cup");
    expect(Object.isFrozen(presentation)).toBe(true);
    expect(Object.isFrozen(presentation.yakuEntries)).toBe(true);
    expect(presentation.yakuDisclosure).toEqual({
      ariaControls: "card-inspector-yaku-entries",
      ariaExpanded: false,
      label: "Yaku this card can contribute to (4)",
    });
    expect(Object.keys(presentation).sort()).toEqual([
      "month",
      "title",
      "yakuDisclosure",
      "yakuEntries",
    ]);
    expect(presentation).not.toHaveProperty("currentYaku");
    expect(presentation).not.toHaveProperty("score");
    expect(presentation).not.toHaveProperty("player");
    expect(presentation).not.toHaveProperty("result");
  });
});
// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
