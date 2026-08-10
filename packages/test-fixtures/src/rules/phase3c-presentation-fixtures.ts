import type { Phase1ADealFixtureId } from "./deal-fixtures";
import type { Phase1DVectorId } from "./phase1d-fixtures";
import type { Phase1EVectorId } from "./phase1e-fixtures";

/**
 * Locked, public-only presentation contracts for Phase 3C. These fixtures do
 * not construct engine state or inject a browser scenario. They bind the
 * round-result UI to already-authoritative Phase 1 deal/lifecycle/projection
 * vectors and keep the transition shell explicitly presentation-only.
 */
export const PHASE_3C_PRESENTATION_FIXTURE_IDS = [
  "PRES-RESULT-001-BANKED-SCORE",
  "PRES-RESULT-002-END-PLAY-LAST-KOI",
  "PRES-RESULT-003-END-PLAY-NO-SCORE",
  "PRES-RESULT-004-FIELD-CANCELLATION",
  "PRES-RESULT-005-LUCKY-WIN-EVIDENCE",
  "PRES-RESULT-006-BOTH-LUCKY-DRAW-EVIDENCE",
  "PRES-RESULT-007-JANUARY-ZERO-TRANSITION",
  "PRES-RESULT-008-PRIVILEGED-BANK-SPLIT",
  "PRES-RESULT-009-MATCH-COMPLETE-WINNER",
  "PRES-RESULT-010-MATCH-COMPLETE-TIE",
  "PRES-RESULT-011-SAFE-PROJECTION",
  "PRES-RESULT-012-MODAL-LOCK",
] as const;

export type Phase3CPresentationFixtureId = (typeof PHASE_3C_PRESENTATION_FIXTURE_IDS)[number];
export type Phase3CPresentationExecution =
  "productionTrace" | "purePresentation" | "defensivePrivacy";

export type Phase3CAuthoritativeSource =
  | { readonly catalog: "phase1aDeal"; readonly id: Phase1ADealFixtureId }
  | { readonly catalog: "phase1dLifecycle"; readonly id: Phase1DVectorId }
  | { readonly catalog: "phase1eProjection"; readonly id: Phase1EVectorId };

type PlayerId = "player-a" | "player-b";
type ResultKind =
  | "bankedScore"
  | "endOfPlayLastKoiCaller"
  | "endOfPlayNoScore"
  | "fieldCancellation"
  | "luckyWin"
  | "bothLuckyDraw";
type ResultReasonCode =
  | "BANKED_SCORE"
  | "END_OF_PLAY_LAST_KOI_CALLER"
  | "END_OF_PLAY_NO_SCORE"
  | "FIELD_FOUR_MONTH_CANCELLED"
  | "LUCKY_FOUR_MONTH"
  | "BOTH_LUCKY_DRAW";

type ResultControlPolicy = {
  readonly kind: "resultModalLock";
  readonly lockedControls: readonly [
    "cardInput",
    "deckPicker",
    "newRound",
    "motionMode",
    "inputMode",
    "fullscreen",
  ];
  readonly focus: "resultAcknowledge";
  readonly dismissal: "acknowledgeOnly";
};

type TransitionShell = {
  readonly kind: "nextRoundShell";
  readonly nextRound: {
    readonly roundNumber: number;
    readonly scheduledMonth: number;
    readonly starterId: PlayerId;
    readonly starterReason:
      | "LOW_MULTIPLIER_LOSER_STARTS"
      | "HIGH_MULTIPLIER_WINNER_STARTS"
      | "JANUARY_ZERO_ALTERNATES"
      | "LATER_ZERO_PRESERVES_STARTER";
    readonly specialPrivilegePlayerId: PlayerId | null;
  };
  readonly actionLabel: "Start another local round";
  readonly actionPolicy: "presentationOnlyLocalRestart";
  readonly prohibitedClaim: "restartIsTheAuthoritativeNextMonth";
};

