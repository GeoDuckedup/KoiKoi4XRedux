import type { CardId } from "@koikoi4x/engine";

import type { PresentationBoardProjection } from "../animation/types";
import type { BoardLayout } from "../board/types";
import { computeCardPlacements } from "../cards/card-layout";
import type { InputInteractionInspectionV1 } from "./types";

export type FieldDestinationAttentionKindV1 = "targets" | "fieldPlacement";

export interface FieldDestinationAttentionV1 {
  readonly kind: FieldDestinationAttentionKindV1;
  readonly legalTargetCardIds: readonly CardId[];
}

/**
 * Presentation-only destination affordance. Its input is deliberately the
 * controller inspection: the renderer never derives matches or placements.
 */
export function resolveFieldDestinationAttention(input: {
  readonly inspection: InputInteractionInspectionV1;
}): FieldDestinationAttentionV1 | null {
  const { inspection } = input;
  const selectingDestination =
    inspection.selectedCardId !== null &&
    (inspection.status === "confirming" || inspection.status === "targeting");
  if (!selectingDestination) return null;
  if (inspection.fieldPlacementAvailable) {
    return Object.freeze({
      kind: "fieldPlacement",
      legalTargetCardIds: Object.freeze([]),
    });
  }
  if (inspection.legalTargetCardIds.length === 0) return null;
  return Object.freeze({
    kind: "targets",
    legalTargetCardIds: Object.freeze([...inspection.legalTargetCardIds]),
  });
}

/** Only visible field cards receive a decorative target ring. */
export function findFaceUpLegalFieldPlacements(input: {
  readonly layout: BoardLayout;
  readonly projection: PresentationBoardProjection;
  readonly legalTargetCardIds: readonly CardId[];
}): readonly ReturnType<typeof computeCardPlacements>[number][] {
  const placementsByCardId = new Map(
    computeCardPlacements(input.layout, input.projection).map((placement) => [
      placement.cardId,
      placement,
    ]),
  );
  return Object.freeze(
    input.legalTargetCardIds.flatMap((cardId) => {
      const placement = placementsByCardId.get(cardId);
      return placement?.zone === "field" && placement.faceUp ? [placement] : [];
    }),
  );
}
