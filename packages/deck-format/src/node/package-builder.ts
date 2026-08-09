import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import { ART_SPEC_V1 } from "../art-spec.ts";
import { validateDeckApprovalV1 } from "../approval.ts";
import {
  createContactSheetPlanV1,
  createContactSheetReviewSha256V1,
  type ContactSheetReviewCardV1,
} from "../contact-sheet.ts";
import { resolveDeckPackageDraft } from "../resolver.ts";
import { decodeRuntimeDeckManifestV1, type RuntimeDeckManifestV1 } from "../runtime-manifest.ts";
import { canonicalAutoTransform } from "../transform.ts";
import type { DeckValidationIssue, SourceImageMetadata } from "../types.ts";
import { validatePilotReleaseApproval } from "../pilot.ts";
import { loadDeckWorkspaceV1 } from "./package-workspace.ts";
import {
  readSourceImageMetadata,
  sourceFileDigest,
  validateLocalPackageSources,
} from "./source-validation.ts";
import {
  renderContactSheetV1,
  renderRasterDerivativeV1,
  writeRasterDerivativeV1,
} from "./raster-builder.ts";

export const DECK_BUILD_REPORT_VERSION = 1 as const;

export interface BuiltDeckCardV1 {
  readonly cardId: CardId;
  readonly source: Readonly<SourceImageMetadata & { file: string; sha256: string }>;
  readonly sourcePackageId: string;
  readonly table: Readonly<{ path: string; sha256: string }>;
  readonly thumbnail: Readonly<{ path: string; sha256: string }>;
}

export interface DeckBuildReportV1 {
  readonly approvalReady: boolean;
  readonly artSpecVersion: 1;
  readonly cards: readonly BuiltDeckCardV1[];
  readonly completeRuntimeManifest: boolean;
  readonly contactSheets: Readonly<{
    artReview: { artifactSha256: string; path: string; sha256: string };
    gameplay: { artifactSha256: string; path: string; sha256: string };
  }>;
  readonly formatVersion: typeof DECK_BUILD_REPORT_VERSION;
  readonly issues: readonly DeckValidationIssue[];
  readonly packageId: string;
  readonly packageVersion: string;
  readonly runtimeManifestPath: string | null;
}

export interface BuildDeckPackageOptionsV1 {
  readonly decksRoot: string;
  readonly outputDirectory?: string;
  readonly packageId: string;
  readonly release?: boolean;
  readonly selectedCardIds?: ReadonlySet<CardId>;
}

function digest(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function issue(
  severity: "error" | "warning",
  code: string,
  path: string,
  message: string,
): DeckValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function safeSourcePath(packageDirectory: string, file: string): string {
  const root = resolve(packageDirectory);
  const path = resolve(root, file);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    throw new Error(`Source path escapes package root: ${file}`);
  }
  if (existsSync(path)) {
    if (lstatSync(path).isSymbolicLink()) throw new Error(`Source symlink is not allowed: ${file}`);
    const realRoot = realpathSync(root);
    const realPath = realpathSync(path);
    if (realPath !== realRoot && !realPath.startsWith(`${realRoot}${sep}`)) {
      throw new Error(`Source resolves outside package root: ${file}`);
    }
  }
  return path;
}

function portablePath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

async function writeBuffer(path: string, buffer: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

async function writeBufferAtomic(path: string, buffer: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, buffer);
  await rename(temporary, path);
}