type MatchCompletionShell = {
  readonly kind: "matchCompleteShell";
  readonly actionLabel: "Start a new local match";
  readonly actionPolicy: "presentationOnlyLocalRestart";
};

type EvidencePolicy =
  | { readonly kind: "none" }
  | {
      readonly kind: "fieldCancellation";
      readonly visibility: "publicAfterCommit";
      readonly completeFieldMonths: readonly number[];
      readonly luckyHandsEvaluated: false;
    }
  | {
      readonly kind: "luckyHands";
      readonly visibility: "publicAfterCommit";
      readonly revealedPlayerIds: readonly PlayerId[];
      readonly fullHandCardsPerPlayer: 8;
      readonly qualificationCopy: string;
    };

type Arithmetic = {
  readonly basePoints: number;
  readonly tableMultiplierAtDecision: number | null;
  readonly scoringMultiplier: number | null;
  readonly awardedPoints: number;
  readonly copy: string;
};

export type Phase3CPresentationGiven =
  | {
      readonly kind: "committedRoundResult";
      readonly authoritativeSources: readonly Phase3CAuthoritativeSource[];
    }
  | {
      readonly kind: "committedAutomaticResult";
      readonly authoritativeSources: readonly Phase3CAuthoritativeSource[];
    }
  | {
      readonly kind: "committedTerminalMatch";
      readonly authoritativeSources: readonly Phase3CAuthoritativeSource[];
    }
  | {
      readonly kind: "recipientScopedObservation";
      readonly authoritativeSources: readonly Phase3CAuthoritativeSource[];
    };

export type Phase3CPresentationWhen =
  | { readonly kind: "renderRoundResult" }
  | { readonly kind: "renderCommittedAutomaticResult" }
  | { readonly kind: "renderMatchComplete" }
  | { readonly kind: "serializeRecipientView" }
  | { readonly kind: "attemptNonResultControl" };

