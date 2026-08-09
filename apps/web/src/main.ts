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
import { createDomCardBridge, type DomCardBridgeV1 } from "./presentation/input/dom-card-bridge";
import { buildSemanticCardControls } from "./presentation/input/hit-areas";
import { createInteractionController } from "./presentation/input/input-controller";
import {
  getTechnicalInputFixture,
  TECHNICAL_INPUT_FIXTURE_IDS,
  type TechnicalInputFixtureId,
  type TechnicalInputFixtureV1,
} from "./presentation/input/technical-input-fixtures";
import {
  INPUT_CONFIRMATION_MODES,
  type InputCommandIntentV1,
  type InputConfirmationMode,
  type InputInteractionInspectionV1,
  type InputLockReason,
  type InteractionControllerV1,
} from "./presentation/input/types";
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
const cardInputOverlay = queryRequired<HTMLElement>("[data-card-input-overlay]");
const inputFixtureSelect = queryRequired<HTMLSelectElement>("[data-input-fixture]");
const inputModeSelect = queryRequired<HTMLSelectElement>("[data-input-mode]");
const inputConfirmButton = queryRequired<HTMLButtonElement>("[data-input-confirm]");
const inputCancelButton = queryRequired<HTMLButtonElement>("[data-input-cancel]");
const inputBankButton = queryRequired<HTMLButtonElement>("[data-input-bank]");
const inputKoiKoiButton = queryRequired<HTMLButtonElement>("[data-input-koi-koi]");
const inputInstruction = queryRequired<HTMLElement>("[data-input-instruction]");

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
let interactionController: InteractionControllerV1 | undefined;
let domCardBridge: DomCardBridgeV1 | undefined;
let inputFixtureId: TechnicalInputFixtureId = "handPlay";
let inputFixtureVersion = 1;
let inputFixture: TechnicalInputFixtureV1 = getTechnicalInputFixture(
  inputFixtureId,
  inputFixtureVersion,
);
let semanticControlCount = 0;
let awaitingObservation = false;

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

