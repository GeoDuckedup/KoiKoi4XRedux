import {
  EngineCommandError,
  applyGameplayCommand,
  getLegalActions,
  startMatchFromOrderedDeck,
  validateAuthoritativeState,
  type AuthoritativeGameStateV1,
  type CardId,
  type DrawResolutionPreviewV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { PHASE_1B_CAPTURE_FIXTURES } from "../src/rules/capture-fixtures";

function stateFor(id: string): AuthoritativeGameStateV1 {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`DRAW_INTERACT_FIXTURE_MISSING: ${id}`);
  return startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `draw-interact-start-${id}`,
      matchId: `draw-interact-${id}`,
      expectedStateVersion: 0,
      matchLength: 12,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    fixture.orderedDeck,
    "player-a",
  ).state;
}

function reveal(id: string) {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`DRAW_INTERACT_FIXTURE_MISSING: ${id}`);
  const command = fixture.commands[0];
  if (command === undefined || command.type !== "playHandCard") {
    throw new Error(`DRAW_INTERACT_HAND_COMMAND_MISSING: ${id}`);
  }
  const state = stateFor(id);
  const transition = applyGameplayCommand(state, {
    ...command,
    matchId: state.matchId,
  });
  if (transition.state.phase.kind !== "awaitingDrawResolution") {
    throw new Error(`DRAW_INTERACT_PENDING_MISSING: ${id}`);
  }
  return transition;
}

describe("Phase 3E-B authoritative Draw resolution", () => {
  it.each([
    ["DRAW-INTERACT-001-PLACE", "CAP-000", "placeOnField", 1],
    ["DRAW-INTERACT-002-UNIQUE-PAIR", "CAP-DRAW-001", "capturePair", 1],
    ["DRAW-INTERACT-003-EXACT-TWO", "CAP-DRAW-002", "captureChoice", 2],
    ["DRAW-INTERACT-004-SWEEP", "CAP-DRAW-003", "fourCardSweep", 1],
  ] as const)(
    "%s exposes only the engine-owned %s resolution",
    (_vectorId, fixtureId, kind, count) => {
      const transition = reveal(fixtureId);
      const phase = transition.state.phase;
      if (phase.kind !== "awaitingDrawResolution") throw new Error("Pending Draw missing.");
      expect(phase.resolution.kind).toBe(kind);
      expect(transition.events.map((event) => event.type)).toContain("drawResolutionRequired");
      expect(transition.events.map((event) => event.type)).not.toContain("turnCompleted");
      expect(getLegalActions(transition.state, "player-b")).toEqual([]);
      const actions = getLegalActions(transition.state, "player-a");
      expect(actions).toHaveLength(count);
      expect(actions.every((action) => action.type === "resolveDrawCard")).toBe(true);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
    },
  );

  it("DRAW-INTERACT-005-STATE-VERSION-REPLAY rejects stale or illegal resolution without mutation", () => {
    const pending = reveal("CAP-DRAW-002").state;
    if (pending.phase.kind !== "awaitingDrawResolution") throw new Error("Pending Draw missing.");
    const before = JSON.stringify(pending);
    expect(() =>
      applyGameplayCommand(pending, {
        type: "resolveDrawCard",
        commandId: "draw-interact-illegal",
        matchId: pending.matchId,
        actorId: "player-a",
        expectedStateVersion: pending.stateVersion,
        targetFieldCardId: "march-cherry-plain-a",
      }),
    ).toThrow(EngineCommandError);
    expect(JSON.stringify(pending)).toBe(before);
    expect(() =>
      applyGameplayCommand(pending, {
        type: "resolveDrawCard",
        commandId: "draw-interact-missing-target",
        matchId: pending.matchId,
        actorId: "player-a",
        expectedStateVersion: pending.stateVersion,
      }),
    ).toThrow(/CAPTURE_TARGET_REQUIRED/);
  });

  it("DRAW-INTERACT-006-PUBLIC-PRIVACY keeps only the revealed card and ordered public preview", () => {
    const transition = reveal("CAP-DRAW-003");
    const phase = transition.state.phase;
    if (phase.kind !== "awaitingDrawResolution") throw new Error("Pending Draw missing.");
    const publicJson = JSON.stringify({
      drawnCardId: phase.drawnCardId,
      resolution: phase.resolution as DrawResolutionPreviewV1,
      events: transition.events,
    });
    const hidden = [...transition.state.players[1].hand, ...transition.state.round.drawPile];
    for (const cardId of hidden as readonly CardId[]) expect(publicJson).not.toContain(cardId);
    expect(publicJson).not.toContain("commandId");
  });
});
