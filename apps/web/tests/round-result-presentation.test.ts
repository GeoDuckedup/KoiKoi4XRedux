import {
  deepFreeze,
  type MatchResultV1,
  type NextRoundPlanV1,
  type PlayerObservationV1,
  type RoundResultEvidenceV1,
  type RoundResultKindV1,
  type RoundResultReasonCodeV1,
  type RoundResultV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createRoundResultPresentation } from "../src/game/round-result-presentation";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";

const animals = deepFreeze({ key: "animals" as const, name: "Animals" as const, points: 3 });
const fieldEvidence = deepFreeze({
  kind: "fieldCancellation" as const,
  completeFieldMonths: [
    {
      month: 1 as const,
      cardIds: [
        "january-crane",
        "january-red-text-scroll",
        "january-pine-plain-a",
        "january-pine-plain-b",
      ] as const,
    },
  ],
} satisfies RoundResultEvidenceV1);
const luckyEvidence = deepFreeze({
  kind: "luckyHands" as const,
  hands: [
    {
      playerId: "player-a" as const,
      fullHand: [
        "january-crane",
        "february-bush-warbler",
        "march-curtain",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
      ] as const,
      qualification: {
        kind: "fourMonth" as const,
        completeMonths: [
          {
            month: 1 as const,
            cardIds: [
              "january-crane",
              "january-red-text-scroll",
              "january-pine-plain-a",
              "january-pine-plain-b",
            ] as const,
          },
        ],
      },
    },
  ],
} satisfies RoundResultEvidenceV1);
const luckyHand = luckyEvidence.hands[0];
if (luckyHand === undefined) throw new Error("LUCKY_TEST_EVIDENCE_MISSING");

function plan(overrides: Partial<NextRoundPlanV1> = {}): NextRoundPlanV1 {
  return deepFreeze({
    roundNumber: 2,
    scheduledMonth: 2,
    starterId: "player-b",
    starterReason: "LOW_MULTIPLIER_LOSER_STARTS",
    specialPrivilege: null,
    ...overrides,
  });
}

function result(
  input: {
    readonly kind?: RoundResultKindV1;
    readonly reasonCode?: RoundResultReasonCodeV1;
    readonly scorerId?: "player-a" | "player-b" | null;
    readonly activeYaku?: readonly (typeof animals)[];
    readonly basePoints?: number;
    readonly tableMultiplierAtDecision?: 1 | 2 | 3 | 4 | null;
    readonly scoringMultiplier?: 1 | 2 | 3 | 4 | null;
    readonly awardedPoints?: number;
    readonly pointDeltas?: { readonly "player-a": number; readonly "player-b": number };
    readonly evidence?: RoundResultEvidenceV1;
    readonly nextRound?: NextRoundPlanV1 | null;
    readonly matchScoresAfter?: { readonly "player-a": number; readonly "player-b": number };
  } = {},
): RoundResultV1 {
  const kind = input.kind ?? "bankedScore";
  const automatic = kind === "fieldCancellation" || kind === "bothLuckyDraw";
  const noScore = kind === "endOfPlayNoScore" || automatic;
  const lucky = kind === "luckyWin";
  const scorerId = input.scorerId ?? (noScore ? null : "player-a");
  const basePoints = input.basePoints ?? (lucky ? 6 : noScore ? 0 : 3);
  const scoringMultiplier = input.scoringMultiplier ?? (noScore ? null : 1);
  const awardedPoints =
    input.awardedPoints ?? (noScore ? 0 : basePoints * (scoringMultiplier ?? 1));
  const reasonByKind: Record<RoundResultKindV1, RoundResultReasonCodeV1> = {
    bankedScore: "BANKED_SCORE",
    endOfPlayLastKoiCaller: "END_OF_PLAY_LAST_KOI_CALLER",
    endOfPlayNoScore: "END_OF_PLAY_NO_SCORE",
    fieldCancellation: "FIELD_FOUR_MONTH_CANCELLED",
    luckyWin: "LUCKY_FOUR_MONTH",
    bothLuckyDraw: "BOTH_LUCKY_DRAW",
  };
  return deepFreeze({
    roundNumber: 1,
    scheduledMonth: 1,
    starterId: "player-a",
    kind,
    reasonCode: input.reasonCode ?? reasonByKind[kind],
    scorerId,
    pointDeltas:
      input.pointDeltas ??
      deepFreeze({
        "player-a": scorerId === "player-a" ? awardedPoints : 0,
        "player-b": scorerId === "player-b" ? awardedPoints : 0,
      }),
    activeYaku: input.activeYaku ?? (lucky || noScore ? [] : [animals]),
    basePoints,
    tableMultiplierAtDecision: input.tableMultiplierAtDecision ?? (noScore ? null : 1),
    scoringMultiplier,
    awardedPoints,
    evidence: input.evidence ?? (lucky ? luckyEvidence : null),
    nextRound: input.nextRound === undefined ? plan() : input.nextRound,
    matchScoresAfter:
      input.matchScoresAfter ??
      deepFreeze({
        "player-a": scorerId === "player-a" ? awardedPoints : 0,
        "player-b": scorerId === "player-b" ? awardedPoints : 0,
      }),
  } satisfies RoundResultV1);
}

