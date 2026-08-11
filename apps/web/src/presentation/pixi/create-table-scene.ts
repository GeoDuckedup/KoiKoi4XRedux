import { Container, Graphics, Text } from "pixi.js";
import type { Application, Texture } from "pixi.js";

import { computeCardPlacements } from "../cards/card-layout";
import { createCardViewRegistry } from "../cards/card-view-registry";
import { CARD_SHOWCASE_ASSIGNMENTS } from "../cards/showcase";
import type { CardRuntimeInspection } from "../cards/types";
import { computeAnimatedCardPlacements } from "../animation/card-animation-frame";
import { createPresentationProjection } from "../animation/projection";
import type {
  AnimationClipV1,
  AnimationMode,
  PresentationBoardProjection,
} from "../animation/types";
import type { ActiveDeckTextures } from "../deck/card-asset-manager";
import type { InteractionVisualStateV1 } from "../input/types";
import {
  computeAdaptiveFieldLayout,
  type AdaptiveFieldLayoutV1,
} from "../board/adaptive-field-layout";
import {
  ACTIVE_PHASE_3D_VISUAL_DIRECTION,
  type Phase3DVisualDirectionV1,
  type TableSceneColorsV1,
} from "../theme/visual-directions";
import type { BoardLayout, BoardRect, BoardSceneInspection, CardZone } from "../board/types";
import { BOARD_LAYER_ORDER } from "../board/types";

interface TableSceneFrame {
  fullscreen: boolean;
  layout: BoardLayout;
}

export interface TableSceneStatusV1 {
  readonly actionLabel: string;
  readonly multiplier: number;
  readonly opponentHandCount: number;
  readonly opponentLabel: string;
  readonly opponentScore: number;
  readonly playerHandCount: number;
  readonly playerLabel: string;
  readonly playerScore: number;
  readonly roundLabel: string;
}

export interface TableScene {
  applyDeck: (textures: ActiveDeckTextures<Texture>) => void;
  destroy: () => void;
  inspect: () => BoardSceneInspection & { readonly cards: CardRuntimeInspection };
  renderClip: (clip: AnimationClipV1, progress: number, mode: AnimationMode) => void;
  redraw: (frame: TableSceneFrame) => void;
  setTheme: (theme: Phase3DVisualDirectionV1) => void;
  setInteractionState: (state: InteractionVisualStateV1) => void;
  setStatus: (status: TableSceneStatusV1) => void;
  snapTo: (projection: PresentationBoardProjection) => void;
}

let nextSceneObjectToken = 1;

function createSceneObjectToken(kind: "layer" | "root"): string {
  const token = `${kind}-${nextSceneObjectToken}`;
  nextSceneObjectToken += 1;
  return token;
}

function multiplierColor(colors: TableSceneColorsV1, multiplier: number): number {
  if (multiplier <= 1) return colors.multiplier1;
  if (multiplier === 2) return colors.multiplier2;
  if (multiplier === 3) return colors.multiplier3;
  return colors.multiplier4;
}

const CAPTURE_ZONE_GROUPS = {
  opponent: [
    ["opponentBrights", "BRIGHTS"],
    ["opponentAnimals", "ANIMALS"],
    ["opponentScrolls", "SCROLLS"],
    ["opponentPlains", "PLAIN"],
  ],
  player: [
    ["playerBrights", "BRIGHTS"],
    ["playerAnimals", "ANIMALS"],
    ["playerScrolls", "SCROLLS"],
    ["playerPlains", "PLAIN"],
  ],
} as const satisfies Readonly<
  Record<"opponent" | "player", readonly (readonly [CardZone, string])[]>
>;

function clearLayer(layer: Container): void {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}

function panel(
  bounds: BoardRect,
  options: {
    fill: number;
    fillAlpha?: number;
    radius?: number;
    stroke?: number;
    strokeAlpha?: number;
    strokeWidth?: number;
  },
): Graphics {
  const graphics = new Graphics()
    .roundRect(bounds.x, bounds.y, bounds.width, bounds.height, options.radius ?? 10)
    .fill({ color: options.fill, alpha: options.fillAlpha ?? 1 });
  if (options.stroke !== undefined) {
    graphics.stroke({
      color: options.stroke,
      alpha: options.strokeAlpha ?? 1,
      width: options.strokeWidth ?? 1,
    });
  }
  return graphics;
}

