import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import type { BoardLayout, BoardRect } from "../board/types";
import { computeCardPlacements, computeDrawPileTopBounds } from "../cards/card-layout";
import type { CardDisplayPlacement, CardPlacement } from "../cards/types";
import type { AnimationClipV1, AnimationMode } from "./types";

const MOVEMENT_CLIPS = new Set(["travel", "capture", "reflow", "draw"]);

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) throw new RangeError("Animation progress must be finite.");
  return Math.min(1, Math.max(0, progress));
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function lerpRect(from: BoardRect, to: BoardRect, progress: number): BoardRect {
  return Object.freeze({
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    width: lerp(from.width, to.width, progress),
    height: lerp(from.height, to.height, progress),
  });
}

function drawTravelRect(from: BoardRect, to: BoardRect, progress: number): BoardRect {
  const linear = lerpRect(from, to, progress);
  const lift = Math.min(from.height * 0.16, 16) * Math.sin(Math.PI * progress);
  return Object.freeze({ ...linear, y: linear.y - lift });
}

function captureOverlapRect(
  clip: AnimationClipV1,
  fromById: ReadonlyMap<CardId, CardPlacement>,
): BoardRect | null {
  const overlap = clip.captureOverlap;
  if (!overlap) return null;
  const anchor = fromById.get(overlap.targetFieldCardId);
  if (!anchor || anchor.zone !== "field") return null;
  return Object.freeze({
    ...anchor.bounds,
    x: anchor.bounds.x + anchor.bounds.width * overlap.horizontalOffsetRatio,
    y: anchor.bounds.y + anchor.bounds.height * overlap.verticalOffsetRatio,
  });
}

function byCardId(placements: readonly CardPlacement[]): ReadonlyMap<CardId, CardPlacement> {
  return new Map(placements.map((placement) => [placement.cardId, placement]));
}

export function computeAnimatedCardPlacements(
  layout: BoardLayout,
  clip: AnimationClipV1,
  rawProgress: number,
  mode: AnimationMode,
): readonly CardDisplayPlacement[] {
  const progress = clampProgress(rawProgress);
  const eased = easeOutCubic(progress);
  const fromById = byCardId(computeCardPlacements(layout, clip.from));
  const toById = byCardId(computeCardPlacements(layout, clip.to));
  const drawPileTop = clip.kind === "draw" ? computeDrawPileTopBounds(layout, clip.from) : null;
  const affected = new Set(clip.affectedCardIds);
  const overlapGeometry = clip.captureAnchorProjection
    ? byCardId(computeCardPlacements(layout, clip.captureAnchorProjection))
    : fromById;
  const overlapBounds = captureOverlapRect(clip, overlapGeometry);

  return Object.freeze(
    CARD_IDS.map((cardId) => {
      const from = fromById.get(cardId);
      const to = toById.get(cardId);
      if (!from || !to) throw new Error(`Animation clip is missing ${cardId}.`);
      if (!affected.has(cardId)) {
        return Object.freeze({ ...(clip.settlesProjection ? to : from) });
      }

      const isOverlapSource =
        clip.captureOverlap?.sourceCardId === cardId && overlapBounds !== null;
      if (mode === "reducedMotion") {
        // Reduced motion removes travel, not the capture's spatial meaning. During the
        // brief capture hold the source still rests over the authoritative field card
        // rather than snapping to the semantic transit slot at board centre.
        if (isOverlapSource && (clip.kind === "travel" || clip.kind === "alignment")) {
          return Object.freeze({
            ...to,
            bounds: overlapBounds,
            faceUp: from.faceUp || to.faceUp,
            layer: "EffectsLayer" as const,
            zone: "transit" as const,
            slotId: `transit:${cardId}`,
            zIndex: 1000 + to.zIndex,
            alpha: 0.45 + 0.55 * eased,
            scaleX: 0.97 + 0.03 * eased,
            scaleY: 0.97 + 0.03 * eased,
          });
        }
        return Object.freeze({
          ...to,
          alpha: 0.45 + 0.55 * eased,
          scaleX: 0.97 + 0.03 * eased,
          scaleY: 0.97 + 0.03 * eased,
        });
      }

      if (isOverlapSource && clip.kind === "alignment") {
        return Object.freeze({
          ...to,
          bounds: overlapBounds,
          faceUp: from.faceUp || to.faceUp,
          layer: "EffectsLayer" as const,
          zone: "transit" as const,
          slotId: `transit:${cardId}`,
          zIndex: 1000 + to.zIndex,
        });
      }

      if (MOVEMENT_CLIPS.has(clip.kind)) {
        const movementFrom =
          isOverlapSource && clip.kind === "capture"
            ? overlapBounds
            : clip.kind === "draw" && drawPileTop
              ? drawPileTop
              : from.bounds;
        const movementTo = isOverlapSource && clip.kind === "travel" ? overlapBounds : to.bounds;
        return Object.freeze({
          ...to,
          bounds:
            clip.kind === "draw"
              ? drawTravelRect(movementFrom, movementTo, eased)
              : lerpRect(movementFrom, movementTo, eased),
          faceUp: clip.kind === "draw" ? from.faceUp : progress < 0.5 ? from.faceUp : to.faceUp,
          layer: "EffectsLayer" as const,
          zone: "transit" as const,
          slotId: `transit:${cardId}`,
          zIndex: 1000 + to.zIndex,
        });
      }

      if (clip.kind === "flip") {
        return Object.freeze({
          ...to,
          faceUp: progress >= 0.5 ? to.faceUp : false,
          scaleX: Math.max(0.04, Math.abs(Math.cos(Math.PI * progress))),
          scaleY: 1,
        });
      }

      if (clip.kind === "selection" || clip.kind === "alignment" || clip.kind === "feedback") {
        const pulse = 1 + 0.06 * Math.sin(Math.PI * progress);
        return Object.freeze({ ...to, scaleX: pulse, scaleY: pulse });
      }

      return Object.freeze({ ...to });
    }),
  );
}
