import {
  applyGameplayCommand,
  projectPlayerObservation,
  startMatchFromOrderedDeck,
} from "@koikoi4x/engine";
import { PHASE_1B_CAPTURE_FIXTURES } from "@koikoi4x/test-fixtures";
import { describe, expect, it } from "vitest";

import { computeBoardLayout } from "../src/presentation/board/board-layout";
import {
  findFaceUpLegalFieldPlacements,
  resolveFieldDestinationAttention,
} from "../src/presentation/input/field-destination-attention";
import { createInteractionController } from "../src/presentation/input/input-controller";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";
import type { InputCommandIntentV1, InteractionSourceV1 } from "../src/presentation/input/types";

function handController() {
  const fixture = getTechnicalInputFixture("handPlay");
  return Object.freeze({
    fixture,
    controller: createInteractionController({
      source: fixture.source,
      confirmationMode: "guided",
      onIntent: () => undefined,
    }),
  });
}

function drawController(fixtureId: "CAP-000" | "CAP-DRAW-001" | "CAP-DRAW-002" | "CAP-DRAW-003") {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find(({ id }) => id === fixtureId);
  if (!fixture) throw new Error(`Missing authoritative Draw fixture: ${fixtureId}`);
  const started = startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `phase3fj-${fixtureId}:start`,
      matchId: `phase3fj-${fixtureId}`,
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
    commandId: `phase3fj-${fixtureId}:hand`,
    matchId: started.state.matchId,
    expectedStateVersion: started.state.stateVersion,
  });
  if (transition.state.phase.kind !== "awaitingDrawResolution") {
    throw new Error(`Expected Draw resolution for ${fixtureId}`);
  }
  const source: InteractionSourceV1 = Object.freeze({
    observation: projectPlayerObservation(transition.state, "player-a"),
  });
  const intents: InputCommandIntentV1[] = [];
  return Object.freeze({
    phase: transition.state.phase,
    source,
    intents,
    controller: createInteractionController({
      source,
      confirmationMode: "guided",
      onIntent: (intent) => intents.push(intent),
    }),
  });
}

