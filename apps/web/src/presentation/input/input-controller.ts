import {
  CARD_IDS,
  deepFreeze,
  getHandPlayResolutionPreview,
  PLAYER_IDS,
  type CardId,
  type HandPlayResolutionPreviewV1,
  type LegalActionV1,
} from "@koikoi4x/engine";

import {
  INPUT_CONFIRMATION_MODES,
  INPUT_LOCK_REASONS,
  type InputCommandIntentV1,
  type InputConfirmationMode,
  type InputIntentActionV1,
  type InputInteractionStatus,
  type InputLockReason,
  type InteractionControllerV1,
  type InteractionSourceV1,
} from "./types";

interface ControllerState {
  status: InputInteractionStatus;
  lockReason: InputLockReason | null;
  selectedCardId: CardId | null;
  legalTargetCardIds: readonly CardId[];
  selectedActions: readonly LegalActionV1[];
  handResolutionKind: HandPlayResolutionPreviewV1["kind"] | null;
  fieldPlacementAvailable: boolean;
  focusedCardId: CardId | null;
  lastIntentType: InputIntentActionV1["type"] | null;
}

const CARD_ID_SET = new Set<CardId>(CARD_IDS);

function uniqueCardIds(cardIds: readonly CardId[]): readonly CardId[] {
  return Object.freeze([...new Set(cardIds)]);
}

function sameObservationScope(left: InteractionSourceV1, right: InteractionSourceV1): boolean {
  return (
    left.observation.publicState.matchId === right.observation.publicState.matchId &&
    left.observation.playerId === right.observation.playerId
  );
}

function validateSource(source: InteractionSourceV1): void {
  const { observation } = source;
  if (observation.formatVersion !== 1 || !PLAYER_IDS.includes(observation.playerId)) {
    throw new Error("Interaction source requires a canonical player observation.");
  }
  if (
    typeof observation.publicState.matchId !== "string" ||
    observation.publicState.matchId.length === 0 ||
    !Number.isInteger(observation.publicState.stateVersion) ||
    observation.publicState.stateVersion < 0
  ) {
    throw new Error("Interaction source has an invalid public-state identity.");
  }
  const ownHand = new Set(observation.ownHand);
  const publicField = new Set(observation.publicState.round.field);
  const phase = observation.publicState.phase;
  const groupedHandActions = new Map<
    CardId,
    Extract<LegalActionV1, { readonly type: "playHandCard" }>[]
  >();
  for (const action of observation.legalActions) {
    if (action.actorId !== observation.playerId) {
      throw new Error("Every legal action must belong to the observing player.");
    }
    if (action.type === "playHandCard") {
      if (!ownHand.has(action.cardId)) {
        throw new Error(
          "A hand-play action references a card outside the observing player's hand.",
        );
      }
      const matchingFieldCardIds = action.resolution.matchingFieldCardIds;
      const expectedCount =
        action.resolution.kind === "placeOnField"
          ? 0
          : action.resolution.kind === "capturePair"
            ? 1
            : action.resolution.kind === "captureChoice"
              ? 2
              : 3;
      if (
        matchingFieldCardIds.length !== expectedCount ||
        new Set(matchingFieldCardIds).size !== matchingFieldCardIds.length ||
        matchingFieldCardIds.some((cardId) => !CARD_ID_SET.has(cardId) || !publicField.has(cardId))
      ) {
        throw new Error("A hand-play resolution preview has invalid public field cards.");
      }
      const expectedResolution = getHandPlayResolutionPreview(
        observation.publicState.round.field,
        action.cardId,
      );
      if (
        action.resolution.kind !== expectedResolution.kind ||
        matchingFieldCardIds.length !== expectedResolution.matchingFieldCardIds.length ||
        matchingFieldCardIds.some(
          (cardId, index) => cardId !== expectedResolution.matchingFieldCardIds[index],
        )
      ) {
        throw new Error(
          "A hand-play resolution preview disagrees with the engine-owned public-field inspection.",
        );
      }
      const grouped = groupedHandActions.get(action.cardId) ?? [];
      grouped.push(action);
      groupedHandActions.set(action.cardId, grouped);
    }
    const targetFieldCardId =
      action.type === "chooseDrawCapture" || action.type === "playHandCard"
        ? action.targetFieldCardId
        : undefined;
    if (targetFieldCardId !== undefined && !publicField.has(targetFieldCardId)) {
      throw new Error("A legal capture action references a card outside the public field.");
    }
    const phaseMatchesAction =
      (phase.kind === "awaitingHandPlay" &&
        phase.playerId === observation.playerId &&
        action.type === "playHandCard") ||
      (phase.kind === "awaitingDrawCapture" &&
        phase.playerId === observation.playerId &&
        action.type === "chooseDrawCapture" &&
        action.drawnCardId === phase.drawnCardId &&
        phase.targetFieldCardIds.includes(action.targetFieldCardId)) ||
      (phase.kind === "awaitingYakuDecision" &&
        phase.playerId === observation.playerId &&
        action.type === "chooseYakuDecision");
    if (!phaseMatchesAction) {
      throw new Error("A legal action does not match the observing player's public phase.");
    }
  }

  for (const actions of groupedHandActions.values()) {
    const first = actions[0];
    if (!first) continue;
    const preview = first.resolution;
    const samePreview = actions.every(
      (action) =>
        action.resolution.kind === preview.kind &&
        action.resolution.matchingFieldCardIds.length === preview.matchingFieldCardIds.length &&
        action.resolution.matchingFieldCardIds.every(
          (cardId, index) => cardId === preview.matchingFieldCardIds[index],
        ),
    );
    if (!samePreview) {
      throw new Error("A hand card's legal actions disagree about its resolution preview.");
    }
    if (preview.kind === "captureChoice") {
      const targetIds = actions.flatMap(({ targetFieldCardId }) =>
        targetFieldCardId === undefined ? [] : [targetFieldCardId],
      );
      if (
        actions.length !== 2 ||
        new Set(targetIds).size !== 2 ||
        targetIds.some((cardId) => !preview.matchingFieldCardIds.includes(cardId))
      ) {
        throw new Error("A capture-choice preview must match exactly two legal target actions.");
      }
    } else if (actions.length !== 1 || first.targetFieldCardId !== undefined) {
      throw new Error("An unambiguous hand preview requires one target-free legal action.");
    }
  }
}

