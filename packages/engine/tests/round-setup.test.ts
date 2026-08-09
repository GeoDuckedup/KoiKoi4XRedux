import {
  CARD_IDS,
  createSeededRandomSource,
  dealOrderedDeck,
  startMatch,
  startMatchFromOrderedDeck,
  type StartMatchCommandV1,
} from "../src/index";
import { describe, expect, it } from "vitest";

const command: StartMatchCommandV1 = {
  type: "startMatch",
  commandId: "setup-round",
  matchId: "setup-match",
  expectedStateVersion: 0,
  matchLength: 6,
  starterPolicy: { kind: "provided", playerId: "player-b" },
};

describe("Phase 1A round setup", () => {
  it("allocates deal-layout-v1 as stable 8/8/8/24 slices", () => {
    const ordered = [...CARD_IDS];
    const zones = dealOrderedDeck(ordered);
    expect(zones.hands[0]).toEqual(ordered.slice(0, 8));
    expect(zones.hands[1]).toEqual(ordered.slice(8, 16));
    expect(zones.field).toEqual(ordered.slice(16, 24));
    expect(zones.drawPile).toEqual(ordered.slice(24));
    expect(zones.drawPile[0]).toBe(ordered[24]);
    expect(ordered).toEqual(CARD_IDS);
  });

  it("resets all round-local state and records the provided starter before outcomes", () => {
    const transition = startMatch(
      command,
      createSeededRandomSource("0123456789abcdeffedcba9876543210"),
    );
    expect(transition.state).toMatchObject({
      formatVersion: 1,
      rulesVersion: "1.0",
      stateVersion: 1,
      matchLength: 6,
      round: {
        roundNumber: 1,
        scheduledMonth: 1,
        starterId: "player-b",
        tableMultiplier: 1,
        mostRecentKoiKoiCallerId: null,
        firstYakuTriggerPlayerId: null,
        specialPrivilege: null,
        frozenFinalRoundLeaderId: null,
      },
      history: [],
    });
    expect(transition.state.players.every((player) => player.captured.length === 0)).toBe(true);
    expect(transition.state.players.every((player) => player.seenYakuKeys.length === 0)).toBe(true);
    expect(transition.events.find((event) => event.type === "starterSelected")).toMatchObject({
      starterId: "player-b",
    });
    expect(Object.isFrozen(transition.state)).toBe(true);
    expect(Object.isFrozen(transition.state.players[0].hand)).toBe(true);
    expect(Object.isFrozen(transition.events)).toBe(true);
    expect(Object.isFrozen(transition.events[0])).toBe(true);
  });

  it("rejects malformed ordered decks without modifying the input", () => {
    const duplicate = [...CARD_IDS];
    const firstCard = duplicate[0];
    if (firstCard === undefined) throw new Error("Canonical catalog unexpectedly empty.");
    duplicate[47] = firstCard;
    const before = [...duplicate];
    expect(() => dealOrderedDeck(duplicate)).toThrow("DEAL_DECK_INVALID");
    expect(duplicate).toEqual(before);
    expect(() => dealOrderedDeck(CARD_IDS.slice(0, 47))).toThrow("DEAL_DECK_INVALID");
    expect(() => dealOrderedDeck([...CARD_IDS, "unknown-card"])).toThrow("DEAL_DECK_INVALID");
  });

  it("rejects RNG starter policy on the authored ordered-deck entry point", () => {
    expect(() =>
      startMatchFromOrderedDeck(
        { ...command, starterPolicy: { kind: "chooseWithRng" } },
        CARD_IDS,
        "player-a",
      ),
    ).toThrow("STARTER_POLICY_INVALID");
  });
});
