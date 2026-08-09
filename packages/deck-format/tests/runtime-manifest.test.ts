import { ART_SPEC_V1 } from "../src/art-spec.ts";
import { CARD_IDS } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  decodeRuntimeDeckManifestV1,
  validateRuntimeDeckManifestV1,
  type RuntimeDeckManifestV1,
} from "../src/runtime-manifest.ts";

function cardIdAt(index: number) {
  const cardId = CARD_IDS[index];
  if (cardId === undefined) throw new Error(`Missing test CardId at index ${index}.`);
  return cardId;
}

const FIRST_CARD_ID = cardIdAt(0);
const SECOND_CARD_ID = cardIdAt(1);

function faceAt(faces: Record<string, Record<string, unknown>>, cardId: string) {
  const face = faces[cardId];
  if (face === undefined) throw new Error(`Missing test face ${cardId}.`);
  return face;
}

function validManifest(): RuntimeDeckManifestV1 {
  return {
    runtimeFormatVersion: 1,
    artSpecVersion: 1,
    packageId: "technical-sunrise",
    packageVersion: "1.0.0",
    name: "Technical Sunrise",
    author: "KoiKoi4x Project",
    license: "Technical placeholders only",
    approvalStatus: "technical-placeholder",
    framePolicy: "game",
    inheritanceChain: ["technical-sunrise"],
    cardFaces: Object.fromEntries(
      CARD_IDS.map((cardId) => [
        cardId,
        {
          path: `cards/${cardId}.svg`,
          width: ART_SPEC_V1.derivatives.table.width,
          height: ART_SPEC_V1.derivatives.table.height,
          mediaType: "image/svg+xml",
          sourcePackageId: "technical-sunrise",
        },
      ]),
    ) as RuntimeDeckManifestV1["cardFaces"],
    cardBack: {
      path: "backs/default.svg",
      width: ART_SPEC_V1.derivatives.table.width,
      height: ART_SPEC_V1.derivatives.table.height,
      mediaType: "image/svg+xml",
      sourcePackageId: "technical-sunrise",
    },
  };
}

