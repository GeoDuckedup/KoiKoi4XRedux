import { CARD_IDS, type CardId } from "../cards/catalog";
import { shuffleWithRandomSource } from "../random/shuffle";
import { restoreRandomSource } from "../random/xoshiro128ss";
import { rejectCommand } from "../state/errors";
import { deepFreeze } from "../state/freeze";
import { markTrustedValidatedEngineState } from "../state/trusted-engine-state-cache";
import {
  RULES_VERSION,
  type AdvanceRoundCommandV1,
  type AuthoritativeGameStateV1,
  type AutomaticOpeningResult,
  type EngineCheckpointV1,
  type MatchResultV1,
  type PlayerId,
  type PlayerPair,
  type PlayerStateV1,
  type RoundAdvanceTransitionV1,
  type RoundEventV1,
  type RoundResultV1,
  type RoundStateV1,
  type SetupEventV1,
} from "../state/types";
import { assertValidAuthoritativeState } from "../state/validation";
import { evaluateOpeningOutcome } from "./opening-outcomes";
import { dealOrderedDeck, type DealtZonesV1 } from "./round-setup";
import {
  createAutomaticRoundResult,
  createMatchResult,
  frozenLeader,
  scorePair,
} from "./round-results";

function publicAudience() {
  return Object.freeze({ kind: "public" as const });
}

function serverAudience() {
  return Object.freeze({ kind: "serverOnly" as const });
}

function privateAudience(playerId: PlayerId) {
  return Object.freeze({ kind: "private" as const, playerId });
}

function validateAdvanceCommand(
  state: AuthoritativeGameStateV1,
  command: AdvanceRoundCommandV1,
): Extract<AuthoritativeGameStateV1["phase"], { readonly kind: "roundComplete" }> {
  if (command.type !== "advanceRound") {
    rejectCommand("COMMAND_TYPE_INVALID", "Unsupported round-advance command type.");
  }
  if (typeof command.commandId !== "string" || command.commandId.trim().length === 0) {
    rejectCommand("COMMAND_ID_INVALID", "commandId must be nonempty.");
  }
  if (command.commandId === state.lastAcceptedCommandId) {
    rejectCommand("COMMAND_ID_REUSED", "The most recently accepted command ID cannot be reused.");
  }
  if (command.matchId !== state.matchId) {
    rejectCommand("MATCH_ID_MISMATCH", "Command matchId does not identify this state.");
  }
  if (command.expectedStateVersion !== state.stateVersion) {
    rejectCommand("STATE_VERSION_MISMATCH", "Command expectedStateVersion is stale or invalid.");
  }
  if (state.phase.kind !== "roundComplete" || state.phase.result.nextRound === null) {
    rejectCommand("ROUND_ADVANCE_NOT_ALLOWED", "Only a completed nonfinal round can advance.");
  }
  return state.phase;
}

function resetPlayer(
  previous: PlayerStateV1,
  hand: readonly CardId[],
  automaticResult: RoundResultV1 | null,
): PlayerStateV1 {
  return deepFreeze({
    id: previous.id,
    score: previous.score + (automaticResult?.pointDeltas[previous.id] ?? 0),
    hand,
    captured: [],
    seenYakuKeys: [],
    activeYaku: [],
    currentYakuTotal: 0,
  });
}

function setupEvents(
  round: RoundStateV1,
  zones: DealtZonesV1,
  outcome: AutomaticOpeningResult | null,
  result: RoundResultV1 | null,
  matchResult: MatchResultV1 | null,
): readonly (SetupEventV1 | RoundEventV1)[] {
  const events: (SetupEventV1 | RoundEventV1)[] = [
    {
      type: "roundStarted",
      audience: publicAudience(),
      roundNumber: round.roundNumber,
      scheduledMonth: round.scheduledMonth,
      starterId: round.starterId,
    },
    {
      type: "cardsDealt",
      audience: publicAudience(),
      field: zones.field,
      handCounts: { "player-a": 8, "player-b": 8 },
      drawPileCount: 24,
    },
    {
      type: "initialHandDealt",
      audience: privateAudience("player-a"),
      playerId: "player-a",
      cardIds: zones.hands[0],
    },
    {
      type: "initialHandDealt",
      audience: privateAudience("player-b"),
      playerId: "player-b",
      cardIds: zones.hands[1],
    },
    { type: "drawPileOrdered", audience: serverAudience(), cardIds: zones.drawPile },
  ];
  if (outcome === null || result === null) {
    events.push({
      type: "roundReady",
      audience: publicAudience(),
      activePlayerId: round.starterId,
    });
    return deepFreeze(events);
  }
  if (outcome.kind === "fieldCancellation") {
    events.push({
      type: "initialFieldCancellationDetected",
      audience: publicAudience(),
      completeFieldMonths: outcome.completeFieldMonths,
    });
  } else {
    for (const evidence of outcome.evidence) {
      events.push({
        type: "luckyHandDetected",
        audience: serverAudience(),
        playerId: evidence.playerId,
        qualification: evidence.qualification,
      });
    }
  }
  events.push({
    type: "automaticRoundResultCommitted",
    audience: publicAudience(),
    resultKind: outcome.kind,
    reasonCode: outcome.reasonCode,
    pointDeltas: outcome.pointDeltas,
  });
  if (outcome.kind !== "fieldCancellation") {
    events.push({
      type: "luckyHandEvidenceRevealed",
      audience: publicAudience(),
      evidence: outcome.evidence,
    });
  }
  events.push({ type: "roundResultCommitted", audience: publicAudience(), result });
  if (result.nextRound !== null) {
    events.push({
      type: "roundTransitionPrepared",
      audience: publicAudience(),
      nextRound: result.nextRound,
    });
  } else if (matchResult !== null) {
    events.push({ type: "matchCompleted", audience: publicAudience(), result: matchResult });
  }
  return deepFreeze(events);
}