function label(
  value: string,
  x: number,
  y: number,
  options: {
    align?: "center" | "left" | "right";
    anchorX?: number;
    anchorY?: number;
    color?: number;
    fontFamily?: string;
    fontSize: number;
    fontWeight?: "400" | "500" | "600" | "700";
    letterSpacing?: number;
  },
): Text {
  const text = new Text({
    text: value,
    style: {
      align: options.align ?? "left",
      fill: options.color ?? 0xffffff,
      fontFamily: options.fontFamily ?? "Inter, system-ui, sans-serif",
      fontSize: options.fontSize,
      fontWeight: options.fontWeight ?? "600",
      letterSpacing: options.letterSpacing ?? 0,
    },
  });
  text.anchor.set(options.anchorX ?? 0, options.anchorY ?? 0);
  text.position.set(x, y);
  return text;
}

function renderHand(
  layer: Container,
  bounds: BoardRect,
  handLabel: string,
  handCount: number,
  scale: number,
  colors: TableSceneColorsV1,
): void {
  layer.addChild(
    label(`${handLabel.toUpperCase()} · ${handCount}`, bounds.x, bounds.y, {
      color: colors.creamMuted,
      fontSize: Math.max(8, 9 * scale),
      fontWeight: "700",
      letterSpacing: Math.max(0.5, scale),
    }),
  );
}

function renderCaptureSummary(
  layer: Container,
  layout: BoardLayout,
  owner: "opponent" | "player",
  zoneCounts: CardRuntimeInspection["zoneCounts"],
  colors: TableSceneColorsV1,
): void {
  const entries = CAPTURE_ZONE_GROUPS[owner];
  for (const [zone, title] of entries) {
    const bounds = layout.cardZones[zone];
    const compact = bounds.width < 105 || bounds.height < 42;
    layer.addChild(
      panel(bounds, {
        fill: colors.ink,
        fillAlpha: 0.76,
        radius: Math.min(10, bounds.height * 0.28),
        stroke: colors.cream,
        strokeAlpha: 0.12,
      }),
      label(
        compact ? title.slice(0, 3) : title,
        bounds.x + Math.max(5, bounds.width * 0.07),
        bounds.y + bounds.height / 2,
        {
          anchorY: 0.5,
          color: colors.creamMuted,
          fontSize: Math.max(7, Math.min(11 * layout.scale, bounds.height * 0.25)),
          fontWeight: "700",
          letterSpacing: compact ? 0.25 : 0.8,
        },
      ),
      label(
        String(zoneCounts[zone]),
        bounds.x + bounds.width - Math.max(5, bounds.width * 0.07),
        bounds.y + bounds.height / 2,
        {
          align: "right",
          anchorX: 1,
          anchorY: 0.5,
          color: colors.gold,
          fontSize: Math.max(9, Math.min(15 * layout.scale, bounds.height * 0.38)),
          fontWeight: "700",
        },
      ),
    );
  }
}

function renderField(
  layer: Container,
  layout: BoardLayout,
  fieldLayout: AdaptiveFieldLayoutV1,
  colors: TableSceneColorsV1,
): void {
  const bounds = layout.cardZones.field;
  layer.addChild(
    panel(bounds, {
      fill: colors.black,
      fillAlpha: 0.13,
      radius: Math.max(10, 14 * layout.scale),
      stroke: colors.gold,
      strokeAlpha: 0.16,
    }),
    label(
      fieldLayout.fieldCardCount <= 8
        ? "FIELD · STABLE 2 × 4 SLOTS"
        : `FIELD · ${fieldLayout.fieldCardCount} CARDS · ${fieldLayout.columns} × ${fieldLayout.rows}`,
      bounds.x + Math.max(8, 10 * layout.scale),
      bounds.y + Math.max(4, 6 * layout.scale),
      {
        color: colors.creamMuted,
        fontSize: Math.max(8, 9.5 * layout.scale),
        fontWeight: "700",
        letterSpacing: Math.max(0.5, layout.scale),
      },
    ),
  );

  for (const [index, slot] of fieldLayout.slots.entries()) {
    layer.addChild(
      new Graphics()
        .roundRect(slot.x, slot.y, slot.width, slot.height, fieldLayout.cardMetrics.cornerRadius)
        .fill({ color: colors.cream, alpha: 0.025 })
        .stroke({ color: colors.cream, alpha: 0.2, width: Math.max(1, layout.scale) }),
      label(String(index + 1), slot.x + slot.width / 2, slot.y + slot.height / 2, {
        anchorX: 0.5,
        anchorY: 0.5,
        color: colors.cream,
        fontSize: Math.max(8, 10 * layout.scale),
        fontWeight: "600",
      }),
    );
  }
}