function observation(
  input: {
    readonly result?: RoundResultV1;
    readonly history?: readonly RoundResultV1[];
    readonly matchResult?: MatchResultV1;
    readonly phase?: "roundComplete" | "matchComplete" | "awaitingHandPlay";
  } = {},
): PlayerObservationV1 {
  const base = getTechnicalInputFixture("yakuDecision").source.observation;
  const current = input.result ?? result();
  const phase = input.phase ?? "roundComplete";
  const history = input.history ?? [current];
  return deepFreeze({
    ...base,
    ownHand: ["december-phoenix"],
    publicState: {
      ...base.publicState,
      status: phase === "matchComplete" ? "complete" : "inProgress",
      phase:
        phase === "roundComplete"
          ? { kind: "roundComplete" as const, result: current, transitionPending: true as const }
          : phase === "matchComplete"
            ? {
                kind: "matchComplete" as const,
                result:
                  input.matchResult ??
                  deepFreeze({
                    matchLength: base.publicState.matchLength,
                    roundsPlayed: history.length,
                    finalScores: current.matchScoresAfter,
                    winnerId: "player-a" as const,
                  }),
              }
            : { kind: "awaitingHandPlay" as const, playerId: "player-a" as const },
      history,
    },
    legalActions: [],
  });
}

describe("Phase 3C public round-result presentation", () => {
  it("PRES-RESULT-001 presents Bank arithmetic using supplied public values", () => {
    const state = createRoundResultPresentation({ observation: observation() });

    expect(state).toMatchObject({
      visibility: "roundResult",
      title: "Banked score",
      outcomeLabel: "Player A banked 3 points.",
      scorerId: "player-a",
      activeYaku: [animals],
      scoring: {
        tableMultiplierLabel: "Table multiplier at decision: 1×.",
        arithmeticLabel: "3 points × 1× = 3 points.",
      },
      action: { actionLabel: "Start another local round" },
    });
  });

  it("PRES-RESULT-002 presents the End-of-Play caller as the authoritative scorer", () => {
    const state = createRoundResultPresentation({
      observation: observation({
        result: result({
          kind: "endOfPlayLastKoiCaller",
          scorerId: "player-b",
          awardedPoints: 6,
          basePoints: 3,
          scoringMultiplier: 2,
        }),
      }),
    });

    expect(state).toMatchObject({
      title: "End of Play",
      reasonCode: "END_OF_PLAY_LAST_KOI_CALLER",
      outcomeLabel: "Player B was the last Koi-Koi caller and receives 6 points.",
      scorerId: "player-b",
    });
  });

  it("PRES-RESULT-003 keeps an End-of-Play 0–0 result free of fabricated scoring or yaku", () => {
    const state = createRoundResultPresentation({
      observation: observation({ result: result({ kind: "endOfPlayNoScore" }) }),
    });

    expect(state).toMatchObject({
      outcomeLabel: "No Koi-Koi caller: no points are awarded.",
      scorerId: null,
      activeYaku: [],
      scoring: null,
      pointDeltas: { "player-a": 0, "player-b": 0 },
    });
  });

  it("PRES-RESULT-004 preserves committed field-cancellation evidence", () => {
    const source = result({ kind: "fieldCancellation", evidence: fieldEvidence });
    const state = createRoundResultPresentation({ observation: observation({ result: source }) });

    expect(state).toMatchObject({
      title: "Field cancellation",
      evidence: fieldEvidence,
      activeYaku: [],
      scoring: null,
    });
    expect(state?.evidence).not.toBe(source.evidence);
  });

  it("PRES-RESULT-005 preserves public lucky-win evidence and its supplied award", () => {
    const state = createRoundResultPresentation({
      observation: observation({ result: result({ kind: "luckyWin", evidence: luckyEvidence }) }),
    });

    expect(state).toMatchObject({
      title: "Lucky win",
      outcomeLabel: "Player A wins with a lucky hand and receives 6 points.",
      activeYaku: [],
      evidence: luckyEvidence,
      scoring: { arithmeticLabel: "6 points × 1× = 6 points." },
    });
  });

  it("PRES-RESULT-006 presents a both-lucky draw without scorer or arithmetic", () => {
    const both = deepFreeze({
      ...luckyEvidence,
      hands: [luckyHand, { ...luckyHand, playerId: "player-b" as const }],
    } satisfies RoundResultEvidenceV1);
    const state = createRoundResultPresentation({
      observation: observation({ result: result({ kind: "bothLuckyDraw", evidence: both }) }),
    });

    expect(state).toMatchObject({
      title: "Both lucky hands",
      outcomeLabel: "Both players have lucky hands; this round is a draw.",
      scorerId: null,
      scoring: null,
      evidence: both,
    });
  });

  it("PRES-RESULT-008 distinguishes an authoritative 1× table from a 2× privileged Bank score", () => {
    const state = createRoundResultPresentation({
      observation: observation({
        result: result({
          tableMultiplierAtDecision: 1,
          scoringMultiplier: 2,
          awardedPoints: 6,
          nextRound: plan({
            starterReason: "HIGH_MULTIPLIER_WINNER_STARTS",
            starterId: "player-a",
          }),
        }),
      }),
    });

    expect(state?.scoring).toEqual({
      basePoints: 3,
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 2,
      awardedPoints: 6,
      tableMultiplierLabel: "Table multiplier at decision: 1×.",
      scoringMultiplierLabel: "Scoring multiplier: 2×.",
      arithmeticLabel: "3 points × 2× = 6 points.",
    });
    expect(state?.action).toMatchObject({
      plan: { starterId: "player-a", starterReason: "HIGH_MULTIPLIER_WINNER_STARTS" },
    });
  });

  it("PRES-RESULT-007 copies the January zero transition plan without inferring a month transition", () => {
    const nextRound = plan({
      roundNumber: 3,
      scheduledMonth: 3,
      starterReason: "JANUARY_ZERO_ALTERNATES",
      specialPrivilege: { playerId: "player-b", grantedFromRound: 2, status: "available" },
    });
    const state = createRoundResultPresentation({
      observation: observation({ result: result({ kind: "endOfPlayNoScore", nextRound }) }),
    });

    expect(state?.action).toEqual({
      actionLabel: "Start another local round",
      plan: nextRound,
      starterReasonLabel: "A zero-point January round alternates the starter.",
    });
    expect(state?.action).not.toBe(nextRound);
  });

  it("PRES-RESULT-009 and PRES-RESULT-010 use the committed match winner or tie and the new-match action", () => {
    const winner = createRoundResultPresentation({
      observation: observation({
        phase: "matchComplete",
        matchResult: deepFreeze({
          matchLength: 3,
          roundsPlayed: 3,
          finalScores: { "player-a": 9, "player-b": 6 },
          winnerId: "player-a",
        }),
      }),
    });
    const tie = createRoundResultPresentation({
      observation: observation({
        phase: "matchComplete",
        matchResult: deepFreeze({
          matchLength: 3,
          roundsPlayed: 3,
          finalScores: { "player-a": 6, "player-b": 6 },
          winnerId: null,
        }),
      }),
    });

    expect(winner).toMatchObject({
      title: "Match complete",
      outcomeLabel: "Player A wins the match.",
      matchScoresAfter: { "player-a": 9, "player-b": 6 },
      action: { actionLabel: "Start a new local match" },
    });
    expect(tie).toMatchObject({
      title: "Match complete",
      outcomeLabel: "The match ends in a tie.",
      matchScoresAfter: { "player-a": 6, "player-b": 6 },
      action: { actionLabel: "Start a new local match" },
    });
  });

  it("PRES-RESULT-011 copies history values, freezes nested output, and ignores private observation fields", () => {
    const first = result({ awardedPoints: 3 });
    const second = result({
      kind: "endOfPlayLastKoiCaller",
      awardedPoints: 8,
      basePoints: 4,
      scoringMultiplier: 2,
      matchScoresAfter: { "player-a": 11, "player-b": 0 },
    });
    const source = observation({ result: second, history: [first, second] });
    const state = createRoundResultPresentation({ observation: source });
    const serialized = JSON.stringify(state);

    expect(state?.history).toEqual([
      {
        roundNumber: 1,
        scheduledMonth: 1,
        kind: "bankedScore",
        reasonCode: "BANKED_SCORE",
        scorerId: "player-a",
        awardedPoints: 3,
        matchScoresAfter: { "player-a": 3, "player-b": 0 },
      },
      {
        roundNumber: 1,
        scheduledMonth: 1,
        kind: "endOfPlayLastKoiCaller",
        reasonCode: "END_OF_PLAY_LAST_KOI_CALLER",
        scorerId: "player-a",
        awardedPoints: 8,
        matchScoresAfter: { "player-a": 11, "player-b": 0 },
      },
    ]);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state?.history)).toBe(true);
    expect(Object.isFrozen(state?.history[0]?.matchScoresAfter)).toBe(true);
    expect(Object.isFrozen(source)).toBe(true);
    for (const forbidden of [
      "december-phoenix",
      "drawPile",
      "rng",
      "checkpoint",
      "commandId",
      "seenYakuKeys",
      "lastAcceptedCommandId",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns null outside a public completed phase", () => {
    expect(
      createRoundResultPresentation({ observation: observation({ phase: "awaitingHandPlay" }) }),
    ).toBeNull();
  });

  it("fails closed instead of deriving a match result from a round result with no next plan", () => {
    expect(
      createRoundResultPresentation({
        observation: observation({ result: result({ nextRound: null }) }),
      }),
    ).toBeNull();
  });
});