const unavailableInput: InputInteractionInspectionV1 = Object.freeze({
  status: "locked",
  confirmationMode: "guided",
  lockReason: "roundTransition",
  selectedCardId: null,
  selectableCardIds: Object.freeze([]),
  legalTargetCardIds: Object.freeze([]),
  decisionChoices: Object.freeze([]),
  confirmAvailable: false,
  cancelAvailable: false,
  focusedCardId: null,
  matchId: "unavailable",
  observationStateVersion: 0,
  lastIntentType: null,
  emittedIntentCount: 0,
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
    input: interactionController?.inspect() ?? unavailableInput,
    inputFixtureId,
    semanticControlCount,
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

function readInputFixtureId(value: string): TechnicalInputFixtureId {
  if (!TECHNICAL_INPUT_FIXTURE_IDS.includes(value as TechnicalInputFixtureId)) {
    throw new Error(`Unknown technical input fixture: ${value}.`);
  }
  return value as TechnicalInputFixtureId;
}

function readInputConfirmationMode(value: string): InputConfirmationMode {
  if (!INPUT_CONFIRMATION_MODES.includes(value as InputConfirmationMode)) {
    throw new Error(`Unknown input confirmation mode: ${value}.`);
  }
  return value as InputConfirmationMode;
}

function currentInputLock(): InputLockReason | null {
  if (deckStatus === "loading") return "deckLoading";
  if (animationDirector?.isBusy()) return "animation";
  if (awaitingObservation) return "awaitingObservation";
  return null;
}

function inputMessage(inspection: InputInteractionInspectionV1): string {
  if (inspection.status === "intentPending") {
    return `${inspection.lastIntentType ?? "Input"} intent created. It was not executed; reset the fixture for another try.`;
  }
  if (inspection.status === "locked") {
    const messages: Readonly<Record<InputLockReason, string>> = {
      animation: "Card input is locked while the presentation animation is playing.",
      awaitingObservation: "Animation settled. Reset the fixture to simulate a fresh observation.",
      deckLoading: "Card input is locked while the local deck textures change.",
      disconnected: "Card input is locked while disconnected.",
      opponentTurn: "Opponent turn: this player has no legal input.",
      remoteReplay: "Card input is locked during opponent replay.",
      roundTransition: "Card input is locked during the round or match transition.",
    };
    return messages[inspection.lockReason ?? "roundTransition"];
  }
  if (inspection.status === "decision") {
    return "Yaku decision: choose the available Bank or Koi-Koi intent.";
  }
  if (inspection.status === "targeting") {
    return `Choose one of ${inspection.legalTargetCardIds.length} highlighted legal targets.`;
  }
  if (inspection.status === "confirming") {
    return inspection.legalTargetCardIds.length > 0
      ? "Review the highlighted outcome, then activate it or press Confirm play."
      : "This play has no field target. Press Confirm play or Escape to cancel.";
  }
  return inspection.confirmationMode === "guided"
    ? "Guided input: select a hand card, review the legal outcome, then confirm."
    : "Fast input: single legal hand actions emit immediately; choices still require a target.";
}

function interactionIntentCreated(intent: InputCommandIntentV1): void {
  const detail =
    intent.action.type === "playHandCard"
      ? ` for ${intent.action.cardId}`
      : intent.action.type === "chooseYakuDecision"
        ? `: ${intent.action.choice === "bank" ? "Bank" : "Koi-Koi"}`
        : "";
  status.textContent = `${intent.action.type} intent${detail} created at state version ${intent.expectedStateVersion}. No engine command or game state was executed.`;
  refreshInteractionSurface();
}

function renderSemanticCardBridge(): void {
  if (!interactionController || !currentLayout) return;
  const controls = buildSemanticCardControls({
    inspection: interactionController.inspect(),
    layout: currentLayout,
    projection: inputFixture.projection,
  });
  semanticControlCount = controls.length;
  domCardBridge?.render(controls);
}

function refreshInteractionSurface(): void {
  if (!interactionController || !currentLayout || !tableScene) return;
  interactionController.setExternalLock(currentInputLock());
  const inspection = interactionController.inspect();
  tableScene.setInteractionState({
    selectedCardId: inspection.selectedCardId,
    selectableCardIds: inspection.selectableCardIds,
    legalTargetCardIds: inspection.legalTargetCardIds,
    focusedCardId: inspection.focusedCardId,
    locked:
      inspection.status === "locked" ||
      inspection.status === "intentPending" ||
      inspection.status === "decision",
  });
  renderSemanticCardBridge();

  const busy = animationDirector?.isBusy() ?? false;
  const pending = inspection.status === "intentPending";
  inputFixtureSelect.disabled = busy;
  inputModeSelect.disabled = busy || pending;
  inputConfirmButton.disabled = !inspection.confirmAvailable;
  const canReset = inspection.status === "intentPending" || awaitingObservation;
  inputCancelButton.disabled = !inspection.cancelAvailable && !canReset;
  inputCancelButton.textContent = canReset ? "Reset demo" : "Cancel";
  inputBankButton.hidden = !inspection.decisionChoices.includes("bank");
  inputKoiKoiButton.hidden = !inspection.decisionChoices.includes("koiKoi");
  inputBankButton.disabled = inspection.status !== "decision";
  inputKoiKoiButton.disabled = inspection.status !== "decision";
  inputInstruction.textContent = inputMessage(inspection);
  application?.render();
}

async function loadTechnicalInputFixture(id = inputFixtureId): Promise<void> {
  if (!animationDirector) return;
  inputFixtureId = id;
  inputFixtureVersion += 1;
  inputFixture = getTechnicalInputFixture(inputFixtureId, inputFixtureVersion);
  awaitingObservation = false;
  await animationDirector.cancelAndSnapTo(inputFixture.projection);
  interactionController?.replaceSource(inputFixture.source);
  inputFixtureSelect.value = inputFixtureId;
  status.textContent = `${inputFixture.label} input fixture ready. ${inputFixture.description} Intent output remains local and unexecuted.`;
  refreshInteractionSurface();
  updateAnimationControls();
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
  const intentPending = interactionController?.inspect().status === "intentPending";
  playButton.disabled = !ready || busy || intentPending;
  scenarioSelect.disabled = !ready || busy;
  modeSelect.disabled = !ready || busy;
  accelerateButton.disabled = !busy;
  finishButton.disabled = !busy;
  cancelButton.disabled = !busy;
  deckSelect.disabled = deckStatus === "loading" || Boolean(intentPending);
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
      awaitingObservation = true;
      refreshInteractionSurface();
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
  awaitingObservation = false;
  status.textContent = `${scenario.label} playing in ${mode} mode. This is presentation-only.`;
  refreshInteractionSurface();
  updateAnimationControls();
  application.render();
  ensureAnimationLoop();
  const result = await completion;
  awaitingObservation = true;
  status.textContent = `${scenario.label} ${result}; display projection matches its trusted target.`;
  refreshInteractionSurface();
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
  renderSemanticCardBridge();
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
  refreshInteractionSurface();
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
    refreshInteractionSurface();
    updateAnimationControls();
  }
}

window.__KOIKOI4X_READY__ = false;
window.__KOIKOI4X_SNAPSHOT__ = snapshot;
window.render_game_to_text = () => serializeTablePreviewSnapshot(snapshot());
window.advanceTime = (milliseconds: number) => {
  const wasBusy = animationDirector?.isBusy() ?? false;
  manualAnimationClock = true;
  stopAnimationLoop();
  simulationTimeMs = advancePreviewTime(simulationTimeMs, milliseconds);
  animationDirector?.advanceBy(milliseconds);
  application?.render();
  if (wasBusy && !animationDirector?.isBusy()) {
    awaitingObservation = true;
    refreshInteractionSurface();
  }
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
    awaitingObservation = true;
    status.textContent = "Animation finished immediately at the trusted target projection.";
    refreshInteractionSurface();
    updateAnimationControls();
  });
});
cancelButton.addEventListener("click", () => {
  const scenario = getTechnicalAnimationScenario(scenarioId);
  void animationDirector?.cancelAndSnapTo(requiredScenarioProjection(scenario, -1)).then(() => {
    awaitingObservation = true;
    status.textContent = "Animation cancelled and snapped to the trusted target projection.";
    refreshInteractionSurface();
    updateAnimationControls();
  });
});

