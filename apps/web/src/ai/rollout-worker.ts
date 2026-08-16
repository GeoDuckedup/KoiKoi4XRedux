import { chooseRolloutCpuDecision } from "./rollout";
import type {
  RolloutWorkerFailureV1,
  RolloutWorkerRequestV1,
  RolloutWorkerSuccessV1,
} from "./rollout-client";

function isRequest(value: unknown): value is RolloutWorkerRequestV1 {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.kind === "chooseRolloutCpuDecision" &&
    typeof record.requestId === "number" &&
    typeof record.matchId === "string" &&
    typeof record.stateVersion === "number" &&
    typeof record.restartIdentity === "number" &&
    typeof record.observation === "object" &&
    record.observation !== null &&
    typeof record.personality === "string" &&
    typeof record.difficulty === "string" &&
    typeof record.rootSeed === "string"
  );
}

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!isRequest(event.data)) return;
  const request = event.data;
  const metadata = {
    requestId: request.requestId,
    matchId: request.matchId,
    stateVersion: request.stateVersion,
    restartIdentity: request.restartIdentity,
    personality: request.personality,
    difficulty: request.difficulty,
  } as const;
  try {
    const response: RolloutWorkerSuccessV1 = {
      kind: "rolloutCpuDecision",
      ...metadata,
      decision: chooseRolloutCpuDecision(
        request.observation,
        request.personality,
        request.difficulty,
        request.rootSeed,
      ),
    };
    self.postMessage(response);
  } catch {
    const response: RolloutWorkerFailureV1 = {
      kind: "rolloutCpuFailure",
      ...metadata,
    };
    self.postMessage(response);
  }
});