function renderDrawPile(layer: Container, layout: BoardLayout, colors: TableSceneColorsV1): void {
  const zone = layout.cardZones.drawPile;
  layer.addChild(
    label("DRAW", zone.x + zone.width / 2, zone.y + 3, {
      anchorX: 0.5,
      color: colors.creamMuted,
      fontSize: Math.max(7, 8.5 * layout.scale),
      fontWeight: "700",
      letterSpacing: 0.8,
    }),
  );
}

function renderReveal(layer: Container, layout: BoardLayout, colors: TableSceneColorsV1): void {
  const zone = layout.cardZones.reveal;
  const slot = layout.slots.reveal;
  layer.addChild(
    label("REVEAL", zone.x + zone.width / 2, zone.y + 3, {
      anchorX: 0.5,
      color: colors.creamMuted,
      fontSize: Math.max(7, 8.5 * layout.scale),
      fontWeight: "700",
      letterSpacing: 0.8,
    }),
    new Graphics()
      .roundRect(slot.x, slot.y, slot.width, slot.height, Math.max(3, slot.width * 0.1))
      .fill({ color: colors.cream, alpha: 0.02 })
      .stroke({ color: colors.gold, alpha: 0.3, width: Math.max(1, layout.scale) }),
  );
}

function renderStatus(
  layer: Container,
  layout: BoardLayout,
  fullscreen: boolean,
  tableStatus: TableSceneStatusV1,
  colors: TableSceneColorsV1,
): void {
  const identity = layout.uiZones.opponentIdentity;
  const status = layout.uiZones.roundStatus;
  const action = layout.uiZones.actionBar;
  const compact = layout.mode === "compactPortrait" || layout.mode === "landscape";
  const actionLabel = tableStatus.actionLabel.toUpperCase();

  layer.addChild(
    panel(identity, {
      fill: colors.ink,
      fillAlpha: 0.88,
      radius: Math.min(12, identity.height * 0.32),
      stroke: colors.cream,
      strokeAlpha: 0.14,
    }),
    label(
      tableStatus.opponentLabel.toUpperCase(),
      identity.x + Math.max(8, identity.width * 0.04),
      identity.y + identity.height / 2,
      {
        anchorY: 0.5,
        color: colors.creamMuted,
        fontSize: Math.max(8, 10 * layout.scale),
        fontWeight: "700",
        letterSpacing: 0.8,
      },
    ),
    label(
      `${tableStatus.opponentScore} PTS`,
      identity.x + identity.width - Math.max(8, identity.width * 0.04),
      identity.y + identity.height / 2,
      {
        anchorX: 1,
        anchorY: 0.5,
        color: colors.cream,
        fontSize: Math.max(9, 12 * layout.scale),
        fontWeight: "700",
      },
    ),
    panel(status, {
      fill: colors.ink,
      fillAlpha: 0.88,
      radius: Math.min(12, status.height * 0.32),
      stroke: colors.cream,
      strokeAlpha: 0.14,
    }),
    label(
      compact ? tableStatus.roundLabel.replace("JANUARY", "JAN") : tableStatus.roundLabel,
      status.x + Math.max(8, status.width * 0.03),
      status.y + status.height / 2,
      {
        anchorY: 0.5,
        color: colors.cream,
        fontSize: Math.max(8, 11 * layout.scale),
        fontWeight: "700",
        letterSpacing: 0.6,
      },
    ),
    panel(
      {
        x: status.x + status.width - Math.max(40, 50 * layout.scale),
        y: status.y + Math.max(4, status.height * 0.13),
        width: Math.max(34, 42 * layout.scale),
        height: status.height - Math.max(8, status.height * 0.26),
      },
      { fill: multiplierColor(colors, tableStatus.multiplier), radius: 999 },
    ),
    label(
      `${tableStatus.multiplier}×`,
      status.x + status.width - Math.max(23, 29 * layout.scale),
      status.y + status.height / 2,
      {
        anchorX: 0.5,
        anchorY: 0.5,
        color: colors.white,
        fontSize: Math.max(10, 13 * layout.scale),
        fontWeight: "700",
      },
    ),
    panel(action, {
      fill: colors.gold,
      fillAlpha: 0.11,
      radius: Math.min(16, action.height * 0.36),
      stroke: colors.gold,
      strokeAlpha: 0.52,
      strokeWidth: Math.max(1, layout.scale),
    }),
    label(actionLabel, action.x + action.width / 2, action.y + action.height / 2, {
      anchorX: 0.5,
      anchorY: 0.5,
      color: colors.gold,
      fontSize: Math.max(8, 10.5 * layout.scale),
      fontWeight: "700",
      letterSpacing: compact ? 0.35 : 1,
    }),
    label(
      `${layout.mode.replace(/([A-Z])/g, " $1").toUpperCase()}${fullscreen ? " · FULLSCREEN" : ""}`,
      action.x + action.width - Math.max(6, 9 * layout.scale),
      action.y + action.height - Math.max(3, 5 * layout.scale),
      {
        anchorX: 1,
        anchorY: 1,
        color: colors.creamMuted,
        fontSize: Math.max(6, 7 * layout.scale),
        fontWeight: "600",
        letterSpacing: 0.45,
      },
    ),
  );
}

