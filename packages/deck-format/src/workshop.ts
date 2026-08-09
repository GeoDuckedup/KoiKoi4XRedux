import { CARD_CATALOG, CARD_IDS, MONTHS, type CardId } from "@koikoi4x/engine";

import { ART_SPEC_V1, type PixelSize } from "./art-spec.ts";
import { createDerivativePlan } from "./transform.ts";
import type {
  AutoTransform,
  CardTransform,
  DeckTransformsV1,
  DeckValidationIssue,
  ManualTransform,
  ResolvedDeckPackageDraft,
  SourceImageMetadata,
} from "./types.ts";

export const WORKSHOP_FORMAT_VERSION = 1 as const;

export type WorkshopSlotStatus =
  "complete-auto" | "complete-manual" | "inherited" | "warning" | "missing" | "invalid";

export interface WorkshopSourceSummaryV1 {
  readonly cardId: CardId;
  readonly exists: boolean;
  readonly file: string;
  readonly metadata: SourceImageMetadata | null;
  readonly sourcePackageId: string;
}

export interface WorkshopCardSlotV1 {
  readonly cardId: CardId;
  readonly category: (typeof CARD_CATALOG)[number]["category"];
  readonly displayName: string;
  readonly file: string | null;
  readonly inheritedFrom: string | null;
  readonly issueCodes: readonly string[];
  readonly month: number;
  readonly source: WorkshopSourceSummaryV1 | null;
  readonly status: WorkshopSlotStatus;
  readonly transform: CardTransform;
}

export interface WorkshopMonthGroupV1 {
  readonly cards: readonly WorkshopCardSlotV1[];
  readonly flower: string;
  readonly month: number;
  readonly name: string;
}

export interface WorkshopGridV1 {
  readonly formatVersion: typeof WORKSHOP_FORMAT_VERSION;
  readonly groups: readonly WorkshopMonthGroupV1[];
  readonly packageId: string;
  readonly statusCounts: Readonly<Record<WorkshopSlotStatus, number>>;
}

export interface CanonicalFilenameAssignmentV1 {
  readonly cardId: CardId;
  readonly fileName: string;
}

export interface CanonicalFilenameMatchV1 {
  readonly assignments: readonly CanonicalFilenameAssignmentV1[];
  readonly duplicates: readonly CardId[];
  readonly ignored: readonly string[];
}

export interface PostRotationCoverPlanV1 {
  readonly destination: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly output: PixelSize;
  readonly rotatedSource: PixelSize;
  readonly rotationDeg: number;
  readonly scale: number;
}

const STATUS_ORDER = Object.freeze([
  "complete-auto",
  "complete-manual",
  "inherited",
  "warning",
  "missing",
  "invalid",
] as const satisfies readonly WorkshopSlotStatus[]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function stable(value: number): number {
  return Number(value.toFixed(6));
}

export function createPostRotationCoverPlanV1(
  source: PixelSize,
  output: PixelSize,
  rotationDeg: number,
): PostRotationCoverPlanV1 {
  if (
    !Number.isFinite(source.width) ||
    !Number.isFinite(source.height) ||
    source.width <= 0 ||
    source.height <= 0 ||
    !Number.isFinite(output.width) ||
    !Number.isFinite(output.height) ||
    output.width <= 0 ||
    output.height <= 0 ||
    !Number.isFinite(rotationDeg)
  ) {
    throw new Error("Post-rotation cover geometry requires finite positive sizes and rotation.");
  }
  const radians = (rotationDeg * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const rotatedSource = Object.freeze({
    width: source.width * cosine + source.height * sine,
    height: source.width * sine + source.height * cosine,
  });
  const scale = Math.max(output.width / rotatedSource.width, output.height / rotatedSource.height);
  const width = rotatedSource.width * scale;
  const height = rotatedSource.height * scale;
  return Object.freeze({
    destination: Object.freeze({
      x: (output.width - width) / 2,
      y: (output.height - height) / 2,
      width,
      height,
    }),
    output: Object.freeze({ ...output }),
    rotatedSource,
    rotationDeg,
    scale,
  });
}

function issuesForCard(
  issues: readonly DeckValidationIssue[],
  packageId: string,
  cardId: CardId,
): readonly DeckValidationIssue[] {
  return Object.freeze(
    issues.filter(
      (entry) =>
        entry.path === cardId ||
        entry.path.includes(`:${cardId}`) ||
        entry.path.includes(`.${cardId}`) ||
        entry.path.startsWith(`${packageId}:${cardId}`),
    ),
  );
}

function statusForSlot(
  packageId: string,
  source: WorkshopSourceSummaryV1 | null,
  transform: CardTransform,
  issues: readonly DeckValidationIssue[],
): WorkshopSlotStatus {
  if (source === null || !source.exists) return "missing";
  if (issues.some((entry) => entry.severity === "error")) return "invalid";
  if (issues.some((entry) => entry.severity === "warning")) return "warning";
  if (source.sourcePackageId !== packageId) return "inherited";
  return transform.mode === "manual" ? "complete-manual" : "complete-auto";
}

export function createWorkshopGridV1(input: {
  readonly issues: readonly DeckValidationIssue[];
  readonly resolved: ResolvedDeckPackageDraft;
  readonly sources: readonly WorkshopSourceSummaryV1[];
}): WorkshopGridV1 {
  const sourceByCardId = new Map(input.sources.map((source) => [source.cardId, source]));
  const statusCounts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<
    WorkshopSlotStatus,
    number
  >;
  const groups = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = monthIndex + 1;
    const definitions = CARD_CATALOG.filter((card) => card.month === month);
    const cards = definitions.map((definition) => {
      const resolved = input.resolved.cardFaces[definition.id];
      const source = sourceByCardId.get(definition.id) ?? null;
      const transform = resolved?.transform ?? ART_SPEC_V1.defaultTransform;
      const slotIssues = issuesForCard(input.issues, input.resolved.id, definition.id);
      const status = statusForSlot(input.resolved.id, source, transform, slotIssues);
      statusCounts[status] += 1;
      return Object.freeze({
        cardId: definition.id,
        category: definition.category,
        displayName: definition.displayName,
        file: resolved?.file ?? null,
        inheritedFrom:
          resolved !== undefined && resolved.sourcePackageId !== input.resolved.id
            ? resolved.sourcePackageId
            : null,
        issueCodes: Object.freeze(slotIssues.map((entry) => entry.code)),
        month,
        source,
        status,
        transform,
      });
    });
    const monthDefinition = MONTHS[monthIndex];
    if (monthDefinition === undefined) throw new Error(`Canonical month ${month} is empty.`);
    return Object.freeze({
      cards: Object.freeze(cards),
      flower: monthDefinition.flower,
      month,
      name: monthDefinition.name,
    });
  });
  return Object.freeze({
    formatVersion: WORKSHOP_FORMAT_VERSION,
    groups: Object.freeze(groups),
    packageId: input.resolved.id,
    statusCounts: Object.freeze(statusCounts),
  });
}

