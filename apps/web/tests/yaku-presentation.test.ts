import {
  deepFreeze,
  type LegalActionV1,
  type PlayerObservationV1,
  type PublicGameEventV1,
  type PublicPhaseV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createYakuPresentationState } from "../src/game/yaku-presentation";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";

const animals = Object.freeze({ key: "animals" as const, name: "Animals" as const, points: 3 });
const animalsFour = Object.freeze({ key: "animals" as const, name: "Animals" as const, points: 4 });
const scrolls = Object.freeze({ key: "scrolls" as const, name: "Scrolls" as const, points: 1 });
const blossomViewing = Object.freeze({
  key: "blossomViewing" as const,
  name: "Blossom Viewing" as const,
  points: 5,
});
const moonViewing = Object.freeze({
  key: "moonViewing" as const,
  name: "Moon Viewing" as const,
  points: 5,
});
const fourBrights = Object.freeze({
  key: "fourBrights" as const,
  name: "Four Brights" as const,
  points: 8,
});
const fiveBrights = Object.freeze({
  key: "fiveBrights" as const,
  name: "Five Brights" as const,
  points: 10,
});

function decisionObservation(input?: {
  readonly legalActions?: readonly LegalActionV1[];
  readonly phase?: PublicPhaseV1;
  readonly playerId?: "player-a" | "player-b";
  readonly tableMultiplier?: 1 | 2 | 3 | 4;
  readonly yaku?: readonly (typeof animals | typeof blossomViewing | typeof moonViewing)[];
}): PlayerObservationV1 {
  const base = getTechnicalInputFixture("yakuDecision").source.observation;
  const phase =
    input?.phase ??
    ({
      kind: "awaitingYakuDecision" as const,
      playerId: "player-a" as const,
      context: {
        phase: "hand" as const,
        newYaku: input?.yaku ?? [animals],
        activeYaku: input?.yaku ?? [animals],
        currentYakuTotal: (input?.yaku ?? [animals]).reduce(
          (total, yaku) => total + yaku.points,
          0,
        ),
        resume: { kind: "drawPhase" as const },
      },
    } satisfies PublicPhaseV1);
  const legalActions =
    input?.legalActions ??
    ([
      {
        type: "chooseYakuDecision" as const,
        actorId: "player-a" as const,
        choice: "bank" as const,
        tableMultiplierAtDecision: 1 as const,
        scoringMultiplier: 1 as const,
        awardedPoints: (input?.yaku ?? [animals]).reduce((total, yaku) => total + yaku.points, 0),
      },
      {
        type: "chooseYakuDecision" as const,
        actorId: "player-a" as const,
        choice: "koiKoi" as const,
        currentTableMultiplier: 1 as const,
        resultingTableMultiplier: 2 as const,
      },
    ] satisfies readonly LegalActionV1[]);
  return deepFreeze({
    ...base,
    playerId: input?.playerId ?? "player-a",
    publicState: {
      ...base.publicState,
      round: { ...base.publicState.round, tableMultiplier: input?.tableMultiplier ?? 1 },
      phase,
    },
    legalActions,
  });
}

