import { Application, type Texture } from "pixi.js";
import {
  getCardDefinition,
  getMonthDefinition,
  type MatchLength,
  type PlayerId,
  type PlayerObservationV1,
  type PublicPhaseV1,
} from "@koikoi4x/engine";

import {
  advancePreviewTime,
  createTablePreviewSnapshot,
  serializeTablePreviewSnapshot,
} from "./app/table-preview-state";
import { shouldClearSemanticControlsForPrivacy } from "./app/semantic-control-privacy";
import {
  createCaptureInspectionPresentation,
  type CaptureInspectionOwnerV1,
} from "./game/capture-inspection";
import { createCardInspectionPresentation } from "./game/card-inspection";
import { createContextualHelpPresentation } from "./game/contextual-help";
import {
  createCpuRoundRuntime,
  createLocalRoundRuntime,
  createFreshLocalMatchSeed,
  PHASE_3A_MATCH_ID,
  restoreLocalRoundRuntime,
  resolveFreshLocalMatchLength,
  shouldReplaceLocalInteractionSource,
  type LocalRoundRuntimeV1,
  type LocalRoundTransitionV1,
} from "./game/local-round-runtime";
import type { CpuDecisionReasonV1, CpuDifficultyV1, CpuPersonalityV1 } from "./ai/fair-heuristic";
import {
  createCpuSessionRootSeed,
  createCpuWorkerRequestOwnership,
  createRolloutCpuClient,
} from "./ai/rollout-client";
import {
  createIndexedDbLocalSaveRepository,
  createLocalSaveStore,
  createSanitizedLocalSaveDiagnostic,
  decodeLocalSaveV1,
  localSaveSnapshot,
  type LocalSaveV1,
  type LocalSaveStoreV1,
} from "./game/local-save";
import {
  createInteractionSourceFromObservation,
  projectObservationToBoard,
  projectTransitionForPlayer,
} from "./game/observation-presentation";
import { formatTurnRecap } from "./game/turn-recap";
import {
  createRoundResultPresentation,
  type RoundResultPresentationV1,
} from "./game/round-result-presentation";
import {
  createYakuPresentationState,
  type YakuPresentationStateV1,
} from "./game/yaku-presentation";
import {
  type CardYakuGuideEntryV1,
  YAKU_GUIDE_ENTRIES,
  YAKU_GUIDE_GROUPS,
  YAKU_GUIDE_NOTES,
} from "./game/yaku-guide";
import { createAnimationDirector } from "./presentation/animation/animation-director";
import { projectionsEqual } from "./presentation/animation/projection";
import type {
  AnimationDirectorV1,
  AnimationInspectionV1,
  AnimationMode,
  PresentationBoardProjection,
} from "./presentation/animation/types";
import { computeBoardLayout, inspectBoardLayout } from "./presentation/board/board-layout";
import { computeAdaptiveFieldLayout } from "./presentation/board/adaptive-field-layout";
import { CARD_ZONES, type BoardLayout, type BoardRect } from "./presentation/board/types";
import type { CardRuntimeInspection } from "./presentation/cards/types";
import {
  createPixiCardAssetManager,
  type CardAssetManager,
} from "./presentation/deck/card-asset-manager";
import { INSTALLED_DECKS, isInstalledDeckId } from "./presentation/deck/installed-decks";
import { createDomCardBridge, type DomCardBridgeV1 } from "./presentation/input/dom-card-bridge";
import { shouldShowHandPlayAttention } from "./presentation/input/hand-play-attention";
import {
  findFaceUpLegalFieldPlacements,
  resolveFieldDestinationAttention,
} from "./presentation/input/field-destination-attention";
import { buildSemanticCardControls } from "./presentation/input/hit-areas";
import { createInteractionController } from "./presentation/input/input-controller";
import {
  findFaceUpRevealPlacement,
  shouldShowRevealPlayAttention,
} from "./presentation/input/reveal-play-attention";
import type {
  InputCommandIntentV1,
  InputInteractionInspectionV1,
  InputLockReason,
  InteractionControllerV1,
} from "./presentation/input/types";
import {
  createTableScene,
  type TableScene,
  type TableSceneStatusV1,
} from "./presentation/pixi/create-table-scene";
import { createThemePreferenceStore } from "./presentation/theme/theme-preferences";
import {
  DEFAULT_PHASE_3D_VISUAL_DIRECTION,
  type Phase3DVisualDirectionV1,
} from "./presentation/theme/visual-directions";
import "./style.css";

function applyThemeToDocument(theme: Phase3DVisualDirectionV1): void {
  document.documentElement.dataset.theme = theme.id;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme.css.page);
}

const themeStore = createThemePreferenceStore();
let activeTheme = DEFAULT_PHASE_3D_VISUAL_DIRECTION;
applyThemeToDocument(activeTheme);

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`The KoiKoi4x application shell is missing ${selector}.`);
  return element;
}

const host = queryRequired<HTMLElement>("[data-game-host]");
const status = queryRequired<HTMLElement>("[data-table-status]");
const contextHelpTrigger = queryRequired<HTMLButtonElement>("[data-context-help-trigger]");
const contextHelpDialog = queryRequired<HTMLDialogElement>("[data-context-help-dialog]");
const contextHelpClose = queryRequired<HTMLButtonElement>("[data-context-help-close]");
const contextHelpTitle = queryRequired<HTMLElement>("[data-context-help-title]");
const contextHelpSummary = queryRequired<HTMLElement>("[data-context-help-summary]");
const contextHelpSteps = queryRequired<HTMLOListElement>("[data-context-help-steps]");
const historyTrigger = queryRequired<HTMLButtonElement>("[data-history-trigger]");
const historyDialog = queryRequired<HTMLDialogElement>("[data-history-dialog]");
const historyClose = queryRequired<HTMLButtonElement>("[data-history-close]");
const historyEmpty = queryRequired<HTMLElement>("[data-history-empty]");
const yakuGuideTrigger = queryRequired<HTMLButtonElement>("[data-yaku-guide-trigger]");
const yakuGuideDialog = queryRequired<HTMLDialogElement>("[data-yaku-guide-dialog]");
const yakuGuideClose = queryRequired<HTMLButtonElement>("[data-yaku-guide-close]");
const yakuGuideGroups = queryRequired<HTMLElement>("[data-yaku-guide-groups]");
const yakuGuideNotes = queryRequired<HTMLUListElement>("[data-yaku-guide-notes]");
const optionsTrigger = queryRequired<HTMLButtonElement>("[data-options-trigger]");
const optionsDialog = queryRequired<HTMLDialogElement>("[data-options-dialog]");
const optionsClose = queryRequired<HTMLButtonElement>("[data-options-close]");
const optionsAnnouncement = queryRequired<HTMLElement>("[data-options-announcement]");
const persistenceStatus = queryRequired<HTMLElement>("[data-persistence-status]");
const persistenceWarning = queryRequired<HTMLElement>("[data-persistence-warning]");
const localSaveDialog = queryRequired<HTMLDialogElement>("[data-local-save-dialog]");
const localSaveDialogEyebrow = queryRequired<HTMLElement>("[data-local-save-dialog-eyebrow]");
const localSaveDialogTitle = queryRequired<HTMLElement>("[data-local-save-dialog-title]");
const localSaveDialogCopy = queryRequired<HTMLElement>("[data-local-save-dialog-copy]");
const localSaveDialogMeta = queryRequired<HTMLElement>("[data-local-save-dialog-meta]");
const localSaveDialogWarning = queryRequired<HTMLElement>("[data-local-save-dialog-warning]");
const localSavePrimary = queryRequired<HTMLButtonElement>("[data-local-save-primary]");
const localSaveDelete = queryRequired<HTMLButtonElement>("[data-local-save-delete]");
const localSaveSecondary = queryRequired<HTMLButtonElement>("[data-local-save-secondary]");
const localSaveCpu = queryRequired<HTMLButtonElement>("[data-local-save-cpu]");
const themeOptions = Object.freeze([
  ...document.querySelectorAll<HTMLInputElement>("[data-theme-option]"),
]);
const fullscreenButton = queryRequired<HTMLButtonElement>("[data-fullscreen-button]");
const matchLengthSelect = queryRequired<HTMLSelectElement>("[data-match-length-select]");
const matchModeSelect = queryRequired<HTMLSelectElement>("[data-match-mode-select]");
const cpuPersonalityOptions = queryRequired<HTMLElement>("[data-cpu-personality-options]");
const cpuPersonalityInputs = Object.freeze([
  ...document.querySelectorAll<HTMLInputElement>("[data-cpu-personality]"),
]);
const cpuDifficultyOptions = queryRequired<HTMLElement>("[data-cpu-difficulty-options]");
const cpuDifficultyInputs = Object.freeze([
  ...document.querySelectorAll<HTMLInputElement>("[data-cpu-difficulty]"),
]);
const deckSelect = queryRequired<HTMLSelectElement>("[data-deck-select]");
const cardInputOverlay = queryRequired<HTMLElement>("[data-card-input-overlay]");
const handPlayAttention = queryRequired<HTMLElement>("[data-hand-play-attention]");
const revealPlayAttention = queryRequired<HTMLElement>("[data-reveal-play-attention]");
const fieldDestinationAttention = queryRequired<HTMLElement>("[data-field-destination-attention]");
const fieldPlacementControl = queryRequired<HTMLButtonElement>("[data-input-field-placement]");
const captureInspectControls = Object.freeze([
  ...document.querySelectorAll<HTMLButtonElement>("[data-capture-inspect]"),
]);
const captureInspector = queryRequired<HTMLDialogElement>("[data-capture-inspector]");
const captureInspectorTitle = queryRequired<HTMLElement>("[data-capture-inspector-title]");
const captureInspectorGroups = queryRequired<HTMLElement>("[data-capture-inspector-groups]");
const captureInspectorClose = queryRequired<HTMLButtonElement>("[data-capture-inspector-close]");
const cardInspector = queryRequired<HTMLDialogElement>("[data-card-inspector]");
const cardInspectorClose = queryRequired<HTMLButtonElement>("[data-card-inspector-close]");
const cardInspectorTitle = queryRequired<HTMLElement>("[data-card-inspector-title]");
const cardInspectorMonth = queryRequired<HTMLElement>("[data-card-inspector-month]");
const cardInspectorImage = queryRequired<HTMLImageElement>("[data-card-inspector-image]");
const cardInspectorYaku = queryRequired<HTMLDetailsElement>("[data-card-inspector-yaku]");
const cardInspectorYakuSummary = queryRequired<HTMLElement>("[data-card-inspector-yaku-summary]");
const cardInspectorYakuEntries = queryRequired<HTMLElement>("[data-card-inspector-yaku-entries]");
const inputInstruction = queryRequired<HTMLElement>("[data-input-instruction]");
const newRoundButton = queryRequired<HTMLButtonElement>("[data-new-round]");
const handoff = queryRequired<HTMLElement>("[data-handoff]");
const handoffTitle = queryRequired<HTMLElement>("[data-handoff-title]");
const handoffDescription = queryRequired<HTMLElement>("[data-handoff-description]");
const handoffReady = queryRequired<HTMLButtonElement>("[data-handoff-ready]");
const cpuTurnStatus = queryRequired<HTMLElement>("[data-cpu-turn-status]");
const cpuTurnCopy = queryRequired<HTMLElement>("[data-cpu-turn-copy]");
const cpuDecisionCopy = queryRequired<HTMLElement>("[data-cpu-decision-copy]");
const recapList = queryRequired<HTMLOListElement>("[data-turn-recaps]");
const latestRecap = queryRequired<HTMLElement>("[data-latest-recap]");
const yakuFeedback = queryRequired<HTMLElement>("[data-yaku-feedback]");
const yakuFeedbackMessage = queryRequired<HTMLElement>("[data-yaku-feedback-message]");
const yakuDecision = queryRequired<HTMLElement>("[data-yaku-decision]");
const yakuDecisionTitle = queryRequired<HTMLElement>("[data-yaku-decision-title]");
const yakuDecisionSummary = queryRequired<HTMLElement>("[data-yaku-decision-summary]");
const yakuDecisionTotal = queryRequired<HTMLElement>("[data-yaku-decision-total]");
const yakuDecisionResume = queryRequired<HTMLElement>("[data-yaku-decision-resume]");
const yakuBankUnavailable = queryRequired<HTMLElement>("[data-yaku-bank-unavailable]");
const yakuBankButton = queryRequired<HTMLButtonElement>("[data-yaku-bank]");
const yakuKoiKoiButton = queryRequired<HTMLButtonElement>("[data-yaku-koi-koi]");
const yakuProgress = queryRequired<HTMLElement>("[data-yaku-progress]");
const roundResult = queryRequired<HTMLElement>("[data-round-result]");
const roundResultContext = queryRequired<HTMLElement>("[data-round-result-context]");
const roundResultTitle = queryRequired<HTMLElement>("[data-round-result-title]");
const roundResultOutcome = queryRequired<HTMLElement>("[data-round-result-outcome]");
const roundResultFacts = queryRequired<HTMLElement>("[data-round-result-facts]");
const roundResultScoringDetails = queryRequired<HTMLElement>("[data-round-result-scoring-details]");
const roundResultArithmetic = queryRequired<HTMLElement>("[data-round-result-arithmetic]");
const roundResultMultipliers = queryRequired<HTMLElement>("[data-round-result-multipliers]");
const roundResultYaku = queryRequired<HTMLUListElement>("[data-round-result-yaku]");
const roundResultYakuCount = queryRequired<HTMLElement>("[data-round-result-yaku-count]");
const roundResultScoringMultiplier = queryRequired<HTMLElement>(
  "[data-round-result-scoring-multiplier]",
);
const roundResultAwardedPoints = queryRequired<HTMLElement>("[data-round-result-awarded-points]");
const roundResultNext = queryRequired<HTMLElement>("[data-round-result-next]");
const roundResultScoreA = queryRequired<HTMLElement>("[data-round-result-score-a]");
const roundResultScoreB = queryRequired<HTMLElement>("[data-round-result-score-b]");
const roundResultEvidence = queryRequired<HTMLElement>("[data-round-result-evidence]");
const roundResultEvidenceList = queryRequired<HTMLUListElement>(
  "[data-round-result-evidence-list]",
);
const roundResultTransition = queryRequired<HTMLElement>("[data-round-result-transition]");
const roundResultTransitionTitle = queryRequired<HTMLElement>(
  "[data-round-result-transition-title]",
);
const roundResultTransitionCopy = queryRequired<HTMLElement>("[data-round-result-transition-copy]");
const roundResultPrivilege = queryRequired<HTMLElement>("[data-round-result-privilege]");
const roundResultHistory = queryRequired<HTMLElement>("[data-round-result-history]");
const roundResultHistoryList = queryRequired<HTMLOListElement>("[data-round-result-history-list]");
const roundResultDetails = queryRequired<HTMLDetailsElement>("[data-round-result-details]");
const roundResultDetailsSummary = queryRequired<HTMLElement>(
  "[data-round-result-details] > summary",
);
const roundResultAction = queryRequired<HTMLButtonElement>("[data-round-result-action]");