export function autoAssignCanonicalFilenames(
  fileNames: readonly string[],
): CanonicalFilenameMatchV1 {
  const candidates = new Map<CardId, string[]>();
  const ignored: string[] = [];
  const idSet = new Set<string>(CARD_IDS);
  for (const fileName of fileNames) {
    const baseName = fileName.split(/[\\/]/u).at(-1) ?? fileName;
    const dot = baseName.lastIndexOf(".");
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    if (!idSet.has(stem)) {
      ignored.push(fileName);
      continue;
    }
    const cardId = stem as CardId;
    const entries = candidates.get(cardId) ?? [];
    entries.push(fileName);
    candidates.set(cardId, entries);
  }
  const duplicates = CARD_IDS.filter((cardId) => (candidates.get(cardId)?.length ?? 0) > 1);
  const duplicateSet = new Set(duplicates);
  const assignments = CARD_IDS.flatMap((cardId) => {
    const fileName = candidates.get(cardId)?.[0];
    return fileName === undefined || duplicateSet.has(cardId)
      ? []
      : [Object.freeze({ cardId, fileName })];
  });
  return Object.freeze({
    assignments: Object.freeze(assignments),
    duplicates: Object.freeze(duplicates),
    ignored: Object.freeze(ignored),
  });
}

export function updateAutoFocus(
  transform: AutoTransform,
  focusX: number,
  focusY: number,
): AutoTransform {
  return Object.freeze({
    ...transform,
    focusX: stable(clamp(focusX, 0, 1)),
    focusY: stable(clamp(focusY, 0, 1)),
  });
}

export function createManualTransformFromAuto(
  source: PixelSize,
  transform: AutoTransform,
): ManualTransform {
  const plan = createDerivativePlan(source, ART_SPEC_V1.derivatives.table, transform);
  return Object.freeze({
    mode: "manual",
    crop: Object.freeze({ ...plan.normalizedSourceCrop }),
    zoom: 1,
    rotationDeg: 0,
  });
}

export function moveManualTransform(
  transform: ManualTransform,
  deltaX: number,
  deltaY: number,
): ManualTransform {
  return Object.freeze({
    ...transform,
    crop: Object.freeze({
      ...transform.crop,
      x: stable(clamp(transform.crop.x + deltaX, 0, 1 - transform.crop.width)),
      y: stable(clamp(transform.crop.y + deltaY, 0, 1 - transform.crop.height)),
    }),
  });
}

export function updateManualTransform(
  transform: ManualTransform,
  patch: { readonly rotationDeg?: number; readonly zoom?: number },
): ManualTransform {
  return Object.freeze({
    ...transform,
    rotationDeg:
      patch.rotationDeg === undefined
        ? transform.rotationDeg
        : stable(clamp(patch.rotationDeg, -15, 15)),
    zoom: patch.zoom === undefined ? transform.zoom : stable(clamp(patch.zoom, 1, 4)),
  });
}

export function withTransformOverride(
  transforms: DeckTransformsV1,
  cardId: CardId,
  transform: CardTransform | null,
): DeckTransformsV1 {
  const cards = Object.fromEntries(
    Object.entries(transforms.cards).filter(([existingCardId]) => existingCardId !== cardId),
  ) as Partial<Record<CardId, CardTransform>>;
  if (transform !== null) cards[cardId] = transform;
  return Object.freeze({
    formatVersion: 1,
    packageId: transforms.packageId,
    cards: Object.freeze(cards),
  });
}
