import {
  applyGameplayCommand,
  projectPlayerObservation,
  startMatchFromOrderedDeck,
  type DrawResolutionPreviewV1,
} from "@koikoi4x/engine";
import { PHASE_1B_CAPTURE_FIXTURES } from "@koikoi4x/test-fixtures";
import { describe, expect, it } from "vitest";

import { computeBoardLayout } from "../src/presentation/board/board-layout";
import {
  findFaceUpRevealPlacement,
  shouldShowRevealPlayAttention,
} from "../src/presentation/input/reveal-play-attention";
import { createInteractionController } from "../src/presentation/input/input-controller";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";
import { resolveInteractionHighlightTreatment } from "../src/presentation/pixi/create-table-scene";
import { ACTIVE_PHASE_3D_VISUAL_DIRECTION } from "../src/presentation/theme/visual-directions";
import type { InputCommandIntentV1, InteractionSourceV1 } from "../src/presentation/input/types";

function drawInput() {
  const fixture = getTechnicalInputFixture("drawCapture");
  const controller = createInteractionController({
    source: fixture.source,
    confirmationMode: "guided",
    onIntent: () => undefined,
  });
  return { controller, fixture };
}

function visibleFor(input: ReturnType<typeof drawInput>): boolean {
  return shouldShowRevealPlayAttention({
    observation: input.fixture.source.observation,
    inspection: input.controller.inspect(),
  });
}

function sourceForAuthoritativeDraw(
  fixtureId: "CAP-000" | "CAP-DRAW-001" | "CAP-DRAW-002" | "CAP-DRAW-003",
) {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find(({ id }) => id === fixtureId);
  if (!fixture) throw new Error(`Missing authoritative Draw fixture: ${fixtureId}`);
  const started = startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `phase3fi-${fixtureId}:start`,
      matchId: `phase3fi-${fixtureId}`,
      expectedStateVersion: 0,
      matchLength: 12,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    fixture.orderedDeck,
    "player-a",
  );
  const handPlay = fixture.commands[0];
  if (!handPlay || handPlay.type !== "playHandCard") {
    throw new Error(`Missing opening Hand action for ${fixtureId}`);
  }
  const transition = applyGameplayCommand(started.state, {
    ...handPlay,
    commandId: `phase3fi-${fixtureId}:hand`,
    matchId: started.state.matchId,
    expectedStateVersion: started.state.stateVersion,
  });
  if (transition.state.phase.kind !== "awaitingDrawResolution") {
    throw new Error(`Expected awaitingDrawResolution for ${fixtureId}`);
  }
  return Object.freeze({
    observation: projectPlayerObservation(transition.state, "player-a"),
    phase: transition.state.phase,
  });
}

function controllerForAuthoritativeDraw(
  fixtureId: "CAP-000" | "CAP-DRAW-001" | "CAP-DRAW-002" | "CAP-DRAW-003",
) {
  const draw = sourceForAuthoritativeDraw(fixtureId);
  const intents: InputCommandIntentV1[] = [];
  const source: InteractionSourceV1 = Object.freeze({ observation: draw.observation });
  return Object.freeze({
    ...draw,
    intents,
    controller: createInteractionController({
      source,
      confirmationMode: "guided",
      onIntent: (intent) => intents.push(intent),
    }),
  });
}

