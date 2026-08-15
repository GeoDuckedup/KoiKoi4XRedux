import type { PlayerObservationV1 } from "@koikoi4x/engine";

import type { InputInteractionInspectionV1 } from "./types";

/**
 * Presentation-only start-of-turn affordance. It deliberately relies on the
 * already recipient-safe observation and controller inspection rather than
 * deriving any game legality from the board.
 */
export function shouldShowHandPlayAttention(input: {
  readonly inspection: InputInteractionInspectionV1;
  readonly observation: PlayerObservationV1;
}): boolean {
  const { inspection, observation } = input;
  const phase = observation.publicState.phase;
  return (
    phase.kind === "awaitingHandPlay" &&
    phase.playerId === observation.playerId &&
    inspection.status === "idle" &&
    inspection.lockReason === null &&
    inspection.selectedCardId === null &&
    inspection.selectableCardIds.length > 0
  );
}
