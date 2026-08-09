import { getLegalActions } from "../rules/turn";
import type { CardId } from "../cards/catalog";
import {
  canonicalStringifyV1,
  hashCanonicalV1,
  type CanonicalHashV1,
} from "../serialization/canonical-json";
import { deepFreeze } from "./freeze";
import type {
  ActiveYakuV1,
  AuthoritativeGameStateV1,
  EventAudience,
  GameplayEventV1,
  LegalActionV1,
  MatchResultV1,
  MatchLength,
  PlayerId,
  PlayerPair,
  PointDeltas,
  RoundResultV1,
  SetupEventV1,
  SpecialPrivilegeStateV1,
  TableMultiplier,
  YakuDecisionContextV1,
  RULES_VERSION,
} from "./types";
import { PLAYER_IDS } from "./types";
import { assertValidAuthoritativeState } from "./validation";
import type { MonthNumber } from "../cards/months";

export const PUBLIC_STATE_FORMAT_VERSION = 1 as const;
export const PLAYER_OBSERVATION_FORMAT_VERSION = 1 as const;

export interface PublicPlayerStateV1 {
  readonly id: PlayerId;
  readonly score: number;
  readonly handCount: number;
  readonly captured: readonly CardId[];
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly currentYakuTotal: number;
}

export interface PublicRoundStateV1 {
  readonly roundNumber: number;
  readonly scheduledMonth: MonthNumber;
  readonly isFinalScheduledRound: boolean;
  readonly starterId: PlayerId;
  readonly field: readonly CardId[];
  readonly drawPileCount: number;
  readonly tableMultiplier: TableMultiplier;
  readonly mostRecentKoiKoiCallerId: PlayerId | null;
  readonly firstYakuTriggerPlayerId: PlayerId | null;
  readonly specialPrivilege: SpecialPrivilegeStateV1 | null;
  readonly frozenFinalRoundLeaderId: PlayerId | null;
}

export type PublicPhaseV1 =
  | { readonly kind: "awaitingHandPlay"; readonly playerId: PlayerId }
  | {
      readonly kind: "awaitingDrawCapture";
      readonly playerId: PlayerId;
      readonly drawnCardId: CardId;
      readonly targetFieldCardIds: readonly [CardId, CardId];
    }
  | {
      readonly kind: "awaitingYakuDecision";
      readonly playerId: PlayerId;
      readonly context: YakuDecisionContextV1;
    }
  | {
      readonly kind: "roundComplete";
      readonly result: RoundResultV1;
      readonly transitionPending: true;
    }
  | { readonly kind: "matchComplete"; readonly result: MatchResultV1 };

export interface PublicGameStateV1 {
  readonly formatVersion: typeof PUBLIC_STATE_FORMAT_VERSION;
  readonly rulesVersion: typeof RULES_VERSION;
  readonly stateVersion: number;
  readonly matchId: string;
  readonly matchLength: MatchLength;
  readonly status: "inProgress" | "complete";
  readonly players: PlayerPair<PublicPlayerStateV1>;
  readonly round: PublicRoundStateV1;
  readonly phase: PublicPhaseV1;
  readonly history: readonly RoundResultV1[];
}

export interface PlayerObservationV1 {
  readonly formatVersion: typeof PLAYER_OBSERVATION_FORMAT_VERSION;
  readonly playerId: PlayerId;
  readonly publicState: PublicGameStateV1;
  readonly ownHand: readonly CardId[];
  readonly legalActions: readonly LegalActionV1[];
}

type WithoutAudience<T> = T extends { readonly audience: EventAudience }
  ? Omit<T, "audience">
  : never;
type HiddenSetupEventV1 = Extract<
  SetupEventV1,
  { readonly type: "initialHandDealt" | "drawPileOrdered" | "luckyHandDetected" }
>;
type PublicSetupEventV1 = Exclude<SetupEventV1, HiddenSetupEventV1>;
type PrivatePlayerSetupEventV1 = Extract<SetupEventV1, { readonly type: "initialHandDealt" }>;

const PUBLIC_PROJECTABLE_EVENT_TYPES = new Set<string>([
  "matchStarted",
  "starterSelected",
  "roundStarted",
  "cardsDealt",
  "initialFieldCancellationDetected",
  "automaticRoundResultCommitted",
  "luckyHandEvidenceRevealed",
  "roundReady",
  "handCardPlayed",
  "cardPlacedOnField",
  "captureStarted",
  "cardsCaptured",
  "drawCardRevealed",
  "drawCaptureChoiceRequired",
  "yakuCompleted",
  "yakuValueChanged",
  "yakuDecisionRequired",
  "turnCompleted",
  "endOfPlayReached",
  "yakuDecisionChosen",
  "koiKoiCalled",
  "roundResultCommitted",
  "roundTransitionPrepared",
  "matchCompleted",
]);

export type PublicGameEventV1 = WithoutAudience<PublicSetupEventV1 | GameplayEventV1>;
export type PlayerVisibleGameEventV1 =
  PublicGameEventV1 | WithoutAudience<PrivatePlayerSetupEventV1>;
export type EngineEventV1 = SetupEventV1 | GameplayEventV1;

