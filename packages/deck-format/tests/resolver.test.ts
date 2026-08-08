import { describe, expect, it } from "vitest";

import {
  resolveDeckPackage,
  resolveDeckPackageDraft,
  validateDeckRegistry,
  type DeckPackageV1,
  type DeckResolutionRegistry,
  type DeckTransformsV1,
} from "../src/index.ts";

import { completePackage, emptyTransforms } from "./fixtures.ts";

function registry(
  packages: readonly DeckPackageV1[],
  transforms: readonly DeckTransformsV1[],
): DeckResolutionRegistry {
  return {
    packages: Object.fromEntries(packages.map((entry) => [entry.id, entry])),
    transforms: Object.fromEntries(transforms.map((entry) => [entry.packageId, entry])),
  };
}

describe("deck package inheritance", () => {
  it("resolves partial child overrides with exact provenance", () => {
    const base = completePackage();
    const child = completePackage({
      id: "seasonal-child",
      name: "Seasonal Child",
      extends: base.id,
      cards: { "january-crane": { file: "source/seasonal-crane.png" } },
      backs: { default: "source/seasonal-back.png" },
      preview: { featuredCardIds: ["december-phoenix"] },
    });
    const baseTransforms: DeckTransformsV1 = {
      formatVersion: 1,
      packageId: base.id,
      cards: {
        "january-crane": {
          mode: "manual",
          crop: { x: 0, y: 0, width: 1, height: 1 },
          zoom: 1,
          rotationDeg: 0,
        },
      },
    };
    const resolved = resolveDeckPackage(
      child.id,
      registry([base, child], [baseTransforms, emptyTransforms(child.id)]),
    );
    expect(resolved.inheritanceChain).toEqual([base.id, child.id]);
    expect(resolved.cardFaces["january-crane"]).toMatchObject({
      file: "source/seasonal-crane.png",
      sourcePackageId: child.id,
      transform: { mode: "manual" },
      transformPackageId: base.id,
    });
    expect(resolved.cardFaces["february-bush-warbler"].sourcePackageId).toBe(base.id);
    expect(resolved.cardBack.sourcePackageId).toBe(child.id);
    expect(resolved.preview?.featuredCardIds).toEqual(["december-phoenix"]);
  });

  it("lets an explicit child auto transform reset an inherited manual transform", () => {
    const base = completePackage();
    const child = completePackage({
      id: "reset-child",
      extends: base.id,
      cards: { "january-crane": { file: "source/replacement.png" } },
    });
    const baseTransforms: DeckTransformsV1 = {
      formatVersion: 1,
      packageId: base.id,
      cards: {
        "january-crane": {
          mode: "manual",
          crop: { x: 0, y: 0, width: 1, height: 1 },
          zoom: 1,
          rotationDeg: 0,
        },
      },
    };
    const childTransforms: DeckTransformsV1 = {
      formatVersion: 1,
      packageId: child.id,
      cards: {
        "january-crane": { mode: "auto", fit: "cover", focusX: 0.5, focusY: 0.5 },
      },
    };
    const resolved = resolveDeckPackage(
      child.id,
      registry([base, child], [baseTransforms, childTransforms]),
    );
    expect(resolved.cardFaces["january-crane"]).toMatchObject({
      transform: { mode: "auto" },
      transformPackageId: child.id,
    });
  });

  it("rejects missing parents and cycles", () => {
    const missingParent = completePackage({ id: "orphan", extends: "missing-parent" });
    expect(
      validateDeckRegistry([missingParent], [emptyTransforms(missingParent.id)]).issues.map(
        (entry) => entry.code,
      ),
    ).toContain("INHERITANCE");

    const first = completePackage({ id: "cycle-first", extends: "cycle-second" });
    const second = completePackage({ id: "cycle-second", extends: "cycle-first" });
    expect(
      validateDeckRegistry(
        [first, second],
        [emptyTransforms(first.id), emptyTransforms(second.id)],
      ).issues.map((entry) => entry.code),
    ).toContain("INHERITANCE_CYCLE");
  });

  it("keeps a draft resolvable while complete resolution rejects missing IDs", () => {
    const partial = completePackage({
      id: "partial",
      cards: { "january-crane": { file: "source/crane.png" } },
    });
    const partialRegistry = registry([partial], [emptyTransforms(partial.id)]);
    expect(Object.keys(resolveDeckPackageDraft(partial.id, partialRegistry).cardFaces)).toEqual([
      "january-crane",
    ]);
    expect(() => resolveDeckPackage(partial.id, partialRegistry)).toThrow("MISSING_CARDS");
  });
});
