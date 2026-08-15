import { CARD_IDS, type CardId } from "@koikoi4x/engine";
import { Application, type Texture } from "pixi.js";

import { createPresentationProjection } from "./presentation/animation/projection";
import type { PresentationBoardProjection } from "./presentation/animation/types";
import {
  computeAdaptiveFieldLayout,
  MAX_PLAYABLE_FIELD_CARD_COUNT,
} from "./presentation/board/adaptive-field-layout";
import { computeBoardLayout, inspectBoardLayout } from "./presentation/board/board-layout";
import { computeCardPlacements } from "./presentation/cards/card-layout";
import { CARD_SHOWCASE_ASSIGNMENTS } from "./presentation/cards/showcase";
import type { CardPresentationState } from "./presentation/cards/types";
import {
  createPixiCardAssetManager,
  type CardAssetManager,
} from "./presentation/deck/card-asset-manager";
import { createDomCardBridge } from "./presentation/input/dom-card-bridge";
import { buildSemanticCardControls } from "./presentation/input/hit-areas";
import type { InputInteractionInspectionV1 } from "./presentation/input/types";
import { createTableScene, type TableScene } from "./presentation/pixi/create-table-scene";
import { DEFAULT_PHASE_3D_VISUAL_DIRECTION } from "./presentation/theme/visual-directions";
import "./style.css";

