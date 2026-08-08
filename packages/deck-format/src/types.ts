import type { CardId } from "@koikoi4x/engine";

import type { NormalizedRectangle, PixelRectangle, PixelSize } from "./art-spec.ts";

export const DECK_FORMAT_VERSION = 1 as const;
export const TRANSFORM_FORMAT_VERSION = 1 as const;
export const PILOT_FORMAT_VERSION = 1 as const;

export type FitStrategy = "cover" | "contain";
export type FramePolicy = "game";

export interface AutoTransform {
  readonly mode: "auto";
  readonly fit: FitStrategy;
  readonly focusX: number;
  readonly focusY: number;
}

export interface ManualTransform {
  readonly mode: "manual";
  readonly crop: NormalizedRectangle;
  readonly zoom: number;
  readonly rotationDeg: number;
}

export type CardTransform = AutoTransform | ManualTransform;

export interface CardSourceMapping {
  readonly file: string;
}

export interface DeckPreviewMetadata {
  readonly thumbnail?: string;
  readonly showcase?: string;
  readonly featuredCardIds: readonly CardId[];
}

export interface SourceQualityException {
  readonly allowBelowReleaseMinimum: true;
  readonly approvedBy: string;
  readonly approvedOn: string;
  readonly reason: string;
}

export interface DeckPackageV1 {
  readonly formatVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly author: string;
  readonly license: string;
  readonly extends: string | null;
  readonly framePolicy: FramePolicy;
  readonly sourceDefaults?: AutoTransform;
  readonly cards: Readonly<Partial<Record<CardId, CardSourceMapping>>>;
  readonly backs?: Readonly<{ default?: string }>;
  readonly preview?: DeckPreviewMetadata;
  readonly qualityExceptions?: Readonly<Partial<Record<CardId, SourceQualityException>>>;
}

export interface DeckTransformsV1 {
  readonly formatVersion: 1;
  readonly packageId: string;
  readonly cards: Readonly<Partial<Record<CardId, CardTransform>>>;
}

export type PilotRole = "dense" | "simple" | "brightLargeFocal" | "plain";

export interface PilotCardAssignment {
  readonly role: PilotRole;
  readonly cardId: CardId;
  readonly rationale: string;
}

export interface DeckPilotV1 {
  readonly formatVersion: 1;
  readonly packageId: string;
  readonly cards: readonly PilotCardAssignment[];
  readonly approvalStatus: "technical-placeholder" | "awaiting-finished-art" | "approved";
}

export type ValidationSeverity = "error" | "warning";

export interface DeckValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ResolvedCardArt {
  readonly cardId: CardId;
  readonly file: string;
  readonly sourcePackageId: string;
  readonly transform: CardTransform;
  readonly transformPackageId: string | null;
}

export interface ResolvedImageAsset {
  readonly file: string;
  readonly sourcePackageId: string;
}

export interface ResolvedDeckPackageDraft {
  readonly formatVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly author: string;
  readonly license: string;
  readonly framePolicy: "game";
  readonly inheritanceChain: readonly string[];
  readonly cardFaces: Readonly<Partial<Record<CardId, ResolvedCardArt>>>;
  readonly cardBack: ResolvedImageAsset | null;
  readonly preview: DeckPreviewMetadata | null;
}

export interface ResolvedDeckPackage extends Omit<
  ResolvedDeckPackageDraft,
  "cardFaces" | "cardBack"
> {
  readonly cardFaces: Readonly<Record<CardId, ResolvedCardArt>>;
  readonly cardBack: ResolvedImageAsset;
}

export interface DeckResolutionRegistry {
  readonly packages: Readonly<Record<string, DeckPackageV1>>;
  readonly transforms: Readonly<Record<string, DeckTransformsV1>>;
}

export interface DeckPackageValidationSummary {
  readonly packageId: string;
  readonly resolvedCardCount: number;
  readonly inheritedCardCount: number;
  readonly autoTransformCount: number;
  readonly manualTransformCount: number;
  readonly inheritanceChain: readonly string[];
}

export interface DeckRegistryValidationReport {
  readonly issues: readonly DeckValidationIssue[];
  readonly summaries: readonly DeckPackageValidationSummary[];
  readonly resolvedPackages: Readonly<Record<string, ResolvedDeckPackageDraft>>;
}

export interface SourceImageMetadata extends PixelSize {
  readonly format: "png" | "jpeg" | "webp";
}

export interface DerivativePlan {
  readonly output: PixelSize;
  readonly normalizedSourceCrop: NormalizedRectangle;
  readonly sourcePixelCrop: PixelRectangle;
  readonly normalizedContentBox: NormalizedRectangle;
  readonly rotationDeg: number;
}
