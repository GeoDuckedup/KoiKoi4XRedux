import {
  CARD_IDS,
  EngineCommandError,
  advanceRound,
  advanceRoundFromOrderedDeck,
  applyGameplayCommand,
  createNoScoreRoundResult,
  createSeededRandomSource,
  createScoredRoundResult,
  deriveYakuContributingCardIds,
  deriveNextRoundPlan,
  evaluateYaku,
  getLegalActions,
  startMatchFromOrderedDeck,
  validateAuthoritativeState,
  type ActiveYakuV1,
  type AuthoritativeGameStateV1,
  type CardId,
  type CompletedYakuFormationV1,
  type GameplayTransitionV1,
  type MatchLength,
  type PlayerId,
  type PlayerStateV1,
  type PointDeltas,
  type RoundResultV1,
  type TableMultiplier,
  type YakuTriggerKey,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { PHASE_1A_DEAL_FIXTURES } from "../src/rules/deal-fixtures";
import {
  getPhase1DVectorFixture,
  PHASE_1D_VECTOR_FIXTURES,
  PHASE_1D_VECTOR_IDS,
  type Phase1DVectorId,
} from "../src/rules/phase1d-fixtures";

function expectVector(
  id: Phase1DVectorId,
  actual: Readonly<Record<string, string | number | boolean | null>>,
): void {
  expect(actual).toEqual(getPhase1DVectorFixture(id).then);
}

const MULTI_HAND = [
  "september-sake-cup",
  "january-crane",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
] as const satisfies readonly CardId[];
const OPPONENT_HAND = [
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "february-bush-warbler",
  "october-deer",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];
const FIELD = [
  "september-blue-scroll",
  "january-pine-plain-a",
  "february-plum-plain-a",
  "march-cherry-plain-a",
  "april-wisteria-plain-a",
  "may-iris-plain-a",
  "june-peony-plain-a",
  "july-bush-clover-plain-a",
  "august-pampas-plain-a",
  "october-maple-plain-a",
  "november-willow-plain",
  "december-paulownia-plain-a",
  "february-plum-plain-b",
  "may-iris-plain-b",
] as const satisfies readonly CardId[];

function player(
  id: PlayerId,
  hand: readonly CardId[],
  captured: readonly CardId[],
  scheduledMonth = 1,
  seen?: readonly YakuTriggerKey[],
): PlayerStateV1 {
  const initial = evaluateYaku(captured, scheduledMonth as 1);
  const seenYakuKeys = seen ?? initial.activeYaku.map((entry) => entry.key);
  const yaku = evaluateYaku(captured, scheduledMonth as 1, seenYakuKeys);
  return {
    id,
    score: 0,
    hand: [...hand],
    captured: [...captured],
    seenYakuKeys: [...seenYakuKeys],
    activeYaku: yaku.activeYaku,
    currentYakuTotal: yaku.currentYakuTotal,
  };
}

function completedFormationsFor(
  players: readonly PlayerStateV1[],
  scheduledMonth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
): readonly CompletedYakuFormationV1[] {
  return players
    .flatMap((candidate) =>
      candidate.activeYaku.map((yaku) => ({
        sequence: 0,
        playerId: candidate.id,
        phase: "hand" as const,
        yaku,
        contributingCardIds: deriveYakuContributingCardIds(
          yaku.key,
          candidate.captured,
          scheduledMonth,
        ),
      })),
    )
    .map((formation, index) => ({ ...formation, sequence: index + 1 }));
}

function handTriggerSource(): AuthoritativeGameStateV1 {
  const captured = ["march-curtain", "august-moon"] as const satisfies readonly CardId[];
  const allocated = [...MULTI_HAND, ...OPPONENT_HAND, ...FIELD, ...captured];
  const allocatedSet = new Set<CardId>(allocated);
  const drawPile = CARD_IDS.filter((cardId) => !allocatedSet.has(cardId));
  const players = [
    player("player-a", MULTI_HAND, captured),
    player("player-b", OPPONENT_HAND, []),
  ] as const;
  return {
    formatVersion: 1,
    rulesVersion: "1.0",
    stateVersion: 20,
    lastAcceptedCommandId: "phase1d-prior",
    matchId: "phase1d-match",
    matchLength: 12,
    status: "inProgress",
    players,
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId: "player-a",
      field: FIELD,
      drawPile,
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: null,
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
      completedYakuFormations: completedFormationsFor(players, 1),
    },
    phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    history: [],
  };
}

function handDecision(): AuthoritativeGameStateV1 {
  const state = handTriggerSource();
  const transition = applyGameplayCommand(state, {
    type: "playHandCard",
    commandId: "make-hand-decision",
    matchId: state.matchId,
    actorId: "player-a",
    expectedStateVersion: state.stateVersion,
    cardId: "september-sake-cup",
  });
  if (transition.state.phase.kind !== "awaitingYakuDecision") {
    throw new Error("Authored hand decision did not trigger.");
  }
  return transition.state;
}

function twoWindowSource(): AuthoritativeGameStateV1 {
  const aHand = [
    "september-sake-cup",
    "january-crane",
    "april-cuckoo",
    "may-bridge",
    "january-red-text-scroll",
    "february-red-text-scroll",
  ] as const satisfies readonly CardId[];
  const bHand = [
    "september-chrysanthemum-plain-a",
    "september-chrysanthemum-plain-b",
    "february-bush-warbler",
    "march-red-text-scroll",
    "november-rain",
    "december-phoenix",
  ] as const satisfies readonly CardId[];
  const captured = [
    "march-curtain",
    "august-moon",
    "june-butterfly",
    "july-boar",
  ] as const satisfies readonly CardId[];
  const drawHead = "october-deer" as const;
  const field = FIELD.slice(0, 12);
  const allocated = [...aHand, ...bHand, ...field, ...captured, drawHead];
  const allocatedSet = new Set<CardId>(allocated);
  return {
    ...handTriggerSource(),
    players: [player("player-a", aHand, captured), player("player-b", bHand, [])],
    round: {
      ...handTriggerSource().round,
      field,
      drawPile: [drawHead, ...CARD_IDS.filter((cardId) => !allocatedSet.has(cardId))],
    },
  };
}

function finalTurnSource(drawHead: CardId): AuthoritativeGameStateV1 {
  const bCaptured = ["march-curtain", "march-cherry-plain-a"] as const satisfies readonly CardId[];
  const field = [
    "september-blue-scroll",
    "january-pine-plain-a",
    "february-plum-plain-a",
    "march-red-text-scroll",
    "april-wisteria-plain-a",
    "may-iris-plain-a",
    "june-peony-plain-a",
    "july-bush-clover-plain-a",
    "august-pampas-plain-a",
    "october-maple-plain-a",
    "november-willow-plain",
    "january-pine-plain-b",
    "february-plum-plain-b",
    "may-iris-plain-b",
  ] as const satisfies readonly CardId[];
  const reserved = new Set<CardId>([...bCaptured, ...field, "december-phoenix", drawHead]);
  const aCaptured = CARD_IDS.filter((cardId) => !reserved.has(cardId)).slice(0, 22);
  const allocated = [...aCaptured, ...bCaptured, ...field, "december-phoenix", drawHead];
  const allocatedSet = new Set(allocated);
  const drawTail = CARD_IDS.filter((cardId) => !allocatedSet.has(cardId));
  const players = [
    player("player-a", [], aCaptured),
    player("player-b", ["december-phoenix"], bCaptured),
  ] as const;
  return {
    formatVersion: 1,
    rulesVersion: "1.0",
    stateVersion: 40,
    lastAcceptedCommandId: "before-final-turn",
    matchId: "phase1d-final-turn",
    matchLength: 12,
    status: "inProgress",
    players,
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId: "player-a",
      field,
      drawPile: [drawHead, ...drawTail],
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: "player-a",
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
      completedYakuFormations: completedFormationsFor(players, 1),
    },
    phase: { kind: "awaitingHandPlay", playerId: "player-b" },
    history: [],
  };
}

