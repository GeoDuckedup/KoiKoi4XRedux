import { Application, type Texture } from "pixi.js";

import {
  advancePreviewTime,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
} from "./app/table-preview-state";
import { computeBoardLayout, inspectBoardLayout } from "./presentation/board/board-layout";
import { CARD_ZONES, type BoardLayout } from "./presentation/board/types";
import { createAnimationDirector } from "./presentation/animation/animation-director";
import {
  getTechnicalAnimationScenario,
  TECHNICAL_ANIMATION_SCENARIO_IDS,
  type TechnicalAnimationScenarioId,
} from "./presentation/animation/technical-scenarios";
import {
  ANIMATION_MODES,
  type AnimationDirectorV1,
  type AnimationInspectionV1,
  type AnimationMode,
} from "./presentation/animation/types";
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
const scenarioSelect = queryRequired<HTMLSelectElement>("[data-animation-scenario]");
const modeSelect = queryRequired<HTMLSelectElement>("[data-animation-mode]");
const playButton = queryRequired<HTMLButtonElement>("[data-animation-play]");
const accelerateButton = queryRequired<HTMLButtonElement>("[data-animation-accelerate]");
const finishButton = queryRequired<HTMLButtonElement>("[data-animation-finish]");
const cancelButton = queryRequired<HTMLButtonElement>("[data-animation-cancel]");

let application: Application | undefined;
let tableScene: TableScene | undefined;
let cardAssetManager: CardAssetManager<Texture> | undefined;
let currentLayout: BoardLayout | undefined;
let ready = false;
let simulationTimeMs = 0;
let deckStatus: "error" | "loading" | "ready" = "loading";
let animationDirector: AnimationDirectorV1 | undefined;
let scenarioId: TechnicalAnimationScenarioId = "handToField";
let manualAnimationClock = false;
let animationFrameId: number | undefined;
let previousFrameTime: number | undefined;

const unavailableAnimation: AnimationInspectionV1 = Object.freeze({
  status: "idle",
  mode: "normal",
  planId: null,
  activeClip: null,
  queuedPlanCount: 0,
  queuedClipCount: 0,
  speedMultiplier: 1,
  lastCompletion: null,
  displayFingerprint: "unavailable",
  targetFingerprint: "unavailable",
});

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
    animation: animationDirector?.inspect() ?? unavailableAnimation,
    ready,
    canvasCount: document.querySelectorAll("canvas").length,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    boardViewport,
    fullscreen: document.fullscreenElement !== null,
    simulationTimeMs,
    scenarioId,
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

function readScenarioId(value: string): TechnicalAnimationScenarioId {
  if (!TECHNICAL_ANIMATION_SCENARIO_IDS.includes(value as TechnicalAnimationScenarioId)) {
    throw new Error(`Unknown technical animation scenario: ${value}.`);
  }
  return value as TechnicalAnimationScenarioId;
}

function readAnimationMode(value: string): AnimationMode {
  if (!ANIMATION_MODES.includes(value as AnimationMode)) {
    throw new Error(`Unknown animation mode: ${value}.`);
  }
  return value as AnimationMode;
}

function requiredScenarioProjection(
  scenario: ReturnType<typeof getTechnicalAnimationScenario>,
  index: number,
) {
  const projection = index < 0 ? scenario.projections.at(index) : scenario.projections[index];
  if (!projection) throw new Error(`Scenario ${scenario.id} is missing projection ${index}.`);
  return projection;
}

function updateAnimationControls(): void {
  const busy = animationDirector?.isBusy() ?? false;
  playButton.disabled = !ready || busy;
  scenarioSelect.disabled = !ready || busy;
  modeSelect.disabled = !ready || busy;
  accelerateButton.disabled = !busy;
  finishButton.disabled = !busy;
  cancelButton.disabled = !busy;
}

function stopAnimationLoop(): void {
  if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
  animationFrameId = undefined;
  previousFrameTime = undefined;
}

