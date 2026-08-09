import {
  BOARD_LAYER_ORDER,
  BOARD_LAYOUT_VERSION,
  CARD_ZONES,
  type BoardLayout,
  type BoardLayoutDiagnostics,
  type BoardLayoutMode,
  type BoardRect,
  type BoardViewport,
  type CardZone,
} from "./types";

const CARD_ASPECT_RATIO = 5 / 8;
const MIN_INTERACTION_SIZE = 44;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rect(x: number, y: number, width: number, height: number): BoardRect {
  return Object.freeze({
    x: rounded(x),
    y: rounded(y),
    width: rounded(width),
    height: rounded(height),
  });
}

function inset(bounds: BoardRect, amount: number): BoardRect {
  return rect(
    bounds.x + amount,
    bounds.y + amount,
    Math.max(1, bounds.width - amount * 2),
    Math.max(1, bounds.height - amount * 2),
  );
}

function splitHorizontal(bounds: BoardRect, count: number, gap: number): readonly BoardRect[] {
  const width = (bounds.width - gap * (count - 1)) / count;
  return Object.freeze(
    Array.from({ length: count }, (_, index) =>
      rect(bounds.x + index * (width + gap), bounds.y, width, bounds.height),
    ),
  );
}

function splitVertical(bounds: BoardRect, count: number, gap: number): readonly BoardRect[] {
  const height = (bounds.height - gap * (count - 1)) / count;
  return Object.freeze(
    Array.from({ length: count }, (_, index) =>
      rect(bounds.x, bounds.y + index * (height + gap), bounds.width, height),
    ),
  );
}

function fitCard(bounds: BoardRect, padding: number): BoardRect {
  const content = inset(bounds, padding);
  const width = Math.min(content.width, content.height * CARD_ASPECT_RATIO);
  const height = width / CARD_ASPECT_RATIO;
  return rect(
    content.x + (content.width - width) / 2,
    content.y + (content.height - height) / 2,
    width,
    height,
  );
}

function fitFieldSlots(bounds: BoardRect, gap: number): readonly BoardRect[] {
  const content = rect(
    bounds.x + gap,
    bounds.y + Math.max(16, gap * 2.2),
    Math.max(1, bounds.width - gap * 2),
    Math.max(1, bounds.height - Math.max(20, gap * 3)),
  );
  const columns = 4;
  const rows = 2;
  const widthByColumns = (content.width - gap * (columns - 1)) / columns;
  const heightByRows = (content.height - gap * (rows - 1)) / rows;
  const cardWidth = Math.min(widthByColumns, heightByRows * CARD_ASPECT_RATIO);
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const gridWidth = cardWidth * columns + gap * (columns - 1);
  const gridHeight = cardHeight * rows + gap * (rows - 1);
  const startX = content.x + (content.width - gridWidth) / 2;
  const startY = content.y + (content.height - gridHeight) / 2;

  return Object.freeze(
    Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return rect(
        startX + column * (cardWidth + gap),
        startY + row * (cardHeight + gap),
        cardWidth,
        cardHeight,
      );
    }),
  );
}

function fitHandSlots(bounds: BoardRect, count: number, gap: number): readonly BoardRect[] {
  const labelSpace = Math.min(16, bounds.height * 0.2);
  const availableHeight = Math.max(1, bounds.height - labelSpace - gap);
  const cardHeight = Math.min(availableHeight, 102);
  const cardWidth = cardHeight * CARD_ASPECT_RATIO;
  const fullWidth = cardWidth * count + gap * (count - 1);
  const step =
    fullWidth <= bounds.width
      ? cardWidth + gap
      : count > 1
        ? Math.max(cardWidth * 0.28, (bounds.width - cardWidth) / (count - 1))
        : 0;
  const occupiedWidth = cardWidth + step * (count - 1);
  const startX = bounds.x + (bounds.width - occupiedWidth) / 2;
  const startY = bounds.y + labelSpace + (availableHeight - cardHeight) / 2;

  return Object.freeze(
    Array.from({ length: count }, (_, index) =>
      rect(startX + index * step, startY, cardWidth, cardHeight),
    ),
  );
}

