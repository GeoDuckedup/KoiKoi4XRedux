import { ART_SPEC_V1 } from "@koikoi4x/deck-format";
import { CARD_IDS } from "@koikoi4x/engine";
import { describe, expect, it, vi } from "vitest";

import { CardAssetManager } from "../src/presentation/deck/card-asset-manager";

const FIRST_CARD_ID = CARD_IDS[0];
if (FIRST_CARD_ID === undefined) throw new Error("Missing first canonical test card.");

function manifest(packageId: "technical-moonlight" | "technical-sunrise") {
  return {
    runtimeFormatVersion: 1,
    artSpecVersion: 1,
    packageId,
    packageVersion: "1.0.0",
    name: packageId,
    author: "tests",
    license: "tests",
    approvalStatus: "technical-placeholder",
    framePolicy: "game",
    inheritanceChain:
      packageId === "technical-sunrise"
        ? ["technical-sunrise"]
        : ["technical-sunrise", "technical-moonlight"],
    cardFaces: Object.fromEntries(
      CARD_IDS.map((cardId) => [
        cardId,
        {
          path: `cards/${cardId}.svg`,
          width: ART_SPEC_V1.derivatives.table.width,
          height: ART_SPEC_V1.derivatives.table.height,
          mediaType: "image/svg+xml",
          sourcePackageId: packageId,
        },
      ]),
    ),
    cardBack: {
      path: "backs/default.svg",
      width: ART_SPEC_V1.derivatives.table.width,
      height: ART_SPEC_V1.derivatives.table.height,
      mediaType: "image/svg+xml",
      sourcePackageId: packageId,
    },
  };
}

