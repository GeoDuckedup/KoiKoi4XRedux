import {
  CARD_IDS,
  EngineCommandError,
  applyGameplayCommand,
  deriveYakuContributingCardIds,
  evaluateYaku,
  getLegalActions,
  validateAuthoritativeState,
  type AuthoritativeGameStateV1,
  type CardId,
  type CompletedYakuFormationV1,
  type EnginePhaseV1,
  type PlayerId,
  type PlayerStateV1,
  type YakuTriggerKey,
} from "@koikoi4x/engine";
import * as enginePublicApi from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

interface StateFixtureParts {
  readonly aHand: readonly CardId[];
  readonly bHand: readonly CardId[];
  readonly field: readonly CardId[];
  readonly aCaptured?: readonly CardId[];
  readonly bCaptured?: readonly CardId[];
  readonly aSeen?: readonly YakuTriggerKey[];
  readonly bSeen?: readonly YakuTriggerKey[];
  readonly drawHead?: CardId;
  readonly phase: EnginePhaseV1;
}

function playerSnapshot(
  id: PlayerId,
  hand: readonly CardId[],
  captured: readonly CardId[],
  suppliedSeen?: readonly YakuTriggerKey[],
): PlayerStateV1 {
  const active = evaluateYaku(captured, 1).activeYaku;
  const seenYakuKeys = suppliedSeen ?? active.map((entry) => entry.key);
  const evaluation = evaluateYaku(captured, 1, seenYakuKeys);
  return {
    id,
    score: 0,
    hand: [...hand],
    captured: [...captured],
    seenYakuKeys: [...seenYakuKeys],
    activeYaku: evaluation.activeYaku,
    currentYakuTotal: evaluation.currentYakuTotal,
  };
}

function completedFormationsFor(
  players: readonly PlayerStateV1[],
): readonly CompletedYakuFormationV1[] {
  return players
    .flatMap((player) =>
      player.activeYaku.map((yaku) => ({
        sequence: 0,
        playerId: player.id,
        phase: "hand" as const,
        yaku,
        contributingCardIds: deriveYakuContributingCardIds(yaku.key, player.captured, 1),
      })),
    )
    .map((formation, index) => ({ ...formation, sequence: index + 1 }));
}

function buildStateFixture(parts: StateFixtureParts): AuthoritativeGameStateV1 {
  const aCaptured = parts.aCaptured ?? [];
  const bCaptured = parts.bCaptured ?? [];
  const allocated = [
    ...parts.aHand,
    ...parts.bHand,
    ...parts.field,
    ...aCaptured,
    ...bCaptured,
    ...(parts.drawHead === undefined ? [] : [parts.drawHead]),
  ];
  if (new Set(allocated).size !== allocated.length) {
    throw new Error("Yaku state fixture allocates a card more than once.");
  }
  const allocatedSet = new Set(allocated);
  const drawTail = CARD_IDS.filter((cardId) => !allocatedSet.has(cardId));
  const players = [
    playerSnapshot("player-a", parts.aHand, aCaptured, parts.aSeen),
    playerSnapshot("player-b", parts.bHand, bCaptured, parts.bSeen),
  ] as const;
  const firstYakuTriggerPlayerId =
    players[0].seenYakuKeys.length > 0
      ? "player-a"
      : players[1].seenYakuKeys.length > 0
        ? "player-b"
        : null;
  return {
    formatVersion: 1,
    rulesVersion: "1.0",
    stateVersion: 20,
    lastAcceptedCommandId: "fixture-prior-command",
    matchId: "phase-1c-state-fixture",
    matchLength: 12,
    status: "inProgress",
    players,
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId: "player-a",
      field: [...parts.field],
      drawPile: parts.drawHead === undefined ? drawTail : [parts.drawHead, ...drawTail],
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId,
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
      completedYakuFormations: completedFormationsFor(players),
    },
    phase: parts.phase,
    history: [],
  };
}

function playHandCard(
  state: AuthoritativeGameStateV1,
  actorId: PlayerId,
  cardId: CardId,
  targetFieldCardId?: CardId,
) {
  return applyGameplayCommand(state, {
    type: "playHandCard",
    commandId: `play-${state.stateVersion}`,
    matchId: state.matchId,
    actorId,
    expectedStateVersion: state.stateVersion,
    cardId,
    ...(targetFieldCardId === undefined ? {} : { targetFieldCardId }),
  });
}

