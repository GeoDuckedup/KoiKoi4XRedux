import { createHash } from "node:crypto";

import {
  CARD_IDS,
  createRngSeed,
  createSeededRandomSource,
  restoreRandomSource,
  shuffleWithRandomSource,
  startMatch,
  type RandomSource,
  type RngSnapshotV1,
  type StartMatchCommandV1,
} from "../src/index";
import { describe, expect, it } from "vitest";

const SEED = "0123456789abcdeffedcba9876543210";

function command(commandId = "start-1"): StartMatchCommandV1 {
  return {
    type: "startMatch",
    commandId,
    matchId: "match-rng",
    expectedStateVersion: 0,
    matchLength: 12,
    starterPolicy: { kind: "chooseWithRng" },
  };
}

describe("Phase 1A deterministic random source", () => {
  it("publishes a stable xoshiro128** sequence for the v1 seed encoding", () => {
    const random = createSeededRandomSource(SEED);
    expect(Array.from({ length: 8 }, () => random.nextUint32())).toEqual([
      2576975000, 1717987679, 3437557858, 3328806623, 2502269976, 3596207863, 3762620995,
      3723441234,
    ]);
    expect(random.snapshot()).toMatchObject({
      version: 1,
      algorithm: "xoshiro128ss",
      initialSeed: createRngSeed(SEED),
      drawCount: 8,
    });
  });

  it("restores a snapshot at the exact next draw", () => {
    const random = createSeededRandomSource(SEED);
    Array.from({ length: 13 }, () => random.nextUint32());
    const snapshot = random.snapshot();
    const expected = Array.from({ length: 12 }, () => random.nextUint32());
    const restored = restoreRandomSource(snapshot);
    expect(Array.from({ length: 12 }, () => restored.nextUint32())).toEqual(expected);
    expect(restored.snapshot().drawCount).toBe(snapshot.drawCount + 12);
  });

  it("retries bounded draws that fall in the modulo-bias rejection range", () => {
    const random = createSeededRandomSource(SEED);
    expect(random.nextInt(0x8000_0001)).toBe(1717987679);
    expect(random.snapshot().drawCount).toBe(2);
  });

  it("rejects invalid bounds and snapshots without consuming state", () => {
    const random = createSeededRandomSource(SEED);
    const before = random.snapshot();
    for (const maximum of [0, -1, 1.5, Number.NaN, 0x1_0000_0001]) {
      expect(() => random.nextInt(maximum)).toThrow("RNG_MAX_EXCLUSIVE_INVALID");
    }
    expect(random.snapshot()).toEqual(before);
    expect(() => createRngSeed("0".repeat(32))).toThrow("RNG_SEED_INVALID");
    expect(() =>
      createSeededRandomSource({
        ...createRngSeed(SEED),
        version: 2,
        algorithm: "unknown",
      } as unknown as ReturnType<typeof createRngSeed>),
    ).toThrow("RNG_SEED_INVALID");
    expect(() => restoreRandomSource({ ...before, state: [0, 0, 0, 0] } as RngSnapshotV1)).toThrow(
      "RNG_SNAPSHOT_INVALID",
    );
  });

  it("locks Fisher–Yates bounds and never mutates the canonical input", () => {
    const requestedBounds: number[] = [];
    const sourceBefore = [...CARD_IDS];
    const fakeRandom: RandomSource = {
      nextUint32: () => 0,
      nextFloat: () => 0,
      nextInt: (maximum) => {
        requestedBounds.push(maximum);
        return maximum - 1;
      },
      snapshot: () => createSeededRandomSource(SEED).snapshot(),
    };
    const shuffled = shuffleWithRandomSource(CARD_IDS, fakeRandom);
    expect(requestedBounds).toEqual(Array.from({ length: 47 }, (_, index) => 48 - index));
    expect(shuffled).toEqual(CARD_IDS);
    expect(CARD_IDS).toEqual(sourceBefore);
    expect(Object.isFrozen(shuffled)).toBe(true);
  });

  it("locks the v1 fixed-seed shuffle mapping", () => {
    const shuffled = shuffleWithRandomSource(CARD_IDS, createSeededRandomSource(SEED));
    expect(createHash("sha256").update(shuffled.join("\n")).digest("hex")).toBe(
      "a2cafac273d1ca4b4c80ca3a88ed5f39480eabce67ca8615c491b4a90aba9abe",
    );
  });

  it("reproduces byte-identical setup state, events, and checkpoint from one seed", () => {
    const first = startMatch(command(), createSeededRandomSource(SEED));
    const second = startMatch(command(), createSeededRandomSource(SEED));
    const different = startMatch(
      command(),
      createSeededRandomSource("89abcdef0123456776543210fedcba98"),
    );
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(different).not.toEqual(first);
    expect(
      new Set([
        ...first.state.players.flatMap((player) => player.hand),
        ...first.state.round.field,
        ...first.state.round.drawPile,
      ]),
    ).toEqual(new Set(CARD_IDS));
  });

  it("rejects an invalid start command before consuming server-only randomness", () => {
    const random = createSeededRandomSource(SEED);
    const before = random.snapshot();
    expect(() => startMatch({ ...command(), matchId: "" }, random)).toThrow("START_MATCH_INVALID");
    expect(() =>
      startMatch(
        { ...command(), type: "not-start-match" } as unknown as StartMatchCommandV1,
        random,
      ),
    ).toThrow("START_MATCH_INVALID");
    expect(random.snapshot()).toEqual(before);
  });
});
