// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
import type { LegalActionV1, PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { chooseFairCpuAction, chooseFairCpuDecision } from "../src/ai/fair-heuristic";
import {
  createCpuSessionRootSeed,
  createCpuWorkerRequestOwnership,
  createRolloutCpuClient,
  type RolloutWorkerRequestV1,
  type RolloutWorkerResponseV1,
  type WorkerLikeV1,
} from "../src/ai/rollout-client";
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

class FakeRolloutWorker implements WorkerLikeV1 {
  readonly requests: RolloutWorkerRequestV1[] = [];
  terminated = false;
  private messageListener: ((event: MessageEvent<unknown>) => void) | null = null;
  private errorListener: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: RolloutWorkerRequestV1): void {
    this.requests.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  addEventListener(
    type: "error" | "message",
    listener: ((event: ErrorEvent) => void) | ((event: MessageEvent<unknown>) => void),
  ): void {
    if (type === "message") {
      this.messageListener = listener as (event: MessageEvent<unknown>) => void;
    } else {
      this.errorListener = listener as (event: ErrorEvent) => void;
    }
  }

  respond(response: RolloutWorkerResponseV1): void {
    this.messageListener?.({ data: response } as MessageEvent<unknown>);
  }

  fail(): void {
    this.errorListener?.({} as ErrorEvent);
  }
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

  it("submits only the worker-selected decision action while retaining no CPU action metadata for presentation", () => {
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
    expect(cpuTurn).toContain("await rolloutCpuClient.choose({");
    expect(cpuTurn).toContain("if (!cpuRequestIsCurrent(requestContext)) return;");
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

  it("uses a distinct deterministic session namespace without clocks, randomness, or storage", () => {
    expect(createCpuSessionRootSeed("cpu-match-7", 7)).toBe("phase6c-cpu-session-v1:7:cpu-match-7");
    expect(createCpuSessionRootSeed("cpu-match-7", 7)).toBe(
      createCpuSessionRootSeed("cpu-match-7", 7),
    );
    const source = readFileSync(new URL("../src/ai/rollout-client.ts", import.meta.url), "utf8");
    const rootSeedStart = source.indexOf("export function createCpuSessionRootSeed");
    const rootSeedEnd = source.indexOf("\n}\n", rootSeedStart) + 2;
    const rootSeedSource = source.slice(rootSeedStart, rootSeedEnd);
    expect(rootSeedSource).not.toMatch(/Math\.random|Date|performance|storage|checkpoint|rng/u);
  });

  it("posts only the CPU observation contract and accepts matching worker metadata", async () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-worker-contract" });
    playHumanUntilCpu(runtime);
    const cpuObservation = runtime.observeFor("player-b");
    const worker = new FakeRolloutWorker();
    const client = createRolloutCpuClient({ createWorker: () => worker });
    const selected = chooseFairCpuDecision(cpuObservation, "monk", "standard");
    if (selected === null) throw new Error("CPU_WORKER_TEST_DECISION_MISSING");

    const pending = client.choose({
      observation: cpuObservation,
      personality: "monk",
      difficulty: "standard",
      rootSeed: createCpuSessionRootSeed(cpuObservation.publicState.matchId, 3),
      restartIdentity: 3,
    });
    const request = worker.requests[0];
    if (request === undefined) throw new Error("CPU_WORKER_TEST_REQUEST_MISSING");
    expect(Object.keys(request).sort()).toEqual([
      "difficulty",
      "kind",
      "matchId",
      "observation",
      "personality",
      "requestId",
      "restartIdentity",
      "rootSeed",
      "stateVersion",
    ]);
    const serialized = JSON.stringify(request.observation);
    expect(serialized).not.toContain("drawPileOrdered");
    expect(serialized).not.toContain("checkpoint");
    expect(serialized).not.toContain('"rng"');
    worker.respond({
      kind: "rolloutCpuDecision",
      requestId: request.requestId,
      matchId: request.matchId,
      stateVersion: request.stateVersion,
      restartIdentity: request.restartIdentity,
      personality: request.personality,
      difficulty: request.difficulty,
      decision: selected,
    });
    await expect(pending).resolves.toEqual(selected);
  });

  it("cancels stale work, ignores its late reply, and terminates its worker", async () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-worker-stale" });
    playHumanUntilCpu(runtime);
    const cpuObservation = runtime.observeFor("player-b");
    const workers: FakeRolloutWorker[] = [];
    const client = createRolloutCpuClient({
      createWorker: () => {
        const worker = new FakeRolloutWorker();
        workers.push(worker);
        return worker;
      },
    });
    const request = {
      observation: cpuObservation,
      personality: "timid" as const,
      difficulty: "hard" as const,
      rootSeed: createCpuSessionRootSeed(cpuObservation.publicState.matchId, 4),
      restartIdentity: 4,
    };
    const stale = client.choose(request);
    const staleWorker = workers[0];
    const staleRequest = staleWorker?.requests[0];
    if (staleWorker === undefined || staleRequest === undefined) {
      throw new Error("CPU_WORKER_STALE_REQUEST_MISSING");
    }
    client.invalidate();
    await expect(stale).resolves.toBeNull();
    expect(staleWorker.terminated).toBe(true);

    const current = client.choose(request);
    const currentWorker = workers[1];
    const currentRequest = currentWorker?.requests[0];
    const selected = chooseFairCpuDecision(cpuObservation, "timid", "hard");
    if (currentWorker === undefined || currentRequest === undefined || selected === null) {
      throw new Error("CPU_WORKER_CURRENT_REQUEST_MISSING");
    }
    staleWorker.respond({
      kind: "rolloutCpuDecision",
      requestId: staleRequest.requestId,
      matchId: staleRequest.matchId,
      stateVersion: staleRequest.stateVersion,
      restartIdentity: staleRequest.restartIdentity,
      personality: staleRequest.personality,
      difficulty: staleRequest.difficulty,
      decision: selected,
    });
    currentWorker.respond({
      kind: "rolloutCpuDecision",
      requestId: currentRequest.requestId,
      matchId: currentRequest.matchId,
      stateVersion: currentRequest.stateVersion,
      restartIdentity: currentRequest.restartIdentity,
      personality: currentRequest.personality,
      difficulty: currentRequest.difficulty,
      decision: selected,
    });
    await expect(current).resolves.toEqual(selected);
  });

  it("keeps worker ownership until pre-submit cancellation settles, then releases it", async () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-worker-pre-submit-owner" });
    playHumanUntilCpu(runtime);
    const cpuObservation = runtime.observeFor("player-b");
    const worker = new FakeRolloutWorker();
    const client = createRolloutCpuClient({ createWorker: () => worker });
    const ownership = createCpuWorkerRequestOwnership();
    const ownerId = ownership.claim();
    const pending = client.choose({
      observation: cpuObservation,
      personality: "monk",
      difficulty: "hard",
      rootSeed: createCpuSessionRootSeed(cpuObservation.publicState.matchId, 8),
      restartIdentity: 8,
    });

    client.invalidate();
    expect(ownership.owns(ownerId)).toBe(true);
    await expect(pending).resolves.toBeNull();
    expect(ownership.release(ownerId)).toBe(true);
    expect(ownership.hasPending()).toBe(false);
  });

  it("releases worker ownership before a selected action enters committed presentation", async () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-worker-post-submit-owner" });
    playHumanUntilCpu(runtime);
    const cpuObservation = runtime.observeFor("player-b");
    const selected = chooseFairCpuDecision(cpuObservation, "timid", "standard");
    if (selected === null) throw new Error("CPU_WORKER_POST_SUBMIT_DECISION_MISSING");
    const worker = new FakeRolloutWorker();
    const client = createRolloutCpuClient({ createWorker: () => worker });
    const ownership = createCpuWorkerRequestOwnership();
    const ownerId = ownership.claim();
    const pending = client.choose({
      observation: cpuObservation,
      personality: "timid",
      difficulty: "standard",
      rootSeed: createCpuSessionRootSeed(cpuObservation.publicState.matchId, 9),
      restartIdentity: 9,
    });
    const request = worker.requests[0];
    if (request === undefined) throw new Error("CPU_WORKER_POST_SUBMIT_REQUEST_MISSING");
    worker.respond({
      kind: "rolloutCpuDecision",
      requestId: request.requestId,
      matchId: request.matchId,
      stateVersion: request.stateVersion,
      restartIdentity: request.restartIdentity,
      personality: request.personality,
      difficulty: request.difficulty,
      decision: selected,
    });
    await expect(pending).resolves.toEqual(selected);
    expect(ownership.release(ownerId)).toBe(true);

    client.invalidate();
    expect(ownership.hasPending()).toBe(false);
    expect(ownership.release(ownerId)).toBe(false);
  });

  it("falls back deterministically without exposing worker failure details", async () => {
    const runtime = createCpuRoundRuntime({ matchId: "cpu-worker-fallback" });
    playHumanUntilCpu(runtime);
    const cpuObservation = runtime.observeFor("player-b");
    const worker = new FakeRolloutWorker();
    const client = createRolloutCpuClient({ createWorker: () => worker });
    const expected = chooseFairCpuDecision(cpuObservation, "gambler", "easy");
    const pending = client.choose({
      observation: cpuObservation,
      personality: "gambler",
      difficulty: "easy",
      rootSeed: createCpuSessionRootSeed(cpuObservation.publicState.matchId, 5),
      restartIdentity: 5,
    });
    worker.fail();
    await expect(pending).resolves.toEqual(expected);
    expect(worker.terminated).toBe(true);

    const workerSource = readFileSync(
      new URL("../src/ai/rollout-worker.ts", import.meta.url),
      "utf8",
    );
    expect(workerSource).not.toContain("console.");
    expect(workerSource).not.toContain("error.message");
  });

  it("invalidates CPU work at every runtime identity boundary", () => {
    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    for (const functionName of [
      "continueSavedMatch",
      "startFreshLocalMatch",
      "startFreshCpuMatch",
      "advanceLocalRound",
    ]) {
      const start = main.indexOf(`async function ${functionName}`);
      const end = main.indexOf("\n}\n", start) + 2;
      expect(main.slice(start, end), functionName).toContain("invalidateCpuRollout();");
    }
    expect(main).toContain('window.addEventListener("pagehide", invalidateCpuRollout);');
    expect(main).toContain('window.addEventListener("beforeunload", invalidateCpuRollout);');
    expect(main).toContain('window.addEventListener("pageshow", queueCpuTurn);');
    const invalidationStart = main.indexOf("function invalidateCpuRollout(): void {");
    const invalidationEnd = main.indexOf("\n}\n", invalidationStart) + 2;
    expect(main.slice(invalidationStart, invalidationEnd)).not.toContain(
      "processingIntent = false;",
    );
    const cpuTurnStart = main.indexOf("async function executeCpuTurn(): Promise<void> {");
    const cpuTurnEnd = main.indexOf("\n}\n\nfunction createController", cpuTurnStart) + 2;
    const cpuTurn = main.slice(cpuTurnStart, cpuTurnEnd);
    expect(cpuTurn.indexOf("cpuWorkerOwnership.release(workerOwnerId)")).toBeLessThan(
      cpuTurn.indexOf("runtime.submitCpuAction(decision.action)"),
    );
    expect(cpuTurn).toContain("finally {");
    expect(cpuTurn).toContain("processingIntent = false;");
    expect(cpuTurn).toContain("refreshInteractionSurface();");
    expect(cpuTurn).toContain("queueCpuTurn();");
    expect(main).not.toMatch(/localStorage.*activeCpuRootSeed|activeCpuRootSeed.*localStorage/u);
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