const FIELD_CARD_IDS = Object.freeze(CARD_IDS.slice(0, MAX_PLAYABLE_FIELD_CARD_COUNT));
const LEGAL_TARGET_CARD_IDS = Object.freeze(
  [FIELD_CARD_IDS[0], FIELD_CARD_IDS[8], FIELD_CARD_IDS[16]].filter(
    (cardId): cardId is CardId => cardId !== undefined,
  ),
);

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Dense-field review is missing ${selector}.`);
  return element;
}

function createDenseProjection(): PresentationBoardProjection {
  const fieldIds = new Set<CardId>(FIELD_CARD_IDS);
  let fieldSlotIndex = 0;
  let drawSlotIndex = 0;
  return createPresentationProjection(
    CARD_SHOWCASE_ASSIGNMENTS.map((state): CardPresentationState => {
      const zone = fieldIds.has(state.cardId) ? ("field" as const) : ("drawPile" as const);
      const slotIndex = zone === "field" ? fieldSlotIndex++ : drawSlotIndex++;
      return Object.freeze({
        ...state,
        zone,
        faceUp: zone === "field",
        interactive: false,
        selected: false,
        slotId: `${zone}:${slotIndex}`,
        slotIndex,
        zIndex: slotIndex,
      });
    }),
  );
}

function targetInspection(focusedCardId: CardId | null): InputInteractionInspectionV1 {
  return Object.freeze({
    status: "targeting",
    confirmationMode: "guided",
    lockReason: null,
    selectedCardId: null,
    selectableCardIds: Object.freeze([]),
    legalTargetCardIds: LEGAL_TARGET_CARD_IDS,
    handResolutionKind: "captureChoice",
    fieldPlacementAvailable: false,
    decisionChoices: Object.freeze([]),
    confirmAvailable: false,
    cancelAvailable: true,
    focusedCardId,
    matchId: "phase3dd-non-shipping-review",
    observationStateVersion: 1,
    lastIntentType: null,
    emittedIntentCount: 0,
  });
}

const host = queryRequired<HTMLElement>("[data-game-host]");
const overlay = queryRequired<HTMLElement>("[data-card-input-overlay]");
const summary = queryRequired<HTMLElement>("[data-density-summary]");
const projection = createDenseProjection();
let application: Application | null = null;
let scene: TableScene | null = null;
let assetManager: CardAssetManager<Texture> | null = null;
let focusedCardId: CardId | null = null;
let activatedCardId: CardId | null = null;
let currentSnapshot: Readonly<Record<string, unknown>> = Object.freeze({ ready: false });

const bridge = createDomCardBridge({
  root: overlay,
  onActivate: (cardId) => {
    activatedCardId = cardId;
    render();
  },
  onCancel: () => {
    activatedCardId = null;
    render();
  },
  onFocus: (cardId) => {
    focusedCardId = cardId;
    render();
  },
  onInspect: () => undefined,
});

function render(): void {
  if (!application || !scene) return;
  const viewport = {
    width: Math.max(240, host.clientWidth),
    height: Math.max(240, host.clientHeight),
  };
  application.renderer.resize(viewport.width, viewport.height);
  const layout = computeBoardLayout(viewport);
  const fieldLayout = computeAdaptiveFieldLayout(layout, FIELD_CARD_IDS.length);
  const inspection = targetInspection(focusedCardId);
  scene.setInteractionState({
    selectedCardId: null,
    selectableCardIds: Object.freeze([]),
    legalTargetCardIds: LEGAL_TARGET_CARD_IDS,
    handResolutionKind: inspection.handResolutionKind,
    fieldPlacementAvailable: false,
    focusedCardId,
    locked: false,
  });
  scene.redraw({ fullscreen: false, layout });
  const controls = buildSemanticCardControls({ inspection, layout, projection });
  bridge.render(controls);
  application.render();
  const placements = computeCardPlacements(layout, projection).filter(
    ({ zone }) => zone === "field",
  );
  currentSnapshot = Object.freeze({
    ready: true,
    harness: "phase3dd-non-shipping",
    viewport,
    field: Object.freeze({
      count: FIELD_CARD_IDS.length,
      order: FIELD_CARD_IDS,
      columns: fieldLayout.columns,
      rows: fieldLayout.rows,
      cardWidth: fieldLayout.cardMetrics.width,
      cardHeight: fieldLayout.cardMetrics.height,
      gap: fieldLayout.gap,
      placements: Object.freeze(
        placements.map(({ cardId, bounds }) => Object.freeze({ cardId, bounds })),
      ),
    }),
    targets: Object.freeze(
      controls
        .filter(({ actionable, role }) => actionable && role === "target")
        .map(({ cardId, bounds, ariaLabel }) => Object.freeze({ cardId, bounds, ariaLabel })),
    ),
    activatedCardId,
    focusedCardId,
    diagnostics: inspectBoardLayout(layout),
    canvasCount: document.querySelectorAll("canvas").length,
    cardViewCount: scene.inspect().cards.cardViewCount,
  });
  summary.textContent = `${FIELD_CARD_IDS.length} cards · ${fieldLayout.columns} × ${fieldLayout.rows} · ${Math.round(fieldLayout.cardMetrics.width)} px wide`;
}

const reviewWindow = window as Window & {
  __KOIKOI4X_READY__: boolean;
  render_game_to_text: () => string;
};
reviewWindow.__KOIKOI4X_READY__ = false;
reviewWindow.render_game_to_text = () => JSON.stringify(currentSnapshot);

async function start(): Promise<void> {
  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  app.ticker.stop();
  app.canvas.dataset.gameCanvas = "true";
  app.canvas.setAttribute("role", "img");
  app.canvas.setAttribute("aria-label", "Technical KoiKoi4x table with seventeen field cards");
  host.replaceChildren(app.canvas);
  application = app;
  assetManager = createPixiCardAssetManager(
    new URL(import.meta.env.BASE_URL, window.location.origin).href,
  );
  const activation = await assetManager.activate("new-primary-deck");
  if (activation.status !== "activated" || !activation.bundle) {
    throw new Error("The dense-field review deck activation was superseded.");
  }
  scene = createTableScene(app, activation.bundle, DEFAULT_PHASE_3D_VISUAL_DIRECTION);
  scene.setStatus({
    multiplier: 1,
    opponentHandCount: 0,
    opponentLabel: "Opponent",
    opponentScore: 0,
    playerHandCount: 0,
    playerLabel: "Player",
    playerScore: 0,
    roundLabel: "Technical density boundary",
  });
  scene.snapTo(projection);
  new ResizeObserver(render).observe(host);
  render();
  reviewWindow.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
}

void start().catch((error: unknown) => {
  document.documentElement.dataset.appReady = "error";
  summary.textContent = error instanceof Error ? error.message : "Dense-field review failed.";
  console.error(error);
});