function selectMode(viewport: BoardViewport): BoardLayoutMode {
  if (viewport.width >= 960 && viewport.width > viewport.height) {
    return "desktop";
  }
  if (viewport.width > viewport.height) {
    return "landscape";
  }
  return viewport.width <= 360 ? "compactPortrait" : "portrait";
}

function assignCaptureZones(
  target: Partial<Record<CardZone, BoardRect>>,
  player: "player" | "opponent",
  bounds: BoardRect,
  vertical: boolean,
  gap: number,
): void {
  const parts = vertical
    ? splitVertical(bounds, 4, Math.max(2, gap * 0.45))
    : splitHorizontal(bounds, 4, Math.max(2, gap * 0.45));
  const names = ["Brights", "Animals", "Scrolls", "Plains"] as const;
  for (const [index, name] of names.entries()) {
    const bounds = parts[index];
    if (!bounds) {
      throw new Error("Capture-zone layout is incomplete.");
    }
    target[`${player}${name}` as CardZone] = bounds;
  }
}

function computePortraitLayout(viewport: BoardViewport, mode: BoardLayoutMode): BoardLayout {
  const shortSide = Math.min(viewport.width, viewport.height);
  const padding = clamp(shortSide * 0.022, 6, 16);
  const gap = clamp(shortSide * 0.014, 4, 10);
  const safe = rect(padding, padding, viewport.width - padding * 2, viewport.height - padding * 2);
  const compact = mode === "compactPortrait";
  const identityHeight = compact ? 26 : clamp(safe.height * 0.045, 30, 42);
  const opponentHandHeight = compact ? 42 : clamp(safe.height * 0.085, 48, 78);
  const captureHeight = compact ? 32 : clamp(safe.height * 0.064, 38, 58);
  const statusHeight = compact ? 32 : clamp(safe.height * 0.052, 36, 48);
  const playerHandHeight = compact ? 64 : clamp(safe.height * 0.13, 76, 118);
  const actionHeight = clamp(safe.height * 0.075, MIN_INTERACTION_SIZE, 60);
  const fixedHeight =
    identityHeight +
    opponentHandHeight +
    captureHeight * 2 +
    statusHeight +
    playerHandHeight +
    actionHeight;
  const centerHeight = Math.max(110, safe.height - fixedHeight - gap * 6);
  let y = safe.y;

  const opponentIdentity = rect(safe.x, y, safe.width, identityHeight);
  y += identityHeight + gap;
  const opponentHand = rect(safe.x, y, safe.width, opponentHandHeight);
  y += opponentHandHeight + gap;
  const opponentCapture = rect(safe.x, y, safe.width, captureHeight);
  y += captureHeight + gap;
  const roundStatus = rect(safe.x, y, safe.width, statusHeight);
  y += statusHeight + gap;

  const center = rect(safe.x, y, safe.width, centerHeight);
  const railGap = gap;
  const railWidth = clamp(center.width * 0.205, 54, 112);
  const field = rect(center.x, center.y, center.width - railWidth - railGap, center.height);
  const rail = rect(field.x + field.width + railGap, center.y, railWidth, center.height);
  const railParts = splitVertical(rail, 2, gap);
  const drawPile = railParts[0];
  const reveal = railParts[1];
  if (!drawPile || !reveal) {
    throw new Error("Portrait draw/reveal layout is incomplete.");
  }
  y += centerHeight + gap;

  const playerCapture = rect(safe.x, y, safe.width, captureHeight);
  y += captureHeight + gap;
  const playerHand = rect(safe.x, y, safe.width, playerHandHeight);
  const actionBar = rect(safe.x, safe.y + safe.height - actionHeight, safe.width, actionHeight);

  const cardZones: Partial<Record<CardZone, BoardRect>> = {
    drawPile,
    field,
    opponentHand,
    playerHand,
    reveal,
    transit: safe,
  };
  assignCaptureZones(cardZones, "opponent", opponentCapture, false, gap);
  assignCaptureZones(cardZones, "player", playerCapture, false, gap);

  return finishLayout(
    viewport,
    mode,
    safe,
    cardZones,
    {
      actionBar,
      opponentIdentity,
      roundStatus,
    },
    gap,
  );
}