export interface ProjectionValidationIssue {
  readonly code: "PUBLIC_PROJECTION_MISMATCH" | "PLAYER_OBSERVATION_MISMATCH";
  readonly message: string;
}

function assertPlayerId(playerId: PlayerId): void {
  if (!PLAYER_IDS.includes(playerId)) throw new Error(`PLAYER_ID_INVALID: ${playerId}`);
}

function stripAudience(event: EngineEventV1): Omit<EngineEventV1, "audience"> {
  const projected: Record<string, unknown> = { ...event };
  delete projected["audience"];
  return deepFreeze(projected) as Omit<EngineEventV1, "audience">;
}

function isPublicProjectableEvent(event: EngineEventV1): boolean {
  return event.audience.kind === "public" && PUBLIC_PROJECTABLE_EVENT_TYPES.has(event.type);
}

export function projectPublicState(state: AuthoritativeGameStateV1): PublicGameStateV1 {
  assertValidAuthoritativeState(state);
  return deepFreeze({
    formatVersion: PUBLIC_STATE_FORMAT_VERSION,
    rulesVersion: state.rulesVersion,
    stateVersion: state.stateVersion,
    matchId: state.matchId,
    matchLength: state.matchLength,
    status: state.status,
    players: state.players.map((player) => ({
      id: player.id,
      score: player.score,
      handCount: player.hand.length,
      captured: player.captured,
      activeYaku: player.activeYaku,
      currentYakuTotal: player.currentYakuTotal,
    })) as unknown as PlayerPair<PublicPlayerStateV1>,
    round: {
      roundNumber: state.round.roundNumber,
      scheduledMonth: state.round.scheduledMonth,
      isFinalScheduledRound: state.round.isFinalScheduledRound,
      starterId: state.round.starterId,
      field: state.round.field,
      drawPileCount: state.round.drawPile.length,
      tableMultiplier: state.round.tableMultiplier,
      mostRecentKoiKoiCallerId: state.round.mostRecentKoiKoiCallerId,
      firstYakuTriggerPlayerId: state.round.firstYakuTriggerPlayerId,
      specialPrivilege: state.round.specialPrivilege,
      frozenFinalRoundLeaderId: state.round.frozenFinalRoundLeaderId,
    },
    phase: state.phase,
    history: state.history,
  });
}

export function projectPlayerObservation(
  state: AuthoritativeGameStateV1,
  playerId: PlayerId,
): PlayerObservationV1 {
  assertPlayerId(playerId);
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new Error(`PLAYER_ID_INVALID: ${playerId}`);
  return deepFreeze({
    formatVersion: PLAYER_OBSERVATION_FORMAT_VERSION,
    playerId,
    publicState: projectPublicState(state),
    ownHand: player.hand,
    legalActions: getLegalActions(state, playerId),
  });
}

export function projectPublicEvents(
  events: readonly EngineEventV1[],
): readonly PublicGameEventV1[] {
  return deepFreeze(
    events
      .filter(isPublicProjectableEvent)
      .map((event) => stripAudience(event) as PublicGameEventV1),
  );
}

export function projectEventsForPlayer(
  events: readonly EngineEventV1[],
  playerId: PlayerId,
): readonly PlayerVisibleGameEventV1[] {
  assertPlayerId(playerId);
  return deepFreeze(
    events
      .filter(
        (event) =>
          isPublicProjectableEvent(event) ||
          (event.type === "initialHandDealt" &&
            event.audience.kind === "private" &&
            event.audience.playerId === playerId &&
            event.playerId === playerId),
      )
      .map((event) => stripAudience(event) as PlayerVisibleGameEventV1),
  );
}

export function validatePublicProjection(
  state: AuthoritativeGameStateV1,
  projection: PublicGameStateV1,
): readonly ProjectionValidationIssue[] {
  const expected = projectPublicState(state);
  return canonicalStringifyV1(expected) === canonicalStringifyV1(projection)
    ? deepFreeze([])
    : deepFreeze([
        {
          code: "PUBLIC_PROJECTION_MISMATCH" as const,
          message: "Public state must exactly match the authoritative projection.",
        },
      ]);
}

export function validatePlayerObservation(
  state: AuthoritativeGameStateV1,
  observation: PlayerObservationV1,
): readonly ProjectionValidationIssue[] {
  const expected = projectPlayerObservation(state, observation.playerId);
  return canonicalStringifyV1(expected) === canonicalStringifyV1(observation)
    ? deepFreeze([])
    : deepFreeze([
        {
          code: "PLAYER_OBSERVATION_MISMATCH" as const,
          message: "Player observation must exactly match the permitted authoritative projection.",
        },
      ]);
}

export function hashPublicStateV1(
  state: AuthoritativeGameStateV1 | PublicGameStateV1,
): CanonicalHashV1 {
  return hashCanonicalV1(
    "players" in state && "lastAcceptedCommandId" in state ? projectPublicState(state) : state,
  );
}

export function renderStateForDiagnostics(state: PublicGameStateV1 | PlayerObservationV1): string {
  return canonicalStringifyV1(state);
}

export function publicScores(state: PublicGameStateV1): PointDeltas {
  return deepFreeze({
    "player-a": state.players[0].score,
    "player-b": state.players[1].score,
  });
}
