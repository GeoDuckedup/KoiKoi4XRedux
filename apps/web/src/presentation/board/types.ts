export const BOARD_LAYOUT_VERSION = 1 as const;

export const BOARD_LAYER_ORDER = Object.freeze([
  "BackgroundLayer",
  "OpponentHandLayer",
  "OpponentCaptureLayer",
  "FieldLayer",
  "DrawPileLayer",
  "RevealLayer",
  "PlayerCaptureLayer",
  "PlayerHandLayer",
  "EffectsLayer",
  "InteractionOverlayLayer",
] as const);

export const CARD_ZONES = Object.freeze([
  "drawPile",
  "reveal",
  "playerHand",
  "opponentHand",
  "field",
  "playerBrights",
  "playerAnimals",
  "playerScrolls",
  "playerPlains",
  "opponentBrights",
  "opponentAnimals",
  "opponentScrolls",
  "opponentPlains",
  "transit",
] as const);

export type BoardLayerName = (typeof BOARD_LAYER_ORDER)[number];
export type CardZone = (typeof CARD_ZONES)[number];
export type BoardLayoutMode = "compactPortrait" | "portrait" | "landscape" | "desktop";

export interface BoardViewport {
  height: number;
  width: number;
}

export interface BoardRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface BoardCardMetrics {
  cornerRadius: number;
  height: number;
  width: number;
}

export interface BoardUiZones {
  actionBar: BoardRect;
  opponentIdentity: BoardRect;
  roundStatus: BoardRect;
}

export interface BoardSlotLayout {
  drawPile: BoardRect;
  field: readonly BoardRect[];
  opponentHand: readonly BoardRect[];
  playerHand: readonly BoardRect[];
  reveal: BoardRect;
}

export interface BoardLayout {
  cardMetrics: BoardCardMetrics;
  cardZones: Readonly<Record<CardZone, BoardRect>>;
  layerOrder: typeof BOARD_LAYER_ORDER;
  mode: BoardLayoutMode;
  safeBounds: BoardRect;
  scale: number;
  slots: BoardSlotLayout;
  uiZones: BoardUiZones;
  version: typeof BOARD_LAYOUT_VERSION;
  viewport: BoardViewport;
}

export interface BoardLayoutDiagnostics {
  clippedZones: readonly string[];
  invalidZones: readonly string[];
  overlapViolations: readonly string[];
}

export interface BoardSceneInspection {
  emptyFieldPlaceholderCount: number;
  layers: readonly {
    label: BoardLayerName;
    token: string;
  }[];
  root: {
    label: "TableScene";
    token: string;
  };
}
