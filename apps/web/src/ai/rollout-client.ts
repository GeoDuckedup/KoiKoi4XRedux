import type { PlayerObservationV1 } from "@koikoi4x/engine";

import { chooseFairCpuDecision } from "./fair-heuristic";
import type {
  CpuDecisionV1,
  CpuDifficultyV1,
  CpuPersonalityV1,
  FairCpuDecisionSelectorV1,
} from "./types";

export interface RolloutWorkerRequestV1 {
  readonly kind: "chooseRolloutCpuDecision";
  readonly requestId: number;
  readonly matchId: string;
  readonly stateVersion: number;
  readonly restartIdentity: number;
  readonly observation: PlayerObservationV1;
  readonly personality: CpuPersonalityV1;
  readonly difficulty: CpuDifficultyV1;
  readonly rootSeed: string;
}

export interface RolloutWorkerSuccessV1 {
  readonly kind: "rolloutCpuDecision";
  readonly requestId: number;
  readonly matchId: string;
  readonly stateVersion: number;
  readonly restartIdentity: number;
  readonly personality: CpuPersonalityV1;
  readonly difficulty: CpuDifficultyV1;
  readonly decision: CpuDecisionV1 | null;
}

export interface RolloutWorkerFailureV1 {
  readonly kind: "rolloutCpuFailure";
  readonly requestId: number;
  readonly matchId: string;
  readonly stateVersion: number;
  readonly restartIdentity: number;
  readonly personality: CpuPersonalityV1;
  readonly difficulty: CpuDifficultyV1;
}

export type RolloutWorkerResponseV1 = RolloutWorkerSuccessV1 | RolloutWorkerFailureV1;

export interface WorkerLikeV1 {
  postMessage(message: RolloutWorkerRequestV1): void;
  terminate(): void;
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
}

export interface RolloutCpuRequestV1 {
  readonly observation: PlayerObservationV1;
  readonly personality: CpuPersonalityV1;
  readonly difficulty: CpuDifficultyV1;
  readonly rootSeed: string;
  readonly restartIdentity: number;
}

export interface RolloutCpuClientV1 {
  choose(request: RolloutCpuRequestV1): Promise<CpuDecisionV1 | null>;
  invalidate(): void;
}

export interface CpuWorkerRequestOwnershipV1 {
  claim(): number;
  hasPending(): boolean;
  owns(ownerId: number): boolean;
  release(ownerId: number): boolean;
}

interface PendingRequestV1 {
  readonly request: RolloutWorkerRequestV1;
  readonly resolve: (decision: CpuDecisionV1 | null) => void;
}

export function createCpuSessionRootSeed(matchId: string, restartIdentity: number): string {
  if (matchId.length === 0 || !Number.isSafeInteger(restartIdentity) || restartIdentity < 0) {
    throw new Error("CPU_SESSION_IDENTITY_INVALID");
  }
  return `phase6c-cpu-session-v1:${restartIdentity}:${matchId}`;
}

/**
 * Tracks only unresolved worker selection. Ownership is deliberately released
 * before an accepted action reaches the authoritative runtime, so worker
 * cancellation can never unlock a committed transition or its animation.
 */
export function createCpuWorkerRequestOwnership(): CpuWorkerRequestOwnershipV1 {
  let pendingOwnerId: number | null = null;
  let nextOwnerId = 1;
  return Object.freeze({
    claim(): number {
      const ownerId = nextOwnerId;
      nextOwnerId += 1;
      pendingOwnerId = ownerId;
      return ownerId;
    },
    hasPending(): boolean {
      return pendingOwnerId !== null;
    },
    owns(ownerId: number): boolean {
      return pendingOwnerId === ownerId;
    },
    release(ownerId: number): boolean {
      if (pendingOwnerId !== ownerId) return false;
      pendingOwnerId = null;
      return true;
    },
  });
}

function responseMatchesRequest(
  response: RolloutWorkerResponseV1,
  request: RolloutWorkerRequestV1,
): boolean {
  return (
    response.requestId === request.requestId &&
    response.matchId === request.matchId &&
    response.stateVersion === request.stateVersion &&
    response.restartIdentity === request.restartIdentity &&
    response.personality === request.personality &&
    response.difficulty === request.difficulty
  );
}

function isWorkerResponse(value: unknown): value is RolloutWorkerResponseV1 {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.kind === "rolloutCpuDecision" || record.kind === "rolloutCpuFailure") &&
    typeof record.requestId === "number" &&
    typeof record.matchId === "string" &&
    typeof record.stateVersion === "number" &&
    typeof record.restartIdentity === "number" &&
    typeof record.personality === "string" &&
    typeof record.difficulty === "string"
  );
}

export function createRolloutCpuClient(options?: {
  readonly createWorker?: () => WorkerLikeV1;
  readonly fallback?: FairCpuDecisionSelectorV1;
}): RolloutCpuClientV1 {
  const createWorker =
    options?.createWorker ??
    (() =>
      new Worker(new URL("./rollout-worker.ts", import.meta.url), {
        type: "module",
        name: "koikoi4x-cpu-rollout",
      }));
  const fallback = options?.fallback ?? chooseFairCpuDecision;
  let worker: WorkerLikeV1 | null = null;
  let pending: PendingRequestV1 | null = null;
  let nextRequestId = 1;

  const settleWithFallback = (): void => {
    const current = pending;
    pending = null;
    if (current === null) return;
    current.resolve(
      fallback(
        current.request.observation,
        current.request.personality,
        current.request.difficulty,
      ),
    );
  };

  const handleMessage = (event: MessageEvent<unknown>): void => {
    const current = pending;
    if (current === null || !isWorkerResponse(event.data)) return;
    if (!responseMatchesRequest(event.data, current.request)) return;
    pending = null;
    current.resolve(
      event.data.kind === "rolloutCpuDecision"
        ? event.data.decision
        : fallback(
            current.request.observation,
            current.request.personality,
            current.request.difficulty,
          ),
    );
  };

  const handleError = (): void => {
    worker?.terminate();
    worker = null;
    settleWithFallback();
  };

  const ensureWorker = (): WorkerLikeV1 => {
    if (worker !== null) return worker;
    worker = createWorker();
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    return worker;
  };

  return Object.freeze({
    choose(request: RolloutCpuRequestV1): Promise<CpuDecisionV1 | null> {
      if (pending !== null) {
        const superseded = pending;
        pending = null;
        superseded.resolve(null);
      }
      const workerRequest: RolloutWorkerRequestV1 = Object.freeze({
        kind: "chooseRolloutCpuDecision",
        requestId: nextRequestId,
        matchId: request.observation.publicState.matchId,
        stateVersion: request.observation.publicState.stateVersion,
        restartIdentity: request.restartIdentity,
        observation: request.observation,
        personality: request.personality,
        difficulty: request.difficulty,
        rootSeed: request.rootSeed,
      });
      nextRequestId += 1;
      return new Promise<CpuDecisionV1 | null>((resolve) => {
        pending = { request: workerRequest, resolve };
        try {
          ensureWorker().postMessage(workerRequest);
        } catch {
          handleError();
        }
      });
    },
    invalidate(): void {
      worker?.terminate();
      worker = null;
      const cancelled = pending;
      pending = null;
      cancelled?.resolve(null);
    },
  });
}
