import { decodeRuntimeDeckManifestV1, type RuntimeDeckManifestV1 } from "@koikoi4x/deck-format";
import { CARD_IDS, type CardId } from "@koikoi4x/engine";
import { Assets, type Texture } from "pixi.js";

import { INSTALLED_DECKS, type InstalledDeckId } from "./installed-decks";

interface RuntimeTextureLoader<TextureValue> {
  load: (url: string) => Promise<TextureValue>;
  unload?: (url: string) => Promise<void>;
}

interface InstalledDeckDescriptor {
  readonly id: InstalledDeckId;
  readonly manifestPath: string;
  readonly name: string;
}

export interface ActiveDeckTextures<TextureValue = Texture> {
  readonly back: TextureValue;
  readonly faceBindings: Readonly<Record<CardId, string>>;
  readonly faces: Readonly<Record<CardId, TextureValue>>;
  readonly manifest: RuntimeDeckManifestV1;
}

export interface DeckActivation<TextureValue = Texture> {
  readonly bundle: ActiveDeckTextures<TextureValue> | null;
  readonly status: "activated" | "stale";
}

interface CardAssetManagerOptions<TextureValue> {
  readonly baseUrl: string;
  readonly installedDecks?: readonly InstalledDeckDescriptor[];
  readonly loadJson?: (url: string) => Promise<unknown>;
  readonly textureLoader: RuntimeTextureLoader<TextureValue>;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DECK_MANIFEST_LOAD_FAILED: ${response.status} ${url}`);
  }
  return response.json() as Promise<unknown>;
}

function resolveAssetUrl(manifestUrl: string, path: string): string {
  return new URL(path, manifestUrl).href;
}

export class CardAssetManager<TextureValue = Texture> {
  readonly #baseUrl: string;
  readonly #bundleAssetUrls = new WeakMap<ActiveDeckTextures<TextureValue>, readonly string[]>();
  readonly #bundlePromises = new Map<InstalledDeckId, Promise<ActiveDeckTextures<TextureValue>>>();
  readonly #descriptors: ReadonlyMap<InstalledDeckId, InstalledDeckDescriptor>;
  readonly #latestGenerationByDeck = new Map<InstalledDeckId, number>();
  readonly #loadJson: (url: string) => Promise<unknown>;
  readonly #releasePromises = new Map<InstalledDeckId, Promise<void>>();
  readonly #textureLoader: RuntimeTextureLoader<TextureValue>;
  #active: ActiveDeckTextures<TextureValue> | null = null;
  #activationGeneration = 0;

  constructor(options: CardAssetManagerOptions<TextureValue>) {
    this.#baseUrl = options.baseUrl;
    this.#loadJson = options.loadJson ?? fetchJson;
    this.#textureLoader = options.textureLoader;
    const descriptors = options.installedDecks ?? INSTALLED_DECKS;
    this.#descriptors = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  }

  get active(): ActiveDeckTextures<TextureValue> | null {
    return this.#active;
  }

  get installedDeckIds(): readonly InstalledDeckId[] {
    return Object.freeze([...this.#descriptors.keys()]);
  }

  async activate(
    deckId: InstalledDeckId,
    applyBundle?: (bundle: ActiveDeckTextures<TextureValue>) => void,
  ): Promise<DeckActivation<TextureValue>> {
    const generation = ++this.#activationGeneration;
    this.#latestGenerationByDeck.set(deckId, generation);
    const bundle = await this.#loadBundle(deckId);
    if (generation !== this.#activationGeneration) {
      if (this.#latestGenerationByDeck.get(deckId) === generation && bundle !== this.#active) {
        await this.#releaseBundle(deckId, bundle);
      }
      return Object.freeze({ status: "stale", bundle: null });
    }
    const previous = this.#active;
    try {
      applyBundle?.(bundle);
    } catch (error: unknown) {
      if (bundle !== previous) await this.#releaseBundle(deckId, bundle);
      throw error;
    }
    this.#active = bundle;
    if (previous && previous !== bundle) {
      await this.#releaseBundle(previous.manifest.packageId as InstalledDeckId, previous);
    }
    return Object.freeze({ status: "activated", bundle });
  }

  async #loadBundle(deckId: InstalledDeckId): Promise<ActiveDeckTextures<TextureValue>> {
    const releasing = this.#releasePromises.get(deckId);
    if (releasing) await releasing;
    const existing = this.#bundlePromises.get(deckId);
    if (existing) return existing;

    const promise = this.#loadBundleUncached(deckId).catch((error: unknown) => {
      this.#bundlePromises.delete(deckId);
      throw error;
    });
    this.#bundlePromises.set(deckId, promise);
    return promise;
  }

  async #loadBundleUncached(deckId: InstalledDeckId): Promise<ActiveDeckTextures<TextureValue>> {
    const descriptor = this.#descriptors.get(deckId);
    if (!descriptor) throw new Error(`DECK_NOT_INSTALLED: ${deckId}`);
    const manifestUrl = new URL(descriptor.manifestPath, this.#baseUrl).href;
    const manifest = decodeRuntimeDeckManifestV1(await this.#loadJson(manifestUrl));
    if (manifest.packageId !== deckId) {
      throw new Error(
        `DECK_MANIFEST_ID_MISMATCH: expected ${deckId}, received ${manifest.packageId}`,
      );
    }

    const requests = [
      ...CARD_IDS.map((cardId) => ({
        cardId,
        url: resolveAssetUrl(manifestUrl, manifest.cardFaces[cardId].path),
      })),
      { cardId: null, url: resolveAssetUrl(manifestUrl, manifest.cardBack.path) },
    ] as const;
    const settled = await Promise.allSettled(
      requests.map(async (request) => ({
        ...request,
        texture: await this.#textureLoader.load(request.url),
      })),
    );
    const failures = settled.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      if (this.#textureLoader.unload) {
        await Promise.all(
          settled
            .filter((result) => result.status === "fulfilled")
            .map(({ value }) => this.#textureLoader.unload?.(value.url)),
        );
      }
      throw new Error(
        `DECK_TEXTURE_LOAD_FAILED: ${deckId} (${failures.map(({ reason }) => (reason instanceof Error ? reason.message : String(reason))).join("; ")})`,
      );
    }

    const loaded = settled.map((result) => {
      if (result.status !== "fulfilled") throw new Error("DECK_TEXTURE_LOAD_FAILED");
      return result.value;
    });
    const faceEntries = loaded
      .filter((entry): entry is typeof entry & { cardId: CardId } => entry.cardId !== null)
      .map((entry) => [entry.cardId, entry.texture] as const);
    const back = loaded.find((entry) => entry.cardId === null);
    if (!back) throw new Error(`DECK_CARD_BACK_LOAD_FAILED: ${deckId}`);

    const bundle = Object.freeze({
      manifest,
      faces: Object.freeze(Object.fromEntries(faceEntries)) as Readonly<
        Record<CardId, TextureValue>
      >,
      faceBindings: Object.freeze(
        Object.fromEntries(CARD_IDS.map((cardId) => [cardId, `${deckId}:${cardId}`])),
      ) as Readonly<Record<CardId, string>>,
      back: back.texture,
    });
    this.#bundleAssetUrls.set(bundle, Object.freeze(loaded.map(({ url }) => url)));
    return bundle;
  }

  async #releaseBundle(
    deckId: InstalledDeckId,
    bundle: ActiveDeckTextures<TextureValue>,
  ): Promise<void> {
    if (bundle === this.#active) return;
    this.#bundlePromises.delete(deckId);
    const urls = this.#bundleAssetUrls.get(bundle) ?? Object.freeze([]);
    this.#bundleAssetUrls.delete(bundle);
    if (!this.#textureLoader.unload || urls.length === 0) return;

    const release = Promise.allSettled(urls.map((url) => this.#textureLoader.unload?.(url))).then(
      () => undefined,
    );
    this.#releasePromises.set(deckId, release);
    await release;
    if (this.#releasePromises.get(deckId) === release) {
      this.#releasePromises.delete(deckId);
    }
  }
}

export function createPixiCardAssetManager(baseUrl: string): CardAssetManager<Texture> {
  return new CardAssetManager<Texture>({
    baseUrl,
    textureLoader: {
      load: async (url) => Assets.load<Texture>(url),
      unload: async (url) => {
        await Assets.unload(url);
      },
    },
  });
}
