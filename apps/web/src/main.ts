import { Application, type Texture } from "pixi.js";
import {
  getMonthDefinition,
  type PlayerId,
  type PlayerObservationV1,
  type PublicPhaseV1,
} from "@koikoi4x/engine";

import {
  advancePreviewTime,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
} from "./app/table-preview-state";
import {
  createLocalRoundRuntime,
  PHASE_3A_MATCH_ID,
  type LocalRoundRuntimeV1,
  type LocalRoundTransitionV1,
} from "./game/local-round-runtime";
import {
  createInteractionSourceFromObservation,
  projectObservationToBoard,
  projectTransitionForPlayer,
} from "./game/observation-presentation";
import { formatTurnRecap } from "./game/turn-recap";
import { createAnimationDirector } from "./presentation/animation/animation-director";
import { projectionsEqual } from "./presentation/animation/projection";
import {
  ANIMATION_MODES,
  type AnimationDirectorV1,
  type AnimationInspectionV1,
  type AnimationMode,
  type PresentationBoardProjection,
} from "./presentation/animation/types";
import { computeBoardLayout, inspectBoardLayout } from "./presentation/board/board-layout";
import { CARD_ZONES, type BoardLayout } from "./presentation/board/types";
import type { CardRuntimeInspection } from "./presentation/cards/types";
import {
  createPixiCardAssetManager,
  type CardAssetManager,
} from "./presentation/deck/card-asset-manager";
import { INSTALLED_DECKS, isInstalledDeckId } from "./presentation/deck/installed-decks";
import { createDomCardBridge, type DomCardBridgeV1 } from "./presentation/input/dom-card-bridge";
import { buildSemanticCardControls } from "./presentation/input/hit-areas";
import { createInteractionController } from "./presentation/input/input-controller";
import {
  INPUT_CONFIRMATION_MODES,
  type InputCommandIntentV1,
  type InputConfirmationMode,
  type InputInteractionInspectionV1,
  type InputLockReason,
  type InteractionControllerV1,
} from "./presentation/input/types";
import {
  createTableScene,
  type TableScene,
  type TableSceneStatusV1,
} from "./presentation/pixi/create-table-scene";
import "./style.css";

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`The KoiKoi4x application shell is missing ${selector}.`);
  return element;
}

const host = queryRequired<HTMLElement>("[data-game-host]");
const status = queryRequired<HTMLElement>("[data-table-status]");
const fullscreenButton = queryRequired<HTMLButtonElement>("[data-fullscreen-button]");
const deckSelect = queryRequired<HTMLSelectElement>("[data-deck-select]");
const modeSelect = queryRequired<HTMLSelectElement>("[data-animation-mode]");
const accelerateButton = queryRequired<HTMLButtonElement>("[data-animation-accelerate]");
const finishButton = queryRequired<HTMLButtonElement>("[data-animation-finish]");
const cardInputOverlay = queryRequired<HTMLElement>("[data-card-input-overlay]");
const inputModeSelect = queryRequired<HTMLSelectElement>("[data-input-mode]");
const inputConfirmButton = queryRequired<HTMLButtonElement>("[data-input-confirm]");
const inputCancelButton = queryRequired<HTMLButtonElement>("[data-input-cancel]");
const inputBankButton = queryRequired<HTMLButtonElement>("[data-input-bank]");
const inputKoiKoiButton = queryRequired<HTMLButtonElement>("[data-input-koi-koi]");
const inputInstruction = queryRequired<HTMLElement>("[data-input-instruction]");
const newRoundButton = queryRequired<HTMLButtonElement>("[data-new-round]");
const handoff = queryRequired<HTMLElement>("[data-handoff]");
const handoffTitle = queryRequired<HTMLElement>("[data-handoff-title]");
const handoffDescription = queryRequired<HTMLElement>("[data-handoff-description]");
const handoffReady = queryRequired<HTMLButtonElement>("[data-handoff-ready]");
const recapList = queryRequired<HTMLOListElement>("[data-turn-recaps]");

