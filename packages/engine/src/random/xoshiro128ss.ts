import {
  RNG_ALGORITHM_V1,
  RNG_SNAPSHOT_VERSION,
  type RandomSource,
  type RngSeedV1,
  type RngSnapshotV1,
} from "./types";

const UINT32_RANGE = 0x1_0000_0000;
const SEED_PATTERN = /^[0-9a-f]{32}$/u;

function rotateLeft(value: number, count: number): number {
  return ((value << count) | (value >>> (32 - count))) >>> 0;
}

function freezeSeed(hex: string): RngSeedV1 {
  return Object.freeze({ version: 1, algorithm: RNG_ALGORITHM_V1, hex });
}

function parseSeedWords(hex: string): readonly [number, number, number, number] {
  return Object.freeze([
    Number.parseInt(hex.slice(0, 8), 16) >>> 0,
    Number.parseInt(hex.slice(8, 16), 16) >>> 0,
    Number.parseInt(hex.slice(16, 24), 16) >>> 0,
    Number.parseInt(hex.slice(24, 32), 16) >>> 0,
  ]);
}

function isUint32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < UINT32_RANGE;
}

export function createRngSeed(hex: string): RngSeedV1 {
  if (!SEED_PATTERN.test(hex) || /^0{32}$/u.test(hex)) {
    throw new Error(
      "RNG_SEED_INVALID: seed must be exactly 32 lowercase hexadecimal characters and nonzero.",
    );
  }
  return freezeSeed(hex);
}

export function validateRngSnapshot(snapshot: RngSnapshotV1): void {
  if (
    snapshot.version !== RNG_SNAPSHOT_VERSION ||
    snapshot.algorithm !== RNG_ALGORITHM_V1 ||
    snapshot.initialSeed.version !== 1 ||
    snapshot.initialSeed.algorithm !== RNG_ALGORITHM_V1
  ) {
    throw new Error("RNG_SNAPSHOT_INVALID: unsupported snapshot version or algorithm.");
  }
  createRngSeed(snapshot.initialSeed.hex);
  if (
    snapshot.state.length !== 4 ||
    !snapshot.state.every(isUint32) ||
    snapshot.state.every((word) => word === 0) ||
    !Number.isSafeInteger(snapshot.drawCount) ||
    snapshot.drawCount < 0
  ) {
    throw new Error("RNG_SNAPSHOT_INVALID: malformed state or draw count.");
  }
}

export class Xoshiro128StarStar implements RandomSource {
  readonly #initialSeed: RngSeedV1;
  #state: [number, number, number, number];
  #drawCount: number;

  constructor(seedOrSnapshot: RngSeedV1 | RngSnapshotV1) {
    if ("state" in seedOrSnapshot) {
      validateRngSnapshot(seedOrSnapshot);
      this.#initialSeed = freezeSeed(seedOrSnapshot.initialSeed.hex);
      this.#state = [...seedOrSnapshot.state];
      this.#drawCount = seedOrSnapshot.drawCount;
    } else {
      if (seedOrSnapshot.version !== 1 || seedOrSnapshot.algorithm !== RNG_ALGORITHM_V1) {
        throw new Error("RNG_SEED_INVALID: unsupported seed version or algorithm.");
      }
      const seed = createRngSeed(seedOrSnapshot.hex);
      this.#initialSeed = seed;
      this.#state = [...parseSeedWords(seed.hex)];
      this.#drawCount = 0;
    }
  }

  nextUint32(): number {
    const [state0, state1, state2, state3] = this.#state;
    const result = Math.imul(rotateLeft(Math.imul(state1, 5) >>> 0, 7), 9) >>> 0;
    const temporary = (state1 << 9) >>> 0;

    let nextState2 = (state2 ^ state0) >>> 0;
    let nextState3 = (state3 ^ state1) >>> 0;
    const nextState1 = (state1 ^ nextState2) >>> 0;
    const nextState0 = (state0 ^ nextState3) >>> 0;
    nextState2 = (nextState2 ^ temporary) >>> 0;
    nextState3 = rotateLeft(nextState3, 11);

    this.#state = [nextState0, nextState1, nextState2, nextState3];
    this.#drawCount += 1;
    return result;
  }

  nextFloat(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
      throw new Error(
        "RNG_MAX_EXCLUSIVE_INVALID: maxExclusive must be an integer from 1 through 2^32.",
      );
    }
    const rejectionLimit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    let value: number;
    do {
      value = this.nextUint32();
    } while (value >= rejectionLimit);
    return value % maxExclusive;
  }

  snapshot(): RngSnapshotV1 {
    return Object.freeze({
      version: RNG_SNAPSHOT_VERSION,
      algorithm: RNG_ALGORITHM_V1,
      initialSeed: this.#initialSeed,
      state: Object.freeze([...this.#state]) as readonly [number, number, number, number],
      drawCount: this.#drawCount,
    });
  }
}

export function createSeededRandomSource(seed: RngSeedV1 | string): Xoshiro128StarStar {
  return new Xoshiro128StarStar(typeof seed === "string" ? createRngSeed(seed) : seed);
}

export function restoreRandomSource(snapshot: RngSnapshotV1): Xoshiro128StarStar {
  return new Xoshiro128StarStar(snapshot);
}
