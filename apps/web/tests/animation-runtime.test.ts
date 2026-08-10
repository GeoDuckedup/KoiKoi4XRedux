import type { PublicGameEventV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createAnimationDirector } from "../src/presentation/animation/animation-director";
import { computeAnimatedCardPlacements } from "../src/presentation/animation/card-animation-frame";
import { planPublicEvents } from "../src/presentation/animation/event-planner";
import {
  createPresentationProjection,
  fingerprintProjection,
} from "../src/presentation/animation/projection";
import {
  getTechnicalAnimationScenario,
  TECHNICAL_ANIMATION_SCENARIO_IDS,
} from "../src/presentation/animation/technical-scenarios";
import { ANIMATION_MODES, type AnimationSurfaceV1 } from "../src/presentation/animation/types";
import { computeBoardLayout } from "../src/presentation/board/board-layout";

function requiredProjection<T>(items: readonly T[], index: number): T {
  const item = index < 0 ? items.at(index) : items[index];
  if (!item) throw new Error(`Missing test projection ${index}.`);
  return item;
}

function recordingSurface(initial = getTechnicalAnimationScenario("handToField").projections[0]) {
  if (!initial) throw new Error("Missing test initial projection.");
  let current = createPresentationProjection(initial);
  const rendered: { kind: string; progress: number; mode: string }[] = [];
  const surface: AnimationSurfaceV1 = {
    renderClip: (clip, progress, mode) => {
      rendered.push({ kind: clip.kind, progress, mode });
    },
    snapTo: (projection) => {
      current = createPresentationProjection(projection);
    },
  };
  return { surface, rendered, current: () => current };
}