describe("Phase 3F-J legal destination attention", () => {
  it.each([
    ["august-geese", "fieldPlacement", []],
    ["march-curtain", "targets", ["march-red-text-scroll"]],
    ["april-cuckoo", "targets", ["april-red-scroll", "april-wisteria-plain-a"]],
    ["may-bridge", "targets", ["may-red-scroll", "may-iris-plain-a", "may-iris-plain-b"]],
  ] as const)(
    "uses controller-owned Hand %s destination authority",
    (cardId, expectedKind, expectedTargets) => {
      const input = handController();
      expect(
        resolveFieldDestinationAttention({ inspection: input.controller.inspect() }),
      ).toBeNull();
      expect(input.controller.activateCard(cardId)).toBe(true);
      expect(resolveFieldDestinationAttention({ inspection: input.controller.inspect() })).toEqual({
        kind: expectedKind,
        legalTargetCardIds: expectedTargets,
      });
      expect(input.controller.cancel()).toBe(true);
      expect(
        resolveFieldDestinationAttention({ inspection: input.controller.inspect() }),
      ).toBeNull();
    },
  );

  it.each([
    ["CAP-000", "fieldPlacement", 0],
    ["CAP-DRAW-001", "targets", 1],
    ["CAP-DRAW-002", "targets", 2],
    ["CAP-DRAW-003", "targets", 3],
  ] as const)(
    "uses real authority-shaped %s Draw destinations",
    (fixtureId, expectedKind, expectedTargetCount) => {
      const input = drawController(fixtureId);
      expect(
        resolveFieldDestinationAttention({ inspection: input.controller.inspect() }),
      ).toBeNull();
      expect(input.controller.activateCard(input.phase.drawnCardId)).toBe(true);
      const attention = resolveFieldDestinationAttention({
        inspection: input.controller.inspect(),
      });
      expect(attention?.kind).toBe(expectedKind);
      expect(attention?.legalTargetCardIds).toHaveLength(expectedTargetCount);
      expect(input.controller.cancel()).toBe(true);
      expect(
        resolveFieldDestinationAttention({ inspection: input.controller.inspect() }),
      ).toBeNull();
      expect(input.intents).toEqual([]);
    },
  );

  it("uses actual face-up field-card placement bounds only", () => {
    const fixture = getTechnicalInputFixture("handPlay");
    const input = handController();
    input.controller.activateCard("april-cuckoo");
    const targets = input.controller.inspect().legalTargetCardIds;
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const placements = findFaceUpLegalFieldPlacements({
      layout,
      projection: fixture.projection,
      legalTargetCardIds: targets,
    });
    expect(placements.map(({ cardId }) => cardId)).toEqual(targets);
    expect(placements.every(({ faceUp, zone }) => faceUp && zone === "field")).toBe(true);
    expect(placements.map(({ bounds }) => bounds)).toEqual(
      fixture.projection
        .filter(
          ({ cardId, faceUp, zone }) => targets.includes(cardId) && faceUp && zone === "field",
        )
        .map(({ cardId }) => {
          const placement = placements.find((candidate) => candidate.cardId === cardId);
          if (!placement) throw new Error(`Missing ${cardId}`);
          return placement.bounds;
        }),
    );
    expect(
      findFaceUpLegalFieldPlacements({
        layout,
        projection: fixture.projection.map((card) =>
          card.cardId === "april-red-scroll" ? { ...card, faceUp: false } : card,
        ),
        legalTargetCardIds: targets,
      }).map(({ cardId }) => cardId),
    ).toEqual(["april-wisteria-plain-a"]);
  });

  it("stays absent for preselection, locks, invalid status, and empty target authority", () => {
    const input = handController();
    const idle = input.controller.inspect();
    expect(resolveFieldDestinationAttention({ inspection: idle })).toBeNull();
    input.controller.activateCard("march-curtain");
    input.controller.setExternalLock("animation");
    expect(resolveFieldDestinationAttention({ inspection: input.controller.inspect() })).toBeNull();
    expect(
      resolveFieldDestinationAttention({
        inspection: {
          ...idle,
          selectedCardId: "march-curtain",
          status: "targeting",
          fieldPlacementAvailable: false,
          legalTargetCardIds: [],
        },
      }),
    ).toBeNull();
  });

  it("keeps pulse and wording decorative while preserving the existing Pixi source/target frame", () => {
    const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(index).toMatch(
      /data-reveal-play-attention[\s\S]*?<div\s+class="field-destination-attention"\s+data-field-destination-attention\s+aria-hidden="true"\s+hidden\s*><\/div>[\s\S]*?data-input-field-placement/u,
    );
    expect(index).toContain("No match. Place card on the field.");

    const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
    const start = css.indexOf(".legal-destination-attention {");
    const end = css.indexOf("}", start);
    const block = css.slice(start, end);
    expect(block).toContain("border: 2px solid var(--theme-accent);");
    expect(block).toContain("background: transparent;");
    expect(block).toContain("pointer-events: none;");
    expect(block).toContain("legal-destination-attention-pulse 1.2s");
    expect(block).not.toContain("transform");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.legal-destination-attention\s*\{[\s\S]*?animation:\s*none !important;/u,
    );

    const pixi = readFileSync(
      new URL("../src/presentation/pixi/create-table-scene.ts", import.meta.url),
      "utf8",
    );
    expect(pixi).not.toContain('label("PLACE HERE"');
    expect(pixi).toContain("const gold = input.target || input.selected;");

    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    expect(main).toMatch(
      /function renderFieldDestinationAttention\([\s\S]*?currentInputLock\(\) !== null[\s\S]*?resolveFieldDestinationAttention\([\s\S]*?findFaceUpLegalFieldPlacements\(/u,
    );
    expect(main).toContain('badge.textContent = "NO MATCH · PLACE HERE";');
    expect(main).toContain('"No match. Place card on the field."');
    const openStart = main.indexOf("function openOptions(): void {");
    const openEnd = main.indexOf("\n}\n", openStart) + 2;
    expect(main.slice(openStart, openEnd)).toContain("renderFieldDestinationAttention();");
    expect(main.slice(openStart, openEnd)).not.toContain("refreshInteractionSurface();");
  });
});

// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