function computeWideLayout(viewport: BoardViewport, mode: BoardLayoutMode): BoardLayout {
  const shortSide = Math.min(viewport.width, viewport.height);
  const padding = clamp(shortSide * 0.025, 6, mode === "desktop" ? 22 : 12);
  const gap = clamp(shortSide * 0.018, 4, mode === "desktop" ? 14 : 8);
  const safe = rect(padding, padding, viewport.width - padding * 2, viewport.height - padding * 2);
  const compact = mode === "landscape";
  const headerHeight = compact ? 32 : clamp(safe.height * 0.068, 42, 60);
  const opponentHandHeight = compact ? 38 : clamp(safe.height * 0.105, 62, 92);
  const playerHandHeight = compact ? 44 : clamp(safe.height * 0.13, 76, 112);
  const actionHeight = clamp(safe.height * 0.07, MIN_INTERACTION_SIZE, 58);
  const centerHeight = Math.max(
    100,
    safe.height - headerHeight - opponentHandHeight - playerHandHeight - actionHeight - gap * 4,
  );
  const identityWidth = clamp(safe.width * 0.24, 116, 320);
  const opponentIdentity = rect(safe.x, safe.y, identityWidth, headerHeight);
  const roundStatus = rect(
    opponentIdentity.x + opponentIdentity.width + gap,
    safe.y,
    safe.width - identityWidth - gap,
    headerHeight,
  );
  let y = safe.y + headerHeight + gap;
  const opponentHand = rect(safe.x, y, safe.width, opponentHandHeight);
  y += opponentHandHeight + gap;
  const center = rect(safe.x, y, safe.width, centerHeight);
  y += centerHeight + gap;
  const playerHand = rect(safe.x, y, safe.width, playerHandHeight);
  const actionBar = rect(safe.x, safe.y + safe.height - actionHeight, safe.width, actionHeight);

  const captureWidth = clamp(center.width * (compact ? 0.16 : 0.18), 72, 240);
  const railWidth = clamp(center.width * (compact ? 0.12 : 0.1), 58, 128);
  const fieldWidth = center.width - captureWidth * 2 - railWidth - gap * 3;
  const opponentCapture = rect(center.x, center.y, captureWidth, center.height);
  const field = rect(
    opponentCapture.x + opponentCapture.width + gap,
    center.y,
    fieldWidth,
    center.height,
  );
  const rail = rect(field.x + field.width + gap, center.y, railWidth, center.height);
  const playerCapture = rect(rail.x + rail.width + gap, center.y, captureWidth, center.height);
  const railParts = splitVertical(rail, 2, gap);
  const drawPile = railParts[0];
  const reveal = railParts[1];
  if (!drawPile || !reveal) {
    throw new Error("Wide draw/reveal layout is incomplete.");
  }

  const cardZones: Partial<Record<CardZone, BoardRect>> = {
    drawPile,
    field,
    opponentHand,
    playerHand,
    reveal,
    transit: safe,
  };
  assignCaptureZones(cardZones, "opponent", opponentCapture, true, gap);
  assignCaptureZones(cardZones, "player", playerCapture, true, gap);

  return finishLayout(
    viewport,
    mode,
    safe,
    cardZones,
    {
      actionBar,
      opponentIdentity,
      roundStatus,
    },
    gap,
  );
}