function actionToIntentAction(action: LegalActionV1): InputIntentActionV1 {
  if (action.type === "playHandCard") {
    return deepFreeze({
      type: action.type,
      cardId: action.cardId,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    });
  }
  if (action.type === "chooseDrawCapture") {
    return deepFreeze({
      type: action.type,
      targetFieldCardId: action.targetFieldCardId,
    });
  }
  return deepFreeze({ type: action.type, choice: action.choice });
}

function handActions(
  source: InteractionSourceV1,
): readonly Extract<LegalActionV1, { readonly type: "playHandCard" }>[] {
  return source.observation.legalActions.filter(
    (action): action is Extract<LegalActionV1, { readonly type: "playHandCard" }> =>
      action.type === "playHandCard",
  );
}

function drawActions(
  source: InteractionSourceV1,
): readonly Extract<LegalActionV1, { readonly type: "chooseDrawCapture" }>[] {
  return source.observation.legalActions.filter(
    (action): action is Extract<LegalActionV1, { readonly type: "chooseDrawCapture" }> =>
      action.type === "chooseDrawCapture",
  );
}

function decisionActions(
  source: InteractionSourceV1,
): readonly Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }>[] {
  return source.observation.legalActions.filter(
    (action): action is Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }> =>
      action.type === "chooseYakuDecision",
  );
}

function selectableCards(source: InteractionSourceV1): readonly CardId[] {
  return uniqueCardIds(handActions(source).map(({ cardId }) => cardId));
}

