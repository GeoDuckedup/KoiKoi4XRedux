import { isCardId, type CardId } from "../cards/catalog";
import { rejectCommand } from "../state/errors";
import { deepFreeze } from "../state/freeze";
import {
  PLAYER_IDS,
  type AuthoritativeGameStateV1,
  type ActiveYakuV1,
  type CapturePhase,
  type ChooseYakuDecisionCommandV1,
  type EnginePhaseV1,
  type GameplayEventV1,
  type GameplayCommandV1,
  type GameplayTransitionV1,
  type LegalActionV1,
  type PlayHandCardCommandV1,
  type PlayerId,
  type PlayerPair,
  type PlayerStateV1,
  type RoundStateV1,
  type RoundResultV1,
  type ResolveDrawCardCommandV1,
  type TableMultiplier,
  type TurnEventV1,
  type YakuDecisionResumeV1,
} from "../state/types";
import { assertValidAuthoritativeState } from "../state/validation";
import {
  getHandPlayResolutionPreview,
  inspectCapture,
  resolveCapture,
  type CaptureResolutionV1,
} from "./capture";
import { evaluateYaku } from "./yaku";
import {
  createMatchResult,
  createNoScoreRoundResult,
  createScoredRoundResult,
  otherPlayerId,
} from "./round-results";

function publicAudience() {
  return Object.freeze({ kind: "public" as const });
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return otherPlayerId(playerId);
}

function activePlayerId(state: AuthoritativeGameStateV1): PlayerId | null {
  return state.phase.kind === "awaitingHandPlay" ||
    state.phase.kind === "awaitingDrawResolution" ||
    state.phase.kind === "awaitingYakuDecision"
    ? state.phase.playerId
    : null;
}

function validateCommandBase(state: AuthoritativeGameStateV1, command: GameplayCommandV1): void {
  if (typeof command.commandId !== "string" || command.commandId.trim().length === 0) {
    rejectCommand("COMMAND_ID_INVALID", "commandId must be nonempty.");
  }
  if (command.commandId === state.lastAcceptedCommandId) {
    rejectCommand("COMMAND_ID_REUSED", "The most recently accepted command ID cannot be reused.");
  }
  if (command.matchId !== state.matchId) {
    rejectCommand("MATCH_ID_MISMATCH", "Command matchId does not identify this state.");
  }
  if (
    !Number.isSafeInteger(command.expectedStateVersion) ||
    command.expectedStateVersion !== state.stateVersion
  ) {
    rejectCommand("STATE_VERSION_MISMATCH", "Command expectedStateVersion is stale or invalid.");
  }
  if (!PLAYER_IDS.includes(command.actorId)) {
    rejectCommand("ACTOR_INVALID", "Command actor must be a canonical player.");
  }
  const activeId = activePlayerId(state);
  if (activeId === null) {
    rejectCommand("ROUND_NOT_PLAYABLE", "The current phase does not accept gameplay commands.");
  }
  if (command.actorId !== activeId) {
    rejectCommand("ACTOR_NOT_ACTIVE", "Only the active player may submit this command.");
  }
}

function replacePlayer(
  players: PlayerPair<PlayerStateV1>,
  playerId: PlayerId,
  replacement: PlayerStateV1,
): PlayerPair<PlayerStateV1> {
  return playerId === PLAYER_IDS[0] ? [replacement, players[1]] : [players[0], replacement];
}

function eventsForResolution(
  actorId: PlayerId,
  phase: CapturePhase,
  resolution: Exclude<CaptureResolutionV1, { readonly kind: "choiceRequired" }>,
): readonly TurnEventV1[] {
  if (resolution.kind === "placed") {
    return deepFreeze([
      {
        type: "cardPlacedOnField",
        audience: publicAudience(),
        actorId,
        phase,
        cardId: resolution.sourceCardId,
      },
    ]);
  }
  return deepFreeze([
    {
      type: "captureStarted",
      audience: publicAudience(),
      actorId,
      phase,
      sourceCardId: resolution.sourceCardId,
      targetFieldCardIds: resolution.matchingFieldCardIds,
      captureKind: resolution.captureKind,
    },
    {
      type: "cardsCaptured",
      audience: publicAudience(),
      actorId,
      phase,
      cardIds: resolution.capturedCardIds,
      captureKind: resolution.captureKind,
    },
  ]);
}

