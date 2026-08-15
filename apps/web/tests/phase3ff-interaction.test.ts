import { describe, expect, it } from "vitest";

import { createCardInspectionPresentation } from "../src/game/card-inspection";
import { createContextualHelpPresentation } from "../src/game/contextual-help";
import { computeBoardLayout } from "../src/presentation/board/board-layout";
import { buildSemanticCardControls } from "../src/presentation/input/hit-areas";
import { createInteractionController } from "../src/presentation/input/input-controller";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";

describe("Phase 3F-F contextual surfaces", () => {
  it("derives next-action help only from the observation and current input inspection", () => {
    const fixture = getTechnicalInputFixture("handPlay");
    const controller = createInteractionController({
      source: fixture.source,
      confirmationMode: "guided",
      onIntent: () => undefined,
    });
    const idle = createContextualHelpPresentation({
      observation: fixture.source.observation,
      inspection: controller.inspect(),
    });
    expect(idle.title).toBe("Play a card from your hand");
    expect(idle.steps.join(" ")).toContain("Matching cards share a month");

    controller.activateCard("august-geese");
    const placement = createContextualHelpPresentation({
      observation: fixture.source.observation,
      inspection: controller.inspect(),
    });
    expect(placement.title).toBe("Place the selected card");
    expect(placement.summary).toContain("no matching field card");
  });

  it("formats a static card reference without evaluating the current board", () => {
    const inspection = createCardInspectionPresentation("september-sake-cup");
    expect(inspection).toMatchObject({
      title: "Sake Cup",
      month: "September",
    });
    expect(inspection.yakuEntries.map(({ key }) => key)).toEqual([
      "blossomViewing",
      "moonViewing",
      "currentMonthSet",
      "animals",
    ]);
    expect(JSON.stringify(inspection)).not.toContain("currentYaku");
  });

  it("merges actionable and inspection semantics into one public control per eligible card", () => {
    const fixture = getTechnicalInputFixture("handPlay");
    const controller = createInteractionController({
      source: fixture.source,
      confirmationMode: "guided",
      onIntent: () => undefined,
    });
    const controls = buildSemanticCardControls({
      inspection: controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: fixture.projection,
    });
    expect(new Set(controls.map(({ cardId }) => cardId)).size).toBe(controls.length);
    expect(controls[0]).toMatchObject({ actionable: true, role: "selectable" });
    expect(controls.find(({ cardId }) => cardId === "march-curtain")).toMatchObject({
      actionable: true,
      actionLabel: "select card",
    });
    expect(controls.find(({ cardId }) => cardId === "march-red-text-scroll")).toMatchObject({
      actionable: false,
      actionLabel: "inspect card",
      role: "inspectable",
    });
    expect(controls.some(({ cardId }) => cardId === "november-rain")).toBe(false);

    controller.activateCard("april-cuckoo");
    const targetingControls = buildSemanticCardControls({
      inspection: controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: fixture.projection,
    });
    expect(
      targetingControls.filter(({ role }) => role === "target").map(({ cardId }) => cardId),
    ).toEqual(["april-red-scroll", "april-wisteria-plain-a"]);
  });

  it("keeps Draw reveal activation actionable while excluding it from card inspection", () => {
    const fixture = getTechnicalInputFixture("drawCapture");
    const intents: unknown[] = [];
    const controller = createInteractionController({
      source: fixture.source,
      confirmationMode: "guided",
      onIntent: (intent) => intents.push(intent),
    });
    const controls = buildSemanticCardControls({
      inspection: controller.inspect(),
      layout: computeBoardLayout({ width: 390, height: 720 }),
      projection: fixture.projection,
    });
    expect(controls.find(({ cardId }) => cardId === "august-pampas-plain-a")).toMatchObject({
      actionable: true,
      inspectable: false,
      role: "selectable",
      actionLabel: "select card",
    });
    expect(controller.activateCard("august-pampas-plain-a")).toBe(true);
    expect(controller.inspect()).toMatchObject({
      status: "targeting",
      legalTargetCardIds: ["august-geese", "august-pampas-plain-b"],
    });
    expect(intents).toEqual([]);
  });
});
