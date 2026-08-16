import {
  CARD_IDS,
  createSeededRandomSource,
  deepFreeze,
  sha256Hex,
  shuffleWithRandomSource,
  type CardId,
  type PlayerObservationV1,
} from "@koikoi4x/engine";

export interface CpuBeliefWorldV1 {
  readonly opponentHand: readonly CardId[];
  readonly drawPile: readonly CardId[];
}

export class CpuBeliefPartitionError extends Error {
  constructor(message: string) {
    super(`CPU_BELIEF_PARTITION_INVALID: ${message}`);
    this.name = "CpuBeliefPartitionError";
  }
}

function seedHex(rootSeed: string, label: string): string {
  const hashed = sha256Hex(`${rootSeed}\u0000${label}`).slice(0, 32);
  return /^0{32}$/u.test(hashed) ? `1${hashed.slice(1)}` : hashed;
}

function currentRoundKnownCards(observation: PlayerObservationV1): readonly CardId[] {
  const pendingDraw =
    observation.publicState.phase.kind === "awaitingDrawResolution"
      ? [observation.publicState.phase.drawnCardId]
      : [];
  return [
    ...observation.publicState.round.field,
    ...observation.publicState.players.flatMap((player) => player.captured),
    ...observation.ownHand,
    ...pendingDraw,
  ];
}

/**
 * Samples only the current round's unknown complement. Prior-round history is
 * intentionally ignored because those cards are available again in this deck.
 */
export function determinizeCpuObservation(
  observation: PlayerObservationV1,
  rootSeed: string,
  count: number,
): readonly CpuBeliefWorldV1[] {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new CpuBeliefPartitionError("sample count must be a positive safe integer");
  }
  const player = observation.publicState.players.find(({ id }) => id === observation.playerId);
  const opponent = observation.publicState.players.find(({ id }) => id !== observation.playerId);
  if (player === undefined || opponent === undefined) {
    throw new CpuBeliefPartitionError("the observation must contain both players");
  }
  if (player.handCount !== observation.ownHand.length) {
    throw new CpuBeliefPartitionError("own hand count does not match the private hand");
  }

  const knownCards = currentRoundKnownCards(observation);
  if (knownCards.length !== new Set(knownCards).size) {
    throw new CpuBeliefPartitionError("current-round visible and owned cards overlap");
  }
  const known = new Set(knownCards);
  const unseen = CARD_IDS.filter((cardId) => !known.has(cardId));
  const expectedUnseen = opponent.handCount + observation.publicState.round.drawPileCount;
  if (unseen.length !== expectedUnseen) {
    throw new CpuBeliefPartitionError(
      `unseen complement ${unseen.length} does not equal hidden zones ${expectedUnseen}`,
    );
  }

  return deepFreeze(
    Array.from({ length: count }, (_unused, index) => {
      const random = createSeededRandomSource(seedHex(rootSeed, `belief-world:${index}`));
      const shuffled = shuffleWithRandomSource(unseen, random);
      return {
        opponentHand: shuffled.slice(0, opponent.handCount).sort(),
        drawPile: shuffled.slice(opponent.handCount),
      };
    }),
  );
}