function updatedPlayerAfterResolution(
  player: PlayerStateV1,
  resolution: Exclude<CaptureResolutionV1, { readonly kind: "choiceRequired" }>,
  hand: readonly CardId[] = player.hand,
): PlayerStateV1 {
  return deepFreeze({
    ...player,
    hand,
    captured:
      resolution.kind === "captured"
        ? [...player.captured, ...resolution.capturedCardIds]
        : player.captured,
  });
}

interface YakuCheckResult {
  readonly players: PlayerPair<PlayerStateV1>;
  readonly events: readonly TurnEventV1[];
  readonly decisionPhase: Extract<EnginePhaseV1, { readonly kind: "awaitingYakuDecision" }> | null;
  readonly firstYakuTriggerPlayerId: PlayerId | null;
}

function yakuValueChangeEvents(
  actorId: PlayerId,
  phase: CapturePhase,
  previousActiveYaku: readonly ActiveYakuV1[],
  currentActiveYaku: readonly ActiveYakuV1[],
  newYaku: readonly ActiveYakuV1[],
): readonly TurnEventV1[] {
  const newKeys = new Set(newYaku.map((entry) => entry.key));
  return deepFreeze(
    currentActiveYaku.flatMap((current): readonly TurnEventV1[] => {
      const previous = previousActiveYaku.find((entry) => entry.key === current.key);
      return previous !== undefined &&
        previous.points !== current.points &&
        !newKeys.has(current.key)
        ? [
            {
              type: "yakuValueChanged",
              audience: publicAudience(),
              actorId,
              phase,
              yakuKey: current.key,
              name: current.name,
              previousPoints: previous.points,
              currentPoints: current.points,
            },
          ]
        : [];
    }),
  );
}

function performYakuCheck(
  state: AuthoritativeGameStateV1,
  playersBeforeResolution: PlayerPair<PlayerStateV1>,
  playersAfterResolution: PlayerPair<PlayerStateV1>,
  actorId: PlayerId,
  phase: CapturePhase,
  resume: YakuDecisionResumeV1,
): YakuCheckResult {
  const actorBefore = playersBeforeResolution.find((player) => player.id === actorId);
  const actorAfter = playersAfterResolution.find((player) => player.id === actorId);
  if (actorBefore === undefined || actorAfter === undefined)
    throw new Error("PLAYER_INVARIANT: active player disappeared during yaku evaluation.");
  const evaluation = evaluateYaku(
    actorAfter.captured,
    state.round.scheduledMonth,
    actorAfter.seenYakuKeys,
  );
  const completedEvents: TurnEventV1[] = evaluation.newYaku.map((yaku) => ({
    type: "yakuCompleted",
    audience: publicAudience(),
    actorId,
    phase,
    yaku,
  }));
  const valueChangeEvents = yakuValueChangeEvents(
    actorId,
    phase,
    actorBefore.activeYaku,
    evaluation.activeYaku,
    evaluation.newYaku,
  );
  const seenYakuKeys =
    evaluation.newYaku.length === 0
      ? actorAfter.seenYakuKeys
      : [...actorAfter.seenYakuKeys, ...evaluation.newYaku.map((entry) => entry.key)];
  const updatedActor = deepFreeze<PlayerStateV1>({
    ...actorAfter,
    seenYakuKeys,
    activeYaku: evaluation.activeYaku,
    currentYakuTotal: evaluation.currentYakuTotal,
  });
  const players = replacePlayer(playersAfterResolution, actorId, updatedActor);
  if (evaluation.newYaku.length === 0) {
    return deepFreeze({
      players,
      events: valueChangeEvents,
      decisionPhase: null,
      firstYakuTriggerPlayerId: state.round.firstYakuTriggerPlayerId,
    });
  }
  const context = deepFreeze({
    phase,
    newYaku: evaluation.newYaku,
    activeYaku: evaluation.activeYaku,
    currentYakuTotal: evaluation.currentYakuTotal,
    resume,
  });
  const events: TurnEventV1[] = [
    ...completedEvents,
    ...valueChangeEvents,
    {
      type: "yakuDecisionRequired",
      audience: publicAudience(),
      actorId,
      context,
    },
  ];
  return deepFreeze({
    players,
    events,
    decisionPhase: { kind: "awaitingYakuDecision", playerId: actorId, context },
    firstYakuTriggerPlayerId: state.round.firstYakuTriggerPlayerId ?? actorId,
  });
}

