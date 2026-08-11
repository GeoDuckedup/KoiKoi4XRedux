import type { BoardCardMetrics, BoardLayout, BoardRect } from "./types";

export const MAX_PLAYABLE_FIELD_CARD_COUNT = 17 as const;
export const ADAPTIVE_FIELD_LAYOUT_VERSION = 1 as const;

const CARD_ASPECT_RATIO = 5 / 8;
const BASE_FIELD_CARD_CAPACITY = 8;

export interface AdaptiveFieldLayoutV1 {
  readonly version: typeof ADAPTIVE_FIELD_LAYOUT_VERSION;
  readonly cardMetrics: BoardCardMetrics;
  readonly columns: number;
  readonly fieldCardCount: number;
  readonly gap: number;
  readonly rows: number;
  readonly slots: readonly BoardRect[];
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function freezeRect(bounds: BoardRect): BoardRect {
  return Object.freeze({
    x: rounded(bounds.x),
    y: rounded(bounds.y),
    width: rounded(bounds.width),
    height: rounded(bounds.height),
  });
}

function contentBounds(slots: readonly BoardRect[]): BoardRect {
  const first = slots[0];
  if (!first) throw new Error("Adaptive field layout requires the base field slots.");
  const minimumX = Math.min(...slots.map(({ x }) => x));
  const minimumY = Math.min(...slots.map(({ y }) => y));
  const maximumX = Math.max(...slots.map(({ x, width }) => x + width));
  const maximumY = Math.max(...slots.map(({ y, height }) => y + height));
  return freezeRect({
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX,
    height: maximumY - minimumY,
  });
}

function baseGap(slots: readonly BoardRect[]): number {
  const first = slots[0];
  const second = slots[1];
  const fifth = slots[4];
  if (!first || !second || !fifth) {
    throw new Error("Adaptive field layout requires the complete 2 × 4 base grid.");
  }
  return Math.max(1, Math.min(second.x - first.x - first.width, fifth.y - first.y - first.height));
}

function cardWidthForGrid(bounds: BoardRect, gap: number, columns: number, rows: number): number {
  const width = (bounds.width - gap * (columns - 1)) / columns;
  const height = (bounds.height - gap * (rows - 1)) / rows;
  return Math.min(width, height * CARD_ASPECT_RATIO);
}

function selectGrid(
  bounds: BoardRect,
  gap: number,
  count: number,
): {
  readonly columns: number;
  readonly rows: number;
  readonly width: number;
} {
  let selected: { columns: number; rows: number; width: number; empty: number } | null = null;
  for (let columns = 2; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    if (rows < 2) continue;
    const width = cardWidthForGrid(bounds, gap, columns, rows);
    if (!Number.isFinite(width) || width <= 0) continue;
    const candidate = { columns, rows, width, empty: columns * rows - count };
    if (
      selected === null ||
      candidate.width > selected.width + 0.001 ||
      (Math.abs(candidate.width - selected.width) <= 0.001 &&
        (candidate.empty < selected.empty ||
          (candidate.empty === selected.empty && candidate.rows < selected.rows)))
    ) {
      selected = candidate;
    }
  }
  if (!selected) throw new Error(`No adaptive field grid fits ${count} cards.`);
  return Object.freeze({
    columns: selected.columns,
    rows: selected.rows,
    width: selected.width,
  });
}

function cardMetrics(width: number): BoardCardMetrics {
  return Object.freeze({
    width: rounded(width),
    height: rounded(width / CARD_ASPECT_RATIO),
    cornerRadius: rounded(Math.max(2, Math.min(10, width * 0.1))),
  });
}

export function computeAdaptiveFieldLayout(
  layout: BoardLayout,
  fieldCardCount: number,
): AdaptiveFieldLayoutV1 {
  if (!Number.isSafeInteger(fieldCardCount) || fieldCardCount < 0) {
    throw new RangeError("Adaptive field card count must be a non-negative safe integer.");
  }
  if (fieldCardCount > MAX_PLAYABLE_FIELD_CARD_COUNT) {
    throw new RangeError(
      `Adaptive field layout supports the legal ${MAX_PLAYABLE_FIELD_CARD_COUNT}-card bound.`,
    );
  }
  if (fieldCardCount <= BASE_FIELD_CARD_CAPACITY) {
    return Object.freeze({
      version: ADAPTIVE_FIELD_LAYOUT_VERSION,
      fieldCardCount,
      columns: 4,
      rows: 2,
      gap: rounded(baseGap(layout.slots.field)),
      cardMetrics: Object.freeze({ ...layout.cardMetrics }),
      slots: layout.slots.field,
    });
  }

  const bounds = contentBounds(layout.slots.field);
  const gap = Math.max(0.75, Math.min(4, baseGap(layout.slots.field) * 0.4));
  const grid = selectGrid(bounds, gap, fieldCardCount);
  const metrics = cardMetrics(grid.width);
  const gridHeight = metrics.height * grid.rows + gap * (grid.rows - 1);
  const startY = bounds.y + (bounds.height - gridHeight) / 2;
  const slots: BoardRect[] = [];

  for (let index = 0; index < fieldCardCount; index += 1) {
    const row = Math.floor(index / grid.columns);
    const column = index % grid.columns;
    const cardsInRow = Math.min(grid.columns, fieldCardCount - row * grid.columns);
    const rowWidth = cardsInRow * metrics.width + gap * (cardsInRow - 1);
    const startX = bounds.x + (bounds.width - rowWidth) / 2;
    slots.push(
      freezeRect({
        x: startX + column * (metrics.width + gap),
        y: startY + row * (metrics.height + gap),
        width: metrics.width,
        height: metrics.height,
      }),
    );
  }

  return Object.freeze({
    version: ADAPTIVE_FIELD_LAYOUT_VERSION,
    fieldCardCount,
    columns: grid.columns,
    rows: grid.rows,
    gap: rounded(gap),
    cardMetrics: metrics,
    slots: Object.freeze(slots),
  });
}
