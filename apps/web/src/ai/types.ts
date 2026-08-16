import type { LegalActionV1, PlayerObservationV1 } from "@koikoi4x/engine";

export const CPU_PERSONALITIES = Object.freeze(["timid", "monk", "gambler"] as const);

export type CpuPersonalityV1 = (typeof CPU_PERSONALITIES)[number];

/**
 * Difficulty changes how strongly the selector applies public match pressure.
 * It never changes the personality preference profile or permits hidden-card
 * reconstruction.  Rollouts and seeded variation remain deliberately out of
 * scope until Phase 6C.
 */
export const CPU_DIFFICULTIES = Object.freeze(["easy", "standard", "hard"] as const);

export type CpuDifficultyV1 = (typeof CPU_DIFFICULTIES)[number];

export const CPU_DECISION_REASONS = Object.freeze([
  "secureLead",
  "completeYaku",
  "denyVisibleThreat",
  "strongFuturePotential",
  "multiplierPressure",
  "comebackRisk",
] as const);

export type CpuDecisionReasonV1 = (typeof CPU_DECISION_REASONS)[number];

/**
 * Explanation data is presentation-safe: it returns the original offered
 * action and compact deterministic labels, never a derived command or hidden
 * card hypothesis.
 */
export interface CpuDecisionV1 {
  readonly action: LegalActionV1;
  readonly reason: CpuDecisionReasonV1;
  /** A public-safe, deterministic value in the closed [0, 1] range. */
  readonly confidence: number;
}

/**
 * The AI boundary is deliberately narrower than the local runtime: a CPU can
 * inspect its recipient-safe observation and select one offered action, but
 * never receives authority, a checkpoint, or a random source.
 */
export type FairCpuActionSelectorV1 = (
  observation: PlayerObservationV1,
  personality: CpuPersonalityV1,
) => LegalActionV1 | null;

export type FairCpuDecisionSelectorV1 = (
  observation: PlayerObservationV1,
  personality: CpuPersonalityV1,
  difficulty: CpuDifficultyV1,
) => CpuDecisionV1 | null;
