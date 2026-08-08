import { describe, expect, it } from "vitest";

import {
  deckPackageJsonSchemaV1,
  validateDeckPackageDefinition,
  validateDeckRegistry,
  validateDeckTransformsAssociation,
  validateDeckTransformsDefinition,
  validatePilotReleaseApproval,
} from "../src/index.ts";

import { completePackage, emptyTransforms } from "./fixtures.ts";

describe("deck schema and validation", () => {
  it("accepts a valid complete standalone package", () => {
    const packageDefinition = completePackage();
    expect(validateDeckPackageDefinition(packageDefinition)).toEqual([]);
    const report = validateDeckRegistry(
      [packageDefinition],
      [emptyTransforms(packageDefinition.id)],
    );
    expect(report.issues).toEqual([]);
    expect(report.summaries[0]).toMatchObject({
      packageId: "complete-base",
      resolvedCardCount: 48,
      autoTransformCount: 48,
      manualTransformCount: 0,
    });
  });

  it("rejects canonical metadata, unsafe paths, unknown IDs, and duplicate assignments", () => {
    const invalid = {
      ...completePackage(),
      month: 1,
      cards: {
        ...completePackage().cards,
        "january-crane": { file: "../escape.png", category: "bright" },
        "not-a-card": { file: "source/january-pine-plain-a.png" },
        "january-pine-plain-a": { file: "source/shared.png" },
        "january-pine-plain-b": { file: "source/shared.png" },
      },
    };
    expect(validateDeckPackageDefinition(invalid).map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_FIELD",
        "UNSAFE_ASSET_PATH",
        "UNKNOWN_CARD_ID",
        "DUPLICATE_SOURCE",
      ]),
    );
  });

  it("reports missing resolved coverage and card backs", () => {
    const incomplete = completePackage({ cards: {}, backs: undefined });
    const report = validateDeckRegistry([incomplete], [emptyTransforms(incomplete.id)]);
    expect(report.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["MISSING_CARD_COVERAGE", "MISSING_CARD_BACK"]),
    );
  });

  it("rejects duplicate package IDs", () => {
    const first = completePackage();
    const duplicate = completePackage({ name: "Duplicate" });
    expect(
      validateDeckRegistry([first, duplicate], [emptyTransforms(first.id)]).issues.map(
        (entry) => entry.code,
      ),
    ).toContain("DUPLICATE_PACKAGE_ID");
  });

  it("rejects invalid transform fields and unknown transform IDs", () => {
    const issues = validateDeckTransformsDefinition({
      formatVersion: 1,
      packageId: "complete-base",
      cards: {
        "not-a-card": { mode: "auto", fit: "cover", focusX: 0.5, focusY: 0.5 },
        "january-crane": {
          mode: "manual",
          crop: { x: 0.9, y: 0, width: 0.2, height: 1 },
          zoom: -1,
          rotationDeg: 0,
          filename: "forbidden.png",
        },
      },
    });
    expect(issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["UNKNOWN_CARD_ID", "UNKNOWN_FIELD", "CROP_BOUNDS", "ZOOM"]),
    );
  });

  it("keeps generated source-path schema rules aligned with runtime validation", () => {
    const schema = deckPackageJsonSchemaV1() as {
      properties: {
        cards: { additionalProperties: { properties: { file: { pattern: string } } } };
      };
    };
    const sourcePattern = new RegExp(
      schema.properties.cards.additionalProperties.properties.file.pattern,
    );
    expect(sourcePattern.test("source/nested/Card.PNG")).toBe(true);
    for (const unsafe of [
      "source/../escape.png",
      "source/nested/./escape.png",
      "source/a//b.png",
      "source/card.png?raw=1",
    ]) {
      expect(sourcePattern.test(unsafe), unsafe).toBe(false);
      const invalid = completePackage({
        cards: { "january-crane": { file: unsafe } },
      });
      expect(validateDeckPackageDefinition(invalid).map((entry) => entry.code)).toContain(
        "UNSAFE_ASSET_PATH",
      );
    }
  });

  it("rejects cross-file package mismatches and missing release approval", () => {
    const packageDefinition = completePackage();
    expect(
      validateDeckTransformsAssociation(packageDefinition, {
        ...emptyTransforms(packageDefinition.id),
        packageId: "different-package",
      }).map((entry) => entry.code),
    ).toEqual(["TRANSFORM_PACKAGE"]);
    expect(validatePilotReleaseApproval(null).map((entry) => entry.code)).toEqual([
      "PILOT_REQUIRED",
    ]);
    expect(
      validatePilotReleaseApproval({
        formatVersion: 1,
        packageId: packageDefinition.id,
        approvalStatus: "technical-placeholder",
        cards: [],
      }).map((entry) => entry.code),
    ).toEqual(["PILOT_NOT_APPROVED"]);
  });
});
