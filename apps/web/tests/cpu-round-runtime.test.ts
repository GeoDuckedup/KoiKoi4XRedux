// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
import type { LegalActionV1, PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { chooseFairCpuAction, chooseFairCpuDecision } from "../src/ai/fair-heuristic";
import { createCpuRoundRuntime } from "../src/game/local-round-runtime";
import type { InputCommandIntentV1 } from "../src/presentation/input/types";

function intentFromAction(
  observation: PlayerObservationV1,
  action: LegalActionV1,
): InputCommandIntentV1 {
  const base = {
    formatVersion: 1 as const,
    matchId: observation.publicState.matchId,
    expectedStateVersion: observation.publicState.stateVersion,
    actorId: observation.playerId,
  };
  if (action.type === "playHandCard") {
    return Object.freeze({
      ...base,
      action: Object.freeze({
        type: "playHandCard" as const,
        cardId: action.cardId,
        ...(action.targetFieldCardId === undefined
          ? {}
          : { targetFieldCardId: action.targetFieldCardId }),
      }),
    });
  }
  if (action.type === "resolveDrawCard") {
    return Object.freeze({
      ...base,
      action: Object.freeze({
        type: "resolveDrawCard" as const,
        ...(action.targetFieldCardId === undefined
          ? {}
          : { targetFieldCardId: action.targetFieldCardId }),
      }),
    });
  }
  return Object.freeze({
    ...base,
    action: Object.freeze({ type: "chooseYakuDecision" as const, choice: action.choice }),
  });
}

function playHumanUntilCpu(runtime: ReturnType<typeof createCpuRoundRuntime>): void {
  for (let step = 0; step < 12; step += 1) {
    if (
      runtime.state.phase.kind !== "roundComplete" &&
      runtime.state.phase.kind !== "matchComplete" &&
      runtime.state.phase.playerId === "player-b"
    ) {
      return;
    }
    const observation = runtime.observe();
    const action = observation.legalActions[0];
    if (!action) throw new Error("CPU_RUNTIME_HUMAN_ACTION_MISSING");
    runtime.submit(intentFromAction(observation, action));
  }
  throw new Error("CPU_RUNTIME_CPU_TURN_NOT_REACHED");
}

describe("Phase 6A CPU round runtime", () => {
  it("prioritizes the CPU opponent lock over animation and transition-processing locks", () => {
    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    const start = main.indexOf("function currentInputLock(): InputLockReason | null {");
    const end = main.indexOf("\n}\n", start) + 2;
    expect(start).toBeGreaterThanOrEqual(0);
    const lock = main.slice(start, end);
    expect(lock.indexOf('if (deckStatus === "loading")')).toBeLessThan(
      lock.indexOf('if (isCpuTurn()) return "opponentTurn";'),
    );
    expect(lock.indexOf('if (isCpuTurn()) return "opponentTurn";')).toBeLessThan(
      lock.indexOf("if (animationDirector?.isBusy())"),
    );
    expect(lock.indexOf('if (isCpuTurn()) return "opponentTurn";')).toBeLessThan(
      lock.indexOf("if (processingIntent)"),
    );
  });

  it("keeps Player A as the permanent presentation observer while CPU player B acts", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-observer" });
    playHumanUntilCpu(runtime);
    const humanBefore = runtime.observe();
    const cpuObservation = runtime.observeFor("player-b");
    const action = chooseFairCpuAction(cpuObservation, "monk");
    if (!action) throw new Error("CPU_RUNTIME_ACTION_MISSING");
    const transition = runtime.submitCpuAction(action);

    expect(runtime.viewerId).toBe("player-a");
    expect(humanBefore.playerId).toBe("player-a");
    expect(cpuObservation.playerId).toBe("player-b");
    expect(transition.before.playerId).toBe("player-a");
    expect(transition.after.playerId).toBe("player-a");
    expect(transition.handoffPlayerId).toBeNull();
    expect(transition.events.length).toBeGreaterThan(0);

    const humanText = JSON.stringify(transition.after);
    const hiddenCpuCards = runtime.state.players.find(({ id }) => id === "player-b")?.hand ?? [];
    for (const cardId of hiddenCpuCards) expect(humanText).not.toContain(cardId);
  });

  it("submits only the 6B decision action while retaining no CPU action metadata for presentation", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-decision-action" });
    playHumanUntilCpu(runtime);
    const decision = chooseFairCpuDecision(runtime.observeFor("player-b"), "monk", "standard");
    if (!decision) throw new Error("CPU_RUNTIME_DECISION_MISSING");

    expect(runtime.observeFor("player-b").legalActions).toContainEqual(decision.action);
    expect(() => runtime.submitCpuAction(decision.action)).not.toThrow();

    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    const start = main.indexOf("async function executeCpuTurn(): Promise<void> {");
    const end = main.indexOf("\n}\n\nfunction createController", start) + 2;
    const cpuTurn = main.slice(start, end);
    expect(cpuTurn).toContain("chooseFairCpuDecision(");
    expect(cpuTurn).toContain("runtime.submitCpuAction(decision.action)");
    expect(cpuTurn).not.toContain("chooseFairCpuAction");
    expect(main).not.toContain("action: decision.action");
    expect(main).toContain(
      'cpuDecision: activeMatchMode === "cpu" && !isCpuTurn() ? latestCpuDecision : null',
    );

    const advanceStart = main.indexOf("async function advanceLocalRound(): Promise<void> {");
    const advanceEnd = main.indexOf("\n}\n\nfunction redraw", advanceStart) + 2;
    const advanceRound = main.slice(advanceStart, advanceEnd);
    expect(advanceRound).toContain("latestCpuDecision = null;");
    expect(advanceRound.indexOf("latestCpuDecision = null;")).toBeLessThan(
      advanceRound.indexOf("observation = transition.after;"),
    );
  });

  it("rejects a CPU action whose command fields were not offered by the fresh CPU observation", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-action-validation" });
    playHumanUntilCpu(runtime);
    const action = runtime.observeFor("player-b").legalActions[0];
    if (!action) throw new Error("CPU_RUNTIME_VALIDATION_ACTION_MISSING");
    const invalid = { ...action, actorId: "player-a" } as unknown as LegalActionV1;
    expect(() => runtime.submitCpuAction(invalid)).toThrow("CPU_ACTION_INVALID");
  });

  it("accepts only an exact current CPU legal action, including its resolution preview", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-exact-action" });
    playHumanUntilCpu(runtime);
    const action = runtime.observeFor("player-b").legalActions[0];
    if (!action || action.type !== "playHandCard") {
      throw new Error("CPU_RUNTIME_HAND_ACTION_MISSING");
    }
    const alteredPreview = {
      ...action,
      resolution: {
        ...action.resolution,
        kind: action.resolution.kind === "placeOnField" ? "capturePair" : "placeOnField",
      },
    } as unknown as LegalActionV1;

    expect(() => runtime.submitCpuAction(alteredPreview)).toThrow("CPU_ACTION_INVALID");
    expect(() => runtime.submitCpuAction(action)).not.toThrow();

    expect(() => runtime.submitCpuAction(action)).toThrow("CPU_ACTION_INVALID");
  });

  it("starts a CPU-first round with Player A still hidden-safe and locked out of B actions", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-starter", starterId: "player-b" });
    const humanObservation = runtime.observe();
    const cpuObservation = runtime.observeFor("player-b");
    const action = chooseFairCpuAction(cpuObservation, "timid");
    if (!action) throw new Error("CPU_RUNTIME_STARTER_ACTION_MISSING");

    expect(humanObservation.playerId).toBe("player-a");
    expect(humanObservation.legalActions).toEqual([]);
    expect(cpuObservation.legalActions).toContain(action);
    const transition = runtime.submitCpuAction(action);
    expect(transition.after.playerId).toBe("player-a");
    expect(runtime.viewerId).toBe("player-a");
  });

  it("returns control to Player A after the CPU completes its turn when the round continues", () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-return" });
    playHumanUntilCpu(runtime);
    for (let step = 0; step < 6; step += 1) {
      if (
        runtime.state.phase.kind === "roundComplete" ||
        runtime.state.phase.kind === "matchComplete" ||
        runtime.state.phase.playerId === "player-a"
      ) {
        break;
      }
      const action = chooseFairCpuAction(runtime.observeFor("player-b"), "monk");
      if (!action) throw new Error("CPU_RUNTIME_RETURN_ACTION_MISSING");
      runtime.submitCpuAction(action);
    }
    if (
      runtime.state.phase.kind !== "roundComplete" &&
      runtime.state.phase.kind !== "matchComplete"
    ) {
      expect(runtime.state.phase.playerId).toBe("player-a");
      expect(runtime.observe().legalActions.length).toBeGreaterThan(0);
    }
  });
});