describe("Phase 2B CardAssetManager", () => {
  it("SWITCH-001 loads both complete packages through a Pages-safe base path", async () => {
    const requestedManifests: string[] = [];
    const requestedTextures: string[] = [];
    const lifecycle: string[] = [];
    const unloaded: string[] = [];
    const manager = new CardAssetManager<string>({
      baseUrl: "https://example.test/KoiKoi4XRedux/",
      loadJson: async (url) => {
        requestedManifests.push(url);
        return manifest(url.includes("moonlight") ? "technical-moonlight" : "technical-sunrise");
      },
      textureLoader: {
        load: async (url) => {
          requestedTextures.push(url);
          return url;
        },
        unload: async (url) => {
          lifecycle.push(`unload:${url}`);
          unloaded.push(url);
        },
      },
    });
    const presentationOnlyReference = Object.freeze({
      cardIds: Object.freeze([...CARD_IDS]),
      phase: "unchanged-engine-projection",
    });
    const beforeReference = JSON.stringify(presentationOnlyReference);

    const sunrise = await manager.activate("technical-sunrise");
    const moonlight = await manager.activate("technical-moonlight", (bundle) => {
      lifecycle.push(`apply:${bundle.manifest.packageId}`);
    });
    const sunriseAgain = await manager.activate("technical-sunrise");

    expect(sunrise.status).toBe("activated");
    expect(moonlight.status).toBe("activated");
    expect(sunriseAgain.status).toBe("activated");
    expect(manager.active?.manifest.packageId).toBe("technical-sunrise");
    expect(manager.installedDeckIds).toEqual([
      "new-primary-deck",
      "technical-sunrise",
      "technical-moonlight",
    ]);
    expect(requestedManifests).toEqual([
      "https://example.test/KoiKoi4XRedux/decks/technical-sunrise/manifest.v1.json",
      "https://example.test/KoiKoi4XRedux/decks/technical-moonlight/manifest.v1.json",
      "https://example.test/KoiKoi4XRedux/decks/technical-sunrise/manifest.v1.json",
    ]);
    expect(requestedTextures).toHaveLength(147);
    expect(
      requestedTextures.every((url) => url.startsWith("https://example.test/KoiKoi4XRedux/")),
    ).toBe(true);
    expect(unloaded).toHaveLength(98);
    expect(unloaded.slice(0, 49).every((url) => url.includes("technical-sunrise"))).toBe(true);
    expect(unloaded.slice(49).every((url) => url.includes("technical-moonlight"))).toBe(true);
    expect(lifecycle[0]).toBe("apply:technical-moonlight");
    expect(lifecycle[1]).toMatch(/^unload:/u);
    expect(JSON.stringify(presentationOnlyReference)).toBe(beforeReference);
  });

  it("ASSET-002 unloads a superseded complete candidate without touching the active deck", async () => {
    const pendingMoonlight: Array<{ resolve: (value: string) => void; url: string }> = [];
    const unloaded: string[] = [];
    let deferMoonlight = false;
    const manager = new CardAssetManager<string>({
      baseUrl: "https://example.test/",
      loadJson: async (url) =>
        manifest(url.includes("moonlight") ? "technical-moonlight" : "technical-sunrise"),
      textureLoader: {
        load: async (url) => {
          if (!deferMoonlight || !url.includes("technical-moonlight")) return url;
          return new Promise<string>((resolve) => pendingMoonlight.push({ resolve, url }));
        },
        unload: async (url) => {
          unloaded.push(url);
        },
      },
    });
    await manager.activate("technical-sunrise");
    deferMoonlight = true;

    const superseded = manager.activate("technical-moonlight");
    await vi.waitFor(() => expect(pendingMoonlight).toHaveLength(49));
    const winner = await manager.activate("technical-sunrise");
    for (const request of pendingMoonlight) request.resolve(request.url);

    expect((await superseded).status).toBe("stale");
    expect(winner.status).toBe("activated");
    expect(manager.active?.manifest.packageId).toBe("technical-sunrise");
    expect(unloaded).toHaveLength(49);
    expect(unloaded.every((url) => url.includes("technical-moonlight"))).toBe(true);
  });

  it("SWITCH-002 leaves the prior deck active when candidate texture loading fails", async () => {
    const unloaded: string[] = [];
    const manager = new CardAssetManager<string>({
      baseUrl: "https://example.test/",
      loadJson: async (url) =>
        manifest(url.includes("moonlight") ? "technical-moonlight" : "technical-sunrise"),
      textureLoader: {
        load: async (url) => {
          if (url.includes("technical-moonlight/cards/october-deer")) {
            throw new Error("synthetic texture failure");
          }
          return url;
        },
        unload: async (url) => {
          unloaded.push(url);
        },
      },
    });
    const sunrise = await manager.activate("technical-sunrise");
    const before = manager.active;

    await expect(manager.activate("technical-moonlight")).rejects.toThrow(
      "DECK_TEXTURE_LOAD_FAILED",
    );
    expect(manager.active).toBe(before);
    expect(manager.active).toBe(sunrise.bundle);
    expect(manager.active?.manifest.packageId).toBe("technical-sunrise");
    expect(unloaded).toHaveLength(48);
  });

  it("DECK2B-003 rejects an invalid manifest before requesting any texture", async () => {
    const requestedTextures: string[] = [];
    const invalid = structuredClone(manifest("technical-sunrise")) as unknown as Record<
      string,
      unknown
    >;
    const faces = invalid.cardFaces as Record<string, unknown>;
    const { [FIRST_CARD_ID]: omitted, ...remainingFaces } = faces;
    expect(omitted).toBeDefined();
    invalid.cardFaces = remainingFaces;
    const manager = new CardAssetManager<string>({
      baseUrl: "https://example.test/",
      loadJson: async () => invalid,
      textureLoader: {
        load: async (url) => {
          requestedTextures.push(url);
          return url;
        },
      },
    });

    await expect(manager.activate("technical-sunrise")).rejects.toThrow("MISSING_RUNTIME_CARD");
    expect(requestedTextures).toEqual([]);
    expect(manager.active).toBeNull();
  });
});
