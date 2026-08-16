import {
  applyGameplayCommand,
  assertValidAuthoritativeState,
  canonicalStringifyV1,
  deepFreeze,
  projectPlayerObservation,
  startMatchFromOrderedDeck,
  type AuthoritativeGameStateV1,
  type GameplayCommandV1,
  type LegalActionV1,
  type PlayerObservationV1,
} from "@koikoi4x/engine";
import { PHASE_1B_CAPTURE_FIXTURES } from "@koikoi4x/test-fixtures";
import { describe, expect, it } from "vitest";

import fairHeuristicSource from "../src/ai/fair-heuristic.ts?raw";
import typesSource from "../src/ai/types.ts?raw";
import {
  CPU_PERSONALITIES,
  chooseFairCpuAction,
  type CpuPersonalityV1,
} from "../src/ai/fair-heuristic";

function captureState(id: "CAP-001" | "CAP-002A" | "CAP-DRAW-002"): AuthoritativeGameStateV1 {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`AI_CAPTURE_FIXTURE_MISSING: ${id}`);
  return startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `ai-${id.toLowerCase()}-start`,
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
    commandId: `ai-submit-${state.stateVersion}`,
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

function firstYakuObservation(): PlayerObservationV1 {
  let state = captureState("CAP-001");
  for (let step = 0; step < 64; step += 1) {
    const phase = state.phase;
    if (phase.kind === "awaitingYakuDecision")
      return projectPlayerObservation(state, phase.playerId);
    if (phase.kind !== "awaitingHandPlay" && phase.kind !== "awaitingDrawResolution") {
      throw new Error(`AI_YAKU_FIXTURE_STOPPED: ${phase.kind}`);
    }
    const observation = projectPlayerObservation(state, phase.playerId);
    const action = observation.legalActions[0];
    if (!action) throw new Error("AI_YAKU_FIXTURE_ACTION_MISSING");
    state = applyGameplayCommand(state, commandFromAction(state, action)).state;
  }
  throw new Error("AI_YAKU_FIXTURE_NOT_REACHED");
}

function productionCpuHandState(): AuthoritativeGameStateV1 {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === "CAP-001");
  const openingCommand = fixture?.commands[0];
  if (!openingCommand) throw new Error("AI_PRODUCTION_CPU_FIXTURE_MISSING");
  const afterHand = applyGameplayCommand(captureState("CAP-001"), openingCommand).state;
  const drawObservation = projectPlayerObservation(afterHand, "player-a");
  const drawAction = drawObservation.legalActions[0];
  if (!drawAction) throw new Error("AI_PRODUCTION_CPU_DRAW_ACTION_MISSING");
  const state = applyGameplayCommand(afterHand, commandFromAction(afterHand, drawAction)).state;
  if (state.phase.kind !== "awaitingHandPlay" || state.phase.playerId !== "player-b") {
    throw new Error(`AI_PRODUCTION_CPU_NOT_ACTIVE: ${JSON.stringify(state.phase)}`);
  }
  return state;
}

