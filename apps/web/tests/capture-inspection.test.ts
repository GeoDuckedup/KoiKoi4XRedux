import type { CardId, PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createCaptureInspectionPresentation } from "../src/game/capture-inspection";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";

function observationWithCaptures(input: {
  readonly opponent: readonly CardId[];
  readonly player: readonly CardId[];
}): PlayerObservationV1 {
  const source = getTechnicalInputFixture("handPlay").source.observation;
  const [first, second] = source.publicState.players;
  const playerCaptured = (playerId: typeof source.playerId): readonly CardId[] =>
    playerId === source.playerId ? input.player : input.opponent;
  return Object.freeze({
    ...source,
    publicState: Object.freeze({
      ...source.publicState,
      players: Object.freeze([
        Object.freeze({ ...first, captured: Object.freeze([...playerCaptured(first.id)]) }),
        Object.freeze({ ...second, captured: Object.freeze([...playerCaptured(second.id)]) }),
      ]) as PlayerObservationV1["publicState"]["players"],
    }),
  });
}

describe("Phase 3E-A public capture inspection", () => {
  it("TABLE-CLARITY-003 groups only the selected public player's captures", () => {
    const observation = observationWithCaptures({
      player: [
        "march-curtain",
        "june-butterfly",
        "january-red-text-scroll",
        "january-pine-plain-a",
      ],
      opponent: ["august-moon"],
    });

    const player = createCaptureInspectionPresentation({ observation, owner: "player" });
    const opponent = createCaptureInspectionPresentation({ observation, owner: "opponent" });

    expect(player.totalCards).toBe(4);
    expect(
      player.groups.map(({ category, cards }) => [category, cards.map(({ cardId }) => cardId)]),
    ).toEqual([
      ["bright", ["march-curtain"]],
      ["animal", ["june-butterfly"]],
      ["scroll", ["january-red-text-scroll"]],
      ["plain", ["january-pine-plain-a"]],
    ]);
    expect(opponent.totalCards).toBe(1);
    expect(opponent.groups.flatMap(({ cards }) => cards.map(({ cardId }) => cardId))).toEqual([
      "august-moon",
    ]);
    expect(JSON.stringify(player)).not.toContain("ownHand");
    expect(JSON.stringify(player)).not.toContain("drawPile");
    expect(Object.isFrozen(player)).toBe(true);
    expect(player.groups.every(Object.isFrozen)).toBe(true);
    expect(player.groups.every(({ cards }) => Object.isFrozen(cards))).toBe(true);
  });
});
