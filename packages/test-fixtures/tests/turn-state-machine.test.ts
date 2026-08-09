import {
  EngineCommandError,
  applyGameplayCommand,
  getLegalActions,
  startMatchFromOrderedDeck,
  validateAuthoritativeState,
  validateCardOwnership,
  type AuthoritativeGameStateV1,
  type GameplayCommandV1,
  type PlayerId,
  type StartMatchCommandV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  PHASE_1B_CAPTURE_FIXTURES,
  type Phase1BCaptureFixture,
  type Phase1BCaptureFixtureId,
} from "../src/rules/capture-fixtures";

function fixture(id: Phase1BCaptureFixtureId): Phase1BCaptureFixture {
  const found = PHASE_1B_CAPTURE_FIXTURES.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`${id} fixture missing.`);
  return found;
}

function setup(id: Phase1BCaptureFixtureId): AuthoritativeGameStateV1 {
  const definition = fixture(id);
  const command: StartMatchCommandV1 = {
    type: "startMatch",
    commandId: `setup-${id.toLowerCase()}`,
    matchId: definition.matchId,
    expectedStateVersion: 0,
    matchLength: 12,
    starterPolicy: { kind: "provided", playerId: "player-a" },
  };
  return startMatchFromOrderedDeck(command, definition.orderedDeck, "player-a").state;
}

function firstCommand(id: Phase1BCaptureFixtureId): GameplayCommandV1 {
  const command = fixture(id).commands[0];
  if (command === undefined) throw new Error(`${id} command missing.`);
  return command;
}

