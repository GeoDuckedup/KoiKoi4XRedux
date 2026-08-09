import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";

import { CARD_IDS, isCardId, type CardId } from "@koikoi4x/engine";

import { renderArtGuideSvg } from "../art-guide.ts";
import { resolveDeckPackageDraft } from "../resolver.ts";
import type {
  CardTransform,
  DeckPackageV1,
  DeckTransformsV1,
  DeckValidationIssue,
  SourceImageMetadata,
} from "../types.ts";
import {
  autoAssignCanonicalFilenames,
  createWorkshopGridV1,
  type WorkshopGridV1,
  type WorkshopSourceSummaryV1,
  withTransformOverride,
} from "../workshop.ts";
import {
  hasValidationErrors,
  validateDeckPackageDefinition,
  validateDeckTransformsDefinition,
} from "../validation.ts";
import { buildDeckPackageV1, type DeckBuildReportV1 } from "./package-builder.ts";
import { loadDeckWorkspaceV1 } from "./package-workspace.ts";
import { readSourceImageMetadata, validateLocalPackageSources } from "./source-validation.ts";

export interface WorkshopPackageSnapshotV1 {
  readonly artGuideSvg: string;
  readonly buildReport: DeckBuildReportV1 | null;
  readonly cardBack: Readonly<{
    exists: boolean;
    file: string | null;
    metadata: SourceImageMetadata | null;
  }>;
  readonly grid: WorkshopGridV1;
  readonly issues: readonly DeckValidationIssue[];
  readonly packageDefinition: DeckPackageV1;
  readonly pilotCardIds: readonly CardId[];
  readonly transforms: DeckTransformsV1;
}

export interface WorkshopPackageSummaryV1 {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export function listWorkshopPackagesV1(decksRoot: string): readonly WorkshopPackageSummaryV1[] {
  const workspace = loadDeckWorkspaceV1(decksRoot);
  return Object.freeze(
    [...workspace.packages]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((entry) => Object.freeze({ id: entry.id, name: entry.name, version: entry.version })),
  );
}

function safePath(rootPath: string, relativePath: string): string {
  const root = resolve(rootPath);
  const path = resolve(root, relativePath);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    throw new Error(`Path escapes package root: ${relativePath}`);
  }
  if (existsSync(path)) {
    if (lstatSync(path).isSymbolicLink()) {
      throw new Error(`Source symlink is not allowed: ${relativePath}`);
    }
    const realRoot = realpathSync(root);
    const realPath = realpathSync(path);
    if (realPath !== realRoot && !realPath.startsWith(`${realRoot}${sep}`)) {
      throw new Error(`Source resolves outside package root: ${relativePath}`);
    }
  }
  return path;
}

function workspaceRegistry(workspace: ReturnType<typeof loadDeckWorkspaceV1>) {
  return Object.freeze({
    packages: Object.freeze(
      Object.fromEntries(workspace.packages.map((entry) => [entry.id, entry])),
    ),
    transforms: Object.freeze(
      Object.fromEntries(workspace.transforms.map((entry) => [entry.packageId, entry])),
    ),
  });
}

