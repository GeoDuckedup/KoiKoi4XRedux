import {
  CARD_IDS,
  applyGameplayCommand,
  startMatchFromOrderedDeck,
  validateAuthoritativeState,
  type AuthoritativeGameStateV1,
  type StartMatchCommandV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  PHASE_1B_CAPTURE_FIXTURE_IDS,
  PHASE_1B_CAPTURE_FIXTURES,
  type Phase1BCaptureFixture,
} from "../src/rules/capture-fixtures";

function initialState(fixture: Phase1BCaptureFixture): AuthoritativeGameStateV1 {
  const command: StartMatchCommandV1 = {
    type: "startMatch",
    commandId: `setup-${fixture.id.toLowerCase()}`,
    matchId: fixture.matchId,
    expectedStateVersion: 0,
    matchLength: 12,
    starterPolicy: { kind: "provided", playerId: "player-a" },
  };
  return startMatchFromOrderedDeck(command, fixture.orderedDeck, "player-a").state;
}

describe("Phase 1B capture fixture contract", () => {
  it("exports every locked capture vector exactly once", () => {
    expect(PHASE_1B_CAPTURE_FIXTURES.map((fixture) => fixture.id)).toEqual(
      PHASE_1B_CAPTURE_FIXTURE_IDS,
    );
    expect(new Set(PHASE_1B_CAPTURE_FIXTURE_IDS).size).toBe(PHASE_1B_CAPTURE_FIXTURE_IDS.length);
  });

  it.each(PHASE_1B_CAPTURE_FIXTURES)(
    "$id begins as one complete normal canonical deal",
    (fixture) => {
      expect(fixture.orderedDeck).toHaveLength(48);
      expect(new Set(fixture.orderedDeck)).toEqual(new Set(CARD_IDS));
      expect(initialState(fixture).phase).toEqual({
        kind: "awaitingHandPlay",
        playerId: "player-a",
      });
    },
  );

  it.each(PHASE_1B_CAPTURE_FIXTURES)("$id executes every locked checkpoint", (fixture) => {
    let state = initialState(fixture);
    for (const [index, command] of fixture.commands.entries()) {
      const expected = fixture.checkpoints[index];
      if (expected === undefined) throw new Error(`${fixture.id}: checkpoint ${index} missing.`);
      const before = JSON.stringify(state);
      const transition = applyGameplayCommand(state, command);
      expect(JSON.stringify(state), `${fixture.id}: input mutation at command ${index}`).toBe(
        before,
      );
      state = transition.state;

      expect(state.stateVersion, fixture.id).toBe(expected.stateVersion);
      expect(state.phase, fixture.id).toEqual(expected.phase);
      expect(state.round.field, fixture.id).toEqual(expected.field);
      expect(state.players[0].captured, fixture.id).toEqual(expected.playerACaptured);
      expect(state.players[1].captured, fixture.id).toEqual(expected.playerBCaptured);
      expect(state.round.drawPile, fixture.id).toHaveLength(expected.drawPileCount);
      expect(
        transition.events.map((event) => event.type),
        fixture.id,
      ).toEqual(expected.eventTypes);
      expect(
        transition.events.every((event) => event.audience.kind === "public"),
        fixture.id,
      ).toBe(true);
      expect(validateAuthoritativeState(state), fixture.id).toEqual([]);
      expect(Object.isFrozen(state), fixture.id).toBe(true);
      expect(Object.isFrozen(state.round.field), fixture.id).toBe(true);
      expect(Object.isFrozen(transition.events), fixture.id).toBe(true);
      expect(Object.isFrozen(fixture.commands[index]), fixture.id).toBe(true);
      expect(Object.isFrozen(expected), fixture.id).toBe(true);
      expect(Object.isFrozen(expected.field), fixture.id).toBe(true);

      const serializedEvents = JSON.stringify(transition.events);
      const stillHidden = [
        ...state.players[0].hand,
        ...state.players[1].hand,
        ...state.round.drawPile,
      ];
      for (const cardId of stillHidden) {
        expect(serializedEvents, `${fixture.id}: leaked ${cardId}`).not.toContain(cardId);
      }
    }
    expect(fixture.commands).toHaveLength(fixture.checkpoints.length);
  });

  it("marks both hand and draw sweep fixtures as public four-card sweeps", () => {
    for (const fixtureId of ["CAP-003", "CAP-DRAW-003"] as const) {
      const fixture = PHASE_1B_CAPTURE_FIXTURES.find((entry) => entry.id === fixtureId);
      if (fixture === undefined) throw new Error(`${fixtureId} missing.`);
      const command = fixture.commands[0];
      if (command === undefined) throw new Error(`${fixtureId} command missing.`);
      const transition = applyGameplayCommand(initialState(fixture), command);
      expect(
        transition.events.filter(
          (event) => event.type === "cardsCaptured" && event.captureKind === "fourCardSweep",
        ),
      ).toHaveLength(1);
    }
  });
});
