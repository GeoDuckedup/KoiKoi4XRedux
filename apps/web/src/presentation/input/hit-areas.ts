import { getCardDefinition, getMonthDefinition, type CardId } from "@koikoi4x/engine";

import type { PresentationBoardProjection } from "../animation/types";
import type { BoardLayout, BoardRect } from "../board/types";
import { computeCardPlacements } from "../cards/card-layout";
import type { CardHitAreaV1, InputInteractionInspectionV1, SemanticCardControlV1 } from "./types";

function targetActionLabel(kind: InputInteractionInspectionV1["handResolutionKind"]): string {
  if (kind === "capturePair") return "confirm matching capture";
  if (kind === "fourCardSweep") return "confirm four-card sweep";
  return "choose legal capture target";
}

function freezeRect(rect: BoardRect): BoardRect {
  return Object.freeze({ ...rect });
}

function containedHandRect(bounds: BoardRect, layout: BoardLayout): BoardRect {
  const height = Math.max(bounds.height, Math.min(44, layout.safeBounds.height));
  return freezeRect({
    x: bounds.x,
    y: Math.min(
      layout.safeBounds.y + layout.safeBounds.height - height,
      Math.max(layout.safeBounds.y, bounds.y - (height - bounds.height) / 2),
    ),
    width: bounds.width,
    height,
  });
}

function partitionedFieldBounds(
  placements: readonly ReturnType<typeof computeCardPlacements>[number][],
  layout: BoardLayout,
): ReadonlyMap<CardId, BoardRect> {
  const fieldPlacements = placements
    .filter(({ zone }) => zone === "field")
    .sort((left, right) => left.bounds.y - right.bounds.y || left.bounds.x - right.bounds.x);
  const rows: (typeof fieldPlacements)[] = [];
  for (const placement of fieldPlacements) {
    const row = rows.find(
      (candidate) => Math.abs((candidate[0]?.bounds.y ?? -1) - placement.bounds.y) < 0.01,
    );
    if (row) row.push(placement);
    else rows.push([placement]);
  }
  const field = layout.cardZones.field;
  const partitioned = new Map<CardId, BoardRect>();
  for (const [rowIndex, row] of rows.entries()) {
    row.sort((left, right) => left.bounds.x - right.bounds.x);
    const previousRow = rows[rowIndex - 1];
    const nextRow = rows[rowIndex + 1];
    const sample = row[0];
    if (!sample) continue;
    const gapAbove = previousRow?.[0]
      ? Math.max(0, sample.bounds.y - (previousRow[0].bounds.y + previousRow[0].bounds.height))
      : nextRow?.[0]
        ? Math.max(0, nextRow[0].bounds.y - (sample.bounds.y + sample.bounds.height))
        : 0;
    const gapBelow = nextRow?.[0]
      ? Math.max(0, nextRow[0].bounds.y - (sample.bounds.y + sample.bounds.height))
      : gapAbove;
    for (const [columnIndex, placement] of row.entries()) {
      const previous = row[columnIndex - 1];
      const next = row[columnIndex + 1];
      const gapLeft = previous
        ? Math.max(0, placement.bounds.x - (previous.bounds.x + previous.bounds.width))
        : next
          ? Math.max(0, next.bounds.x - (placement.bounds.x + placement.bounds.width))
          : 0;
      const gapRight = next
        ? Math.max(0, next.bounds.x - (placement.bounds.x + placement.bounds.width))
        : gapLeft;
      const left = Math.max(field.x, placement.bounds.x - gapLeft / 2);
      const right = Math.min(
        field.x + field.width,
        placement.bounds.x + placement.bounds.width + gapRight / 2,
      );
      const top = Math.max(field.y, placement.bounds.y - gapAbove / 2);
      const bottom = Math.min(
        field.y + field.height,
        placement.bounds.y + placement.bounds.height + gapBelow / 2,
      );
      partitioned.set(
        placement.cardId,
        freezeRect({ x: left, y: top, width: right - left, height: bottom - top }),
      );
    }
  }
  return partitioned;
}

export function computeCardHitAreas(input: {
  layout: BoardLayout;
  projection: PresentationBoardProjection;
  selectableCardIds: readonly CardId[];
  legalTargetCardIds: readonly CardId[];
}): readonly CardHitAreaV1[] {
  const placements = computeCardPlacements(input.layout, input.projection);
  const byCardId = new Map(placements.map((placement) => [placement.cardId, placement]));
  const handPlacements = placements
    .filter(({ zone }) => zone === "playerHand")
    .sort((left, right) => left.bounds.x - right.bounds.x);
  const partitionedHandBounds = new Map<CardId, BoardRect>();
  const fieldBounds = partitionedFieldBounds(placements, input.layout);
  for (const [index, placement] of handPlacements.entries()) {
    const previous = handPlacements[index - 1];
    const next = handPlacements[index + 1];
    const center = placement.bounds.x + placement.bounds.width / 2;
    const left = previous
      ? (previous.bounds.x + previous.bounds.width / 2 + center) / 2
      : placement.bounds.x;
    const right = next
      ? (center + next.bounds.x + next.bounds.width / 2) / 2
      : placement.bounds.x + placement.bounds.width;
    partitionedHandBounds.set(
      placement.cardId,
      freezeRect({
        x: left,
        y: placement.bounds.y,
        width: right - left,
        height: placement.bounds.height,
      }),
    );
  }

  const areas: CardHitAreaV1[] = [];
  const selectableCardIds = new Set(input.selectableCardIds);
  for (const placement of handPlacements) {
    if (!selectableCardIds.has(placement.cardId)) continue;
    const bounds = partitionedHandBounds.get(placement.cardId) ?? placement.bounds;
    areas.push(
      Object.freeze({
        cardId: placement.cardId,
        role: "selectable",
        bounds: containedHandRect(bounds, input.layout),
      }),
    );
  }
  for (const cardId of input.legalTargetCardIds) {
    const placement = byCardId.get(cardId);
    if (!placement || placement.zone !== "field") continue;
    areas.push(
      Object.freeze({
        cardId,
        role: "target",
        bounds: fieldBounds.get(cardId) ?? freezeRect(placement.bounds),
      }),
    );
  }
  return Object.freeze(areas);
}

export function buildSemanticCardControls(input: {
  inspection: InputInteractionInspectionV1;
  layout: BoardLayout;
  projection: PresentationBoardProjection;
}): readonly SemanticCardControlV1[] {
  const areas = computeCardHitAreas({
    layout: input.layout,
    projection: input.projection,
    selectableCardIds: input.inspection.selectableCardIds,
    legalTargetCardIds: input.inspection.legalTargetCardIds,
  });
  return Object.freeze(
    areas.map((area) => {
      const card = getCardDefinition(area.cardId);
      const month = getMonthDefinition(card.month);
      const selected = input.inspection.selectedCardId === area.cardId;
      const actionLabel =
        area.role === "target"
          ? targetActionLabel(input.inspection.handResolutionKind)
          : selected
            ? "selected card; activate again to cancel"
            : "select card";
      return Object.freeze({
        ...area,
        actionLabel,
        ariaLabel: `${month.name} ${card.displayName}, ${month.flower}, ${card.category}. ${actionLabel}.`,
        category: card.category,
        focused: input.inspection.focusedCardId === area.cardId,
        monthName: month.name,
        selected,
      });
    }),
  );
}