function physicalIssues(
  workspace: ReturnType<typeof loadDeckWorkspaceV1>,
  resolved: ReturnType<typeof resolveDeckPackageDraft>,
): DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  const ownerCards = new Map<string, Set<CardId>>();
  for (const cardId of CARD_IDS) {
    const ownerId = resolved.cardFaces[cardId]?.sourcePackageId;
    if (ownerId === undefined) continue;
    const cards = ownerCards.get(ownerId) ?? new Set<CardId>();
    cards.add(cardId);
    ownerCards.set(ownerId, cards);
  }
  for (const [ownerId, cardIds] of ownerCards) {
    const owner = workspace.byId[ownerId];
    if (owner === undefined) continue;
    issues.push(
      ...validateLocalPackageSources(owner.directory, owner.packageDefinition, {
        cardIds,
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
  return issues;
}

export function inspectWorkshopPackageV1(
  decksRoot: string,
  packageId: string,
): WorkshopPackageSnapshotV1 {
  const workspace = loadDeckWorkspaceV1(decksRoot);
  const target = workspace.byId[packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${packageId}.`);
  const resolved = resolveDeckPackageDraft(packageId, workspaceRegistry(workspace));
  const issues = [...workspace.issues, ...physicalIssues(workspace, resolved)];
  const sources: WorkshopSourceSummaryV1[] = [];
  for (const cardId of CARD_IDS) {
    const art = resolved.cardFaces[cardId];
    if (art === undefined) continue;
    const owner = workspace.byId[art.sourcePackageId];
    if (owner === undefined) continue;
    const path = safePath(owner.directory, art.file);
    let metadata: SourceImageMetadata | null = null;
    if (existsSync(path)) {
      try {
        metadata = readSourceImageMetadata(path);
      } catch {
        metadata = null;
      }
    }
    sources.push(
      Object.freeze({
        cardId,
        exists: existsSync(path),
        file: art.file,
        metadata,
        sourcePackageId: art.sourcePackageId,
      }),
    );
  }
  const backFile = resolved.cardBack?.file ?? null;
  const backOwner =
    resolved.cardBack === null ? null : workspace.byId[resolved.cardBack.sourcePackageId];
  const backPath =
    backFile === null || backOwner == null ? null : safePath(backOwner.directory, backFile);
  let backMetadata: SourceImageMetadata | null = null;
  if (backPath !== null && existsSync(backPath)) {
    try {
      backMetadata = readSourceImageMetadata(backPath);
    } catch {
      backMetadata = null;
    }
  }
  const reportPath = join(target.directory, "generated/build-report.v1.json");
  let buildReport: DeckBuildReportV1 | null = null;
  if (existsSync(reportPath)) {
    try {
      buildReport = JSON.parse(readFileSync(reportPath, "utf8")) as DeckBuildReportV1;
    } catch {
      buildReport = null;
    }
  }
  return Object.freeze({
    artGuideSvg: renderArtGuideSvg(),
    buildReport,
    cardBack: Object.freeze({
      exists: backPath !== null && existsSync(backPath),
      file: backFile,
      metadata: backMetadata,
    }),
    grid: createWorkshopGridV1({ issues, resolved, sources }),
    issues: Object.freeze(issues),
    packageDefinition: target.packageDefinition,
    pilotCardIds: Object.freeze(
      target.pilot?.cards.map((entry) => entry.cardId) ??
        target.packageDefinition.preview?.featuredCardIds ??
        [],
    ),
    transforms: target.transforms,
  });
}

export function resolveWorkshopSourcePathV1(
  decksRoot: string,
  packageId: string,
  cardId: CardId | "back",
): string {
  const workspace = loadDeckWorkspaceV1(decksRoot);
  const target = workspace.byId[packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${packageId}.`);
  const resolved = resolveDeckPackageDraft(packageId, workspaceRegistry(workspace));
  const asset = cardId === "back" ? resolved.cardBack : resolved.cardFaces[cardId];
  if (asset === undefined || asset === null) throw new Error(`No source mapped for ${cardId}.`);
  const owner = workspace.byId[asset.sourcePackageId];
  if (owner === undefined) throw new Error(`Unknown source package ${asset.sourcePackageId}.`);
  const path = safePath(owner.directory, asset.file);
  if (!existsSync(path)) throw new Error(`Source does not exist for ${cardId}.`);
  return path;
}

export function resolveWorkshopGeneratedPathV1(
  decksRoot: string,
  packageId: string,
  kind: "art-review" | "gameplay-390x844",
): string {
  const workspace = loadDeckWorkspaceV1(decksRoot);
  const target = workspace.byId[packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${packageId}.`);
  return safePath(target.directory, `generated/contact-sheets/${kind}.png`);
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.workshop-${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function saveWorkshopTransformV1(input: {
  readonly cardId: CardId;
  readonly decksRoot: string;
  readonly packageId: string;
  readonly transform: CardTransform | null;
}): Promise<WorkshopPackageSnapshotV1> {
  const workspace = loadDeckWorkspaceV1(input.decksRoot);
  const target = workspace.byId[input.packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${input.packageId}.`);
  const next = withTransformOverride(target.transforms, input.cardId, input.transform);
  const issues = validateDeckTransformsDefinition(next);
  if (hasValidationErrors(issues)) {
    throw new Error(issues.map((entry) => `${entry.code}: ${entry.message}`).join("\n"));
  }
  await atomicJson(join(target.directory, "transforms.json"), next);
  return inspectWorkshopPackageV1(input.decksRoot, input.packageId);
}

export async function autoAssignWorkshopSourcesV1(
  decksRoot: string,
  packageId: string,
): Promise<WorkshopPackageSnapshotV1> {
  const workspace = loadDeckWorkspaceV1(decksRoot);
  const target = workspace.byId[packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${packageId}.`);
  const sourceDirectory = join(target.directory, "source");
  const fileNames = readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const result = autoAssignCanonicalFilenames(fileNames);
  if (result.duplicates.length > 0) {
    throw new Error(`Duplicate canonical filename assignments: ${result.duplicates.join(", ")}.`);
  }
  const cards = { ...target.packageDefinition.cards };
  for (const assignment of result.assignments) {
    cards[assignment.cardId] = Object.freeze({ file: `source/${assignment.fileName}` });
  }
  const next = Object.freeze({ ...target.packageDefinition, cards: Object.freeze(cards) });
  const issues = validateDeckPackageDefinition(next);
  if (hasValidationErrors(issues)) throw new Error("Auto-assigned deck metadata is invalid.");
  await atomicJson(join(target.directory, "deck.json"), next);
  return inspectWorkshopPackageV1(decksRoot, packageId);
}

const mediaExtensions = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const);

export async function assignWorkshopSourceV1(input: {
  readonly base64: string;
  readonly cardId: CardId | "back";
  readonly decksRoot: string;
  readonly mediaType: keyof typeof mediaExtensions;
  readonly packageId: string;
}): Promise<WorkshopPackageSnapshotV1> {
  const workspace = loadDeckWorkspaceV1(input.decksRoot);
  const target = workspace.byId[input.packageId];
  if (target === undefined) throw new Error(`Unknown workshop package ${input.packageId}.`);
  if (input.cardId !== "back" && !isCardId(input.cardId)) {
    throw new Error("Unknown canonical CardId.");
  }
  const buffer = Buffer.from(input.base64, "base64");
  if (buffer.length === 0 || buffer.length > 32 * 1024 * 1024) {
    throw new Error("Source upload must be between 1 byte and 32 MiB.");
  }
  const extension = mediaExtensions[input.mediaType];
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const sourceDirectory = join(target.directory, "source");
  await mkdir(sourceDirectory, { recursive: true });
  const fileName = `${input.cardId === "back" ? "card-back" : input.cardId}-${sha256.slice(0, 12)}${extension}`;
  const finalPath = join(sourceDirectory, fileName);
  if (existsSync(finalPath)) {
    const stats = lstatSync(finalPath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error("Digest-named source path is not a regular file.");
    }
    if (createHash("sha256").update(readFileSync(finalPath)).digest("hex") !== sha256) {
      throw new Error("Digest-named source file does not match the uploaded content.");
    }
  } else {
    const temporary = join(sourceDirectory, `.${fileName}.${process.pid}.tmp${extension}`);
    await writeFile(temporary, buffer);
    try {
      readSourceImageMetadata(temporary);
      await rename(temporary, finalPath);
    } catch (error) {
      await rm(temporary, { force: true });
      throw new Error(
        `Source image was rejected: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  const next =
    input.cardId === "back"
      ? Object.freeze({
          ...target.packageDefinition,
          backs: Object.freeze({
            ...(target.packageDefinition.backs ?? {}),
            default: `source/${fileName}`,
          }),
        })
      : (() => {
          const cards = { ...target.packageDefinition.cards };
          cards[input.cardId] = Object.freeze({ file: `source/${fileName}` });
          return Object.freeze({ ...target.packageDefinition, cards: Object.freeze(cards) });
        })();
  const issues = validateDeckPackageDefinition(next);
  if (hasValidationErrors(issues)) throw new Error("Assigned deck metadata is invalid.");
  await atomicJson(join(target.directory, "deck.json"), next);
  return inspectWorkshopPackageV1(input.decksRoot, input.packageId);
}

export async function rebuildWorkshopPackageV1(
  decksRoot: string,
  packageId: string,
  selectedCardIds?: ReadonlySet<CardId>,
): Promise<DeckBuildReportV1> {
  return buildDeckPackageV1({
    decksRoot,
    packageId,
    ...(selectedCardIds === undefined ? {} : { selectedCardIds }),
  });
}

export function sourceMediaType(path: string): string {
  const extension = extname(path).toLowerCase();
  return extension === ".png"
    ? "image/png"
    : extension === ".webp"
      ? "image/webp"
      : extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
}

export function workshopFileName(path: string): string {
  return basename(path);
}