function ensureAnimationLoop(): void {
  if (manualAnimationClock || animationFrameId !== undefined || !animationDirector?.isBusy())
    return;
  const frame = (time: number): void => {
    animationFrameId = undefined;
    const deltaMs =
      previousFrameTime === undefined ? 0 : Math.min(50, Math.max(0, time - previousFrameTime));
    previousFrameTime = time;
    simulationTimeMs = advancePreviewTime(simulationTimeMs, deltaMs);
    animationDirector?.advanceBy(deltaMs);
    application?.render();
    updateAnimationControls();
    if (animationDirector?.isBusy()) {
      animationFrameId = requestAnimationFrame(frame);
    } else {
      previousFrameTime = undefined;
    }
  };
  animationFrameId = requestAnimationFrame(frame);
}

async function playTechnicalScenario(): Promise<void> {
  if (!animationDirector || !application) return;
  scenarioId = readScenarioId(scenarioSelect.value);
  const mode = readAnimationMode(modeSelect.value);
  const scenario = getTechnicalAnimationScenario(scenarioId);
  await animationDirector.cancelAndSnapTo(requiredScenarioProjection(scenario, 0));
  animationDirector.setMode(mode);
  const completion = animationDirector.play(scenario.events, { projections: scenario.projections });
  status.textContent = `${scenario.label} playing in ${mode} mode. This is presentation-only.`;
  updateAnimationControls();
  application.render();
  ensureAnimationLoop();
  const result = await completion;
  status.textContent = `${scenario.label} ${result}; display projection matches its trusted target.`;
  updateAnimationControls();
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
  manualAnimationClock = true;
  stopAnimationLoop();
  simulationTimeMs = advancePreviewTime(simulationTimeMs, milliseconds);
  animationDirector?.advanceBy(milliseconds);
  application?.render();
  updateAnimationControls();
};

fullscreenButton.addEventListener("click", () => {
  void toggleFullscreen();
});
deckSelect.addEventListener("change", () => {
  void switchDeck(deckSelect.value);
});
scenarioSelect.addEventListener("change", () => {
  scenarioId = readScenarioId(scenarioSelect.value);
});
modeSelect.addEventListener("change", () => {
  animationDirector?.setMode(readAnimationMode(modeSelect.value));
});
playButton.addEventListener("click", () => {
  void playTechnicalScenario();
});
accelerateButton.addEventListener("click", () => {
  animationDirector?.accelerate();
  status.textContent = "Animation accelerated. Press Faster again to finish immediately.";
  application?.render();
  updateAnimationControls();
  ensureAnimationLoop();
});
finishButton.addEventListener("click", () => {
  void animationDirector?.finishImmediately().then(() => {
    status.textContent = "Animation finished immediately at the trusted target projection.";
    application?.render();
    updateAnimationControls();
  });
});
cancelButton.addEventListener("click", () => {
  const scenario = getTechnicalAnimationScenario(scenarioId);
  void animationDirector?.cancelAndSnapTo(requiredScenarioProjection(scenario, -1)).then(() => {
    status.textContent = "Animation cancelled and snapped to the trusted target projection.";
    application?.render();
    updateAnimationControls();
  });
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
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initialMode: AnimationMode = prefersReducedMotion ? "reducedMotion" : "normal";
  modeSelect.value = initialMode;
  scenarioSelect.value = scenarioId;
  const initialScenario = getTechnicalAnimationScenario(scenarioId);
  animationDirector = createAnimationDirector({
    initialProjection: requiredScenarioProjection(initialScenario, 0),
    mode: initialMode,
    surface: tableScene,
  });
  const resizeObserver = new ResizeObserver(redraw);
  resizeObserver.observe(host);

  ready = true;
  deckStatus = "ready";
  deckSelect.value = initialActivation.bundle.manifest.packageId;
  deckSelect.disabled = false;
  window.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
  status.textContent =
    "Technical Sunrise ready. Play a semantic animation scenario; gameplay controls arrive in Phase 2D.";
  updateAnimationControls();
  redraw();
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  deckStatus = "error";
  status.textContent = `The rendering surface could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
