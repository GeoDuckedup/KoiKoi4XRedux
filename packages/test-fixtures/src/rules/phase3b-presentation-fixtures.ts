import type { ActiveYakuV1, YakuDisplayName, YakuTriggerKey } from "@koikoi4x/engine";

import type { Phase1CYakuFixtureId } from "./yaku-fixtures";
import type { Phase1DVectorId } from "./phase1d-fixtures";
import type { Phase1EVectorId } from "./phase1e-fixtures";

/**
 * Locked public presentation contracts for Phase 3B. These are deliberately
 * descriptive fixtures: the authoritative source states and transitions stay
 * owned by the Phase 1C/1D/1E fixture families referenced by each entry.
 */
export const PHASE_3B_PRESENTATION_FIXTURE_IDS = [
  "PRES-YAKU-001-MULTI-HAND",
  "PRES-YAKU-002-INCREMENT-NO-DECISION",
  "PRES-YAKU-003-BRIGHT-UPGRADE",
  "PRES-YAKU-004-TWO-WINDOW-TURN",
  "PRES-KOI-001-BANK-HAND-AWARD",
  "PRES-KOI-002-CONTINUE-AND-RESUME",
  "PRES-KOI-003-PRIVILEGE-SPLIT",
  "PRES-KOI-004-FORCED-KOI",
  "PRES-KOI-005-CAP-CALLER",
  "PRES-PRIV-001-SAFE-STATE",
] as const;

export type Phase3BPresentationFixtureId = (typeof PHASE_3B_PRESENTATION_FIXTURE_IDS)[number];
export type Phase3BPresentationExecution = "authoritativeTrace" | "presentationModel";
export type Phase3BSourceFixtureId = Phase1CYakuFixtureId | Phase1DVectorId | Phase1EVectorId;

export type Phase3BPresentationYaku = ActiveYakuV1;

export type Phase3BPresentationGiven =
  | {
      readonly kind: "combinedYakuDecision";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "incrementalYakuValueChange";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "brightHierarchyUpgrade";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "handThenDrawYakuDecisions";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "handPhaseBank";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "handPhaseKoiKoi";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "specialPrivilegeDecision";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "forcedFinalRoundKoiKoi";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "tableMultiplierCap";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    }
  | {
      readonly kind: "recipientScopedPublicPresentation";
      readonly sourceFixtureIds: readonly Phase3BSourceFixtureId[];
    };

export type Phase3BPresentationWhen =
  | { readonly kind: "yakuDecisionRequired"; readonly phase: "hand" | "draw" }
  | { readonly kind: "yakuValueChanged"; readonly phase: "hand" | "draw" }
  | { readonly kind: "chooseBank" }
  | { readonly kind: "chooseKoiKoi" }
  | { readonly kind: "serializeRecipientView" };

export type Phase3BPresentationThen =
  | {
      readonly kind: "combinedDecision";
      readonly newYaku: readonly Phase3BPresentationYaku[];
      readonly activeYaku: readonly Phase3BPresentationYaku[];
      readonly currentYakuTotal: number;
      readonly decisionPanelCount: 1;
      readonly bankLabel: string;
      readonly cardInputLocked: true;
    }
  | {
      readonly kind: "incrementalValueChange";
      readonly activeYaku: readonly Phase3BPresentationYaku[];
      readonly currentYakuTotal: number;
      readonly announcement: string;
      readonly decisionPanelCount: 0;
    }
  | {
      readonly kind: "brightUpgrade";
      readonly activeYaku: readonly Phase3BPresentationYaku[];
      readonly currentYakuTotal: number;
      readonly announcement: "Four Brights upgraded to Five Brights: 8 → 10 points.";
      readonly replacedYakuKey: YakuTriggerKey;
      readonly decisionPanelCount: 1;
    }
  | {
      readonly kind: "twoWindowTurn";
      readonly firstDecisionPhase: "hand";
      readonly secondDecisionPhase: "draw";
      readonly secondNewYaku: readonly Phase3BPresentationYaku[];
      readonly sequentialDecisionPanelCount: 2;
      readonly tableMultiplierAfterFirstKoiKoi: 2;
    }
  | {
      readonly kind: "bankAward";
      readonly tableMultiplierAtDecision: 1;
      readonly scoringMultiplier: 1;
      readonly basePoints: 10;
      readonly awardedPoints: 10;
      readonly bankLabel: "Bank 10 points";
      readonly awardAnnouncement: "Player A banked 10 points.";
      readonly drawRevealed: false;
    }
  | {
      readonly kind: "koiKoiContinuation";
      readonly koiKoiLabel: "Koi-Koi → 2×";
      readonly tableMultiplierAfterChoice: 2;
      readonly callerId: "player-a";
      readonly resumes: "drawPhase";
    }
  | {
      readonly kind: "privilegeSplit";
      readonly visibleTableMultiplier: 1;
      readonly bankScoringMultiplier: 2;
      readonly basePoints: 10;
      readonly awardedPoints: 20;
      readonly bankLabel: "Bank 10 points × 2× = 20";
      readonly koiKoiLabel: "Koi-Koi → 3×";
      readonly koiKoiTableMultiplier: 3;
    }
  | {
      readonly kind: "forcedKoiKoi";
      readonly bankControlPresent: false;
      readonly koiKoiControlPresent: true;
      readonly explanation: "Bank is unavailable for this decision.";
      readonly tableMultiplierAfterChoice: 2;
    }
  | {
      readonly kind: "cappedKoiKoi";
      readonly koiKoiLabel: "Koi-Koi — table remains 4×";
      readonly tableMultiplierAfterChoice: 4;
      readonly callerChanges: true;
    }
  | {
      readonly kind: "safeRecipientState";
      readonly allowedPublicFields: readonly [
        "activeYaku",
        "currentYakuTotal",
        "tableMultiplier",
        "decisionArithmetic",
      ];
      readonly excludedTokens: readonly ["drawPileOrdered", "rng", "checkpoint", "commandId"];
      readonly opponentHandIdentitiesExcluded: true;
      readonly faceDownCardIdentitiesExcluded: true;
    };

