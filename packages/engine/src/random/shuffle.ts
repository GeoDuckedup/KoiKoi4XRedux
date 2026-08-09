import type { RandomSource } from "./types";

export const SHUFFLE_ALGORITHM_V1 = "fisher-yates-v1" as const;

export function shuffleWithRandomSource<T>(
  input: readonly T[],
  random: RandomSource,
): readonly T[] {
  const shuffled = [...input];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = random.nextInt(index + 1);
    const current = shuffled[index];
    const replacement = shuffled[swapIndex];
    if (current === undefined || replacement === undefined) {
      throw new Error("SHUFFLE_INVARIANT: swap indices must resolve inside the copied input.");
    }
    shuffled[index] = replacement;
    shuffled[swapIndex] = current;
  }
  return Object.freeze(shuffled);
}
