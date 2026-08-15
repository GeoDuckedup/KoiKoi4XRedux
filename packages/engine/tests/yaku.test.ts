import { describe, expect, it } from "vitest";

import { deriveYakuContributingCardIds, evaluateYaku, hasValidYakuSeenHistory } from "../src";

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

  it("derives canonical contribution cards for every ordinary yaku", () => {
    const captured = [
      "january-crane",
      "january-red-text-scroll",
      "january-pine-plain-a",
      "january-pine-plain-b",
      "february-bush-warbler",
      "february-red-text-scroll",
      "february-plum-plain-a",
      "february-plum-plain-b",
      "march-curtain",
      "march-red-text-scroll",
      "march-cherry-plain-a",
      "march-cherry-plain-b",
      "april-cuckoo",
      "april-red-scroll",
      "april-wisteria-plain-a",
      "april-wisteria-plain-b",
      "may-bridge",
      "may-red-scroll",
      "may-iris-plain-a",
      "may-iris-plain-b",
      "june-butterfly",
      "june-blue-scroll",
      "june-peony-plain-a",
      "june-peony-plain-b",
      "july-boar",
      "august-moon",
      "september-sake-cup",
      "september-blue-scroll",
      "october-deer",
      "october-blue-scroll",
      "november-rain",
      "december-phoenix",
    ] as const;
    expect(deriveYakuContributingCardIds("fiveBrights", captured, 1)).toEqual([
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
      "december-phoenix",
    ]);
    const fourBrights = [
      "january-crane",
      "march-curtain",
      "august-moon",
      "december-phoenix",
    ] as const;
    const fourBrightsWithRain = [
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
    ] as const;
    const threeBrights = ["january-crane", "march-curtain", "august-moon"] as const;
    expect(deriveYakuContributingCardIds("fourBrights", fourBrights, 1)).toEqual([
      "january-crane",
      "march-curtain",
      "august-moon",
      "december-phoenix",
    ]);
    expect(deriveYakuContributingCardIds("fourBrightsWithRain", fourBrightsWithRain, 1)).toEqual(
      fourBrightsWithRain,
    );
    expect(deriveYakuContributingCardIds("threeBrights", threeBrights, 1)).toEqual(threeBrights);
    expect(deriveYakuContributingCardIds("blossomViewing", captured, 1)).toEqual([
      "march-curtain",
      "september-sake-cup",
    ]);
    expect(deriveYakuContributingCardIds("moonViewing", captured, 1)).toEqual([
      "august-moon",
      "september-sake-cup",
    ]);
    expect(deriveYakuContributingCardIds("animalTrio", captured, 1)).toEqual([
      "june-butterfly",
      "july-boar",
      "october-deer",
    ]);
    expect(deriveYakuContributingCardIds("redTextScrolls", captured, 1)).toEqual([
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ]);
    expect(deriveYakuContributingCardIds("blueScrolls", captured, 1)).toEqual([
      "june-blue-scroll",
      "september-blue-scroll",
      "october-blue-scroll",
    ]);
    expect(deriveYakuContributingCardIds("currentMonthSet", captured, 1)).toEqual([
      "january-crane",
      "january-red-text-scroll",
      "january-pine-plain-a",
      "january-pine-plain-b",
    ]);
    expect(deriveYakuContributingCardIds("animals", captured, 1)).toEqual([
      "february-bush-warbler",
      "april-cuckoo",
      "may-bridge",
      "june-butterfly",
      "july-boar",
      "september-sake-cup",
      "october-deer",
    ]);
    expect(deriveYakuContributingCardIds("scrolls", captured, 1)).toHaveLength(8);
    expect(deriveYakuContributingCardIds("plainCards", captured, 1)).toHaveLength(12);
  });
});
