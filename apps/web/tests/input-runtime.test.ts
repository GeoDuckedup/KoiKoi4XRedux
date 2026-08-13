import { deepFreeze } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { computeBoardLayout } from "../src/presentation/board/board-layout";
import {
  buildSemanticCardControls,
  computeCardHitAreas,
} from "../src/presentation/input/hit-areas";
import { createInteractionController } from "../src/presentation/input/input-controller";
import {
  assertTechnicalInputFixtureCompleteness,
  getTechnicalInputFixture,
  TECHNICAL_INPUT_FIXTURE_IDS,
} from "../src/presentation/input/technical-input-fixtures";
import type { InputCommandIntentV1, InteractionSourceV1 } from "../src/presentation/input/types";

function controllerFor(
  fixtureId: (typeof TECHNICAL_INPUT_FIXTURE_IDS)[number],
  confirmationMode: "guided" | "fast" = "guided",
) {
  const fixture = getTechnicalInputFixture(fixtureId);
  const intents: InputCommandIntentV1[] = [];
  const controller = createInteractionController({
    source: fixture.source,
    confirmationMode,
    onIntent: (intent) => intents.push(intent),
  });
  return { controller, fixture, intents };
}

describe("Phase 2D pure interaction controller", () => {
  it("INPUT-001 selects a local hand card and exposes its trusted unique target", () => {
    const { controller } = controllerFor("handPlay");
    expect(controller.activateCard("march-curtain")).toBe(true);
    expect(controller.inspect()).toMatchObject({
      status: "confirming",
      selectedCardId: "march-curtain",
      legalTargetCardIds: ["march-red-text-scroll"],
      confirmAvailable: true,
      cancelAvailable: true,
    });
    expect(Object.isFrozen(controller.inspect())).toBe(true);
  });

  it("INPUT-002 cancels selection without emitting an intent", () => {
    const { controller, intents } = controllerFor("handPlay");
    controller.activateCard("may-bridge");
    expect(controller.inspect().legalTargetCardIds).toEqual([
      "may-red-scroll",
      "may-iris-plain-a",
      "may-iris-plain-b",
    ]);
    expect(controller.cancel()).toBe(true);
    expect(controller.inspect()).toMatchObject({
      status: "idle",
      selectedCardId: null,
      legalTargetCardIds: [],
    });
    expect(intents).toEqual([]);
  });

  it("INPUT-003 emits one exact immutable Guided intent from a legal confirmation target", () => {
    const { controller, intents } = controllerFor("handPlay");
    controller.activateCard("march-curtain");
    expect(controller.activateCard("march-red-text-scroll")).toBe(true);
    expect(intents).toEqual([
      {
        formatVersion: 1,
        matchId: "technical-input-fixture",
        expectedStateVersion: 1,
        actorId: "player-a",
        action: { type: "playHandCard", cardId: "march-curtain" },
      },
    ]);
    expect(Object.isFrozen(intents[0])).toBe(true);
    expect(Object.isFrozen(intents[0]?.action)).toBe(true);
    expect(controller.inspect()).toMatchObject({
      status: "intentPending",
      emittedIntentCount: 1,
      lastIntentType: "playHandCard",
    });
  });

  it("INPUT-004 exposes only the exact two legal targets and rejects an illegal field card", () => {
    const { controller, intents } = controllerFor("handPlay");
    controller.activateCard("april-cuckoo");
    expect(controller.inspect()).toMatchObject({
      status: "targeting",
      selectedCardId: "april-cuckoo",
      legalTargetCardIds: ["april-red-scroll", "april-wisteria-plain-a"],
      confirmAvailable: false,
    });
    expect(controller.activateCard("may-red-scroll")).toBe(false);
    expect(controller.activateCard("april-wisteria-plain-a")).toBe(true);
    expect(intents[0]?.action).toEqual({
      type: "playHandCard",
      cardId: "april-cuckoo",
      targetFieldCardId: "april-wisteria-plain-a",
    });
  });

  it("INPUT-005 Guided waits for explicit confirmation while INPUT-006 Fast emits single actions", () => {
    const guided = controllerFor("handPlay", "guided");
    guided.controller.activateCard("august-geese");
    expect(guided.controller.inspect()).toMatchObject({ status: "confirming" });
    expect(guided.intents).toEqual([]);
    expect(guided.controller.confirm()).toBe(true);
    expect(guided.intents[0]?.action).toEqual({
      type: "playHandCard",
      cardId: "august-geese",
    });

    const fast = controllerFor("handPlay", "fast");
    expect(fast.controller.activateCard("may-bridge")).toBe(true);
    expect(fast.intents[0]?.action).toEqual({ type: "playHandCard", cardId: "may-bridge" });
    expect(fast.controller.inspect().status).toBe("intentPending");
  });

  it("INPUT-007 locks opponent/animation states and restores idle only after the lock clears", () => {
    const opponent = controllerFor("opponentTurn");
    expect(opponent.controller.inspect()).toMatchObject({
      status: "locked",
      lockReason: "opponentTurn",
      selectableCardIds: [],
    });
    expect(opponent.controller.activateCard("march-curtain")).toBe(false);

    const active = controllerFor("handPlay");
    active.controller.activateCard("march-curtain");
    active.controller.setExternalLock("animation");
    expect(active.controller.inspect()).toMatchObject({
      status: "locked",
      lockReason: "animation",
      selectedCardId: null,
    });
    active.controller.setExternalLock(null);
    expect(active.controller.inspect().status).toBe("idle");
  });

  it("INPUT-008 resolves draw choices only through public legal target cards", () => {
    const { controller, intents } = controllerFor("drawCapture");
    expect(controller.inspect()).toMatchObject({
      status: "idle",
      selectedCardId: null,
      selectableCardIds: ["august-pampas-plain-a"],
      legalTargetCardIds: [],
      cancelAvailable: false,
    });
    expect(controller.activateCard("august-pampas-plain-a")).toBe(true);
    expect(controller.inspect()).toMatchObject({
      status: "targeting",
      selectedCardId: "august-pampas-plain-a",
      legalTargetCardIds: ["august-geese", "august-pampas-plain-b"],
      cancelAvailable: true,
    });
    expect(controller.activateCard("august-geese")).toBe(true);
    expect(intents[0]?.action).toEqual({
      type: "resolveDrawCard",
      targetFieldCardId: "august-geese",
    });
  });

  it("INPUT-009 exposes only current Bank/Koi-Koi decisions and emits the chosen intent", () => {
    const { controller, intents } = controllerFor("yakuDecision");
    expect(controller.inspect()).toMatchObject({
      status: "decision",
      selectableCardIds: [],
      legalTargetCardIds: [],
      decisionChoices: ["bank", "koiKoi"],
    });
    expect(controller.chooseYakuDecision("bank")).toBe(true);
    expect(intents[0]?.action).toEqual({ type: "chooseYakuDecision", choice: "bank" });
    expect(controller.chooseYakuDecision("koiKoi")).toBe(false);
    expect(intents).toHaveLength(1);
  });

  it("INPUT-010 rejects duplicate activation and requires a newer observation to unlock", () => {
    const { controller, fixture, intents } = controllerFor("handPlay", "fast");
    controller.activateCard("march-curtain");
    controller.activateCard("march-curtain");
    expect(intents).toHaveLength(1);
    controller.setExternalLock("animation");
    controller.setExternalLock(null);
    controller.setConfirmationMode("guided");
    expect(controller.inspect().status).toBe("intentPending");
    expect(controller.activateCard("march-curtain")).toBe(false);
    expect(intents).toHaveLength(1);
    expect(() => controller.replaceSource(fixture.source)).toThrow(/newer observation/);
    controller.replaceSource(getTechnicalInputFixture("handPlay", 2).source);
    expect(controller.inspect()).toMatchObject({ status: "idle", observationStateVersion: 2 });

    const newer = controllerFor("handPlay", "fast");
    newer.controller.replaceSource(getTechnicalInputFixture("handPlay", 2).source);
    newer.controller.activateCard("march-curtain");
    expect(() =>
      newer.controller.replaceSource(getTechnicalInputFixture("handPlay", 1).source),
    ).toThrow(/newer observation/);
    expect(newer.intents).toHaveLength(1);
  });

  it("INPUT-011 rejects observations whose actions escape own-hand/actor scope", () => {
    const fixture = getTechnicalInputFixture("handPlay");
    const wrongActor = deepFreeze({
      ...fixture.source,
      observation: {
        ...fixture.source.observation,
        legalActions: [
          {
            type: "playHandCard" as const,
            actorId: "player-b" as const,
            cardId: "march-curtain" as const,
            resolution: {
              kind: "capturePair" as const,
              matchingFieldCardIds: ["march-red-text-scroll" as const],
            },
          },
        ],
      },
    }) as InteractionSourceV1;
    expect(() =>
      createInteractionController({
        source: wrongActor,
        confirmationMode: "guided",
        onIntent: () => undefined,
      }),
    ).toThrow(/observing player/);

    const privateTarget = deepFreeze({
      ...fixture.source,
      observation: {
        ...fixture.source.observation,
        legalActions: [
          {
            type: "playHandCard" as const,
            actorId: "player-a" as const,
            cardId: "march-curtain" as const,
            targetFieldCardId: "january-crane" as const,
            resolution: {
              kind: "captureChoice" as const,
              matchingFieldCardIds: ["march-red-text-scroll" as const, "january-crane" as const],
            },
          },
        ],
      },
    }) as InteractionSourceV1;
    expect(() =>
      createInteractionController({
        source: privateTarget,
        confirmationMode: "guided",
        onIntent: () => undefined,
      }),
    ).toThrow(/public field/);

    const drawFixture = getTechnicalInputFixture("drawCapture");
    const wrongDrawnCard = deepFreeze({
      ...drawFixture.source,
      observation: {
        ...drawFixture.source.observation,
        legalActions: drawFixture.source.observation.legalActions.map((action) =>
          action.type === "resolveDrawCard"
            ? { ...action, drawnCardId: "january-crane" as const }
            : action,
        ),
      },
    }) as InteractionSourceV1;
    expect(() =>
      createInteractionController({
        source: wrongDrawnCard,
        confirmationMode: "guided",
        onIntent: () => undefined,
      }),
    ).toThrow(/public phase/);

    const outOfPhaseDrawTarget = deepFreeze({
      ...drawFixture.source,
      observation: {
        ...drawFixture.source.observation,
        legalActions: [
          {
            type: "resolveDrawCard" as const,
            actorId: "player-a" as const,
            drawnCardId: "august-pampas-plain-a" as const,
            targetFieldCardId: "march-red-text-scroll" as const,
            resolution: {
              kind: "captureChoice" as const,
              matchingFieldCardIds: ["august-geese", "august-pampas-plain-b"] as const,
            },
          },
        ],
      },
    }) as InteractionSourceV1;
    expect(() =>
      createInteractionController({
        source: outOfPhaseDrawTarget,
        confirmationMode: "guided",
        onIntent: () => undefined,
      }),
    ).toThrow(/public phase/);
  });
});

