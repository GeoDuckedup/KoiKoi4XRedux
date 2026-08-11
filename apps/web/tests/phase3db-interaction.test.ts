import { deepFreeze } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { computeBoardLayout } from "../src/presentation/board/board-layout";
import { buildSemanticCardControls } from "../src/presentation/input/hit-areas";
import { createInteractionController } from "../src/presentation/input/input-controller";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";
import type {
  InputCommandIntentV1,
  InputConfirmationMode,
  InteractionSourceV1,
} from "../src/presentation/input/types";

function controllerFor(mode: InputConfirmationMode = "guided") {
  const fixture = getTechnicalInputFixture("handPlay");
  const intents: InputCommandIntentV1[] = [];
  const controller = createInteractionController({
    source: fixture.source,
    confirmationMode: mode,
    onIntent: (intent) => intents.push(intent),
  });
  return { controller, fixture, intents };
}

describe("Phase 3D-B authoritative interaction cues", () => {
  it.each([
    ["TABLE-INPUT-001-PLACE", "august-geese", "placeOnField", [], true, "confirming"],
    [
      "TABLE-INPUT-002-PAIR",
      "march-curtain",
      "capturePair",
      ["march-red-text-scroll"],
      false,
      "confirming",
    ],
    [
      "TABLE-INPUT-003-CHOICE",
      "april-cuckoo",
      "captureChoice",
      ["april-red-scroll", "april-wisteria-plain-a"],
      false,
      "targeting",
    ],
    [
      "TABLE-INPUT-004-SWEEP",
      "may-bridge",
      "fourCardSweep",
      ["may-red-scroll", "may-iris-plain-a", "may-iris-plain-b"],
      false,
      "confirming",
    ],
  ] as const)(
    "%s exposes the exact frozen engine preview",
    (_id, cardId, kind, matchingFieldCardIds, fieldPlacementAvailable, status) => {
      const { controller } = controllerFor();
      expect(controller.activateCard(cardId)).toBe(true);
      expect(controller.inspect()).toMatchObject({
        status,
        selectedCardId: cardId,
        legalTargetCardIds: matchingFieldCardIds,
        handResolutionKind: kind,
        fieldPlacementAvailable,
      });
    },
  );

  it.each([
    ["TABLE-INPUT-002-PAIR", "march-curtain", "march-red-text-scroll", undefined],
    ["TABLE-INPUT-004-SWEEP", "may-bridge", "may-iris-plain-a", undefined],
    ["TABLE-INPUT-003-CHOICE", "april-cuckoo", "april-wisteria-plain-a", "april-wisteria-plain-a"],
  ] as const)(
    "%s activates only its existing legal action",
    (_id, handCardId, fieldCardId, expectedTarget) => {
      const { controller, intents } = controllerFor();
      controller.activateCard(handCardId);
      expect(controller.activateCard(fieldCardId)).toBe(true);
      expect(intents).toHaveLength(1);
      expect(intents[0]?.action).toEqual({
        type: "playHandCard",
        cardId: handCardId,
        ...(expectedTarget ? { targetFieldCardId: expectedTarget } : {}),
      });
    },
  );

  it("TABLE-INPUT-001-PLACE uses the existing target-free action for the field surface", () => {
    const { controller, intents } = controllerFor();
    controller.activateCard("august-geese");
    expect(controller.inspect().fieldPlacementAvailable).toBe(true);
    expect(controller.confirm()).toBe(true);
    expect(intents[0]?.action).toEqual({ type: "playHandCard", cardId: "august-geese" });
  });

  it("TABLE-INPUT-005-FAST keeps instant unambiguous play and exact-two targeting", () => {
    for (const cardId of ["august-geese", "march-curtain", "may-bridge"] as const) {
      const { controller, intents } = controllerFor("fast");
      expect(controller.activateCard(cardId)).toBe(true);
      expect(intents).toHaveLength(1);
      expect(controller.inspect().status).toBe("intentPending");
    }
    const choice = controllerFor("fast");
    choice.controller.activateCard("april-cuckoo");
    expect(choice.controller.inspect()).toMatchObject({
      status: "targeting",
      handResolutionKind: "captureChoice",
    });
    expect(choice.intents).toEqual([]);
  });

  it("TABLE-INPUT-006-A11Y gives pair and sweep confirmations truthful semantics", () => {
    const pair = controllerFor();
    pair.controller.activateCard("march-curtain");
    const pairControls = buildSemanticCardControls({
      inspection: pair.controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: pair.fixture.projection,
    });
    expect(pairControls.find(({ role }) => role === "target")?.ariaLabel).toContain(
      "confirm matching capture",
    );

    const sweep = controllerFor();
    sweep.controller.activateCard("may-bridge");
    const sweepControls = buildSemanticCardControls({
      inspection: sweep.controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: sweep.fixture.projection,
    });
    expect(sweepControls.filter(({ role }) => role === "target")).toHaveLength(3);
    expect(
      sweepControls
        .filter(({ role }) => role === "target")
        .every(({ ariaLabel }) => ariaLabel.includes("confirm four-card sweep")),
    ).toBe(true);
  });

  it("TABLE-INPUT-007-BOUNDARY rejects malformed preview/action combinations", () => {
    const fixture = getTechnicalInputFixture("handPlay");
    const invalidAction = deepFreeze({
      type: "playHandCard" as const,
      actorId: "player-a" as const,
      cardId: "april-cuckoo" as const,
      targetFieldCardId: "april-red-scroll" as const,
      resolution: {
        kind: "captureChoice" as const,
        matchingFieldCardIds: ["april-red-scroll", "april-wisteria-plain-a"] as const,
      },
    });
    const malformed = deepFreeze({
      observation: {
        ...fixture.source.observation,
        legalActions: [invalidAction],
      },
    }) as InteractionSourceV1;
    expect(() =>
      createInteractionController({
        source: malformed,
        confirmationMode: "guided",
        onIntent: () => undefined,
      }),
    ).toThrow(/exactly two legal target actions/);
  });

  it.each([
    ["capturePair", "march-curtain", ["april-red-scroll"]],
    [
      "fourCardSweep",
      "may-bridge",
      ["may-red-scroll", "may-iris-plain-a", "march-red-text-scroll"],
    ],
  ] as const)(
    "TABLE-INPUT-007-BOUNDARY rejects a lying %s preview",
    (kind, cardId, matchingFieldCardIds) => {
      const fixture = getTechnicalInputFixture("handPlay");
      const original = fixture.source.observation.legalActions.find(
        (action) => action.type === "playHandCard" && action.cardId === cardId,
      );
      expect(original).toBeDefined();
      const malformed = deepFreeze({
        observation: {
          ...fixture.source.observation,
          legalActions: [
            {
              ...original,
              resolution: { kind, matchingFieldCardIds },
            },
          ],
        },
      }) as InteractionSourceV1;
      expect(() =>
        createInteractionController({
          source: malformed,
          confirmationMode: "guided",
          onIntent: () => undefined,
        }),
      ).toThrow(/disagrees with the engine-owned public-field inspection/);
    },
  );
});