let application: Application | undefined;
let tableScene: TableScene | undefined;
let cardAssetManager: CardAssetManager<Texture> | undefined;
let currentLayout: BoardLayout | undefined;
let animationDirector: AnimationDirectorV1 | undefined;
let interactionController: InteractionControllerV1 | undefined;
let domCardBridge: DomCardBridgeV1 | undefined;
let selectedMatchLength: MatchLength = 3;
let selectedMatchMode: "cpu" | "local" = "local";
let activeMatchMode: "cpu" | "local" = "local";
let selectedCpuPersonality: CpuPersonalityV1 = "monk";
let activeCpuPersonality: CpuPersonalityV1 = "monk";
let selectedCpuDifficulty: CpuDifficultyV1 = "standard";
let activeCpuDifficulty: CpuDifficultyV1 = "standard";
let cpuTurnState: "idle" | "thinking" = "idle";
let cpuTurnQueued = false;
const rolloutCpuClient = createRolloutCpuClient();
const cpuWorkerOwnership = createCpuWorkerRequestOwnership();
let cpuRuntimeGeneration = 0;
let activeCpuRootSeed: string | null = null;
let latestCpuDecision: {
  readonly confidence: "clear" | "close" | "measured";
  readonly reason: CpuDecisionReasonV1;
} | null = null;
let runtime: LocalRoundRuntimeV1 = createLocalRoundRuntime({ matchLength: selectedMatchLength });
let observation: PlayerObservationV1 = runtime.observe();
let projection: PresentationBoardProjection = projectObservationToBoard(observation);
let recentYakuEvents: readonly LocalRoundTransitionV1["events"][number][] = Object.freeze([]);
let yakuPresentation: YakuPresentationStateV1 = createYakuPresentationState({ observation });
let resultPresentation: RoundResultPresentationV1 | null = createRoundResultPresentation({
  observation,
});
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
let focusedYakuDecisionKey: string | null = null;
let focusedRoundResultKey: string | null = null;
let captureInspectionOwner: CaptureInspectionOwnerV1 | null = null;
let captureInspectionTrigger: HTMLButtonElement | null = null;
let cardInspectionCardId: Parameters<typeof getCardDefinition>[0] | null = null;
let cardInspectionTrigger: HTMLElement | null = null;
const recaps: string[] = [];
const localSaveRepository = createIndexedDbLocalSaveRepository();
const localSaveStore: LocalSaveStoreV1 = createLocalSaveStore(localSaveRepository);
let persistenceStatusKind: "error" | "idle" | "saving" | "unavailable" = "idle";
let persistenceAvailable = true;
let persistencePromptKind: "corrupt" | "delete" | "fresh" | "resume" | null = null;
let pendingResumeSave: LocalSaveV1 | null = null;
let pendingSaveDiagnostic: string | null = null;
let pendingFreshRequest: {
  readonly completedMatchLength: MatchLength | null;
  readonly fromResult: boolean;
} | null = null;
let localSavePromptOrigin: "corrupt" | null = null;

function syncThemeControls(): void {
  for (const option of themeOptions) option.checked = option.value === activeTheme.id;
}

function applyActiveTheme(theme: Phase3DVisualDirectionV1): void {
  activeTheme = theme;
  applyThemeToDocument(theme);
  syncThemeControls();
  tableScene?.setTheme(theme);
  application?.render();
}

themeStore.subscribe(applyActiveTheme);

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
  handResolutionKind: null,
  fieldPlacementAvailable: false,
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
  if (activeMatchMode === "cpu" && playerId === "player-b") {
    return `The ${activeCpuPersonality === "timid" ? "Timid" : activeCpuPersonality === "gambler" ? "Gambler" : "Monk"}`;
  }
  return playerId === "player-a" ? "Player A" : "Player B";
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "player-a" ? "player-b" : "player-a";
}

function isCpuTurn(): boolean {
  const phase = observation.publicState.phase;
  return (
    activeMatchMode === "cpu" &&
    phase.kind !== "roundComplete" &&
    phase.kind !== "matchComplete" &&
    phase.playerId === "player-b"
  );
}

interface CpuRequestContextV1 {
  readonly generation: number;
  readonly matchId: string;
  readonly stateVersion: number;
  readonly roundNumber: number;
  readonly restartIdentity: number;
  readonly personality: CpuPersonalityV1;
  readonly difficulty: CpuDifficultyV1;
}

function invalidateCpuRollout(): void {
  cpuRuntimeGeneration += 1;
  cpuTurnQueued = false;
  rolloutCpuClient.invalidate();
}

function cpuRequestIsCurrent(context: CpuRequestContextV1): boolean {
  return (
    context.generation === cpuRuntimeGeneration &&
    activeMatchMode === "cpu" &&
    activeCpuRootSeed !== null &&
    context.matchId === observation.publicState.matchId &&
    context.stateVersion === observation.publicState.stateVersion &&
    context.roundNumber === observation.publicState.round.roundNumber &&
    context.restartIdentity === restartCount &&
    context.personality === activeCpuPersonality &&
    context.difficulty === activeCpuDifficulty &&
    isCpuTurn()
  );
}

function cpuTurnMessage(): string {
  const name = playerName("player-b");
  const phase = observation.publicState.phase;
  if (phase.kind === "awaitingDrawResolution") return `${name} is resolving the Draw.`;
  if (phase.kind === "awaitingYakuDecision") return `${name} is choosing Bank or Koi-Koi.`;
  return cpuTurnState === "thinking" ? `${name} is choosing a card.` : `${name}'s turn.`;
}

function cpuConfidenceLabel(confidence: number): "clear" | "close" | "measured" {
  if (confidence >= 0.8) return "clear";
  if (confidence >= 0.62) return "measured";
  return "close";
}

function cpuReasonCopy(reason: CpuDecisionReasonV1): string {
  switch (reason) {
    case "secureLead":
      return "Secures the match lead";
    case "completeYaku":
      return "Completes a yaku";
    case "denyVisibleThreat":
      return "Claims a visible threat";
    case "strongFuturePotential":
      return "Builds toward a yaku";
    case "multiplierPressure":
      return "Presses the table multiplier";
    case "comebackRisk":
      return "Pushes for a comeback";
  }
}

function cpuConfidenceCopy(confidence: "clear" | "close" | "measured"): string {
  return confidence === "clear" ? "Clear" : confidence === "measured" ? "Measured" : "Close";
}

function syncMatchControls(): void {
  matchModeSelect.value = selectedMatchMode;
  cpuPersonalityOptions.hidden = selectedMatchMode !== "cpu";
  cpuDifficultyOptions.hidden = selectedMatchMode !== "cpu";
  for (const input of cpuPersonalityInputs) {
    input.checked = input.value === selectedCpuPersonality;
  }
  for (const input of cpuDifficultyInputs) {
    input.checked = input.value === selectedCpuDifficulty;
  }
}

function renderCpuTurnStatus(): void {
  const showingDecision =
    activeMatchMode === "cpu" && latestCpuDecision !== null && resultPresentation === null;
  const visible = isCpuTurn() || showingDecision;
  cpuTurnStatus.hidden = !visible;
  cpuTurnCopy.textContent = isCpuTurn()
    ? cpuTurnMessage()
    : showingDecision
      ? `${playerName("player-b")}'s last move.`
      : "";
  cpuDecisionCopy.hidden = !showingDecision || isCpuTurn();
  cpuDecisionCopy.textContent =
    showingDecision && !isCpuTurn() && latestCpuDecision
      ? `${cpuReasonCopy(latestCpuDecision.reason)} · ${cpuConfidenceCopy(latestCpuDecision.confidence)}`
      : "";
}

