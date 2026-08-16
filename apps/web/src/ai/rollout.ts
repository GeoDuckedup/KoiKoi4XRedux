import { canonicalStringifyV1, sha256Hex, type LegalActionV1 } from "@koikoi4x/engine";

import { chooseFairCpuDecision, explainPublicCpuAction } from "./fair-heuristic";
import { determinizeCpuObservation } from "./rollout-determinization";
import { canonicalRolloutActionKey, evaluateAbstractRollout } from "./rollout-model";
import {
  CPU_DIFFICULTIES,
  CPU_PERSONALITIES,
  type CpuDifficultyV1,
  type CpuPersonalityV1,
  type CpuRolloutBudgetV1,
  type RolloutCpuDecisionSelectorV1,
} from "./types";

export {
  CpuBeliefPartitionError,
  determinizeCpuObservation,
  type CpuBeliefWorldV1,
} from "./rollout-determinization";
export {
  abstractRolloutInitialCursor,
  evaluateAbstractRollout,
  type AbstractCaptureCursorV1,
  type CpuAbstractRolloutResultV1,
} from "./rollout-model";
export type { CpuRolloutBudgetV1, RolloutCpuDecisionSelectorV1 } from "./types";

const CAPTURE_NODE_CEILING = 2048;

export const CPU_ROLLOUT_BUDGETS: Readonly<Record<CpuDifficultyV1, CpuRolloutBudgetV1>> =
  Object.freeze({
    easy: Object.freeze({
      determinizations: 4,
      depth: 1,
      captureNodeCeiling: CAPTURE_NODE_CEILING,
    }),
    standard: Object.freeze({
      determinizations: 12,
      depth: 2,
      captureNodeCeiling: CAPTURE_NODE_CEILING,
    }),
    hard: Object.freeze({
      determinizations: 24,
      depth: 4,
      captureNodeCeiling: CAPTURE_NODE_CEILING,
    }),
  });

function isValidBudget(budget: CpuRolloutBudgetV1): boolean {
  return (
    Number.isSafeInteger(budget.determinizations) &&
    budget.determinizations > 0 &&
    Number.isSafeInteger(budget.depth) &&
    budget.depth > 0 &&
    Number.isSafeInteger(budget.captureNodeCeiling) &&
    budget.captureNodeCeiling > 0
  );
}

function beliefWorldSeed(
  observation: Parameters<RolloutCpuDecisionSelectorV1>[0],
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
): string {
  const actions = observation.legalActions.map(canonicalRolloutActionKey).sort();
  const currentPublicState = { ...observation.publicState, history: [] };
  return sha256Hex(
    canonicalStringifyV1({
      namespace: "phase6c-belief-worlds-v1",
      playerId: observation.playerId,
      publicState: currentPublicState,
      ownHand: [...observation.ownHand].sort(),
      personality,
      difficulty,
      actions,
    }),
  );
}

function seededTieRank(rootSeed: string, beliefSeed: string, action: LegalActionV1): string {
  return sha256Hex(
    canonicalStringifyV1({
      namespace: "phase6c-equal-utility-tie-v1",
      rootSeed,
      beliefSeed,
      action: canonicalRolloutActionKey(action),
    }),
  );
}

/**
 * Selects from the exact offered action objects. Any malformed current-round
 * partition or exceeded work ceiling returns the Phase 6B deterministic
 * decision instead of producing a partial rollout result.
 */
export const chooseRolloutCpuDecision: RolloutCpuDecisionSelectorV1 = (
  observation,
  personality,
  difficulty,
  rootSeed,
) => {
  if (!(CPU_PERSONALITIES as readonly string[]).includes(personality)) {
    throw new Error("CPU_PERSONALITY_INVALID");
  }
  if (!(CPU_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    throw new Error("CPU_DIFFICULTY_INVALID");
  }
  if (observation.legalActions.length === 0) return null;
  const fallback = (): ReturnType<RolloutCpuDecisionSelectorV1> =>
    chooseFairCpuDecision(observation, personality, difficulty);
  const budget = CPU_ROLLOUT_BUDGETS[difficulty];
  if (!isValidBudget(budget)) return fallback();
  const maximumNodes =
    observation.legalActions.length * budget.determinizations * (budget.depth + 1);
  if (maximumNodes > budget.captureNodeCeiling) return fallback();

  try {
    const beliefSeed = beliefWorldSeed(observation, personality, difficulty);
    const worlds = determinizeCpuObservation(observation, beliefSeed, budget.determinizations);
    let evaluatedNodes = 0;
    const scored = observation.legalActions.map((action) => {
      let utility = 0;
      for (let worldIndex = 0; worldIndex < worlds.length; worldIndex += 1) {
        const world = worlds[worldIndex];
        if (world === undefined) throw new Error("CPU_ROLLOUT_WORLD_MISSING");
        const result = evaluateAbstractRollout(
          observation,
          action,
          world,
          personality,
          budget.depth,
        );
        utility += result.utility;
        evaluatedNodes += 1 + result.captureNodes;
        if (evaluatedNodes > budget.captureNodeCeiling) return undefined;
      }
      return { action, utility, tieRank: seededTieRank(rootSeed, beliefSeed, action) };
    });
    if (scored.some((entry) => entry === undefined)) return fallback();
    const candidates = scored.filter(
      (entry): entry is Exclude<(typeof scored)[number], undefined> => entry !== undefined,
    );
    candidates.sort(
      (left, right) =>
        right.utility - left.utility ||
        left.tieRank.localeCompare(right.tieRank) ||
        canonicalRolloutActionKey(left.action).localeCompare(
          canonicalRolloutActionKey(right.action),
        ),
    );
    const chosen = candidates[0]?.action;
    if (chosen === undefined) return fallback();
    return Object.freeze({
      action: chosen,
      ...explainPublicCpuAction(observation.publicState, chosen),
    });
  } catch {
    return fallback();
  }
};