let application: Application | undefined;
let tableScene: TableScene | undefined;
let cardAssetManager: CardAssetManager<Texture> | undefined;
let currentLayout: BoardLayout | undefined;
let animationDirector: AnimationDirectorV1 | undefined;
let interactionController: InteractionControllerV1 | undefined;
let domCardBridge: DomCardBridgeV1 | undefined;
let runtime: LocalRoundRuntimeV1 = createLocalRoundRuntime();
let observation: PlayerObservationV1 = runtime.observe();
let projection: PresentationBoardProjection = projectObservationToBoard(observation);
let ready = false;
let simulationTimeMs = 0;
let deckStatus: "error" | "loading" | "ready" = "loading";
let processingIntent = false;
let handoffPlayerId: PlayerId | null = null;
let semanticControlCount = 0;
let commandCount = 0;
let restartCount = 0;
let animationFrameId: number | undefined;
let previousFrameTime: number | undefined;
let manualAnimationClock = false;
let pendingTurnEvents: LocalRoundTransitionV1["events"][number][] = [];
const recaps: string[] = ["Round ready. Player A begins."];

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

function activePlayerId(phase: PublicPhaseV1): PlayerId | null {
  return phase.kind === "roundComplete" || phase.kind === "matchComplete" ? null : phase.playerId;
}

function playerName(playerId: PlayerId): string {
  return playerId === "player-a" ? "Player A" : "Player B";
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "player-a" ? "player-b" : "player-a";
}

function phaseActionLabel(phase: PublicPhaseV1): string {
  if (handoffPlayerId) return `Pass to ${playerName(handoffPlayerId)}`;
  if (phase.kind === "awaitingHandPlay") return `${playerName(phase.playerId)} · Play a hand card`;
  if (phase.kind === "awaitingDrawCapture") return `${playerName(phase.playerId)} · Choose capture`;
  if (phase.kind === "awaitingYakuDecision")
    return `${playerName(phase.playerId)} · Bank or Koi-Koi`;
  return phase.kind === "roundComplete" ? "Round complete" : "Match complete";
}

