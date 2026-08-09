import type { CardId, PublicGameEventV1 } from "@koikoi4x/engine";

import type { CardPresentationState } from "../cards/types";

export const ANIMATION_MODES = Object.freeze([
  "normal",
  "fast",
  "instant",
  "reducedMotion",
] as const);

export type AnimationMode = (typeof ANIMATION_MODES)[number];

export const ANIMATION_CLIP_KINDS = Object.freeze([
  "selection",
  "travel",
  "alignment",
  "capture",
  "reflow",
  "draw",
  "flip",
  "revealPause",
  "feedback",
] as const);

export type AnimationClipKind = (typeof ANIMATION_CLIP_KINDS)[number];
export type PresentationBoardProjection = readonly CardPresentationState[];
export type AnimationCompletion = "cancelled" | "completed" | "finished";

export interface AnimationPlanningContextV1 {
  /** One trusted recipient-safe projection before every event, plus the final projection. */
  readonly projections: readonly PresentationBoardProjection[];
}

export interface AnimationClipV1 {
  readonly affectedCardIds: readonly CardId[];
  readonly durationMs: number;
  readonly eventIndex: number;
  readonly eventType: PublicGameEventV1["type"];
  readonly from: PresentationBoardProjection;
  readonly id: string;
  readonly kind: AnimationClipKind;
  readonly to: PresentationBoardProjection;
}

export interface PresentationAnimationPlanV1 {
  readonly clips: readonly AnimationClipV1[];
  readonly eventCount: number;
  readonly id: string;
  readonly source: PresentationBoardProjection;
  readonly target: PresentationBoardProjection;
}

export interface AnimationSurfaceV1 {
  renderClip: (clip: AnimationClipV1, progress: number, mode: AnimationMode) => void;
  snapTo: (projection: PresentationBoardProjection) => void;
}

export interface AnimationInspectionV1 {
  readonly activeClip: {
    readonly durationMs: number;
    readonly elapsedMs: number;
    readonly eventType: PublicGameEventV1["type"];
    readonly index: number;
    readonly kind: AnimationClipKind;
    readonly progress: number;
  } | null;
  readonly displayFingerprint: string;
  readonly lastCompletion: AnimationCompletion | null;
  readonly mode: AnimationMode;
  readonly planId: string | null;
  readonly queuedClipCount: number;
  readonly queuedPlanCount: number;
  readonly speedMultiplier: number;
  readonly status: "cancelled" | "completed" | "destroyed" | "finished" | "idle" | "playing";
  readonly targetFingerprint: string;
}

export interface AnimationDirectorV1 {
  accelerate: () => void;
  advanceBy: (deltaMs: number) => void;
  cancelAndSnapTo: (projection: PresentationBoardProjection) => Promise<void>;
  destroy: () => void;
  finishImmediately: () => Promise<void>;
  inspect: () => AnimationInspectionV1;
  isBusy: () => boolean;
  play: (
    events: readonly PublicGameEventV1[],
    context: AnimationPlanningContextV1,
  ) => Promise<AnimationCompletion>;
  setMode: (mode: AnimationMode) => void;
}