function tableStatusModel(): TableSceneStatusV1 {
  const own = observation.publicState.players.find(({ id }) => id === observation.playerId);
  const opponent = observation.publicState.players.find(
    ({ id }) => id === otherPlayer(observation.playerId),
  );
  if (!own || !opponent) throw new Error("LOCAL_OBSERVATION_PLAYERS_INVALID");
  const month = getMonthDefinition(observation.publicState.round.scheduledMonth);
  return Object.freeze({
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
    emptyFieldPlaceholderCount: 0,
    root: { label: "TableScene" as const, token: "unavailable" },
    layers: [],
    cards: unavailableCards,
  };
  const activeManifest = cardAssetManager?.active?.manifest ?? null;
  const phase = observation.publicState.phase;
  const activeCaptureInspection = captureInspectionOwner
    ? createCaptureInspectionPresentation({ observation, owner: captureInspectionOwner })
    : null;
  return createTablePreviewSnapshot({
    animation: animationDirector?.inspect() ?? unavailableAnimation,
    ready,
    canvasCount: document.querySelectorAll("canvas").length,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    boardViewport,
    fullscreen: document.fullscreenElement !== null,
    captureInspection: {
      open: captureInspector.open,
      owner: captureInspectionOwner,
      totalCards: activeCaptureInspection?.totalCards ?? 0,
    },
    input: interactionController?.inspect() ?? unavailableInput,
    redactPrivateHand: localSaveDialog.open || handoffPlayerId !== null,
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
      matchLength: observation.publicState.matchLength,
    },
    match: {
      mode: activeMatchMode,
      cpuDecision: activeMatchMode === "cpu" && !isCpuTurn() ? latestCpuDecision : null,
      cpuDifficulty: activeMatchMode === "cpu" ? activeCpuDifficulty : null,
      cpuPersonality: activeMatchMode === "cpu" ? activeCpuPersonality : null,
      cpuTurnState,
    },
    persistence: {
      status: persistenceStatusKind,
      promptKind: persistencePromptKind,
      available: persistenceAvailable,
      lastSavedAt: localSaveStore.current()?.updatedAt ?? null,
      saveRound: localSaveStore.current()?.authoritativeState.round.roundNumber ?? null,
      saveMonth: localSaveStore.current()?.authoritativeState.round.scheduledMonth ?? null,
    },
    theme: {
      activeId: activeTheme.id,
      optionsOpen: optionsDialog.open,
    },
    utilitySurfaces: {
      contextualHelpOpen: contextHelpDialog.open,
      cardInspectorOpen: cardInspector.open,
      cardInspectionCardId,
    },
    simulationTimeMs,
    layout,
    fieldLayout: computeAdaptiveFieldLayout(
      layout,
      projection.filter(({ zone }) => zone === "field").length,
    ),
    scene,
    deck: {
      activeDeckId: activeManifest?.packageId ?? null,
      approvalStatus: activeManifest?.approvalStatus ?? null,
      availableDeckIds: INSTALLED_DECKS.map(({ id }) => id),
      status: deckStatus,
    },
    diagnostics: inspectBoardLayout(layout),
    yaku: yakuPresentation,
    result: resultPresentation,
  });
}

function currentInputLock(): InputLockReason | null {
  if (deckStatus === "loading") return "deckLoading";
  if (isCpuTurn()) return "opponentTurn";
  if (animationDirector?.isBusy()) return "animation";
  if (processingIntent) return "awaitingObservation";
  if (captureInspector.open) return "remoteReplay";
  if (localSaveDialog.open) return "remoteReplay";
  if (
    historyDialog.open ||
    yakuGuideDialog.open ||
    optionsDialog.open ||
    contextHelpDialog.open ||
    cardInspector.open
  ) {
    return "remoteReplay";
  }
  if (handoffPlayerId !== null) return "remoteReplay";
  return null;
}

function isYakuDecisionOpen(): boolean {
  return observation.publicState.phase.kind === "awaitingYakuDecision";
}

function isRoundResultOpen(): boolean {
  return resultPresentation !== null;
}

function isCaptureInspectionOpen(): boolean {
  return captureInspector.open;
}

function isAnyUtilityDialogOpen(): boolean {
  return historyDialog.open || yakuGuideDialog.open || optionsDialog.open || contextHelpDialog.open;
}

function isCardInspectorOpen(): boolean {
  return cardInspector.open;
}

function isAnyDialogOpen(): boolean {
  return (
    isAnyUtilityDialogOpen() ||
    isCaptureInspectionOpen() ||
    isCardInspectorOpen() ||
    localSaveDialog.open
  );
}

function isCriticalUtilityBlocked(): boolean {
  return (
    processingIntent ||
    handoffPlayerId !== null ||
    isYakuDecisionOpen() ||
    isRoundResultOpen() ||
    isCaptureInspectionOpen() ||
    (animationDirector?.isBusy() ?? false)
  );
}

function isUtilityOpenerBlocked(): boolean {
  return isCriticalUtilityBlocked() || isAnyDialogOpen();
}

function captureOwnerFromControl(control: HTMLButtonElement): CaptureInspectionOwnerV1 {
  const owner = control.dataset.captureInspect;
  if (owner !== "player" && owner !== "opponent") {
    throw new Error(`CAPTURE_INSPECTION_OWNER_INVALID: ${owner ?? "missing"}`);
  }
  return owner;
}