describe("Phase 2D layout-derived hit areas and semantics", () => {
  it("INPUT-012 keeps complete immutable fixture projections for every interaction phase", () => {
    expect(() => assertTechnicalInputFixtureCompleteness()).not.toThrow();
    expect(TECHNICAL_INPUT_FIXTURE_IDS).toEqual([
      "handPlay",
      "drawCapture",
      "yakuDecision",
      "opponentTurn",
    ]);
    for (const id of TECHNICAL_INPUT_FIXTURE_IDS) {
      const fixture = getTechnicalInputFixture(id);
      expect(fixture.projection).toHaveLength(48);
      expect(Object.isFrozen(fixture)).toBe(true);
      expect(Object.isFrozen(fixture.projection)).toBe(true);
      expect(Object.isFrozen(fixture.source.observation)).toBe(true);
    }
  });

  it.each([
    [320, 420],
    [390, 720],
    [844, 340],
    [1366, 620],
  ])("INPUT-013 builds contained, non-overlapping hand areas at %ix%i", (width, height) => {
    const { controller, fixture } = controllerFor("handPlay");
    const layout = computeBoardLayout({ width, height });
    const areas = computeCardHitAreas({
      layout,
      projection: fixture.projection,
      selectableCardIds: controller.inspect().selectableCardIds,
      legalTargetCardIds: [],
    });
    expect(areas).toHaveLength(controller.inspect().selectableCardIds.length);
    for (const [index, area] of areas.entries()) {
      expect(area.role).toBe("selectable");
      expect(area.bounds.height).toBeGreaterThanOrEqual(44);
      expect(area.bounds.x).toBeGreaterThanOrEqual(layout.safeBounds.x);
      const next = areas[index + 1];
      if (next)
        expect(area.bounds.x + area.bounds.width).toBeLessThanOrEqual(next.bounds.x + 0.001);
    }
  });

  it("INPUT-014 exposes name, month, category, action, selection, and legal-target semantics", () => {
    const { controller, fixture } = controllerFor("handPlay");
    controller.activateCard("april-cuckoo");
    const controls = buildSemanticCardControls({
      inspection: controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: fixture.projection,
    });
    const selected = controls.find(({ cardId }) => cardId === "april-cuckoo");
    const target = controls.find(({ cardId }) => cardId === "april-red-scroll");
    expect(selected).toMatchObject({
      role: "selectable",
      monthName: "April",
      category: "animal",
      selected: true,
    });
    expect(selected?.ariaLabel).toContain("April Cuckoo");
    expect(selected?.ariaLabel).toContain("selected");
    expect(target).toMatchObject({ role: "target", monthName: "April", category: "scroll" });
    expect(target?.ariaLabel).toContain("legal capture target");
    expect(target?.bounds.width).toBeGreaterThanOrEqual(44);
    expect(Object.isFrozen(controls)).toBe(true);
    expect(controls.every(Object.isFrozen)).toBe(true);
  });
});
