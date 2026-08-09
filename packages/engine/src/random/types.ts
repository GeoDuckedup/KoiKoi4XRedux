export const RNG_ALGORITHM_V1 = "xoshiro128ss" as const;
export const RNG_SNAPSHOT_VERSION = 1 as const;

export interface RngSeedV1 {
  readonly version: 1;
  readonly algorithm: typeof RNG_ALGORITHM_V1;
  readonly hex: string;
}

export interface RngSnapshotV1 {
  readonly version: 1;
  readonly algorithm: typeof RNG_ALGORITHM_V1;
  readonly initialSeed: RngSeedV1;
  readonly state: readonly [number, number, number, number];
  readonly drawCount: number;
}

export interface RandomSource {
  nextUint32(): number;
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  snapshot(): RngSnapshotV1;
}
