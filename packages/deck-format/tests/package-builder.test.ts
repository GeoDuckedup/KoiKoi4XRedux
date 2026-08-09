import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { CARD_IDS } from "@koikoi4x/engine";
import { afterEach, describe, expect, it } from "vitest";

import { decodeRuntimeDeckManifestV1 } from "../src/runtime-manifest.ts";
import type { DeckPackageV1 } from "../src/types.ts";
import {
  assignWorkshopSourceV1,
  buildDeckPackageV1,
  readSourceImageMetadata,
  renderRasterDerivativeV1,
  resolveWorkshopGeneratedPathV1,
  saveWorkshopTransformV1,
  sourceFileDigest,
} from "../src/node/index.ts";
import { ART_SPEC_V1 } from "../src/art-spec.ts";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const primaryRoot = join(repositoryRoot, "decks/new-primary-deck");
const primaryPackage = JSON.parse(
  readFileSync(join(primaryRoot, "deck.json"), "utf8"),
) as DeckPackageV1;
const primaryPilotCardIds = [
  "november-rain",
  "september-sake-cup",
  "december-phoenix",
  "january-pine-plain-a",
] as const;

function primaryCardSource(cardId: (typeof primaryPilotCardIds)[number]): string {
  const file = primaryPackage.cards[cardId]?.file;
  if (file === undefined) throw new Error(`Missing primary source mapping for ${cardId}.`);
  return file;
}

const primaryBackSource = (() => {
  const file = primaryPackage.backs?.default;
  if (file === undefined) throw new Error("Primary package has no card back.");
  return file;
})();

async function copyPrimaryFixture(packageRoot: string): Promise<void> {
  await mkdir(join(packageRoot, "source"), { recursive: true });
  for (const name of ["deck.json", "transforms.json", "pilot.json"]) {
    await copyFile(join(primaryRoot, name), join(packageRoot, name));
  }
  for (const relativePath of [...primaryPilotCardIds.map(primaryCardSource), primaryBackSource]) {
    await copyFile(join(primaryRoot, relativePath), join(packageRoot, relativePath));
  }
}

