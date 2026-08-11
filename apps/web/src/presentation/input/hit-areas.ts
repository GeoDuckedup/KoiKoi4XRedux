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

function containedExpandedRect(bounds: BoardRect, layout: BoardLayout): BoardRect {
  const minWidth = Math.min(44, layout.safeBounds.width);
  const minHeight = Math.min(44, layout.safeBounds.height);
  const width = Math.max(bounds.width, minWidth);
  const height = Math.max(bounds.height, minHeight);
  return freezeRect({
    x: Math.min(
      layout.safeBounds.x + layout.safeBounds.width - width,
      Math.max(layout.safeBounds.x, bounds.x - (width - bounds.width) / 2),
    ),
    y: Math.min(
      layout.safeBounds.y + layout.safeBounds.height - height,
      Math.max(layout.safeBounds.y, bounds.y - (height - bounds.height) / 2),
    ),
    width,
    height,
  });
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
        bounds: containedExpandedRect(placement.bounds, input.layout),
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
