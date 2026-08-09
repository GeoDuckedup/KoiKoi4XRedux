import { inspectCapture, resolveCapture, type CardId } from "../src/index";
import { describe, expect, it } from "vitest";

const FIELD = [
  "january-pine-plain-a",
  "february-plum-plain-a",
  "january-red-text-scroll",
  "march-cherry-plain-a",
] as const satisfies readonly CardId[];

describe("Phase 1B capture primitives", () => {
  it("places a zero-match source at the end without mutating the field", () => {
    const before = [...FIELD];
    expect(resolveCapture(FIELD, "december-phoenix")).toEqual({
      kind: "placed",
      sourceCardId: "december-phoenix",
      field: [...FIELD, "december-phoenix"],
      capturedCardIds: [],
      matchingFieldCardIds: [],
    });
    expect(FIELD).toEqual(before);
  });

  it("captures a single matching target with source-first ordering", () => {
    expect(resolveCapture(FIELD, "february-bush-warbler")).toEqual({
      kind: "captured",
      sourceCardId: "february-bush-warbler",
      field: ["january-pine-plain-a", "january-red-text-scroll", "march-cherry-plain-a"],
      capturedCardIds: ["february-bush-warbler", "february-plum-plain-a"],
      matchingFieldCardIds: ["february-plum-plain-a"],
      captureKind: "pair",
    });
  });

  it("retains field order while exposing and resolving either two-match target", () => {
    expect(inspectCapture(FIELD, "january-crane")).toEqual({
      sourceCardId: "january-crane",
      matchingFieldCardIds: ["january-pine-plain-a", "january-red-text-scroll"],
      matchCount: 2,
    });
    expect(resolveCapture(FIELD, "january-crane")).toMatchObject({
      kind: "choiceRequired",
      matchingFieldCardIds: ["january-pine-plain-a", "january-red-text-scroll"],
    });
    expect(resolveCapture(FIELD, "january-crane", "january-red-text-scroll")).toMatchObject({
      kind: "captured",
      field: ["january-pine-plain-a", "february-plum-plain-a", "march-cherry-plain-a"],
      capturedCardIds: ["january-crane", "january-red-text-scroll"],
      captureKind: "pair",
    });
  });

  it("captures three field targets as one ordered four-card sweep", () => {
    const field = [
      "april-red-scroll",
      "january-pine-plain-a",
      "april-wisteria-plain-a",
      "april-wisteria-plain-b",
    ] as const satisfies readonly CardId[];
    expect(resolveCapture(field, "april-cuckoo")).toEqual({
      kind: "captured",
      sourceCardId: "april-cuckoo",
      field: ["january-pine-plain-a"],
      capturedCardIds: [
        "april-cuckoo",
        "april-red-scroll",
        "april-wisteria-plain-a",
        "april-wisteria-plain-b",
      ],
      matchingFieldCardIds: [
        "april-red-scroll",
        "april-wisteria-plain-a",
        "april-wisteria-plain-b",
      ],
      captureKind: "fourCardSweep",
    });
  });

  it("rejects missing, illegal, and unnecessary targets with stable codes", () => {
    expect(() => resolveCapture(FIELD, "january-crane", "march-cherry-plain-a")).toThrow(
      "CAPTURE_TARGET_ILLEGAL",
    );
    expect(() => resolveCapture(FIELD, "february-bush-warbler", "february-plum-plain-a")).toThrow(
      "CAPTURE_TARGET_NOT_ALLOWED",
    );
    expect(() => resolveCapture(FIELD, "december-phoenix", "january-pine-plain-a")).toThrow(
      "CAPTURE_TARGET_NOT_ALLOWED",
    );
  });
});