function commitTransition(
  previous: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  drawPile: readonly CardId[],
  phase: EnginePhaseV1,
  events: readonly GameplayEventV1[],
  roundUpdates: Partial<RoundStateV1> = {},
): GameplayTransitionV1 {
  const state = deepFreeze<AuthoritativeGameStateV1>({
    ...previous,
    stateVersion: previous.stateVersion + 1,
    lastAcceptedCommandId: command.commandId,
    players,
    round: { ...previous.round, ...roundUpdates, field, drawPile },
    phase,
  });
  assertValidAuthoritativeState(state);
  return deepFreeze({ state, events });
}

function stateWithRoundUpdates(
  state: AuthoritativeGameStateV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  drawPile: readonly CardId[],
  roundUpdates: Partial<RoundStateV1>,
): AuthoritativeGameStateV1 {
  return {
    ...state,
    players,
    round: { ...state.round, ...roundUpdates, field, drawPile },
  };
}

function commitRoundResult(
  previous: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  drawPile: readonly CardId[],
  result: RoundResultV1,
  precedingEvents: readonly GameplayEventV1[],
  roundUpdates: Partial<RoundStateV1> = {},
): GameplayTransitionV1 {
  const scoredPlayers = deepFreeze<PlayerPair<PlayerStateV1>>([
    deepFreeze({
      ...players[0],
      score: players[0].score + result.pointDeltas["player-a"],
    }),
    deepFreeze({
      ...players[1],
      score: players[1].score + result.pointDeltas["player-b"],
    }),
  ]);
  const history = deepFreeze([...previous.history, result]);
  const matchResult =
    result.nextRound === null ? createMatchResult(previous.matchLength, history) : null;
  const events: GameplayEventV1[] = [
    ...precedingEvents,
    { type: "roundResultCommitted", audience: publicAudience(), result },
  ];
  if (result.nextRound !== null) {
    events.push({
      type: "roundTransitionPrepared",
      audience: publicAudience(),
      nextRound: result.nextRound,
    });
  } else if (matchResult !== null) {
    events.push({ type: "matchCompleted", audience: publicAudience(), result: matchResult });
  }
  const state = deepFreeze<AuthoritativeGameStateV1>({
    ...previous,
    stateVersion: previous.stateVersion + 1,
    lastAcceptedCommandId: command.commandId,
    status: matchResult === null ? "inProgress" : "complete",
    players: scoredPlayers,
    round: {
      ...previous.round,
      ...roundUpdates,
      field,
      drawPile,
      specialPrivilege: null,
    },
    phase:
      matchResult === null
        ? { kind: "roundComplete", result, transitionPending: true }
        : { kind: "matchComplete", result: matchResult },
    history,
  });
  assertValidAuthoritativeState(state);
  return deepFreeze({ state, events });
}

function resolveEndOfPlay(
  previous: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  drawPile: readonly CardId[],
  precedingEvents: readonly GameplayEventV1[],
  roundUpdates: Partial<RoundStateV1> = {},
): GameplayTransitionV1 {
  const resultState = stateWithRoundUpdates(previous, players, field, drawPile, roundUpdates);
  const callerId = resultState.round.mostRecentKoiKoiCallerId;
  const result =
    callerId === null
      ? createNoScoreRoundResult(resultState)
      : (() => {
          const caller = players.find((player) => player.id === callerId);
          if (caller === undefined) throw new Error("PLAYER_INVARIANT: Koi-Koi caller missing.");
          return createScoredRoundResult(resultState, {
            kind: "endOfPlayLastKoiCaller",
            reasonCode: "END_OF_PLAY_LAST_KOI_CALLER",
            scorerId: callerId,
            activeYaku: caller.activeYaku,
            basePoints: caller.currentYakuTotal,
            tableMultiplierAtDecision: resultState.round.tableMultiplier,
            scoringMultiplier: resultState.round.tableMultiplier,
          });
        })();
  return commitRoundResult(
    previous,
    command,
    players,
    field,
    drawPile,
    result,
    precedingEvents,
    roundUpdates,
  );
}