function tableStatusModel(): TableSceneStatusV1 {
  const own = observation.publicState.players.find(({ id }) => id === observation.playerId);
  const opponent = observation.publicState.players.find(
    ({ id }) => id === otherPlayer(observation.playerId),
  );
  if (!own || !opponent) throw new Error("LOCAL_OBSERVATION_PLAYERS_INVALID");
  const month = getMonthDefinition(observation.publicState.round.scheduledMonth);
  return Object.freeze({
    actionLabel: phaseActionLabel(observation.publicState.phase),
    multiplier: observation.publicState.round.tableMultiplier,
    opponentHandCount: opponent.handCount,
    opponentLabel: playerName(opponent.id),
    opponentScore: opponent.score,
    playerHandCount: own.handCount,
    playerLabel: playerName(own.id),
    playerScore: own.score,
    roundLabel: `Round ${observation.publicState.round.roundNumber} · ${month.name}`,
  });
}

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
  const phase = observation.publicState.phase;
  return createTablePreviewSnapshot({
    animation: animationDirector?.inspect() ?? unavailableAnimation,
    ready,
    canvasCount: document.querySelectorAll("canvas").length,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    boardViewport,
    fullscreen: document.fullscreenElement !== null,
    input: interactionController?.inspect() ?? unavailableInput,
    semanticControlCount,
    localRound: {
      viewerId: observation.playerId,
      activePlayerId: activePlayerId(phase),
      stateVersion: observation.publicState.stateVersion,
      phase: phase.kind,
      roundNumber: observation.publicState.round.roundNumber,
      scheduledMonth: observation.publicState.round.scheduledMonth,
      handoffPending: handoffPlayerId !== null,
      recapCount: recaps.length,
      latestRecap: recaps.at(-1) ?? null,
      commandCount,
    },
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

function readAnimationMode(value: string): AnimationMode {
  if (!ANIMATION_MODES.includes(value as AnimationMode)) {
    throw new Error(`Unknown animation mode: ${value}.`);
  }
  return value as AnimationMode;
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
  if (processingIntent) return "awaitingObservation";
  if (handoffPlayerId !== null) return "remoteReplay";
  return null;
}

function inputMessage(inspection: InputInteractionInspectionV1): string {
  if (handoffPlayerId) return `Pass the device to ${playerName(handoffPlayerId)}.`;
  if (inspection.status === "intentPending") return "Move accepted. Updating the local round.";
  if (inspection.status === "locked") {
    if (inspection.lockReason === "roundTransition") return "The round is complete.";
    return "Card input is temporarily locked.";
  }
  if (inspection.status === "decision") return "Yaku complete. Choose Bank or Koi-Koi.";
  if (inspection.status === "targeting") {
    return `Choose one of ${inspection.legalTargetCardIds.length} highlighted capture targets.`;
  }
  if (inspection.status === "confirming") {
    return inspection.legalTargetCardIds.length > 0
      ? "Review the highlighted capture, then confirm."
      : "This card will be placed on the field. Confirm or cancel.";
  }
  return inspection.confirmationMode === "guided"
    ? "Select a hand card, review the result, then confirm."
    : "Select a hand card. Unambiguous plays happen immediately.";
}

function renderRecaps(): void {
  recapList.replaceChildren(
    ...recaps.map((recap) => {
      const item = document.createElement("li");
      item.textContent = recap;
      return item;
    }),
  );
}

function renderSemanticCardBridge(): void {
  if (!interactionController || !currentLayout) return;
  const controls = buildSemanticCardControls({
    inspection: interactionController.inspect(),
    layout: currentLayout,
    projection,
  });
  semanticControlCount = controls.length;
  domCardBridge?.render(controls);
}

function refreshInteractionSurface(): void {
  if (!interactionController || !currentLayout || !tableScene) return;
  interactionController.setExternalLock(currentInputLock());
  const inspection = interactionController.inspect();
  tableScene.setStatus(tableStatusModel());
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
  inputModeSelect.disabled = processingIntent || handoffPlayerId !== null;
  inputConfirmButton.disabled = !inspection.confirmAvailable;
  inputCancelButton.disabled = !inspection.cancelAvailable;
  inputBankButton.hidden = !inspection.decisionChoices.includes("bank");
  inputKoiKoiButton.hidden = !inspection.decisionChoices.includes("koiKoi");
  inputBankButton.disabled = inspection.status !== "decision";
  inputKoiKoiButton.disabled = inspection.status !== "decision";
  inputInstruction.textContent = inputMessage(inspection);
  updateControls();
  application?.render();
}

function updateControls(): void {
  const busy = animationDirector?.isBusy() ?? false;
  accelerateButton.disabled = !busy;
  finishButton.disabled = !busy;
  deckSelect.disabled = deckStatus === "loading" || processingIntent;
  newRoundButton.disabled = busy || processingIntent || handoffPlayerId !== null;
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
    updateControls();
    if (animationDirector?.isBusy()) animationFrameId = requestAnimationFrame(frame);
    else previousFrameTime = undefined;
  };
  animationFrameId = requestAnimationFrame(frame);
}

function recordCompletedTurn(transition: LocalRoundTransitionV1): void {
  pendingTurnEvents.push(...transition.events);
  const boundary = transition.events.some(
    ({ type }) => type === "turnCompleted" || type === "roundResultCommitted",
  );
  if (!boundary) return;
  const recap = formatTurnRecap(pendingTurnEvents);
  if (recap.length > 0) recaps.push(recap);
  pendingTurnEvents = [];
  renderRecaps();
}

async function executeIntent(intent: InputCommandIntentV1): Promise<void> {
  if (!animationDirector || processingIntent) return;
  processingIntent = true;
  status.textContent = "Move accepted by the local engine. Replaying the public result…";
  refreshInteractionSurface();
  let transition: LocalRoundTransitionV1;
  try {
    transition = runtime.submit(intent);
  } catch (error: unknown) {
    status.textContent = `The move was rejected without changing the table: ${error instanceof Error ? error.message : "unknown error"}`;
    processingIntent = false;
    refreshInteractionSurface();
    return;
  }

  commandCount += 1;
  let animationSettledNormally = true;
  try {
    const planned = projectTransitionForPlayer({
      before: projection,
      events: transition.events,
      nextObservation: transition.after,
    });
    if (!projectionsEqual(planned.source, projection)) {
      await animationDirector.cancelAndSnapTo(planned.source);
      projection = planned.source;
    }
    const completion = animationDirector.play(transition.events, {
      projections: planned.projections,
    });
    ensureAnimationLoop();
    await completion;
    projection = planned.target;
  } catch {
    animationSettledNormally = false;
    projection = projectObservationToBoard(transition.after, projection);
    await animationDirector.cancelAndSnapTo(projection);
  }

  try {
    observation = transition.after;
    recordCompletedTurn(transition);
    interactionController?.replaceSource(createInteractionSourceFromObservation(observation));
    handoffPlayerId = transition.handoffPlayerId;
    if (handoffPlayerId) {
      handoffTitle.textContent = `Pass to ${playerName(handoffPlayerId)}`;
      handoffDescription.textContent = `${playerName(observation.playerId)}’s turn is complete. The table is covered until ${playerName(handoffPlayerId)} is ready.`;
      handoff.hidden = false;
      handoffReady.textContent = `${playerName(handoffPlayerId)} ready`;
      status.textContent = `Turn complete. Pass the device to ${playerName(handoffPlayerId)}.`;
    } else if (transition.roundComplete) {
      status.textContent = "The local round is complete. Review the recap or start a new round.";
    } else if (!animationSettledNormally) {
      status.textContent = "Move applied. Presentation settled directly to the confirmed state.";
    } else {
      status.textContent = inputMessage(interactionController?.inspect() ?? unavailableInput);
    }
  } catch (error: unknown) {
    status.textContent = `The confirmed move was applied, but its local presentation could not refresh: ${error instanceof Error ? error.message : "unknown error"}`;
    console.error(error);
  } finally {
    processingIntent = false;
    refreshInteractionSurface();
  }
}

function createController(): InteractionControllerV1 {
  return createInteractionController({
    source: createInteractionSourceFromObservation(observation),
    confirmationMode: readInputConfirmationMode(inputModeSelect.value),
    onIntent: (intent) => void executeIntent(intent),
  });
}

async function acceptHandoff(): Promise<void> {
  if (!handoffPlayerId || !animationDirector) return;
  const nextPlayer = handoffPlayerId;
  observation = runtime.switchViewer(nextPlayer);
  const nextProjection = projectObservationToBoard(observation);
  await animationDirector.cancelAndSnapTo(nextProjection);
  projection = nextProjection;
  interactionController?.replaceSource(createInteractionSourceFromObservation(observation));
  handoffPlayerId = null;
  handoff.hidden = true;
  status.textContent = `${playerName(nextPlayer)} is ready. Select a hand card.`;
  refreshInteractionSurface();
}

async function resetLocalRound(): Promise<void> {
  if (!animationDirector) return;
  restartCount += 1;
  runtime = createLocalRoundRuntime({ matchId: `${PHASE_3A_MATCH_ID}-${restartCount}` });
  observation = runtime.observe();
  projection = projectObservationToBoard(observation);
  pendingTurnEvents = [];
  recaps.splice(0, recaps.length, "Round ready. Player A begins.");
  commandCount = 0;
  handoffPlayerId = null;
  handoff.hidden = true;
  await animationDirector.cancelAndSnapTo(projection);
  interactionController = createController();
  renderRecaps();
  status.textContent = "New local round ready. Player A begins.";
  refreshInteractionSurface();
}

function redraw(): void {
  if (!application || !tableScene) return;
  const width = Math.max(240, host.clientWidth);
  const height = Math.max(240, host.clientHeight);
  application.renderer.resize(width, height);
  currentLayout = computeBoardLayout({ width, height });
  tableScene.redraw({ fullscreen: document.fullscreenElement !== null, layout: currentLayout });
  renderSemanticCardBridge();
  application.render();
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
    else status.textContent = "Fullscreen is unavailable; the table remains playable.";
  } catch (error: unknown) {
    status.textContent = `Fullscreen could not be changed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

function updateFullscreenLabel(): void {
  const fullscreen = document.fullscreenElement !== null;
  fullscreenButton.textContent = fullscreen ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  redraw();
}

async function switchDeck(deckId: string): Promise<void> {
  if (!isInstalledDeckId(deckId) || !cardAssetManager || !tableScene || !application) return;
  const previousDeckId = cardAssetManager.active?.manifest.packageId ?? INSTALLED_DECKS[0].id;
  deckStatus = "loading";
  status.textContent = `Loading ${INSTALLED_DECKS.find(({ id }) => id === deckId)?.name ?? deckId}…`;
  refreshInteractionSurface();
  try {
    const activation = await cardAssetManager.activate(deckId, (bundle) =>
      tableScene?.applyDeck(bundle),
    );
    if (activation.status === "stale" || !activation.bundle) return;
    deckStatus = "ready";
    redraw();
    status.textContent = `${activation.bundle.manifest.name} ready. Card identities and game state were unchanged.`;
  } catch (error: unknown) {
    deckStatus = "error";
    deckSelect.value = previousDeckId;
    status.textContent = `Deck switch failed; ${previousDeckId} remains active. ${error instanceof Error ? error.message : "unknown error"}`;
  } finally {
    refreshInteractionSurface();
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
  updateControls();
};

fullscreenButton.addEventListener("click", () => void toggleFullscreen());
deckSelect.addEventListener("change", () => void switchDeck(deckSelect.value));
modeSelect.addEventListener("change", () => {
  animationDirector?.setMode(readAnimationMode(modeSelect.value));
});
accelerateButton.addEventListener("click", () => {
  animationDirector?.accelerate();
  status.textContent = "Animation accelerated. Press Faster again to finish.";
  ensureAnimationLoop();
});
finishButton.addEventListener("click", () => void animationDirector?.finishImmediately());
inputModeSelect.addEventListener("change", () => {
  interactionController?.setConfirmationMode(readInputConfirmationMode(inputModeSelect.value));
  refreshInteractionSurface();
});
inputConfirmButton.addEventListener("click", () => {
  interactionController?.confirm();
  refreshInteractionSurface();
});
inputCancelButton.addEventListener("click", () => {
  if (interactionController?.cancel()) status.textContent = "Card selection cancelled.";
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
newRoundButton.addEventListener("click", () => void resetLocalRound());
handoffReady.addEventListener("click", () => void acceptHandoff());
document.addEventListener("fullscreenchange", updateFullscreenLabel);
window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);
  if (isEditing) return;
  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    void toggleFullscreen();
  } else if (event.key === "Escape" && document.fullscreenElement) {
    void document.exitFullscreen();
  } else if (event.key === "Escape" && interactionController?.cancel()) {
    event.preventDefault();
    status.textContent = "Card selection cancelled.";
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
    "Playable KoiKoi4x table with opponent hand, field, draw pile, captures, and your hand",
  );
  host.replaceChildren(app.canvas);
  application = app;
  cardAssetManager = createPixiCardAssetManager(
    new URL(import.meta.env.BASE_URL, window.location.origin).href,
  );
  const initialActivation = await cardAssetManager.activate("new-primary-deck");
  if (initialActivation.status !== "activated" || !initialActivation.bundle) {
    throw new Error("The approved primary deck activation was superseded.");
  }
  tableScene = createTableScene(app, initialActivation.bundle);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initialMode: AnimationMode = prefersReducedMotion ? "reducedMotion" : "normal";
  modeSelect.value = initialMode;
  animationDirector = createAnimationDirector({
    initialProjection: projection,
    mode: initialMode,
    surface: tableScene,
  });
  inputModeSelect.value = "guided";
  interactionController = createController();
  domCardBridge = createDomCardBridge({
    root: cardInputOverlay,
    onActivate: (cardId) => {
      if (interactionController?.activateCard(cardId)) {
        status.textContent = inputMessage(interactionController.inspect());
      }
      refreshInteractionSurface();
    },
    onCancel: () => {
      if (interactionController?.cancel()) status.textContent = "Card selection cancelled.";
      refreshInteractionSurface();
    },
    onFocus: (cardId) => {
      interactionController?.setFocusedCardId(cardId);
      refreshInteractionSurface();
    },
  });
  new ResizeObserver(redraw).observe(host);
  ready = true;
  deckStatus = "ready";
  deckSelect.value = initialActivation.bundle.manifest.packageId;
  window.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
  status.textContent = "Phase 3A local round ready. Player A begins.";
  renderRecaps();
  redraw();
  refreshInteractionSurface();
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  deckStatus = "error";
  status.textContent = `The local round could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