describe("Phase 2C event planner", () => {
  it("ANIM-001/002/003/004 maps semantic scenarios to the required ordered clip language", () => {
    const expectations = {
      handToField: ["selection", "travel", "travel", "reflow"],
      pairCapture: ["selection", "travel", "alignment", "capture", "reflow"],
      drawReveal: ["draw", "flip", "revealPause", "travel", "reflow"],
      fourCardSweep: ["selection", "travel", "alignment", "capture", "reflow"],
      multiplierFeedback: ["feedback"],
    } as const;

    for (const scenarioId of TECHNICAL_ANIMATION_SCENARIO_IDS) {
      const scenario = getTechnicalAnimationScenario(scenarioId);
      const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
      expect(
        plan.clips.map(({ kind }) => kind),
        scenarioId,
      ).toEqual(expectations[scenarioId]);
      expect(plan.source).toEqual(scenario.projections[0]);
      expect(plan.target).toEqual(scenario.projections.at(-1));
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.clips)).toBe(true);
      expect(plan.clips.every(Object.isFrozen)).toBe(true);
      expect(Object.isFrozen(scenario.events)).toBe(true);
      expect(
        scenario.events.every((event) =>
          Object.values(event).every((value) => !Array.isArray(value) || Object.isFrozen(value)),
        ),
      ).toBe(true);
    }
  });

  it("ANIM-005 maps public HUD/result events to presentation feedback without board inference", () => {
    const projection = getTechnicalAnimationScenario("multiplierFeedback").projections[0];
    if (!projection) throw new Error("Missing feedback projection.");
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuValueChanged",
        actorId: "player-a",
        phase: "draw",
        yakuKey: "animals",
        name: "Animals",
        previousPoints: 3,
        currentPoints: 4,
      },
      { type: "turnCompleted", actorId: "player-a", nextPlayerId: "player-b" },
    ];
    const plan = planPublicEvents(events, { projections: [projection, projection, projection] });
    expect(plan.clips.map(({ kind }) => kind)).toEqual(["feedback", "feedback"]);
    expect(plan.clips.every(({ affectedCardIds }) => affectedCardIds.length === 0)).toBe(true);
  });

  it("PRES-YAKU-001-MULTI-HAND coalesces simultaneous completions and one decision into one feedback pause", () => {
    const projection = getTechnicalAnimationScenario("multiplierFeedback").projections[0];
    if (!projection) throw new Error("Missing feedback projection.");
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuCompleted",
        actorId: "player-a",
        phase: "hand",
        yaku: { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
      },
      {
        type: "yakuCompleted",
        actorId: "player-a",
        phase: "hand",
        yaku: { key: "moonViewing", name: "Moon Viewing", points: 5 },
      },
      {
        type: "yakuDecisionRequired",
        actorId: "player-a",
        context: {
          phase: "hand",
          newYaku: [
            { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
            { key: "moonViewing", name: "Moon Viewing", points: 5 },
          ],
          activeYaku: [
            { key: "blossomViewing", name: "Blossom Viewing", points: 5 },
            { key: "moonViewing", name: "Moon Viewing", points: 5 },
          ],
          currentYakuTotal: 10,
          resume: { kind: "drawPhase" },
        },
      },
    ];
    const plan = planPublicEvents(events, {
      projections: [projection, projection, projection, projection],
    });
    expect(plan.clips.map(({ eventType, kind }) => ({ eventType, kind }))).toEqual([
      { eventType: "yakuDecisionRequired", kind: "feedback" },
    ]);
  });

  it("PRES-YAKU-002-INCREMENT-NO-DECISION keeps one incremental feedback pause", () => {
    const projection = getTechnicalAnimationScenario("multiplierFeedback").projections[0];
    if (!projection) throw new Error("Missing feedback projection.");
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuValueChanged",
        actorId: "player-a",
        phase: "draw",
        yakuKey: "animals",
        name: "Animals",
        previousPoints: 3,
        currentPoints: 4,
      },
    ];
    const plan = planPublicEvents(events, { projections: [projection, projection] });
    expect(plan.clips.map(({ eventType, kind }) => ({ eventType, kind }))).toEqual([
      { eventType: "yakuValueChanged", kind: "feedback" },
    ]);
  });

  it("PRES-KOI-002-CONTINUE-AND-RESUME coalesces the decision choice into the Koi-Koi feedback", () => {
    const projection = getTechnicalAnimationScenario("multiplierFeedback").projections[0];
    if (!projection) throw new Error("Missing feedback projection.");
    const events: readonly PublicGameEventV1[] = [
      {
        type: "yakuDecisionChosen",
        actorId: "player-a",
        choice: "koiKoi",
        privilegeUsed: false,
      },
      {
        type: "koiKoiCalled",
        actorId: "player-a",
        previousTableMultiplier: 1,
        currentTableMultiplier: 2,
        privilegeUsed: false,
      },
    ];
    const plan = planPublicEvents(events, {
      projections: [projection, projection, projection],
    });
    expect(plan.clips.map(({ eventType, kind }) => ({ eventType, kind }))).toEqual([
      { eventType: "koiKoiCalled", kind: "feedback" },
    ]);
  });

  it("ANIM-003 keeps a drawn card face-down through travel and reveals it only in the flip clip", () => {
    const scenario = getTechnicalAnimationScenario("drawReveal");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const draw = plan.clips.find(({ kind }) => kind === "draw");
    const flip = plan.clips.find(({ kind }) => kind === "flip");
    expect(draw?.to.find(({ cardId }) => cardId === "august-pampas-plain-a")?.faceUp).toBe(false);
    expect(flip?.from.find(({ cardId }) => cardId === "august-pampas-plain-a")?.faceUp).toBe(false);
    expect(flip?.to.find(({ cardId }) => cardId === "august-pampas-plain-a")?.faceUp).toBe(true);
    expect(flip?.affectedCardIds).toEqual(["august-pampas-plain-a"]);
  });

  it("ANIM-012 rejects incomplete, duplicate, or mismatched immutable inputs", () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    expect(() =>
      planPublicEvents(scenario.events, { projections: [scenario.projections[0] ?? []] }),
    ).toThrow(/event-boundary/);
    const incomplete = scenario.projections[0]?.slice(1) ?? [];
    expect(() => createPresentationProjection(incomplete)).toThrow(/exactly 48/);
    const duplicate = [...(scenario.projections[0] ?? [])];
    if (duplicate[0] && duplicate[1]) duplicate[1] = duplicate[0];
    expect(() => createPresentationProjection(duplicate)).toThrow(/duplicate/);
  });
});