async function temporaryDirectory(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `${name}-`));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Phase 2E raster and package builder", () => {
  it("ART2E-005 renders deterministic table/thumbnail derivatives without mutating source", async () => {
    const source = join(primaryRoot, primaryCardSource("november-rain"));
    const before = sourceFileDigest(source);
    const first = await renderRasterDerivativeV1(source, ART_SPEC_V1.derivatives.table, {
      mode: "manual",
      crop: { x: 0.04, y: 0.03, width: 0.92, height: 0.94 },
      zoom: 1.04,
      rotationDeg: 9,
    });
    const second = await renderRasterDerivativeV1(source, ART_SPEC_V1.derivatives.table, {
      mode: "manual",
      crop: { x: 0.04, y: 0.03, width: 0.92, height: 0.94 },
      zoom: 1.04,
      rotationDeg: 9,
    });
    expect(createHash("sha256").update(first.buffer).digest("hex")).toBe(
      createHash("sha256").update(second.buffer).digest("hex"),
    );
    expect(readSourceImageMetadata(source)).toEqual({ format: "webp", width: 1600, height: 2560 });
    expect(sourceFileDigest(source)).toBe(before);
  });

  it("ART2E-006 builds the partial pilot, both 48-slot sheets, and withholds approval/runtime", async () => {
    const root = await temporaryDirectory("phase2e-partial-root");
    await copyPrimaryFixture(join(root, "new-primary-deck"));
    const output = await temporaryDirectory("phase2e-pilot");
    const report = await buildDeckPackageV1({
      decksRoot: root,
      packageId: "new-primary-deck",
      outputDirectory: output,
      release: true,
    });
    expect(report.cards.map((card) => card.cardId)).toEqual([
      "january-pine-plain-a",
      "september-sake-cup",
      "november-rain",
      "december-phoenix",
    ]);
    expect(report.completeRuntimeManifest).toBe(false);
    expect(report.approvalReady).toBe(false);
    expect(report.runtimeManifestPath).toBeNull();
    expect(report.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "MISSING_SOURCE",
        "APPROVAL_RECORD_REQUIRED",
        "RELEASE_PACKAGE_INCOMPLETE",
      ]),
    );
    expect(readSourceImageMetadata(join(output, report.contactSheets.artReview.path))).toEqual({
      format: "png",
      width: 968,
      height: 4516,
    });
    expect(readSourceImageMetadata(join(output, report.contactSheets.gameplay.path))).toEqual({
      format: "png",
      width: 390,
      height: 1624,
    });
  });

  it("builds the complete primary candidate while withholding only final visual approval", async () => {
    const output = await temporaryDirectory("phase2e-primary-candidate");
    const report = await buildDeckPackageV1({
      decksRoot: join(repositoryRoot, "decks"),
      packageId: "new-primary-deck",
      outputDirectory: output,
      release: true,
    });
    expect(report.cards.map((card) => card.cardId)).toEqual(CARD_IDS);
    expect(report.completeRuntimeManifest).toBe(true);
    expect(report.approvalReady).toBe(false);
    expect(report.runtimeManifestPath).toBe("runtime/manifest.v1.json");
    expect(report.issues.map((entry) => entry.code)).toEqual(["APPROVAL_RECORD_REQUIRED"]);
    const manifest = decodeRuntimeDeckManifestV1(
      JSON.parse(await readFile(join(output, "runtime/manifest.v1.json"), "utf8")),
    );
    expect(manifest.approvalStatus).toBe("technical-placeholder");
    expect(await readFile(join(output, "runtime/manifest.v1.json"), "utf8")).toContain(
      '"inheritanceChain": ["new-primary-deck"]',
    );
  }, 60_000);

  it("ART2E-007 builds a complete second technical package and strict runtime manifest", async () => {
    const root = await temporaryDirectory("phase2e-complete");
    const packageRoot = join(root, "package-folder-does-not-match-id");
    const sourceRoot = join(packageRoot, "source");
    await mkdir(sourceRoot, { recursive: true });
    const source = join(primaryRoot, "source/january-pine-plain-a.png");
    for (const cardId of CARD_IDS) await copyFile(source, join(sourceRoot, `${cardId}.png`));
    await copyFile(join(primaryRoot, "source/card-back.png"), join(sourceRoot, "card-back.png"));
    await writeFile(
      join(packageRoot, "deck.json"),
      `${JSON.stringify(
        {
          formatVersion: 1,
          id: "technical-workshop-proof",
          version: "1.0.0",
          name: "Technical Workshop Proof",
          author: "KoiKoi4x tests",
          license: "Technical placeholder only",
          extends: null,
          framePolicy: "game",
          sourceDefaults: ART_SPEC_V1.defaultTransform,
          cards: Object.fromEntries(
            CARD_IDS.map((cardId) => [cardId, { file: `source/${cardId}.png` }]),
          ),
          backs: { default: "source/card-back.png" },
          preview: { featuredCardIds: ["january-crane"] },
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      join(packageRoot, "transforms.json"),
      `${JSON.stringify({ formatVersion: 1, packageId: "technical-workshop-proof", cards: {} }, null, 2)}\n`,
    );
    const report = await buildDeckPackageV1({
      decksRoot: root,
      packageId: "technical-workshop-proof",
    });
    expect(report.cards).toHaveLength(48);
    expect(report.completeRuntimeManifest).toBe(true);
    expect(report.approvalReady).toBe(false);
    const manifest = decodeRuntimeDeckManifestV1(
      JSON.parse(await readFile(join(packageRoot, "generated/runtime/manifest.v1.json"), "utf8")),
    );
    expect(Object.keys(manifest.cardFaces)).toEqual(CARD_IDS);
    expect(manifest.approvalStatus).toBe("technical-placeholder");
    expect(resolveWorkshopGeneratedPathV1(root, "technical-workshop-proof", "art-review")).toBe(
      join(packageRoot, "generated/contact-sheets/art-review.png"),
    );

    const selectedOutput = join(root, "fresh-selected-output");
    const selectedReport = await buildDeckPackageV1({
      decksRoot: root,
      packageId: "technical-workshop-proof",
      outputDirectory: selectedOutput,
      selectedCardIds: new Set(["january-crane"]),
    });
    expect(selectedReport.completeRuntimeManifest).toBe(false);
    expect(selectedReport.runtimeManifestPath).toBeNull();
    expect(selectedReport.issues.map((entry) => entry.code)).toContain(
      "STALE_GENERATED_DERIVATIVE",
    );
    await expect(access(join(selectedOutput, "runtime/manifest.v1.json"))).rejects.toThrow();

    await writeFile(join(sourceRoot, `${CARD_IDS[0]}.png`), "corrupt image");
    await expect(
      buildDeckPackageV1({ decksRoot: root, packageId: "technical-workshop-proof" }),
    ).rejects.toThrow();
    await expect(access(join(packageRoot, "generated/runtime/manifest.v1.json"))).rejects.toThrow();

    await rm(join(sourceRoot, `${CARD_IDS[0]}.png`));
    const invalidatedReport = await buildDeckPackageV1({
      decksRoot: root,
      packageId: "technical-workshop-proof",
    });
    expect(invalidatedReport.completeRuntimeManifest).toBe(false);
    expect(invalidatedReport.runtimeManifestPath).toBeNull();
    expect(invalidatedReport.issues.map((entry) => entry.code)).toContain("MISSING_SOURCE");
    await expect(access(join(packageRoot, "generated/runtime/manifest.v1.json"))).rejects.toThrow();
  }, 60_000);

  it("ART2E-008 saves transforms atomically while every source digest remains unchanged", async () => {
    const root = await temporaryDirectory("phase2e-save");
    const packageRoot = join(root, "new-primary-deck");
    await copyPrimaryFixture(packageRoot);
    const immutableRain = primaryCardSource("november-rain");
    const immutableCup = primaryCardSource("september-sake-cup");
    const digestsBefore = await Promise.all(
      [immutableRain, immutableCup].map((path) => sourceFileDigest(join(packageRoot, path))),
    );
    const next = await saveWorkshopTransformV1({
      decksRoot: root,
      packageId: "new-primary-deck",
      cardId: "september-sake-cup",
      transform: { mode: "auto", fit: "cover", focusX: 0.31, focusY: 0.72 },
    });
    expect(next.transforms.cards["september-sake-cup"]).toEqual({
      mode: "auto",
      fit: "cover",
      focusX: 0.31,
      focusY: 0.72,
    });
    expect(
      [immutableRain, immutableCup].map((path) => sourceFileDigest(join(packageRoot, path))),
    ).toEqual(digestsBefore);
  });

  it("ART2E-009 assigns a digest-named source without overwriting prior originals", async () => {
    const root = await temporaryDirectory("phase2e-assign");
    const packageRoot = join(root, "new-primary-deck");
    await copyPrimaryFixture(packageRoot);
    const immutableCup = primaryCardSource("september-sake-cup");
    const donor = await readFile(join(packageRoot, immutableCup));
    const donorDigest = sourceFileDigest(join(packageRoot, immutableCup));
    const originalBackDigest = sourceFileDigest(join(packageRoot, primaryBackSource));
    const next = await assignWorkshopSourceV1({
      decksRoot: root,
      packageId: "new-primary-deck",
      cardId: "january-crane",
      mediaType: "image/webp",
      base64: donor.toString("base64"),
    });
    const mapping = next.packageDefinition.cards["january-crane"]?.file;
    expect(mapping).toMatch(/^source\/january-crane-[a-f0-9]{12}\.webp$/u);
    expect(sourceFileDigest(join(packageRoot, mapping ?? "missing"))).toBe(donorDigest);
    expect(sourceFileDigest(join(packageRoot, immutableCup))).toBe(donorDigest);

    const backNext = await assignWorkshopSourceV1({
      decksRoot: root,
      packageId: "new-primary-deck",
      cardId: "back",
      mediaType: "image/webp",
      base64: donor.toString("base64"),
    });
    expect(backNext.packageDefinition.backs?.default).toMatch(
      /^source\/card-back-[a-f0-9]{12}\.webp$/u,
    );
    expect(
      sourceFileDigest(join(packageRoot, backNext.packageDefinition.backs?.default ?? "missing")),
    ).toBe(donorDigest);
    expect(sourceFileDigest(join(packageRoot, primaryBackSource))).toBe(originalBackDigest);
  });
});
