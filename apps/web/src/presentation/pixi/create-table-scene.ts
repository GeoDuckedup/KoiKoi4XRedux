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
import type { BoardLayout, BoardRect, BoardSceneInspection, CardZone } from "../board/types";
import { BOARD_LAYER_ORDER } from "../board/types";

interface TableSceneFrame {
  fullscreen: boolean;
  layout: BoardLayout;
}

export interface TableScene {
  applyDeck: (textures: ActiveDeckTextures<Texture>) => void;
  destroy: () => void;
  inspect: () => BoardSceneInspection & { readonly cards: CardRuntimeInspection };
  renderClip: (clip: AnimationClipV1, progress: number, mode: AnimationMode) => void;
  redraw: (frame: TableSceneFrame) => void;
  snapTo: (projection: PresentationBoardProjection) => void;
}

let nextSceneObjectToken = 1;

function createSceneObjectToken(kind: "layer" | "root"): string {
  const token = `${kind}-${nextSceneObjectToken}`;
  nextSceneObjectToken += 1;
  return token;
}

const COLORS = {
  backdrop: 0x061711,
  black: 0x020805,
  cream: 0xfff3cf,
  creamMuted: 0xc7c1a4,
  gold: 0xe9bb5a,
  green: 0x1f5941,
  ink: 0x0a2118,
  red: 0xc9514b,
  table: 0x123b2c,
  tableDeep: 0x0b2a20,
  white: 0xffffff,
} as const;

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
      fill: options.color ?? COLORS.cream,
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
  owner: "opponent" | "player",
  scale: number,
): void {
  layer.addChild(
    label(owner === "opponent" ? "OPPONENT HAND · 8" : "YOUR HAND · 8", bounds.x, bounds.y, {
      color: COLORS.creamMuted,
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
): void {
  const entries = CAPTURE_ZONE_GROUPS[owner];
  for (const [zone, title] of entries) {
    const bounds = layout.cardZones[zone];
    const compact = bounds.width < 105 || bounds.height < 42;
    layer.addChild(
      panel(bounds, {
        fill: COLORS.ink,
        fillAlpha: 0.76,
        radius: Math.min(10, bounds.height * 0.28),
        stroke: COLORS.cream,
        strokeAlpha: 0.12,
      }),
      label(
        compact ? title.slice(0, 3) : title,
        bounds.x + Math.max(5, bounds.width * 0.07),
        bounds.y + bounds.height / 2,
        {
          anchorY: 0.5,
          color: COLORS.creamMuted,
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
          color: COLORS.gold,
          fontSize: Math.max(9, Math.min(15 * layout.scale, bounds.height * 0.38)),
          fontWeight: "700",
        },
      ),
    );
  }
}

function renderField(layer: Container, layout: BoardLayout): void {
  const bounds = layout.cardZones.field;
  layer.addChild(
    panel(bounds, {
      fill: COLORS.black,
      fillAlpha: 0.13,
      radius: Math.max(10, 14 * layout.scale),
      stroke: COLORS.gold,
      strokeAlpha: 0.16,
    }),
    label(
      "FIELD · STABLE 2 × 4 SLOTS",
      bounds.x + Math.max(8, 10 * layout.scale),
      bounds.y + Math.max(4, 6 * layout.scale),
      {
        color: COLORS.creamMuted,
        fontSize: Math.max(8, 9.5 * layout.scale),
        fontWeight: "700",
        letterSpacing: Math.max(0.5, layout.scale),
      },
    ),
  );

  for (const [index, slot] of layout.slots.field.entries()) {
    layer.addChild(
      new Graphics()
        .roundRect(slot.x, slot.y, slot.width, slot.height, layout.cardMetrics.cornerRadius)
        .fill({ color: COLORS.cream, alpha: 0.025 })
        .stroke({ color: COLORS.cream, alpha: 0.2, width: Math.max(1, layout.scale) }),
      label(String(index + 1), slot.x + slot.width / 2, slot.y + slot.height / 2, {
        anchorX: 0.5,
        anchorY: 0.5,
        color: COLORS.cream,
        fontSize: Math.max(8, 10 * layout.scale),
        fontWeight: "600",
      }),
    );
  }
}

function renderDrawPile(layer: Container, layout: BoardLayout): void {
  const zone = layout.cardZones.drawPile;
  layer.addChild(
    label("DRAW", zone.x + zone.width / 2, zone.y + 3, {
      anchorX: 0.5,
      color: COLORS.creamMuted,
      fontSize: Math.max(7, 8.5 * layout.scale),
      fontWeight: "700",
      letterSpacing: 0.8,
    }),
  );
}

function renderReveal(layer: Container, layout: BoardLayout): void {
  const zone = layout.cardZones.reveal;
  const slot = layout.slots.reveal;
  layer.addChild(
    label("REVEAL", zone.x + zone.width / 2, zone.y + 3, {
      anchorX: 0.5,
      color: COLORS.creamMuted,
      fontSize: Math.max(7, 8.5 * layout.scale),
      fontWeight: "700",
      letterSpacing: 0.8,
    }),
    new Graphics()
      .roundRect(slot.x, slot.y, slot.width, slot.height, Math.max(3, slot.width * 0.1))
      .fill({ color: COLORS.cream, alpha: 0.02 })
      .stroke({ color: COLORS.gold, alpha: 0.3, width: Math.max(1, layout.scale) }),
  );
}

function renderStatus(layer: Container, layout: BoardLayout, fullscreen: boolean): void {
  const identity = layout.uiZones.opponentIdentity;
  const status = layout.uiZones.roundStatus;
  const action = layout.uiZones.actionBar;
  const compact = layout.mode === "compactPortrait" || layout.mode === "landscape";
  const actionLabel =
    layout.mode === "desktop"
      ? "PERSISTENT CARD RUNTIME · DECK SWITCHING IS LOCAL-ONLY"
      : compact
        ? "CARD RUNTIME · INPUT IN 2D"
        : "PERSISTENT CARDS · GAMEPLAY INPUT IN 2D";

  layer.addChild(
    panel(identity, {
      fill: COLORS.ink,
      fillAlpha: 0.88,
      radius: Math.min(12, identity.height * 0.32),
      stroke: COLORS.cream,
      strokeAlpha: 0.14,
    }),
    label(
      "OPPONENT",
      identity.x + Math.max(8, identity.width * 0.04),
      identity.y + identity.height / 2,
      {
        anchorY: 0.5,
        color: COLORS.creamMuted,
        fontSize: Math.max(8, 10 * layout.scale),
        fontWeight: "700",
        letterSpacing: 0.8,
      },
    ),
    label(
      "0 PTS",
      identity.x + identity.width - Math.max(8, identity.width * 0.04),
      identity.y + identity.height / 2,
      {
        anchorX: 1,
        anchorY: 0.5,
        color: COLORS.cream,
        fontSize: Math.max(9, 12 * layout.scale),
        fontWeight: "700",
      },
    ),
    panel(status, {
      fill: COLORS.ink,
      fillAlpha: 0.88,
      radius: Math.min(12, status.height * 0.32),
      stroke: COLORS.cream,
      strokeAlpha: 0.14,
    }),
    label(
      compact ? "ROUND 1 · JAN" : "ROUND 1 · JANUARY",
      status.x + Math.max(8, status.width * 0.03),
      status.y + status.height / 2,
      {
        anchorY: 0.5,
        color: COLORS.cream,
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
      { fill: COLORS.red, radius: 999 },
    ),
    label(
      "1×",
      status.x + status.width - Math.max(23, 29 * layout.scale),
      status.y + status.height / 2,
      {
        anchorX: 0.5,
        anchorY: 0.5,
        color: COLORS.white,
        fontSize: Math.max(10, 13 * layout.scale),
        fontWeight: "700",
      },
    ),
    panel(action, {
      fill: COLORS.gold,
      fillAlpha: 0.11,
      radius: Math.min(16, action.height * 0.36),
      stroke: COLORS.gold,
      strokeAlpha: 0.52,
      strokeWidth: Math.max(1, layout.scale),
    }),
    label(actionLabel, action.x + action.width / 2, action.y + action.height / 2, {
      anchorX: 0.5,
      anchorY: 0.5,
      color: COLORS.gold,
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
        color: COLORS.creamMuted,
        fontSize: Math.max(6, 7 * layout.scale),
        fontWeight: "600",
        letterSpacing: 0.45,
      },
    ),
  );
}

export function createTableScene(
  app: Application,
  initialDeck: ActiveDeckTextures<Texture>,
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
  const cardRegistry = createCardViewRegistry(initialDeck);
  let currentLayout: BoardLayout | null = null;
  let currentFullscreen = false;
  let displayProjection = createPresentationProjection(CARD_SHOWCASE_ASSIGNMENTS);
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
    cardRegistry.applyPlacements(
      currentAnimationFrame
        ? computeAnimatedCardPlacements(
            layout,
            currentAnimationFrame.clip,
            currentAnimationFrame.progress,
            currentAnimationFrame.mode,
          )
        : computeCardPlacements(layout, displayProjection),
      cardLayers as ReadonlyMap<(typeof BOARD_LAYER_ORDER)[number], Container>,
    );

    const background = requiredChrome("BackgroundLayer");
    background.addChild(
      new Graphics()
        .rect(0, 0, layout.viewport.width, layout.viewport.height)
        .fill({ color: COLORS.backdrop }),
      panel(layout.safeBounds, {
        fill: COLORS.table,
        radius: Math.max(14, 22 * layout.scale),
        stroke: COLORS.gold,
        strokeAlpha: 0.3,
        strokeWidth: Math.max(1, 1.5 * layout.scale),
      }),
      new Graphics()
        .circle(
          layout.safeBounds.x + layout.safeBounds.width / 2,
          layout.safeBounds.y + layout.safeBounds.height / 2,
          Math.min(layout.safeBounds.width, layout.safeBounds.height) * 0.32,
        )
        .fill({ color: COLORS.gold, alpha: 0.025 }),
    );

    renderHand(
      requiredChrome("OpponentHandLayer"),
      layout.cardZones.opponentHand,
      "opponent",
      layout.scale,
    );
    const currentCards = cardRegistry.inspect();
    renderCaptureSummary(
      requiredChrome("OpponentCaptureLayer"),
      layout,
      "opponent",
      currentCards.zoneCounts,
    );
    renderField(requiredChrome("FieldLayer"), layout);
    renderDrawPile(requiredChrome("DrawPileLayer"), layout);
    renderReveal(requiredChrome("RevealLayer"), layout);
    renderCaptureSummary(
      requiredChrome("PlayerCaptureLayer"),
      layout,
      "player",
      currentCards.zoneCounts,
    );
    renderHand(
      requiredChrome("PlayerHandLayer"),
      layout.cardZones.playerHand,
      "player",
      layout.scale,
    );
    renderStatus(requiredChrome("InteractionOverlayLayer"), layout, fullscreen);
  };

  return {
    applyDeck: (textures) => {
      cardRegistry.applyDeck(textures);
    },
    redraw,
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