describe("Phase 2C deterministic AnimationDirector", () => {
  it.each(ANIMATION_MODES)("ANIM-007 %s mode settles to the exact same target", async (mode) => {
    const scenario = getTechnicalAnimationScenario("pairCapture");
    const recording = recordingSurface(requiredProjection(scenario.projections, 0));
    const director = createAnimationDirector({
      initialProjection: requiredProjection(scenario.projections, 0),
      mode,
      surface: recording.surface,
    });
    const completion = director.play(scenario.events, { projections: scenario.projections });
    director.advanceBy(10_000);
    expect(await completion).toBe("completed");
    expect(fingerprintProjection(recording.current())).toBe(
      fingerprintProjection(requiredProjection(scenario.projections, -1)),
    );
    expect(director.inspect()).toMatchObject({
      status: "completed",
      queuedPlanCount: 0,
      queuedClipCount: 0,
      displayFingerprint: director.inspect().targetFingerprint,
    });
  });

  it("ANIM-006 executes concurrent plans FIFO and rejects a mismatched queued source", async () => {
    const first = getTechnicalAnimationScenario("handToField");
    const firstTarget = requiredProjection(first.projections, -1);
    const recording = recordingSurface(requiredProjection(first.projections, 0));
    const director = createAnimationDirector({
      initialProjection: requiredProjection(first.projections, 0),
      mode: "normal",
      surface: recording.surface,
    });
    const firstCompletion = director.play(first.events, { projections: first.projections });
    const feedback: readonly PublicGameEventV1[] = [
      {
        type: "koiKoiCalled",
        actorId: "player-a",
        previousTableMultiplier: 1,
        currentTableMultiplier: 2,
        privilegeUsed: false,
      },
    ];
    const secondCompletion = director.play(feedback, { projections: [firstTarget, firstTarget] });
    await expect(
      director.play(feedback, {
        projections: [requiredProjection(first.projections, 0), firstTarget],
      }),
    ).rejects.toThrow(/current target/);
    director.advanceBy(20_000);
    expect(await firstCompletion).toBe("completed");
    expect(await secondCompletion).toBe("completed");
    expect(recording.rendered.at(-1)?.kind).toBe("feedback");
  });

  it("ANIM-006 keeps an empty plan queued behind active work instead of completing the head", async () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    const source = requiredProjection(scenario.projections, 0);
    const target = requiredProjection(scenario.projections, -1);
    const recording = recordingSurface(source);
    const director = createAnimationDirector({
      initialProjection: source,
      mode: "normal",
      surface: recording.surface,
    });
    const first = director.play(scenario.events, { projections: scenario.projections });
    let emptySettled = false;
    const empty = director.play([], { projections: [target] }).then((result) => {
      emptySettled = true;
      return result;
    });
    director.advanceBy(1);
    await Promise.resolve();
    expect(emptySettled).toBe(false);
    expect(director.inspect().queuedPlanCount).toBe(2);
    director.advanceBy(20_000);
    expect(await first).toBe("completed");
    expect(await empty).toBe("completed");
    expect(director.inspect().queuedPlanCount).toBe(0);
  });

  it("ANIM-006 compares every presentation field instead of trusting diagnostic hashes", async () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    const source = requiredProjection(scenario.projections, 0);
    const target = requiredProjection(scenario.projections, -1);
    const recording = recordingSurface(source);
    const director = createAnimationDirector({
      initialProjection: source,
      mode: "normal",
      surface: recording.surface,
    });
    const first = director.play(scenario.events, { projections: scenario.projections });
    const changedInteraction = createPresentationProjection(
      target.map((state, index) =>
        index === 0 ? Object.freeze({ ...state, interactive: !state.interactive }) : state,
      ),
    );
    await expect(director.play([], { projections: [changedInteraction] })).rejects.toThrow(
      /current target/,
    );
    await director.finishImmediately();
    expect(await first).toBe("finished");
  });

  it("ANIM-008 accelerates once and finishes on the second deliberate skip", async () => {
    const scenario = getTechnicalAnimationScenario("drawReveal");
    const recording = recordingSurface(requiredProjection(scenario.projections, 0));
    const director = createAnimationDirector({
      initialProjection: requiredProjection(scenario.projections, 0),
      mode: "normal",
      surface: recording.surface,
    });
    const completion = director.play(scenario.events, { projections: scenario.projections });
    director.advanceBy(100);
    director.accelerate();
    expect(director.inspect().speedMultiplier).toBe(4);
    director.accelerate();
    expect(await completion).toBe("finished");
    expect(director.inspect()).toMatchObject({ status: "finished", queuedClipCount: 0 });
  });

  it("ANIM-009 cancel snaps synchronously, clears the queue, and prevents stale writes", async () => {
    const scenario = getTechnicalAnimationScenario("fourCardSweep");
    const source = requiredProjection(scenario.projections, 0);
    const target = requiredProjection(scenario.projections, -1);
    const recording = recordingSurface(source);
    const director = createAnimationDirector({
      initialProjection: source,
      mode: "normal",
      surface: recording.surface,
    });
    const completion = director.play(scenario.events, { projections: scenario.projections });
    director.advanceBy(250);
    await director.cancelAndSnapTo(target);
    const frameCount = recording.rendered.length;
    director.advanceBy(50_000);
    expect(await completion).toBe("cancelled");
    expect(recording.rendered).toHaveLength(frameCount);
    expect(director.inspect()).toMatchObject({
      status: "cancelled",
      queuedPlanCount: 0,
      displayFingerprint: fingerprintProjection(target),
      targetFingerprint: fingerprintProjection(target),
    });
  });

  it("ANIM-008 finishImmediately settles the active and queued plans in FIFO target order", async () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    const source = requiredProjection(scenario.projections, 0);
    const target = requiredProjection(scenario.projections, -1);
    const recording = recordingSurface(source);
    const director = createAnimationDirector({
      initialProjection: source,
      mode: "normal",
      surface: recording.surface,
    });
    const first = director.play(scenario.events, { projections: scenario.projections });
    const feedback: readonly PublicGameEventV1[] = [
      {
        type: "koiKoiCalled",
        actorId: "player-a",
        previousTableMultiplier: 1,
        currentTableMultiplier: 2,
        privilegeUsed: false,
      },
    ];
    const second = director.play(feedback, { projections: [target, target] });
    await director.finishImmediately();
    expect(await first).toBe("finished");
    expect(await second).toBe("finished");
    expect(fingerprintProjection(recording.current())).toBe(fingerprintProjection(target));
    expect(director.inspect().queuedPlanCount).toBe(0);
  });

  it("ANIM-009 destroy resolves work as cancelled and rejects every future batch", async () => {
    const scenario = getTechnicalAnimationScenario("pairCapture");
    const source = requiredProjection(scenario.projections, 0);
    const recording = recordingSurface(source);
    const director = createAnimationDirector({
      initialProjection: source,
      mode: "normal",
      surface: recording.surface,
    });
    const completion = director.play(scenario.events, { projections: scenario.projections });
    director.advanceBy(200);
    const frameCount = recording.rendered.length;
    director.destroy();
    director.advanceBy(50_000);
    expect(await completion).toBe("cancelled");
    expect(recording.rendered).toHaveLength(frameCount);
    expect(director.inspect().status).toBe("destroyed");
    await expect(
      director.play(scenario.events, { projections: scenario.projections }),
    ).rejects.toThrow(/destroyed/);
  });

  it("ANIM-001 is step-size independent at completion", async () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    const run = async (steps: readonly number[]) => {
      const recording = recordingSurface(requiredProjection(scenario.projections, 0));
      const director = createAnimationDirector({
        initialProjection: requiredProjection(scenario.projections, 0),
        mode: "normal",
        surface: recording.surface,
      });
      const completion = director.play(scenario.events, { projections: scenario.projections });
      for (const step of steps) director.advanceBy(step);
      await director.finishImmediately();
      await completion;
      return { inspection: director.inspect(), projection: recording.current() };
    };
    const oneStep = await run([500]);
    const fiveSteps = await run([100, 100, 100, 100, 100]);
    expect(fingerprintProjection(oneStep.projection)).toBe(
      fingerprintProjection(fiveSteps.projection),
    );
    expect(oneStep.inspection.displayFingerprint).toBe(fiveSteps.inspection.displayFingerprint);
  });
});

