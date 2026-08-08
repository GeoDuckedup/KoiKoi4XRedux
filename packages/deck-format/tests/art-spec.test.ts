import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ART_SPEC_V1,
  deckPackageJsonSchemaV1,
  deckTransformsJsonSchemaV1,
  renderArtGuideSvg,
  renderJsonSchema,
  safeAreaPixels,
} from "../src/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

describe("ART_SPEC v1 and generated contracts", () => {
  it("locks every owner-approved geometry and quality constant", () => {
    expect(ART_SPEC_V1).toMatchObject({
      version: 1,
      colorSpace: "sRGB",
      card: { widthUnits: 5, heightUnits: 8, aspectRatio: 0.625, sourcePolicy: "fullBleed" },
      source: {
        preferredMaster: { width: 1600, height: 2560 },
        recommendedFloor: { width: 1200, height: 1920 },
        releaseMinimum: { width: 800, height: 1280 },
        preferredFormat: "png",
        acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
      },
      safeArea: { x: 0.08, y: 0.06, width: 0.84, height: 0.88 },
      frame: { policy: "game", approximateWidthRatio: 0.03, geometryPackageOverrideAllowed: false },
      defaultTransform: { mode: "auto", fit: "cover", focusX: 0.5, focusY: 0.5 },
      derivatives: {
        table: { width: 640, height: 1024 },
        thumbnail: { width: 160, height: 256 },
        optionalInspection: { width: 1280, height: 2048, generateByDefault: false },
        runtimeFormat: "measurementRequired",
      },
    });
    expect(safeAreaPixels()).toEqual({ x: 128, y: 153.6, width: 1344, height: 2252.8 });
    expect(Object.isFrozen(ART_SPEC_V1)).toBe(true);
    expect(Object.isFrozen(ART_SPEC_V1.safeArea)).toBe(true);
  });

  it("generates the checked-in guide from the locked constants", () => {
    const guide = renderArtGuideSvg();
    expect(guide).toContain('width="1600" height="2560"');
    expect(guide).toContain('x="128" y="153.6" width="1344" height="2252.8"');
    expect(guide).toContain("guides are informational; they are not source crops");
    expect(
      readFileSync(resolve(repositoryRoot, "docs/generated/koikoi4x-art-guide-v1.svg"), "utf8"),
    ).toBe(guide);
  });

  it("keeps generated JSON Schemas synchronized", () => {
    expect(
      readFileSync(
        resolve(repositoryRoot, "packages/deck-format/schemas/deck-package-v1.schema.json"),
        "utf8",
      ),
    ).toBe(renderJsonSchema(deckPackageJsonSchemaV1()));
    expect(
      readFileSync(
        resolve(repositoryRoot, "packages/deck-format/schemas/deck-transforms-v1.schema.json"),
        "utf8",
      ),
    ).toBe(renderJsonSchema(deckTransformsJsonSchemaV1()));
  });
});
