import { describe, expect, it } from "vitest";

import { evaluateYaku, hasValidYakuSeenHistory } from "../src";

describe("Phase 1C pure yaku evaluator", () => {
  it("is deterministic and rejects malformed capture or trigger inputs", () => {
    const captures = ["january-crane", "march-curtain", "august-moon"] as const;
    expect(JSON.stringify(evaluateYaku(captures, 1))).toBe(
      JSON.stringify(evaluateYaku(captures, 1)),
    );
    expect(() => evaluateYaku(["unknown-card"] as unknown as typeof captures, 1)).toThrow(
      "YAKU_CAPTURE_INVALID",
    );
    expect(() => evaluateYaku([captures[0], captures[0]], 1)).toThrow("YAKU_CAPTURE_INVALID");
    expect(() =>
      evaluateYaku(captures, 1, ["unknown-key"] as unknown as readonly "threeBrights"[]),
    ).toThrow("YAKU_SEEN_KEYS_INVALID");
    expect(() => evaluateYaku(captures, 1, ["threeBrights", "threeBrights"])).toThrow(
      "YAKU_SEEN_KEYS_INVALID",
    );
    expect(() => evaluateYaku(captures, 13 as 1)).toThrow("YAKU_MONTH_INVALID");
  });

  it("keeps an upgraded lower Bright trigger seen while only scoring the active tier", () => {
    const evaluation = evaluateYaku(
      ["january-crane", "march-curtain", "august-moon", "november-rain"],
      1,
      ["threeBrights"],
    );
    expect(evaluation.activeYaku).toEqual([
      { key: "fourBrightsWithRain", name: "Four Brights with Rain", points: 7 },
    ]);
    expect(evaluation.newYaku.map((entry) => entry.key)).toEqual(["fourBrightsWithRain"]);
  });

  it("accepts possible Bright history and rejects fabricated seen-trigger evidence", () => {
    const fiveBrights = [
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
      "december-phoenix",
    ] as const;
    expect(
      hasValidYakuSeenHistory(fiveBrights, 1, [
        "threeBrights",
        "fourBrightsWithRain",
        "fiveBrights",
      ]),
    ).toBe(true);
    expect(
      hasValidYakuSeenHistory(fiveBrights, 1, [
        "threeBrights",
        "fourBrights",
        "fourBrightsWithRain",
        "fiveBrights",
      ]),
    ).toBe(false);
    expect(
      hasValidYakuSeenHistory(
        ["january-crane", "march-curtain", "august-moon", "december-phoenix"],
        1,
        ["fourBrights"],
      ),
    ).toBe(false);
    for (const fakeKey of ["animals", "scrolls", "currentMonthSet"] as const) {
      expect(hasValidYakuSeenHistory(["march-curtain"], 1, [fakeKey])).toBe(false);
    }
  });
});
