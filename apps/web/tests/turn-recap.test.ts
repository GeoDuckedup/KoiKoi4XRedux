import type { PublicGameEventV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { formatTurnRecap } from "../src/game/turn-recap";

describe("Phase 3B accessible yaku recap", () => {
  it("PRES-YAKU-002-INCREMENT-NO-DECISION announces exact incremental points", () => {
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuValueChanged",
        actorId: "player-a",
        phase: "draw",
        yakuKey: "animals",
        name: "Animals",
        previousPoints: 3,
        currentPoints: 4,
      },
    ];
    expect(formatTurnRecap(events)).toBe("Animals upgraded: 3 → 4 points.");
  });

  it("PRES-KOI-001-BANK-HAND-AWARD reports the authoritative Bank equation", () => {
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuDecisionChosen",
        actorId: "player-a",
        choice: "bank",
        privilegeUsed: false,
      },
      {
        type: "roundResultCommitted",
        result: {
          roundNumber: 1,
          scheduledMonth: 1,
          starterId: "player-a",
          kind: "bankedScore",
          reasonCode: "BANKED_SCORE",
          scorerId: "player-a",
          pointDeltas: { "player-a": 10, "player-b": 0 },
          activeYaku: [
            { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
            { key: "moonViewing", name: "Moon Viewing", points: 5 },
          ],
          basePoints: 10,
          tableMultiplierAtDecision: 1,
          scoringMultiplier: 1,
          awardedPoints: 10,
          evidence: null,
          nextRound: null,
          matchScoresAfter: { "player-a": 10, "player-b": 0 },
        },
      },
    ];
    expect(formatTurnRecap(events)).toBe(
      "Player A chose Bank. Player A banked 10 × 1× = 10 points.",
    );
  });
});