export interface Phase3BPresentationFixture {
  readonly id: Phase3BPresentationFixtureId;
  readonly execution: Phase3BPresentationExecution;
  readonly ruleRefs: readonly string[];
  readonly given: Phase3BPresentationGiven;
  readonly when: Phase3BPresentationWhen;
  readonly then: Phase3BPresentationThen;
}

function yaku(key: YakuTriggerKey, name: YakuDisplayName, points: number): Phase3BPresentationYaku {
  return { key, name, points };
}

function deepFreezeFixture<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreezeFixture(nested);
    Object.freeze(value);
  }
  return value;
}

function fixture(
  id: Phase3BPresentationFixtureId,
  execution: Phase3BPresentationExecution,
  ruleRefs: readonly string[],
  given: Phase3BPresentationGiven,
  when: Phase3BPresentationWhen,
  then: Phase3BPresentationThen,
): Phase3BPresentationFixture {
  return deepFreezeFixture({
    id,
    execution,
    ruleRefs: [...ruleRefs],
    given: { ...given, sourceFixtureIds: [...given.sourceFixtureIds] },
    when: { ...when },
    then,
  });
}

const BLOSSOM_VIEWING = yaku("blossomViewing", "Blossom Viewing", 5);
const MOON_VIEWING = yaku("moonViewing", "Moon Viewing", 5);
const ANIMAL_TRIO = yaku("animalTrio", "Animal Trio", 5);
const ANIMALS_FOUR = yaku("animals", "Animals", 4);
const FIVE_BRIGHTS = yaku("fiveBrights", "Five Brights", 10);

