import { Application, type Texture } from "pixi.js";

import {
  advancePreviewTime,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
} from "./app/table-preview-state";
import { computeBoardLayout, inspectBoardLayout } from "./presentation/board/board-layout";
import { CARD_ZONES, type BoardLayout } from "./presentation/board/types";
import type { CardRuntimeInspection } from "./presentation/cards/types";
import {
  createPixiCardAssetManager,
  type CardAssetManager,
} from "./presentation/deck/card-asset-manager";
import { INSTALLED_DECKS, isInstalledDeckId } from "./presentation/deck/installed-decks";
import { createTableScene, type TableScene } from "./presentation/pixi/create-table-scene";
import "./style.css";

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The KoiKoi4x application shell is missing ${selector}.`);
  }
  return element;
}

const host = queryRequired<HTMLElement>("[data-game-host]");
const status = queryRequired<HTMLElement>("[data-table-status]");
const fullscreenButton = queryRequired<HTMLButtonElement>("[data-fullscreen-button]");
const deckSelect = queryRequired<HTMLSelectElement>("[data-deck-select]");

let application: Application | undefined;
let tableScene: TableScene | undefined;
let cardAssetManager: CardAssetManager<Texture> | undefined;
let currentLayout: BoardLayout | undefined;
let ready = false;
let simulationTimeMs = 0;
let deckStatus: "error" | "loading" | "ready" = "loading";

const unavailableCards: CardRuntimeInspection = Object.freeze({
  activeDeckId: "unavailable",
  cardViewCount: 0,
  uniqueCardIdCount: 0,
  views: Object.freeze([]),
  zoneCounts: Object.freeze(Object.fromEntries(CARD_ZONES.map((zone) => [zone, 0]))) as Readonly<
    Record<(typeof CARD_ZONES)[number], number>
  >,
});

function snapshot() {
  const boardViewport = {
    width: Math.max(240, host.clientWidth),
    height: Math.max(240, host.clientHeight),
  };
  const layout = currentLayout ?? computeBoardLayout(boardViewport);
  const scene = tableScene?.inspect() ?? {
    root: { label: "TableScene" as const, token: "unavailable" },
    layers: [],
    cards: unavailableCards,
  };
  const activeManifest = cardAssetManager?.active?.manifest ?? null;
  return createTablePreviewSnapshot({
    ready,
    canvasCount: document.querySelectorAll("canvas").length,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    boardViewport,
    fullscreen: document.fullscreenElement !== null,
    simulationTimeMs,
    layout,
    scene,
    deck: {
      activeDeckId: activeManifest?.packageId ?? null,
      approvalStatus: activeManifest?.approvalStatus ?? null,
      availableDeckIds: INSTALLED_DECKS.map(({ id }) => id),
      status: deckStatus,
    },
    diagnostics: inspectBoardLayout(layout),
  });
}

function redraw(): void {
  if (!application || !tableScene) {
    return;
  }

  const width = Math.max(240, host.clientWidth);
  const height = Math.max(240, host.clientHeight);
  application.renderer.resize(width, height);
  currentLayout = computeBoardLayout({ width, height });
  tableScene.redraw({
    fullscreen: document.fullscreenElement !== null,
    layout: currentLayout,
  });
  application.render();
}

function updateFullscreenLabel(): void {
  const fullscreen = document.fullscreenElement !== null;
  fullscreenButton.textContent = fullscreen ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  redraw();
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
    } else {
      status.textContent = "Fullscreen is unavailable in this browser. The table remains playable.";
    }
  } catch (error: unknown) {
    status.textContent = `Fullscreen could not be changed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

async function switchDeck(deckId: string): Promise<void> {
  if (!isInstalledDeckId(deckId) || !cardAssetManager || !tableScene || !application) {
    return;
  }
  const scene = tableScene;
  const previousDeckId = cardAssetManager.active?.manifest.packageId ?? INSTALLED_DECKS[0].id;
  deckStatus = "loading";
  deckSelect.disabled = true;
  status.textContent = `Loading ${INSTALLED_DECKS.find(({ id }) => id === deckId)?.name ?? deckId}…`;
  try {
    const activation = await cardAssetManager.activate(deckId, (bundle) => {
      scene.applyDeck(bundle);
    });
    if (activation.status === "stale" || !activation.bundle) return;
    deckStatus = "ready";
    redraw();
    status.textContent = `${activation.bundle.manifest.name} ready. Deck switching changed textures only; all 48 canonical CardViews stayed in place.`;
  } catch (error: unknown) {
    deckStatus = "error";
    deckSelect.value = previousDeckId;
    status.textContent = `Deck switch failed; ${previousDeckId} remains active. ${error instanceof Error ? error.message : "Unknown error"}`;
  } finally {
    deckSelect.disabled = false;
  }
}

window.__KOIKOI4X_READY__ = false;
window.__KOIKOI4X_SNAPSHOT__ = snapshot;
window.render_game_to_text = () => serializeTablePreviewSnapshot(snapshot());
window.advanceTime = (milliseconds: number) => {
  simulationTimeMs = advancePreviewTime(simulationTimeMs, milliseconds);
  application?.render();
};

fullscreenButton.addEventListener("click", () => {
  void toggleFullscreen();
});
deckSelect.addEventListener("change", () => {
  void switchDeck(deckSelect.value);
});

document.addEventListener("fullscreenchange", updateFullscreenLabel);
window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  if (isEditing) {
    return;
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    void toggleFullscreen();
  } else if (event.key === "Escape" && document.fullscreenElement) {
    void document.exitFullscreen();
  }
});

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
  app.canvas.setAttribute(
    "aria-label",
    "Responsive KoiKoi4x table layout preview with opponent, field, draw, captures, hand, and action zones",
  );
  host.replaceChildren(app.canvas);

  application = app;
  cardAssetManager = createPixiCardAssetManager(
    new URL(import.meta.env.BASE_URL, window.location.origin).href,
  );
  const initialActivation = await cardAssetManager.activate(INSTALLED_DECKS[0].id);
  if (initialActivation.status !== "activated" || !initialActivation.bundle) {
    throw new Error("The initial runtime deck activation was superseded.");
  }
  tableScene = createTableScene(app, initialActivation.bundle);
  const resizeObserver = new ResizeObserver(redraw);
  resizeObserver.observe(host);

  ready = true;
  deckStatus = "ready";
  deckSelect.value = initialActivation.bundle.manifest.packageId;
  deckSelect.disabled = false;
  window.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
  status.textContent =
    "Technical Sunrise ready. Switch decks to verify persistent cards; gameplay controls arrive in Phase 2D.";
  redraw();
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  deckStatus = "error";
  status.textContent = `The rendering surface could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
