import { getCardDefinition, type CardId } from "../cards/catalog";
import { deepFreeze } from "../state/freeze";
import { rejectCommand } from "../state/errors";
import type { HandPlayResolutionPreviewV1 } from "../state/types";

export interface CaptureInspectionV1 {
  readonly sourceCardId: CardId;
  readonly matchingFieldCardIds: readonly CardId[];
  readonly matchCount: 0 | 1 | 2 | 3;
}

export type CaptureResolutionV1 =
  | {
      readonly kind: "placed";
      readonly sourceCardId: CardId;
      readonly field: readonly CardId[];
      readonly capturedCardIds: readonly [];
      readonly matchingFieldCardIds: readonly [];
    }
  | {
      readonly kind: "choiceRequired";
      readonly sourceCardId: CardId;
      readonly field: readonly CardId[];
      readonly capturedCardIds: readonly [];
      readonly matchingFieldCardIds: readonly [CardId, CardId];
    }
  | {
      readonly kind: "captured";
      readonly sourceCardId: CardId;
      readonly field: readonly CardId[];
      readonly capturedCardIds: readonly CardId[];
      readonly matchingFieldCardIds: readonly CardId[];
      readonly captureKind: "pair" | "fourCardSweep";
    };

export function inspectCapture(
  field: readonly CardId[],
  sourceCardId: CardId,
): CaptureInspectionV1 {
  const sourceMonth = getCardDefinition(sourceCardId).month;
  const matchingFieldCardIds = field.filter(
    (fieldCardId) => getCardDefinition(fieldCardId).month === sourceMonth,
  );
  if (matchingFieldCardIds.length > 3) {
    rejectCommand(
      "CAPTURE_MATCH_COUNT_INVALID",
      "A source card cannot face more than three same-month field cards.",
    );
  }
  return deepFreeze({
    sourceCardId,
    matchingFieldCardIds,
    matchCount: matchingFieldCardIds.length as 0 | 1 | 2 | 3,
  });
}

export function getHandPlayResolutionPreview(
  field: readonly CardId[],
  sourceCardId: CardId,
): HandPlayResolutionPreviewV1 {
  const inspection = inspectCapture(field, sourceCardId);
  if (inspection.matchCount === 0) {
    return deepFreeze({ kind: "placeOnField", matchingFieldCardIds: [] });
  }
  if (inspection.matchCount === 1) {
    return deepFreeze({
      kind: "capturePair",
      matchingFieldCardIds: inspection.matchingFieldCardIds as readonly [CardId],
    });
  }
  if (inspection.matchCount === 2) {
    return deepFreeze({
      kind: "captureChoice",
      matchingFieldCardIds: inspection.matchingFieldCardIds as readonly [CardId, CardId],
    });
  }
  return deepFreeze({
    kind: "fourCardSweep",
    matchingFieldCardIds: inspection.matchingFieldCardIds as readonly [CardId, CardId, CardId],
  });
}

export function resolveCapture(
  field: readonly CardId[],
  sourceCardId: CardId,
  targetFieldCardId?: CardId,
): CaptureResolutionV1 {
  const inspection = inspectCapture(field, sourceCardId);
  if (inspection.matchCount === 0) {
    if (targetFieldCardId !== undefined) {
      rejectCommand("CAPTURE_TARGET_NOT_ALLOWED", "A zero-match placement cannot select a target.");
    }
    return deepFreeze({
      kind: "placed",
      sourceCardId,
      field: [...field, sourceCardId],
      capturedCardIds: [],
      matchingFieldCardIds: [],
    });
  }

  if (inspection.matchCount === 2 && targetFieldCardId === undefined) {
    return deepFreeze({
      kind: "choiceRequired",
      sourceCardId,
      field: [...field],
      capturedCardIds: [],
      matchingFieldCardIds: inspection.matchingFieldCardIds as readonly [CardId, CardId],
    });
  }

  if (inspection.matchCount !== 2 && targetFieldCardId !== undefined) {
    rejectCommand(
      "CAPTURE_TARGET_NOT_ALLOWED",
      "Only an exact two-match capture accepts a selected target.",
    );
  }

  let selectedFieldCardIds: readonly CardId[];
  if (inspection.matchCount === 2) {
    if (
      targetFieldCardId === undefined ||
      !inspection.matchingFieldCardIds.includes(targetFieldCardId)
    ) {
      rejectCommand("CAPTURE_TARGET_ILLEGAL", "Selected card is not a legal same-month target.");
    }
    selectedFieldCardIds = [targetFieldCardId];
  } else {
    selectedFieldCardIds = inspection.matchingFieldCardIds;
  }

  const selected = new Set(selectedFieldCardIds);
  return deepFreeze({
    kind: "captured",
    sourceCardId,
    field: field.filter((cardId) => !selected.has(cardId)),
    capturedCardIds: [sourceCardId, ...selectedFieldCardIds],
    matchingFieldCardIds: selectedFieldCardIds,
    captureKind: inspection.matchCount === 3 ? "fourCardSweep" : "pair",
  });
}