export const PHASE_3B_PRESENTATION_FIXTURES: readonly Phase3BPresentationFixture[] =
  deepFreezeFixture([
    fixture(
      "PRES-YAKU-001-MULTI-HAND",
      "authoritativeTrace",
      ["RULES-6", "RULES-7.1", "RULES-7.2"],
      { kind: "combinedYakuDecision", sourceFixtureIds: ["KOI-008"] },
      { kind: "yakuDecisionRequired", phase: "hand" },
      {
        kind: "combinedDecision",
        newYaku: [BLOSSOM_VIEWING, MOON_VIEWING],
        activeYaku: [BLOSSOM_VIEWING, MOON_VIEWING],
        currentYakuTotal: 10,
        decisionPanelCount: 1,
        bankLabel: "Bank 10 points",
        cardInputLocked: true,
      },
    ),
    fixture(
      "PRES-YAKU-002-INCREMENT-NO-DECISION",
      "presentationModel",
      ["RULES-5.2", "RULES-6"],
      {
        kind: "incrementalYakuValueChange",
        sourceFixtureIds: ["YAKU-INCR-ANIMAL-006", "YAKU-INCREMENT-NO-RETRIGGER"],
      },
      { kind: "yakuValueChanged", phase: "draw" },
      {
        kind: "incrementalValueChange",
        activeYaku: [ANIMALS_FOUR],
        currentYakuTotal: 4,
        announcement: "Animals upgraded: 3 → 4 points.",
        decisionPanelCount: 0,
      },
    ),
    fixture(
      "PRES-YAKU-003-BRIGHT-UPGRADE",
      "presentationModel",
      ["RULES-5.3", "RULES-6"],
      {
        kind: "brightHierarchyUpgrade",
        sourceFixtureIds: ["YAKU-BRIGHT-UPGRADE-FOUR-TO-FIVE"],
      },
      { kind: "yakuDecisionRequired", phase: "hand" },
      {
        kind: "brightUpgrade",
        activeYaku: [FIVE_BRIGHTS],
        currentYakuTotal: 10,
        announcement: "Four Brights upgraded to Five Brights: 8 → 10 points.",
        replacedYakuKey: "fourBrights",
        decisionPanelCount: 1,
      },
    ),
    fixture(
      "PRES-YAKU-004-TWO-WINDOW-TURN",
      "authoritativeTrace",
      ["RULES-6", "RULES-7.2"],
      { kind: "handThenDrawYakuDecisions", sourceFixtureIds: ["KOI-009"] },
      { kind: "chooseKoiKoi" },
      {
        kind: "twoWindowTurn",
        firstDecisionPhase: "hand",
        secondDecisionPhase: "draw",
        secondNewYaku: [ANIMAL_TRIO],
        sequentialDecisionPanelCount: 2,
        tableMultiplierAfterFirstKoiKoi: 2,
      },
    ),
    fixture(
      "PRES-KOI-001-BANK-HAND-AWARD",
      "authoritativeTrace",
      ["RULES-7.1"],
      { kind: "handPhaseBank", sourceFixtureIds: ["KOI-001", "KOI-007"] },
      { kind: "chooseBank" },
      {
        kind: "bankAward",
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 1,
        basePoints: 10,
        awardedPoints: 10,
        bankLabel: "Bank 10 points",
        awardAnnouncement: "Player A banked 10 points.",
        drawRevealed: false,
      },
    ),
    fixture(
      "PRES-KOI-002-CONTINUE-AND-RESUME",
      "authoritativeTrace",
      ["RULES-7.2"],
      { kind: "handPhaseKoiKoi", sourceFixtureIds: ["KOI-002", "KOI-006"] },
      { kind: "chooseKoiKoi" },
      {
        kind: "koiKoiContinuation",
        koiKoiLabel: "Koi-Koi → 2×",
        tableMultiplierAfterChoice: 2,
        callerId: "player-a",
        resumes: "drawPhase",
      },
    ),
    fixture(
      "PRES-KOI-003-PRIVILEGE-SPLIT",
      "authoritativeTrace",
      ["RULES-7.3"],
      {
        kind: "specialPrivilegeDecision",
        sourceFixtureIds: [
          "TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER",
          "TRANS-PRIVILEGED-KOI-JUMPS-TO-3X",
        ],
      },
      { kind: "yakuDecisionRequired", phase: "hand" },
      {
        kind: "privilegeSplit",
        visibleTableMultiplier: 1,
        bankScoringMultiplier: 2,
        basePoints: 10,
        awardedPoints: 20,
        bankLabel: "Bank 10 points × 2× = 20",
        koiKoiLabel: "Koi-Koi → 3×",
        koiKoiTableMultiplier: 3,
      },
    ),
    fixture(
      "PRES-KOI-004-FORCED-KOI",
      "authoritativeTrace",
      ["RULES-9.1"],
      {
        kind: "forcedFinalRoundKoiKoi",
        sourceFixtureIds: ["FINAL-LEADER-FIRST-YAKU-FORCED-KOI", "KOI-016-FINAL-LEADER-FORCED-KOI"],
      },
      { kind: "yakuDecisionRequired", phase: "draw" },
      {
        kind: "forcedKoiKoi",
        bankControlPresent: false,
        koiKoiControlPresent: true,
        explanation: "Bank is unavailable for this decision.",
        tableMultiplierAfterChoice: 2,
      },
    ),
    fixture(
      "PRES-KOI-005-CAP-CALLER",
      "authoritativeTrace",
      ["RULES-7.2"],
      { kind: "tableMultiplierCap", sourceFixtureIds: ["KOI-005"] },
      { kind: "chooseKoiKoi" },
      {
        kind: "cappedKoiKoi",
        koiKoiLabel: "Koi-Koi — table remains 4×",
        tableMultiplierAfterChoice: 4,
        callerChanges: true,
      },
    ),
    fixture(
      "PRES-PRIV-001-SAFE-STATE",
      "presentationModel",
      ["DESIGN-19.6", "DESIGN-24.7"],
      {
        kind: "recipientScopedPublicPresentation",
        sourceFixtureIds: ["INV-OBSERVATION-NO-PRIVATE"],
      },
      { kind: "serializeRecipientView" },
      {
        kind: "safeRecipientState",
        allowedPublicFields: [
          "activeYaku",
          "currentYakuTotal",
          "tableMultiplier",
          "decisionArithmetic",
        ],
        excludedTokens: ["drawPileOrdered", "rng", "checkpoint", "commandId"],
        opponentHandIdentitiesExcluded: true,
        faceDownCardIdentitiesExcluded: true,
      },
    ),
  ]);

const FIXTURE_BY_ID = Object.freeze(
  Object.fromEntries(PHASE_3B_PRESENTATION_FIXTURES.map((entry) => [entry.id, entry])),
) as Readonly<Record<Phase3BPresentationFixtureId, Phase3BPresentationFixture>>;

export function getPhase3BPresentationFixture(
  id: Phase3BPresentationFixtureId,
): Phase3BPresentationFixture {
  return FIXTURE_BY_ID[id];
}