function stateForSource(source: InteractionSourceV1): ControllerState {
  const phase = source.observation.publicState.phase;
  if (phase.kind === "roundComplete" || phase.kind === "matchComplete") {
    return {
      status: "locked",
      lockReason: "roundTransition",
      selectedCardId: null,
      legalTargetCardIds: Object.freeze([]),
      selectedActions: Object.freeze([]),
      handResolutionKind: null,
      fieldPlacementAvailable: false,
      focusedCardId: null,
      lastIntentType: null,
    };
  }
  if (phase.playerId !== source.observation.playerId) {
    return {
      status: "locked",
      lockReason: "opponentTurn",
      selectedCardId: null,
      legalTargetCardIds: Object.freeze([]),
      selectedActions: Object.freeze([]),
      handResolutionKind: null,
      fieldPlacementAvailable: false,
      focusedCardId: null,
      lastIntentType: null,
    };
  }
  if (phase.kind === "awaitingDrawCapture") {
    const actions = drawActions(source);
    return {
      status: actions.length > 0 ? "targeting" : "locked",
      lockReason: actions.length > 0 ? null : "opponentTurn",
      selectedCardId: phase.drawnCardId,
      legalTargetCardIds: uniqueCardIds(actions.map(({ targetFieldCardId }) => targetFieldCardId)),
      selectedActions: Object.freeze(actions),
      handResolutionKind: null,
      fieldPlacementAvailable: false,
      focusedCardId: actions[0]?.targetFieldCardId ?? null,
      lastIntentType: null,
    };
  }
  if (phase.kind === "awaitingYakuDecision") {
    const actions = decisionActions(source);
    return {
      status: actions.length > 0 ? "decision" : "locked",
      lockReason: actions.length > 0 ? null : "opponentTurn",
      selectedCardId: null,
      legalTargetCardIds: Object.freeze([]),
      selectedActions: Object.freeze(actions),
      handResolutionKind: null,
      fieldPlacementAvailable: false,
      focusedCardId: null,
      lastIntentType: null,
    };
  }
  const cards = selectableCards(source);
  return {
    status: cards.length > 0 ? "idle" : "locked",
    lockReason: cards.length > 0 ? null : "opponentTurn",
    selectedCardId: null,
    legalTargetCardIds: Object.freeze([]),
    selectedActions: Object.freeze([]),
    handResolutionKind: null,
    fieldPlacementAvailable: false,
    focusedCardId: cards[0] ?? null,
    lastIntentType: null,
  };
}