function captureZoneBounds(owner: CaptureInspectionOwnerV1, layout: BoardLayout): BoardRect {
  const zones =
    owner === "player"
      ? (["playerBrights", "playerAnimals", "playerScrolls", "playerPlains"] as const)
      : (["opponentBrights", "opponentAnimals", "opponentScrolls", "opponentPlains"] as const);
  const bounds = zones.map((zone) => layout.cardZones[zone]);
  const left = Math.min(...bounds.map(({ x }) => x));
  const top = Math.min(...bounds.map(({ y }) => y));
  const right = Math.max(...bounds.map(({ x, width }) => x + width));
  const bottom = Math.max(...bounds.map(({ y, height }) => y + height));
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

function activeCardFaceUrl(cardId: Parameters<typeof getCardDefinition>[0]): string {
  const bundle = cardAssetManager?.active;
  if (!bundle) throw new Error("CAPTURE_INSPECTION_DECK_UNAVAILABLE");
  const descriptor = INSTALLED_DECKS.find(({ id }) => id === bundle.manifest.packageId);
  if (!descriptor) throw new Error(`CAPTURE_INSPECTION_DECK_UNKNOWN: ${bundle.manifest.packageId}`);
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const manifestUrl = new URL(descriptor.manifestPath, baseUrl);
  return new URL(bundle.manifest.cardFaces[cardId].path, manifestUrl).href;
}

/** Shared DOM presentation for the static Yaku Guide and an inspected card's reference. */
function createYakuGuideEntryElement(entry: CardYakuGuideEntryV1): HTMLElement {
  const article = document.createElement("article");
  article.className = "yaku-guide__entry";
  article.dataset.yakuGuideKey = entry.key;
  const heading = document.createElement("h4");
  heading.textContent = entry.title;
  const points = document.createElement("p");
  points.className = "yaku-guide__points";
  points.textContent = `${entry.points} ${entry.points === 1 ? "point" : "points"}`;
  const requirement = document.createElement("p");
  requirement.className = "yaku-guide__requirement";
  requirement.textContent = entry.requirement;
  const examples = document.createElement("div");
  examples.className = "yaku-guide__cards";
  examples.setAttribute("aria-label", `${entry.title} example cards`);
  examples.replaceChildren(
    ...entry.exampleCardIds.map((cardId) => {
      const card = getCardDefinition(cardId);
      const month = getMonthDefinition(card.month);
      const image = document.createElement("img");
      image.dataset.yakuGuideCard = cardId;
      image.src = activeCardFaceUrl(cardId);
      image.alt = `${month.name} ${card.displayName}`;
      image.width = 80;
      image.height = 128;
      return image;
    }),
  );
  const note = document.createElement("p");
  note.className = "yaku-guide__note";
  note.textContent = entry.note;
  const condition = entry.contributionCondition
    ? Object.assign(document.createElement("p"), {
        className: "yaku-guide__condition",
        textContent: entry.contributionCondition,
      })
    : null;
  article.append(heading, points, requirement, examples, note);
  if (condition) article.append(condition);
  return article;
}

function syncCardInspectorYakuDisclosure(): void {
  cardInspectorYakuSummary.setAttribute("aria-expanded", String(cardInspectorYaku.open));
}

function closeContextHelp(restoreFocus = true): void {
  if (!contextHelpDialog.open) return;
  contextHelpDialog.close();
  contextHelpTrigger.setAttribute("aria-expanded", "false");
  refreshInteractionSurface();
  if (restoreFocus) queueMicrotask(() => contextHelpTrigger.focus());
}

function openContextHelp(): void {
  if (isUtilityOpenerBlocked()) return;
  const presentation = createContextualHelpPresentation({
    observation,
    inspection: interactionController?.inspect() ?? unavailableInput,
  });
  contextHelpTitle.textContent = presentation.title;
  contextHelpSummary.textContent = presentation.summary;
  contextHelpSteps.replaceChildren(
    ...presentation.steps.map((step) =>
      Object.assign(document.createElement("li"), { textContent: step }),
    ),
  );
  contextHelpDialog.showModal();
  contextHelpTrigger.setAttribute("aria-expanded", "true");
  refreshInteractionSurface();
  queueMicrotask(() => contextHelpClose.focus());
}

function closeCardInspection(restoreFocus = true): void {
  if (!cardInspector.open) return;
  const trigger = cardInspectionTrigger;
  cardInspector.close();
  cardInspectionCardId = null;
  cardInspectionTrigger = null;
  refreshInteractionSurface();
  if (restoreFocus && trigger?.isConnected) queueMicrotask(() => trigger.focus());
}

function openCardInspection(
  cardId: Parameters<typeof getCardDefinition>[0],
  trigger: HTMLElement,
): void {
  if (isCriticalUtilityBlocked() || isAnyDialogOpen()) return;
  const presentation = createCardInspectionPresentation(cardId);
  cardInspectionCardId = cardId;
  cardInspectionTrigger = trigger;
  cardInspectorTitle.textContent = presentation.title;
  cardInspectorMonth.textContent = presentation.month;
  cardInspectorImage.src = activeCardFaceUrl(cardId);
  cardInspectorImage.alt = `${presentation.month} ${presentation.title}`;
  cardInspectorYaku.open = presentation.yakuDisclosure.ariaExpanded;
  syncCardInspectorYakuDisclosure();
  cardInspectorYakuSummary.setAttribute("aria-controls", presentation.yakuDisclosure.ariaControls);
  cardInspectorYakuSummary.textContent = presentation.yakuDisclosure.label;
  cardInspectorYakuEntries.replaceChildren(
    ...presentation.yakuEntries.map((entry) => createYakuGuideEntryElement(entry)),
  );
  cardInspector.showModal();
  refreshInteractionSurface();
  queueMicrotask(() => cardInspectorClose.focus());
}

function closeCaptureInspection(restoreFocus = true): void {
  if (!captureInspector.open) return;
  const trigger = captureInspectionTrigger;
  captureInspector.close();
  captureInspectionOwner = null;
  captureInspectionTrigger = null;
  refreshInteractionSurface();
  if (restoreFocus && trigger) {
    queueMicrotask(() => {
      if (!trigger.disabled && !trigger.hidden) trigger.focus();
    });
  }
}

function closeHistory(restoreFocus = true): void {
  if (!historyDialog.open) return;
  historyDialog.close();
  historyTrigger.setAttribute("aria-expanded", "false");
  refreshInteractionSurface();
  if (restoreFocus) queueMicrotask(() => historyTrigger.focus());
}

function openHistory(): void {
  if (isUtilityOpenerBlocked()) return;
  historyDialog.showModal();
  historyTrigger.setAttribute("aria-expanded", "true");
  refreshInteractionSurface();
  queueMicrotask(() => historyClose.focus());
}

function renderYakuGuide(): void {
  yakuGuideGroups.replaceChildren(
    ...YAKU_GUIDE_GROUPS.map((group) => {
      const section = document.createElement("section");
      section.className = "yaku-guide__group";
      const heading = document.createElement("h3");
      heading.textContent = group.title;
      const entries = document.createElement("div");
      entries.className = "yaku-guide__entries";
      entries.replaceChildren(
        ...YAKU_GUIDE_ENTRIES.filter(({ group: entryGroup }) => entryGroup === group.id).map(
          (entry) => createYakuGuideEntryElement(entry),
        ),
      );
      section.append(heading, entries);
      return section;
    }),
  );
  yakuGuideNotes.replaceChildren(
    ...YAKU_GUIDE_NOTES.map((note) =>
      Object.assign(document.createElement("li"), { textContent: note }),
    ),
  );
}

function closeYakuGuide(restoreFocus = true): void {
  if (!yakuGuideDialog.open) return;
  yakuGuideDialog.close();
  yakuGuideTrigger.setAttribute("aria-expanded", "false");
  refreshInteractionSurface();
  if (restoreFocus) queueMicrotask(() => yakuGuideTrigger.focus());
}

function openYakuGuide(): void {
  if (isUtilityOpenerBlocked() || deckStatus !== "ready") return;
  renderYakuGuide();
  yakuGuideDialog.showModal();
  yakuGuideTrigger.setAttribute("aria-expanded", "true");
  refreshInteractionSurface();
  queueMicrotask(() => yakuGuideClose.focus());
}

function openCaptureInspection(control: HTMLButtonElement): void {
  if (
    isAnyDialogOpen() ||
    processingIntent ||
    handoffPlayerId !== null ||
    isRoundResultOpen() ||
    animationDirector?.isBusy()
  ) {
    return;
  }
  const owner = captureOwnerFromControl(control);
  const presentation = createCaptureInspectionPresentation({ observation, owner });
  if (presentation.totalCards === 0) return;
  captureInspectionOwner = owner;
  captureInspectionTrigger = control;
  captureInspectorTitle.textContent = `${playerName(presentation.playerId)} captures · ${presentation.totalCards}`;
  captureInspectorGroups.replaceChildren(
    ...presentation.groups.map((group) => {
      const section = document.createElement("section");
      section.className = "capture-inspector__group";
      const heading = document.createElement("h3");
      heading.textContent = `${group.label} · ${group.cards.length}`;
      const cards = document.createElement("div");
      cards.className = "capture-inspector__cards";
      cards.replaceChildren(
        ...(group.cards.length > 0
          ? group.cards.map((card) => {
              const figure = document.createElement("figure");
              const image = document.createElement("img");
              image.src = activeCardFaceUrl(card.cardId);
              image.alt = card.label;
              image.width = 96;
              image.height = 154;
              const caption = document.createElement("figcaption");
              caption.textContent = card.label;
              figure.append(image, caption);
              return figure;
            })
          : [Object.assign(document.createElement("p"), { textContent: "None yet." })]),
      );
      section.append(heading, cards);
      return section;
    }),
  );
  captureInspector.showModal();
  queueMicrotask(() => captureInspectorClose.focus());
  refreshInteractionSurface();
}

function closeOptions(restoreFocus = true): void {
  if (!optionsDialog.open) return;
  optionsDialog.close();
  optionsTrigger.setAttribute("aria-expanded", "false");
  renderHandPlayAttention();
  renderRevealPlayAttention();
  renderFieldDestinationAttention();
  if (restoreFocus) optionsTrigger.focus();
}

function openOptions(): void {
  if (isUtilityOpenerBlocked()) return;
  optionsDialog.showModal();
  optionsTrigger.setAttribute("aria-expanded", "true");
  syncThemeControls();
  renderHandPlayAttention();
  renderRevealPlayAttention();
  renderFieldDestinationAttention();
  queueMicrotask(() => themeOptions.find(({ checked }) => checked)?.focus());
}

function setPersistenceStatus(
  kind: "error" | "idle" | "saving" | "unavailable",
  message = "",
): void {
  persistenceStatusKind = kind;
  persistenceStatus.textContent = message;
  persistenceWarning.hidden = kind !== "error" && kind !== "unavailable";
  persistenceWarning.textContent = persistenceWarning.hidden ? "" : message;
}

function saveMetadata(save: LocalSaveV1): string {
  const round = save.authoritativeState.round;
  const resultReady =
    save.authoritativeState.phase.kind === "roundComplete" ||
    save.authoritativeState.phase.kind === "matchComplete";
  return `${save.authoritativeState.matchLength}-round match · Round ${round.roundNumber} · ${getMonthDefinition(round.scheduledMonth).name}${resultReady ? " · Result ready" : ""}`;
}

function renderLocalSavePrompt(kind: "corrupt" | "delete" | "fresh" | "resume"): void {
  if (kind === "corrupt") localSavePromptOrigin = "corrupt";
  if (kind === "resume") localSavePromptOrigin = null;
  persistencePromptKind = kind;
  const save = pendingResumeSave ?? localSaveStore.current();
  localSaveDialogWarning.hidden = true;
  localSaveDialogWarning.textContent = "";
  localSaveSecondary.hidden = true;
  localSaveCpu.hidden = kind !== "resume";
  localSaveDelete.hidden = false;
  if (kind === "resume" && save) {
    const complete = save.authoritativeState.phase.kind === "matchComplete";
    localSaveDialogEyebrow.textContent = complete ? "Completed match" : "Saved game";
    localSaveDialogTitle.textContent = complete
      ? "Review completed match?"
      : "Continue saved match?";
    localSaveDialogCopy.textContent = complete
      ? "Your final result is saved locally. Review it before starting a rematch."
      : "Your local match is saved and ready to continue.";
    localSaveDialogMeta.textContent = saveMetadata(save);
    localSavePrimary.textContent = complete ? "Review completed match" : "Continue";
    localSaveDelete.textContent = "Delete saved game";
  } else if (kind === "corrupt") {
    localSaveDialogEyebrow.textContent = "Saved game unavailable";
    localSaveDialogTitle.textContent = "This saved game cannot be opened";
    localSaveDialogCopy.textContent =
      "No part of the saved game was loaded. You can remove it or download a safe diagnostic.";
    localSaveDialogMeta.textContent = "";
    localSavePrimary.textContent = "Download diagnostic";
    localSaveDelete.textContent = "Delete saved game";
    localSaveSecondary.hidden = false;
    localSaveSecondary.textContent = "Start new match";
  } else if (kind === "delete") {
    localSaveDialogEyebrow.textContent = "Delete saved game";
    localSaveDialogTitle.textContent = "Delete this saved game?";
    localSaveDialogCopy.textContent = "This removes the local checkpoint and cannot be undone.";
    localSaveDialogMeta.textContent = save ? saveMetadata(save) : "";
    localSavePrimary.textContent = "Delete saved game";
    localSaveDelete.hidden = true;
    localSaveSecondary.hidden = false;
  } else {
    const replacingCorruptSave = localSavePromptOrigin === "corrupt";
    localSaveDialogEyebrow.textContent = replacingCorruptSave
      ? "Replace unavailable save"
      : "Start fresh match";
    localSaveDialogTitle.textContent = replacingCorruptSave
      ? "Start a new match instead?"
      : "Replace saved game?";
    localSaveDialogCopy.textContent = replacingCorruptSave
      ? "This removes the unavailable local save and starts a new match."
      : "Starting a fresh match replaces the current local checkpoint.";
    localSaveDialogMeta.textContent = save ? saveMetadata(save) : "";
    localSavePrimary.textContent = "Start fresh match";
    localSaveDelete.hidden = true;
    localSaveSecondary.hidden = false;
  }
  if (!localSaveDialog.open) localSaveDialog.showModal();
  refreshInteractionSurface();
  queueMicrotask(() => localSavePrimary.focus());
}

function openLocalSavePrompt(kind: "corrupt" | "fresh" | "resume"): void {
  renderLocalSavePrompt(kind);
}

function closeLocalSavePrompt(): void {
  if (!localSaveDialog.open) return;
  localSaveDialog.close();
  persistencePromptKind = null;
  localSavePromptOrigin = null;
  refreshInteractionSurface();
}

async function persistStableRuntime(): Promise<void> {
  if (
    activeMatchMode !== "local" ||
    !ready ||
    !persistenceAvailable ||
    processingIntent ||
    animationDirector?.isBusy()
  )
    return;
  persistenceStatusKind = "saving";
  try {
    await localSaveStore.queueSnapshot(runtime.snapshot());
    setPersistenceStatus("idle");
  } catch {
    persistenceAvailable = false;
    setPersistenceStatus(
      "unavailable",
      "Saving is unavailable. This game will not be available after reload.",
    );
  } finally {
    refreshInteractionSurface();
  }
}

async function prepareLocalSave(): Promise<void> {
  let raw: unknown;
  try {
    raw = await localSaveRepository.read();
  } catch {
    persistenceAvailable = false;
    setPersistenceStatus(
      "unavailable",
      "Saving is unavailable. This game will not be available after reload.",
    );
    return;
  }
  if (raw === undefined) return;
  try {
    const save = decodeLocalSaveV1(raw);
    localSaveStore.hydrate(save);
    pendingResumeSave = save;
  } catch (error: unknown) {
    persistenceStatusKind = "error";
    pendingSaveDiagnostic = createSanitizedLocalSaveDiagnostic(error);
  }
}

function downloadLocalSaveDiagnostic(): void {
  const blob = new Blob([pendingSaveDiagnostic ?? createSanitizedLocalSaveDiagnostic(null)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "koikoi4x-local-save-diagnostic.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function showPrivateResumeHandoff(): void {
  if (
    observation.publicState.phase.kind === "roundComplete" ||
    observation.publicState.phase.kind === "matchComplete"
  ) {
    handoffPlayerId = null;
    handoff.hidden = true;
    return;
  }
  handoffPlayerId = observation.playerId;
  handoffTitle.textContent = `Pass to ${playerName(observation.playerId)}`;
  handoffDescription.textContent = "Your private hand stays covered until you are ready.";
  handoffReady.textContent = `${playerName(observation.playerId)} ready`;
  handoff.hidden = false;
}

async function continueSavedMatch(): Promise<void> {
  if (pendingResumeSave === null || !animationDirector) return;
  if (processingIntent && !cpuWorkerOwnership.hasPending()) return;
  try {
    invalidateCpuRollout();
    activeMatchMode = "local";
    selectedMatchMode = "local";
    activeCpuRootSeed = null;
    cpuTurnState = "idle";
    latestCpuDecision = null;
    syncMatchControls();
    runtime = restoreLocalRoundRuntime(localSaveSnapshot(pendingResumeSave));
    observation = runtime.observe();
    projection = projectObservationToBoard(observation);
    refreshYakuPresentation();
    refreshRoundResultPresentation();
    interactionController = createController();
    showPrivateResumeHandoff();
    pendingResumeSave = null;
    closeLocalSavePrompt();
    await animationDirector.cancelAndSnapTo(projection);
    redraw();
    status.textContent =
      resultPresentation === null
        ? "Saved match restored. Pass the device to the active player."
        : "Saved result restored. Review the committed outcome.";
    refreshInteractionSurface();
  } catch (error: unknown) {
    pendingSaveDiagnostic = createSanitizedLocalSaveDiagnostic(error);
    renderLocalSavePrompt("corrupt");
  }
}

async function deleteSavedGame(): Promise<void> {
  try {
    if (localSavePromptOrigin === "corrupt") {
      await localSaveRepository.clearRecovery();
    } else {
      await localSaveStore.delete();
    }
    pendingResumeSave = null;
    closeLocalSavePrompt();
    const freshRequest = pendingFreshRequest;
    pendingFreshRequest = null;
    await startFreshLocalMatch(
      freshRequest?.fromResult ?? true,
      freshRequest?.completedMatchLength ?? null,
    );
  } catch {
    persistenceAvailable = false;
    setPersistenceStatus("unavailable", "Saved game could not be removed. Storage is unavailable.");
    localSaveDialogWarning.hidden = false;
    localSaveDialogWarning.textContent =
      "The saved game could not be removed. Try again when storage is available.";
  }
}

function requestFreshLocalMatch(
  fromResult = false,
  completedMatchLength: MatchLength | null = null,
): void {
  pendingFreshRequest = { fromResult, completedMatchLength };
  if (localSaveStore.current() !== null || pendingResumeSave !== null) {
    renderLocalSavePrompt("fresh");
    return;
  }
  const freshRequest = pendingFreshRequest;
  pendingFreshRequest = null;
  void startFreshLocalMatch(freshRequest.fromResult, freshRequest.completedMatchLength);
}

function inputMessage(inspection: InputInteractionInspectionV1): string {
  if (handoffPlayerId) return `Pass the device to ${playerName(handoffPlayerId)}.`;
  if (isCpuTurn()) return cpuTurnMessage();
  if (inspection.status === "intentPending") return "Move accepted. Updating the local round.";
  if (inspection.status === "locked") {
    if (inspection.lockReason === "roundTransition") return "The round is complete.";
    return "Card input is temporarily locked.";
  }
  if (inspection.status === "decision") return "Yaku complete. Choose Bank or Koi-Koi.";
  if (
    inspection.status === "idle" &&
    observation.publicState.phase.kind === "awaitingDrawResolution"
  ) {
    return "Tap the revealed Draw card to resolve it before this turn continues.";
  }
  if (inspection.status === "targeting") {
    return `Choose one of ${inspection.legalTargetCardIds.length} highlighted capture targets.`;
  }
  if (inspection.status === "confirming") {
    if (inspection.handResolutionKind === "placeOnField") {
      return "Tap the highlighted field to place this card.";
    }
    if (inspection.handResolutionKind === "capturePair") {
      return "Tap the highlighted matching card to capture it.";
    }
    if (inspection.handResolutionKind === "fourCardSweep") {
      return "Three matching cards highlighted. Tap any one to complete the four-card sweep.";
    }
    return "Tap a highlighted card to complete the capture.";
  }
  return "Select a hand card to play.";
}

function renderRecaps(): void {
  recapList.replaceChildren(
    ...recaps.map((recap) => {
      const item = document.createElement("li");
      item.textContent = recap;
      return item;
    }),
  );
  latestRecap.textContent = recaps.at(-1) ?? "";
  historyEmpty.hidden = recaps.length > 0;
  historyTrigger.setAttribute(
    "aria-label",
    recaps.length === 0
      ? "Open History. No completed turns yet."
      : `Open History. ${recaps.length} completed ${recaps.length === 1 ? "turn" : "turns"}.`,
  );
}

function renderHandPlayAttention(inspection = interactionController?.inspect()): void {
  if (!currentLayout || !inspection) {
    handPlayAttention.hidden = true;
    return;
  }
  const showHandPlayAttention =
    currentInputLock() === null &&
    !optionsDialog.open &&
    shouldShowHandPlayAttention({ inspection, observation });
  handPlayAttention.hidden = !showHandPlayAttention;
  if (showHandPlayAttention) {
    const bounds = currentLayout.cardZones.playerHand;
    handPlayAttention.style.left = `${bounds.x}px`;
    handPlayAttention.style.top = `${bounds.y}px`;
    handPlayAttention.style.width = `${bounds.width}px`;
    handPlayAttention.style.height = `${bounds.height}px`;
  }
}

function renderRevealPlayAttention(inspection = interactionController?.inspect()): void {
  if (!currentLayout || !inspection) {
    revealPlayAttention.hidden = true;
    return;
  }
  const showRevealPlayAttention =
    currentInputLock() === null &&
    !optionsDialog.open &&
    shouldShowRevealPlayAttention({ inspection, observation });
  if (!showRevealPlayAttention) {
    revealPlayAttention.hidden = true;
    return;
  }
  const phase = observation.publicState.phase;
  if (phase.kind !== "awaitingDrawResolution") {
    revealPlayAttention.hidden = true;
    return;
  }
  const placement = findFaceUpRevealPlacement({
    layout: currentLayout,
    projection,
    drawnCardId: phase.drawnCardId,
  });
  if (!placement) {
    revealPlayAttention.hidden = true;
    return;
  }
  revealPlayAttention.hidden = false;
  revealPlayAttention.style.left = `${placement.bounds.x}px`;
  revealPlayAttention.style.top = `${placement.bounds.y}px`;
  revealPlayAttention.style.width = `${placement.bounds.width}px`;
  revealPlayAttention.style.height = `${placement.bounds.height}px`;
}

function renderFieldDestinationAttention(inspection = interactionController?.inspect()): void {
  if (!currentLayout || !inspection || currentInputLock() !== null || optionsDialog.open) {
    fieldDestinationAttention.hidden = true;
    fieldDestinationAttention.replaceChildren();
    return;
  }
  const attention = resolveFieldDestinationAttention({ inspection });
  if (!attention) {
    fieldDestinationAttention.hidden = true;
    fieldDestinationAttention.replaceChildren();
    return;
  }
  const decorations: HTMLElement[] = [];
  if (attention.kind === "fieldPlacement") {
    const bounds = currentLayout.cardZones.field;
    const perimeter = document.createElement("div");
    perimeter.className = "legal-destination-attention legal-destination-attention--field";
    perimeter.dataset.legalDestinationAttention = "field-placement";
    perimeter.style.left = `${bounds.x}px`;
    perimeter.style.top = `${bounds.y}px`;
    perimeter.style.width = `${bounds.width}px`;
    perimeter.style.height = `${bounds.height}px`;
    const badge = document.createElement("div");
    badge.className = "legal-field-placement-copy";
    badge.dataset.legalFieldPlacementCopy = "";
    badge.textContent = "NO MATCH · PLACE HERE";
    badge.style.left = `${bounds.x + Math.max(46, 58 * currentLayout.scale)}px`;
    badge.style.top = `${bounds.y + Math.max(3, 4 * currentLayout.scale)}px`;
    decorations.push(perimeter, badge);
  } else {
    for (const placement of findFaceUpLegalFieldPlacements({
      layout: currentLayout,
      projection,
      legalTargetCardIds: attention.legalTargetCardIds,
    })) {
      const perimeter = document.createElement("div");
      perimeter.className = "legal-destination-attention legal-destination-attention--target";
      perimeter.dataset.legalDestinationAttention = placement.cardId;
      perimeter.style.left = `${placement.bounds.x}px`;
      perimeter.style.top = `${placement.bounds.y}px`;
      perimeter.style.width = `${placement.bounds.width}px`;
      perimeter.style.height = `${placement.bounds.height}px`;
      decorations.push(perimeter);
    }
  }
  fieldDestinationAttention.replaceChildren(...decorations);
  fieldDestinationAttention.hidden = decorations.length === 0;
}

function renderSemanticCardBridge(): void {
  if (!interactionController || !currentLayout) return;
  const inspection = interactionController.inspect();
  renderHandPlayAttention(inspection);
  renderRevealPlayAttention(inspection);
  renderFieldDestinationAttention(inspection);
  if (
    shouldClearSemanticControlsForPrivacy({
      localSavePromptOpen: localSaveDialog.open,
      privateHandoffPending: handoffPlayerId !== null,
    })
  ) {
    domCardBridge?.render([]);
    fieldPlacementControl.hidden = true;
    semanticControlCount = 0;
    renderCaptureInspectionControls();
    return;
  }
  const controls = buildSemanticCardControls({
    inspection,
    layout: currentLayout,
    projection,
  });
  domCardBridge?.render(controls);
  const showFieldPlacement =
    inspection.fieldPlacementAvailable && inspection.selectedCardId !== null;
  fieldPlacementControl.hidden = !showFieldPlacement;
  semanticControlCount = controls.length + (showFieldPlacement ? 1 : 0);
  if (showFieldPlacement && inspection.selectedCardId) {
    const bounds = currentLayout.cardZones.field;
    fieldPlacementControl.setAttribute("aria-label", "No match. Place card on the field.");
    fieldPlacementControl.style.left = `${bounds.x}px`;
    fieldPlacementControl.style.top = `${bounds.y}px`;
    fieldPlacementControl.style.width = `${bounds.width}px`;
    fieldPlacementControl.style.height = `${bounds.height}px`;
  }
  renderCaptureInspectionControls();
}

function renderCaptureInspectionControls(): void {
  if (!currentLayout) return;
  const blocked =
    processingIntent ||
    handoffPlayerId !== null ||
    localSaveDialog.open ||
    isRoundResultOpen() ||
    (animationDirector?.isBusy() ?? false);
  for (const control of captureInspectControls) {
    const owner = captureOwnerFromControl(control);
    const presentation = createCaptureInspectionPresentation({ observation, owner });
    const bounds = captureZoneBounds(owner, currentLayout);
    control.hidden = presentation.totalCards === 0;
    control.disabled = blocked || captureInspector.open;
    control.setAttribute(
      "aria-label",
      `${owner === "player" ? "View your" : "View opponent"} ${presentation.totalCards} captured ${presentation.totalCards === 1 ? "card" : "cards"}.`,
    );
    control.style.left = `${bounds.x}px`;
    control.style.top = `${bounds.y}px`;
    control.style.width = `${bounds.width}px`;
    control.style.height = `${bounds.height}px`;
  }
}

function formatYakuList(
  yaku: readonly { readonly name: string; readonly points: number }[],
): string {
  return yaku.map((entry) => `${entry.name} ${entry.points}`).join(", ");
}

function renderYakuProgress(): void {
  for (const player of yakuPresentation.players) {
    const playerPanel = yakuProgress.querySelector<HTMLElement>(
      `[data-yaku-player="${player.playerId}"]`,
    );
    if (!playerPanel) throw new Error(`YAKU_PLAYER_PANEL_MISSING: ${player.playerId}`);
    const total = playerPanel.querySelector<HTMLElement>("[data-yaku-total]");
    const active = playerPanel.querySelector<HTMLUListElement>("[data-yaku-active]");
    if (!total || !active) throw new Error(`YAKU_PLAYER_CONTENT_MISSING: ${player.playerId}`);
    total.textContent = `${player.currentYakuTotal} current ${
      player.currentYakuTotal === 1 ? "point" : "points"
    }`;
    active.replaceChildren(
      ...(player.activeYaku.length > 0
        ? player.activeYaku.map((entry) => {
            const item = document.createElement("li");
            item.textContent = `${entry.name} · ${entry.points} ${
              entry.points === 1 ? "point" : "points"
            }`;
            return item;
          })
        : [Object.assign(document.createElement("li"), { textContent: "No active yaku yet." })]),
    );
  }
}

function renderYakuFeedback(): void {
  const feedback = yakuPresentation.feedback;
  if (!feedback || (isRoundResultOpen() && !processingIntent)) {
    yakuFeedback.hidden = true;
    yakuFeedbackMessage.textContent = "";
    return;
  }
  yakuFeedbackMessage.textContent = feedback.announcement;
  yakuFeedback.hidden = feedback.announcement.length === 0;
}

function yakuDecisionKey(): string | null {
  const decision = yakuPresentation.decision;
  if (!decision) return null;
  return [
    observation.publicState.stateVersion,
    decision.actorId,
    decision.phase,
    decision.currentYakuTotal,
    decision.bank?.awardedPoints ?? "no-bank",
    decision.koiKoi?.resultingTableMultiplier ?? "no-koi",
  ].join(":");
}

function renderYakuDecision(inspection: InputInteractionInspectionV1): void {
  const decision = yakuPresentation.decision;
  const visible = decision !== null && handoffPlayerId === null && !processingIntent;
  if (!decision || !visible) {
    yakuDecision.hidden = true;
    focusedYakuDecisionKey = null;
    return;
  }
  const decisionReady = inspection.status === "decision" && !processingIntent;
  const completed = formatYakuList(decision.newYaku);
  yakuDecision.hidden = false;
  yakuDecisionTitle.textContent = `${playerName(decision.actorId)} completed yaku`;
  yakuDecisionSummary.textContent =
    completed.length > 0 ? `New yaku: ${completed}.` : "Review the current yaku total.";
  yakuDecisionTotal.textContent = `Current yaku total: ${decision.currentYakuTotal} ${
    decision.currentYakuTotal === 1 ? "point" : "points"
  }.`;
  yakuDecisionResume.textContent = `${decision.bank ? "Bank ends the round. " : ""}${decision.resume.consequenceLabel}`;
  yakuBankButton.hidden = decision.bank === null;
  yakuBankUnavailable.hidden = decision.bank !== null;
  if (decision.bank) {
    yakuBankButton.textContent =
      decision.bank.scoringMultiplier === 1
        ? `Bank ${decision.bank.awardedPoints} points`
        : `Bank ${decision.currentYakuTotal} points × ${decision.bank.scoringMultiplier}× = ${decision.bank.awardedPoints} points`;
    yakuBankButton.disabled = !decisionReady;
  }
  yakuKoiKoiButton.hidden = decision.koiKoi === null;
  if (decision.koiKoi) {
    yakuKoiKoiButton.textContent =
      decision.koiKoi.currentTableMultiplier === decision.koiKoi.resultingTableMultiplier
        ? `Koi-Koi — table remains ${decision.koiKoi.currentTableMultiplier}×`
        : `Koi-Koi → ${decision.koiKoi.resultingTableMultiplier}×`;
    yakuKoiKoiButton.disabled = !decisionReady;
  }

  const key = yakuDecisionKey();
  if (!key || !decisionReady || focusedYakuDecisionKey === key) return;
  focusedYakuDecisionKey = key;
  queueMicrotask(() => {
    if (yakuDecision.hidden || handoffPlayerId !== null || processingIntent) return;
    const firstAction = !yakuBankButton.hidden ? yakuBankButton : yakuKoiKoiButton;
    if (!firstAction.disabled) firstAction.focus();
  });
}

function renderYakuPresentation(inspection: InputInteractionInspectionV1): void {
  renderYakuProgress();
  renderYakuFeedback();
  renderYakuDecision(inspection);
}

function refreshYakuPresentation(
  events: readonly LocalRoundTransitionV1["events"][number][] = [],
  previousObservation?: PlayerObservationV1,
): void {
  recentYakuEvents = Object.freeze([...events]);
  yakuPresentation = createYakuPresentationState({
    observation,
    ...(previousObservation ? { previousObservation } : {}),
    ...(recentYakuEvents.length > 0 ? { recentEvents: recentYakuEvents } : {}),
  });
}

function resultPlayerLabel(playerId: PlayerId): string {
  return playerName(playerId);
}

function evidenceItems(presentation: RoundResultPresentationV1): readonly string[] {
  if (presentation.evidence === null) return Object.freeze([]);
  if (presentation.evidence.kind === "fieldCancellation") {
    return Object.freeze(
      presentation.evidence.completeFieldMonths.map(({ month, cardIds }) => {
        const cards = cardIds.map((cardId) => getCardDefinition(cardId).displayName).join(", ");
        return `${getMonthDefinition(month).name}: ${cards}.`;
      }),
    );
  }
  if (presentation.evidence.kind === "ordinaryYaku") return Object.freeze([]);
  return Object.freeze(
    presentation.evidence.hands.map(({ playerId, fullHand, qualification }) => {
      const qualificationLabel =
        qualification.kind === "fourMonth" ? "Four Cards of the Same Month" : "Four Month Pairs";
      const cards = fullHand.map((cardId) => getCardDefinition(cardId).displayName).join(", ");
      return `${resultPlayerLabel(playerId)} · ${qualificationLabel}: ${cards}.`;
    }),
  );
}

function createScoredYakuRow(row: RoundResultPresentationV1["scoredYaku"][number]): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "round-result__yaku-row";
  const heading = document.createElement("p");
  heading.className = "round-result__yaku-title";
  heading.textContent = `${row.yaku.name} · ${row.yaku.points} ${row.yaku.points === 1 ? "point" : "points"}`;
  const cards = document.createElement("div");
  cards.className = "round-result__yaku-cards";
  cards.replaceChildren(
    ...row.contributingCardIds.map((cardId) => {
      const figure = document.createElement("figure");
      figure.dataset.cardId = cardId;
      const image = document.createElement("img");
      image.src = activeCardFaceUrl(cardId);
      image.alt = getCardDefinition(cardId).displayName;
      image.width = 80;
      image.height = 128;
      const caption = document.createElement("figcaption");
      caption.textContent = getCardDefinition(cardId).displayName;
      figure.append(image, caption);
      return figure;
    }),
  );
  item.append(heading, cards);
  return item;
}

function renderRoundResult(): void {
  const presentation = resultPresentation;
  const visible = presentation !== null && !processingIntent && handoffPlayerId === null;
  if (!presentation || !visible) {
    roundResult.hidden = true;
    focusedRoundResultKey = null;
    return;
  }

  roundResultContext.textContent = `Round ${presentation.roundNumber} · ${getMonthDefinition(presentation.scheduledMonth).name}`;
  roundResultTitle.textContent = presentation.title;
  roundResultOutcome.textContent = presentation.outcomeLabel;
  roundResultScoreA.textContent = `${presentation.matchScoresAfter["player-a"]} (${presentation.pointDeltas["player-a"] > 0 ? "+" : "±"}${presentation.pointDeltas["player-a"]})`;
  roundResultScoreB.textContent = `${presentation.matchScoresAfter["player-b"]} (${presentation.pointDeltas["player-b"] > 0 ? "+" : "±"}${presentation.pointDeltas["player-b"]})`;
  roundResultYakuCount.textContent = String(presentation.scoredYaku.length);
  roundResultScoringMultiplier.textContent = presentation.scoring
    ? `${presentation.scoring.scoringMultiplier}×`
    : "—";
  roundResultAwardedPoints.textContent = `${presentation.scoring?.awardedPoints ?? 0}`;
  roundResultFacts.hidden = false;
  roundResultNext.textContent =
    "plan" in presentation.action
      ? `Next · ${resultPlayerLabel(presentation.action.plan.starterId)} starts ${getMonthDefinition(presentation.action.plan.scheduledMonth).name}.`
      : `Match complete · ${presentation.action.outcomeLabel}`;
  roundResultArithmetic.textContent = presentation.scoring?.arithmeticLabel ?? "0 points awarded.";
  roundResultMultipliers.textContent = presentation.scoring
    ? [presentation.scoring.tableMultiplierLabel, presentation.scoring.scoringMultiplierLabel]
        .filter((label): label is string => label !== null)
        .join(" ")
    : "";
  roundResultYaku.replaceChildren(
    ...(presentation.scoredYaku.length > 0
      ? presentation.scoredYaku.map((row) => createScoredYakuRow(row))
      : [
          Object.assign(document.createElement("li"), {
            textContent:
              "No ordinary yaku scored; automatic evidence is shown separately when applicable.",
          }),
        ]),
  );
  roundResultScoringDetails.hidden = presentation.scoring === null;

  const evidence = evidenceItems(presentation);
  roundResultEvidence.hidden = evidence.length === 0;
  roundResultEvidenceList.replaceChildren(
    ...evidence.map((copy) => Object.assign(document.createElement("li"), { textContent: copy })),
  );

  if ("plan" in presentation.action) {
    const { plan } = presentation.action;
    roundResultTransition.hidden = false;
    roundResultTransitionTitle.textContent = "Authoritative next-round plan";
    roundResultTransitionCopy.textContent = `Round ${plan.roundNumber} · ${getMonthDefinition(plan.scheduledMonth).name}. ${resultPlayerLabel(plan.starterId)} starts. ${presentation.action.starterReasonLabel}`;
    roundResultPrivilege.hidden = plan.specialPrivilege === null;
    roundResultPrivilege.textContent =
      plan.specialPrivilege === null
        ? ""
        : `${resultPlayerLabel(plan.specialPrivilege.playerId)} has the next-round-only special 2× privilege.`;
  } else {
    roundResultTransition.hidden = false;
    roundResultTransitionTitle.textContent = "Match complete";
    roundResultTransitionCopy.textContent = `${presentation.action.outcomeLabel} Final scores are committed after ${presentation.action.result.roundsPlayed} rounds.`;
    roundResultPrivilege.hidden = true;
    roundResultPrivilege.textContent = "";
  }

  roundResultHistory.hidden = presentation.visibility !== "matchResult";
  roundResultHistoryList.replaceChildren(
    ...presentation.history.map((entry) =>
      Object.assign(document.createElement("li"), {
        textContent: `Round ${entry.roundNumber} · ${getMonthDefinition(entry.scheduledMonth).name}: ${entry.reasonCode}, ${entry.awardedPoints} points awarded.`,
      }),
    ),
  );
  roundResultAction.textContent =
    "plan" in presentation.action
      ? `Continue to ${getMonthDefinition(presentation.action.plan.scheduledMonth).name}`
      : presentation.action.actionLabel;
  roundResultDetailsSummary.textContent =
    presentation.evidence?.kind === "ordinaryYaku"
      ? "See winning yaku & score"
      : presentation.evidence?.kind === "luckyHands"
        ? "See opening evidence & score"
        : "See round details";
  roundResult.hidden = false;

  const key = `${observation.publicState.matchId}:${observation.publicState.stateVersion}:${presentation.kind}`;
  if (focusedRoundResultKey === key) return;
  focusedRoundResultKey = key;
  roundResultDetails.open = false;
  queueMicrotask(() => {
    if (!roundResult.hidden && !processingIntent) roundResultAction.focus();
  });
}

function refreshRoundResultPresentation(
  events: readonly LocalRoundTransitionV1["events"][number][] = [],
): void {
  resultPresentation = createRoundResultPresentation({
    observation,
    ...(events.length > 0 ? { recentEvents: events } : {}),
  });
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
    handResolutionKind: inspection.handResolutionKind,
    fieldPlacementAvailable: inspection.fieldPlacementAvailable,
    focusedCardId: inspection.focusedCardId,
    locked:
      inspection.status === "locked" ||
      inspection.status === "intentPending" ||
      inspection.status === "decision",
  });
  renderSemanticCardBridge();
  renderYakuPresentation(inspection);
  renderRoundResult();
  renderCpuTurnStatus();
  inputInstruction.textContent = inputMessage(inspection);
  updateControls();
  application?.render();
}

