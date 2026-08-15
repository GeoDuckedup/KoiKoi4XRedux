import type { PlayerObservationV1 } from "@koikoi4x/engine";

import type { InputInteractionInspectionV1 } from "../presentation/input/types";

export interface ContextualHelpPresentationV1 {
  readonly steps: readonly string[];
  readonly summary: string;
  readonly title: string;
}

function freezePresentation(input: ContextualHelpPresentationV1): ContextualHelpPresentationV1 {
  return Object.freeze({ ...input, steps: Object.freeze([...input.steps]) });
}

/**
 * Explains the currently available interaction without evaluating the table or offering strategy.
 * The observation has already applied the recipient/privacy boundary; this function deliberately
 * consumes no authoritative state outside it.
 */
export function createContextualHelpPresentation(input: {
  readonly inspection: InputInteractionInspectionV1;
  readonly observation: PlayerObservationV1;
}): ContextualHelpPresentationV1 {
  const { inspection, observation } = input;
  const phase = observation.publicState.phase;
  if (inspection.status === "locked" || inspection.status === "intentPending") {
    return freezePresentation({
      title: "Table is updating",
      summary: "Wait for the table to settle before taking another action.",
      steps: ["Card controls become available again when the current public update is complete."],
    });
  }
  if (inspection.status === "decision") {
    const choices = new Set(inspection.decisionChoices);
    return freezePresentation({
      title: "Choose the yaku decision",
      summary: "A completed yaku requires an explicit decision.",
      steps: [
        ...(choices.has("bank") ? ["Bank ends this round and awards the displayed points."] : []),
        ...(choices.has("koiKoi")
          ? ["Call Koi-Koi to continue the round at the displayed table multiplier."]
          : []),
      ],
    });
  }
  if (phase.kind === "awaitingDrawResolution") {
    if (inspection.status === "idle") {
      return freezePresentation({
        title: "Resolve the revealed card",
        summary: "This Draw is part of the current turn.",
        steps: ["Tap the Reveal card to see its legal table outcome."],
      });
    }
    if (inspection.fieldPlacementAvailable) {
      return freezePresentation({
        title: "Place the revealed card",
        summary: "The revealed card has no matching field card.",
        steps: ["Tap the gold field perimeter. Its final position is automatic."],
      });
    }
    return freezePresentation({
      title: "Complete the Draw capture",
      summary: "The gold field cards are the legal capture choices.",
      steps: ["Tap one gold matching field card to finish the Draw."],
    });
  }
  if (phase.kind === "awaitingHandPlay") {
    if (inspection.status === "idle") {
      return freezePresentation({
        title: "Play a card from your hand",
        summary: "Start the turn by selecting one card from your Hand.",
        steps: ["Matching cards share a month.", "After selection, follow the gold field cue."],
      });
    }
    if (inspection.fieldPlacementAvailable) {
      return freezePresentation({
        title: "Place the selected card",
        summary: "The selected card has no matching field card.",
        steps: ["Tap the gold field perimeter. Its final position is automatic."],
      });
    }
    return freezePresentation({
      title: "Complete the hand capture",
      summary:
        inspection.legalTargetCardIds.length === 1
          ? "The gold field card is the matching capture."
          : "The gold field cards are the legal capture choices.",
      steps: ["Tap a gold matching field card to complete this play."],
    });
  }
  return freezePresentation({
    title: "Round complete",
    summary: "Review the result before beginning the next local round.",
    steps: ["Use the result action when you are ready to continue."],
  });
}