function buildAdvancedRound(
  state: AuthoritativeGameStateV1,
  command: AdvanceRoundCommandV1,
  orderedDeck: readonly string[],
): {
  readonly state: AuthoritativeGameStateV1;
  readonly events: readonly (SetupEventV1 | RoundEventV1)[];
} {
  const completedPhase = validateAdvanceCommand(state, command);
  const plan = completedPhase.result.nextRound;
  if (plan === null) throw new Error("ROUND_ADVANCE_INVARIANT: validated plan disappeared.");
  const zones = dealOrderedDeck(orderedDeck);
  const scoresBefore = scorePair(state);
  const round = deepFreeze<RoundStateV1>({
    roundNumber: plan.roundNumber,
    scheduledMonth: plan.scheduledMonth,
    isFinalScheduledRound: plan.roundNumber === state.matchLength,
    starterId: plan.starterId,
    field: zones.field,
    drawPile: zones.drawPile,
    tableMultiplier: 1,
    mostRecentKoiKoiCallerId: null,
    firstYakuTriggerPlayerId: null,
    specialPrivilege: plan.specialPrivilege,
    frozenFinalRoundLeaderId:
      plan.roundNumber === state.matchLength ? frozenLeader(scoresBefore) : null,
    completedYakuFormations: [],
  });
  const outcome = evaluateOpeningOutcome(zones.field, zones.hands);
  const automaticResult =
    outcome === null
      ? null
      : createAutomaticRoundResult(
          { matchLength: state.matchLength, round },
          outcome,
          scoresBefore,
        );
  const committedRound =
    automaticResult === null ? round : deepFreeze({ ...round, specialPrivilege: null });
  const history = deepFreeze(
    automaticResult === null ? [...state.history] : [...state.history, automaticResult],
  );
  const matchResult =
    automaticResult?.nextRound === null ? createMatchResult(state.matchLength, history) : null;
  const players = deepFreeze<PlayerPair<PlayerStateV1>>([
    resetPlayer(state.players[0], zones.hands[0], automaticResult),
    resetPlayer(state.players[1], zones.hands[1], automaticResult),
  ]);
  const nextState = deepFreeze<AuthoritativeGameStateV1>({
    formatVersion: 1,
    rulesVersion: RULES_VERSION,
    stateVersion: state.stateVersion + 1,
    lastAcceptedCommandId: command.commandId,
    matchId: state.matchId,
    matchLength: state.matchLength,
    status: matchResult === null ? "inProgress" : "complete",
    players,
    round: committedRound,
    phase:
      automaticResult === null
        ? { kind: "awaitingHandPlay", playerId: plan.starterId }
        : matchResult === null
          ? { kind: "roundComplete", result: automaticResult, transitionPending: true }
          : { kind: "matchComplete", result: matchResult },
    history,
  });
  assertValidAuthoritativeState(nextState);
  markTrustedValidatedEngineState(nextState);
  return deepFreeze({
    state: nextState,
    events: setupEvents(committedRound, zones, outcome, automaticResult, matchResult),
  });
}

export function advanceRound(
  state: AuthoritativeGameStateV1,
  command: AdvanceRoundCommandV1,
  checkpoint: EngineCheckpointV1,
): RoundAdvanceTransitionV1 {
  assertValidAuthoritativeState(state);
  validateAdvanceCommand(state, command);
  if (checkpoint.version !== 1) {
    rejectCommand("CHECKPOINT_VERSION_INVALID", "Unsupported engine checkpoint version.");
  }
  if (checkpoint.matchId !== state.matchId) {
    rejectCommand("CHECKPOINT_MATCH_MISMATCH", "Checkpoint does not belong to this match.");
  }
  const random = restoreRandomSource(checkpoint.rng);
  const orderedDeck = shuffleWithRandomSource(CARD_IDS, random);
  const advanced = buildAdvancedRound(state, command, orderedDeck);
  return deepFreeze({
    ...advanced,
    checkpoint: { version: 1, matchId: state.matchId, rng: random.snapshot() },
  });
}

export function advanceRoundFromOrderedDeck(
  state: AuthoritativeGameStateV1,
  command: AdvanceRoundCommandV1,
  orderedDeck: readonly string[],
): {
  readonly state: AuthoritativeGameStateV1;
  readonly events: readonly (SetupEventV1 | RoundEventV1)[];
} {
  assertValidAuthoritativeState(state);
  return buildAdvancedRound(state, command, orderedDeck);
}
