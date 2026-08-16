import {
  CARD_IDS,
  applyGameplayCommand,
  canonicalStringifyV1,
  deepFreeze,
  evaluateYaku,
  getHandPlayResolutionPreview,
  projectPlayerObservation,
  startMatchFromOrderedDeck,
  type AuthoritativeGameStateV1,
  type CardId,
  type GameplayCommandV1,
  type LegalActionV1,
  type PlayerObservationV1,
} from "@koikoi4x/engine";
import { PHASE_1B_CAPTURE_FIXTURES } from "@koikoi4x/test-fixtures";
import { describe, expect, it } from "vitest";

import determinizationSource from "../src/ai/rollout-determinization.ts?raw";
import modelSource from "../src/ai/rollout-model.ts?raw";
import selectorSource from "../src/ai/rollout.ts?raw";
import typesSource from "../src/ai/types.ts?raw";
import { chooseFairCpuDecision } from "../src/ai/fair-heuristic";
import {
  CPU_ROLLOUT_BUDGETS,
  abstractRolloutInitialCursor,
  chooseRolloutCpuDecision,
  determinizeCpuObservation,
  evaluateAbstractRollout,
} from "../src/ai/rollout";

const ROOT_SEED = "phase6c-focused-root-seed";

function captureState(id: "CAP-001" | "CAP-002A"): AuthoritativeGameStateV1 {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`AI_6C_FIXTURE_MISSING: ${id}`);
  return startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `ai-6c-${id.toLowerCase()}-start`,
      matchId: fixture.matchId,
      expectedStateVersion: 0,
      matchLength: 3,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    fixture.orderedDeck,
    "player-a",
  ).state;
}

function commandFromAction(
  state: AuthoritativeGameStateV1,
  action: LegalActionV1,
): GameplayCommandV1 {
  const base = {
    commandId: `ai-6c-submit-${state.stateVersion}`,
    matchId: state.matchId,
    actorId: action.actorId,
    expectedStateVersion: state.stateVersion,
  };
  if (action.type === "playHandCard") {
    return deepFreeze({
      ...base,
      type: "playHandCard" as const,
      cardId: action.cardId,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    });
  }
  if (action.type === "resolveDrawCard") {
    return deepFreeze({
      ...base,
      type: "resolveDrawCard" as const,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    });
  }
  return deepFreeze({ ...base, type: "chooseYakuDecision" as const, choice: action.choice });
}

function productionCpuHandState(): AuthoritativeGameStateV1 {
  const state = captureState("CAP-001");
  const observation = projectPlayerObservation(state, "player-a");
  const handAction = observation.legalActions[0];
  if (!handAction) throw new Error("AI_6C_HAND_ACTION_MISSING");
  const afterHand = applyGameplayCommand(state, commandFromAction(state, handAction)).state;
  const drawObservation = projectPlayerObservation(afterHand, "player-a");
  const drawAction = drawObservation.legalActions[0];
  if (!drawAction) throw new Error("AI_6C_DRAW_ACTION_MISSING");
  const cpuState = applyGameplayCommand(afterHand, commandFromAction(afterHand, drawAction)).state;
  if (cpuState.phase.kind !== "awaitingHandPlay" || cpuState.phase.playerId !== "player-b") {
    throw new Error("AI_6C_CPU_TURN_NOT_REACHED");
  }
  return cpuState;
}