function finishLayout(
  viewport: BoardViewport,
  mode: BoardLayoutMode,
  safeBounds: BoardRect,
  partialCardZones: Partial<Record<CardZone, BoardRect>>,
  uiZones: BoardLayout["uiZones"],
  gap: number,
): BoardLayout {
  const orderedCardZones: Partial<Record<CardZone, BoardRect>> = {};
  for (const zone of CARD_ZONES) {
    const bounds = partialCardZones[zone];
    if (!bounds) {
      throw new Error(`Board layout did not define the ${zone} zone.`);
    }
    orderedCardZones[zone] = bounds;
  }
  const cardZones = Object.freeze(orderedCardZones) as Readonly<Record<CardZone, BoardRect>>;
  const fieldSlots = fitFieldSlots(cardZones.field, gap);
  const playerHandSlots = fitHandSlots(cardZones.playerHand, 8, gap * 0.65);
  const opponentHandSlots = fitHandSlots(cardZones.opponentHand, 8, gap * 0.65);
  const referenceSlot = fieldSlots[0];
  if (!referenceSlot) {
    throw new Error("Board layout must contain a field slot.");
  }

  return Object.freeze({
    version: BOARD_LAYOUT_VERSION,
    viewport: Object.freeze({ width: viewport.width, height: viewport.height }),
    mode,
    scale: rounded(clamp(Math.min(viewport.width / 390, viewport.height / 720), 0.72, 1.6)),
    safeBounds,
    cardMetrics: Object.freeze({
      width: referenceSlot.width,
      height: referenceSlot.height,
      cornerRadius: rounded(clamp(referenceSlot.width * 0.1, 3, 10)),
    }),
    cardZones,
    uiZones: Object.freeze(uiZones),
    slots: Object.freeze({
      drawPile: fitCard(cardZones.drawPile, gap),
      field: fieldSlots,
      opponentHand: opponentHandSlots,
      playerHand: playerHandSlots,
      reveal: fitCard(cardZones.reveal, gap),
    }),
    layerOrder: BOARD_LAYER_ORDER,
  });
}

export function computeBoardLayout(viewport: BoardViewport): BoardLayout {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width < 240 ||
    viewport.height < 240
  ) {
    throw new RangeError(
      "Board layout requires a finite viewport of at least 240 × 240 CSS pixels.",
    );
  }
  const normalizedViewport = Object.freeze({
    width: rounded(viewport.width),
    height: rounded(viewport.height),
  });
  const mode = selectMode(normalizedViewport);
  const minimumHeight = mode === "compactPortrait" || mode === "portrait" ? 420 : 300;
  if (normalizedViewport.height < minimumHeight) {
    throw new RangeError(
      `The ${mode} board requires at least ${minimumHeight} CSS pixels of canvas height.`,
    );
  }
  return mode === "compactPortrait" || mode === "portrait"
    ? computePortraitLayout(normalizedViewport, mode)
    : computeWideLayout(normalizedViewport, mode);
}

function contains(outer: BoardRect, inner: BoardRect): boolean {
  const epsilon = 0.002;
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

function overlaps(first: BoardRect, second: BoardRect): boolean {
  const epsilon = 0.002;
  return (
    first.x < second.x + second.width - epsilon &&
    first.x + first.width > second.x + epsilon &&
    first.y < second.y + second.height - epsilon &&
    first.y + first.height > second.y + epsilon
  );
}

export function inspectBoardLayout(layout: BoardLayout): BoardLayoutDiagnostics {
  const invalidZones: string[] = [];
  const clippedZones: string[] = [];
  const overlapViolations: string[] = [];
  const zones = {
    ...layout.cardZones,
    ...layout.uiZones,
  } as const;

  for (const [name, bounds] of Object.entries(zones)) {
    if (
      ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      invalidZones.push(name);
    }
    if (name !== "transit" && !contains(layout.safeBounds, bounds)) {
      clippedZones.push(name);
    }
  }

  const pairs: ReadonlyArray<readonly [string, BoardRect, string, BoardRect]> = [
    ["field", layout.cardZones.field, "drawPile", layout.cardZones.drawPile],
    ["field", layout.cardZones.field, "reveal", layout.cardZones.reveal],
    ["drawPile", layout.cardZones.drawPile, "reveal", layout.cardZones.reveal],
    ["playerHand", layout.cardZones.playerHand, "actionBar", layout.uiZones.actionBar],
    ["opponentHand", layout.cardZones.opponentHand, "field", layout.cardZones.field],
  ];
  for (const [firstName, first, secondName, second] of pairs) {
    if (overlaps(first, second)) {
      overlapViolations.push(`${firstName}:${secondName}`);
    }
  }

  if (layout.uiZones.actionBar.height < MIN_INTERACTION_SIZE) {
    invalidZones.push("actionBar:minInteractionSize");
  }

  return Object.freeze({
    clippedZones: Object.freeze(clippedZones),
    invalidZones: Object.freeze(invalidZones),
    overlapViolations: Object.freeze(overlapViolations),
  });
}