function renderRuntimeManifest(manifest: RuntimeDeckManifestV1): Buffer {
  const expandedInheritance = JSON.stringify(manifest.inheritanceChain, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");
  const compactInheritance = JSON.stringify(manifest.inheritanceChain);
  const json = JSON.stringify(manifest, null, 2);
  const rendered =
    `  "inheritanceChain": ${compactInheritance},`.length <= 100
      ? json.replace(
          `"inheritanceChain": ${expandedInheritance}`,
          `"inheritanceChain": ${compactInheritance}`,
        )
      : json;
  return Buffer.from(`${rendered}\n`);
}

export async function buildDeckPackageV1(
  options: BuildDeckPackageOptionsV1,
): Promise<DeckBuildReportV1> {
  const workspace = loadDeckWorkspaceV1(options.decksRoot);
  const target = workspace.byId[options.packageId];
  if (target === undefined) throw new Error(`Unknown deck package ${options.packageId}.`);
  const registry = Object.freeze({
    packages: Object.freeze(
      Object.fromEntries(workspace.packages.map((entry) => [entry.id, entry])),
    ),
    transforms: Object.freeze(
      Object.fromEntries(workspace.transforms.map((entry) => [entry.packageId, entry])),
    ),
  });
  const resolved = resolveDeckPackageDraft(options.packageId, registry);
  const outputRoot = resolve(options.outputDirectory ?? join(target.directory, "generated"));
  const runtimeManifestFile = join(outputRoot, "runtime/manifest.v1.json");
  await rm(runtimeManifestFile, { force: true });
  const issues: DeckValidationIssue[] = [...workspace.issues];
  const cards: BuiltDeckCardV1[] = [];
  const faceBuffers: Partial<Record<CardId, Buffer>> = {};
  const selected = options.selectedCardIds;
  let derivativeArtifactsComplete = true;

  const sourceOwners = new Map<string, Set<CardId>>();
  for (const cardId of CARD_IDS) {
    const art = resolved.cardFaces[cardId];
    if (art === undefined) continue;
    const owned = sourceOwners.get(art.sourcePackageId) ?? new Set<CardId>();
    owned.add(cardId);
    sourceOwners.set(art.sourcePackageId, owned);
  }
  for (const [ownerId, ownedIds] of sourceOwners) {
    const owner = workspace.byId[ownerId];
    if (owner === undefined) continue;
    issues.push(
      ...validateLocalPackageSources(owner.directory, owner.packageDefinition, {
        cardIds: ownedIds,
        includeBack: false,
      }).issues.map((entry) => Object.freeze({ ...entry, path: `${ownerId}:${entry.path}` })),
    );
  }
  if (resolved.cardBack !== null) {
    const backOwner = workspace.byId[resolved.cardBack.sourcePackageId];
    if (backOwner !== undefined) {
      issues.push(
        ...validateLocalPackageSources(backOwner.directory, backOwner.packageDefinition, {
          cardIds: new Set<CardId>(),
          includeBack: true,
        }).issues.map((entry) =>
          Object.freeze({ ...entry, path: `${resolved.cardBack?.sourcePackageId}:${entry.path}` }),
        ),
      );
    }
  }

  for (const cardId of CARD_IDS) {
    const art = resolved.cardFaces[cardId];
    if (art === undefined) {
      issues.push(issue("error", "MISSING_SOURCE_MAPPING", cardId, "No resolved source mapping."));
      continue;
    }
    const owner = workspace.byId[art.sourcePackageId];
    if (owner === undefined) {
      issues.push(issue("error", "MISSING_SOURCE_PACKAGE", cardId, art.sourcePackageId));
      continue;
    }
    const sourcePath = safeSourcePath(owner.directory, art.file);
    if (!existsSync(sourcePath)) {
      if (!issues.some((entry) => entry.code === "MISSING_SOURCE" && entry.path.endsWith(cardId))) {
        issues.push(issue("error", "MISSING_SOURCE", cardId, `Missing ${art.file}.`));
      }
      continue;
    }
    const tablePath = join(outputRoot, "runtime/cards", `${cardId}.png`);
    const thumbnailPath = join(outputRoot, "thumbnails", `${cardId}.png`);
    const table = await renderRasterDerivativeV1(
      sourcePath,
      ART_SPEC_V1.derivatives.table,
      art.transform,
    );
    const thumbnail = await renderRasterDerivativeV1(
      sourcePath,
      ART_SPEC_V1.derivatives.thumbnail,
      art.transform,
    );
    faceBuffers[cardId] = table.buffer;
    if (selected === undefined || selected.has(cardId)) {
      await writeRasterDerivativeV1(tablePath, table);
      await writeRasterDerivativeV1(thumbnailPath, thumbnail);
    } else {
      for (const [path, expectedDigest, label] of [
        [tablePath, digest(table.buffer), "table"],
        [thumbnailPath, digest(thumbnail.buffer), "thumbnail"],
      ] as const) {
        if (!existsSync(path) || digest(readFileSync(path)) !== expectedDigest) {
          derivativeArtifactsComplete = false;
          issues.push(
            issue(
              "error",
              "STALE_GENERATED_DERIVATIVE",
              cardId,
              `Selected rebuild cannot publish: ${label} derivative is missing or stale.`,
            ),
          );
        }
      }
    }
    const metadata = readSourceImageMetadata(sourcePath);
    cards.push(
      Object.freeze({
        cardId,
        source: Object.freeze({
          ...metadata,
          file: art.file,
          sha256: sourceFileDigest(sourcePath),
        }),
        sourcePackageId: art.sourcePackageId,
        table: Object.freeze({
          path: portablePath(outputRoot, tablePath),
          sha256: digest(table.buffer),
        }),
        thumbnail: Object.freeze({
          path: portablePath(outputRoot, thumbnailPath),
          sha256: digest(thumbnail.buffer),
        }),
      }),
    );
  }

  let backBuffer: Buffer | null = null;
  let backSourceSha256: string | null = null;
  if (resolved.cardBack === null) {
    issues.push(issue("error", "MISSING_CARD_BACK", "backs.default", "Missing card back."));
  } else {
    const owner = workspace.byId[resolved.cardBack.sourcePackageId];
    if (owner === undefined) {
      issues.push(
        issue("error", "MISSING_BACK_PACKAGE", "backs.default", resolved.cardBack.sourcePackageId),
      );
    } else {
      const sourcePath = safeSourcePath(owner.directory, resolved.cardBack.file);
      if (!existsSync(sourcePath)) {
        issues.push(
          issue("error", "MISSING_CARD_BACK_SOURCE", "backs.default", resolved.cardBack.file),
        );
      } else {
        backSourceSha256 = sourceFileDigest(sourcePath);
        const derivative = await renderRasterDerivativeV1(
          sourcePath,
          ART_SPEC_V1.derivatives.table,
          canonicalAutoTransform(),
        );
        backBuffer = derivative.buffer;
        await writeRasterDerivativeV1(join(outputRoot, "runtime/backs/default.png"), derivative);
      }
    }
  }

  const contentComplete =
    cards.length === CARD_IDS.length &&
    backBuffer !== null &&
    derivativeArtifactsComplete &&
    !issues.some((entry) => entry.severity === "error");
  const artReviewBuffer = await renderContactSheetV1({
    faces: faceBuffers,
    incomplete: !contentComplete,
    plan: createContactSheetPlanV1("art-review"),
  });
  const gameplayBuffer = await renderContactSheetV1({
    faces: faceBuffers,
    incomplete: !contentComplete,
    plan: createContactSheetPlanV1("gameplay-390x844"),
  });
  const artReviewPath = join(outputRoot, "contact-sheets/art-review.png");
  const gameplayPath = join(outputRoot, "contact-sheets/gameplay-390x844.png");
  await writeBuffer(artReviewPath, artReviewBuffer);
  await writeBuffer(gameplayPath, gameplayBuffer);

  const reviewCards = Object.fromEntries(
    cards.map((card) => {
      const transform = resolved.cardFaces[card.cardId]?.transform;
      if (transform === undefined)
        throw new Error(`Missing resolved transform for ${card.cardId}.`);
      return [card.cardId, Object.freeze({ sourceSha256: card.source.sha256, transform })];
    }),
  ) as Partial<Record<CardId, ContactSheetReviewCardV1>>;
  const artReviewSha256 = createContactSheetReviewSha256V1({
    backSourceSha256,
    cards: reviewCards,
    kind: "art-review",
    packageId: resolved.id,
  });
  const gameplayReviewSha256 = createContactSheetReviewSha256V1({
    backSourceSha256,
    cards: reviewCards,
    kind: "gameplay-390x844",
    packageId: resolved.id,
  });
  const artReviewArtifactSha256 = digest(artReviewBuffer);
  const gameplayArtifactSha256 = digest(gameplayBuffer);
  let approvalValid = false;
  const approvalPath = join(target.directory, "approval.json");
  if (existsSync(approvalPath)) {
    try {
      const approvalValue = JSON.parse(readFileSync(approvalPath, "utf8")) as unknown;
      const approvalIssues = validateDeckApprovalV1(approvalValue, {
        artReviewSha256,
        gameplayReviewSha256,
        packageId: resolved.id,
        pilotCardIds: target.pilot?.cards.map((entry) => entry.cardId) ?? [],
      });
      issues.push(...approvalIssues);
      approvalValid = approvalIssues.length === 0;
    } catch (error) {
      issues.push(
        issue(
          "error",
          "APPROVAL_JSON",
          "approval.json",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  } else if (options.release) {
    issues.push(
      issue(
        "error",
        "APPROVAL_RECORD_REQUIRED",
        "approval.json",
        "Release requires an owner approval record bound to both review-content digests.",
      ),
    );
  }

  let runtimeManifestPath: string | null = null;
  const releaseApprovalValid = approvalValid && target.pilot?.approvalStatus === "approved";
  if (contentComplete && resolved.cardBack !== null) {
    const manifest = decodeRuntimeDeckManifestV1({
      runtimeFormatVersion: 1,
      artSpecVersion: 1,
      packageId: resolved.id,
      packageVersion: resolved.version,
      name: resolved.name,
      author: resolved.author,
      license: resolved.license,
      approvalStatus: releaseApprovalValid ? "approved" : "technical-placeholder",
      framePolicy: "game",
      inheritanceChain: resolved.inheritanceChain,
      cardFaces: Object.fromEntries(
        CARD_IDS.map((cardId) => [
          cardId,
          {
            path: `cards/${cardId}.png`,
            width: ART_SPEC_V1.derivatives.table.width,
            height: ART_SPEC_V1.derivatives.table.height,
            mediaType: "image/png",
            sourcePackageId: resolved.cardFaces[cardId]?.sourcePackageId,
          },
        ]),
      ) as unknown as RuntimeDeckManifestV1["cardFaces"],
      cardBack: {
        path: "backs/default.png",
        width: ART_SPEC_V1.derivatives.table.width,
        height: ART_SPEC_V1.derivatives.table.height,
        mediaType: "image/png",
        sourcePackageId: resolved.cardBack.sourcePackageId,
      },
    } satisfies RuntimeDeckManifestV1);
    await writeBufferAtomic(runtimeManifestFile, renderRuntimeManifest(manifest));
    runtimeManifestPath = portablePath(outputRoot, runtimeManifestFile);
  } else {
    await rm(runtimeManifestFile, { force: true });
  }

  if (options.release) {
    issues.push(...validatePilotReleaseApproval(target.pilot));
    if (!contentComplete) {
      issues.push(
        issue(
          "error",
          "RELEASE_PACKAGE_INCOMPLETE",
          resolved.id,
          `Release requires 48 current faces, a back, and current derivatives; ${cards.length} faces decoded but the content gate did not pass.`,
        ),
      );
    }
  }

  const report: DeckBuildReportV1 = Object.freeze({
    approvalReady:
      contentComplete &&
      releaseApprovalValid &&
      !issues.some((entry) => entry.severity === "error"),
    artSpecVersion: 1,
    cards: Object.freeze(cards),
    completeRuntimeManifest: contentComplete,
    contactSheets: Object.freeze({
      artReview: Object.freeze({
        artifactSha256: artReviewArtifactSha256,
        path: portablePath(outputRoot, artReviewPath),
        sha256: artReviewSha256,
      }),
      gameplay: Object.freeze({
        artifactSha256: gameplayArtifactSha256,
        path: portablePath(outputRoot, gameplayPath),
        sha256: gameplayReviewSha256,
      }),
    }),
    formatVersion: DECK_BUILD_REPORT_VERSION,
    issues: Object.freeze(issues),
    packageId: resolved.id,
    packageVersion: resolved.version,
    runtimeManifestPath,
  });
  await writeBuffer(
    join(outputRoot, "build-report.v1.json"),
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`),
  );
  return report;
}
