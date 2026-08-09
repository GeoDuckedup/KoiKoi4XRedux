import type { CardId, MatchLength, PlayerId } from "@koikoi4x/engine";

import { buildOrderedDeck, type InitialDealAllocation } from "./deal-fixture-builder";
import type { RuleFixtureSpec } from "./fixture-types";

export const PHASE_1A_DEAL_FIXTURE_IDS = [
  "DEAL-001",
  "DEAL-002",
  "DEAL-003",
  "DEAL-004",
  "DEAL-005",
  "DEAL-006",
  "DEAL-007",
  "DEAL-008",
  "DEAL-009",
  "DEAL-010",
  "DEAL-011",
  "DEAL-012-BOTH-LUCKY-EVIDENCE",
] as const;

export type Phase1ADealFixtureId = (typeof PHASE_1A_DEAL_FIXTURE_IDS)[number];

export interface NewMatchFixtureState {
  readonly matchId: string;
  readonly matchLength: MatchLength;
  readonly stateVersion: 0;
}

export interface ResolveOpeningDealFixtureAction {
  readonly type: "startMatchFromOrderedDeck";
  readonly commandId: string;
  readonly starterId: PlayerId;
  readonly orderedDeck: readonly CardId[];
}

export type Phase1ADealFixture = RuleFixtureSpec<
  NewMatchFixtureState,
  ResolveOpeningDealFixtureAction
> & { readonly id: Phase1ADealFixtureId };

const JANUARY = [
  "january-crane",
  "january-red-text-scroll",
  "january-pine-plain-a",
  "january-pine-plain-b",
] as const satisfies readonly CardId[];
const FEBRUARY = [
  "february-bush-warbler",
  "february-red-text-scroll",
  "february-plum-plain-a",
  "february-plum-plain-b",
] as const satisfies readonly CardId[];
const APRIL = [
  "april-cuckoo",
  "april-red-scroll",
  "april-wisteria-plain-a",
  "april-wisteria-plain-b",
] as const satisfies readonly CardId[];
const MAY = [
  "may-bridge",
  "may-red-scroll",
  "may-iris-plain-a",
  "may-iris-plain-b",
] as const satisfies readonly CardId[];
const JUNE = [
  "june-butterfly",
  "june-blue-scroll",
  "june-peony-plain-a",
  "june-peony-plain-b",
] as const satisfies readonly CardId[];
const SEPTEMBER = [
  "september-sake-cup",
  "september-blue-scroll",
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
] as const satisfies readonly CardId[];

function defineFixture(
  id: Phase1ADealFixtureId,
  description: string,
  allocation: InitialDealAllocation,
  state: Phase1ADealFixture["then"]["state"],
  visibility?: Phase1ADealFixture["then"]["visibility"],
): Phase1ADealFixture {
  const eventTypes =
    state.openingKind === "normal"
      ? ([{ type: "roundReady", audience: "public" }] as const)
      : state.openingKind === "fieldCancellation"
        ? ([
            { type: "initialFieldCancellationDetected", audience: "public" },
            { type: "automaticRoundResultCommitted", audience: "public" },
          ] as const)
        : ([
            { type: "luckyHandDetected", audience: "serverOnly" },
            { type: "automaticRoundResultCommitted", audience: "public" },
            { type: "luckyHandEvidenceRevealed", audience: "public" },
          ] as const);
  return Object.freeze({
    id,
    ruleRefs: Object.freeze(
      state.openingKind === "fieldCancellation" ? ["R-001"] : ["R-001", "R-002", "R-003"],
    ),
    description,
    given: Object.freeze({
      matchId: `fixture-${id.toLowerCase()}`,
      matchLength: 12,
      stateVersion: 0,
    }),
    when: Object.freeze([
      Object.freeze({
        type: "startMatchFromOrderedDeck",
        commandId: `setup-${id.toLowerCase()}`,
        starterId: "player-a",
        orderedDeck: buildOrderedDeck(allocation),
      }),
    ]),
    then: Object.freeze({
      state: Object.freeze(state),
      events: Object.freeze(eventTypes),
      ...(visibility === undefined ? {} : { visibility: Object.freeze(visibility) }),
    }),
  });
}

const NORMAL_A = [
  "january-crane",
  "february-bush-warbler",
  "march-curtain",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "august-moon",
] as const satisfies readonly CardId[];
const NORMAL_B = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "april-red-scroll",
  "september-sake-cup",
  "october-deer",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];
const NORMAL_FIELD = [
  "january-pine-plain-a",
  "february-plum-plain-a",
  "march-cherry-plain-a",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
  "august-geese",
] as const satisfies readonly CardId[];