function expectRejected(
  state: AuthoritativeGameStateV1,
  command: GameplayCommandV1,
  code: string,
): void {
  const before = JSON.stringify(state);
  let rejection: unknown;
  try {
    applyGameplayCommand(state, command);
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toBeInstanceOf(EngineCommandError);
  expect((rejection as EngineCommandError).code).toBe(code);
  expect(JSON.stringify(state)).toBe(before);
}

describe("Phase 1B legal actions and command state machine", () => {
  it("enumerates private hand actions and both two-match targets in deterministic order", () => {
    const state = setup("CAP-002A");
    expect(getLegalActions(state, "player-b")).toEqual([]);
    expect(
      getLegalActions(state, "player-a").filter(
        (action) => action.type === "playHandCard" && action.cardId === "january-crane",
      ),
    ).toEqual([
      {
        type: "playHandCard",
        actorId: "player-a",
        cardId: "january-crane",
        targetFieldCardId: "january-pine-plain-a",
      },
      {
        type: "playHandCard",
        actorId: "player-a",
        cardId: "january-crane",
        targetFieldCardId: "january-red-text-scroll",
      },
    ]);
    expect(Object.isFrozen(getLegalActions(state, "player-a"))).toBe(true);
  });

  it("keeps the same actor and exactly two legal actions during a pending draw choice", () => {
    const pending = applyGameplayCommand(setup("CAP-DRAW-002"), firstCommand("CAP-DRAW-002")).state;
    expect(getLegalActions(pending, "player-b")).toEqual([]);
    expect(getLegalActions(pending, "player-a")).toEqual([
      {
        type: "chooseDrawCapture",
        actorId: "player-a",
        drawnCardId: "january-pine-plain-b",
        targetFieldCardId: "january-pine-plain-a",
      },
      {
        type: "chooseDrawCapture",
        actorId: "player-a",
        drawnCardId: "january-pine-plain-b",
        targetFieldCardId: "january-red-text-scroll",
      },
    ]);
    expect(validateCardOwnership(pending)).toEqual([]);
  });

  it("resolves the symmetric second draw target and changes actor exactly once", () => {
    const definition = fixture("CAP-DRAW-002");
    const pending = applyGameplayCommand(setup("CAP-DRAW-002"), firstCommand("CAP-DRAW-002")).state;
    const transition = applyGameplayCommand(pending, {
      type: "chooseDrawCapture",
      commandId: "choose-draw-second-target",
      matchId: definition.matchId,
      actorId: "player-a",
      expectedStateVersion: 2,
      targetFieldCardId: "january-red-text-scroll",
    });
    expect(transition.state.players[0].captured).toEqual([
      "january-pine-plain-b",
      "january-red-text-scroll",
    ]);
    expect(transition.state.round.field).toContain("january-pine-plain-a");
    expect(transition.state.phase).toEqual({ kind: "awaitingHandPlay", playerId: "player-b" });
    expect(transition.state.stateVersion).toBe(3);
  });

  it("supports player B as the active actor without changing starter identity", () => {
    const state = applyGameplayCommand(setup("CAP-000"), firstCommand("CAP-000")).state;
    expect(state.phase).toEqual({ kind: "awaitingHandPlay", playerId: "player-b" });
    const transition = applyGameplayCommand(state, {
      type: "playHandCard",
      commandId: "player-b-turn",
      matchId: state.matchId,
      actorId: "player-b",
      expectedStateVersion: 2,
      cardId: "september-sake-cup",
    });
    expect(transition.state.round.starterId).toBe("player-a");
    expect(transition.state.phase).toEqual({ kind: "awaitingHandPlay", playerId: "player-a" });
    expect(transition.events[0]).toMatchObject({ type: "handCardPlayed", actorId: "player-b" });
  });

  it("rejects invalid metadata, actors, cards, phases, and targets without mutation", () => {
    const handState = setup("CAP-002A");
    const base = firstCommand("CAP-002A");
    if (base.type !== "playHandCard") throw new Error("CAP-002A command malformed.");
    const withoutTarget: GameplayCommandV1 = {
      type: "playHandCard",
      commandId: base.commandId,
      matchId: base.matchId,
      actorId: base.actorId,
      expectedStateVersion: base.expectedStateVersion,
      cardId: base.cardId,
    };
    const noMatchState = setup("CAP-000");
    const pending = applyGameplayCommand(setup("CAP-DRAW-002"), firstCommand("CAP-DRAW-002")).state;

    expectRejected(handState, { ...base, commandId: "" }, "COMMAND_ID_INVALID");
    expectRejected(
      handState,
      { ...base, commandId: handState.lastAcceptedCommandId },
      "COMMAND_ID_REUSED",
    );
    expectRejected(handState, { ...base, matchId: "wrong" }, "MATCH_ID_MISMATCH");
    expectRejected(handState, { ...base, expectedStateVersion: 99 }, "STATE_VERSION_MISMATCH");
    expectRejected(handState, { ...base, actorId: "player-b" }, "ACTOR_NOT_ACTIVE");
    expectRejected(
      handState,
      { ...base, cardId: "february-red-text-scroll" },
      "HAND_CARD_NOT_OWNED",
    );
    expectRejected(
      handState,
      { ...base, cardId: "unknown-card" } as unknown as GameplayCommandV1,
      "CARD_ID_INVALID",
    );
    expectRejected(handState, withoutTarget, "CAPTURE_TARGET_REQUIRED");
    expectRejected(
      handState,
      { ...base, targetFieldCardId: "march-cherry-plain-a" },
      "CAPTURE_TARGET_ILLEGAL",
    );
    expectRejected(
      noMatchState,
      { ...firstCommand("CAP-000"), targetFieldCardId: "january-pine-plain-a" },
      "CAPTURE_TARGET_NOT_ALLOWED",
    );
    expectRejected(
      handState,
      {
        type: "chooseDrawCapture",
        commandId: "choose-too-early",
        matchId: handState.matchId,
        actorId: "player-a",
        expectedStateVersion: 1,
        targetFieldCardId: "january-pine-plain-a",
      },
      "COMMAND_NOT_ALLOWED_IN_PHASE",
    );
    expectRejected(
      pending,
      {
        type: "playHandCard",
        commandId: "play-during-draw-choice",
        matchId: pending.matchId,
        actorId: "player-a",
        expectedStateVersion: 2,
        cardId: "january-crane",
      },
      "COMMAND_NOT_ALLOWED_IN_PHASE",
    );
    expectRejected(
      pending,
      {
        type: "chooseDrawCapture",
        commandId: "illegal-draw-target",
        matchId: pending.matchId,
        actorId: "player-a",
        expectedStateVersion: 2,
        targetFieldCardId: "march-cherry-plain-a",
      },
      "DRAW_CAPTURE_TARGET_ILLEGAL",
    );
    expectRejected(
      handState,
      { ...base, type: "unknown-command" } as unknown as GameplayCommandV1,
      "COMMAND_TYPE_INVALID",
    );
  });

  it("produces byte-identical immutable transitions for equal state and command input", () => {
    const state = setup("CAP-001");
    const command = firstCommand("CAP-001");
    const first = applyGameplayCommand(state, command);
    const second = applyGameplayCommand(state, command);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.state.lastAcceptedCommandId).toBe(command.commandId);
    expect(Object.isFrozen(first.state.players[0].captured)).toBe(true);
    expect(Object.isFrozen(first.events[0])).toBe(true);
  });

  it("detects malformed pending-card ownership and target references", () => {
    const initial = setup("CAP-000");
    const impossibleFirstActor: AuthoritativeGameStateV1 = {
      ...initial,
      phase: { kind: "awaitingHandPlay", playerId: "player-b" },
    };
    expect(validateAuthoritativeState(impossibleFirstActor).map((entry) => entry.code)).toContain(
      "TURN_PLAYER_ORDER_INVALID",
    );

    const pending = applyGameplayCommand(setup("CAP-DRAW-002"), firstCommand("CAP-DRAW-002")).state;
    if (pending.phase.kind !== "awaitingDrawCapture") throw new Error("Pending phase missing.");
    const invalidOwnership: AuthoritativeGameStateV1 = {
      ...pending,
      phase: { ...pending.phase, drawnCardId: pending.phase.targetFieldCardIds[0] },
    };
    expect(validateAuthoritativeState(invalidOwnership).map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["CARD_ZONE_DUPLICATE", "CARD_ZONE_MISSING"]),
    );
    const invalidTargets: AuthoritativeGameStateV1 = {
      ...pending,
      phase: {
        ...pending.phase,
        targetFieldCardIds: [pending.phase.targetFieldCardIds[0], "march-cherry-plain-a"],
      },
    };
    expect(validateAuthoritativeState(invalidTargets).map((entry) => entry.code)).toContain(
      "DRAW_CAPTURE_TARGETS_INVALID",
    );

    const invalidActor: AuthoritativeGameStateV1 = {
      ...pending,
      phase: { ...pending.phase, playerId: "player-b" },
    };
    expect(validateAuthoritativeState(invalidActor).map((entry) => entry.code)).toContain(
      "TURN_PLAYER_ORDER_INVALID",
    );
  });

  it("deterministically reaches the Phase 1D End-of-Play seam with eight draws unused", () => {
    let state = setup("CAP-000");
    let commandNumber = 0;
    let finalEventTypes: readonly string[] = [];
    while (state.phase.kind !== "awaitingEndOfPlayResolution") {
      if (state.phase.kind !== "awaitingHandPlay" && state.phase.kind !== "awaitingDrawCapture") {
        throw new Error(`Unexpected phase ${state.phase.kind}.`);
      }
      const actorId: PlayerId = state.phase.playerId;
      const action = getLegalActions(state, actorId)[0];
      if (action === undefined) throw new Error(`No legal action at state ${state.stateVersion}.`);
      commandNumber += 1;
      const command: GameplayCommandV1 =
        action.type === "playHandCard"
          ? {
              type: "playHandCard",
              commandId: `generated-${commandNumber}`,
              matchId: state.matchId,
              actorId,
              expectedStateVersion: state.stateVersion,
              cardId: action.cardId,
              ...(action.targetFieldCardId === undefined
                ? {}
                : { targetFieldCardId: action.targetFieldCardId }),
            }
          : {
              type: "chooseDrawCapture",
              commandId: `generated-${commandNumber}`,
              matchId: state.matchId,
              actorId,
              expectedStateVersion: state.stateVersion,
              targetFieldCardId: action.targetFieldCardId,
            };
      const before = JSON.stringify(state);
      const transition = applyGameplayCommand(state, command);
      expect(JSON.stringify(state)).toBe(before);
      expect(transition.state.stateVersion).toBe(state.stateVersion + 1);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
      state = transition.state;
      finalEventTypes = transition.events.map((event) => event.type);
    }

    expect(state.players.map((player) => player.hand)).toEqual([[], []]);
    expect(state.round.drawPile).toHaveLength(8);
    expect(state.phase.lastActorId).toBe("player-b");
    expect(getLegalActions(state, "player-a")).toEqual([]);
    expect(getLegalActions(state, "player-b")).toEqual([]);
    expect(finalEventTypes.slice(-2)).toEqual(["turnCompleted", "endOfPlayReached"]);
    expect(commandNumber).toBeGreaterThanOrEqual(16);

    const impossibleLastActor: AuthoritativeGameStateV1 = {
      ...state,
      phase: { ...state.phase, lastActorId: "player-a" },
    };
    expect(validateAuthoritativeState(impossibleLastActor).map((entry) => entry.code)).toContain(
      "END_OF_PLAY_PHASE_INVALID",
    );
  });
});