inputFixtureSelect.addEventListener("change", () => {
  void loadTechnicalInputFixture(readInputFixtureId(inputFixtureSelect.value));
});
inputModeSelect.addEventListener("change", () => {
  interactionController?.setConfirmationMode(readInputConfirmationMode(inputModeSelect.value));
  status.textContent = `${inputModeSelect.value === "guided" ? "Guided" : "Fast"} confirmation mode selected. No intent has been executed.`;
  refreshInteractionSurface();
});
inputConfirmButton.addEventListener("click", () => {
  if (interactionController?.confirm()) return;
  refreshInteractionSurface();
});
inputCancelButton.addEventListener("click", () => {
  if (interactionController?.inspect().status === "intentPending" || awaitingObservation) {
    void loadTechnicalInputFixture();
    return;
  }
  if (interactionController?.cancel()) {
    status.textContent = "Input selection cancelled. No intent was created.";
  }
  refreshInteractionSurface();
});
inputBankButton.addEventListener("click", () => {
  interactionController?.chooseYakuDecision("bank");
  refreshInteractionSurface();
});
inputKoiKoiButton.addEventListener("click", () => {
  interactionController?.chooseYakuDecision("koiKoi");
  refreshInteractionSurface();
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
  } else if (event.key === "Escape" && interactionController?.cancel()) {
    event.preventDefault();
    status.textContent = "Input selection cancelled. No intent was created.";
    refreshInteractionSurface();
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
  animationDirector = createAnimationDirector({
    initialProjection: inputFixture.projection,
    mode: initialMode,
    surface: tableScene,
  });
  inputFixtureSelect.value = inputFixtureId;
  inputModeSelect.value = "guided";
  interactionController = createInteractionController({
    source: inputFixture.source,
    confirmationMode: readInputConfirmationMode(inputModeSelect.value),
    onIntent: interactionIntentCreated,
  });
  domCardBridge = createDomCardBridge({
    root: cardInputOverlay,
    onActivate: (cardId) => {
      const controller = interactionController;
      if (!controller) return;
      const changed = controller.activateCard(cardId);
      if (changed && controller.inspect().status !== "intentPending") {
        status.textContent = inputMessage(controller.inspect());
      }
      refreshInteractionSurface();
    },
    onCancel: () => {
      if (interactionController?.cancel()) {
        status.textContent = "Input selection cancelled. No intent was created.";
      }
      refreshInteractionSurface();
    },
    onFocus: (cardId) => {
      interactionController?.setFocusedCardId(cardId);
      refreshInteractionSurface();
    },
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
    "Phase 2D technical input ready. Select a legal card by pointer or keyboard; emitted intents are displayed but never executed.";
  updateAnimationControls();
  redraw();
  refreshInteractionSurface();
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  deckStatus = "error";
  status.textContent = `The rendering surface could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
