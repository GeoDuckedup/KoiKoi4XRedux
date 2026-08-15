import type { CardId, PlayerObservationV1 } from "@koikoi4x/engine";

import type { PresentationBoardProjection } from "../animation/types";
import type { BoardLayout } from "../board/types";
import { computeCardPlacements } from "../cards/card-layout";
import type { InputInteractionInspectionV1 } from "./types";

/**
 * Presentation-only Draw affordance. The controller remains the sole source of
 * selectable cards and legal targets; this merely identifies its one settled,
 * local Reveal source before the player has selected it.
 */
export function shouldShowRevealPlayAttention(input: {
  readonly inspection: InputInteractionInspectionV1;
  readonly observation: PlayerObservationV1;
}): boolean {
  const { inspection, observation } = input;
  const phase = observation.publicState.phase;
  return (
    phase.kind === "awaitingDrawResolution" &&
    phase.playerId === observation.playerId &&
    inspection.status === "idle" &&
    inspection.lockReason === null &&
    inspection.selectedCardId === null &&
    inspection.legalTargetCardIds.length === 0 &&
    inspection.selectableCardIds.length === 1 &&
    inspection.selectableCardIds[0] === phase.drawnCardId
  );
}

/**
 * The cue follows only a face-up, actually rendered Reveal card. This keeps an
 * in-flight or still-hidden Draw from receiving a premature interaction cue.
 */
export function findFaceUpRevealPlacement(input: {
  readonly layout: BoardLayout;
  readonly projection: PresentationBoardProjection;
  readonly drawnCardId: CardId;
}): ReturnType<typeof computeCardPlacements>[number] | null {
  return (
    computeCardPlacements(input.layout, input.projection).find(
      ({ cardId, faceUp, zone }) => cardId === input.drawnCardId && faceUp && zone === "reveal",
    ) ?? null
  );
}