describe("Phase 3B pure yaku presentation", () => {
  it("PRES-YAKU-001-MULTI-HAND combines the literal simultaneous yaku into one decision and feedback", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({ yaku: [blossomViewing, moonViewing] }),
      recentEvents: [
        { type: "yakuCompleted", actorId: "player-a", phase: "hand", yaku: blossomViewing },
        { type: "yakuCompleted", actorId: "player-a", phase: "hand", yaku: moonViewing },
      ],
    });

    expect(state.feedback).toEqual({
      actorId: "player-a",
      announcement: "Player A completed Blossom Viewing · 5 points, Moon Viewing · 5 points.",
      bankAward: null,
      newYaku: [blossomViewing, moonViewing],
      replacements: [],
      valueChanges: [],
      chosenDecision: null,
      koiKoi: null,
    });
    expect(state.decision).toMatchObject({
      newYaku: [blossomViewing, moonViewing],
      activeYaku: [blossomViewing, moonViewing],
      currentYakuTotal: 10,
      bank: { awardedPoints: 10 },
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.feedback?.newYaku)).toBe(true);
  });

  it("PRES-YAKU-002-INCREMENT-NO-DECISION exposes the literal 3-to-4 change without inventing a decision", () => {
    const state = createYakuPresentationState({
      observation: deepFreeze({
        ...decisionObservation(),
        publicState: {
          ...decisionObservation().publicState,
          players: [
            {
              ...decisionObservation().publicState.players[0],
              activeYaku: [animalsFour],
              currentYakuTotal: 4,
            },
            decisionObservation().publicState.players[1],
          ],
          phase: { kind: "awaitingHandPlay", playerId: "player-a" },
        },
        legalActions: [],
      }),
      recentEvents: [
        {
          type: "yakuValueChanged",
          actorId: "player-a",
          phase: "draw",
          yakuKey: "animals",
          name: "Animals",
          previousPoints: 3,
          currentPoints: 4,
        },
      ],
    });

    expect(state).toMatchObject({
      feedback: {
        actorId: "player-a",
        announcement: "Animals upgraded: 3 → 4 points.",
        newYaku: [],
        valueChanges: [
          { yakuKey: "animals", name: "Animals", previousPoints: 3, currentPoints: 4 },
        ],
      },
      decision: null,
    });
    expect(state.players[0]).toMatchObject({ activeYaku: [animalsFour], currentYakuTotal: 4 });
  });

  it("PRES-YAKU-003-BRIGHT-UPGRADE preserves authoritative Bright replacement instead of retaining a replaced tier", () => {
    const base = decisionObservation({
      phase: {
        kind: "awaitingYakuDecision",
        playerId: "player-a",
        context: {
          phase: "hand",
          newYaku: [fiveBrights],
          activeYaku: [fiveBrights],
          currentYakuTotal: 10,
          resume: { kind: "drawPhase" },
        },
      },
      legalActions: [
        {
          type: "chooseYakuDecision",
          actorId: "player-a",
          choice: "bank",
          tableMultiplierAtDecision: 1,
          scoringMultiplier: 1,
          awardedPoints: 10,
        },
        {
          type: "chooseYakuDecision",
          actorId: "player-a",
          choice: "koiKoi",
          currentTableMultiplier: 1,
          resultingTableMultiplier: 2,
        },
      ],
    });
    const previousObservation = deepFreeze({
      ...base,
      publicState: {
        ...base.publicState,
        players: [
          { ...base.publicState.players[0], activeYaku: [fourBrights], currentYakuTotal: 8 },
          base.publicState.players[1],
        ] as const,
      },
    });
    const state = createYakuPresentationState({
      observation: deepFreeze({
        ...base,
        publicState: {
          ...base.publicState,
          players: [
            { ...base.publicState.players[0], activeYaku: [fiveBrights], currentYakuTotal: 10 },
            { ...base.publicState.players[1], activeYaku: [fourBrights], currentYakuTotal: 8 },
          ] as const,
        },
      }),
      previousObservation,
      recentEvents: [
        { type: "yakuCompleted", actorId: "player-a", phase: "hand", yaku: fiveBrights },
      ],
    });

    expect(state.players).toEqual([
      { playerId: "player-a", activeYaku: [fiveBrights], currentYakuTotal: 10 },
      { playerId: "player-b", activeYaku: [fourBrights], currentYakuTotal: 8 },
    ]);
    expect(state.players[0]?.activeYaku).not.toContainEqual(fourBrights);
    expect(state.feedback).toMatchObject({
      announcement: "Four Brights upgraded to Five Brights: 8 → 10 points.",
      replacements: [{ previous: fourBrights, current: fiveBrights }],
    });
  });

  it("PRES-YAKU-004-TWO-WINDOW-TURN copies each Hand and Draw decision window without collapsing them", () => {
    const hand = createYakuPresentationState({ observation: decisionObservation() });
    const draw = createYakuPresentationState({
      observation: decisionObservation({
        phase: {
          kind: "awaitingYakuDecision",
          playerId: "player-a",
          context: {
            phase: "draw",
            newYaku: [scrolls],
            activeYaku: [animals, scrolls],
            currentYakuTotal: 4,
            resume: { kind: "completeTurn", lastActorId: "player-a" },
          },
        },
      }),
    });

    expect(hand.decision).toMatchObject({
      phase: "hand",
      resume: { value: { kind: "drawPhase" } },
    });
    expect(draw.decision).toMatchObject({
      phase: "draw",
      newYaku: [scrolls],
      currentYakuTotal: 4,
      resume: {
        value: { kind: "completeTurn", lastActorId: "player-a" },
        consequenceLabel: "If you call Koi-Koi, complete this turn and pass play.",
      },
    });
  });

  it("PRES-KOI-001-BANK-HAND-AWARD copies the literal Bank-10 arithmetic from the legal action", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({ yaku: [blossomViewing, moonViewing] }),
    });
    expect(state.decision?.bank).toEqual({
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 1,
      awardedPoints: 10,
    });
  });

  it("PRES-KOI-002-CONTINUE-AND-RESUME copies the exact legal Koi-Koi multiplier result", () => {
    const state = createYakuPresentationState({ observation: decisionObservation() });
    expect(state.decision?.koiKoi).toEqual({
      currentTableMultiplier: 1,
      resultingTableMultiplier: 2,
    });
  });

  it("PRES-KOI-003-PRIVILEGE-SPLIT preserves authoritative split arithmetic and feedback", () => {
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuDecisionChosen",
        actorId: "player-a",
        choice: "koiKoi",
        privilegeUsed: false,
      },
      {
        type: "koiKoiCalled",
        actorId: "player-a",
        previousTableMultiplier: 1,
        currentTableMultiplier: 3,
        privilegeUsed: true,
      },
    ];
    const state = createYakuPresentationState({
      observation: decisionObservation({
        yaku: [blossomViewing, moonViewing],
        legalActions: [
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "bank",
            tableMultiplierAtDecision: 1,
            scoringMultiplier: 2,
            awardedPoints: 20,
          },
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "koiKoi",
            currentTableMultiplier: 1,
            resultingTableMultiplier: 3,
          },
        ],
      }),
      recentEvents: events,
    });
    expect(state.feedback).toEqual({
      actorId: "player-a",
      announcement:
        "Player A chose Koi-Koi. Table multiplier 1× to 3× using the special multiplier.",
      bankAward: null,
      newYaku: [],
      replacements: [],
      valueChanges: [],
      chosenDecision: { choice: "koiKoi", privilegeUsed: false },
      koiKoi: { previousTableMultiplier: 1, currentTableMultiplier: 3, privilegeUsed: true },
    });
    expect(state.decision).toMatchObject({
      currentYakuTotal: 10,
      bank: { tableMultiplierAtDecision: 1, scoringMultiplier: 2, awardedPoints: 20 },
      koiKoi: { currentTableMultiplier: 1, resultingTableMultiplier: 3 },
    });
  });

  it("PRES-KOI-004-FORCED-KOI leaves Bank null when the engine does not make Bank legal", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({
        legalActions: [
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "koiKoi",
            currentTableMultiplier: 1,
            resultingTableMultiplier: 2,
          },
        ],
      }),
    });
    expect(state.decision).toMatchObject({
      bank: null,
      koiKoi: { currentTableMultiplier: 1, resultingTableMultiplier: 2 },
    });
  });

  it("PRES-KOI-005-CAP-CALLER copies a capped four-times Koi-Koi result without changing it", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({
        tableMultiplier: 4,
        legalActions: [
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "bank",
            tableMultiplierAtDecision: 4,
            scoringMultiplier: 4,
            awardedPoints: 12,
          },
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "koiKoi",
            currentTableMultiplier: 4,
            resultingTableMultiplier: 4,
          },
        ],
      }),
    });
    expect(state).toMatchObject({
      tableMultiplier: 4,
      decision: {
        bank: { tableMultiplierAtDecision: 4, scoringMultiplier: 4, awardedPoints: 12 },
        koiKoi: { currentTableMultiplier: 4, resultingTableMultiplier: 4 },
      },
    });
  });

  it("PRES-PRIV-001-SAFE-STATE remains frozen and excludes private observation fields", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({
        legalActions: [
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "bank",
            tableMultiplierAtDecision: 1,
            scoringMultiplier: 2,
            awardedPoints: 20,
          },
          {
            type: "chooseYakuDecision",
            actorId: "player-a",
            choice: "koiKoi",
            currentTableMultiplier: 1,
            resultingTableMultiplier: 3,
          },
        ],
      }),
      recentEvents: [
        {
          type: "koiKoiCalled",
          actorId: "player-a",
          previousTableMultiplier: 1,
          currentTableMultiplier: 3,
          privilegeUsed: true,
        },
      ],
    });
    const serialized = JSON.stringify(state);

    expect(state.decision).toMatchObject({
      bank: { tableMultiplierAtDecision: 1, scoringMultiplier: 2, awardedPoints: 20 },
      koiKoi: { currentTableMultiplier: 1, resultingTableMultiplier: 3 },
    });
    expect(state.feedback?.koiKoi).toEqual({
      previousTableMultiplier: 1,
      currentTableMultiplier: 3,
      privilegeUsed: true,
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(serialized).not.toContain("ownHand");
    expect(serialized).not.toContain("seenYakuKeys");
    expect(serialized).not.toContain("commandId");
  });

  it("PRES-KOI-001-BANK-HAND-AWARD exposes the committed public award without recalculating it", () => {
    const state = createYakuPresentationState({
      observation: decisionObservation({ yaku: [blossomViewing, moonViewing] }),
      recentEvents: [
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
            activeYaku: [blossomViewing, moonViewing],
            basePoints: 10,
            tableMultiplierAtDecision: 1,
            scoringMultiplier: 1,
            awardedPoints: 10,
            evidence: null,
            nextRound: null,
            matchScoresAfter: { "player-a": 10, "player-b": 0 },
          },
        },
      ],
    });

    expect(state.feedback?.bankAward).toEqual({
      scorerId: "player-a",
      basePoints: 10,
      scoringMultiplier: 1,
      awardedPoints: 10,
    });
    expect(state.feedback?.announcement).toBe("Player A banked 10 points.");
  });
});