describe("Phase 6A fair heuristic CPU", () => {
  it("exports the three fixed, non-random personalities", () => {
    expect(CPU_PERSONALITIES).toEqual(["timid", "monk", "gambler"]);
    expect(Object.isFrozen(CPU_PERSONALITIES)).toBe(true);
  });

  it("selects and submits an offered Hand action, including an exact-two target", () => {
    const state = captureState("CAP-002A");
    const observation = projectPlayerObservation(state, "player-a");
    const action = chooseFairCpuAction(observation, "monk");
    expect(action).not.toBeNull();
    if (!action) throw new Error("AI_HAND_ACTION_MISSING");
    expect(observation.legalActions).toContain(action);
    expect(action.type).toBe("playHandCard");
    expect(() => applyGameplayCommand(state, commandFromAction(state, action))).not.toThrow();
  });

  it("selects and submits an offered Draw-resolution action", () => {
    const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === "CAP-DRAW-002");
    if (!fixture) throw new Error("AI_DRAW_FIXTURE_MISSING");
    const openingCommand = fixture.commands[0];
    if (!openingCommand) throw new Error("AI_DRAW_OPENING_COMMAND_MISSING");
    const state = applyGameplayCommand(captureState("CAP-DRAW-002"), openingCommand).state;
    const observation = projectPlayerObservation(state, "player-a");
    const action = chooseFairCpuAction(observation, "monk");
    expect(action).not.toBeNull();
    if (!action) throw new Error("AI_DRAW_ACTION_MISSING");
    expect(action.type).toBe("resolveDrawCard");
    expect(observation.legalActions).toContain(action);
    expect(() => applyGameplayCommand(state, commandFromAction(state, action))).not.toThrow();
  });

  it("handles Bank/Koi-Koi and the forced single-choice subset without creating an action", () => {
    const observation = firstYakuObservation();
    expect(observation.publicState.phase.kind).toBe("awaitingYakuDecision");
    const bank = observation.legalActions.find(
      (action): action is Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }> =>
        action.type === "chooseYakuDecision" && action.choice === "bank",
    );
    const koiKoi = observation.legalActions.find(
      (action): action is Extract<LegalActionV1, { readonly type: "chooseYakuDecision" }> =>
        action.type === "chooseYakuDecision" && action.choice === "koiKoi",
    );
    if (!bank || !koiKoi) throw new Error("AI_YAKU_CHOICES_MISSING");
    for (const personality of CPU_PERSONALITIES) {
      const action = chooseFairCpuAction(observation, personality);
      expect(observation.legalActions).toContain(action);
    }
    const forced = deepFreeze({ ...observation, legalActions: [koiKoi] });
    expect(chooseFairCpuAction(forced, "timid")).toBe(koiKoi);
    expect(chooseFairCpuAction(forced, "monk")).toBe(koiKoi);
    expect(chooseFairCpuAction(forced, "gambler")).toBe(koiKoi);
  });

  it("returns null when an observation offers no action, including terminal/result views", () => {
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const terminal = deepFreeze({ ...observation, legalActions: [] });
    expect(chooseFairCpuAction(terminal, "timid")).toBeNull();
  });

  it("is deterministic across reordered equal-score legal actions and preserves immutable inputs", () => {
    const observation = projectPlayerObservation(captureState("CAP-001"), "player-a");
    const first = deepFreeze({
      type: "playHandCard" as const,
      actorId: "player-a" as const,
      cardId: "january-pine-plain-b" as const,
      resolution: { kind: "placeOnField" as const, matchingFieldCardIds: [] as const },
    });
    const second = deepFreeze({
      type: "playHandCard" as const,
      actorId: "player-a" as const,
      cardId: "january-pine-plain-a" as const,
      resolution: { kind: "placeOnField" as const, matchingFieldCardIds: [] as const },
    });
    const forward = deepFreeze({ ...observation, legalActions: [first, second] });
    const reverse = deepFreeze({ ...observation, legalActions: [second, first] });
    for (const personality of CPU_PERSONALITIES) {
      expect(chooseFairCpuAction(forward, personality)).toBe(second);
      expect(chooseFairCpuAction(reverse, personality)).toBe(second);
    }
    expect(Object.isFrozen(forward)).toBe(true);
    expect(Object.isFrozen(forward.legalActions)).toBe(true);
    expect(Object.isFrozen(chooseFairCpuAction(forward, "monk"))).toBe(true);
  });

  it("keeps the Timid and Gambler strategically distinct on the same public Yaku decision", () => {
    const observation = firstYakuObservation();
    const timid = chooseFairCpuAction(observation, "timid");
    const gambler = chooseFairCpuAction(observation, "gambler");
    expect(timid).toMatchObject({ type: "chooseYakuDecision", choice: "bank" });
    expect(gambler).toMatchObject({ type: "chooseYakuDecision", choice: "koiKoi" });
  });

  it("cannot react to a changed hidden hand/deck when the CPU observation stays identical", () => {
    const state = captureState("CAP-001");
    const privateVariant: AuthoritativeGameStateV1 = deepFreeze({
      ...state,
      players: [
        state.players[0],
        { ...state.players[1], hand: [...state.players[1].hand].reverse() },
      ],
      round: { ...state.round, drawPile: [...state.round.drawPile].reverse() },
    });
    const original = projectPlayerObservation(state, "player-a");
    const variant = projectPlayerObservation(privateVariant, "player-a");
    expect(variant).toEqual(original);
    for (const personality of CPU_PERSONALITIES satisfies readonly CpuPersonalityV1[]) {
      expect(chooseFairCpuAction(variant, personality)).toEqual(
        chooseFairCpuAction(original, personality),
      );
    }
  });

  it("keeps the production Player B CPU view and all personality choices invariant when Player A hidden cards change", () => {
    const state = productionCpuHandState();
    const playerA = state.players.find(({ id }) => id === "player-a");
    const firstDrawCard = state.round.drawPile[0];
    const firstHumanCard = playerA?.hand[0];
    if (!playerA || !firstDrawCard || !firstHumanCard) {
      throw new Error("AI_PRODUCTION_CPU_PRIVATE_ZONE_MISSING");
    }
    const privateVariant: AuthoritativeGameStateV1 = deepFreeze({
      ...state,
      players: [{ ...playerA, hand: [firstDrawCard, ...playerA.hand.slice(1)] }, state.players[1]],
      round: { ...state.round, drawPile: [firstHumanCard, ...state.round.drawPile.slice(1)] },
    });
    assertValidAuthoritativeState(state);
    assertValidAuthoritativeState(privateVariant);
    const original = projectPlayerObservation(state, "player-b");
    const variant = projectPlayerObservation(privateVariant, "player-b");
    expect(original.playerId).toBe("player-b");
    expect(canonicalStringifyV1(variant)).toBe(canonicalStringifyV1(original));
    expect(variant).toEqual(original);
    for (const personality of CPU_PERSONALITIES satisfies readonly CpuPersonalityV1[]) {
      const originalAction = chooseFairCpuAction(original, personality);
      const variantAction = chooseFairCpuAction(variant, personality);
      expect(original.legalActions).toContain(originalAction);
      expect(variant.legalActions).toContain(variantAction);
      expect(canonicalStringifyV1(variantAction)).toBe(canonicalStringifyV1(originalAction));
    }
  });

  it("keeps the CPU source free of authority, randomness, and rule-execution imports", () => {
    const forbidden = [
      "AuthoritativeGameStateV1",
      "EngineCheckpointV1",
      "RngSnapshotV1",
      "RandomSource",
      "projectPlayerObservation",
      "getLegalActions",
      "applyGameplayCommand",
      "Math.random",
      "Date.now",
      "setTimeout",
      "setInterval",
    ];
    for (const source of [fairHeuristicSource, typesSource]) {
      for (const token of forbidden) expect(source, token).not.toContain(token);
    }
  });
});