function resolveDraw(state: AuthoritativeGameStateV1, actorId: PlayerId) {
  if (state.phase.kind !== "awaitingDrawResolution") {
    throw new Error(`DRAW_RESOLUTION_MISSING: ${state.phase.kind}`);
  }
  const targetFieldCardId =
    state.phase.resolution.kind === "captureChoice"
      ? state.phase.resolution.matchingFieldCardIds[0]
      : undefined;
  return applyGameplayCommand(state, {
    type: "resolveDrawCard",
    commandId: `resolve-${state.stateVersion}`,
    matchId: state.matchId,
    actorId,
    expectedStateVersion: state.stateVersion,
    ...(targetFieldCardId === undefined ? {} : { targetFieldCardId }),
  });
}

const MULTI_HAND = [
  "september-sake-cup",
  "january-crane",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
] as const satisfies readonly CardId[];

const MULTI_OPPONENT_HAND = [
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "february-bush-warbler",
  "october-deer",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];

const MULTI_FIELD = [
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

const DRAW_HAND = [
  "december-phoenix",
  "january-crane",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
] as const satisfies readonly CardId[];

const DRAW_OPPONENT_HAND = [
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "february-bush-warbler",
  "october-deer",
  "november-rain",
  "august-moon",
] as const satisfies readonly CardId[];

const DRAW_FIELD = [
  "september-blue-scroll",
  "january-pine-plain-a",
  "january-pine-plain-b",
  "february-red-text-scroll",
  "february-plum-plain-a",
  "march-red-text-scroll",
  "march-cherry-plain-a",
  "april-red-scroll",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "may-iris-plain-a",
  "june-blue-scroll",
  "july-red-scroll",
  "august-geese",
] as const satisfies readonly CardId[];

function directDrawFixture(field: readonly CardId[] = DRAW_FIELD): AuthoritativeGameStateV1 {
  return buildStateFixture({
    aHand: DRAW_HAND,
    bHand: DRAW_OPPONENT_HAND,
    field,
    aCaptured: ["march-curtain", "october-maple-plain-b"],
    drawHead: "september-sake-cup",
    phase: { kind: "awaitingHandPlay", playerId: "player-a" },
  });
}

function finalTurnFixture(drawHead: CardId): AuthoritativeGameStateV1 {
  const bCaptured = ["march-curtain", "march-cherry-plain-a"] as const;
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
  return buildStateFixture({
    aHand: [],
    bHand: ["december-phoenix"],
    field,
    aCaptured,
    bCaptured,
    drawHead,
    phase: { kind: "awaitingHandPlay", playerId: "player-b" },
  });
}

describe("Phase 1C yaku state-machine integration", () => {
  it("keeps transition validation trust markers out of the public engine API", () => {
    expect(Object.keys(enginePublicApi)).not.toContain("markTrustedValidatedEngineState");
    const invalidState = { ...directDrawFixture(), stateVersion: -1 };
    expect(() => enginePublicApi.assertValidAuthoritativeState(invalidState)).toThrow(
      "STATE_INVARIANT_FAILED",
    );
  });

  it("combines simultaneous Hand yaku, records them atomically, and pauses before Draw", () => {
    const state = buildStateFixture({
      aHand: MULTI_HAND,
      bHand: MULTI_OPPONENT_HAND,
      field: MULTI_FIELD,
      aCaptured: ["march-curtain", "august-moon"],
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    });
    expect(validateAuthoritativeState(state)).toEqual([]);
    const before = JSON.stringify(state);
    const unrevealedDraw = state.round.drawPile[0];
    const privateOpponentCard = state.players[1].hand[0];

    const transition = playHandCard(state, "player-a", "september-sake-cup");

    expect(JSON.stringify(state)).toBe(before);
    expect(transition.state.stateVersion).toBe(21);
    expect(transition.state.phase).toEqual({
      kind: "awaitingYakuDecision",
      playerId: "player-a",
      context: {
        phase: "hand",
        newYaku: [
          { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
          { key: "moonViewing", name: "Moon Viewing", points: 5 },
        ],
        activeYaku: [
          { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
          { key: "moonViewing", name: "Moon Viewing", points: 5 },
        ],
        currentYakuTotal: 10,
        resume: { kind: "drawPhase" },
      },
    });
    expect(transition.state.players[0].seenYakuKeys).toEqual(["blossomViewing", "moonViewing"]);
    expect(transition.state.round.completedYakuFormations).toEqual([
      {
        sequence: 1,
        playerId: "player-a",
        phase: "hand",
        yaku: { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
        contributingCardIds: ["march-curtain", "september-sake-cup"],
      },
      {
        sequence: 2,
        playerId: "player-a",
        phase: "hand",
        yaku: { key: "moonViewing", name: "Moon Viewing", points: 5 },
        contributingCardIds: ["august-moon", "september-sake-cup"],
      },
    ]);
    expect(transition.state.round.firstYakuTriggerPlayerId).toBe("player-a");
    expect(transition.state.round.drawPile).toEqual(state.round.drawPile);
    expect(transition.events.map((event) => event.type)).toEqual([
      "handCardPlayed",
      "captureStarted",
      "cardsCaptured",
      "yakuCompleted",
      "yakuCompleted",
      "yakuDecisionRequired",
    ]);
    expect(transition.events.every((event) => event.audience.kind === "public")).toBe(true);
    expect(JSON.stringify(transition.events)).not.toContain(unrevealedDraw);
    expect(JSON.stringify(transition.events)).not.toContain(privateOpponentCard);
    expect(
      getLegalActions(transition.state, "player-a").map((action) =>
        action.type === "chooseYakuDecision" ? action.choice : action.type,
      ),
    ).toEqual(["bank", "koiKoi"]);
    expect(getLegalActions(transition.state, "player-b")).toEqual([]);
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
    expect(Object.isFrozen(transition.state.phase)).toBe(true);
    expect(Object.isFrozen(transition.events)).toBe(true);
    if (transition.state.phase.kind !== "awaitingYakuDecision") {
      throw new Error("Combined Hand decision phase missing.");
    }
    const decisionPhase = transition.state.phase;

    const incompleteContext: AuthoritativeGameStateV1 = {
      ...transition.state,
      phase: {
        ...decisionPhase,
        context: {
          ...decisionPhase.context,
          newYaku: decisionPhase.context.newYaku.slice(0, 1),
        },
      },
    };
    expect(validateAuthoritativeState(incompleteContext).map((entry) => entry.code)).toContain(
      "YAKU_DECISION_CONTEXT_INVALID",
    );

    let rejection: unknown;
    try {
      playHandCard(transition.state, "player-a", "january-crane");
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(EngineCommandError);
    expect((rejection as EngineCommandError).code).toBe("COMMAND_NOT_ALLOWED_IN_PHASE");

    const banked = applyGameplayCommand(transition.state, {
      type: "chooseYakuDecision",
      commandId: "bank-formed-yaku",
      matchId: transition.state.matchId,
      actorId: "player-a",
      expectedStateVersion: transition.state.stateVersion,
      choice: "bank",
    });
    const result = banked.state.history[0];
    expect(result?.evidence).toEqual({
      kind: "ordinaryYaku",
      completedFormations: transition.state.round.completedYakuFormations,
      scoredYaku: [
        {
          formationSequence: 1,
          yaku: { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
          contributingCardIds: ["march-curtain", "september-sake-cup"],
        },
        {
          formationSequence: 2,
          yaku: { key: "moonViewing", name: "Moon Viewing", points: 5 },
          contributingCardIds: ["august-moon", "september-sake-cup"],
        },
      ],
    });
    expect(validateAuthoritativeState(banked.state)).toEqual([]);
    const firstFormation = transition.state.round.completedYakuFormations[0];
    const secondFormation = transition.state.round.completedYakuFormations[1];
    if (firstFormation === undefined || secondFormation === undefined) {
      throw new Error("Combined formation evidence is incomplete.");
    }
    const malformedFormation: AuthoritativeGameStateV1 = {
      ...transition.state,
      round: {
        ...transition.state.round,
        completedYakuFormations: [
          {
            ...firstFormation,
            contributingCardIds: ["march-curtain", "august-moon"],
          },
          secondFormation,
        ],
      },
    };
    expect(validateAuthoritativeState(malformedFormation).map((entry) => entry.code)).toContain(
      "ROUND_YAKU_FORMATIONS_INVALID",
    );
    if (result?.evidence?.kind !== "ordinaryYaku" || banked.state.phase.kind !== "roundComplete") {
      throw new Error("Banked ordinary-yaku evidence is missing.");
    }
    const firstScoredYaku = result.evidence.scoredYaku[0];
    const secondScoredYaku = result.evidence.scoredYaku[1];
    if (firstScoredYaku === undefined || secondScoredYaku === undefined) {
      throw new Error("Banked scored-yaku evidence is incomplete.");
    }
    const malformedResult = {
      ...result,
      evidence: {
        ...result.evidence,
        scoredYaku: [
          {
            ...firstScoredYaku,
            contributingCardIds: ["march-curtain", "august-moon"] as const,
          },
          secondScoredYaku,
        ],
      },
    };
    const malformedScoredRows: AuthoritativeGameStateV1 = {
      ...banked.state,
      history: [malformedResult],
      phase: { ...banked.state.phase, result: malformedResult },
    };
    expect(validateAuthoritativeState(malformedScoredRows).map((entry) => entry.code)).toContain(
      "CURRENT_ROUND_RESULT_INVALID",
    );
  });

  it("completes Current-Month Set from a Hand four-card sweep without revealing Draw", () => {
    const state = buildStateFixture({
      aHand: [
        "january-crane",
        "february-bush-warbler",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
      ],
      bHand: [
        "march-curtain",
        "august-moon",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
      field: [
        "january-red-text-scroll",
        "january-pine-plain-a",
        "january-pine-plain-b",
        "february-red-text-scroll",
        "february-plum-plain-a",
        "march-red-text-scroll",
        "march-cherry-plain-a",
        "april-red-scroll",
        "april-wisteria-plain-a",
        "may-red-scroll",
        "may-iris-plain-a",
        "june-blue-scroll",
        "june-peony-plain-a",
        "july-red-scroll",
        "july-bush-clover-plain-a",
        "august-geese",
      ],
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    });
    expect(validateAuthoritativeState(state)).toEqual([]);

    const transition = playHandCard(state, "player-a", "january-crane");

    expect(transition.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      playerId: "player-a",
      context: {
        phase: "hand",
        newYaku: [{ key: "currentMonthSet", name: "Current-Month Set", points: 5 }],
        currentYakuTotal: 5,
        resume: { kind: "drawPhase" },
      },
    });
    expect(transition.state.players[0].captured).toEqual([
      "january-crane",
      "january-red-text-scroll",
      "january-pine-plain-a",
      "january-pine-plain-b",
    ]);
    expect(transition.events.some((event) => event.type === "drawCardRevealed")).toBe(false);
  });

  it("completes Current-Month Set after its two pairs accumulated across actions", () => {
    const state = buildStateFixture({
      aHand: [
        "january-crane",
        "february-bush-warbler",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
      ],
      bHand: [
        "march-curtain",
        "august-moon",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
      field: [
        "january-pine-plain-a",
        "january-pine-plain-b",
        "february-red-text-scroll",
        "february-plum-plain-a",
        "march-red-text-scroll",
        "march-cherry-plain-a",
        "april-red-scroll",
        "april-wisteria-plain-a",
        "may-red-scroll",
        "may-iris-plain-a",
        "june-blue-scroll",
        "june-peony-plain-a",
        "july-red-scroll",
        "july-bush-clover-plain-a",
        "august-geese",
        "august-pampas-plain-a",
      ],
      drawHead: "january-red-text-scroll",
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    });
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(state.players[0].activeYaku).toEqual([]);

    const revealed = playHandCard(state, "player-a", "january-crane", "january-pine-plain-a");
    const transition = resolveDraw(revealed.state, "player-a");

    expect(transition.state.players[0].captured).toEqual([
      "january-crane",
      "january-pine-plain-a",
      "january-red-text-scroll",
      "january-pine-plain-b",
    ]);
    expect(transition.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      context: {
        phase: "draw",
        newYaku: [{ key: "currentMonthSet", name: "Current-Month Set", points: 5 }],
        resume: { kind: "completeTurn", lastActorId: "player-a" },
      },
    });
    expect(revealed.events.map((event) => event.type)).toEqual([
      "handCardPlayed",
      "captureStarted",
      "cardsCaptured",
      "drawCardRevealed",
      "drawResolutionRequired",
    ]);
    expect(transition.events.map((event) => event.type)).toEqual([
      "captureStarted",
      "cardsCaptured",
      "yakuCompleted",
      "yakuDecisionRequired",
    ]);
  });

  it("pauses after a direct Draw trigger without completing the turn", () => {
    const state = directDrawFixture();
    expect(validateAuthoritativeState(state)).toEqual([]);

    const revealed = playHandCard(state, "player-a", "december-phoenix");
    const transition = resolveDraw(revealed.state, "player-a");

    expect(transition.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      playerId: "player-a",
      context: {
        phase: "draw",
        newYaku: [{ key: "blossomViewing", name: "Blossom Viewing", points: 5 }],
        currentYakuTotal: 5,
        resume: { kind: "completeTurn", lastActorId: "player-a" },
      },
    });
    expect(revealed.events.map((event) => event.type)).toEqual([
      "handCardPlayed",
      "cardPlacedOnField",
      "drawCardRevealed",
      "drawResolutionRequired",
    ]);
    expect(transition.events.map((event) => event.type)).toEqual([
      "captureStarted",
      "cardsCaptured",
      "yakuCompleted",
      "yakuDecisionRequired",
    ]);
    expect(transition.events.some((event) => event.type === "turnCompleted")).toBe(false);
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
  });

  it("defers Draw yaku until an exact-two pending capture is chosen", () => {
    const pendingField = [
      ...DRAW_FIELD.filter((cardId) => cardId !== "august-geese"),
      "september-chrysanthemum-plain-a",
    ] as readonly CardId[];
    const pendingOpponentHand = DRAW_OPPONENT_HAND.map((cardId) =>
      cardId === "september-chrysanthemum-plain-a" ? "august-geese" : cardId,
    ) as readonly CardId[];
    const state = buildStateFixture({
      aHand: DRAW_HAND,
      bHand: pendingOpponentHand,
      field: pendingField,
      aCaptured: ["march-curtain", "october-maple-plain-b"],
      drawHead: "september-sake-cup",
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    });
    expect(validateAuthoritativeState(state)).toEqual([]);

    const pending = playHandCard(state, "player-a", "december-phoenix");
    expect(pending.state.phase).toEqual({
      kind: "awaitingDrawResolution",
      playerId: "player-a",
      drawnCardId: "september-sake-cup",
      resolution: {
        kind: "captureChoice",
        matchingFieldCardIds: ["september-blue-scroll", "september-chrysanthemum-plain-a"],
      },
    });
    expect(pending.state.players[0].seenYakuKeys).toEqual([]);
    expect(pending.events.some((event) => event.type.startsWith("yaku"))).toBe(false);

    const transition = applyGameplayCommand(pending.state, {
      type: "resolveDrawCard",
      commandId: "choose-pending-yaku",
      matchId: pending.state.matchId,
      actorId: "player-a",
      expectedStateVersion: pending.state.stateVersion,
      targetFieldCardId: "september-blue-scroll",
    });

    expect(transition.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      context: {
        phase: "draw",
        newYaku: [{ key: "blossomViewing", name: "Blossom Viewing", points: 5 }],
        resume: { kind: "completeTurn", lastActorId: "player-a" },
      },
    });
    expect(transition.events.map((event) => event.type)).toEqual([
      "captureStarted",
      "cardsCaptured",
      "yakuCompleted",
      "yakuDecisionRequired",
    ]);
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
  });

  it("updates an already-seen count yaku without opening another decision", () => {
    const state = buildStateFixture({
      aHand: [
        "august-geese",
        "august-moon",
        "august-pampas-plain-b",
        "january-crane",
        "march-curtain",
        "october-deer",
      ],
      bHand: [
        "december-phoenix",
        "december-paulownia-plain-b",
        "december-paulownia-plain-c",
        "september-chrysanthemum-plain-a",
        "september-chrysanthemum-plain-b",
        "october-blue-scroll",
      ],
      field: [
        "august-pampas-plain-a",
        "january-pine-plain-a",
        "january-pine-plain-b",
        "february-red-text-scroll",
        "march-red-text-scroll",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "october-maple-plain-a",
      ],
      aCaptured: [
        "february-bush-warbler",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "november-swallow",
        "september-sake-cup",
      ],
      aSeen: ["animals"],
      drawHead: "december-paulownia-plain-a",
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    });
    expect(validateAuthoritativeState(state)).toEqual([]);
    expect(state.players[0].currentYakuTotal).toBe(4);

    const revealed = playHandCard(state, "player-a", "august-geese");
    const transition = resolveDraw(revealed.state, "player-a");

    expect(transition.state.phase).toEqual({ kind: "awaitingHandPlay", playerId: "player-b" });
    expect(transition.state.players[0].seenYakuKeys).toEqual(["animals"]);
    expect(transition.state.players[0].activeYaku).toEqual([
      { key: "animals", name: "Animals", points: 5 },
    ]);
    expect(revealed.events.map((event) => event.type)).toEqual([
      "handCardPlayed",
      "captureStarted",
      "cardsCaptured",
      "yakuValueChanged",
      "drawCardRevealed",
      "drawResolutionRequired",
    ]);
    expect(transition.events.map((event) => event.type)).toEqual([
      "cardPlacedOnField",
      "turnCompleted",
    ]);
    expect(revealed.events).toContainEqual({
      type: "yakuValueChanged",
      audience: { kind: "public" },
      actorId: "player-a",
      phase: "hand",
      yakuKey: "animals",
      name: "Animals",
      previousPoints: 4,
      currentPoints: 5,
    });
    expect(transition.events.some((event) => event.type === "yakuDecisionRequired")).toBe(false);
    expect(transition.state.round.completedYakuFormations).toEqual(
      state.round.completedYakuFormations,
    );
  });

  it("rejects fabricated player-local trigger history without capture evidence", () => {
    const baseline = directDrawFixture();
    for (const fakeKey of ["animals", "scrolls", "currentMonthSet"] as const) {
      const malformed: AuthoritativeGameStateV1 = {
        ...baseline,
        players: [
          {
            ...baseline.players[0],
            seenYakuKeys: [fakeKey],
          },
          baseline.players[1],
        ],
        round: { ...baseline.round, firstYakuTriggerPlayerId: "player-a" },
      };
      expect(validateAuthoritativeState(malformed).map((entry) => entry.code)).toContain(
        "PLAYER_YAKU_SEEN_EVIDENCE_INVALID",
      );
    }
  });

  it("preserves End-of-Play and pauses a final Draw trigger for Player B", () => {
    const noTriggerState = finalTurnFixture("october-blue-scroll");
    expect(validateAuthoritativeState(noTriggerState)).toEqual([]);
    const noTriggerRevealed = playHandCard(noTriggerState, "player-b", "december-phoenix");
    const completed = resolveDraw(noTriggerRevealed.state, "player-b");
    expect(completed.state.phase).toMatchObject({
      kind: "roundComplete",
      result: { kind: "endOfPlayNoScore", reasonCode: "END_OF_PLAY_NO_SCORE" },
    });
    expect(completed.state.round.drawPile).toHaveLength(8);
    expect(completed.events.map((event) => event.type).slice(-4)).toEqual([
      "turnCompleted",
      "endOfPlayReached",
      "roundResultCommitted",
      "roundTransitionPrepared",
    ]);

    const triggerState = finalTurnFixture("september-sake-cup");
    expect(validateAuthoritativeState(triggerState)).toEqual([]);
    expect(triggerState.players[0].seenYakuKeys).toEqual(["animalTrio", "animals", "scrolls"]);
    const triggerRevealed = playHandCard(triggerState, "player-b", "december-phoenix");
    const transition = resolveDraw(triggerRevealed.state, "player-b");

    expect(transition.state.phase).toMatchObject({
      kind: "awaitingYakuDecision",
      playerId: "player-b",
      context: {
        phase: "draw",
        newYaku: [{ key: "blossomViewing", name: "Blossom Viewing", points: 5 }],
        resume: { kind: "endOfPlay", lastActorId: "player-b" },
      },
    });
    expect(transition.state.players[1].seenYakuKeys).toEqual(["blossomViewing"]);
    expect(transition.state.round.firstYakuTriggerPlayerId).toBe("player-a");
    expect(transition.state.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(transition.state.round.drawPile).toHaveLength(8);
    expect(transition.events.some((event) => event.type === "turnCompleted")).toBe(false);
    expect(transition.events.some((event) => event.type === "endOfPlayReached")).toBe(false);
    expect(validateAuthoritativeState(transition.state)).toEqual([]);
    if (transition.state.phase.kind !== "awaitingYakuDecision") {
      throw new Error("Final-draw decision phase missing.");
    }
    const decisionPhase = transition.state.phase;

    const invalidResume: AuthoritativeGameStateV1 = {
      ...transition.state,
      phase: {
        ...decisionPhase,
        context: {
          ...decisionPhase.context,
          resume: { kind: "completeTurn", lastActorId: "player-b" },
        },
      },
    };
    expect(validateAuthoritativeState(invalidResume).map((entry) => entry.code)).toContain(
      "YAKU_DECISION_RESUME_INVALID",
    );
  });
});
