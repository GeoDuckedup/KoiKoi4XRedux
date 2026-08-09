import { describe, expect, it } from "vitest";

import { validateDeckApprovalV1 } from "../src/approval.ts";

const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const pilotCardIds = [
  "november-rain",
  "september-sake-cup",
  "december-phoenix",
  "january-pine-plain-a",
] as const;

function approval() {
  return {
    formatVersion: 1,
    packageId: "new-primary-deck",
    status: "approved",
    approvedBy: "Owner",
    approvedOn: "2026-08-09",
    artReviewSha256: digestA,
    gameplayReviewSha256: digestB,
    boardReview: {
      viewport: "390x844",
      cardIds: pilotCardIds,
      note: "Reviewed all four finished pilot roles on the primary board.",
    },
  };
}

describe("Phase 2E visual approval record", () => {
  it("ART2E-011 accepts only an explicit owner record bound to review digests and pilot IDs", () => {
    expect(
      validateDeckApprovalV1(approval(), {
        packageId: "new-primary-deck",
        artReviewSha256: digestA,
        gameplayReviewSha256: digestB,
        pilotCardIds,
      }),
    ).toEqual([]);
    expect(
      validateDeckApprovalV1(approval(), {
        packageId: "new-primary-deck",
        artReviewSha256: "c".repeat(64),
        gameplayReviewSha256: digestB,
        pilotCardIds,
      }).map((entry) => entry.code),
    ).toContain("APPROVAL_ART_SHEET_STALE");
  });

  it("rejects unknown fields, incomplete board evidence, and self-asserted pending status", () => {
    const value = {
      ...approval(),
      status: "pending",
      secretSourcePath: "/private/deck.png",
      boardReview: { viewport: "390x844", cardIds: ["november-rain"], note: "" },
    };
    expect(validateDeckApprovalV1(value).map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_APPROVAL_FIELD",
        "APPROVAL_STATUS",
        "APPROVAL_PILOT_CARDS",
        "APPROVAL_BOARD_NOTE",
      ]),
    );
  });

  it("rejects hostile object shapes, sparse evidence, and impossible calendar dates", () => {
    const hiddenField = approval();
    Object.defineProperty(hiddenField, "hiddenSource", {
      enumerable: false,
      value: "/private/card.png",
    });
    expect(validateDeckApprovalV1(hiddenField).map((entry) => entry.code)).toContain(
      "UNKNOWN_APPROVAL_FIELD",
    );

    const sparseCardIds = new Array(4) as string[];
    sparseCardIds[0] = pilotCardIds[0];
    sparseCardIds[2] = pilotCardIds[2];
    const source = approval();
    const sparse = {
      ...source,
      approvedOn: "2026-02-31",
      boardReview: { ...source.boardReview, cardIds: sparseCardIds },
    };
    expect(validateDeckApprovalV1(sparse).map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["APPROVAL_DATE", "APPROVAL_PILOT_CARDS"]),
    );
  });
});