describe("runtime deck manifest v1", () => {
  it("DECK2B-001 accepts and freezes exactly 48 generated card faces plus one back", () => {
    const decoded = decodeRuntimeDeckManifestV1(validManifest());

    expect(validateRuntimeDeckManifestV1(decoded)).toEqual([]);
    expect(Object.keys(decoded.cardFaces)).toEqual(CARD_IDS);
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.inheritanceChain)).toBe(true);
    expect(Object.isFrozen(decoded.cardFaces)).toBe(true);
    expect(Object.isFrozen(decoded.cardFaces[FIRST_CARD_ID])).toBe(true);
    expect(Object.isFrozen(decoded.cardBack)).toBe(true);
  });

  it("DECK2B-002 accepts a resolved child provenance chain", () => {
    const child = {
      ...validManifest(),
      packageId: "technical-moonlight",
      name: "Technical Moonlight",
      inheritanceChain: ["technical-sunrise", "technical-moonlight"],
      cardFaces: Object.fromEntries(
        CARD_IDS.map((cardId) => [
          cardId,
          {
            ...validManifest().cardFaces[cardId],
            sourcePackageId: "technical-moonlight",
          },
        ]),
      ),
      cardBack: {
        ...validManifest().cardBack,
        sourcePackageId: "technical-moonlight",
      },
    };

    expect(validateRuntimeDeckManifestV1(child)).toEqual([]);
    expect(decodeRuntimeDeckManifestV1(child).inheritanceChain).toEqual([
      "technical-sunrise",
      "technical-moonlight",
    ]);
  });

  it.each([
    [
      "missing face",
      (manifest: Record<string, unknown>) => {
        const faces = manifest.cardFaces as Record<string, unknown>;
        const { [FIRST_CARD_ID]: omitted, ...remainingFaces } = faces;
        expect(omitted).toBeDefined();
        manifest.cardFaces = remainingFaces;
      },
      "MISSING_RUNTIME_CARD",
    ],
    [
      "unknown face",
      (manifest: Record<string, unknown>) => {
        manifest.cardFaces = {
          ...(manifest.cardFaces as Record<string, unknown>),
          "secret-card": {},
        };
      },
      "UNKNOWN_RUNTIME_CARD_ID",
    ],
    [
      "duplicate face path",
      (manifest: Record<string, unknown>) => {
        const faces = { ...(manifest.cardFaces as Record<string, Record<string, unknown>>) };
        faces[SECOND_CARD_ID] = {
          ...faceAt(faces, SECOND_CARD_ID),
          path: faceAt(faces, FIRST_CARD_ID).path,
        };
        manifest.cardFaces = faces;
      },
      "DUPLICATE_RUNTIME_ASSET",
    ],
    [
      "unsafe face path",
      (manifest: Record<string, unknown>) => {
        const faces = { ...(manifest.cardFaces as Record<string, Record<string, unknown>>) };
        faces[FIRST_CARD_ID] = { ...faceAt(faces, FIRST_CARD_ID), path: "../private.png" };
        manifest.cardFaces = faces;
      },
      "UNSAFE_RUNTIME_ASSET_PATH",
    ],
    [
      "wrong geometry",
      (manifest: Record<string, unknown>) => {
        manifest.cardBack = { ...(manifest.cardBack as Record<string, unknown>), width: 639 };
      },
      "RUNTIME_ASSET_GEOMETRY",
    ],
    [
      "bad back",
      (manifest: Record<string, unknown>) => {
        manifest.cardBack = null;
      },
      "RUNTIME_IMAGE",
    ],
    [
      "repeated inheritance",
      (manifest: Record<string, unknown>) => {
        manifest.inheritanceChain = ["technical-sunrise", "technical-sunrise"];
      },
      "RUNTIME_INHERITANCE_CYCLE",
    ],
    [
      "unknown nested field",
      (manifest: Record<string, unknown>) => {
        const faces = { ...(manifest.cardFaces as Record<string, Record<string, unknown>>) };
        faces[FIRST_CARD_ID] = { ...faceAt(faces, FIRST_CARD_ID), crop: { x: 0 } };
        manifest.cardFaces = faces;
      },
      "UNKNOWN_RUNTIME_FIELD",
    ],
    [
      "provenance outside inheritance chain",
      (manifest: Record<string, unknown>) => {
        const faces = { ...(manifest.cardFaces as Record<string, Record<string, unknown>>) };
        faces[FIRST_CARD_ID] = {
          ...faceAt(faces, FIRST_CARD_ID),
          sourcePackageId: "unrelated-package",
        };
        manifest.cardFaces = faces;
      },
      "RUNTIME_SOURCE_PROVENANCE",
    ],
  ])("DECK2B-003 rejects %s", (_label, mutate, expectedCode) => {
    const manifest = structuredClone(validManifest()) as unknown as Record<string, unknown>;
    mutate(manifest);

    expect(validateRuntimeDeckManifestV1(manifest).map((entry) => entry.code)).toContain(
      expectedCode,
    );
    expect(() => decodeRuntimeDeckManifestV1(manifest)).toThrow(expectedCode);
  });

  it("DECK2B-003 rejects hostile object shapes without invoking accessors", () => {
    const hidden = structuredClone(validManifest()) as unknown as Record<string, unknown>;
    Object.defineProperty(hidden, "privateDeckOrder", {
      enumerable: false,
      value: ["january-crane"],
    });
    expect(validateRuntimeDeckManifestV1(hidden).map((entry) => entry.code)).toContain(
      "RUNTIME_MANIFEST",
    );

    const inherited = Object.create(validManifest()) as Record<string, unknown>;
    expect(validateRuntimeDeckManifestV1(inherited).map((entry) => entry.code)).toContain(
      "RUNTIME_MANIFEST",
    );

    let getterInvoked = false;
    const manifest = structuredClone(validManifest()) as unknown as Record<string, unknown>;
    const faces = manifest.cardFaces as Record<string, Record<string, unknown>>;
    Object.defineProperty(faceAt(faces, FIRST_CARD_ID), "path", {
      enumerable: true,
      get() {
        getterInvoked = true;
        return "cards/private.svg";
      },
    });

    expect(validateRuntimeDeckManifestV1(manifest).map((entry) => entry.code)).toContain(
      "RUNTIME_IMAGE",
    );
    expect(getterInvoked).toBe(false);
  });

  it("DECK2B-003 rejects sparse and decorated inheritance arrays", () => {
    const sparse = structuredClone(validManifest()) as unknown as Record<string, unknown>;
    sparse.inheritanceChain = new Array(1);
    expect(validateRuntimeDeckManifestV1(sparse).map((entry) => entry.code)).toContain(
      "RUNTIME_INHERITANCE",
    );

    const decorated = structuredClone(validManifest()) as unknown as Record<string, unknown>;
    const chain = ["technical-sunrise"] as string[] & { privateSeed?: string };
    chain.privateSeed = "hidden";
    decorated.inheritanceChain = chain;
    expect(validateRuntimeDeckManifestV1(decorated).map((entry) => entry.code)).toContain(
      "RUNTIME_INHERITANCE",
    );
  });
});