function completeTurn(
  previous: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  drawPile: readonly CardId[],
  precedingEvents: readonly GameplayEventV1[],
  roundUpdates: Partial<RoundStateV1> = {},
): GameplayTransitionV1 {
  const bothHandsEmpty = players.every((player) => player.hand.length === 0);
  const nextPlayerId = bothHandsEmpty ? null : otherPlayer(command.actorId);
  const events: GameplayEventV1[] = [
    ...precedingEvents,
    {
      type: "turnCompleted",
      audience: publicAudience(),
      actorId: command.actorId,
      nextPlayerId,
    },
  ];
  if (bothHandsEmpty) {
    events.push({
      type: "endOfPlayReached",
      audience: publicAudience(),
      actorId: command.actorId,
      unusedDrawPileCount: drawPile.length,
    });
    return resolveEndOfPlay(
      previous,
      command,
      players,
      field,
      drawPile,
      deepFreeze(events),
      roundUpdates,
    );
  }
  return commitTransition(
    previous,
    command,
    players,
    field,
    drawPile,
    { kind: "awaitingHandPlay", playerId: otherPlayer(command.actorId) },
    deepFreeze(events),
    roundUpdates,
  );
}

function continueDrawPhase(
  state: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  players: PlayerPair<PlayerStateV1>,
  field: readonly CardId[],
  sourceDrawPile: readonly CardId[],
  precedingEvents: readonly GameplayEventV1[],
  roundUpdates: Partial<RoundStateV1> = {},
): GameplayTransitionV1 {
  const drawnCardId = sourceDrawPile[0];
  if (drawnCardId === undefined)
    throw new Error("DRAW_PILE_INVARIANT: validated draw was missing.");
  const drawPile = sourceDrawPile.slice(1);
  const events: GameplayEventV1[] = [
    ...precedingEvents,
    {
      type: "drawCardRevealed",
      audience: publicAudience(),
      actorId: command.actorId,
      cardId: drawnCardId,
      remainingDrawPileCount: drawPile.length,
    },
  ];
  const resolution = getHandPlayResolutionPreview(field, drawnCardId);
  events.push({
    type: "drawResolutionRequired",
    audience: publicAudience(),
    actorId: command.actorId,
    drawnCardId,
    resolution,
  });
  return commitTransition(
    state,
    command,
    players,
    field,
    drawPile,
    { kind: "awaitingDrawResolution", playerId: command.actorId, drawnCardId, resolution },
    deepFreeze(events),
    roundUpdates,
  );
}