describe("Phase 2C card animation adapter", () => {
  it("ANIM-010 rebases an in-flight move across layouts and leaves the settled target contained", () => {
    const scenario = getTechnicalAnimationScenario("handToField");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const clip = plan.clips.find(({ kind }) => kind === "travel");
    if (!clip) throw new Error("Missing travel clip.");
    const portrait = computeAnimatedCardPlacements(
      computeBoardLayout({ width: 390, height: 720 }),
      clip,
      0.5,
      "normal",
    );
    const landscape = computeAnimatedCardPlacements(
      computeBoardLayout({ width: 844, height: 340 }),
      clip,
      0.5,
      "normal",
    );
    expect(portrait.find(({ cardId }) => cardId === "march-curtain")?.layer).toBe("EffectsLayer");
    expect(landscape.find(({ cardId }) => cardId === "march-curtain")?.layer).toBe("EffectsLayer");
    expect(portrait.find(({ cardId }) => cardId === "march-curtain")?.bounds).not.toEqual(
      landscape.find(({ cardId }) => cardId === "march-curtain")?.bounds,
    );
  });

  it("ANIM-007 reduced motion uses final zones with a short fade and no transit travel", () => {
    const scenario = getTechnicalAnimationScenario("pairCapture");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const clip = plan.clips.find(({ kind }) => kind === "capture");
    if (!clip) throw new Error("Missing capture clip.");
    const placements = computeAnimatedCardPlacements(
      computeBoardLayout({ width: 390, height: 720 }),
      clip,
      0.4,
      "reducedMotion",
    );
    expect(placements.every(({ zone }) => zone !== "transit")).toBe(true);
    expect(placements.find(({ cardId }) => cardId === "april-cuckoo")?.alpha).toBeLessThan(1);
  });
});