function finalFirstTriggerSource(): AuthoritativeGameStateV1 {
  const handCard = "december-phoenix" as const;
  const drawHead = "september-sake-cup" as const;
  const bCaptured = ["march-curtain", "march-cherry-plain-a"] as const;
  const targets = ["december-paulownia-plain-a", "september-blue-scroll"] as const;
  const reserved = new Set<CardId>([handCard, drawHead, ...bCaptured, ...targets]);
  const fill = CARD_IDS.filter((cardId) => !reserved.has(cardId));
  const field = [...targets, ...fill.slice(0, 34)];
  const drawPile = [drawHead, ...fill.slice(34)];
  return {
    formatVersion: 1,
    rulesVersion: "1.0",
    stateVersion: 60,
    lastAcceptedCommandId: "before-final-first-trigger",
    matchId: "phase1d-final-first-trigger",
    matchLength: 12,
    status: "inProgress",
    players: [player("player-a", [], []), player("player-b", [handCard], bCaptured)],
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId: "player-a",
      field,
      drawPile,
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: null,
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
      completedYakuFormations: [],
    },
    phase: { kind: "awaitingHandPlay", playerId: "player-b" },
    history: [],
  };
}

function playFinalTurn(state: AuthoritativeGameStateV1): GameplayTransitionV1 {
  const revealed = applyGameplayCommand(state, {
    type: "playHandCard",
    commandId: `final-play-${state.stateVersion}`,
    matchId: state.matchId,
    actorId: "player-b",
    expectedStateVersion: state.stateVersion,
    cardId: "december-phoenix",
  });
  if (revealed.state.phase.kind !== "awaitingDrawResolution") {
    throw new Error("FINAL_DRAW_RESOLUTION_MISSING");
  }
  const targetFieldCardId =
    revealed.state.phase.resolution.kind === "captureChoice"
      ? revealed.state.phase.resolution.matchingFieldCardIds[0]
      : undefined;
  return applyGameplayCommand(revealed.state, {
    type: "resolveDrawCard",
    commandId: `final-resolve-${revealed.state.stateVersion}`,
    matchId: revealed.state.matchId,
    actorId: "player-b",
    expectedStateVersion: revealed.state.stateVersion,
    ...(targetFieldCardId === undefined ? {} : { targetFieldCardId }),
  });
}

function decide(
  state: AuthoritativeGameStateV1,
  choice: "bank" | "koiKoi",
  commandId = `decision-${choice}-${state.stateVersion}`,
): GameplayTransitionV1 {
  return applyGameplayCommand(state, {
    type: "chooseYakuDecision",
    commandId,
    matchId: state.matchId,
    actorId: state.phase.kind === "awaitingYakuDecision" ? state.phase.playerId : "player-a",
    expectedStateVersion: state.stateVersion,
    choice,
  });
}