function renderInteractionHighlights(
  layer: Container,
  layout: BoardLayout,
  projection: PresentationBoardProjection,
  state: InteractionVisualStateV1,
  colors: TableSceneColorsV1,
): void {
  if (state.locked) return;
  if (state.fieldPlacementAvailable) {
    const field = layout.cardZones.field;
    layer.addChild(
      panel(field, {
        fill: colors.legal,
        fillAlpha: 0.055,
        radius: Math.max(8, 14 * layout.scale),
        stroke: colors.legal,
        strokeAlpha: 0.92,
        strokeWidth: Math.max(2, 2.5 * layout.scale),
      }),
      label("TAP FIELD TO PLACE", field.x + field.width / 2, field.y + field.height / 2, {
        anchorX: 0.5,
        anchorY: 0.5,
        color: colors.legal,
        fontSize: Math.max(8, 10 * layout.scale),
        fontWeight: "700",
        letterSpacing: 0.8,
      }),
    );
  }
  const byCardId = new Map(
    computeCardPlacements(layout, projection).map((placement) => [placement.cardId, placement]),
  );
  const selectable = new Set(state.selectableCardIds);
  const legalTargets = new Set(state.legalTargetCardIds);
  const highlighted = new Set([...state.selectableCardIds, ...state.legalTargetCardIds]);
  for (const cardId of highlighted) {
    const placement = byCardId.get(cardId);
    if (!placement) continue;
    const selected = state.selectedCardId === cardId;
    const focused = state.focusedCardId === cardId;
    const target = legalTargets.has(cardId);
    const lift = selected ? Math.max(4, 7 * layout.scale) : 0;
    const padding = focused ? Math.max(4, 5 * layout.scale) : Math.max(2, 3 * layout.scale);
    const bounds = {
      x: placement.bounds.x - padding,
      y: placement.bounds.y - lift - padding,
      width: placement.bounds.width + padding * 2,
      height: placement.bounds.height + padding * 2,
    };
    const color = target ? colors.legal : selected ? colors.cream : colors.creamMuted;
    const alpha = target || selected ? 0.95 : selectable.has(cardId) ? 0.3 : 0;
    layer.addChild(
      new Graphics()
        .roundRect(bounds.x, bounds.y, bounds.width, bounds.height, Math.max(4, 8 * layout.scale))
        .stroke({
          color: focused ? colors.white : color,
          alpha,
          width: focused || selected || target ? Math.max(2, 2.5 * layout.scale) : 1,
        }),
    );
    if (target) {
      const cueLabel =
        state.handResolutionKind === "capturePair"
          ? "MATCH"
          : state.handResolutionKind === "fourCardSweep"
            ? "SWEEP"
            : "CHOOSE";
      layer.addChild(
        label(cueLabel, bounds.x + bounds.width / 2, Math.max(layout.safeBounds.y, bounds.y - 2), {
          anchorX: 0.5,
          anchorY: 1,
          color: colors.legal,
          fontSize: Math.max(7, 8.5 * layout.scale),
          fontWeight: "700",
          letterSpacing: 0.7,
        }),
      );
    }
  }
}

