import type { LegalActionV1, PlayerObservationV1 } from "@koikoi4x/engine";

export const CPU_PERSONALITIES = Object.freeze(["timid", "monk", "gambler"] as const);

export type CpuPersonalityV1 = (typeof CPU_PERSONALITIES)[number];

/**
 * The AI boundary is deliberately narrower than the local runtime: a CPU can
 * inspect its recipient-safe observation and select one offered action, but
 * never receives authority, a checkpoint, or a random source.
 */
export type FairCpuActionSelectorV1 = (
  observation: PlayerObservationV1,
  personality: CpuPersonalityV1,
) => LegalActionV1 | null;