export function createInteractionController(input: {
  source: InteractionSourceV1;
  confirmationMode: InputConfirmationMode;
  onIntent: (intent: InputCommandIntentV1) => void;
}): InteractionControllerV1 {
  validateSource(input.source);
  if (!INPUT_CONFIRMATION_MODES.includes(input.confirmationMode)) {
    throw new Error(`Unknown confirmation mode: ${input.confirmationMode}.`);
  }

  let source = input.source;
  let confirmationMode = input.confirmationMode;
  let externalLock: InputLockReason | null = null;
  let emittedIntentCount = 0;
  let state = stateForSource(source);

  const resetFromSource = (): void => {
    state = stateForSource(source);
    if (externalLock !== null) {
      state = {
        ...state,
        status: "locked",
        lockReason: externalLock,
        selectedCardId: null,
        legalTargetCardIds: Object.freeze([]),
        selectedActions: Object.freeze([]),
        handResolutionKind: null,
        fieldPlacementAvailable: false,
        focusedCardId: null,
      };
    }
  };

  const emit = (action: LegalActionV1): void => {
    if (state.status === "intentPending" || state.status === "locked") return;
    const intent = deepFreeze({
      formatVersion: 1 as const,
      matchId: source.observation.publicState.matchId,
      expectedStateVersion: source.observation.publicState.stateVersion,
      actorId: source.observation.playerId,
      action: actionToIntentAction(action),
    });
    emittedIntentCount += 1;
    state = {
      ...state,
      status: "intentPending",
      lockReason: null,
      legalTargetCardIds: Object.freeze([]),
      selectedActions: Object.freeze([]),
      handResolutionKind: null,
      fieldPlacementAvailable: false,
      focusedCardId: null,
      lastIntentType: intent.action.type,
    };
    input.onIntent(intent);
  };

  const cancel = (): boolean => {
    if (state.status !== "confirming" && state.status !== "targeting") return false;
    if (source.observation.publicState.phase.kind === "awaitingDrawCapture") return false;
    resetFromSource();
    return true;
  };

  return {
    activateCard: (cardId) => {
      if (
        state.status === "locked" ||
        state.status === "intentPending" ||
        state.status === "decision"
      ) {
        return false;
      }
      const actionsForHandCard = handActions(source).filter((action) => action.cardId === cardId);
      if (actionsForHandCard.length > 0) {
        if (state.selectedCardId === cardId && state.status !== "idle") return cancel();
        if (actionsForHandCard.length === 1 && confirmationMode === "fast") {
          const action = actionsForHandCard[0];
          if (!action) return false;
          emit(action);
          return true;
        }
        const resolution = actionsForHandCard[0]?.resolution;
        if (!resolution) return false;
        const targetCardIds = resolution.matchingFieldCardIds;
        state = {
          ...state,
          status: actionsForHandCard.length > 1 ? "targeting" : "confirming",
          lockReason: null,
          selectedCardId: cardId,
          legalTargetCardIds: uniqueCardIds(targetCardIds),
          selectedActions: Object.freeze(actionsForHandCard),
          handResolutionKind: resolution.kind,
          fieldPlacementAvailable: resolution.kind === "placeOnField",
          focusedCardId: targetCardIds[0] ?? cardId,
        };
        return true;
      }

      if (!state.legalTargetCardIds.includes(cardId)) return false;
      const phase = source.observation.publicState.phase;
      if (phase.kind === "awaitingDrawCapture") {
        const action = drawActions(source).find(
          ({ targetFieldCardId }) => targetFieldCardId === cardId,
        );
        if (!action) return false;
        emit(action);
        return true;
      }
      if (state.selectedActions.length === 1 && state.status === "confirming") {
        const action = state.selectedActions[0];
        if (!action) return false;
        emit(action);
        return true;
      }
      const action = state.selectedActions.find(
        (candidate) => candidate.type === "playHandCard" && candidate.targetFieldCardId === cardId,
      );
      if (!action) return false;
      emit(action);
      return true;
    },
    cancel,
    chooseYakuDecision: (choice) => {
      if (state.status !== "decision") return false;
      const action = decisionActions(source).find((candidate) => candidate.choice === choice);
      if (!action) return false;
      emit(action);
      return true;
    },
    confirm: () => {
      if (state.status !== "confirming" || state.selectedActions.length !== 1) return false;
      const action = state.selectedActions[0];
      if (!action) return false;
      emit(action);
      return true;
    },
    inspect: () => {
      const choices =
        state.status === "decision"
          ? decisionActions(source).map(({ choice }) => choice)
          : Object.freeze([]);
      return deepFreeze({
        status: state.status,
        confirmationMode,
        lockReason: state.lockReason,
        selectedCardId: state.selectedCardId,
        selectableCardIds:
          state.status === "idle" || state.status === "confirming" || state.status === "targeting"
            ? selectableCards(source)
            : [],
        legalTargetCardIds: state.legalTargetCardIds,
        handResolutionKind: state.handResolutionKind,
        fieldPlacementAvailable: state.fieldPlacementAvailable,
        decisionChoices: choices,
        confirmAvailable: state.status === "confirming" && state.selectedActions.length === 1,
        cancelAvailable:
          (state.status === "confirming" || state.status === "targeting") &&
          source.observation.publicState.phase.kind !== "awaitingDrawCapture",
        focusedCardId: state.focusedCardId,
        matchId: source.observation.publicState.matchId,
        observationStateVersion: source.observation.publicState.stateVersion,
        lastIntentType: state.lastIntentType,
        emittedIntentCount,
      });
    },
    replaceSource: (nextSource) => {
      validateSource(nextSource);
      if (
        sameObservationScope(source, nextSource) &&
        nextSource.observation.publicState.stateVersion <=
          source.observation.publicState.stateVersion
      ) {
        throw new Error(
          "Input replacement requires a newer observation for the same match/player.",
        );
      }
      source = nextSource;
      externalLock = null;
      resetFromSource();
    },
    setConfirmationMode: (mode) => {
      if (!INPUT_CONFIRMATION_MODES.includes(mode)) {
        throw new Error(`Unknown confirmation mode: ${mode}.`);
      }
      confirmationMode = mode;
      if (state.status === "intentPending") return;
      resetFromSource();
    },
    setExternalLock: (reason) => {
      if (reason !== null && !INPUT_LOCK_REASONS.includes(reason)) {
        throw new Error(`Unknown input lock reason: ${reason}.`);
      }
      if (externalLock === reason) return;
      externalLock = reason;
      if (state.status === "intentPending") return;
      resetFromSource();
    },
    setFocusedCardId: (cardId) => {
      if (cardId === null) {
        state = { ...state, focusedCardId: null };
        return;
      }
      const enabled = [...selectableCards(source), ...state.legalTargetCardIds];
      if (
        !enabled.includes(cardId) ||
        state.status === "locked" ||
        state.status === "intentPending"
      ) {
        return;
      }
      state = { ...state, focusedCardId: cardId };
    },
  };
}
