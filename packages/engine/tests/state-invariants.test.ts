import {
  createSeededRandomSource,
  startMatch,
  validateCardOwnership,
  validateInitialSetupState,
  type AuthoritativeGameStateV1,
  type StartMatchCommandV1,
} from "../src/index";
import { describe, expect, it } from "vitest";

function validState(): AuthoritativeGameStateV1 {
  const command: StartMatchCommandV1 = {
    type: "startMatch",
    commandId: "invariant-start",
    matchId: "invariant-match",
    expectedStateVersion: 0,
    matchLength: 12,
    starterPolicy: { kind: "provided", playerId: "player-a" },
  };
  return startMatch(command, createSeededRandomSource("0123456789abcdeffedcba9876543210")).state;
}

function mutableClone(state: AuthoritativeGameStateV1): AuthoritativeGameStateV1 {
  return JSON.parse(JSON.stringify(state)) as AuthoritativeGameStateV1;
}

describe("Phase 1A authoritative state invariants", () => {
  it("accepts every generated setup with exactly 48 unique authoritative cards", () => {
    const state = validState();
    expect(validateCardOwnership(state)).toEqual([]);
    expect(validateInitialSetupState(state)).toEqual([]);
  });

  it("reports duplicate and missing cards with stable codes", () => {
    const state = mutableClone(validState());
    const handCard = state.players[0].hand[0];
    if (handCard === undefined) throw new Error("Fixture hand unexpectedly empty.");
    (state.round.drawPile as string[])[0] = handCard;
    const codes = validateCardOwnership(state).map((entry) => entry.code);
    expect(codes).toContain("CARD_ZONE_DUPLICATE");
    expect(codes).toContain("CARD_ZONE_MISSING");
  });

  it("reports unknown IDs and total-card violations without mutating malformed state", () => {
    const state = mutableClone(validState());
    (state.round.drawPile as string[])[0] = "not-a-card";
    (state.round.drawPile as string[]).pop();
    const before = JSON.stringify(state);
    const codes = validateCardOwnership(state).map((entry) => entry.code);
    expect(codes).toEqual(
      expect.arrayContaining(["CARD_ZONE_UNKNOWN_ID", "CARD_ZONE_COUNT", "CARD_ZONE_MISSING"]),
    );
    expect(JSON.stringify(state)).toBe(before);
  });

  it("keeps setup-size checks separate from global ownership", () => {
    const state = mutableClone(validState());
    const moved = (state.players[0].hand as string[]).pop();
    if (moved === undefined) throw new Error("Fixture hand unexpectedly empty.");
    (state.round.drawPile as string[]).push(moved);
    expect(validateCardOwnership(state)).toEqual([]);
    expect(validateInitialSetupState(state).map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["SETUP_HAND_COUNT", "SETUP_DRAW_PILE_COUNT"]),
    );
  });

  it("rejects saved opening phases and scores that do not match the dealt cards", () => {
    const baseline = mutableClone(validState());
    const wrongPhase: AuthoritativeGameStateV1 = {
      ...baseline,
      phase:
        baseline.phase.kind === "awaitingHandPlay"
          ? {
              kind: "roundComplete",
              transitionPending: true,
              result: {
                kind: "fieldCancellation",
                reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
                pointDeltas: { "player-a": 0, "player-b": 0 },
                completeFieldMonths: [],
                luckyHandsEvaluated: false,
                yakuDecisionRequired: false,
              },
            }
          : { kind: "awaitingHandPlay", playerId: baseline.round.starterId },
    };
    expect(validateInitialSetupState(wrongPhase).map((entry) => entry.code)).toContain(
      "OPENING_RESULT_EVIDENCE_MISMATCH",
    );

    const wrongScore: AuthoritativeGameStateV1 = {
      ...baseline,
      players: [
        { ...baseline.players[0], score: baseline.players[0].score + 1 },
        baseline.players[1],
      ],
    };
    expect(validateInitialSetupState(wrongScore).map((entry) => entry.code)).toContain(
      "OPENING_RESULT_SCORE_INVALID",
    );
  });

  it("requires new-match metadata and empty history", () => {
    const state: AuthoritativeGameStateV1 = {
      ...mutableClone(validState()),
      matchId: "",
      status: "complete",
      history: [{}] as unknown as never[],
    };

    expect(validateInitialSetupState(state).map((entry) => entry.code)).toContain(
      "SETUP_MATCH_STATE_INVALID",
    );
  });

  it("preserves the Phase 1A setup codes for isolated version and metadata failures", () => {
    const baseline = mutableClone(validState());
    const versionCases: readonly AuthoritativeGameStateV1[] = [
      { ...baseline, formatVersion: 2 as 1 },
      { ...baseline, rulesVersion: "2.0" as "1.0" },
      { ...baseline, stateVersion: 2 },
    ];
    for (const state of versionCases) {
      expect(validateInitialSetupState(state).map((entry) => entry.code)).toEqual([
        "STATE_VERSION_INVALID",
      ]);
    }

    const metadataCases: readonly AuthoritativeGameStateV1[] = [
      { ...baseline, status: "complete" },
      { ...baseline, matchId: "" },
      { ...baseline, lastAcceptedCommandId: "" },
      { ...baseline, history: [{}] as unknown as never[] },
    ];
    for (const state of metadataCases) {
      expect(validateInitialSetupState(state).map((entry) => entry.code)).toEqual([
        "SETUP_MATCH_STATE_INVALID",
      ]);
    }
  });
});
