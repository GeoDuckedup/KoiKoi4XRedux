import { describe, expect, it } from "vitest";

import { shouldShowHandPlayAttention } from "../src/presentation/input/hand-play-attention";
import { createInteractionController } from "../src/presentation/input/input-controller";
import { getTechnicalInputFixture } from "../src/presentation/input/technical-input-fixtures";

function controllerFor(fixtureId: "handPlay" | "drawCapture" | "yakuDecision" | "opponentTurn") {
  const fixture = getTechnicalInputFixture(fixtureId);
  const controller = createInteractionController({
    source: fixture.source,
    confirmationMode: "guided",
    onIntent: () => undefined,
  });
  return { controller, fixture };
}

function visibleFor(input: ReturnType<typeof controllerFor>): boolean {
  return shouldShowHandPlayAttention({
    observation: input.fixture.source.observation,
    inspection: input.controller.inspect(),
  });
}

describe("Phase 3F-H active-Hand attention", () => {
  it("shows only for an idle local awaiting-Hand-play turn and restores after cancellation", () => {
    const input = controllerFor("handPlay");
    expect(visibleFor(input)).toBe(true);

    expect(input.controller.activateCard("march-curtain")).toBe(true);
    expect(visibleFor(input)).toBe(false);

    expect(input.controller.cancel()).toBe(true);
    expect(visibleFor(input)).toBe(true);
  });

  it("stays absent for locks, Draw, yaku decisions, and an opponent turn", () => {
    const hand = controllerFor("handPlay");
    hand.controller.setExternalLock("animation");
    expect(visibleFor(hand)).toBe(false);

    expect(visibleFor(controllerFor("drawCapture"))).toBe(false);
    expect(visibleFor(controllerFor("yakuDecision"))).toBe(false);
    expect(visibleFor(controllerFor("opponentTurn"))).toBe(false);
  });

  it("keeps the cue as a first-child, noninteractive overlay with a white reduced-motion-safe treatment", () => {
    const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(index).toMatch(
      /data-card-input-overlay[\s\S]*?>\s*<div class="hand-play-attention" data-hand-play-attention aria-hidden="true" hidden><\/div>/u,
    );

    const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
    const start = css.indexOf(".hand-play-attention {");
    const end = css.indexOf("}", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(block).toContain("border: 2px solid #fff;");
    expect(block).toContain("background: transparent;");
    expect(block).toContain("pointer-events: none;");
    expect(block).toContain("hand-play-attention-pulse 1.2s");
    expect(block).not.toContain("var(--theme-accent)");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hand-play-attention\s*\{[\s\S]*?animation:\s*none !important;/u,
    );
  });

  it("lets Options hide or restore only the decorative cue without resetting card selection", () => {
    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    const openStart = main.indexOf("function openOptions(): void {");
    const openEnd = main.indexOf("\n}\n", openStart) + 2;
    const closeStart = main.indexOf("function closeOptions(restoreFocus = true): void {");
    const closeEnd = main.indexOf("\n}\n", closeStart) + 2;
    expect(openStart).toBeGreaterThanOrEqual(0);
    expect(closeStart).toBeGreaterThanOrEqual(0);
    expect(main.slice(openStart, openEnd)).toContain("renderHandPlayAttention();");
    expect(main.slice(closeStart, closeEnd)).toContain("renderHandPlayAttention();");
    expect(main.slice(openStart, openEnd)).not.toContain("refreshInteractionSurface();");
    expect(main.slice(closeStart, closeEnd)).not.toContain("refreshInteractionSurface();");
    expect(main).toMatch(
      /function renderHandPlayAttention\([\s\S]*?currentInputLock\(\) === null[\s\S]*?!optionsDialog\.open/u,
    );
  });
});

// @ts-expect-error Web production types intentionally exclude Node; this Vitest-only source audit runs in Node.
import { readFileSync } from "node:fs";
