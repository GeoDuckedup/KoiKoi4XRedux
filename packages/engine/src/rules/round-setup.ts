import { CARD_IDS, isCardId, type CardId } from "../cards/catalog";
import type { RandomSource } from "../random/types";
import { shuffleWithRandomSource } from "../random/shuffle";
import { deepFreeze } from "../state/freeze";
import {
  PLAYER_IDS,
  RULES_VERSION,
  MATCH_LENGTHS,
  type AuthoritativeGameStateV1,
  type AutomaticOpeningResult,
  type EngineCheckpointV1,
  type EnginePhaseV1,
  type EngineTransitionV1,
  type PlayerId,
  type PlayerPair,
  type PlayerStateV1,
  type SetupEventV1,
  type StartMatchCommandV1,
} from "../state/types";
import { assertValidInitialSetupState } from "../state/validation";
import { evaluateOpeningOutcome } from "./opening-outcomes";

export const DEAL_LAYOUT_V1 = "slices-8-8-8-24-v1" as const;

export interface DealtZonesV1 {
  readonly hands: PlayerPair<readonly CardId[]>;
  readonly field: readonly CardId[];
  readonly drawPile: readonly CardId[];
}

function validateStartMatchCommand(command: StartMatchCommandV1): void {
  if (command.type !== "startMatch") {
    throw new Error("START_MATCH_INVALID: unsupported command type.");
  }
  if (command.commandId.trim().length === 0 || command.matchId.trim().length === 0) {
    throw new Error("START_MATCH_INVALID: commandId and matchId must be nonempty.");
  }
  if (command.expectedStateVersion !== 0) {
    throw new Error("STATE_VERSION_INVALID: startMatch expects state version 0.");
  }
  if (!MATCH_LENGTHS.includes(command.matchLength)) {
    throw new Error("MATCH_LENGTH_INVALID: match length must be 3, 6, or 12.");
  }
  if (
    command.starterPolicy.kind !== "chooseWithRng" &&
    (command.starterPolicy.kind !== "provided" ||
      !PLAYER_IDS.includes(command.starterPolicy.playerId))
  ) {
    throw new Error("STARTER_INVALID: starter policy must select a canonical player.");
  }
}

function validateOrderedDeck(
  orderedDeck: readonly string[],
): asserts orderedDeck is readonly CardId[] {
  if (orderedDeck.length !== CARD_IDS.length) {
    throw new Error(`DEAL_DECK_INVALID: expected 48 cards, received ${orderedDeck.length}.`);
  }
  const seen = new Set<string>();
  for (const cardId of orderedDeck) {
    if (!isCardId(cardId)) throw new Error(`DEAL_DECK_INVALID: unknown CardId ${cardId}.`);
    if (seen.has(cardId)) throw new Error(`DEAL_DECK_INVALID: duplicate CardId ${cardId}.`);
    seen.add(cardId);
  }
}

export function dealOrderedDeck(orderedDeck: readonly string[]): DealtZonesV1 {
  validateOrderedDeck(orderedDeck);
  return deepFreeze({
    hands: [orderedDeck.slice(0, 8), orderedDeck.slice(8, 16)],
    field: orderedDeck.slice(16, 24),
    drawPile: orderedDeck.slice(24),
  });
}

function publicAudience() {
  return Object.freeze({ kind: "public" as const });
}

function serverAudience() {
  return Object.freeze({ kind: "serverOnly" as const });
}

function privateAudience(playerId: PlayerId) {
  return Object.freeze({ kind: "private" as const, playerId });
}

