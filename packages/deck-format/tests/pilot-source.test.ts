import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  validateDeckPackageDefinition,
  validateDeckPilotDefinition,
  validateDeckTransformsDefinition,
  validatePilotReadiness,
  type DeckPackageV1,
  type DeckPilotV1,
  type DeckTransformsV1,
} from "../src/index.ts";
import {
  buildPilotImportPlan,
  generateLockedDeckArtifacts,
  pilotCardIdSet,
  readSourceImageMetadata,
  sourceFileDigest,
  validateLocalPackageSources,
} from "../src/node/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const deckDirectory = resolve(repositoryRoot, "decks/new-primary-deck");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const packageDefinition = loadJson<DeckPackageV1>(join(deckDirectory, "deck.json"));
const transforms = loadJson<DeckTransformsV1>(join(deckDirectory, "transforms.json"));
const pilot = loadJson<DeckPilotV1>(join(deckDirectory, "pilot.json"));

function pilotSourceFile(cardId: (typeof pilot.cards)[number]["cardId"]): string {
  const mapping = packageDefinition.cards[cardId];
  if (mapping === undefined) throw new Error(`Missing mapping for ${cardId}`);
  return mapping.file;
}

const pilotSourceFiles = pilot.cards.map((entry) => pilotSourceFile(entry.cardId));
const backSourceFile = packageDefinition.backs?.default;
if (backSourceFile === undefined) throw new Error("Primary package is missing its card back.");

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function solidPng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("primary-deck pilot readiness", () => {
  it("locks the four owner-approved pilot roles separately from full-deck approval", () => {
    expect(validateDeckPackageDefinition(packageDefinition)).toEqual([]);
    expect(validateDeckTransformsDefinition(transforms)).toEqual([]);
    expect(validateDeckPilotDefinition(pilot)).toEqual([]);
    expect(validatePilotReadiness(pilot, packageDefinition)).toEqual([]);
    expect(pilot).toMatchObject({
      approvalStatus: "approved",
      cards: [
        { role: "dense", cardId: "november-rain" },
        { role: "simple", cardId: "september-sake-cup" },
        { role: "brightLargeFocal", cardId: "december-phoenix" },
        { role: "plain", cardId: "january-pine-plain-a" },
      ],
    });
  });

  it("validates preferred-size pilot masters without mutating immutable sources", () => {
    const pilotIds = pilotCardIdSet(pilot);
    const sourcePaths = pilot.cards.map((entry) => {
      const mapping = packageDefinition.cards[entry.cardId];
      if (mapping === undefined) throw new Error(`Missing mapping for ${entry.cardId}`);
      return join(deckDirectory, mapping.file);
    });
    const before = sourcePaths.map(sourceFileDigest);
    const result = validateLocalPackageSources(deckDirectory, packageDefinition, {
      cardIds: pilotIds,
    });
    expect(result.issues).toEqual([]);
    expect(Object.values(result.metadataByCardId)).toEqual(
      Array.from({ length: 4 }, () => ({ format: "webp", width: 1600, height: 2560 })),
    );
    expect(sourcePaths.map(sourceFileDigest)).toEqual(before);
    expect(readSourceImageMetadata(join(deckDirectory, backSourceFile))).toEqual({
      format: "webp",
      width: 1600,
      height: 2560,
    });
  });

  it("creates a deterministic checked-in import plan with source digests and normalized transforms", () => {
    const plan = buildPilotImportPlan(deckDirectory, packageDefinition, transforms, pilot);
    expect(loadJson(join(deckDirectory, "generated/pilot-import-plan.v1.json"))).toEqual(plan);
    expect(plan).toMatchObject({
      artSpecVersion: 1,
      completeRuntimeManifest: true,
      pilotApprovalStatus: "approved",
    });
    const cards = plan.cards as readonly Record<string, unknown>[];
    expect(cards).toHaveLength(4);
    expect(cards.every((entry) => (entry.source as { sha256: string }).sha256.length === 64)).toBe(
      true,
    );
  });

  it("writes generated artifacts outside source and preserves every pilot digest", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "koikoi4x-deck-artifacts-"));
    const temporaryDeck = join(temporaryRoot, "decks/new-primary-deck");
    mkdirSync(join(temporaryDeck, "source"), { recursive: true });
    for (const relativePath of [...pilotSourceFiles, backSourceFile]) {
      copyFileSync(join(deckDirectory, relativePath), join(temporaryDeck, relativePath));
    }
    const immutablePath = join(temporaryDeck, pilotSourceFile("november-rain"));
    const before = sourceFileDigest(immutablePath);
    const paths = generateLockedDeckArtifacts(
      temporaryRoot,
      temporaryDeck,
      packageDefinition,
      transforms,
      pilot,
    );
    expect(Object.values(paths).every((path) => !path.includes("/source/"))).toBe(true);
    expect(sourceFileDigest(immutablePath)).toBe(before);
  });

  it("enforces release minimums and quality-floor warnings", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "koikoi4x-source-quality-"));
    const sourceDirectory = join(temporaryRoot, "source");
    mkdirSync(sourceDirectory, { recursive: true });
    writeFileSync(join(sourceDirectory, "small.png"), solidPng(799, 1279));
    copyFileSync(join(deckDirectory, backSourceFile), join(temporaryRoot, backSourceFile));
    const smallPackage: DeckPackageV1 = {
      ...packageDefinition,
      cards: { "january-pine-plain-a": { file: "source/small.png" } },
      backs: { default: backSourceFile },
    };
    expect(
      validateLocalPackageSources(temporaryRoot, smallPackage).issues.map((entry) => entry.code),
    ).toContain("SOURCE_BELOW_RELEASE_MINIMUM");

    writeFileSync(join(sourceDirectory, "floor.png"), solidPng(800, 1280));
    const floorPackage: DeckPackageV1 = {
      ...smallPackage,
      cards: { "january-pine-plain-a": { file: "source/floor.png" } },
    };
    expect(
      validateLocalPackageSources(temporaryRoot, floorPackage).issues.map((entry) => entry.code),
    ).toContain("SOURCE_BELOW_RECOMMENDED_FLOOR");

    const missingBackPackage: DeckPackageV1 = {
      ...floorPackage,
      backs: { default: "source/missing-back.png" },
    };
    expect(
      validateLocalPackageSources(temporaryRoot, missingBackPackage, {
        includeBack: false,
      }).issues.map((entry) => entry.code),
    ).not.toContain("MISSING_CARD_BACK_SOURCE");
    expect(
      validateLocalPackageSources(temporaryRoot, missingBackPackage).issues.map(
        (entry) => entry.code,
      ),
    ).toContain("MISSING_CARD_BACK_SOURCE");

    symlinkSync(join(deckDirectory, backSourceFile), join(sourceDirectory, "linked.png"));
    const symlinkPackage: DeckPackageV1 = {
      ...floorPackage,
      cards: { "january-pine-plain-a": { file: "source/linked.png" } },
    };
    expect(
      validateLocalPackageSources(temporaryRoot, symlinkPackage).issues.map((entry) => entry.code),
    ).toContain("UNREADABLE_SOURCE");
  });

  it("rejects structurally corrupt PNG, JPEG, and WebP sources", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "koikoi4x-corrupt-source-"));
    const original = readFileSync(join(deckDirectory, "source/january-pine-plain-a.png"));
    const truncatedPath = join(temporaryRoot, "truncated.png");
    writeFileSync(truncatedPath, original.subarray(0, original.length - 12));
    expect(() => readSourceImageMetadata(truncatedPath)).toThrow("Unreadable or corrupt");

    const corrupt = Buffer.from(original);
    corrupt[29] = (corrupt[29] ?? 0) ^ 0xff;
    const corruptPath = join(temporaryRoot, "corrupt.png");
    writeFileSync(corruptPath, corrupt);
    expect(() => readSourceImageMetadata(corruptPath)).toThrow("Unreadable or corrupt");

    const headerOnlyJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x10, 0x03, 0x01, 0x11, 0x00,
      0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
    ]);
    const jpegPath = join(temporaryRoot, "header-only.jpg");
    writeFileSync(jpegPath, headerOnlyJpeg);
    expect(() => readSourceImageMetadata(jpegPath)).toThrow("Unreadable or corrupt");

    const headerOnlyWebp = Buffer.alloc(30);
    headerOnlyWebp.write("RIFF", 0, "ascii");
    headerOnlyWebp.writeUInt32LE(22, 4);
    headerOnlyWebp.write("WEBPVP8X", 8, "ascii");
    headerOnlyWebp.writeUInt32LE(10, 16);
    const webpPath = join(temporaryRoot, "header-only.webp");
    writeFileSync(webpPath, headerOnlyWebp);
    expect(() => readSourceImageMetadata(webpPath)).toThrow("Unreadable or corrupt");
  });
});
