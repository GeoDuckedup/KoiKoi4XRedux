import type { BoardLayout, BoardLayerName, BoardRect, CardZone } from "../board/types";
import type { CardPlacement, CardPresentationState } from "./types";

const ZONE_LAYERS = Object.freeze({
  drawPile: "DrawPileLayer",
  reveal: "RevealLayer",
  playerHand: "PlayerHandLayer",
  opponentHand: "OpponentHandLayer",
  field: "FieldLayer",
  playerBrights: "PlayerCaptureLayer",
  playerAnimals: "PlayerCaptureLayer",
  playerScrolls: "PlayerCaptureLayer",
  playerPlains: "PlayerCaptureLayer",
  opponentBrights: "OpponentCaptureLayer",
  opponentAnimals: "OpponentCaptureLayer",
  opponentScrolls: "OpponentCaptureLayer",
  opponentPlains: "OpponentCaptureLayer",
  transit: "EffectsLayer",
} as const satisfies Readonly<Record<CardZone, BoardLayerName>>);

const CAPTURE_ZONES = new Set<CardZone>([
  "playerBrights",
  "playerAnimals",
  "playerScrolls",
  "playerPlains",
  "opponentBrights",
  "opponentAnimals",
  "opponentScrolls",
  "opponentPlains",
]);

function freezeRect(rect: BoardRect): BoardRect {
  return Object.freeze({ ...rect });
}

function captureBounds(
  zone: BoardRect,
  slotIndex: number,
  count: number,
  layout: BoardLayout,
): BoardRect {
  const verticalPadding = Math.max(3, Math.min(zone.height * 0.15, 9 * layout.scale));
  const height = Math.max(8, zone.height - verticalPadding * 2);
  const width = height * (5 / 8);
  const labelReserve = Math.min(zone.width * 0.42, 72 * layout.scale);
  const availableWidth = Math.max(width, zone.width - labelReserve - verticalPadding * 2);
  const overlap = count <= 1 ? 0 : Math.max(2, (availableWidth - width) / (count - 1));
  const visibleFanWidth = width + overlap * Math.max(0, count - 1);
  return freezeRect({
    x: zone.x + zone.width - verticalPadding - visibleFanWidth + overlap * slotIndex,
    y: zone.y + (zone.height - height) / 2,
    width,
    height,
  });
}

function boundsFor(
  state: CardPresentationState,
  zoneCounts: ReadonlyMap<CardZone, number>,
  layout: BoardLayout,
): BoardRect {
  if (state.zone === "playerHand" || state.zone === "opponentHand" || state.zone === "field") {
    const slots = layout.slots[state.zone];
    const slot = slots[state.slotIndex];
    if (!slot) throw new RangeError(`${state.slotId} does not fit the ${state.zone} layout.`);
    return freezeRect(slot);
  }
  if (state.zone === "drawPile") {
    const offset = Math.min(state.slotIndex, 3) * Math.max(0.8, 1.4 * layout.scale);
    return freezeRect({
      ...layout.slots.drawPile,
      x: layout.slots.drawPile.x - offset,
      y: layout.slots.drawPile.y + offset,
    });
  }
  if (state.zone === "reveal") return freezeRect(layout.slots.reveal);
  if (CAPTURE_ZONES.has(state.zone)) {
    return captureBounds(
      layout.cardZones[state.zone],
      state.slotIndex,
      zoneCounts.get(state.zone) ?? 0,
      layout,
    );
  }
  const metrics = layout.cardMetrics;
  const transit = layout.cardZones.transit;
  return freezeRect({
    x: transit.x + (transit.width - metrics.width) / 2,
    y: transit.y + (transit.height - metrics.height) / 2,
    width: metrics.width,
    height: metrics.height,
  });
}

export function computeCardPlacements(
  layout: BoardLayout,
  states: readonly CardPresentationState[],
): readonly CardPlacement[] {
  const zoneCounts = new Map<CardZone, number>();
  for (const state of states) zoneCounts.set(state.zone, (zoneCounts.get(state.zone) ?? 0) + 1);

  return Object.freeze(
    states.map((state) =>
      Object.freeze({
        ...state,
        bounds: boundsFor(state, zoneCounts, layout),
        layer: ZONE_LAYERS[state.zone],
      }),
    ),
  );
}