export type Phase3CPresentationThen =
  | {
      readonly kind: "bankedScore";
      readonly resultKind: "bankedScore";
      readonly reasonCode: "BANKED_SCORE";
      readonly scorerId: "player-a";
      readonly heading: "Player A banked 10 points.";
      readonly arithmetic: Arithmetic;
      readonly evidence: { readonly kind: "none" };
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "endOfPlayLastKoiCaller";
      readonly resultKind: "endOfPlayLastKoiCaller";
      readonly reasonCode: "END_OF_PLAY_LAST_KOI_CALLER";
      readonly scorerId: "player-a";
      readonly finalActorId: "player-b";
      readonly heading: "Player A scores as the most recent Koi-Koi caller.";
      readonly arithmetic: Arithmetic;
      readonly evidence: { readonly kind: "none" };
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "endOfPlayNoScore";
      readonly resultKind: "endOfPlayNoScore";
      readonly reasonCode: "END_OF_PLAY_NO_SCORE";
      readonly scorerId: null;
      readonly heading: "Nobody called Koi-Koi, so this round ends 0–0.";
      readonly arithmetic: Arithmetic;
      readonly evidence: { readonly kind: "none" };
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "fieldCancellation";
      readonly resultKind: "fieldCancellation";
      readonly reasonCode: "FIELD_FOUR_MONTH_CANCELLED";
      readonly scorerId: null;
      readonly heading: "The field contains all four January cards. This round is cancelled 0–0.";
      readonly arithmetic: Arithmetic;
      readonly evidence: Extract<EvidencePolicy, { readonly kind: "fieldCancellation" }>;
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "luckyWin";
      readonly resultKind: "luckyWin";
      readonly reasonCode: "LUCKY_FOUR_MONTH";
      readonly scorerId: "player-a";
      readonly heading: "Player A has a lucky hand: Four Cards of the Same Month.";
      readonly arithmetic: Arithmetic;
      readonly evidence: Extract<EvidencePolicy, { readonly kind: "luckyHands" }>;
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "bothLuckyDraw";
      readonly resultKind: "bothLuckyDraw";
      readonly reasonCode: "BOTH_LUCKY_DRAW";
      readonly scorerId: null;
      readonly heading: "Both players have lucky hands. This round ends 0–0.";
      readonly arithmetic: Arithmetic;
      readonly evidence: Extract<EvidencePolicy, { readonly kind: "luckyHands" }>;
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "januaryZeroTransition";
      readonly resultKind: "fieldCancellation" | "endOfPlayNoScore" | "bothLuckyDraw";
      readonly reasonCode:
        "FIELD_FOUR_MONTH_CANCELLED" | "END_OF_PLAY_NO_SCORE" | "BOTH_LUCKY_DRAW";
      readonly heading: "January ended 0–0. The opening player alternates, so Player B starts February.";
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "privilegedBankSplit";
      readonly resultKind: "bankedScore";
      readonly reasonCode: "BANKED_SCORE";
      readonly scorerId: "player-a";
      readonly heading: "Player A used the special 2× Bank privilege.";
      readonly arithmetic: Arithmetic;
      readonly visibleTableCopy: "Table stayed at 1×; this Bank scores at 2×.";
      readonly evidence: { readonly kind: "none" };
      readonly transition: TransitionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "matchCompleteWinner";
      readonly winnerId: "player-a";
      readonly finalScores: { readonly "player-a": 14; readonly "player-b": 8 };
      readonly heading: "Match complete — Player A wins 14–8.";
      readonly completion: MatchCompletionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "matchCompleteTie";
      readonly winnerId: null;
      readonly finalScores: { readonly "player-a": 12; readonly "player-b": 12 };
      readonly heading: "Match complete — tied at 12–12.";
      readonly completion: MatchCompletionShell;
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "safeProjection";
      readonly allowedFields: readonly ["phase", "latestPublicResult", "publicEvents"];
      readonly forbiddenTokens: readonly [
        "opponentHand",
        "drawPile",
        "rng",
        "checkpoint",
        "commandId",
      ];
      readonly automaticEvidencePolicy: "onlyCommittedPublicEvidence";
      readonly controlPolicy: ResultControlPolicy;
    }
  | {
      readonly kind: "modalLock";
      readonly resultKind: ResultKind;
      readonly reasonCode: ResultReasonCode;
      readonly controlPolicy: ResultControlPolicy;
      readonly allowedActionLabel: "Start another local round";
    };

export interface Phase3CPresentationFixture {
  readonly id: Phase3CPresentationFixtureId;
  readonly execution: Phase3CPresentationExecution;
  readonly ruleRefs: readonly [string, ...string[]];
  readonly given: Phase3CPresentationGiven;
  readonly when: Phase3CPresentationWhen;
  readonly then: Phase3CPresentationThen;
}

function phase1aDeal(id: Phase1ADealFixtureId): Phase3CAuthoritativeSource {
  return { catalog: "phase1aDeal", id };
}

function phase1dLifecycle(id: Phase1DVectorId): Phase3CAuthoritativeSource {
  return { catalog: "phase1dLifecycle", id };
}