function fullyKnownDifferentialObservation(): PlayerObservationV1 {
  const base = projectPlayerObservation(captureState("CAP-001"), "player-a");
  const ownHand = ["september-sake-cup", "january-pine-plain-a"] as const;
  const field = ["september-chrysanthemum-plain-a", "january-pine-plain-b"] as const;
  const cpuCaptured = ["march-curtain"] as const;
  const assigned = new Set<CardId>([...ownHand, ...field, ...cpuCaptured]);
  const opponentCaptured = CARD_IDS.filter((cardId) => !assigned.has(cardId));
  const cpuYaku = evaluateYaku(cpuCaptured, 3);
  const opponentYaku = evaluateYaku(opponentCaptured, 3);
  if (base.publicState.players[0].id !== "player-a") {
    throw new Error(`AI_6C_PLAYER_ORDER_UNEXPECTED:${base.publicState.players[0].id}`);
  }
  const sakeAction = deepFreeze({
    type: "playHandCard" as const,
    actorId: "player-a" as const,
    cardId: ownHand[0],
    resolution: getHandPlayResolutionPreview(field, ownHand[0]),
  });
  const plainAction = deepFreeze({
    type: "playHandCard" as const,
    actorId: "player-a" as const,
    cardId: ownHand[1],
    resolution: getHandPlayResolutionPreview(field, ownHand[1]),
  });
  return deepFreeze({
    ...base,
    ownHand,
    legalActions: [plainAction, sakeAction],
    publicState: {
      ...base.publicState,
      players: [
        {
          ...base.publicState.players[0],
          handCount: ownHand.length,
          captured: cpuCaptured,
          activeYaku: cpuYaku.activeYaku,
          currentYakuTotal: cpuYaku.currentYakuTotal,
        },
        {
          ...base.publicState.players[1],
          handCount: 0,
          captured: opponentCaptured,
          activeYaku: opponentYaku.activeYaku,
          currentYakuTotal: opponentYaku.currentYakuTotal,
        },
      ],
      round: { ...base.publicState.round, field, drawPileCount: 0 },
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    },
  });
}

function fullyKnownTieObservation(): PlayerObservationV1 {
  const base = projectPlayerObservation(captureState("CAP-001"), "player-a");
  const ownHand = ["january-pine-plain-a", "february-plum-plain-a"] as const;
  const assigned = new Set<CardId>(ownHand);
  const opponentCaptured = CARD_IDS.filter((cardId) => !assigned.has(cardId));
  const opponentYaku = evaluateYaku(opponentCaptured, 1);
  const actions = ownHand.map((cardId) =>
    deepFreeze({
      type: "playHandCard" as const,
      actorId: "player-a" as const,
      cardId,
      resolution: getHandPlayResolutionPreview([], cardId),
    }),
  );
  return deepFreeze({
    ...base,
    ownHand,
    legalActions: actions,
    publicState: {
      ...base.publicState,
      players: [
        {
          ...base.publicState.players[0],
          handCount: ownHand.length,
          captured: [],
          activeYaku: [],
          currentYakuTotal: 0,
        },
        {
          ...base.publicState.players[1],
          handCount: 0,
          captured: opponentCaptured,
          activeYaku: opponentYaku.activeYaku,
          currentYakuTotal: opponentYaku.currentYakuTotal,
        },
      ],
      round: { ...base.publicState.round, field: [], drawPileCount: 0 },
      phase: { kind: "awaitingHandPlay", playerId: "player-a" },
    },
  });
}

