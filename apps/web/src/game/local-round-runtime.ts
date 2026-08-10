import {
  applyGameplayCommand,
  createSeededRandomSource,
  deepFreeze,
  projectPlayerObservation,
  projectPublicEvents,
  startMatch,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type GameplayCommandV1,
  type PlayerId,
  type PlayerObservationV1,
  type PublicGameEventV1,
} from "@koikoi4x/engine";

import type { InputCommandIntentV1, InteractionSourceV1 } from "../presentation/input/types";
import { createInteractionSourceFromObservation } from "./observation-presentation";

export const PHASE_3A_LOCAL_SEED = "00000000000000000000000000000001" as const;
export const PHASE_3A_MATCH_ID = "phase3a-local-round" as const;

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
  observe: () => PlayerObservationV1;
  submit: (intent: InputCommandIntentV1) => LocalRoundTransitionV1;
  switchViewer: (playerId: PlayerId) => PlayerObservationV1;
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
  if (intent.action.type === "chooseDrawCapture") {
    return deepFreeze({
      ...base,
      type: "chooseDrawCapture" as const,
      targetFieldCardId: intent.action.targetFieldCardId,
    });
  }
  return deepFreeze({
    ...base,
    type: "chooseYakuDecision" as const,
    choice: intent.action.choice,
  });
}

export function createLocalRoundRuntime(input?: {
  readonly matchId?: string;
  readonly seed?: string;
}): LocalRoundRuntimeV1 {
  const matchId = input?.matchId ?? PHASE_3A_MATCH_ID;
  const started = startMatch(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength: 3,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    createSeededRandomSource(input?.seed ?? PHASE_3A_LOCAL_SEED),
  );
  if (started.state.phase.kind !== "awaitingHandPlay") {
    throw new Error("PHASE3A_OPENING_RESULT: the locked local seed must begin a playable round.");
  }
  let state = started.state;
  let viewerId: PlayerId = started.state.phase.playerId;
  let commandSequence = 0;

  const observe = (): PlayerObservationV1 => projectPlayerObservation(state, viewerId);
  const runtime: LocalRoundRuntimeV1 = {
    get checkpoint() {
      return started.checkpoint;
    },
    get state() {
      return state;
    },
    get viewerId() {
      return viewerId;
    },
    observe,
    createSource: () => createInteractionSourceFromObservation(observe()),
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
  return runtime;
}