function applyPlayHandCard(
  state: AuthoritativeGameStateV1,
  command: PlayHandCardCommandV1,
): GameplayTransitionV1 {
  if (state.phase.kind !== "awaitingHandPlay") {
    rejectCommand("COMMAND_NOT_ALLOWED_IN_PHASE", "playHandCard requires awaitingHandPlay.");
  }
  if (!isCardId(command.cardId)) {
    rejectCommand("CARD_ID_INVALID", "Played card must be canonical.");
  }
  if (command.targetFieldCardId !== undefined && !isCardId(command.targetFieldCardId)) {
    rejectCommand("CARD_ID_INVALID", "Capture target must be canonical.");
  }

  const actor = state.players.find((player) => player.id === command.actorId);
  if (actor === undefined || !actor.hand.includes(command.cardId)) {
    rejectCommand("HAND_CARD_NOT_OWNED", "Played card must belong to the active player's hand.");
  }
  const handInspection = inspectCapture(state.round.field, command.cardId);
  if (handInspection.matchCount === 2 && command.targetFieldCardId === undefined) {
    rejectCommand("CAPTURE_TARGET_REQUIRED", "An exact two-match hand play requires one target.");
  }
  if (handInspection.matchCount !== 2 && command.targetFieldCardId !== undefined) {
    rejectCommand(
      "CAPTURE_TARGET_NOT_ALLOWED",
      "Only an exact two-match hand play accepts a target.",
    );
  }
  if (
    command.targetFieldCardId !== undefined &&
    !handInspection.matchingFieldCardIds.includes(command.targetFieldCardId)
  ) {
    rejectCommand("CAPTURE_TARGET_ILLEGAL", "Selected hand-capture target is not legal.");
  }
  if (state.round.drawPile.length === 0) {
    rejectCommand("DRAW_PILE_EMPTY", "A complete turn requires one draw-pile card.");
  }

  const handResolution = resolveCapture(
    state.round.field,
    command.cardId,
    command.targetFieldCardId,
  );
  if (handResolution.kind === "choiceRequired") {
    throw new Error("HAND_CAPTURE_INVARIANT: validated hand target did not resolve.");
  }
  const remainingHand = actor.hand.filter((cardId) => cardId !== command.cardId);
  const actorAfterHand = updatedPlayerAfterResolution(actor, handResolution, remainingHand);
  let players = replacePlayer(state.players, command.actorId, actorAfterHand);
  const events: TurnEventV1[] = [
    {
      type: "handCardPlayed",
      audience: publicAudience(),
      actorId: command.actorId,
      cardId: command.cardId,
    },
    ...eventsForResolution(command.actorId, "hand", handResolution),
  ];

  const handYaku = performYakuCheck(state, state.players, players, command.actorId, "hand", {
    kind: "drawPhase",
  });
  players = handYaku.players;
  events.push(...handYaku.events);
  if (handYaku.decisionPhase !== null) {
    return commitTransition(
      state,
      command,
      players,
      handResolution.field,
      state.round.drawPile,
      handYaku.decisionPhase,
      deepFreeze(events),
      { firstYakuTriggerPlayerId: handYaku.firstYakuTriggerPlayerId },
    );
  }

  return continueDrawPhase(
    state,
    command,
    players,
    handResolution.field,
    state.round.drawPile,
    deepFreeze(events),
  );
}

function applyResolveDrawCard(
  state: AuthoritativeGameStateV1,
  command: ResolveDrawCardCommandV1,
): GameplayTransitionV1 {
  if (state.phase.kind !== "awaitingDrawResolution") {
    rejectCommand(
      "COMMAND_NOT_ALLOWED_IN_PHASE",
      "resolveDrawCard requires awaitingDrawResolution.",
    );
  }
  const requiresTarget = state.phase.resolution.kind === "captureChoice";
  if (requiresTarget && command.targetFieldCardId === undefined) {
    rejectCommand("CAPTURE_TARGET_REQUIRED", "An exact two-match draw requires one target.");
  }
  if (!requiresTarget && command.targetFieldCardId !== undefined) {
    rejectCommand("CAPTURE_TARGET_NOT_ALLOWED", "This draw resolution does not accept a target.");
  }
  if (command.targetFieldCardId !== undefined && !isCardId(command.targetFieldCardId)) {
    rejectCommand("CARD_ID_INVALID", "Draw-capture target must be canonical.");
  }
  if (
    state.phase.resolution.kind === "captureChoice" &&
    command.targetFieldCardId !== undefined &&
    !state.phase.resolution.matchingFieldCardIds.includes(command.targetFieldCardId)
  ) {
    rejectCommand("DRAW_CAPTURE_TARGET_ILLEGAL", "Selected draw-capture target is not legal.");
  }
  const resolution = resolveCapture(
    state.round.field,
    state.phase.drawnCardId,
    command.targetFieldCardId,
  );
  if (resolution.kind === "choiceRequired") {
    throw new Error("DRAW_RESOLUTION_INVARIANT: validated draw action did not resolve.");
  }
  const actor = state.players.find((player) => player.id === command.actorId);
  if (actor === undefined) throw new Error("PLAYER_INVARIANT: active player disappeared.");
  const updatedActor = updatedPlayerAfterResolution(actor, resolution);
  const playersAfterDraw = replacePlayer(state.players, command.actorId, updatedActor);
  const bothHandsEmpty = playersAfterDraw.every((player) => player.hand.length === 0);
  const drawYaku = performYakuCheck(
    state,
    state.players,
    playersAfterDraw,
    command.actorId,
    "draw",
    bothHandsEmpty
      ? { kind: "endOfPlay", lastActorId: command.actorId }
      : { kind: "completeTurn", lastActorId: command.actorId },
  );
  const events = [...eventsForResolution(command.actorId, "draw", resolution), ...drawYaku.events];
  if (drawYaku.decisionPhase !== null) {
    return commitTransition(
      state,
      command,
      drawYaku.players,
      resolution.field,
      state.round.drawPile,
      drawYaku.decisionPhase,
      deepFreeze(events),
      { firstYakuTriggerPlayerId: drawYaku.firstYakuTriggerPlayerId },
    );
  }
  return completeTurn(
    state,
    command,
    drawYaku.players,
    resolution.field,
    state.round.drawPile,
    deepFreeze(events),
  );
}