function updateControls(): void {
  const busy = animationDirector?.isBusy() ?? false;
  const decisionOpen = isYakuDecisionOpen();
  const resultOpen = isRoundResultOpen();
  deckSelect.disabled = deckStatus === "loading" || processingIntent || decisionOpen || resultOpen;
  fullscreenButton.disabled = processingIntent || decisionOpen || resultOpen;
  newRoundButton.disabled =
    busy || processingIntent || handoffPlayerId !== null || decisionOpen || resultOpen;
  const utilityOpenersBlocked = isUtilityOpenerBlocked();
  historyTrigger.disabled = utilityOpenersBlocked || deckStatus !== "ready";
  yakuGuideTrigger.disabled = utilityOpenersBlocked || deckStatus !== "ready";
  optionsTrigger.disabled = utilityOpenersBlocked;
  contextHelpTrigger.disabled = utilityOpenersBlocked || deckStatus !== "ready";
  for (const option of themeOptions) option.disabled = isCriticalUtilityBlocked();
  if (isCriticalUtilityBlocked()) {
    closeOptions(false);
    closeHistory(false);
    closeYakuGuide(false);
    closeContextHelp(false);
    closeCardInspection(false);
  }
  renderCaptureInspectionControls();
}

async function waitForYakuFeedbackBeat(): Promise<void> {
  if (!yakuPresentation.feedback) return;
  const durationMs =
    animationDirector?.inspect().mode === "normal"
      ? 600
      : animationDirector?.inspect().mode === "fast"
        ? 300
        : animationDirector?.inspect().mode === "reducedMotion"
          ? 220
          : 450;
  await new Promise<void>((resolvePromise) => window.setTimeout(resolvePromise, durationMs));
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

function recordCompletedTurn(
  transition: LocalRoundTransitionV1,
  cpuDecision: {
    readonly confidence: "clear" | "close" | "measured";
    readonly reason: CpuDecisionReasonV1;
  } | null = null,
): void {
  pendingTurnEvents.push(...transition.events);
  const boundary = transition.events.some(
    ({ type }) => type === "turnCompleted" || type === "roundResultCommitted",
  );
  if (!boundary) return;
  const recap = [
    formatTurnRecap(pendingTurnEvents),
    cpuDecision === null
      ? ""
      : `${playerName("player-b")}: ${cpuReasonCopy(cpuDecision.reason)}. ${cpuConfidenceCopy(cpuDecision.confidence)}.`,
  ]
    .filter((part) => part.length > 0)
    .join(" ");
  if (recap.length > 0) recaps.push(recap);
  pendingTurnEvents = [];
  renderRecaps();
}

async function executeCommittedTransition(
  transition: LocalRoundTransitionV1,
  actor: "cpu" | "human",
  cpuDecision: { readonly confidence: number; readonly reason: CpuDecisionReasonV1 } | null = null,
): Promise<void> {
  if (!animationDirector) return;
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
    if (actor === "cpu" && cpuDecision !== null) {
      latestCpuDecision = Object.freeze({
        reason: cpuDecision.reason,
        confidence: cpuConfidenceLabel(cpuDecision.confidence),
      });
    }
    recordCompletedTurn(transition, actor === "cpu" ? latestCpuDecision : null);
    interactionController?.replaceSource(createInteractionSourceFromObservation(observation));
    handoffPlayerId = activeMatchMode === "local" ? transition.handoffPlayerId : null;
    refreshYakuPresentation(transition.events, transition.before);
    refreshRoundResultPresentation(transition.events);
    if (yakuPresentation.feedback && actor === "human") {
      refreshInteractionSurface();
      await waitForYakuFeedbackBeat();
    }
    if (handoffPlayerId) {
      handoffTitle.textContent = `Pass to ${playerName(handoffPlayerId)}`;
      handoffDescription.textContent = `${playerName(observation.playerId)}’s turn is complete. The table is covered until ${playerName(handoffPlayerId)} is ready.`;
      handoff.hidden = false;
      handoffReady.textContent = `${playerName(handoffPlayerId)} ready`;
      status.textContent = `Turn complete. Pass the device to ${playerName(handoffPlayerId)}.`;
    } else if (transition.roundComplete) {
      status.textContent = "The round is complete. Review the recap or start a new round.";
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
    cpuTurnState = isCpuTurn() ? "thinking" : "idle";
    refreshInteractionSurface();
    await persistStableRuntime();
    queueCpuTurn();
  }
}

async function executeIntent(intent: InputCommandIntentV1): Promise<void> {
  if (
    !animationDirector ||
    processingIntent ||
    (activeMatchMode !== "local" && intent.actorId !== "player-a")
  )
    return;
  processingIntent = true;
  refreshYakuPresentation();
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
  await executeCommittedTransition(transition, "human");
}

function queueCpuTurn(): void {
  if (activeMatchMode !== "cpu" || !isCpuTurn() || processingIntent || cpuTurnQueued) return;
  cpuTurnQueued = true;
  queueMicrotask(() => {
    cpuTurnQueued = false;
    void executeCpuTurn();
  });
}

async function executeCpuTurn(): Promise<void> {
  if (!animationDirector || activeMatchMode !== "cpu" || !isCpuTurn() || processingIntent) return;
  const cpuObservation = runtime.observeFor("player-b");
  const rootSeed = activeCpuRootSeed;
  if (rootSeed === null) return;
  const requestContext: CpuRequestContextV1 = Object.freeze({
    generation: cpuRuntimeGeneration,
    matchId: cpuObservation.publicState.matchId,
    stateVersion: cpuObservation.publicState.stateVersion,
    roundNumber: cpuObservation.publicState.round.roundNumber,
    restartIdentity: restartCount,
    personality: activeCpuPersonality,
    difficulty: activeCpuDifficulty,
  });
  const workerOwnerId = cpuWorkerOwnership.claim();
  let currentWorkerFailure = false;
  processingIntent = true;
  cpuTurnState = "thinking";
  status.textContent = cpuTurnMessage();
  refreshInteractionSurface();
  try {
    const decision = await rolloutCpuClient.choose({
      observation: cpuObservation,
      personality: requestContext.personality,
      difficulty: requestContext.difficulty,
      rootSeed,
      restartIdentity: requestContext.restartIdentity,
    });
    if (!cpuRequestIsCurrent(requestContext)) return;
    if (decision === null) throw new Error("CPU_ACTION_MISSING: CPU turn has no legal action.");
    if (!cpuWorkerOwnership.release(workerOwnerId)) return;
    const transition = runtime.submitCpuAction(decision.action);
    await executeCommittedTransition(transition, "cpu", {
      reason: decision.reason,
      confidence: decision.confidence,
    });
  } catch {
    if (!cpuRequestIsCurrent(requestContext)) return;
    currentWorkerFailure = true;
    processingIntent = false;
    cpuTurnState = "idle";
    status.textContent = "CPU turn could not continue. Start a fresh match to try again.";
    refreshInteractionSurface();
  } finally {
    if (cpuWorkerOwnership.release(workerOwnerId)) {
      processingIntent = false;
      cpuTurnState = currentWorkerFailure ? "idle" : isCpuTurn() ? "thinking" : "idle";
      refreshInteractionSurface();
      if (!currentWorkerFailure && requestContext.generation === cpuRuntimeGeneration) {
        queueCpuTurn();
      }
    }
  }
}

function createController(): InteractionControllerV1 {
  return createInteractionController({
    source: createInteractionSourceFromObservation(observation),
    confirmationMode: "guided",
    onIntent: (intent) => void executeIntent(intent),
  });
}

async function acceptHandoff(): Promise<void> {
  if (!handoffPlayerId || !animationDirector) return;
  const nextPlayer = handoffPlayerId;
  const beforeViewerId = runtime.viewerId;
  const beforeStateVersion = runtime.state.stateVersion;
  observation = runtime.switchViewer(nextPlayer);
  const nextProjection = projectObservationToBoard(observation);
  await animationDirector.cancelAndSnapTo(nextProjection);
  projection = nextProjection;
  if (
    shouldReplaceLocalInteractionSource({
      beforeViewerId,
      beforeStateVersion,
      afterViewerId: runtime.viewerId,
      afterStateVersion: runtime.state.stateVersion,
    })
  ) {
    interactionController?.replaceSource(createInteractionSourceFromObservation(observation));
  }
  handoffPlayerId = null;
  refreshYakuPresentation();
  handoff.hidden = true;
  status.textContent = `${playerName(nextPlayer)} is ready. Select a hand card.`;
  refreshInteractionSurface();
}

async function startFreshLocalMatch(
  fromResultAction = false,
  completedMatchLength: MatchLength | null = null,
): Promise<void> {
  if (!animationDirector) return;
  if (processingIntent && !cpuWorkerOwnership.hasPending()) return;
  if (isYakuDecisionOpen() && !localSaveDialog.open) {
    status.textContent = "Resolve the Bank or Koi-Koi decision before starting a fresh match.";
    return;
  }
  if (isRoundResultOpen() && !fromResultAction && !localSaveDialog.open) {
    status.textContent = "Use the round-result action before starting a fresh match.";
    return;
  }
  invalidateCpuRollout();
  activeMatchMode = "local";
  selectedMatchMode = "local";
  activeCpuRootSeed = null;
  cpuTurnState = "idle";
  latestCpuDecision = null;
  syncMatchControls();
  restartCount += 1;
  const matchLength = resolveFreshLocalMatchLength(selectedMatchLength, completedMatchLength);
  runtime = createLocalRoundRuntime({
    matchId: `${PHASE_3A_MATCH_ID}-${restartCount}`,
    matchLength,
    seed: createFreshLocalMatchSeed(restartCount),
  });
  observation = runtime.observe();
  projection = projectObservationToBoard(observation);
  refreshYakuPresentation();
  refreshRoundResultPresentation();
  pendingTurnEvents = [];
  recaps.splice(0, recaps.length);
  commandCount = 0;
  handoffPlayerId = null;
  handoff.hidden = true;
  await animationDirector.cancelAndSnapTo(projection);
  interactionController = createController();
  renderRecaps();
  if (localSaveDialog.open) closeLocalSavePrompt();
  redraw();
  status.textContent =
    observation.publicState.phase.kind === "roundComplete" ||
    observation.publicState.phase.kind === "matchComplete"
      ? `New ${matchLength}-round match. An opening result is ready to review.`
      : `New ${matchLength}-round match. Player A may select a hand card.`;
  refreshInteractionSurface();
  await persistStableRuntime();
}

async function startFreshCpuMatch(
  fromResultAction = false,
  completedMatchLength: MatchLength | null = null,
  allowAbandonSavedLocalView = false,
): Promise<void> {
  if (!animationDirector) return;
  if (processingIntent && !cpuWorkerOwnership.hasPending()) return;
  if (isYakuDecisionOpen() && !localSaveDialog.open && !allowAbandonSavedLocalView) {
    status.textContent = "Resolve the Bank or Koi-Koi decision before starting a fresh match.";
    return;
  }
  if (
    isRoundResultOpen() &&
    !fromResultAction &&
    !localSaveDialog.open &&
    !allowAbandonSavedLocalView
  ) {
    status.textContent = "Use the round-result action before starting a fresh match.";
    return;
  }
  invalidateCpuRollout();
  activeMatchMode = "cpu";
  selectedMatchMode = "cpu";
  activeCpuPersonality = selectedCpuPersonality;
  activeCpuDifficulty = selectedCpuDifficulty;
  activeCpuRootSeed = null;
  cpuTurnState = "idle";
  latestCpuDecision = null;
  syncMatchControls();
  restartCount += 1;
  const matchLength = resolveFreshLocalMatchLength(selectedMatchLength, completedMatchLength);
  runtime = createCpuRoundRuntime({
    matchId: `${PHASE_3A_MATCH_ID}-cpu-${restartCount}`,
    matchLength,
    seed: createFreshLocalMatchSeed(restartCount),
  });
  observation = runtime.observe();
  activeCpuRootSeed = createCpuSessionRootSeed(observation.publicState.matchId, restartCount);
  projection = projectObservationToBoard(observation);
  refreshYakuPresentation();
  refreshRoundResultPresentation();
  pendingTurnEvents = [];
  recaps.splice(0, recaps.length);
  commandCount = 0;
  handoffPlayerId = null;
  handoff.hidden = true;
  await animationDirector.cancelAndSnapTo(projection);
  interactionController = createController();
  renderRecaps();
  if (localSaveDialog.open) closeLocalSavePrompt();
  redraw();
  status.textContent = `New ${matchLength}-round CPU match against ${playerName("player-b")}. Player A may select a hand card.`;
  refreshInteractionSurface();
  queueCpuTurn();
}

function requestFreshCpuMatch(
  fromResult = false,
  completedMatchLength: MatchLength | null = null,
): void {
  void startFreshCpuMatch(fromResult, completedMatchLength);
}

function requestFreshSelectedMatch(
  fromResult = false,
  completedMatchLength: MatchLength | null = null,
): void {
  if (selectedMatchMode === "cpu") requestFreshCpuMatch(fromResult, completedMatchLength);
  else requestFreshLocalMatch(fromResult, completedMatchLength);
}

async function advanceLocalRound(): Promise<void> {
  if (!animationDirector || !resultPresentation || !("plan" in resultPresentation.action)) return;
  if (processingIntent || handoffPlayerId !== null) return;
  invalidateCpuRollout();
  processingIntent = true;
  refreshInteractionSurface();
  try {
    const transition = runtime.advanceRound();
    // CPU explanations describe a completed public turn in the prior round.
    // Never carry one into a fresh month, including an automatic opening result.
    latestCpuDecision = null;
    observation = transition.after;
    projection = projectObservationToBoard(observation);
    pendingTurnEvents = [];
    interactionController?.replaceSource(createInteractionSourceFromObservation(observation));
    refreshYakuPresentation(transition.events, transition.before);
    refreshRoundResultPresentation(transition.events);
    handoffPlayerId = activeMatchMode === "local" ? transition.handoffPlayerId : null;
    await animationDirector.cancelAndSnapTo(projection);
    if (handoffPlayerId) {
      handoffTitle.textContent = `Pass to ${playerName(handoffPlayerId)}`;
      handoffDescription.textContent = `The next private hand remains covered until ${playerName(handoffPlayerId)} is ready.`;
      handoffReady.textContent = `${playerName(handoffPlayerId)} ready`;
      handoff.hidden = false;
      status.textContent = `Round advanced. Pass the device to ${playerName(handoffPlayerId)}.`;
    } else if (transition.roundComplete) {
      status.textContent = "The automatic result is ready to review.";
    } else {
      status.textContent = inputMessage(interactionController?.inspect() ?? unavailableInput);
    }
  } catch (error: unknown) {
    status.textContent = `Could not advance the local round: ${error instanceof Error ? error.message : "unknown error"}`;
    console.error(error);
  } finally {
    processingIntent = false;
    refreshInteractionSurface();
    await persistStableRuntime();
    queueCpuTurn();
  }
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
  if (isYakuDecisionOpen() || isRoundResultOpen()) return;
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
  if (isYakuDecisionOpen() || isRoundResultOpen()) {
    deckSelect.value = cardAssetManager.active?.manifest.packageId ?? INSTALLED_DECKS[0].id;
    return;
  }
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

historyTrigger.addEventListener("click", openHistory);
historyClose.addEventListener("click", () => closeHistory());
historyDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeHistory();
});
historyDialog.addEventListener("close", () => {
  historyTrigger.setAttribute("aria-expanded", "false");
});
yakuGuideTrigger.addEventListener("click", openYakuGuide);
yakuGuideClose.addEventListener("click", () => closeYakuGuide());
yakuGuideDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeYakuGuide();
});
yakuGuideDialog.addEventListener("close", () => {
  yakuGuideTrigger.setAttribute("aria-expanded", "false");
});
optionsTrigger.addEventListener("click", openOptions);
optionsClose.addEventListener("click", () => closeOptions());
optionsDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeOptions();
});
optionsDialog.addEventListener("close", () => {
  optionsTrigger.setAttribute("aria-expanded", "false");
});
contextHelpTrigger.addEventListener("click", openContextHelp);
contextHelpClose.addEventListener("click", () => closeContextHelp());
contextHelpDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeContextHelp();
});
contextHelpDialog.addEventListener("close", () => {
  contextHelpTrigger.setAttribute("aria-expanded", "false");
});
cardInspectorClose.addEventListener("click", () => closeCardInspection());
cardInspector.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCardInspection();
});
cardInspector.addEventListener("close", () => {
  cardInspectionCardId = null;
  cardInspectionTrigger = null;
});
cardInspectorYaku.addEventListener("toggle", syncCardInspectorYakuDisclosure);
for (const control of captureInspectControls) {
  control.addEventListener("click", () => openCaptureInspection(control));
}
captureInspectorClose.addEventListener("click", () => closeCaptureInspection());
captureInspector.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCaptureInspection();
});
captureInspector.addEventListener("close", () => {
  captureInspectionOwner = null;
});
for (const option of themeOptions) {
  option.addEventListener("change", () => {
    if (!option.checked || isCriticalUtilityBlocked() || !optionsDialog.open) return;
    void themeStore.set(option.value).then((theme) => {
      optionsAnnouncement.textContent = `${theme.name} theme applied. The game state and card selection are unchanged.`;
    });
  });
}
fullscreenButton.addEventListener("click", () => {
  closeOptions(false);
  void toggleFullscreen();
});
deckSelect.addEventListener("change", () => void switchDeck(deckSelect.value));
matchLengthSelect.addEventListener("change", () => {
  const value = Number(matchLengthSelect.value);
  if (value !== 3 && value !== 6 && value !== 12) {
    matchLengthSelect.value = String(selectedMatchLength);
    return;
  }
  selectedMatchLength = value;
  optionsAnnouncement.textContent = `${selectedMatchLength}-round format selected. It will apply when a fresh match starts.`;
});
matchModeSelect.addEventListener("change", () => {
  const mode = matchModeSelect.value;
  if (mode !== "cpu" && mode !== "local") {
    matchModeSelect.value = selectedMatchMode;
    return;
  }
  selectedMatchMode = mode;
  syncMatchControls();
});
for (const input of cpuPersonalityInputs) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    if (input.value !== "timid" && input.value !== "monk" && input.value !== "gambler") return;
    selectedCpuPersonality = input.value;
    syncMatchControls();
  });
}
for (const input of cpuDifficultyInputs) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    if (input.value !== "easy" && input.value !== "standard" && input.value !== "hard") return;
    selectedCpuDifficulty = input.value;
    syncMatchControls();
  });
}
fieldPlacementControl.addEventListener("click", () => {
  interactionController?.confirm();
  refreshInteractionSurface();
});
fieldPlacementControl.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (interactionController?.cancel()) status.textContent = "Card selection cancelled.";
  refreshInteractionSurface();
});
yakuBankButton.addEventListener("click", () => {
  interactionController?.chooseYakuDecision("bank");
  refreshInteractionSurface();
});
yakuKoiKoiButton.addEventListener("click", () => {
  interactionController?.chooseYakuDecision("koiKoi");
  refreshInteractionSurface();
});
newRoundButton.addEventListener("click", () => {
  closeOptions(false);
  requestFreshSelectedMatch();
});
roundResultAction.addEventListener("click", () => {
  if (resultPresentation && "plan" in resultPresentation.action) {
    void advanceLocalRound();
  } else if (resultPresentation && "result" in resultPresentation.action) {
    if (activeMatchMode === "cpu") {
      requestFreshCpuMatch(true, resultPresentation.action.result.matchLength);
    } else {
      requestFreshLocalMatch(true, resultPresentation.action.result.matchLength);
    }
  }
});
localSavePrimary.addEventListener("click", () => {
  if (persistencePromptKind === "resume") {
    void continueSavedMatch();
  } else if (persistencePromptKind === "corrupt") {
    downloadLocalSaveDiagnostic();
  } else if (persistencePromptKind === "delete" || persistencePromptKind === "fresh") {
    void deleteSavedGame();
  }
});
localSaveDelete.addEventListener("click", () => {
  if (persistencePromptKind === "resume" || persistencePromptKind === "corrupt") {
    renderLocalSavePrompt("delete");
  }
});
localSaveSecondary.addEventListener("click", () => {
  if (persistencePromptKind === "corrupt") renderLocalSavePrompt("fresh");
  else if (localSavePromptOrigin === "corrupt") renderLocalSavePrompt("corrupt");
  else if (pendingResumeSave !== null) renderLocalSavePrompt("resume");
  else closeLocalSavePrompt();
});
localSaveCpu.addEventListener("click", () => {
  if (persistencePromptKind !== "resume") return;
  selectedMatchMode = "cpu";
  syncMatchControls();
  void startFreshCpuMatch(false, null, true);
});
localSaveDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  if (persistencePromptKind === "delete" && localSavePromptOrigin === "corrupt")
    renderLocalSavePrompt("corrupt");
  else if (persistencePromptKind === "delete" && pendingResumeSave !== null)
    renderLocalSavePrompt("resume");
});
handoffReady.addEventListener("click", () => void acceptHandoff());
document.addEventListener("fullscreenchange", updateFullscreenLabel);
window.addEventListener("pagehide", invalidateCpuRollout);
window.addEventListener("beforeunload", invalidateCpuRollout);
window.addEventListener("pageshow", queueCpuTurn);
window.addEventListener("keydown", (event) => {
  if (captureInspector.open) return;
  if (
    historyDialog.open ||
    yakuGuideDialog.open ||
    optionsDialog.open ||
    contextHelpDialog.open ||
    cardInspector.open
  ) {
    if (event.key.toLowerCase() === "f") event.preventDefault();
    return;
  }
  if (isRoundResultOpen() && !processingIntent) {
    if (event.key === "Tab") {
      event.preventDefault();
      const actions = [roundResultAction, roundResultDetailsSummary];
      const currentIndex = actions.indexOf(document.activeElement as HTMLElement);
      const delta = event.shiftKey ? -1 : 1;
      actions[(currentIndex + delta + actions.length) % actions.length]?.focus();
    } else if (event.key === "Escape" || event.key.toLowerCase() === "f") {
      event.preventDefault();
    }
    return;
  }
  if (isYakuDecisionOpen()) {
    if (event.key === "Tab") {
      const actions = [...captureInspectControls, yakuBankButton, yakuKoiKoiButton].filter(
        (button) => !button.hidden && !button.disabled,
      );
      if (actions.length > 0) {
        event.preventDefault();
        const currentIndex = actions.indexOf(document.activeElement as HTMLButtonElement);
        const delta = event.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + actions.length) % actions.length;
        actions[nextIndex]?.focus();
      }
    } else if (event.key === "Escape" || event.key.toLowerCase() === "f") {
      event.preventDefault();
    }
    return;
  }
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
  applyActiveTheme(await themeStore.hydrate());
  syncMatchControls();
  await prepareLocalSave();
  if (pendingResumeSave !== null) {
    runtime = restoreLocalRoundRuntime(localSaveSnapshot(pendingResumeSave));
    observation = runtime.observe();
    projection = projectObservationToBoard(observation);
    selectedMatchLength = observation.publicState.matchLength;
    matchLengthSelect.value = String(selectedMatchLength);
    refreshYakuPresentation();
    refreshRoundResultPresentation();
  }
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
  tableScene = createTableScene(app, initialActivation.bundle, activeTheme);
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const initialMode: AnimationMode = motionPreference.matches ? "reducedMotion" : "normal";
  animationDirector = createAnimationDirector({
    initialProjection: projection,
    mode: initialMode,
    surface: tableScene,
  });
  motionPreference.addEventListener("change", ({ matches }) => {
    animationDirector?.setMode(matches ? "reducedMotion" : "normal");
  });
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
    onInspect: (cardId, trigger) => openCardInspection(cardId, trigger),
  });
  new ResizeObserver(redraw).observe(host);
  ready = true;
  deckStatus = "ready";
  deckSelect.value = initialActivation.bundle.manifest.packageId;
  window.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
  renderRecaps();
  if (pendingResumeSave !== null) {
    status.textContent = "A saved local match is ready to continue.";
    openLocalSavePrompt("resume");
  } else if (pendingSaveDiagnostic !== null) {
    status.textContent = "Saved game recovery is required before a local match can start.";
    openLocalSavePrompt("corrupt");
  } else {
    status.textContent = "Player A may select a hand card.";
    redraw();
    refreshInteractionSurface();
    await persistStableRuntime();
  }
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  deckStatus = "error";
  status.textContent = `The local round could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
