import { describe, expect, it } from "vitest";

import { PHASE_1A_DEAL_FIXTURE_IDS } from "../src/rules/deal-fixtures";
import { PHASE_1D_VECTOR_IDS } from "../src/rules/phase1d-fixtures";
import { PHASE_1E_VECTOR_IDS } from "../src/rules/phase1e-fixtures";
import {
  getPhase3CPresentationFixture,
  PHASE_3C_PRESENTATION_FIXTURE_IDS,
  PHASE_3C_PRESENTATION_FIXTURES,
  type Phase3CAuthoritativeSource,
} from "../src/rules/phase3c-presentation-fixtures";

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

function sourceExists(source: Phase3CAuthoritativeSource): boolean {
  switch (source.catalog) {
    case "phase1aDeal":
      return (PHASE_1A_DEAL_FIXTURE_IDS as readonly string[]).includes(source.id);
    case "phase1dLifecycle":
      return (PHASE_1D_VECTOR_IDS as readonly string[]).includes(source.id);
    case "phase1eProjection":
      return (PHASE_1E_VECTOR_IDS as readonly string[]).includes(source.id);
  }
}

describe("Phase 3C presentation fixture inventory", () => {
  it("exports the twelve locked fixture IDs in order with no duplicates", () => {
    expect(PHASE_3C_PRESENTATION_FIXTURES.map((fixture) => fixture.id)).toEqual(
      PHASE_3C_PRESENTATION_FIXTURE_IDS,
    );
    expect(new Set(PHASE_3C_PRESENTATION_FIXTURE_IDS).size).toBe(12);
  });

  it("retrieves each exact literal contract and binds only known authoritative sources", () => {
    for (const fixture of PHASE_3C_PRESENTATION_FIXTURES) {
      expect(getPhase3CPresentationFixture(fixture.id)).toBe(fixture);
      expect(fixture.ruleRefs.length).toBeGreaterThan(0);
      expect(fixture.given.authoritativeSources.length).toBeGreaterThan(0);
      for (const source of fixture.given.authoritativeSources)
        expect(sourceExists(source)).toBe(true);
    }
  });

  it("deep-freezes every nested literal contract", () => {
    expectDeepFrozen(PHASE_3C_PRESENTATION_FIXTURES);
  });

  it("locks no-score, privileged arithmetic, privacy, match terminal, and transition wording", () => {
    expect(getPhase3CPresentationFixture("PRES-RESULT-003-END-PLAY-NO-SCORE").then).toEqual({
      kind: "endOfPlayNoScore",
      resultKind: "endOfPlayNoScore",
      reasonCode: "END_OF_PLAY_NO_SCORE",
      scorerId: null,
      heading: "Nobody called Koi-Koi, so this round ends 0–0.",
      arithmetic: {
        basePoints: 0,
        tableMultiplierAtDecision: null,
        scoringMultiplier: null,
        awardedPoints: 0,
        copy: "0–0",
      },
      evidence: { kind: "none" },
      transition: {
        kind: "nextRoundShell",
        nextRound: {
          roundNumber: 3,
          scheduledMonth: 3,
          starterId: "player-a",
          starterReason: "LATER_ZERO_PRESERVES_STARTER",
          specialPrivilegePlayerId: null,
        },
        actionLabel: "Start another local round",
        actionPolicy: "presentationOnlyLocalRestart",
        prohibitedClaim: "restartIsTheAuthoritativeNextMonth",
      },
      controlPolicy: {
        kind: "resultModalLock",
        lockedControls: [
          "cardInput",
          "deckPicker",
          "newRound",
          "motionMode",
          "inputMode",
          "fullscreen",
        ],
        focus: "resultAcknowledge",
        dismissal: "acknowledgeOnly",
      },
    });

    expect(
      getPhase3CPresentationFixture("PRES-RESULT-008-PRIVILEGED-BANK-SPLIT").then,
    ).toMatchObject({
      arithmetic: {
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 2,
        awardedPoints: 20,
        copy: "10 × 2× = 20",
      },
      visibleTableCopy: "Table stayed at 1×; this Bank scores at 2×.",
    });
    expect(getPhase3CPresentationFixture("PRES-RESULT-011-SAFE-PROJECTION").then).toMatchObject({
      forbiddenTokens: ["opponentHand", "drawPile", "rng", "checkpoint", "commandId"],
      automaticEvidencePolicy: "onlyCommittedPublicEvidence",
    });
    expect(
      getPhase3CPresentationFixture("PRES-RESULT-009-MATCH-COMPLETE-WINNER").then,
    ).toMatchObject({
      winnerId: "player-a",
      finalScores: { "player-a": 14, "player-b": 8 },
      completion: { actionLabel: "Start a new local match" },
    });
    expect(getPhase3CPresentationFixture("PRES-RESULT-010-MATCH-COMPLETE-TIE").then).toMatchObject({
      winnerId: null,
      finalScores: { "player-a": 12, "player-b": 12 },
    });
  });

  it("uses the same locked modal policy for every result and exposes only the truthful local action", () => {
    for (const fixture of PHASE_3C_PRESENTATION_FIXTURES) {
      expect(fixture.then.controlPolicy).toEqual({
        kind: "resultModalLock",
        lockedControls: [
          "cardInput",
          "deckPicker",
          "newRound",
          "motionMode",
          "inputMode",
          "fullscreen",
        ],
        focus: "resultAcknowledge",
        dismissal: "acknowledgeOnly",
      });
    }
    expect(getPhase3CPresentationFixture("PRES-RESULT-012-MODAL-LOCK").then).toMatchObject({
      allowedActionLabel: "Start another local round",
    });
  });
});
