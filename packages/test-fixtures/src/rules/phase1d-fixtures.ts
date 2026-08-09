export const PHASE_1D_VECTOR_IDS = [
  "KOI-001",
  "KOI-002",
  "KOI-003",
  "KOI-004",
  "KOI-005",
  "KOI-006",
  "KOI-007",
  "KOI-008",
  "KOI-009",
  "KOI-010",
  "KOI-011",
  "KOI-012A-FINAL-DRAW-1X-TO-2X",
  "KOI-012B-FINAL-DRAW-2X-TO-3X",
  "KOI-012C-FINAL-DRAW-3X-TO-4X",
  "KOI-013-FINAL-DRAW-AT-4X",
  "KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR",
  "KOI-015A-FINAL-DRAW-PRIVILEGED-BANK",
  "KOI-015B-FINAL-DRAW-PRIVILEGED-KOI",
  "KOI-016-FINAL-LEADER-FORCED-KOI",
  "END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED",
  "TRANS-1X-LOSER-STARTS-PRIVILEGE",
  "TRANS-2X-LOSER-STARTS-NO-PRIVILEGE",
  "TRANS-3X-WINNER-STARTS",
  "TRANS-4X-WINNER-STARTS",
  "TRANS-JANUARY-ZERO-ALTERNATES",
  "TRANS-LATER-ZERO-PRESERVES",
  "TRANS-ZERO-CLEARS-PRIVILEGE",
  "TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER",
  "TRANS-PRIVILEGED-BANK-STARTER",
  "TRANS-PRIVILEGED-KOI-JUMPS-TO-3X",
  "TRANS-PRIVILEGE-LOST-AFTER-TABLE-RISE",
  "TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE",
  "FINAL-LEADER-FROZEN",
  "FINAL-LEADER-FIRST-YAKU-FORCED-KOI",
  "FINAL-OPPONENT-FIRST-REMOVES-RESTRICTION",
  "FINAL-LEADER-PRIVILEGED-BANK",
  "FINAL-TIE-PROTECTS-NONE",
  "FINAL-MONTH-CANCELLED-ENDS",
  "FINAL-MONTH-BOTH-LUCKY-ENDS",
  "FINAL-MONTH-NATURAL-ZERO-ENDS",
  "FINAL-MONTH-LUCKY-WINNER-ENDS",
  "FINAL-RULE-3-ROUND",
  "FINAL-RULE-6-ROUND",
  "FINAL-RULE-12-ROUND",
  "HIST-RESULT-REASON-CODES",
  "HIST-LUCKY-EVIDENCE",
  "HIST-CANCELLATION-EVIDENCE",
] as const;

export type Phase1DVectorId = (typeof PHASE_1D_VECTOR_IDS)[number];

export interface Phase1DVectorFixture {
  readonly id: Phase1DVectorId;
  readonly ruleRefs: readonly string[];
  readonly description: string;
  readonly execution: "reachable" | "unreachablePolicy";
  readonly then: Readonly<Record<string, string | number | boolean | null>>;
}

function fixture(
  id: Phase1DVectorId,
  ruleRefs: readonly string[],
  description: string,
  then: Readonly<Record<string, string | number | boolean | null>>,
  execution: Phase1DVectorFixture["execution"] = "reachable",
): Phase1DVectorFixture {
  return Object.freeze({
    id,
    ruleRefs: Object.freeze([...ruleRefs]),
    description,
    execution,
    then: Object.freeze({ ...then }),
  });
}