const HISTORY_YAKU: readonly ActiveYakuV1[] = [
  { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
];

function historicalState(
  template: AuthoritativeGameStateV1,
  roundNumber: number,
  starterId: PlayerId,
  scores: PointDeltas,
  history: readonly RoundResultV1[],
): AuthoritativeGameStateV1 {
  const players = [
    { ...template.players[0], score: scores["player-a"] },
    { ...template.players[1], score: scores["player-b"] },
  ] as const;
  return {
    ...template,
    matchLength: 3,
    players,
    round: {
      ...template.round,
      roundNumber,
      scheduledMonth: roundNumber as 1,
      isFinalScheduledRound: roundNumber === 3,
      starterId,
      completedYakuFormations: completedFormationsFor(players, roundNumber as 1),
    },
    history,
  };
}

function scoredHistoryResult(
  template: AuthoritativeGameStateV1,
  roundNumber: number,
  starterId: PlayerId,
  scorerId: PlayerId,
  scoringMultiplier: TableMultiplier,
  scoresBefore: PointDeltas,
): RoundResultV1 {
  const baseline = historicalState(template, roundNumber, starterId, scoresBefore, []);
  const yaku = HISTORY_YAKU[0];
  if (yaku === undefined) throw new Error("Historical yaku fixture is missing.");
  const scorer = baseline.players.find((player) => player.id === scorerId);
  if (scorer === undefined) throw new Error("Historical scorer fixture is missing.");
  const hasFormation = baseline.round.completedYakuFormations.some(
    (formation) => formation.playerId === scorerId && formation.yaku.key === yaku.key,
  );
  const state: AuthoritativeGameStateV1 = {
    ...baseline,
    round: {
      ...baseline.round,
      completedYakuFormations: hasFormation
        ? baseline.round.completedYakuFormations
        : [
            ...baseline.round.completedYakuFormations,
            {
              sequence: baseline.round.completedYakuFormations.length + 1,
              playerId: scorerId,
              phase: "hand",
              yaku,
              contributingCardIds: deriveYakuContributingCardIds(
                yaku.key,
                scorer.captured,
                roundNumber as 1,
              ),
            },
          ],
    },
  };
  return createScoredRoundResult(state, {
    kind: "bankedScore",
    reasonCode: "BANKED_SCORE",
    scorerId,
    activeYaku: HISTORY_YAKU,
    basePoints: 5,
    tableMultiplierAtDecision: scoringMultiplier,
    scoringMultiplier,
  });
}

function completedBeforeFinalRound(
  template: AuthoritativeGameStateV1,
  matchLength: MatchLength,
): AuthoritativeGameStateV1 {
  let scores: PointDeltas = { "player-a": 0, "player-b": 0 };
  const history: RoundResultV1[] = [];
  let lastState = template;
  for (let roundNumber = 1; roundNumber < matchLength; roundNumber += 1) {
    const scheduledPlayers = [
      {
        ...player(
          "player-a",
          template.players[0].hand,
          template.players[0].captured,
          roundNumber,
          template.players[0].seenYakuKeys,
        ),
        score: scores["player-a"],
      },
      {
        ...player(
          "player-b",
          template.players[1].hand,
          template.players[1].captured,
          roundNumber,
          template.players[1].seenYakuKeys,
        ),
        score: scores["player-b"],
      },
    ] as const;
    lastState = {
      ...template,
      matchLength,
      players: scheduledPlayers,
      round: {
        ...template.round,
        roundNumber,
        scheduledMonth: roundNumber as 1,
        isFinalScheduledRound: false,
        starterId: "player-a",
        tableMultiplier: 3,
        mostRecentKoiKoiCallerId: null,
        specialPrivilege: null,
        frozenFinalRoundLeaderId: null,
        completedYakuFormations: completedFormationsFor(scheduledPlayers, roundNumber as 1),
      },
      history: [...history],
    };
    const scorer = lastState.players[0];
    const result = createScoredRoundResult(lastState, {
      kind: "bankedScore",
      reasonCode: "BANKED_SCORE",
      scorerId: "player-a",
      activeYaku: scorer.activeYaku,
      basePoints: scorer.currentYakuTotal,
      tableMultiplierAtDecision: 3,
      scoringMultiplier: 3,
    });
    history.push(result);
    scores = result.matchScoresAfter;
  }
  const lastResult = history[history.length - 1];
  if (lastResult === undefined) throw new Error("Final-round preparation history missing.");
  return {
    ...lastState,
    players: [
      { ...lastState.players[0], score: scores["player-a"] },
      { ...lastState.players[1], score: scores["player-b"] },
    ],
    phase: { kind: "roundComplete", result: lastResult, transitionPending: true },
    history,
  };
}

describe("Phase 1D fixture inventory", () => {
  it("exports every locked Phase 1D vector exactly once with literal expectations", () => {
    expect(PHASE_1D_VECTOR_FIXTURES.map((fixture) => fixture.id)).toEqual(PHASE_1D_VECTOR_IDS);
    expect(new Set(PHASE_1D_VECTOR_IDS).size).toBe(47);
    expect(PHASE_1D_VECTOR_FIXTURES.every((fixture) => Object.keys(fixture.then).length > 0)).toBe(
      true,
    );
    expect(PHASE_1D_VECTOR_FIXTURES.every((fixture) => fixture.ruleRefs.length > 0)).toBe(true);
    expect(
      PHASE_1D_VECTOR_FIXTURES.filter((fixture) => fixture.execution === "reachable"),
    ).toHaveLength(45);
    expect(
      PHASE_1D_VECTOR_FIXTURES.filter((fixture) => fixture.execution === "unreachablePolicy"),
    ).toHaveLength(2);
    expect(Object.isFrozen(PHASE_1D_VECTOR_FIXTURES)).toBe(true);
    expect(Object.isFrozen(PHASE_1D_VECTOR_FIXTURES[0]?.then)).toBe(true);
    expect(getPhase1DVectorFixture("KOI-001")).toBe(PHASE_1D_VECTOR_FIXTURES[0]);
  });
});

describe("Phase 1D Bank and Koi-Koi integration", () => {
  it("KOI-008 combines every new Hand yaku in one decision", () => {
    const state = handDecision();
    if (state.phase.kind !== "awaitingYakuDecision") throw new Error("Decision missing.");
    expect(state.phase.context.phase).toBe("hand");
    expect(state.phase.context.newYaku.map((entry) => entry.key)).toEqual([
      "blossomViewing",
      "moonViewing",
    ]);
    expectVector("KOI-008", { decisions: 1, includesEveryNewYaku: true });
  });

  it("KOI-009 resumes Hand Koi and opens a separate Draw decision for a different yaku", () => {
    const source = twoWindowSource();
    expect(validateAuthoritativeState(source)).toEqual([]);
    const hand = applyGameplayCommand(source, {
      type: "playHandCard",
      commandId: "two-window-hand",
      matchId: source.matchId,
      actorId: "player-a",
      expectedStateVersion: source.stateVersion,
      cardId: "september-sake-cup",
    });
    expect(hand.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      context: { phase: "hand" },
    });
    const draw = decide(hand.state, "koiKoi", "two-window-koi");
    expect(draw.state.phase.kind).toBe("awaitingDrawResolution");
    const resolutionAction = getLegalActions(draw.state, "player-a")[0];
    if (!resolutionAction || resolutionAction.type !== "resolveDrawCard") {
      throw new Error("KOI-009 draw resolution missing.");
    }
    const resolved = applyGameplayCommand(draw.state, {
      type: "resolveDrawCard",
      commandId: "two-window-draw-resolution",
      matchId: draw.state.matchId,
      actorId: "player-a",
      expectedStateVersion: draw.state.stateVersion,
      ...(resolutionAction.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: resolutionAction.targetFieldCardId }),
    });
    expect(resolved.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      context: {
        phase: "draw",
        newYaku: [{ key: "animalTrio", name: "Animal Trio", points: 5 }],
      },
    });
    expect(draw.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["koiKoiCalled", "drawCardRevealed", "drawResolutionRequired"]),
    );
    expectVector("KOI-009", { decisions: 2, phases: "hand,draw" });
  });

  it("KOI-001 / KOI-007 / TRANS-1X-LOSER-STARTS-PRIVILEGE Banks once and skips Draw", () => {
    const state = handDecision();
    expect(getLegalActions(state, "player-a").map((action) => action.type)).toEqual([
      "chooseYakuDecision",
      "chooseYakuDecision",
    ]);
    const before = JSON.stringify(state);
    const transition = decide(state, "bank");
    expect(JSON.stringify(state)).toBe(before);
    expect(transition.state.stateVersion).toBe(state.stateVersion + 1);
    expect(transition.events.some((event) => event.type === "drawCardRevealed")).toBe(false);
    expect(transition.state.phase).toMatchObject({
      kind: "roundComplete",
      result: {
        kind: "bankedScore",
        reasonCode: "BANKED_SCORE",
        tableMultiplierAtDecision: 1,
        scoringMultiplier: 1,
        awardedPoints: 10,
        nextRound: { starterId: "player-b", specialPrivilege: { playerId: "player-b" } },
      },
    });
    expect(transition.state.players[0].score).toBe(10);
    expect(transition.state.history).toHaveLength(1);
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
    expectVector("KOI-001", { result: "bankedScore", table: 1, scoring: 1 });
    expectVector("KOI-007", { result: "bankedScore", drawRevealed: false });
    expectVector("TRANS-1X-LOSER-STARTS-PRIVILEGE", {
      starter: "loser",
      privilege: true,
    });
  });

  it.each([
    ["KOI-002", 1],
    ["KOI-003", 2],
    ["KOI-004", 3],
    ["KOI-005", 4],
  ] as const)(
    "%s calls from %ix using its literal table expectation and proves KOI-006 Draw resume",
    (id, from) => {
      const fixture = getPhase1DVectorFixture(id);
      const to = Number(fixture.then.table);
      const decision = handDecision();
      const state: AuthoritativeGameStateV1 = {
        ...decision,
        round: {
          ...decision.round,
          tableMultiplier: from,
          mostRecentKoiKoiCallerId: from === 4 ? "player-b" : null,
        },
      };
      expect(validateAuthoritativeState(state)).toEqual([]);
      const transition = decide(state, "koiKoi", `koi-${from}`);
      expect(transition.state.stateVersion).toBe(state.stateVersion + 1);
      expect(transition.state.round.tableMultiplier).toBe(to);
      expect(transition.state.round.mostRecentKoiKoiCallerId).toBe("player-a");
      expect(transition.events.some((event) => event.type === "drawCardRevealed")).toBe(true);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
      expectVector(
        id,
        id === "KOI-005"
          ? { result: "continue", table: to, callerChanges: true }
          : { result: "continue", table: to },
      );
      expectVector("KOI-006", { resume: "drawPhase", drawRevealed: true });
    },
  );

  it("TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER / TRANS-PRIVILEGED-BANK-STARTER / TRANS-PRIVILEGED-KOI-JUMPS-TO-3X execute", () => {
    const decision = handDecision();
    const prior = scoredHistoryResult(decision, 1, "player-b", "player-b", 1, {
      "player-a": 0,
      "player-b": 0,
    });
    const privileged = historicalState(decision, 2, "player-a", prior.matchScoresAfter, [prior]);
    const state: AuthoritativeGameStateV1 = {
      ...privileged,
      round: {
        ...privileged.round,
        specialPrivilege: prior.nextRound?.specialPrivilege ?? null,
      },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    const actions = getLegalActions(state, "player-a");
    expect(actions[0]).toMatchObject({
      choice: "bank",
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 2,
    });
    const bank = decide(state, "bank", "privileged-bank");
    expect(bank.state.phase).toMatchObject({
      kind: "roundComplete",
      result: { tableMultiplierAtDecision: 1, scoringMultiplier: 2, awardedPoints: 20 },
    });
    expect(
      bank.state.phase.kind === "roundComplete" ? bank.state.phase.result.nextRound : null,
    ).toMatchObject({
      starterId: "player-b",
      specialPrivilege: null,
    });
    const koi = decide(state, "koiKoi", "privileged-koi");
    expect(koi.state.round.tableMultiplier).toBe(3);
    expect(koi.state.round.specialPrivilege).toBeNull();
    expectVector("TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER", { table: 1, scoring: 2 });
    expectVector("TRANS-PRIVILEGED-BANK-STARTER", { starter: "loser", privilege: false });
    expectVector("TRANS-PRIVILEGED-KOI-JUMPS-TO-3X", { fromTable: 1, table: 3 });
  });

  it("TRANS-PRIVILEGE-LOST-AFTER-TABLE-RISE offers only ordinary table scoring", () => {
    const decision = handDecision();
    const prior = scoredHistoryResult(decision, 1, "player-b", "player-b", 1, {
      "player-a": 0,
      "player-b": 0,
    });
    const roundTwo = historicalState(decision, 2, "player-a", prior.matchScoresAfter, [prior]);
    const state: AuthoritativeGameStateV1 = {
      ...roundTwo,
      round: {
        ...roundTwo.round,
        tableMultiplier: 2,
        mostRecentKoiKoiCallerId: "player-b",
        specialPrivilege: null,
      },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(getLegalActions(state, "player-a")[0]).toMatchObject({
      choice: "bank",
      tableMultiplierAtDecision: 2,
      scoringMultiplier: 2,
    });
    expectVector("TRANS-PRIVILEGE-LOST-AFTER-TABLE-RISE", {
      privilege: false,
      bankScoring: "table",
    });
  });

  it.each([
    ["KOI-012A-FINAL-DRAW-1X-TO-2X", 1],
    ["KOI-012B-FINAL-DRAW-2X-TO-3X", 2],
    ["KOI-012C-FINAL-DRAW-3X-TO-4X", 3],
    ["KOI-013-FINAL-DRAW-AT-4X", 4],
  ] as const)(
    "%s resolves final-Draw Koi from %ix using its literal result expectation",
    (id, from) => {
      const fixture = getPhase1DVectorFixture(id);
      const scoring = Number(fixture.then.table);
      const triggered = playFinalTurn(finalTurnSource("september-sake-cup")).state;
      if (triggered.phase.kind !== "awaitingYakuDecision") {
        throw new Error("Final Draw fixture did not create a decision.");
      }
      const state: AuthoritativeGameStateV1 = {
        ...triggered,
        round: {
          ...triggered.round,
          tableMultiplier: from,
          mostRecentKoiKoiCallerId: from === 1 ? null : "player-a",
        },
      };
      expect(validateAuthoritativeState(state)).toEqual([]);
      const transition = decide(state, "koiKoi", `final-koi-${from}`);
      expect(transition.state.phase).toMatchObject({
        kind: "roundComplete",
        result: {
          kind: "endOfPlayLastKoiCaller",
          reasonCode: "END_OF_PLAY_LAST_KOI_CALLER",
          scorerId: "player-b",
          scoringMultiplier: scoring,
          awardedPoints: 5 * scoring,
        },
      });
      expect(transition.state.round.tableMultiplier).toBe(scoring);
      expect(transition.state.round.mostRecentKoiKoiCallerId).toBe("player-b");
      expect(transition.events.map((event) => event.type).slice(-4)).toEqual([
        "turnCompleted",
        "endOfPlayReached",
        "roundResultCommitted",
        "roundTransitionPrepared",
      ]);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
      expectVector(
        id,
        id === "KOI-013-FINAL-DRAW-AT-4X"
          ? { table: scoring, scorer: "finalActor" }
          : { table: scoring, scoring },
      );
    },
  );

  it("KOI-015A-FINAL-DRAW-PRIVILEGED-BANK / KOI-015B-FINAL-DRAW-PRIVILEGED-KOI reject unreachable privilege provenance", () => {
    const triggered = playFinalTurn(finalFirstTriggerSource()).state;
    if (triggered.phase.kind !== "awaitingYakuDecision") {
      throw new Error("Final Draw fixture did not create a decision.");
    }
    const privilegedPolicyState: AuthoritativeGameStateV1 = {
      ...triggered,
      round: {
        ...triggered.round,
        specialPrivilege: {
          playerId: "player-b",
          grantedFromRound: 0,
          status: "available",
        },
      },
    };
    const validationCode = validateAuthoritativeState(privilegedPolicyState).find(
      (entry) => entry.code === "ROUND_PRIVILEGE_INVALID",
    )?.code;
    expect(validationCode).toBe("ROUND_PRIVILEGE_INVALID");
    const before = JSON.stringify(privilegedPolicyState);
    for (const choice of ["bank", "koiKoi"] as const) {
      expect(() =>
        applyGameplayCommand(privilegedPolicyState, {
          type: "chooseYakuDecision",
          commandId: `unreachable-final-${choice}`,
          matchId: privilegedPolicyState.matchId,
          actorId: "player-b",
          expectedStateVersion: privilegedPolicyState.stateVersion,
          choice,
        }),
      ).toThrow(/ROUND_PRIVILEGE_INVALID/);
    }
    expect(JSON.stringify(privilegedPolicyState)).toBe(before);
    const observation = { validationCode: validationCode ?? null, commandAccepted: false };
    expectVector("KOI-015A-FINAL-DRAW-PRIVILEGED-BANK", observation);
    expectVector("KOI-015B-FINAL-DRAW-PRIVILEGED-KOI", observation);
  });

  it("KOI-010 / KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR score the earlier latest caller", () => {
    const source = finalTurnSource("october-blue-scroll");
    const state: AuthoritativeGameStateV1 = {
      ...source,
      round: { ...source.round, tableMultiplier: 3, mostRecentKoiKoiCallerId: "player-a" },
    };
    const transition = playFinalTurn(state);
    expect(transition.state.phase).toMatchObject({
      kind: "roundComplete",
      result: {
        kind: "endOfPlayLastKoiCaller",
        scorerId: "player-a",
        scoringMultiplier: 3,
      },
    });
    expect(transition.state.players[0].score).toBeGreaterThan(0);
    expectVector("KOI-010", {
      reason: transition.state.history[0]?.reasonCode ?? null,
      scorer: "latestCaller",
    });
    expectVector("KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR", {
      scorer: "latestCaller",
      finalActorScores: transition.state.history[0]?.scorerId === "player-b",
    });
  });

  it("KOI-011 rejects fabricated deltas, base points, or active yaku on its no-score result", () => {
    const completed = playFinalTurn(finalTurnSource("october-blue-scroll")).state;
    if (completed.phase.kind !== "roundComplete") {
      throw new Error("No-score result fixture did not complete.");
    }
    const result = completed.phase.result;
    expectVector("KOI-011", { reason: result.reasonCode, awarded: result.awardedPoints });
    const cases: readonly RoundResultV1[] = [
      {
        ...result,
        pointDeltas: { "player-a": 99, "player-b": 0 },
        matchScoresAfter: { "player-a": 99, "player-b": 0 },
      },
      { ...result, basePoints: 5 },
      { ...result, activeYaku: HISTORY_YAKU },
    ];
    for (const malformedResult of cases) {
      const malformed: AuthoritativeGameStateV1 = {
        ...completed,
        players: [
          {
            ...completed.players[0],
            score: malformedResult.matchScoresAfter["player-a"],
          },
          completed.players[1],
        ],
        phase: { kind: "roundComplete", result: malformedResult, transitionPending: true },
        history: [malformedResult],
      };
      expect(validateAuthoritativeState(malformed).map((entry) => entry.code)).toEqual(
        expect.arrayContaining(["ROUND_HISTORY_INVALID"]),
      );
    }
  });
});

