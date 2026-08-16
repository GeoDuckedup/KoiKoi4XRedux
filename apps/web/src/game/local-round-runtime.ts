import {
  applyGameplayCommand,
  advanceRound,
  createSeededRandomSource,
  deepFreeze,
  projectPlayerObservation,
  projectPublicEvents,
  startMatch,
  assertValidAuthoritativeState,
  validateRngSnapshot,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type GameplayCommandV1,
  type MatchLength,
  type PlayerId,
  type PlayerObservationV1,
  type PublicGameEventV1,
} from "@koikoi4x/engine";

import type { InputCommandIntentV1, InteractionSourceV1 } from "../presentation/input/types";
import { createInteractionSourceFromObservation } from "./observation-presentation";

export const PHASE_3B_LOCAL_SEED = "00000000000000000000000000000003" as const;
/** @deprecated Use PHASE_3B_LOCAL_SEED for the deterministic vertical-slice deal. */
export const PHASE_3A_LOCAL_SEED = PHASE_3B_LOCAL_SEED;
export const PHASE_3B_MATCH_ID = "phase3b-local-round" as const;
/** @deprecated Use PHASE_3B_MATCH_ID. */
export const PHASE_3A_MATCH_ID = PHASE_3B_MATCH_ID;

/**
 * The production initial match keeps the locked Phase 3B seed. Every explicit
 * fresh match/rematch receives a distinct but reproducible valid engine seed.
 */
export function createFreshLocalMatchSeed(restartSequence: number): string {
  if (!Number.isSafeInteger(restartSequence) || restartSequence < 1) {
    throw new Error(
      "LOCAL_MATCH_SEED_SEQUENCE_INVALID: restart sequence must be a positive integer.",
    );
  }
  return (BigInt(restartSequence) + 3n).toString(16).padStart(32, "0");
}

/** A rematch retains its completed authoritative format; a fresh match uses Options. */
export function resolveFreshLocalMatchLength(
  selectedMatchLength: MatchLength,
  completedMatchLength: MatchLength | null = null,
): MatchLength {
  return completedMatchLength ?? selectedMatchLength;
}

export interface LocalRoundTransitionV1 {
  readonly after: PlayerObservationV1;
  readonly before: PlayerObservationV1;
  readonly events: readonly PublicGameEventV1[];
  readonly handoffPlayerId: PlayerId | null;
  readonly roundComplete: boolean;
}

export interface LocalRoundRuntimeV1 {
  readonly checkpoint: EngineCheckpointV1;
  readonly state: AuthoritativeGameStateV1;
  readonly viewerId: PlayerId;
  createSource: () => InteractionSourceV1;
  advanceRound: () => LocalRoundTransitionV1;
  observe: () => PlayerObservationV1;
  submit: (intent: InputCommandIntentV1) => LocalRoundTransitionV1;
  switchViewer: (playerId: PlayerId) => PlayerObservationV1;
  snapshot: () => LocalRoundSnapshotV1;
}

/** The complete private engine checkpoint required to resume a local match. */
export interface LocalRoundSnapshotV1 {
  readonly checkpoint: EngineCheckpointV1;
  readonly state: AuthoritativeGameStateV1;
}

/** Input sources only need replacement when their observation scope advances. */
export function shouldReplaceLocalInteractionSource(input: {
  readonly afterStateVersion: number;
  readonly afterViewerId: PlayerId;
  readonly beforeStateVersion: number;
  readonly beforeViewerId: PlayerId;
}): boolean {
  return (
    input.beforeViewerId !== input.afterViewerId ||
    input.beforeStateVersion !== input.afterStateVersion
  );
}

function commandFromIntent(intent: InputCommandIntentV1, commandId: string): GameplayCommandV1 {
  const base = {
    commandId,
    matchId: intent.matchId,
    actorId: intent.actorId,
    expectedStateVersion: intent.expectedStateVersion,
  };
  if (intent.action.type === "playHandCard") {
    return deepFreeze({
      ...base,
      type: "playHandCard" as const,
      cardId: intent.action.cardId,
      ...(intent.action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: intent.action.targetFieldCardId }),
    });
  }
  if (intent.action.type === "resolveDrawCard") {
    return deepFreeze({
      ...base,
      type: "resolveDrawCard" as const,
      ...(intent.action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: intent.action.targetFieldCardId }),
    });
  }
  return deepFreeze({
    ...base,
    type: "chooseYakuDecision" as const,
    choice: intent.action.choice,
  });
}

function activeViewerForState(state: AuthoritativeGameStateV1): PlayerId {
  return state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete"
    ? "player-a"
    : state.phase.playerId;
}