function phase1eProjection(id: Phase1EVectorId): Phase3CAuthoritativeSource {
  return { catalog: "phase1eProjection", id };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function controls(): ResultControlPolicy {
  return {
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
  };
}

function transition(
  roundNumber: number,
  scheduledMonth: number,
  starterId: PlayerId,
  starterReason: TransitionShell["nextRound"]["starterReason"],
  specialPrivilegePlayerId: PlayerId | null,
): TransitionShell {
  return {
    kind: "nextRoundShell",
    nextRound: { roundNumber, scheduledMonth, starterId, starterReason, specialPrivilegePlayerId },
    actionLabel: "Start another local round",
    actionPolicy: "presentationOnlyLocalRestart",
    prohibitedClaim: "restartIsTheAuthoritativeNextMonth",
  };
}

function fixture(
  id: Phase3CPresentationFixtureId,
  execution: Phase3CPresentationExecution,
  ruleRefs: readonly [string, ...string[]],
  given: Phase3CPresentationGiven,
  when: Phase3CPresentationWhen,
  then: Phase3CPresentationThen,
): Phase3CPresentationFixture {
  return deepFreeze({ id, execution, ruleRefs: [...ruleRefs], given, when, then });
}

export const PHASE_3C_PRESENTATION_FIXTURES: readonly Phase3CPresentationFixture[] = deepFreeze([
  fixture(
    "PRES-RESULT-001-BANKED-SCORE",
    "productionTrace",
    ["RULES-7.1", "RULES-9", "RULES-10"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("KOI-001"),
        phase1dLifecycle("KOI-007"),
        phase1dLifecycle("HIST-RESULT-REASON-CODES"),
      ],
    },
    { kind: "renderRoundResult" },
    {
      kind: "bankedScore",
      resultKind: "bankedScore",
      reasonCode: "BANKED_SCORE",
      scorerId: "player-a",
      heading: "Player A banked 10 points.",
      arithmetic: {
        basePoints: 10,
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 1,
        awardedPoints: 10,
        copy: "10 × 1× = 10",
      },
      evidence: { kind: "none" },
      transition: transition(2, 2, "player-b", "LOW_MULTIPLIER_LOSER_STARTS", "player-b"),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-002-END-PLAY-LAST-KOI",
    "productionTrace",
    ["RULES-8", "RULES-10", "R-008"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("KOI-010"),
        phase1dLifecycle("KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR"),
        phase1dLifecycle("END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED"),
      ],
    },
    { kind: "renderRoundResult" },
    {
      kind: "endOfPlayLastKoiCaller",
      resultKind: "endOfPlayLastKoiCaller",
      reasonCode: "END_OF_PLAY_LAST_KOI_CALLER",
      scorerId: "player-a",
      finalActorId: "player-b",
      heading: "Player A scores as the most recent Koi-Koi caller.",
      arithmetic: {
        basePoints: 5,
        tableMultiplierAtDecision: 2,
        scoringMultiplier: 2,
        awardedPoints: 10,
        copy: "5 × 2× = 10",
      },
      evidence: { kind: "none" },
      transition: transition(2, 2, "player-b", "LOW_MULTIPLIER_LOSER_STARTS", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-003-END-PLAY-NO-SCORE",
    "productionTrace",
    ["RULES-8", "RULES-9", "R-008"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("KOI-011"),
        phase1dLifecycle("END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED"),
        phase1dLifecycle("TRANS-LATER-ZERO-PRESERVES"),
      ],
    },
    { kind: "renderRoundResult" },
    {
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
      transition: transition(3, 3, "player-a", "LATER_ZERO_PRESERVES_STARTER", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-004-FIELD-CANCELLATION",
    "productionTrace",
    ["RULES-3", "RULES-9", "RULES-10", "R-001"],
    {
      kind: "committedAutomaticResult",
      authoritativeSources: [
        phase1aDeal("DEAL-002"),
        phase1dLifecycle("HIST-CANCELLATION-EVIDENCE"),
        phase1dLifecycle("TRANS-JANUARY-ZERO-ALTERNATES"),
      ],
    },
    { kind: "renderCommittedAutomaticResult" },
    {
      kind: "fieldCancellation",
      resultKind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      scorerId: null,
      heading: "The field contains all four January cards. This round is cancelled 0–0.",
      arithmetic: {
        basePoints: 0,
        tableMultiplierAtDecision: null,
        scoringMultiplier: null,
        awardedPoints: 0,
        copy: "0–0",
      },
      evidence: {
        kind: "fieldCancellation",
        visibility: "publicAfterCommit",
        completeFieldMonths: [1],
        luckyHandsEvaluated: false,
      },
      transition: transition(2, 2, "player-b", "JANUARY_ZERO_ALTERNATES", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-005-LUCKY-WIN-EVIDENCE",
    "productionTrace",
    ["RULES-3", "RULES-9", "RULES-10", "R-002", "R-003"],
    {
      kind: "committedAutomaticResult",
      authoritativeSources: [
        phase1aDeal("DEAL-005"),
        phase1dLifecycle("HIST-LUCKY-EVIDENCE"),
        phase1dLifecycle("TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE"),
        phase1eProjection("PROJ-LUCKY-AFTER-COMMIT-REVEALED"),
      ],
    },
    { kind: "renderCommittedAutomaticResult" },
    {
      kind: "luckyWin",
      resultKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_MONTH",
      scorerId: "player-a",
      heading: "Player A has a lucky hand: Four Cards of the Same Month.",
      arithmetic: {
        basePoints: 6,
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 1,
        awardedPoints: 6,
        copy: "6 × 1× = 6",
      },
      evidence: {
        kind: "luckyHands",
        visibility: "publicAfterCommit",
        revealedPlayerIds: ["player-a"],
        fullHandCardsPerPlayer: 8,
        qualificationCopy: "Four Cards of the Same Month",
      },
      transition: transition(2, 2, "player-b", "LOW_MULTIPLIER_LOSER_STARTS", "player-b"),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-006-BOTH-LUCKY-DRAW-EVIDENCE",
    "purePresentation",
    ["RULES-3", "RULES-9", "RULES-10", "R-002", "R-003"],
    {
      kind: "committedAutomaticResult",
      authoritativeSources: [
        phase1aDeal("DEAL-009"),
        phase1aDeal("DEAL-012-BOTH-LUCKY-EVIDENCE"),
        phase1dLifecycle("HIST-LUCKY-EVIDENCE"),
      ],
    },
    { kind: "renderCommittedAutomaticResult" },
    {
      kind: "bothLuckyDraw",
      resultKind: "bothLuckyDraw",
      reasonCode: "BOTH_LUCKY_DRAW",
      scorerId: null,
      heading: "Both players have lucky hands. This round ends 0–0.",
      arithmetic: {
        basePoints: 0,
        tableMultiplierAtDecision: null,
        scoringMultiplier: null,
        awardedPoints: 0,
        copy: "0–0",
      },
      evidence: {
        kind: "luckyHands",
        visibility: "publicAfterCommit",
        revealedPlayerIds: ["player-a", "player-b"],
        fullHandCardsPerPlayer: 8,
        qualificationCopy: "Both lucky hands are revealed after the result commits.",
      },
      transition: transition(2, 2, "player-b", "JANUARY_ZERO_ALTERNATES", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-007-JANUARY-ZERO-TRANSITION",
    "purePresentation",
    ["RULES-9", "R-011"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("TRANS-JANUARY-ZERO-ALTERNATES"),
        phase1dLifecycle("TRANS-ZERO-CLEARS-PRIVILEGE"),
      ],
    },
    { kind: "renderRoundResult" },
    {
      kind: "januaryZeroTransition",
      resultKind: "endOfPlayNoScore",
      reasonCode: "END_OF_PLAY_NO_SCORE",
      heading: "January ended 0–0. The opening player alternates, so Player B starts February.",
      transition: transition(2, 2, "player-b", "JANUARY_ZERO_ALTERNATES", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-008-PRIVILEGED-BANK-SPLIT",
    "purePresentation",
    ["RULES-7.3", "RULES-9", "R-012"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER"),
        phase1dLifecycle("TRANS-PRIVILEGED-BANK-STARTER"),
      ],
    },
    { kind: "renderRoundResult" },
    {
      kind: "privilegedBankSplit",
      resultKind: "bankedScore",
      reasonCode: "BANKED_SCORE",
      scorerId: "player-a",
      heading: "Player A used the special 2× Bank privilege.",
      arithmetic: {
        basePoints: 10,
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 2,
        awardedPoints: 20,
        copy: "10 × 2× = 20",
      },
      visibleTableCopy: "Table stayed at 1×; this Bank scores at 2×.",
      evidence: { kind: "none" },
      transition: transition(2, 2, "player-b", "LOW_MULTIPLIER_LOSER_STARTS", null),
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-009-MATCH-COMPLETE-WINNER",
    "purePresentation",
    ["RULES-9.2", "RULES-10", "R-013"],
    {
      kind: "committedTerminalMatch",
      authoritativeSources: [
        phase1dLifecycle("FINAL-MONTH-LUCKY-WINNER-ENDS"),
        phase1dLifecycle("FINAL-LEADER-PRIVILEGED-BANK"),
      ],
    },
    { kind: "renderMatchComplete" },
    {
      kind: "matchCompleteWinner",
      winnerId: "player-a",
      finalScores: { "player-a": 14, "player-b": 8 },
      heading: "Match complete — Player A wins 14–8.",
      completion: {
        kind: "matchCompleteShell",
        actionLabel: "Start a new local match",
        actionPolicy: "presentationOnlyLocalRestart",
      },
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-010-MATCH-COMPLETE-TIE",
    "purePresentation",
    ["RULES-9.1", "RULES-9.2", "RULES-10", "R-013"],
    {
      kind: "committedTerminalMatch",
      authoritativeSources: [
        phase1dLifecycle("FINAL-TIE-PROTECTS-NONE"),
        phase1dLifecycle("FINAL-MONTH-BOTH-LUCKY-ENDS"),
      ],
    },
    { kind: "renderMatchComplete" },
    {
      kind: "matchCompleteTie",
      winnerId: null,
      finalScores: { "player-a": 12, "player-b": 12 },
      heading: "Match complete — tied at 12–12.",
      completion: {
        kind: "matchCompleteShell",
        actionLabel: "Start a new local match",
        actionPolicy: "presentationOnlyLocalRestart",
      },
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-011-SAFE-PROJECTION",
    "defensivePrivacy",
    ["DESIGN-19.6", "DESIGN-24.7"],
    {
      kind: "recipientScopedObservation",
      authoritativeSources: [
        phase1eProjection("INV-OBSERVATION-NO-PRIVATE"),
        phase1eProjection("PROJ-LUCKY-BEFORE-COMMIT-HIDDEN"),
      ],
    },
    { kind: "serializeRecipientView" },
    {
      kind: "safeProjection",
      allowedFields: ["phase", "latestPublicResult", "publicEvents"],
      forbiddenTokens: ["opponentHand", "drawPile", "rng", "checkpoint", "commandId"],
      automaticEvidencePolicy: "onlyCommittedPublicEvidence",
      controlPolicy: controls(),
    },
  ),
  fixture(
    "PRES-RESULT-012-MODAL-LOCK",
    "purePresentation",
    ["DESIGN-20.4", "DESIGN-24.7"],
    {
      kind: "committedRoundResult",
      authoritativeSources: [
        phase1dLifecycle("KOI-007"),
        phase1dLifecycle("HIST-RESULT-REASON-CODES"),
      ],
    },
    { kind: "attemptNonResultControl" },
    {
      kind: "modalLock",
      resultKind: "bankedScore",
      reasonCode: "BANKED_SCORE",
      controlPolicy: controls(),
      allowedActionLabel: "Start another local round",
    },
  ),
]);

const FIXTURE_BY_ID = deepFreeze(
  Object.fromEntries(
    PHASE_3C_PRESENTATION_FIXTURES.map((fixture) => [fixture.id, fixture]),
  ) as Record<Phase3CPresentationFixtureId, Phase3CPresentationFixture>,
);

export function getPhase3CPresentationFixture(
  id: Phase3CPresentationFixtureId,
): Phase3CPresentationFixture {
  return FIXTURE_BY_ID[id];
}