function applyInteractionPlacement(
  placements: readonly ReturnType<typeof computeCardPlacements>[number][],
  state: InteractionVisualStateV1,
) {
  if (state.locked || state.selectedCardId === null) return placements;
  return Object.freeze(
    placements.map((placement) =>
      placement.cardId === state.selectedCardId
        ? Object.freeze({
            ...placement,
            bounds: Object.freeze({
              ...placement.bounds,
              y: placement.bounds.y - Math.max(4, placement.bounds.height * 0.045),
            }),
            scaleX: 1.04,
            scaleY: 1.04,
            zIndex: placement.zIndex + 1000,
          })
        : placement,
    ),
  );
}

export function createTableScene(
  app: Application,
  initialDeck: ActiveDeckTextures<Texture>,
  initialTheme: Phase3DVisualDirectionV1 = ACTIVE_PHASE_3D_VISUAL_DIRECTION,
): TableScene {
  const root = new Container({ label: "TableScene" });
  const rootToken = createSceneObjectToken("root");
  root.sortableChildren = true;
  app.stage.addChild(root);

  const layers = new Map<string, Container>();
  const chromeLayers = new Map<string, Container>();
  const cardLayers = new Map<string, Container>();
  const layerTokens = new Map<Container, string>();
  for (const [index, name] of BOARD_LAYER_ORDER.entries()) {
    const layer = new Container({ label: name });
    layer.zIndex = index;
    layer.sortableChildren = true;
    const chrome = new Container({ label: `${name}:Chrome` });
    const cards = new Container({ label: `${name}:Cards` });
    chrome.zIndex = 0;
    cards.zIndex = 1;
    cards.sortableChildren = true;
    layer.addChild(chrome, cards);
    root.addChild(layer);
    layers.set(name, layer);
    chromeLayers.set(name, chrome);
    cardLayers.set(name, cards);
    layerTokens.set(layer, createSceneObjectToken("layer"));
  }
  const cardRegistry = createCardViewRegistry(initialDeck, initialTheme.table);
  let theme = initialTheme;
  let currentLayout: BoardLayout | null = null;
  let currentFullscreen = false;
  let displayProjection = createPresentationProjection(CARD_SHOWCASE_ASSIGNMENTS);
  let interactionState: InteractionVisualStateV1 = Object.freeze({
    selectedCardId: null,
    selectableCardIds: Object.freeze([]),
    legalTargetCardIds: Object.freeze([]),
    handResolutionKind: null,
    fieldPlacementAvailable: false,
    focusedCardId: null,
    locked: true,
  });
  let tableStatus: TableSceneStatusV1 = Object.freeze({
    actionLabel: "Loading local round",
    multiplier: 1,
    opponentHandCount: 0,
    opponentLabel: "Opponent",
    opponentScore: 0,
    playerHandCount: 0,
    playerLabel: "Player",
    playerScore: 0,
    roundLabel: "Round 1 · January",
  });
  let currentAnimationFrame: {
    readonly clip: AnimationClipV1;
    readonly mode: AnimationMode;
    readonly progress: number;
  } | null = null;

  const requiredLayer = (name: (typeof BOARD_LAYER_ORDER)[number]): Container => {
    const layer = layers.get(name);
    if (!layer) {
      throw new Error(`Table scene is missing ${name}.`);
    }
    return layer;
  };

  const requiredChrome = (name: (typeof BOARD_LAYER_ORDER)[number]): Container => {
    const layer = chromeLayers.get(name);
    if (!layer) throw new Error(`Table scene is missing ${name}'s chrome container.`);
    return layer;
  };

  const redraw = ({ fullscreen, layout }: TableSceneFrame): void => {
    currentLayout = layout;
    currentFullscreen = fullscreen;
    for (const layer of chromeLayers.values()) {
      clearLayer(layer);
    }
    const chromeProjection = currentAnimationFrame
      ? currentAnimationFrame.clip.settlesProjection
        ? currentAnimationFrame.clip.to
        : currentAnimationFrame.clip.from
      : displayProjection;
    const fieldLayout = computeAdaptiveFieldLayout(
      layout,
      chromeProjection.filter(({ zone }) => zone === "field").length,
    );
    const cardPlacements = currentAnimationFrame
      ? computeAnimatedCardPlacements(
          layout,
          currentAnimationFrame.clip,
          currentAnimationFrame.progress,
          currentAnimationFrame.mode,
        )
      : applyInteractionPlacement(
          computeCardPlacements(layout, displayProjection),
          interactionState,
        );
    cardRegistry.applyPlacements(
      cardPlacements,
      cardLayers as ReadonlyMap<(typeof BOARD_LAYER_ORDER)[number], Container>,
    );

    const background = requiredChrome("BackgroundLayer");
    background.addChild(
      new Graphics()
        .rect(0, 0, layout.viewport.width, layout.viewport.height)
        .fill({ color: theme.table.backdrop }),
      panel(layout.safeBounds, {
        fill: theme.table.table,
        radius: Math.max(14, 22 * layout.scale),
        stroke: theme.table.gold,
        strokeAlpha: 0.3,
        strokeWidth: Math.max(1, 1.5 * layout.scale),
      }),
      new Graphics()
        .circle(
          layout.safeBounds.x + layout.safeBounds.width / 2,
          layout.safeBounds.y + layout.safeBounds.height / 2,
          Math.min(layout.safeBounds.width, layout.safeBounds.height) * 0.32,
        )
        .fill({ color: theme.table.gold, alpha: 0.025 }),
    );

    renderHand(
      requiredChrome("OpponentHandLayer"),
      layout.cardZones.opponentHand,
      `${tableStatus.opponentLabel} hand`,
      tableStatus.opponentHandCount,
      layout.scale,
      theme.table,
    );
    const currentCards = cardRegistry.inspect();
    renderCaptureSummary(
      requiredChrome("OpponentCaptureLayer"),
      layout,
      "opponent",
      currentCards.zoneCounts,
      theme.table,
    );
    renderField(requiredChrome("FieldLayer"), layout, fieldLayout, theme.table);
    renderDrawPile(requiredChrome("DrawPileLayer"), layout, theme.table);
    renderReveal(requiredChrome("RevealLayer"), layout, theme.table);
    renderCaptureSummary(
      requiredChrome("PlayerCaptureLayer"),
      layout,
      "player",
      currentCards.zoneCounts,
      theme.table,
    );
    renderHand(
      requiredChrome("PlayerHandLayer"),
      layout.cardZones.playerHand,
      `${tableStatus.playerLabel} hand · ${tableStatus.playerScore} pts`,
      tableStatus.playerHandCount,
      layout.scale,
      theme.table,
    );
    renderStatus(
      requiredChrome("InteractionOverlayLayer"),
      layout,
      fullscreen,
      tableStatus,
      theme.table,
    );
    renderInteractionHighlights(
      requiredChrome("InteractionOverlayLayer"),
      layout,
      displayProjection,
      interactionState,
      theme.table,
    );
  };

  return {
    applyDeck: (textures) => {
      cardRegistry.applyDeck(textures);
    },
    redraw,
    setTheme: (nextTheme) => {
      theme = nextTheme;
      cardRegistry.applyFrameColors(theme.table);
      if (currentLayout) redraw({ fullscreen: currentFullscreen, layout: currentLayout });
    },
    setInteractionState: (state) => {
      interactionState = Object.freeze({
        ...state,
        selectableCardIds: Object.freeze([...state.selectableCardIds]),
        legalTargetCardIds: Object.freeze([...state.legalTargetCardIds]),
      });
      if (currentLayout) redraw({ fullscreen: currentFullscreen, layout: currentLayout });
    },
    setStatus: (status) => {
      tableStatus = Object.freeze({ ...status });
      if (currentLayout) redraw({ fullscreen: currentFullscreen, layout: currentLayout });
    },
    snapTo: (projection) => {
      displayProjection = createPresentationProjection(projection);
      currentAnimationFrame = null;
      if (currentLayout) {
        redraw({ fullscreen: currentFullscreen, layout: currentLayout });
      }
    },
    renderClip: (clip, progress, mode) => {
      currentAnimationFrame = Object.freeze({ clip, progress, mode });
      if (currentLayout) {
        cardRegistry.applyPlacements(
          computeAnimatedCardPlacements(currentLayout, clip, progress, mode),
          cardLayers as ReadonlyMap<(typeof BOARD_LAYER_ORDER)[number], Container>,
        );
      }
    },
    inspect: () =>
      Object.freeze({
        root: Object.freeze({ label: "TableScene" as const, token: rootToken }),
        layers: Object.freeze(
          BOARD_LAYER_ORDER.map((name) => {
            const layer = requiredLayer(name);
            const token = layerTokens.get(layer);
            if (!token) {
              throw new Error(`Table scene is missing the instance token for ${name}.`);
            }
            return Object.freeze({ label: name, token });
          }),
        ),
        cards: cardRegistry.inspect(),
      }),
    destroy: () => {
      cardRegistry.destroy();
      root.destroy({ children: true });
    },
  };
}