function createLocalRoundRuntimeFromSnapshot(snapshot: LocalRoundSnapshotV1): LocalRoundRuntimeV1 {
  const state = deepFreeze(snapshot.state);
  const checkpoint = deepFreeze(snapshot.checkpoint);
  assertValidAuthoritativeState(state);
  if (checkpoint.version !== 1 || checkpoint.matchId !== state.matchId) {
    throw new Error("LOCAL_SNAPSHOT_CHECKPOINT_INVALID: checkpoint does not belong to this match.");
  }
  validateRngSnapshot(checkpoint.rng);
  return createLocalRoundRuntimeInternal({
    checkpoint,
    commandSequence: Math.max(0, state.stateVersion - 1),
    state,
    viewerId: activeViewerForState(state),
  });
}

function createLocalRoundRuntimeInternal(input: {
  readonly checkpoint: EngineCheckpointV1;
  readonly commandSequence: number;
  readonly state: AuthoritativeGameStateV1;
  readonly viewerId: PlayerId;
}): LocalRoundRuntimeV1 {
  const matchId = input.state.matchId;
  let state = input.state;
  let checkpoint = input.checkpoint;
  let viewerId = input.viewerId;
  let commandSequence = input.commandSequence;
  const observe = (): PlayerObservationV1 => projectPlayerObservation(state, viewerId);
  return {
    get checkpoint() {
      return checkpoint;
    },
    get state() {
      return state;
    },
    get viewerId() {
      return viewerId;
    },
    observe,
    snapshot: () => deepFreeze({ state, checkpoint }),
    createSource: () => createInteractionSourceFromObservation(observe()),
    advanceRound: () => {
      const before = observe();
      if (state.phase.kind !== "roundComplete") {
        throw new Error(
          "LOCAL_ROUND_ADVANCE_INVALID: only a completed nonfinal round can advance.",
        );
      }
      commandSequence += 1;
      const transition = advanceRound(
        state,
        deepFreeze({
          type: "advanceRound" as const,
          commandId: `${matchId}:advance:${commandSequence}`,
          matchId,
          expectedStateVersion: state.stateVersion,
        }),
        checkpoint,
      );
      state = transition.state;
      checkpoint = transition.checkpoint;
      const after = observe();
      const handoffPlayerId =
        state.phase.kind === "awaitingHandPlay" && state.phase.playerId !== viewerId
          ? state.phase.playerId
          : null;
      return deepFreeze({
        before,
        after,
        events: projectPublicEvents(transition.events),
        handoffPlayerId,
        roundComplete: state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete",
      });
    },
    submit: (intent) => {
      const before = observe();
      if (
        intent.matchId !== state.matchId ||
        intent.actorId !== viewerId ||
        intent.expectedStateVersion !== state.stateVersion
      ) {
        throw new Error("LOCAL_INTENT_STALE: intent does not match the active local observation.");
      }
      commandSequence += 1;
      const transition = applyGameplayCommand(
        state,
        commandFromIntent(intent, `${matchId}:command:${commandSequence}`),
      );
      state = transition.state;
      const after = observe();
      const events = projectPublicEvents(transition.events);
      const handoff = events.find(
        (event): event is Extract<PublicGameEventV1, { readonly type: "turnCompleted" }> =>
          event.type === "turnCompleted",
      );
      return deepFreeze({
        before,
        after,
        events,
        handoffPlayerId:
          handoff && state.phase.kind === "awaitingHandPlay" ? handoff.nextPlayerId : null,
        roundComplete: state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete",
      });
    },
    switchViewer: (playerId) => {
      if (state.phase.kind === "awaitingHandPlay" && state.phase.playerId !== playerId) {
        throw new Error("LOCAL_HANDOFF_INVALID: viewer must be the active player.");
      }
      viewerId = playerId;
      return observe();
    },
  };
}

export function restoreLocalRoundRuntime(snapshot: LocalRoundSnapshotV1): LocalRoundRuntimeV1 {
  return createLocalRoundRuntimeFromSnapshot(snapshot);
}

export function createLocalRoundRuntime(input?: {
  readonly matchId?: string;
  readonly matchLength?: MatchLength;
  readonly seed?: string;
}): LocalRoundRuntimeV1 {
  const matchId = input?.matchId ?? PHASE_3B_MATCH_ID;
  const started = startMatch(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength: input?.matchLength ?? 3,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    createSeededRandomSource(input?.seed ?? PHASE_3B_LOCAL_SEED),
  );
  return createLocalRoundRuntimeInternal({
    checkpoint: started.checkpoint,
    commandSequence: 0,
    state: started.state,
    viewerId: activeViewerForState(started.state),
  });
}