function eventSequence(
  command: StartMatchCommandV1,
  starterId: PlayerId,
  zones: DealtZonesV1,
  outcome: AutomaticOpeningResult | null,
): readonly SetupEventV1[] {
  const events: SetupEventV1[] = [
    {
      type: "matchStarted",
      audience: publicAudience(),
      matchId: command.matchId,
      matchLength: command.matchLength,
    },
    { type: "starterSelected", audience: publicAudience(), starterId },
    {
      type: "roundStarted",
      audience: publicAudience(),
      roundNumber: 1,
      scheduledMonth: 1,
      starterId,
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
    {
      type: "drawPileOrdered",
      audience: serverAudience(),
      cardIds: zones.drawPile,
    },
  ];

  if (outcome === null) {
    events.push({
      type: "roundReady",
      audience: publicAudience(),
      activePlayerId: starterId,
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
    for (const luckyEvidence of outcome.evidence) {
      events.push({
        type: "luckyHandDetected",
        audience: serverAudience(),
        playerId: luckyEvidence.playerId,
        qualification: luckyEvidence.qualification,
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
  if (outcome.kind === "luckyWin" || outcome.kind === "bothLuckyDraw") {
    events.push({
      type: "luckyHandEvidenceRevealed",
      audience: publicAudience(),
      evidence: outcome.evidence,
    });
  }
  return deepFreeze(events);
}

function phaseForOutcome(
  starterId: PlayerId,
  outcome: AutomaticOpeningResult | null,
): EnginePhaseV1 {
  return outcome === null
    ? deepFreeze({ kind: "awaitingHandPlay", playerId: starterId })
    : deepFreeze({ kind: "roundComplete", result: outcome, transitionPending: true });
}

function playerState(
  playerId: PlayerId,
  hand: readonly CardId[],
  outcome: AutomaticOpeningResult | null,
): PlayerStateV1 {
  const score = outcome?.kind === "luckyWin" ? outcome.pointDeltas[playerId] : 0;
  return deepFreeze({
    id: playerId,
    score,
    hand: [...hand],
    captured: [],
    seenYakuKeys: [],
    activeYaku: [],
    currentYakuTotal: 0,
  });
}

function buildInitialState(
  command: StartMatchCommandV1,
  orderedDeck: readonly string[],
  starterId: PlayerId,
): { readonly state: AuthoritativeGameStateV1; readonly events: readonly SetupEventV1[] } {
  validateStartMatchCommand(command);
  if (!PLAYER_IDS.includes(starterId)) {
    throw new Error("STARTER_INVALID: starter must be a canonical player.");
  }
  if (command.starterPolicy.kind === "provided" && command.starterPolicy.playerId !== starterId) {
    throw new Error("STARTER_INVALID: provided starter policy and ordered-deck starter disagree.");
  }

  const zones = dealOrderedDeck(orderedDeck);
  const outcome = evaluateOpeningOutcome(zones.field, zones.hands);
  const state = deepFreeze<AuthoritativeGameStateV1>({
    formatVersion: 1,
    rulesVersion: RULES_VERSION,
    stateVersion: 1,
    lastAcceptedCommandId: command.commandId,
    matchId: command.matchId,
    matchLength: command.matchLength,
    status: "inProgress",
    players: [
      playerState("player-a", zones.hands[0], outcome),
      playerState("player-b", zones.hands[1], outcome),
    ],
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId,
      field: zones.field,
      drawPile: zones.drawPile,
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: null,
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
    },
    phase: phaseForOutcome(starterId, outcome),
    history: [],
  });
  assertValidInitialSetupState(state);
  return deepFreeze({ state, events: eventSequence(command, starterId, zones, outcome) });
}

export function startMatch(command: StartMatchCommandV1, random: RandomSource): EngineTransitionV1 {
  validateStartMatchCommand(command);
  const shuffledDeck = shuffleWithRandomSource(CARD_IDS, random);
  const starterId =
    command.starterPolicy.kind === "provided"
      ? command.starterPolicy.playerId
      : (PLAYER_IDS[random.nextInt(PLAYER_IDS.length)] ?? PLAYER_IDS[0]);
  const setup = buildInitialState(command, shuffledDeck, starterId);
  const checkpoint: EngineCheckpointV1 = deepFreeze({ version: 1, rng: random.snapshot() });
  return deepFreeze({ ...setup, checkpoint });
}

export function startMatchFromOrderedDeck(
  command: StartMatchCommandV1,
  orderedDeck: readonly string[],
  starterId: PlayerId,
): { readonly state: AuthoritativeGameStateV1; readonly events: readonly SetupEventV1[] } {
  if (command.starterPolicy.kind !== "provided") {
    throw new Error(
      "STARTER_POLICY_INVALID: ordered-deck setup requires an explicitly provided starter.",
    );
  }
  return buildInitialState(command, orderedDeck, starterId);
}