describe("Phase 6C fair observation-only rollout CPU", () => {
  it("AI-6C-001 partitions the exact current-round unseen complement into hidden zones", () => {
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const worlds = determinizeCpuObservation(observation, ROOT_SEED, 4);
    const repeatedWorlds = determinizeCpuObservation(observation, ROOT_SEED, 4);
    const alternateWorlds = determinizeCpuObservation(observation, `${ROOT_SEED}-alternate`, 4);
    expect(worlds).toHaveLength(4);
    expect(canonicalStringifyV1(repeatedWorlds)).toBe(canonicalStringifyV1(worlds));
    expect(canonicalStringifyV1(alternateWorlds)).not.toBe(canonicalStringifyV1(worlds));
    const known = new Set<CardId>([
      ...observation.publicState.round.field,
      ...observation.publicState.players.flatMap((player) => player.captured),
      ...observation.ownHand,
    ]);
    const opponent = observation.publicState.players.find(({ id }) => id !== observation.playerId);
    if (!opponent) throw new Error("AI_6C_OPPONENT_MISSING");
    for (const world of worlds) {
      expect(world.opponentHand).toHaveLength(opponent.handCount);
      expect(world.drawPile).toHaveLength(observation.publicState.round.drawPileCount);
      expect(world.opponentHand).toEqual([...world.opponentHand].sort());
      const complete = [...known, ...world.opponentHand, ...world.drawPile];
      expect(new Set(complete).size).toBe(CARD_IDS.length);
      expect(new Set(complete)).toEqual(new Set(CARD_IDS));
      expect(Object.isFrozen(world)).toBe(true);
    }
    expect(Object.isFrozen(worlds)).toBe(true);
    expect(determinizationSource).not.toContain("publicState.history");
  });

  it("AI-6C-002 repeats by seed and ignores offered-action ordering", () => {
    const observation = projectPlayerObservation(captureState("CAP-002A"), "player-a");
    const reversed = deepFreeze({
      ...observation,
      legalActions: [...observation.legalActions].reverse(),
    });
    const first = chooseRolloutCpuDecision(observation, "monk", "hard", ROOT_SEED);
    const repeated = chooseRolloutCpuDecision(observation, "monk", "hard", ROOT_SEED);
    const reordered = chooseRolloutCpuDecision(reversed, "monk", "hard", ROOT_SEED);
    expect(first).toEqual(repeated);
    expect(reordered).toEqual(first);
    expect(observation.legalActions).toContain(first?.action);
    expect(reversed.legalActions).toContain(reordered?.action);
  });

  it("AI-6C-003 cannot react to production Player A hidden-card mutations", () => {
    const state = productionCpuHandState();
    const playerA = state.players.find(({ id }) => id === "player-a");
    const firstDraw = state.round.drawPile[0];
    const firstHumanCard = playerA?.hand[0];
    if (!playerA || !firstDraw || !firstHumanCard) throw new Error("AI_6C_PRIVATE_ZONE_MISSING");
    const privateVariant: AuthoritativeGameStateV1 = deepFreeze({
      ...state,
      players: [{ ...playerA, hand: [firstDraw, ...playerA.hand.slice(1)] }, state.players[1]],
      round: { ...state.round, drawPile: [firstHumanCard, ...state.round.drawPile.slice(1)] },
    });
    const original = projectPlayerObservation(state, "player-b");
    const variant = projectPlayerObservation(privateVariant, "player-b");
    expect(variant).toEqual(original);
    expect(chooseRolloutCpuDecision(variant, "gambler", "hard", ROOT_SEED)).toEqual(
      chooseRolloutCpuDecision(original, "gambler", "hard", ROOT_SEED),
    );
  });

  it("AI-6C-004 returns an exact offered reference, preserves input, and returns null iff empty", () => {
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const before = canonicalStringifyV1(observation);
    const decision = chooseRolloutCpuDecision(observation, "timid", "standard", ROOT_SEED);
    expect(decision).not.toBeNull();
    expect(observation.legalActions).toContain(decision?.action);
    expect(canonicalStringifyV1(observation)).toBe(before);
    expect(Object.isFrozen(decision)).toBe(true);
    const empty = deepFreeze({ ...observation, legalActions: [] });
    expect(chooseRolloutCpuDecision(empty, "timid", "standard", ROOT_SEED)).toBeNull();
  });

  it("AI-6C-005 values a fully-known differential capture/Yaku and stops at that Yaku", () => {
    const observation = fullyKnownDifferentialObservation();
    const worlds = determinizeCpuObservation(observation, ROOT_SEED, 1);
    expect(worlds).toEqual([{ opponentHand: [], drawPile: [] }]);
    const sake = observation.legalActions.find(
      (action) => action.type === "playHandCard" && action.cardId === "september-sake-cup",
    );
    const plain = observation.legalActions.find(
      (action) => action.type === "playHandCard" && action.cardId === "january-pine-plain-a",
    );
    const world = worlds[0];
    if (!sake || !plain || !world) throw new Error("AI_6C_DIFFERENTIAL_MISSING");
    const sakeResult = evaluateAbstractRollout(observation, sake, world, "monk", 1);
    const plainResult = evaluateAbstractRollout(observation, plain, world, "monk", 1);
    expect(
      evaluateYaku(["march-curtain", "september-sake-cup", "september-chrysanthemum-plain-a"], 3)
        .currentYakuTotal,
    ).toBe(5);
    expect(sakeResult.captureNodes).toBe(0);
    expect(sakeResult.utility).toBeGreaterThan(plainResult.utility);
    for (const rootSeed of [ROOT_SEED, "alternate-session-root", "third-session-root"]) {
      const decision = chooseRolloutCpuDecision(observation, "monk", "easy", rootSeed);
      expect(decision?.action).toBe(sake);
      expect(decision && { reason: decision.reason, confidence: decision.confidence }).toEqual({
        reason: "completeYaku",
        confidence: 0.86,
      });
    }
  });

  it("AI-6C-005b begins continuation at the root action's exact public resume phase", () => {
    const handState = captureState("CAP-001");
    const handObservation = projectPlayerObservation(handState, "player-a");
    const handAction = handObservation.legalActions[0];
    if (!handAction) throw new Error("AI_6C_CURSOR_HAND_MISSING");
    const drawState = applyGameplayCommand(
      handState,
      commandFromAction(handState, handAction),
    ).state;
    const drawObservation = projectPlayerObservation(drawState, "player-a");
    const drawAction = drawObservation.legalActions[0];
    if (!drawAction || drawAction.type !== "resolveDrawCard") {
      throw new Error("AI_6C_CURSOR_DRAW_MISSING");
    }
    expect(abstractRolloutInitialCursor(handAction, handObservation)).toBe("cpuDraw");
    expect(abstractRolloutInitialCursor(drawAction, drawObservation)).toBe("opponentHand");

    const koiAction = deepFreeze({
      type: "chooseYakuDecision" as const,
      actorId: "player-a" as const,
      choice: "koiKoi" as const,
      currentTableMultiplier: 1 as const,
      resultingTableMultiplier: 2 as const,
    });
    const yakuContext = {
      phase: "hand" as const,
      newYaku: [],
      activeYaku: [],
      currentYakuTotal: 5,
    };
    const drawResume = deepFreeze({
      ...handObservation,
      publicState: {
        ...handObservation.publicState,
        phase: {
          kind: "awaitingYakuDecision" as const,
          playerId: "player-a" as const,
          context: { ...yakuContext, resume: { kind: "drawPhase" as const } },
        },
      },
      legalActions: [koiAction],
    });
    const turnResume = deepFreeze({
      ...drawResume,
      publicState: {
        ...drawResume.publicState,
        phase: {
          ...drawResume.publicState.phase,
          context: {
            ...drawResume.publicState.phase.context,
            resume: { kind: "completeTurn" as const, lastActorId: "player-a" as const },
          },
        },
      },
    });
    expect(abstractRolloutInitialCursor(koiAction, drawResume)).toBe("cpuDraw");
    expect(abstractRolloutInitialCursor(koiAction, turnResume)).toBe("opponentHand");
  });

  it("AI-6C-006 locks fixed budgets and deterministically falls back on partition/ceiling failure", () => {
    expect(CPU_ROLLOUT_BUDGETS).toEqual({
      easy: { determinizations: 4, depth: 1, captureNodeCeiling: 2048 },
      standard: { determinizations: 12, depth: 2, captureNodeCeiling: 2048 },
      hard: { determinizations: 24, depth: 4, captureNodeCeiling: 2048 },
    });
    expect(Object.isFrozen(CPU_ROLLOUT_BUDGETS.hard)).toBe(true);
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const invalidPartition = deepFreeze({
      ...observation,
      publicState: {
        ...observation.publicState,
        players: [
          observation.publicState.players[0],
          {
            ...observation.publicState.players[1],
            handCount: observation.publicState.players[1].handCount + 1,
          },
        ] as const,
      },
    });
    expect(chooseRolloutCpuDecision(invalidPartition, "monk", "hard", ROOT_SEED)).toEqual(
      chooseFairCpuDecision(invalidPartition, "monk", "hard"),
    );

    const overCeiling = deepFreeze({
      ...observation,
      legalActions: Array.from({ length: 18 }, () => observation.legalActions[0]).filter(
        (action): action is LegalActionV1 => action !== undefined,
      ),
    });
    expect(chooseRolloutCpuDecision(overCeiling, "monk", "hard", "seed-a")).toEqual(
      chooseFairCpuDecision(overCeiling, "monk", "hard"),
    );
    expect(chooseRolloutCpuDecision(overCeiling, "monk", "hard", "seed-b")).toEqual(
      chooseFairCpuDecision(overCeiling, "monk", "hard"),
    );
  });

  it("AI-6C-007 keeps public explanation metadata independent of the root seed", () => {
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const single = deepFreeze({
      ...observation,
      legalActions: observation.legalActions.slice(0, 1),
    });
    const first = chooseRolloutCpuDecision(single, "gambler", "hard", "root-one");
    const second = chooseRolloutCpuDecision(single, "gambler", "hard", "root-two");
    expect(first?.action).toBe(single.legalActions[0]);
    expect(second?.action).toBe(single.legalActions[0]);
    expect(first && { reason: first.reason, confidence: first.confidence }).toEqual(
      second && { reason: second.reason, confidence: second.confidence },
    );
    expect(first).not.toHaveProperty("seed");
    expect(first).not.toHaveProperty("worlds");
    expect(first).not.toHaveProperty("utility");
  });

  it("AI-6C-007b permits the root seed to vary only an exactly equal-utility tie", () => {
    const observation = fullyKnownTieObservation();
    const selected = new Set<CardId>();
    for (let index = 0; index < 64; index += 1) {
      const decision = chooseRolloutCpuDecision(
        observation,
        "monk",
        "easy",
        `equal-tie-root-${index}`,
      );
      if (!decision || decision.action.type !== "playHandCard") {
        throw new Error("AI_6C_EQUAL_TIE_DECISION_MISSING");
      }
      selected.add(decision.action.cardId);
      expect(observation.legalActions).toContain(decision.action);
    }
    expect(selected).toEqual(new Set(observation.ownHand));

    const beliefStart = selectorSource.indexOf("function beliefWorldSeed(");
    const tieStart = selectorSource.indexOf("function seededTieRank(");
    const selectorStart = selectorSource.indexOf("export const chooseRolloutCpuDecision");
    expect(beliefStart).toBeGreaterThanOrEqual(0);
    expect(tieStart).toBeGreaterThan(beliefStart);
    expect(selectorStart).toBeGreaterThan(tieStart);
    expect(selectorSource.slice(beliefStart, tieStart)).not.toContain("rootSeed");
    expect(selectorSource.slice(tieStart, selectorStart)).toContain("rootSeed");
  });

  it("AI-6C-008 keeps the rollout source inside the pure observation boundary", () => {
    const forbidden = [
      "AuthoritativeGameStateV1",
      "EngineCheckpointV1",
      "projectPlayerObservation",
      "applyGameplayCommand",
      "getLegalActions",
      "Math.random",
      "Date.now",
      "performance.now",
      "setTimeout",
      "setInterval",
      "window.",
      "document.",
      "localStorage",
      "indexedDB",
      "crypto.",
    ];
    for (const source of [determinizationSource, modelSource, selectorSource, typesSource]) {
      for (const token of forbidden) expect(source, token).not.toContain(token);
    }
    expect(determinizationSource).toContain("PlayerObservationV1");
    expect(modelSource).toContain("resolveCapture");
    expect(modelSource).toContain("evaluateYaku");
    expect(selectorSource).toContain("explainPublicCpuAction");
  });
});