export const PHASE_1D_VECTOR_FIXTURES: readonly Phase1DVectorFixture[] = Object.freeze([
  fixture("KOI-001", ["RULES-7.1"], "Ordinary 1x Bank.", {
    result: "bankedScore",
    table: 1,
    scoring: 1,
  }),
  fixture("KOI-002", ["RULES-7.2"], "Ordinary Koi-Koi from 1x.", { result: "continue", table: 2 }),
  fixture("KOI-003", ["RULES-7.2"], "Ordinary Koi-Koi from 2x.", { result: "continue", table: 3 }),
  fixture("KOI-004", ["RULES-7.2"], "Ordinary Koi-Koi from 3x.", { result: "continue", table: 4 }),
  fixture("KOI-005", ["RULES-7.2"], "Koi-Koi at the 4x cap updates caller.", {
    result: "continue",
    table: 4,
    callerChanges: true,
  }),
  fixture("KOI-006", ["RULES-7.2", "R-006"], "Hand Koi-Koi resumes Draw.", {
    resume: "drawPhase",
    drawRevealed: true,
  }),
  fixture("KOI-007", ["RULES-7.1"], "Hand Bank skips Draw.", {
    result: "bankedScore",
    drawRevealed: false,
  }),
  fixture("KOI-008", ["RULES-6", "R-005"], "Several new yaku share one decision.", {
    decisions: 1,
    includesEveryNewYaku: true,
  }),
  fixture("KOI-009", ["RULES-6", "R-006"], "Hand and Draw can create separate decisions.", {
    decisions: 2,
    phases: "hand,draw",
  }),
  fixture("KOI-010", ["RULES-8", "R-008"], "Latest caller scores at End of Play.", {
    reason: "END_OF_PLAY_LAST_KOI_CALLER",
    scorer: "latestCaller",
  }),
  fixture("KOI-011", ["RULES-8", "R-008"], "No caller produces a zero result.", {
    reason: "END_OF_PLAY_NO_SCORE",
    awarded: 0,
  }),
  fixture("KOI-012A-FINAL-DRAW-1X-TO-2X", ["RULES-8", "R-009"], "Final Draw Koi 1x to 2x.", {
    table: 2,
    scoring: 2,
  }),
  fixture("KOI-012B-FINAL-DRAW-2X-TO-3X", ["RULES-8", "R-009"], "Final Draw Koi 2x to 3x.", {
    table: 3,
    scoring: 3,
  }),
  fixture("KOI-012C-FINAL-DRAW-3X-TO-4X", ["RULES-8", "R-009"], "Final Draw Koi 3x to 4x.", {
    table: 4,
    scoring: 4,
  }),
  fixture(
    "KOI-013-FINAL-DRAW-AT-4X",
    ["RULES-8", "R-009"],
    "Final Draw Koi at cap changes scorer.",
    { table: 4, scorer: "finalActor" },
  ),
  fixture(
    "KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR",
    ["RULES-8", "R-008"],
    "Earlier latest caller scores.",
    { scorer: "latestCaller", finalActorScores: false },
  ),
  fixture(
    "KOI-015A-FINAL-DRAW-PRIVILEGED-BANK",
    ["RULES-7.3", "RULES-8", "R-012"],
    "A final-Draw actor cannot hold the starter-only privilege; the Bank premise is rejected.",
    { validationCode: "ROUND_PRIVILEGE_INVALID", commandAccepted: false },
    "unreachablePolicy",
  ),
  fixture(
    "KOI-015B-FINAL-DRAW-PRIVILEGED-KOI",
    ["RULES-7.3", "RULES-8", "R-012"],
    "A final-Draw actor cannot hold the starter-only privilege; the Koi-Koi premise is rejected.",
    { validationCode: "ROUND_PRIVILEGE_INVALID", commandAccepted: false },
    "unreachablePolicy",
  ),
  fixture(
    "KOI-016-FINAL-LEADER-FORCED-KOI",
    ["RULES-9.1", "R-010"],
    "Protected leader must call on first 1x trigger.",
    { bankAvailable: false, table: 2 },
  ),
  fixture(
    "END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED",
    ["RULES-8"],
    "Natural play exhausts both hands.",
    { turns: 16, revealedDraws: 16, unusedDraws: 8 },
  ),
  fixture("TRANS-1X-LOSER-STARTS-PRIVILEGE", ["RULES-9"], "1x loser starts with privilege.", {
    starter: "loser",
    privilege: true,
  }),
  fixture("TRANS-2X-LOSER-STARTS-NO-PRIVILEGE", ["RULES-9"], "2x loser starts without privilege.", {
    starter: "loser",
    privilege: false,
  }),
  fixture("TRANS-3X-WINNER-STARTS", ["RULES-9"], "3x winner starts.", {
    starter: "winner",
    privilege: false,
  }),
  fixture("TRANS-4X-WINNER-STARTS", ["RULES-9"], "4x winner starts.", {
    starter: "winner",
    privilege: false,
  }),
  fixture(
    "TRANS-JANUARY-ZERO-ALTERNATES",
    ["RULES-9", "R-011"],
    "January zero alternates starter.",
    { starter: "opposite", privilege: false },
  ),
  fixture("TRANS-LATER-ZERO-PRESERVES", ["RULES-9", "R-011"], "Later zero preserves starter.", {
    starter: "same",
    privilege: false,
  }),
  fixture("TRANS-ZERO-CLEARS-PRIVILEGE", ["RULES-9", "R-011"], "Zero result clears privilege.", {
    privilege: false,
    awarded: 0,
  }),
  fixture(
    "TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER",
    ["RULES-7.3", "R-012"],
    "Privileged Bank records visible and scoring multipliers.",
    { table: 1, scoring: 2 },
  ),
  fixture(
    "TRANS-PRIVILEGED-BANK-STARTER",
    ["RULES-9", "R-012"],
    "Privileged Bank follows 2x starter rule.",
    { starter: "loser", privilege: false },
  ),
  fixture(
    "TRANS-PRIVILEGED-KOI-JUMPS-TO-3X",
    ["RULES-7.3", "R-012"],
    "Privileged Koi jumps to 3x.",
    { fromTable: 1, table: 3 },
  ),
  fixture(
    "TRANS-PRIVILEGE-LOST-AFTER-TABLE-RISE",
    ["RULES-7.3", "R-012"],
    "Table rise removes unused privilege.",
    { privilege: false, bankScoring: "table" },
  ),
  fixture(
    "TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE",
    ["RULES-9", "R-002"],
    "Lucky winner behaves as 1x.",
    { starter: "loser", privilege: true },
  ),
  fixture(
    "FINAL-LEADER-FROZEN",
    ["RULES-9.1", "R-010"],
    "Leader is frozen before the final round.",
    { recomputed: false, tieProtects: false },
  ),
  fixture(
    "FINAL-LEADER-FIRST-YAKU-FORCED-KOI",
    ["RULES-9.1", "R-010"],
    "Leader first trigger forces Koi.",
    { bankAvailable: false, koiAvailable: true },
  ),
  fixture(
    "FINAL-OPPONENT-FIRST-REMOVES-RESTRICTION",
    ["RULES-9.1", "R-010"],
    "Opponent first trigger removes restriction.",
    { bankAvailableLater: true },
  ),
  fixture(
    "FINAL-LEADER-PRIVILEGED-BANK",
    ["RULES-9.1", "R-010", "R-012"],
    "Privilege permits protected leader Bank.",
    { bankAvailable: true, scoring: 2 },
  ),
  fixture(
    "FINAL-TIE-PROTECTS-NONE",
    ["RULES-9.1", "R-010"],
    "Tied final-round scores protect nobody.",
    { frozenLeader: null, bankAvailable: true },
  ),
  fixture(
    "FINAL-MONTH-CANCELLED-ENDS",
    ["RULES-9.2", "R-013"],
    "Final cancellation completes match.",
    { status: "complete", replacementRound: false },
  ),
  fixture(
    "FINAL-MONTH-BOTH-LUCKY-ENDS",
    ["RULES-9.2", "R-013"],
    "Final both-lucky draw completes match.",
    { status: "complete", awarded: 0 },
  ),
  fixture(
    "FINAL-MONTH-NATURAL-ZERO-ENDS",
    ["RULES-9.2", "R-013"],
    "Final natural zero completes match.",
    { status: "complete", awarded: 0 },
  ),
  fixture(
    "FINAL-MONTH-LUCKY-WINNER-ENDS",
    ["RULES-9.2", "R-013"],
    "Final lucky win awards six and completes.",
    { status: "complete", awarded: 6 },
  ),
  fixture("FINAL-RULE-3-ROUND", ["RULES-9.1"], "March is final in 3-round format.", {
    matchLength: 3,
    finalMonth: 3,
  }),
  fixture("FINAL-RULE-6-ROUND", ["RULES-9.1"], "June is final in 6-round format.", {
    matchLength: 6,
    finalMonth: 6,
  }),
  fixture("FINAL-RULE-12-ROUND", ["RULES-9.1"], "December is final in 12-round format.", {
    matchLength: 12,
    finalMonth: 12,
  }),
  fixture(
    "HIST-RESULT-REASON-CODES",
    ["RULES-10"],
    "Every result stores canonical reason and arithmetic.",
    { reasonRequired: true, arithmeticRequired: true },
  ),
  fixture(
    "HIST-LUCKY-EVIDENCE",
    ["RULES-10", "R-002", "R-003"],
    "Lucky history retains revealed hand evidence.",
    { fullHandCards: 8, basePoints: 6, scoring: 1 },
  ),
  fixture(
    "HIST-CANCELLATION-EVIDENCE",
    ["RULES-10", "R-001"],
    "Cancellation history retains complete field months.",
    { awarded: 0, evidenceRequired: true },
  ),
]);

const PHASE_1D_VECTOR_FIXTURE_BY_ID = Object.freeze(
  Object.fromEntries(PHASE_1D_VECTOR_FIXTURES.map((entry) => [entry.id, entry])),
) as Readonly<Record<Phase1DVectorId, Phase1DVectorFixture>>;

export function getPhase1DVectorFixture(id: Phase1DVectorId): Phase1DVectorFixture {
  return PHASE_1D_VECTOR_FIXTURE_BY_ID[id];
}