const zeroPoints = Object.freeze({ "player-a": 0, "player-b": 0 });

export const PHASE_1A_DEAL_FIXTURES: readonly Phase1ADealFixture[] = Object.freeze([
  defineFixture(
    "DEAL-001",
    "Deterministic normal deal records 8/8/8/24 zones and a starter.",
    { playerAHand: NORMAL_A, playerBHand: NORMAL_B, field: NORMAL_FIELD },
    {
      openingKind: "normal",
      reasonCode: null,
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [],
      evidencePlayerIds: [],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-002",
    "One complete field month cancels at 0–0 without a redeal.",
    {
      playerAHand: [
        "february-bush-warbler",
        "march-curtain",
        "april-cuckoo",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "september-sake-cup",
        "october-deer",
      ],
      playerBHand: [
        "february-red-text-scroll",
        "march-red-text-scroll",
        "april-red-scroll",
        "may-iris-plain-a",
        "june-peony-plain-a",
        "july-bush-clover-plain-a",
        "september-blue-scroll",
        "october-blue-scroll",
      ],
      field: [...JANUARY, "may-bridge", "june-butterfly", "july-boar", "august-moon"],
    },
    {
      openingKind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [1],
      evidencePlayerIds: [],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-003",
    "Field cancellation takes precedence over a private lucky hand.",
    {
      playerAHand: [
        ...APRIL,
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
      playerBHand: [
        "february-bush-warbler",
        "march-curtain",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "september-blue-scroll",
        "october-blue-scroll",
        "november-swallow",
      ],
      field: [...JANUARY, "may-bridge", "june-butterfly", "july-boar", "august-moon"],
    },
    {
      openingKind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [1],
      evidencePlayerIds: [],
      ordinaryYakuPoints: 0,
    },
    {
      publicBeforeCommitContainsLuckyEvidence: false,
      publicEvidencePlayerIdsAfterCommit: [],
    },
  ),
  defineFixture(
    "DEAL-004",
    "Two complete field months are both retained as cancellation evidence.",
    {
      playerAHand: [
        "march-curtain",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
        "september-sake-cup",
        "october-deer",
      ],
      playerBHand: [
        "march-red-text-scroll",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "august-geese",
        "november-rain",
        "december-phoenix",
      ],
      field: [...JANUARY, ...FEBRUARY],
    },
    {
      openingKind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [1, 2],
      evidencePlayerIds: [],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-005",
    "One complete-month hand wins one automatic 6-point result.",
    {
      playerAHand: [...APRIL, "may-bridge", "june-butterfly", "july-boar", "august-moon"],
      playerBHand: [
        "january-crane",
        "february-bush-warbler",
        "march-curtain",
        "may-red-scroll",
        "june-blue-scroll",
        "september-sake-cup",
        "october-deer",
        "november-rain",
      ],
      field: [
        "january-red-text-scroll",
        "february-red-text-scroll",
        "march-red-text-scroll",
        "july-red-scroll",
        "august-geese",
        "september-blue-scroll",
        "october-blue-scroll",
        "december-phoenix",
      ],
    },
    {
      openingKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_MONTH",
      winnerId: "player-a",
      pointDeltas: { "player-a": 6, "player-b": 0 },
      completeEvidenceMonths: [4],
      evidencePlayerIds: ["player-a"],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-006",
    "Two complete months in one hand still award only 6 points.",
    {
      playerAHand: [...JANUARY, ...FEBRUARY],
      playerBHand: [
        "march-curtain",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
        "september-sake-cup",
        "october-deer",
      ],
      field: [
        "march-red-text-scroll",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "august-geese",
        "november-rain",
        "december-phoenix",
      ],
    },
    {
      openingKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_MONTH",
      winnerId: "player-a",
      pointDeltas: { "player-a": 6, "player-b": 0 },
      completeEvidenceMonths: [1, 2],
      evidencePlayerIds: ["player-a"],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-007",
    "Exactly four distinct month pairs produce a 6-point lucky result.",
    {
      playerAHand: [
        "january-crane",
        "january-red-text-scroll",
        "february-bush-warbler",
        "february-red-text-scroll",
        "march-curtain",
        "march-red-text-scroll",
        "april-cuckoo",
        "april-red-scroll",
      ],
      playerBHand: [
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
      field: NORMAL_FIELD,
    },
    {
      openingKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_PAIRS",
      winnerId: "player-a",
      pointDeltas: { "player-a": 6, "player-b": 0 },
      completeEvidenceMonths: [1, 2, 3, 4],
      evidencePlayerIds: ["player-a"],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-008",
    "A [3,2,2,1] hand does not qualify as four pairs.",
    {
      playerAHand: [
        "january-crane",
        "january-red-text-scroll",
        "january-pine-plain-a",
        "february-bush-warbler",
        "february-red-text-scroll",
        "march-curtain",
        "march-red-text-scroll",
        "april-cuckoo",
      ],
      playerBHand: [
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
      field: [
        "january-pine-plain-b",
        "february-plum-plain-a",
        "march-cherry-plain-a",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "august-geese",
      ],
    },
    {
      openingKind: "normal",
      reasonCode: null,
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [],
      evidencePlayerIds: [],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-009",
    "Two lucky players produce a 0–0 automatic draw.",
    {
      playerAHand: [...APRIL, "may-bridge", "june-butterfly", "july-boar", "august-moon"],
      playerBHand: [
        ...SEPTEMBER,
        "january-crane",
        "february-bush-warbler",
        "march-curtain",
        "december-phoenix",
      ],
      field: [
        "january-red-text-scroll",
        "february-red-text-scroll",
        "march-red-text-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "august-geese",
        "october-deer",
      ],
    },
    {
      openingKind: "bothLuckyDraw",
      reasonCode: "BOTH_LUCKY_DRAW",
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [4, 9],
      evidencePlayerIds: ["player-a", "player-b"],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-010",
    "Lucky hand cards never also score ordinary capture-area yaku.",
    {
      playerAHand: [
        ...JANUARY,
        "march-curtain",
        "august-moon",
        "september-sake-cup",
        "december-phoenix",
      ],
      playerBHand: [
        "february-bush-warbler",
        "march-red-text-scroll",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "october-deer",
        "november-rain",
      ],
      field: [
        "february-red-text-scroll",
        "march-cherry-plain-a",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "october-blue-scroll",
        "november-swallow",
      ],
    },
    {
      openingKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_MONTH",
      winnerId: "player-a",
      pointDeltas: { "player-a": 6, "player-b": 0 },
      completeEvidenceMonths: [1],
      evidencePlayerIds: ["player-a"],
      ordinaryYakuPoints: 0,
    },
  ),
  defineFixture(
    "DEAL-011",
    "Lucky evidence is private before commit and public afterward.",
    {
      playerAHand: [
        "may-bridge",
        "may-red-scroll",
        "june-butterfly",
        "june-blue-scroll",
        "july-boar",
        "july-red-scroll",
        "august-moon",
        "august-geese",
      ],
      playerBHand: NORMAL_B,
      field: [
        "january-pine-plain-a",
        "february-plum-plain-a",
        "march-cherry-plain-a",
        "april-wisteria-plain-a",
        "september-blue-scroll",
        "october-blue-scroll",
        "november-swallow",
        "december-paulownia-plain-a",
      ],
    },
    {
      openingKind: "luckyWin",
      reasonCode: "LUCKY_FOUR_PAIRS",
      winnerId: "player-a",
      pointDeltas: { "player-a": 6, "player-b": 0 },
      completeEvidenceMonths: [5, 6, 7, 8],
      evidencePlayerIds: ["player-a"],
      ordinaryYakuPoints: 0,
    },
    {
      publicBeforeCommitContainsLuckyEvidence: false,
      publicEvidencePlayerIdsAfterCommit: ["player-a"],
    },
  ),
  defineFixture(
    "DEAL-012-BOTH-LUCKY-EVIDENCE",
    "Both-lucky draw reveals both complete hands and qualifications after commit.",
    {
      playerAHand: [
        "january-crane",
        "january-red-text-scroll",
        "february-bush-warbler",
        "february-red-text-scroll",
        "march-curtain",
        "march-red-text-scroll",
        "april-cuckoo",
        "april-red-scroll",
      ],
      playerBHand: [...MAY, ...JUNE],
      field: [
        "july-boar",
        "july-red-scroll",
        "august-moon",
        "august-geese",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
    },
    {
      openingKind: "bothLuckyDraw",
      reasonCode: "BOTH_LUCKY_DRAW",
      winnerId: null,
      pointDeltas: zeroPoints,
      completeEvidenceMonths: [1, 2, 3, 4, 5, 6],
      evidencePlayerIds: ["player-a", "player-b"],
      ordinaryYakuPoints: 0,
    },
    {
      publicBeforeCommitContainsLuckyEvidence: false,
      publicEvidencePlayerIdsAfterCommit: ["player-a", "player-b"],
    },
  ),
]);