describe("Phase 3F-I settled Reveal attention", () => {
  it("shows for exactly the idle local Draw source, disappears on selection, and returns on cancel", () => {
    const input = drawInput();
    expect(visibleFor(input)).toBe(true);

    expect(input.controller.activateCard("august-pampas-plain-a")).toBe(true);
    expect(input.controller.inspect()).toMatchObject({
      status: "targeting",
      selectedCardId: "august-pampas-plain-a",
      legalTargetCardIds: ["august-geese", "august-pampas-plain-b"],
    });
    expect(visibleFor(input)).toBe(false);

    expect(input.controller.cancel()).toBe(true);
    expect(visibleFor(input)).toBe(true);
  });

  it.each([
    ["CAP-000", "placeOnField", "confirming", true],
    ["CAP-DRAW-001", "capturePair", "confirming", false],
    ["CAP-DRAW-002", "captureChoice", "targeting", false],
    ["CAP-DRAW-003", "fourCardSweep", "confirming", false],
  ] as const)(
    "uses real authority-shaped %s Draw data for %s",
    (fixtureId, expectedKind, expectedStatus, expectedFieldPlacement) => {
      const input = controllerForAuthoritativeDraw(fixtureId);
      const phase = input.phase;
      const resolution: DrawResolutionPreviewV1 = phase.resolution;
      expect(resolution.kind).toBe(expectedKind);

      const idle = input.controller.inspect();
      expect(
        shouldShowRevealPlayAttention({ observation: input.observation, inspection: idle }),
      ).toBe(true);
      expect(idle.legalTargetCardIds).toEqual([]);

      expect(input.controller.activateCard(phase.drawnCardId)).toBe(true);
      const selected = input.controller.inspect();
      expect(selected).toMatchObject({
        status: expectedStatus,
        selectedCardId: phase.drawnCardId,
        legalTargetCardIds: resolution.matchingFieldCardIds,
        fieldPlacementAvailable: expectedFieldPlacement,
      });
      expect(
        shouldShowRevealPlayAttention({ observation: input.observation, inspection: selected }),
      ).toBe(false);

      expect(input.controller.cancel()).toBe(true);
      expect(
        shouldShowRevealPlayAttention({
          observation: input.observation,
          inspection: input.controller.inspect(),
        }),
      ).toBe(true);
      expect(input.intents).toEqual([]);
    },
  );

  it("stays absent during locks, selection, non-Draw phases, or malformed selectable state", () => {
    const input = drawInput();
    input.controller.setExternalLock("animation");
    expect(visibleFor(input)).toBe(false);

    const idle = drawInput();
    const altered = {
      ...idle.controller.inspect(),
      selectableCardIds: ["august-pampas-plain-a", "august-geese"] as const,
    };
    expect(
      shouldShowRevealPlayAttention({
        observation: idle.fixture.source.observation,
        inspection: altered,
      }),
    ).toBe(false);

    const hand = getTechnicalInputFixture("handPlay");
    const handController = createInteractionController({
      source: hand.source,
      confirmationMode: "guided",
      onIntent: () => undefined,
    });
    expect(
      shouldShowRevealPlayAttention({
        observation: hand.source.observation,
        inspection: handController.inspect(),
      }),
    ).toBe(false);
  });

  it("requires a face-up Draw card in the live Reveal placement", () => {
    const fixture = getTechnicalInputFixture("drawCapture");
    const phase = fixture.source.observation.publicState.phase;
    if (phase.kind !== "awaitingDrawResolution") throw new Error("Expected Draw fixture.");
    expect(
      findFaceUpRevealPlacement({
        layout: computeBoardLayout({ width: 390, height: 844 }),
        projection: fixture.projection,
        drawnCardId: phase.drawnCardId,
      }),
    ).not.toBeNull();
    expect(
      findFaceUpRevealPlacement({
        layout: computeBoardLayout({ width: 390, height: 844 }),
        projection: fixture.projection.map((card) =>
          card.cardId === phase.drawnCardId ? { ...card, faceUp: false } : card,
        ),
        drawnCardId: phase.drawnCardId,
      }),
    ).toBeNull();
  });

  it("uses muted frames for an unselected Reveal and gold frames only after source/target selection", () => {
    const colors = ACTIVE_PHASE_3D_VISUAL_DIRECTION.table;
    const unselectedReveal = resolveInteractionHighlightTreatment({
      colors,
      scale: 1,
      selected: false,
      selectable: true,
      target: false,
    });
    expect(unselectedReveal).toMatchObject({
      color: colors.creamMuted,
      fillAlpha: 0,
      strokeAlpha: 0.36,
    });
    const selectedSource = resolveInteractionHighlightTreatment({
      colors,
      scale: 1,
      selected: true,
      selectable: true,
      target: false,
    });
    const legalTarget = resolveInteractionHighlightTreatment({
      colors,
      scale: 1,
      selected: false,
      selectable: false,
      target: true,
    });
    expect(selectedSource.color).toBe(colors.gold);
    expect(legalTarget.color).toBe(colors.gold);
    expect(selectedSource.strokeAlpha).toBe(1);
    expect(legalTarget.strokeAlpha).toBe(1);
  });

  it("keeps a first-child, noninteractive white cue outside semantic controls and removes preselection gold", () => {
    const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(index).toMatch(
      /data-card-input-overlay[\s\S]*?>\s*<div class="hand-play-attention" data-hand-play-attention aria-hidden="true" hidden><\/div>\s*<div\s+class="reveal-play-attention"\s+data-reveal-play-attention\s+aria-hidden="true"\s+hidden\s*><\/div>/u,
    );

    const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
    const start = css.indexOf(".reveal-play-attention {");
    const end = css.indexOf("}", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(block).toContain("border: 2px solid #fff;");
    expect(block).toContain("background: transparent;");
    expect(block).toContain("pointer-events: none;");
    expect(block).toContain("reveal-play-attention-pulse 1.2s");
    expect(block).not.toContain("var(--theme-accent)");
    expect(block).not.toContain("min-height");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.reveal-play-attention\s*\{[\s\S]*?animation:\s*none !important;/u,
    );

    const pixi = readFileSync(
      new URL("../src/presentation/pixi/create-table-scene.ts", import.meta.url),
      "utf8",
    );
    expect(pixi).not.toContain("actionableReveal");
    expect(pixi).toContain("resolveInteractionHighlightTreatment");
  });

  it("renders decoratively from the current Reveal placement and lets Options hide/restore it without refresh", () => {
    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    expect(main).toMatch(
      /function renderRevealPlayAttention\([\s\S]*?currentInputLock\(\) === null[\s\S]*?findFaceUpRevealPlacement\([\s\S]*?drawnCardId: phase\.drawnCardId/u,
    );
    const openStart = main.indexOf("function openOptions(): void {");
    const openEnd = main.indexOf("\n}\n", openStart) + 2;
    const closeStart = main.indexOf("function closeOptions(restoreFocus = true): void {");
    const closeEnd = main.indexOf("\n}\n", closeStart) + 2;
    expect(main.slice(openStart, openEnd)).toContain("renderRevealPlayAttention();");
    expect(main.slice(closeStart, closeEnd)).toContain("renderRevealPlayAttention();");
    expect(main.slice(openStart, openEnd)).not.toContain("refreshInteractionSurface();");
    expect(main.slice(closeStart, closeEnd)).not.toContain("refreshInteractionSurface();");
  });
});

// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