describe("Phase 1D transition and final-leader policies", () => {
  it.each([
    ["FINAL-RULE-3-ROUND", 3],
    ["FINAL-RULE-6-ROUND", 6],
    ["FINAL-RULE-12-ROUND", 12],
  ] as const)(
    "%s prepares the configured final month and proves FINAL-LEADER-FROZEN",
    (id, matchLength) => {
      const completed = completedBeforeFinalRound(handDecision(), matchLength);
      expect(validateAuthoritativeState(completed)).toEqual([]);
      const normal = PHASE_1A_DEAL_FIXTURES.find((fixture) => fixture.id === "DEAL-001");
      const orderedDeck = normal?.when[0]?.orderedDeck;
      if (orderedDeck === undefined) throw new Error("DEAL-001 deck missing.");
      const transition = advanceRoundFromOrderedDeck(
        completed,
        {
          type: "advanceRound",
          commandId: `advance-final-${matchLength}`,
          matchId: completed.matchId,
          expectedStateVersion: completed.stateVersion,
        },
        orderedDeck,
      );
      expect(transition.state.round).toMatchObject({
        roundNumber: matchLength,
        scheduledMonth: matchLength,
        isFinalScheduledRound: true,
        frozenFinalRoundLeaderId: "player-a",
      });
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
      expectVector(id, { matchLength, finalMonth: transition.state.round.scheduledMonth });
      if (matchLength === 3) {
        expectVector("FINAL-LEADER-FROZEN", {
          recomputed: transition.state.round.frozenFinalRoundLeaderId !== "player-a",
          tieProtects: transition.state.round.frozenFinalRoundLeaderId === null,
        });
      }
    },
  );

  it.each([
    ["TRANS-1X-LOSER-STARTS-PRIVILEGE", 1, "player-b", true],
    ["TRANS-2X-LOSER-STARTS-NO-PRIVILEGE", 2, "player-b", false],
    ["TRANS-3X-WINNER-STARTS", 3, "player-a", false],
    ["TRANS-4X-WINNER-STARTS", 4, "player-a", false],
  ] as const)(
    "%s derives the %ix scored starter and privilege literally",
    (id, multiplier, starter, privileged) => {
      const plan = deriveNextRoundPlan(
        {
          matchLength: 12,
          round: {
            ...handDecision().round,
            roundNumber: 4,
            scheduledMonth: 4,
            starterId: "player-b",
          },
        },
        "player-a",
        multiplier,
      );
      expect(plan?.starterId).toBe(starter);
      expect(plan?.specialPrivilege !== null).toBe(privileged);
      expectVector(id, {
        starter: plan?.starterId === "player-a" ? "winner" : "loser",
        privilege: plan?.specialPrivilege !== null,
      });
    },
  );

  it("TRANS-JANUARY-ZERO-ALTERNATES / TRANS-LATER-ZERO-PRESERVES / TRANS-ZERO-CLEARS-PRIVILEGE", () => {
    const round = handDecision().round;
    const january = deriveNextRoundPlan({ matchLength: 12, round }, null, null);
    expect(january).toMatchObject({
      starterId: "player-b",
      starterReason: "JANUARY_ZERO_ALTERNATES",
    });
    const later = deriveNextRoundPlan(
      {
        matchLength: 12,
        round: { ...round, roundNumber: 4, scheduledMonth: 4, starterId: "player-b" },
      },
      null,
      null,
    );
    expect(later).toMatchObject({
      starterId: "player-b",
      starterReason: "LATER_ZERO_PRESERVES_STARTER",
    });
    expect(
      deriveNextRoundPlan(
        { matchLength: 12, round: { ...round, roundNumber: 12, scheduledMonth: 12 } },
        null,
        null,
      ),
    ).toBeNull();
    expectVector("TRANS-JANUARY-ZERO-ALTERNATES", {
      starter: january?.starterId === round.starterId ? "same" : "opposite",
      privilege: january?.specialPrivilege !== null,
    });
    expectVector("TRANS-LATER-ZERO-PRESERVES", {
      starter: later?.starterId === "player-b" ? "same" : "opposite",
      privilege: later?.specialPrivilege !== null,
    });
    expectVector("TRANS-ZERO-CLEARS-PRIVILEGE", { privilege: false, awarded: 0 });
  });

  it("FINAL-LEADER-FIRST-YAKU-FORCED-KOI forces only the frozen leader's round-first ordinary trigger", () => {
    const decision = handDecision();
    const first = scoredHistoryResult(decision, 1, "player-a", "player-a", 3, {
      "player-a": 0,
      "player-b": 0,
    });
    const afterFirst = first.matchScoresAfter;
    const secondState = historicalState(decision, 2, "player-a", afterFirst, [first]);
    const second = createNoScoreRoundResult(secondState);
    const finalState = historicalState(decision, 3, "player-a", second.matchScoresAfter, [
      first,
      second,
    ]);
    const state: AuthoritativeGameStateV1 = {
      ...finalState,
      round: { ...finalState.round, frozenFinalRoundLeaderId: "player-a" },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(
      getLegalActions(state, "player-a").map((action) =>
        action.type === "chooseYakuDecision" ? action.choice : action.type,
      ),
    ).toEqual(["koiKoi"]);
    const before = JSON.stringify(state);
    let rejection: unknown;
    try {
      decide(state, "bank", "forced-bank");
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(EngineCommandError);
    expect((rejection as EngineCommandError).code).toBe("BANK_FORCED_KOI_KOI");
    expect(JSON.stringify(state)).toBe(before);
    expectVector("FINAL-LEADER-FIRST-YAKU-FORCED-KOI", {
      bankAvailable: false,
      koiAvailable: true,
    });
  });

  it("FINAL-TIE-PROTECTS-NONE allows ordinary Bank", () => {
    const decision = handDecision();
    const firstState = historicalState(
      decision,
      1,
      "player-b",
      { "player-a": 0, "player-b": 0 },
      [],
    );
    const first = createNoScoreRoundResult(firstState);
    const secondState = historicalState(decision, 2, "player-a", first.matchScoresAfter, [first]);
    const second = createNoScoreRoundResult(secondState);
    const finalState = historicalState(decision, 3, "player-a", second.matchScoresAfter, [
      first,
      second,
    ]);
    const state: AuthoritativeGameStateV1 = {
      ...finalState,
      round: { ...finalState.round, frozenFinalRoundLeaderId: null },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(getLegalActions(state, "player-a")[0]).toMatchObject({
      choice: "bank",
      scoringMultiplier: 1,
    });
    expectVector("FINAL-TIE-PROTECTS-NONE", {
      frozenLeader: state.round.frozenFinalRoundLeaderId,
      bankAvailable: true,
    });
  });

  it("FINAL-OPPONENT-FIRST-REMOVES-RESTRICTION lets the leader Bank later at the raised table", () => {
    const decision = handDecision();
    const first = scoredHistoryResult(decision, 1, "player-a", "player-a", 3, {
      "player-a": 0,
      "player-b": 0,
    });
    const secondState = historicalState(decision, 2, "player-a", first.matchScoresAfter, [first]);
    const second = createNoScoreRoundResult(secondState);
    const finalState = historicalState(decision, 3, "player-a", second.matchScoresAfter, [
      first,
      second,
    ]);
    const redScrolls = [
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ] as const satisfies readonly CardId[];
    const redScrollSet = new Set<CardId>(redScrolls);
    const movedFieldCards = finalState.round.field.slice(0, redScrolls.length);
    const b = player("player-b", finalState.players[1].hand, redScrolls, 3);
    const state: AuthoritativeGameStateV1 = {
      ...finalState,
      players: [finalState.players[0], { ...b, score: finalState.players[1].score }],
      round: {
        ...finalState.round,
        field: finalState.round.field.slice(redScrolls.length),
        drawPile: [
          ...finalState.round.drawPile.filter((cardId) => !redScrollSet.has(cardId)),
          ...movedFieldCards,
        ],
        tableMultiplier: 2,
        mostRecentKoiKoiCallerId: "player-b",
        firstYakuTriggerPlayerId: "player-b",
        frozenFinalRoundLeaderId: "player-a",
        completedYakuFormations: completedFormationsFor([finalState.players[0], b], 3),
      },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(getLegalActions(state, "player-a")[0]).toMatchObject({
      choice: "bank",
      tableMultiplierAtDecision: 2,
      scoringMultiplier: 2,
    });
    expectVector("FINAL-OPPONENT-FIRST-REMOVES-RESTRICTION", { bankAvailableLater: true });
  });

  it("FINAL-LEADER-PRIVILEGED-BANK allows the frozen leader to score at 2x", () => {
    const decision = handDecision();
    const first = scoredHistoryResult(decision, 1, "player-a", "player-a", 2, {
      "player-a": 0,
      "player-b": 0,
    });
    const second = scoredHistoryResult(
      decision,
      2,
      "player-b",
      "player-b",
      1,
      first.matchScoresAfter,
    );
    const finalState = historicalState(decision, 3, "player-a", second.matchScoresAfter, [
      first,
      second,
    ]);
    const state: AuthoritativeGameStateV1 = {
      ...finalState,
      round: {
        ...finalState.round,
        frozenFinalRoundLeaderId: "player-a",
        specialPrivilege: second.nextRound?.specialPrivilege ?? null,
      },
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(getLegalActions(state, "player-a")[0]).toMatchObject({
      choice: "bank",
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 2,
    });
    const transition = decide(state, "bank", "final-privileged-bank");
    expect(transition.state.phase).toMatchObject({
      kind: "matchComplete",
      result: { winnerId: "player-a" },
    });
    expect(transition.state.history[2]).toMatchObject({
      kind: "bankedScore",
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 2,
      nextRound: null,
    });
    expectVector("FINAL-LEADER-PRIVILEGED-BANK", { bankAvailable: true, scoring: 2 });
  });

  it("FINAL-MONTH-NATURAL-ZERO-ENDS commits the terminal match without month four", () => {
    const prior = completedBeforeFinalRound(handDecision(), 3);
    const source = finalTurnSource("october-blue-scroll");
    const a = player("player-a", [], source.players[0].captured, 3);
    const b = player("player-b", ["december-phoenix"], source.players[1].captured, 3);
    const state: AuthoritativeGameStateV1 = {
      ...source,
      matchLength: 3,
      players: [
        { ...a, score: prior.players[0].score },
        { ...b, score: prior.players[1].score },
      ],
      round: {
        ...source.round,
        roundNumber: 3,
        scheduledMonth: 3,
        isFinalScheduledRound: true,
        starterId: "player-a",
        firstYakuTriggerPlayerId: a.seenYakuKeys.length > 0 ? "player-a" : null,
        frozenFinalRoundLeaderId: "player-a",
      },
      history: prior.history,
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    const transition = playFinalTurn(state);
    expect(transition.state.status).toBe("complete");
    expect(transition.state.phase).toMatchObject({
      kind: "matchComplete",
      result: { roundsPlayed: 3 },
    });
    expect(transition.state.history[2]).toMatchObject({
      kind: "endOfPlayNoScore",
      reasonCode: "END_OF_PLAY_NO_SCORE",
      nextRound: null,
    });
    expectVector("FINAL-MONTH-NATURAL-ZERO-ENDS", {
      status: transition.state.status,
      awarded: transition.state.history[2]?.awardedPoints ?? null,
    });
  });

  it("KOI-016-FINAL-LEADER-FORCED-KOI forces the leader's final-Draw first trigger and scores immediately", () => {
    const template = handDecision();
    const first = scoredHistoryResult(template, 1, "player-a", "player-b", 3, {
      "player-a": 0,
      "player-b": 0,
    });
    const second = scoredHistoryResult(
      template,
      2,
      "player-b",
      "player-b",
      1,
      first.matchScoresAfter,
    );
    const source = finalFirstTriggerSource();
    const state: AuthoritativeGameStateV1 = {
      ...source,
      matchLength: 3,
      players: [
        { ...player("player-a", [], [], 3), score: second.matchScoresAfter["player-a"] },
        {
          ...player("player-b", ["december-phoenix"], source.players[1].captured, 3),
          score: second.matchScoresAfter["player-b"],
        },
      ],
      round: {
        ...source.round,
        roundNumber: 3,
        scheduledMonth: 3,
        isFinalScheduledRound: true,
        specialPrivilege: second.nextRound?.specialPrivilege ?? null,
        frozenFinalRoundLeaderId: "player-b",
      },
      history: [first, second],
    };
    expect(validateAuthoritativeState(state)).toEqual([]);
    const triggered = playFinalTurn(state).state;
    expect(triggered.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      playerId: "player-b",
      context: { phase: "draw", currentYakuTotal: 5 },
    });
    expect(
      getLegalActions(triggered, "player-b").map((action) =>
        action.type === "chooseYakuDecision" ? action.choice : action.type,
      ),
    ).toEqual(["koiKoi"]);
    const transition = decide(triggered, "koiKoi", "forced-final-draw-koi");
    expect(transition.state.phase).toMatchObject({
      kind: "matchComplete",
      result: { winnerId: "player-b" },
    });
    expect(transition.state.history[2]).toMatchObject({
      kind: "endOfPlayLastKoiCaller",
      scorerId: "player-b",
      tableMultiplierAtDecision: 2,
      scoringMultiplier: 2,
      awardedPoints: 10,
      nextRound: null,
    });
    expectVector("KOI-016-FINAL-LEADER-FORCED-KOI", {
      bankAvailable: false,
      table: transition.state.round.tableMultiplier,
    });
  });
});

describe("Phase 1D round advancement", () => {
  it("TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE and HIST-LUCKY-EVIDENCE are durable", () => {
    const lucky = PHASE_1A_DEAL_FIXTURES.find(
      (fixture) => fixture.then.state.openingKind === "luckyWin",
    );
    const orderedDeck = lucky?.when[0]?.orderedDeck;
    if (orderedDeck === undefined) throw new Error("Lucky deal missing.");
    const state = startMatchFromOrderedDeck(
      {
        type: "startMatch",
        commandId: "lucky-history",
        matchId: "lucky-history-match",
        expectedStateVersion: 0,
        matchLength: 12,
        starterPolicy: { kind: "provided", playerId: "player-a" },
      },
      orderedDeck,
      "player-a",
    ).state;
    const result = state.history[0];
    expect(result).toMatchObject({
      kind: "luckyWin",
      basePoints: 6,
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 1,
      awardedPoints: 6,
      evidence: { kind: "luckyHands", hands: [{ fullHand: expect.any(Array) }] },
      nextRound: { starterId: "player-b", specialPrivilege: { playerId: "player-b" } },
    });
    expect(
      result?.evidence?.kind === "luckyHands" ? result.evidence.hands[0]?.fullHand : [],
    ).toHaveLength(8);
    expectVector("TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE", {
      starter: result?.nextRound?.starterId === "player-b" ? "loser" : "winner",
      privilege: result?.nextRound?.specialPrivilege !== null,
    });
    expectVector("HIST-LUCKY-EVIDENCE", {
      fullHandCards:
        result?.evidence?.kind === "luckyHands"
          ? (result.evidence.hands[0]?.fullHand.length ?? 0)
          : 0,
      basePoints: result?.basePoints ?? null,
      scoring: result?.scoringMultiplier ?? null,
    });
  });

  it("HIST-CANCELLATION-EVIDENCE retains complete field groups and its zero transition", () => {
    const cancelled = PHASE_1A_DEAL_FIXTURES.find(
      (fixture) => fixture.then.state.openingKind === "fieldCancellation",
    );
    const orderedDeck = cancelled?.when[0]?.orderedDeck;
    if (orderedDeck === undefined) throw new Error("Cancellation deal missing.");
    const state = startMatchFromOrderedDeck(
      {
        type: "startMatch",
        commandId: "cancel-history",
        matchId: "cancel-history-match",
        expectedStateVersion: 0,
        matchLength: 12,
        starterPolicy: { kind: "provided", playerId: "player-a" },
      },
      orderedDeck,
      "player-a",
    ).state;
    expect(state.history[0]).toMatchObject({
      kind: "fieldCancellation",
      reasonCode: "FIELD_FOUR_MONTH_CANCELLED",
      pointDeltas: { "player-a": 0, "player-b": 0 },
      evidence: { kind: "fieldCancellation", completeFieldMonths: [{ month: 1 }] },
      nextRound: { starterId: "player-b", starterReason: "JANUARY_ZERO_ALTERNATES" },
    });
    const result = state.history[0];
    expectVector("HIST-CANCELLATION-EVIDENCE", {
      awarded: result?.awardedPoints ?? null,
      evidenceRequired:
        result?.evidence?.kind === "fieldCancellation" &&
        result.evidence.completeFieldMonths.length > 0,
    });
  });

  it("HIST-RESULT-REASON-CODES records Bank, caller/no-caller EOP, lucky, and cancellation", () => {
    const bank = decide(handDecision(), "bank").state.history[0]?.reasonCode;
    const noCaller = playFinalTurn(finalTurnSource("october-blue-scroll")).state.history[0]
      ?.reasonCode;
    const finalDecision = playFinalTurn(finalTurnSource("september-sake-cup")).state;
    const caller = decide(finalDecision, "koiKoi", "history-caller").state.history[0]?.reasonCode;
    const automaticReasons = PHASE_1A_DEAL_FIXTURES.filter(
      (fixture) => fixture.then.state.openingKind !== "normal",
    ).map((fixture) => {
      const orderedDeck = fixture.when[0]?.orderedDeck;
      if (orderedDeck === undefined) throw new Error(`${fixture.id} deck missing.`);
      return startMatchFromOrderedDeck(
        {
          type: "startMatch",
          commandId: `history-${fixture.id}`,
          matchId: `history-${fixture.id}`,
          expectedStateVersion: 0,
          matchLength: 12,
          starterPolicy: { kind: "provided", playerId: "player-a" },
        },
        orderedDeck,
        "player-a",
      ).state.history[0]?.reasonCode;
    });
    expect(new Set([bank, noCaller, caller, ...automaticReasons])).toEqual(
      new Set([
        "BANKED_SCORE",
        "END_OF_PLAY_NO_SCORE",
        "END_OF_PLAY_LAST_KOI_CALLER",
        "FIELD_FOUR_MONTH_CANCELLED",
        "LUCKY_FOUR_MONTH",
        "LUCKY_FOUR_PAIRS",
        "BOTH_LUCKY_DRAW",
      ]),
    );
    expectVector("HIST-RESULT-REASON-CODES", {
      reasonRequired: [bank, noCaller, caller, ...automaticReasons].every(
        (reason) => reason !== undefined,
      ),
      arithmeticRequired: true,
    });
  });

  it("uses the prepared plan, retains scores/history, resets locals, and preserves deal privacy", () => {
    const completed = decide(handDecision(), "bank").state;
    const normal = PHASE_1A_DEAL_FIXTURES.find((fixture) => fixture.id === "DEAL-001");
    if (normal === undefined) throw new Error("DEAL-001 missing.");
    const orderedDeck = normal.when[0]?.orderedDeck;
    if (orderedDeck === undefined) throw new Error("DEAL-001 deck missing.");
    const transition = advanceRoundFromOrderedDeck(
      completed,
      {
        type: "advanceRound",
        commandId: "advance-to-two",
        matchId: completed.matchId,
        expectedStateVersion: completed.stateVersion,
      },
      orderedDeck,
    );
    expect(transition.state.stateVersion).toBe(completed.stateVersion + 1);
    expect(transition.state.round).toMatchObject({
      roundNumber: 2,
      scheduledMonth: 2,
      starterId: "player-b",
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: null,
      specialPrivilege: { playerId: "player-b", grantedFromRound: 1 },
    });
    expect(transition.state.players[0].score).toBe(10);
    expect(transition.state.players.every((entry) => entry.captured.length === 0)).toBe(true);
    expect(transition.state.history).toHaveLength(1);
    expect(transition.events.filter((event) => event.type === "initialHandDealt")).toHaveLength(2);
    expect(transition.events.find((event) => event.type === "drawPileOrdered")?.audience.kind).toBe(
      "serverOnly",
    );
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
  });

  it("replays a checkpoint deterministically and rejects before consuming external RNG", () => {
    const completed = decide(handDecision(), "bank").state;
    const random = createSeededRandomSource("89abcdef0123456776543210fedcba98");
    const checkpoint = {
      version: 1 as const,
      matchId: completed.matchId,
      rng: random.snapshot(),
    };
    const command = {
      type: "advanceRound" as const,
      commandId: "checkpoint-advance",
      matchId: completed.matchId,
      expectedStateVersion: completed.stateVersion,
    };
    const first = advanceRound(completed, command, checkpoint);
    const second = advanceRound(completed, command, checkpoint);
    expect(first).toEqual(second);
    expect(first.state.stateVersion).toBe(completed.stateVersion + 1);
    const before = JSON.stringify(checkpoint);
    expect(() =>
      advanceRound(completed, { ...command, expectedStateVersion: 999 }, checkpoint),
    ).toThrow(EngineCommandError);
    expect(JSON.stringify(checkpoint)).toBe(before);
    expect(() =>
      advanceRound(
        completed,
        { ...command, commandId: "wrong-checkpoint" },
        {
          ...checkpoint,
          matchId: "another-match",
        },
      ),
    ).toThrowError(expect.objectContaining({ code: "CHECKPOINT_MATCH_MISMATCH" }));
  });

  it.each(["fieldCancellation", "luckyWin", "bothLuckyDraw"] as const)(
    "clears an inherited 1x privilege when round two ends automatically as %s",
    (openingKind) => {
      const completed = decide(handDecision(), "bank").state;
      expect(
        completed.phase.kind === "roundComplete" ? completed.phase.result.nextRound : null,
      ).toMatchObject({ specialPrivilege: { playerId: "player-b" } });
      const fixture = PHASE_1A_DEAL_FIXTURES.find(
        (candidate) => candidate.then.state.openingKind === openingKind,
      );
      const orderedDeck = fixture?.when[0]?.orderedDeck;
      if (orderedDeck === undefined) throw new Error(`${openingKind} deal missing.`);
      const transition = advanceRoundFromOrderedDeck(
        completed,
        {
          type: "advanceRound",
          commandId: `privileged-auto-${openingKind}`,
          matchId: completed.matchId,
          expectedStateVersion: completed.stateVersion,
        },
        orderedDeck,
      );
      expect(transition.state.phase).toMatchObject({
        kind: "roundComplete",
        result: { kind: openingKind },
      });
      expect(transition.state.round.specialPrivilege).toBeNull();
      expect(transition.state.history).toHaveLength(2);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
    },
  );

  it.each([
    ["FINAL-MONTH-CANCELLED-ENDS", "fieldCancellation"],
    ["FINAL-MONTH-LUCKY-WINNER-ENDS", "luckyWin"],
    ["FINAL-MONTH-BOTH-LUCKY-ENDS", "bothLuckyDraw"],
  ] as const)(
    "%s records final-month %s and completes without a replacement round",
    (id, openingKind) => {
      const roundOneComplete = decide(handDecision(), "bank").state;
      const first = roundOneComplete.history[0];
      if (first === undefined) throw new Error("Round-one result missing.");
      const roundTwoActive = historicalState(
        handDecision(),
        2,
        first.nextRound?.starterId ?? "player-b",
        first.matchScoresAfter,
        [first],
      );
      const scoringRoundTwo: AuthoritativeGameStateV1 = {
        ...roundTwoActive,
        round: {
          ...roundTwoActive.round,
          tableMultiplier: 3,
          specialPrivilege: null,
        },
      };
      const scoringPlayer = scoringRoundTwo.players[0];
      const roundTwoResult = createScoredRoundResult(scoringRoundTwo, {
        kind: "bankedScore",
        reasonCode: "BANKED_SCORE",
        scorerId: "player-a",
        activeYaku: scoringPlayer.activeYaku,
        basePoints: scoringPlayer.currentYakuTotal,
        tableMultiplierAtDecision: 3,
        scoringMultiplier: 3,
      });
      const roundTwoComplete: AuthoritativeGameStateV1 = {
        ...scoringRoundTwo,
        players: [
          {
            ...scoringRoundTwo.players[0],
            score: scoringRoundTwo.players[0].score + roundTwoResult.pointDeltas["player-a"],
          },
          scoringRoundTwo.players[1],
        ],
        phase: { kind: "roundComplete", result: roundTwoResult, transitionPending: true },
        history: [first, roundTwoResult],
      };
      expect(validateAuthoritativeState(roundTwoComplete)).toEqual([]);
      const fixture = PHASE_1A_DEAL_FIXTURES.find(
        (candidate) => candidate.then.state.openingKind === openingKind,
      );
      const orderedDeck = fixture?.when[0]?.orderedDeck;
      if (orderedDeck === undefined) throw new Error(`${openingKind} deal missing.`);
      const transition = advanceRoundFromOrderedDeck(
        roundTwoComplete,
        {
          type: "advanceRound",
          commandId: `final-${openingKind}`,
          matchId: roundTwoComplete.matchId,
          expectedStateVersion: roundTwoComplete.stateVersion,
        },
        orderedDeck,
      );
      expect(transition.state.status).toBe("complete");
      expect(transition.state.phase).toMatchObject({ kind: "matchComplete" });
      expect(transition.state.round.roundNumber).toBe(3);
      expect(transition.state.history).toHaveLength(3);
      expect(transition.state.history[2]?.kind).toBe(openingKind);
      expect(transition.events.some((event) => event.type === "matchCompleted")).toBe(true);
      expect(validateAuthoritativeState(transition.state)).toEqual([]);
      const result = transition.state.history[2];
      expectVector(
        id,
        id === "FINAL-MONTH-CANCELLED-ENDS"
          ? { status: transition.state.status, replacementRound: false }
          : { status: transition.state.status, awarded: result?.awardedPoints ?? null },
      );
    },
  );

  it("END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED plays a deterministic full round", () => {
    const normal = PHASE_1A_DEAL_FIXTURES.find((fixture) => fixture.id === "DEAL-001");
    const orderedDeck = normal?.when[0]?.orderedDeck;
    if (orderedDeck === undefined) throw new Error("DEAL-001 deck missing.");
    let state = startMatchFromOrderedDeck(
      {
        type: "startMatch",
        commandId: "natural-start",
        matchId: "natural-match",
        expectedStateVersion: 0,
        matchLength: 12,
        starterPolicy: { kind: "provided", playerId: "player-a" },
      },
      orderedDeck,
      "player-a",
    ).state;
    let turns = 0;
    let revealedDraws = 0;
    for (let step = 0; step < 80 && state.phase.kind !== "roundComplete"; step += 1) {
      if (state.phase.kind === "matchComplete") break;
      const actorId =
        state.phase.kind === "awaitingHandPlay" ||
        state.phase.kind === "awaitingDrawResolution" ||
        state.phase.kind === "awaitingYakuDecision"
          ? state.phase.playerId
          : null;
      if (actorId === null) throw new Error(`Non-executable phase ${state.phase.kind}.`);
      const actions = getLegalActions(state, actorId);
      const action =
        actions.find(
          (candidate) => candidate.type === "chooseYakuDecision" && candidate.choice === "koiKoi",
        ) ?? actions[0];
      if (action === undefined) throw new Error("Natural trace ran out of legal actions.");
      const commandId = `natural-${step}`;
      const transition =
        action.type === "playHandCard"
          ? applyGameplayCommand(state, {
              type: "playHandCard",
              commandId,
              matchId: state.matchId,
              actorId,
              expectedStateVersion: state.stateVersion,
              cardId: action.cardId,
              ...(action.targetFieldCardId === undefined
                ? {}
                : { targetFieldCardId: action.targetFieldCardId }),
            })
          : action.type === "resolveDrawCard"
            ? applyGameplayCommand(state, {
                type: "resolveDrawCard",
                commandId,
                matchId: state.matchId,
                actorId,
                expectedStateVersion: state.stateVersion,
                targetFieldCardId: action.targetFieldCardId,
              })
            : applyGameplayCommand(state, {
                type: "chooseYakuDecision",
                commandId,
                matchId: state.matchId,
                actorId,
                expectedStateVersion: state.stateVersion,
                choice: "koiKoi",
              });
      turns += transition.events.filter((event) => event.type === "turnCompleted").length;
      revealedDraws += transition.events.filter(
        (event) => event.type === "drawCardRevealed",
      ).length;
      state = transition.state;
    }
    expect(state.phase.kind).toBe("roundComplete");
    expect(state.players.map((entry) => entry.hand.length)).toEqual([0, 0]);
    expect(state.round.drawPile).toHaveLength(8);
    expect(turns).toBe(16);
    expect(revealedDraws).toBe(16);
    expect(validateAuthoritativeState(state)).toEqual([]);
    expectVector("END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED", {
      turns,
      revealedDraws,
      unusedDraws: state.round.drawPile.length,
    });
  });
});