function decisionUsesPrivilege(state: AuthoritativeGameStateV1): boolean {
  if (state.phase.kind !== "awaitingYakuDecision") return false;
  const phase = state.phase;
  const actor = state.players.find((player) => player.id === phase.playerId);
  if (actor === undefined) return false;
  return (
    state.round.tableMultiplier === 1 &&
    state.round.specialPrivilege?.playerId === phase.playerId &&
    actor.seenYakuKeys.length === phase.context.newYaku.length
  );
}

function bankScoringMultiplier(state: AuthoritativeGameStateV1): TableMultiplier {
  return decisionUsesPrivilege(state) ? 2 : state.round.tableMultiplier;
}

function bankIsForcedUnavailable(state: AuthoritativeGameStateV1): boolean {
  if (state.phase.kind !== "awaitingYakuDecision") return false;
  return (
    state.round.isFinalScheduledRound &&
    state.round.frozenFinalRoundLeaderId === state.phase.playerId &&
    state.round.firstYakuTriggerPlayerId === state.phase.playerId &&
    bankScoringMultiplier(state) === 1
  );
}

function applyChooseYakuDecision(
  state: AuthoritativeGameStateV1,
  command: ChooseYakuDecisionCommandV1,
): GameplayTransitionV1 {
  if (state.phase.kind !== "awaitingYakuDecision") {
    rejectCommand(
      "COMMAND_NOT_ALLOWED_IN_PHASE",
      "chooseYakuDecision requires awaitingYakuDecision.",
    );
  }
  if (command.choice !== "bank" && command.choice !== "koiKoi") {
    rejectCommand("YAKU_DECISION_INVALID", "Yaku decision must be Bank or Koi-Koi.");
  }
  const privilegeUsed = decisionUsesPrivilege(state);
  const events: GameplayEventV1[] = [
    {
      type: "yakuDecisionChosen",
      audience: publicAudience(),
      actorId: command.actorId,
      choice: command.choice,
      privilegeUsed,
    },
  ];
  if (command.choice === "bank") {
    if (bankIsForcedUnavailable(state)) {
      rejectCommand(
        "BANK_FORCED_KOI_KOI",
        "The protected final-round leader must call Koi-Koi on the round's first trigger.",
      );
    }
    const actor = state.players.find((player) => player.id === command.actorId);
    if (actor === undefined) throw new Error("PLAYER_INVARIANT: decision actor missing.");
    const scoringMultiplier = bankScoringMultiplier(state);
    const result = createScoredRoundResult(state, {
      kind: "bankedScore",
      reasonCode: "BANKED_SCORE",
      scorerId: command.actorId,
      activeYaku: state.phase.context.activeYaku,
      basePoints: state.phase.context.currentYakuTotal,
      tableMultiplierAtDecision: state.round.tableMultiplier,
      scoringMultiplier,
    });
    return commitRoundResult(
      state,
      command,
      state.players,
      state.round.field,
      state.round.drawPile,
      result,
      deepFreeze(events),
    );
  }

  const previousTableMultiplier = state.round.tableMultiplier;
  const currentTableMultiplier = (
    privilegeUsed ? 3 : Math.min(previousTableMultiplier + 1, 4)
  ) as TableMultiplier;
  events.push({
    type: "koiKoiCalled",
    audience: publicAudience(),
    actorId: command.actorId,
    previousTableMultiplier,
    currentTableMultiplier,
    privilegeUsed,
  });
  const roundUpdates: Partial<RoundStateV1> = {
    tableMultiplier: currentTableMultiplier,
    mostRecentKoiKoiCallerId: command.actorId,
    specialPrivilege: null,
  };
  if (state.phase.context.resume.kind === "drawPhase") {
    return continueDrawPhase(
      state,
      command,
      state.players,
      state.round.field,
      state.round.drawPile,
      deepFreeze(events),
      roundUpdates,
    );
  }
  return completeTurn(
    state,
    command,
    state.players,
    state.round.field,
    state.round.drawPile,
    deepFreeze(events),
    roundUpdates,
  );
}

