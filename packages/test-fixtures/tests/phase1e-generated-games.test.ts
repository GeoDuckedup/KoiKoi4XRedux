import {
  PLAYER_IDS,
  canonicalStringifyV1,
  hashCanonicalV1,
  projectPlayerObservation,
  projectPublicState,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type MatchLength,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { replayDirectTrace, runDirectMatch } from "./support/phase1e-driver";

const DEFAULT_GENERATED_MATCHES = 10_002;

function generatedMatchCount(): number {
  const configured = (
    globalThis as typeof globalThis & {
      readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> };
    }
  ).process?.env?.PHASE1E_GENERATED_MATCHES;
  if (configured === undefined) return DEFAULT_GENERATED_MATCHES;
  const count = Number(configured);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("PHASE1E_GENERATED_MATCHES must be a positive safe integer.");
  }
  return count;
}

function seedForIndex(index: number): string {
  return (BigInt(index) + 1n).toString(16).padStart(32, "0");
}

function assertProjectionShape(
  state: AuthoritativeGameStateV1,
  checkpoint: EngineCheckpointV1,
): void {
  const publicState = projectPublicState(state);
  const publicSerialized = canonicalStringifyV1(publicState);
  if (
    /"(?:checkpoint|commandId|drawPile|hand|initialRng|lastAcceptedCommandId|rng|seenYakuKeys)":/u.test(
      publicSerialized,
    ) ||
    publicSerialized.includes(canonicalStringifyV1(checkpoint))
  ) {
    throw new Error("Public projection exposed private authoritative content.");
  }
  for (const playerId of PLAYER_IDS) {
    const observation = projectPlayerObservation(state, playerId);
    const expectedHand = state.players.find((candidate) => candidate.id === playerId)?.hand;
    if (canonicalStringifyV1(observation.ownHand) !== canonicalStringifyV1(expectedHand)) {
      throw new Error(`${playerId} observation omitted or changed its own hand.`);
    }
    if (
      /"(?:checkpoint|drawPile|initialRng|lastAcceptedCommandId|rng|seenYakuKeys)":/u.test(
        canonicalStringifyV1(observation),
      )
    ) {
      throw new Error(`${playerId} observation exposed private authoritative content.`);
    }
  }
}

describe("Phase 1E generated legal-match gate", () => {
  it(
    "completes 10,002+ seeded matches with invariant/version checks and sampled privacy/replay equality",
    { timeout: 300_000 },
    () => {
      const count = generatedMatchCount();
      const lengths = [3, 6, 12] as const satisfies readonly MatchLength[];
      const formatCounts = new Map<MatchLength, number>([
        [3, 0],
        [6, 0],
        [12, 0],
      ]);
      let commandCount = 0;
      for (let index = 0; index < count; index += 1) {
        const seed = seedForIndex(index);
        const matchLength = lengths.at(index % lengths.length);
        if (matchLength === undefined) throw new Error("Generated format schedule is empty.");
        try {
          const trace = runDirectMatch(seed, matchLength);
          if (trace.state.phase.kind !== "matchComplete")
            throw new Error("Match did not complete.");
          if (trace.state.stateVersion !== trace.commands.length) {
            throw new Error("Accepted command/version count diverged.");
          }
          if (index < lengths.length || index % 97 === 0) {
            const replay = replayDirectTrace(trace, seed);
            assertProjectionShape(trace.state, trace.checkpoint);
            if (
              hashCanonicalV1({
                state: replay.state,
                checkpoint: replay.checkpoint,
                eventBatches: replay.eventBatches,
              }) !==
              hashCanonicalV1({
                state: trace.state,
                checkpoint: trace.checkpoint,
                eventBatches: trace.eventBatches,
              })
            ) {
              throw new Error("Deterministic replay hash diverged.");
            }
          }
          formatCounts.set(matchLength, (formatCounts.get(matchLength) ?? 0) + 1);
          commandCount += trace.commands.length;
        } catch (error) {
          throw new Error(
            `Generated match failed: index=${index}, seed=${seed}, matchLength=${matchLength}. ${String(error)}`,
            { cause: error },
          );
        }
      }
      expect([...formatCounts.values()].reduce((sum, value) => sum + value, 0)).toBe(count);
      expect(commandCount).toBeGreaterThan(count);
      if (count === DEFAULT_GENERATED_MATCHES) {
        expect(formatCounts).toEqual(
          new Map<MatchLength, number>([
            [3, 3_334],
            [6, 3_334],
            [12, 3_334],
          ]),
        );
      }
    },
  );
});
