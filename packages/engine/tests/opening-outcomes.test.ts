import {
  CARD_IDS,
  classifyLuckyHand,
  evaluateOpeningOutcome,
  findCompleteMonths,
  type CardId,
} from "../src/index";
import { describe, expect, it } from "vitest";

const JANUARY = CARD_IDS.filter((cardId) => cardId.startsWith("january-"));
const FEBRUARY = CARD_IDS.filter((cardId) => cardId.startsWith("february-"));
const MARCH = CARD_IDS.filter((cardId) => cardId.startsWith("march-"));
const APRIL = CARD_IDS.filter((cardId) => cardId.startsWith("april-"));

describe("Phase 1A opening-outcome primitives", () => {
  it("classifies complete months before four-pair patterns and retains every complete group", () => {
    expect(classifyLuckyHand([...FEBRUARY, ...JANUARY].reverse())).toEqual({
      kind: "fourMonth",
      completeMonths: [
        { month: 1, cardIds: JANUARY },
        { month: 2, cardIds: FEBRUARY },
      ],
    });
  });

  it("accepts exactly [2,2,2,2] and rejects nearby month distributions", () => {
    const fourPairs = [
      ...JANUARY.slice(0, 2),
      ...FEBRUARY.slice(0, 2),
      ...MARCH.slice(0, 2),
      ...APRIL.slice(0, 2),
    ];
    expect(classifyLuckyHand(fourPairs)).toMatchObject({ kind: "fourPairs" });
    const nonexact = [
      ...JANUARY.slice(0, 3),
      ...FEBRUARY.slice(0, 2),
      ...MARCH.slice(0, 2),
      ...APRIL.slice(0, 1),
    ];
    expect(classifyLuckyHand(nonexact)).toBeNull();
    const extraMonths = [
      ...JANUARY.slice(0, 2),
      ...FEBRUARY.slice(0, 2),
      ...MARCH.slice(0, 2),
      ...APRIL.slice(0, 1),
      CARD_IDS.find((cardId) => cardId.startsWith("may-")),
    ].filter((cardId): cardId is CardId => cardId !== undefined);
    expect(classifyLuckyHand(extraMonths)).toBeNull();
  });

  it("sorts complete-month evidence canonically regardless of input ordering", () => {
    const shuffledEvidence = [...FEBRUARY, ...JANUARY].reverse();
    expect(findCompleteMonths(shuffledEvidence)).toEqual([
      { month: 1, cardIds: JANUARY },
      { month: 2, cardIds: FEBRUARY },
    ]);
  });

  it("awards a sole player-b lucky hand exactly six points", () => {
    const playerA = [
      JANUARY[0],
      FEBRUARY[0],
      MARCH[0],
      CARD_IDS.find((cardId) => cardId.startsWith("june-")),
      CARD_IDS.find((cardId) => cardId.startsWith("july-")),
      CARD_IDS.find((cardId) => cardId.startsWith("august-")),
      CARD_IDS.find((cardId) => cardId.startsWith("september-")),
      CARD_IDS.find((cardId) => cardId.startsWith("october-")),
    ].filter((cardId): cardId is CardId => cardId !== undefined);
    const playerB = [...APRIL, ...CARD_IDS.filter((cardId) => cardId.startsWith("may-"))];
    const allocated = new Set([...playerA, ...playerB]);
    const field = CARD_IDS.filter((cardId) => !allocated.has(cardId)).slice(0, 8);
    const result = evaluateOpeningOutcome(field, [playerA, playerB]);
    expect(result).toMatchObject({
      kind: "luckyWin",
      winnerId: "player-b",
      pointDeltas: { "player-a": 0, "player-b": 6 },
      awardedPoints: 6,
      ordinaryYakuPoints: 0,
      yakuDecisionRequired: false,
    });
  });
});