export function applyGameplayCommand(
  state: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
): GameplayTransitionV1 {
  assertValidAuthoritativeState(state);
  if (
    command.type !== "playHandCard" &&
    command.type !== "resolveDrawCard" &&
    command.type !== "chooseYakuDecision"
  ) {
    rejectCommand("COMMAND_TYPE_INVALID", "Unsupported gameplay command type.");
  }
  validateCommandBase(state, command);
  if (command.type === "playHandCard") return applyPlayHandCard(state, command);
  if (command.type === "resolveDrawCard") return applyResolveDrawCard(state, command);
  return applyChooseYakuDecision(state, command);
}

export function getLegalActions(
  state: AuthoritativeGameStateV1,
  requestingPlayerId: PlayerId,
): readonly LegalActionV1[] {
  if (!PLAYER_IDS.includes(requestingPlayerId) || activePlayerId(state) !== requestingPlayerId) {
    return Object.freeze([]);
  }
  if (state.phase.kind === "awaitingHandPlay") {
    const player = state.players.find((candidate) => candidate.id === requestingPlayerId);
    if (player === undefined) return Object.freeze([]);
    const actions = player.hand.flatMap((cardId): readonly LegalActionV1[] => {
      const inspection = inspectCapture(state.round.field, cardId);
      const resolution = getHandPlayResolutionPreview(state.round.field, cardId);
      return inspection.matchCount === 2
        ? inspection.matchingFieldCardIds.map((targetFieldCardId) => ({
            type: "playHandCard" as const,
            actorId: requestingPlayerId,
            cardId,
            targetFieldCardId,
            resolution,
          }))
        : [{ type: "playHandCard" as const, actorId: requestingPlayerId, cardId, resolution }];
    });
    return deepFreeze(actions);
  }
  if (state.phase.kind === "awaitingDrawResolution") {
    const phase = state.phase;
    const createAction = (targetFieldCardId?: CardId): LegalActionV1 =>
      targetFieldCardId === undefined
        ? {
            type: "resolveDrawCard",
            actorId: requestingPlayerId,
            drawnCardId: phase.drawnCardId,
            resolution: phase.resolution,
          }
        : {
            type: "resolveDrawCard",
            actorId: requestingPlayerId,
            drawnCardId: phase.drawnCardId,
            targetFieldCardId,
            resolution: phase.resolution,
          };
    return deepFreeze(
      phase.resolution.kind === "captureChoice"
        ? phase.resolution.matchingFieldCardIds.map((targetFieldCardId) =>
            createAction(targetFieldCardId),
          )
        : [createAction()],
    );
  }
  if (state.phase.kind === "awaitingYakuDecision") {
    const actions: LegalActionV1[] = [];
    if (!bankIsForcedUnavailable(state)) {
      const scoringMultiplier = bankScoringMultiplier(state);
      actions.push({
        type: "chooseYakuDecision",
        actorId: requestingPlayerId,
        choice: "bank",
        tableMultiplierAtDecision: state.round.tableMultiplier,
        scoringMultiplier,
        awardedPoints: state.phase.context.currentYakuTotal * scoringMultiplier,
      });
    }
    const resultingTableMultiplier = (
      decisionUsesPrivilege(state) ? 3 : Math.min(state.round.tableMultiplier + 1, 4)
    ) as TableMultiplier;
    actions.push({
      type: "chooseYakuDecision",
      actorId: requestingPlayerId,
      choice: "koiKoi",
      currentTableMultiplier: state.round.tableMultiplier,
      resultingTableMultiplier,
    });
    return deepFreeze(actions);
  }
  return Object.freeze([]);
}
