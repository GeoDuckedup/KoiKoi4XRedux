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
import {
  computeCardPlacements,
  computeDrawPileTopBounds,
} from "../src/presentation/cards/card-layout";

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
      handToField: ["selection", "reflow", "travel"],
      pairCapture: ["selection", "travel", "alignment", "capture", "reflow"],
      drawReveal: ["draw", "flip", "revealPause", "reflow", "travel"],
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

  it("PHASE-3FD captures use an immutable first-target overlap, hold it, then collect", () => {
    const scenario = getTechnicalAnimationScenario("pairCapture");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const travel = plan.clips.find(
      ({ eventType, kind }) => eventType === "handCardPlayed" && kind === "travel",
    );
    const hold = plan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "alignment",
    );
    const capture = plan.clips.find(({ kind }) => kind === "capture");
    if (!travel || !hold || !capture) throw new Error("Missing capture choreography clips.");
    expect(travel.captureOverlap).toEqual({
      sourceCardId: "april-cuckoo",
      targetFieldCardId: "april-wisteria-plain-a",
      horizontalOffsetRatio: 0.12,
      verticalOffsetRatio: 0.1,
    });
    expect(Object.isFrozen(travel.captureOverlap)).toBe(true);
    expect(hold.durationMs).toBeGreaterThanOrEqual(150);
    expect(hold.durationMs).toBeLessThanOrEqual(200);
    expect(hold.affectedCardIds).toEqual(["april-cuckoo"]);
    expect(capture.captureOverlap).toEqual(travel.captureOverlap);

    const layout = computeBoardLayout({ width: 390, height: 844 });
    const targetId = "april-wisteria-plain-a";
    const sourceId = "april-cuckoo";
    const targetAtHold = computeAnimatedCardPlacements(layout, hold, 0.5, "normal").find(
      ({ cardId }) => cardId === targetId,
    );
    const targetAtStart = computeAnimatedCardPlacements(layout, hold, 0, "normal").find(
      ({ cardId }) => cardId === targetId,
    );
    const sourceAtHold = computeAnimatedCardPlacements(layout, hold, 0.5, "normal").find(
      ({ cardId }) => cardId === sourceId,
    );
    expect(targetAtHold?.bounds).toEqual(targetAtStart?.bounds);
    expect(sourceAtHold?.bounds.x).toBeGreaterThan(targetAtHold?.bounds.x ?? Infinity);
    expect(sourceAtHold?.bounds.y).toBeGreaterThan(targetAtHold?.bounds.y ?? Infinity);
    const reducedHold = computeAnimatedCardPlacements(layout, hold, 0.5, "reducedMotion");
    const reducedSource = reducedHold.find(({ cardId }) => cardId === sourceId);
    const reducedTarget = reducedHold.find(({ cardId }) => cardId === targetId);
    expect(reducedSource?.bounds).toEqual(sourceAtHold?.bounds);
    expect(reducedTarget?.bounds).toEqual(targetAtHold?.bounds);
  });

  it("PHASE-3FD sends no-match hand cards directly to their final field slot and adds no draw pulse", () => {
    const hand = getTechnicalAnimationScenario("handToField");
    const handPlan = planPublicEvents(hand.events, { projections: hand.projections });
    const travel = handPlan.clips.find(({ kind }) => kind === "travel");
    if (!travel) throw new Error("Missing no-match travel clip.");
    expect(travel.eventType).toBe("cardPlacedOnField");
    expect(travel.from.find(({ cardId }) => cardId === "march-curtain")?.zone).toBe("playerHand");
    expect(travel.to.find(({ cardId }) => cardId === "march-curtain")?.zone).toBe("field");

    const draw = getTechnicalAnimationScenario("drawReveal");
    const revealed = requiredProjection(draw.projections, 1);
    const resolution: PublicGameEventV1 = {
      type: "drawResolutionRequired",
      actorId: "player-a",
      drawnCardId: "august-pampas-plain-a",
      resolution: { kind: "capturePair", matchingFieldCardIds: ["august-geese"] },
    };
    expect(planPublicEvents([resolution], { projections: [revealed, revealed] }).clips).toEqual([]);
  });

  it("PHASE-3FD draws from Reveal to the original first target and sweeps preserve first-target authority", () => {
    const hand = getTechnicalAnimationScenario("pairCapture");
    const drawBefore = createPresentationProjection(
      requiredProjection(hand.projections, 0).map((state) =>
        state.cardId === "april-cuckoo"
          ? Object.freeze({ ...state, zone: "reveal" as const, slotId: "reveal:0", slotIndex: 0 })
          : state,
      ),
    );
    const drawTransit = createPresentationProjection(
      drawBefore.map((state) =>
        state.cardId === "april-cuckoo"
          ? Object.freeze({
              ...state,
              zone: "transit" as const,
              slotId: "transit:april-cuckoo",
              slotIndex: 0,
            })
          : state,
      ),
    );
    const drawEvents: readonly PublicGameEventV1[] = [
      {
        type: "captureStarted",
        actorId: "player-a",
        phase: "draw",
        sourceCardId: "april-cuckoo",
        targetFieldCardIds: ["april-wisteria-plain-a"],
        captureKind: "pair",
      },
      {
        type: "cardsCaptured",
        actorId: "player-a",
        phase: "draw",
        cardIds: ["april-cuckoo", "april-wisteria-plain-a"],
        captureKind: "pair",
      },
    ];
    const drawPlan = planPublicEvents(drawEvents, {
      projections: [drawBefore, drawTransit, requiredProjection(hand.projections, -1)],
    });
    const drawTravel = drawPlan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "travel",
    );
    const drawHold = drawPlan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "alignment",
    );
    if (!drawTravel || !drawHold) throw new Error("Missing draw capture choreography.");
    expect(drawTravel.from.find(({ cardId }) => cardId === "april-cuckoo")?.zone).toBe("reveal");
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const source = computeAnimatedCardPlacements(layout, drawHold, 0.5, "normal").find(
      ({ cardId }) => cardId === "april-cuckoo",
    );
    const anchor = computeCardPlacements(layout, drawBefore).find(
      ({ cardId }) => cardId === "april-wisteria-plain-a",
    );
    expect(source?.bounds.x).toBeCloseTo(
      (anchor?.bounds.x ?? 0) + (anchor?.bounds.width ?? 0) * 0.12,
    );
    expect(source?.bounds.y).toBeCloseTo(
      (anchor?.bounds.y ?? 0) + (anchor?.bounds.height ?? 0) * 0.1,
    );

    const sweep = getTechnicalAnimationScenario("fourCardSweep");
    const sweepPlan = planPublicEvents(sweep.events, { projections: sweep.projections });
    const sweepCapture = sweepPlan.clips.find(({ kind }) => kind === "capture");
    if (!sweepCapture) throw new Error("Missing sweep capture clip.");
    expect(sweepCapture.captureOverlap?.targetFieldCardId).toBe("march-red-text-scroll");
    expect(sweepCapture.affectedCardIds).toEqual([
      "march-curtain",
      "march-red-text-scroll",
      "march-cherry-plain-a",
      "march-cherry-plain-b",
    ]);
    const reduced = computeAnimatedCardPlacements(layout, sweepCapture, 0.4, "reducedMotion");
    expect(reduced.find(({ cardId }) => cardId === "march-curtain")?.zone).toBe("playerBrights");
  });

  it("CHOREO-3FD-003/004 uses the same first-target overlap and collection order for Draw pairs", () => {
    const draw = getTechnicalAnimationScenario("drawReveal");
    const revealed = requiredProjection(draw.projections, 1);
    const sourceCardId = "august-pampas-plain-a";
    const targetFieldCardId = "may-iris-plain-a";
    const captured = createPresentationProjection(
      revealed.map((state) => {
        if (state.cardId === sourceCardId) {
          return Object.freeze({
            ...state,
            zone: "playerPlains" as const,
            slotId: "playerPlains:1",
            slotIndex: 1,
            zIndex: 1,
          });
        }
        if (state.cardId === targetFieldCardId) {
          return Object.freeze({
            ...state,
            zone: "playerPlains" as const,
            slotId: "playerPlains:2",
            slotIndex: 2,
            zIndex: 2,
          });
        }
        return state;
      }),
    );
    const events: readonly PublicGameEventV1[] = [
      {
        type: "captureStarted",
        actorId: "player-a",
        phase: "draw",
        sourceCardId,
        targetFieldCardIds: [targetFieldCardId],
        captureKind: "pair",
      },
      {
        type: "cardsCaptured",
        actorId: "player-a",
        phase: "draw",
        cardIds: [sourceCardId, targetFieldCardId],
        captureKind: "pair",
      },
    ];
    const plan = planPublicEvents(events, { projections: [revealed, revealed, captured] });
    const travel = plan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "travel",
    );
    const hold = plan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "alignment",
    );
    const capture = plan.clips.find(
      ({ eventType, kind }) => eventType === "cardsCaptured" && kind === "capture",
    );
    if (!travel || !hold || !capture) throw new Error("Missing Draw capture choreography clips.");
    expect(travel.captureOverlap?.targetFieldCardId).toBe(targetFieldCardId);
    expect(hold.captureOverlap).toEqual(travel.captureOverlap);
    expect(capture.captureOverlap).toEqual(travel.captureOverlap);
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const targetAtStart = computeAnimatedCardPlacements(layout, hold, 0, "normal").find(
      ({ cardId }) => cardId === targetFieldCardId,
    );
    const targetAtHold = computeAnimatedCardPlacements(layout, hold, 0.5, "normal").find(
      ({ cardId }) => cardId === targetFieldCardId,
    );
    const sourceAtHold = computeAnimatedCardPlacements(layout, hold, 0.5, "normal").find(
      ({ cardId }) => cardId === sourceCardId,
    );
    expect(targetAtHold?.bounds).toEqual(targetAtStart?.bounds);
    expect(sourceAtHold?.bounds.x).toBeGreaterThan(targetAtHold?.bounds.x ?? Infinity);
    expect(sourceAtHold?.bounds.y).toBeGreaterThan(targetAtHold?.bounds.y ?? Infinity);
  });

  it("CHOREO-3FD-005 keeps all sweep targets still and anchors on the first authoritative target", () => {
    const scenario = getTechnicalAnimationScenario("fourCardSweep");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const hold = plan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "alignment",
    );
    if (!hold) throw new Error("Missing sweep hold clip.");
    expect(hold.captureOverlap?.targetFieldCardId).toBe("march-red-text-scroll");
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const start = computeAnimatedCardPlacements(layout, hold, 0, "normal");
    const middle = computeAnimatedCardPlacements(layout, hold, 0.5, "normal");
    for (const targetCardId of [
      "march-red-text-scroll",
      "march-cherry-plain-a",
      "march-cherry-plain-b",
    ]) {
      expect(middle.find(({ cardId }) => cardId === targetCardId)?.bounds).toEqual(
        start.find(({ cardId }) => cardId === targetCardId)?.bounds,
      );
    }
  });

  it("DRAW-PHYSICAL-001/002 makes a card-back leave the pile top, arc into Reveal, then flip", () => {
    const scenario = getTechnicalAnimationScenario("drawReveal");
    const plan = planPublicEvents(scenario.events, { projections: scenario.projections });
    const draw = plan.clips.find(({ kind }) => kind === "draw");
    const flip = plan.clips.find(({ kind }) => kind === "flip");
    const pause = plan.clips.find(({ kind }) => kind === "revealPause");
    if (!draw || !flip || !pause) throw new Error("Draw choreography clips are missing.");

    const drawnCardId = draw.affectedCardIds[0];
    if (!drawnCardId) throw new Error("Draw choreography card is missing.");
    const layout = computeBoardLayout({ width: 390, height: 844 });
    const sourceState = draw.from.find(({ cardId }) => cardId === drawnCardId);
    if (!sourceState) throw new Error("Draw choreography source card is missing.");
    const topBounds = computeDrawPileTopBounds(layout, draw.from);
    const start = computeAnimatedCardPlacements(layout, draw, 0, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );
    const middle = computeAnimatedCardPlacements(layout, draw, 0.5, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );
    const end = computeAnimatedCardPlacements(layout, draw, 1, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );
    const flipStart = computeAnimatedCardPlacements(layout, flip, 0.49, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );
    const flipFinish = computeAnimatedCardPlacements(layout, flip, 0.5, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );
    const settled = computeAnimatedCardPlacements(layout, pause, 1, "normal").find(
      ({ cardId }) => cardId === drawnCardId,
    );

    expect(sourceState.zone).toBe("drawPile");
    expect(sourceState.faceUp).toBe(false);
    expect(draw.affectedCardIds).toEqual([drawnCardId]);
    expect(start).toMatchObject({
      bounds: topBounds,
      faceUp: false,
      layer: "EffectsLayer",
      zone: "transit",
    });
    expect(middle?.bounds.y).toBeLessThan(Math.max(topBounds.y, end?.bounds.y ?? topBounds.y));
    expect(flipStart?.faceUp).toBe(false);
    expect(flipFinish?.faceUp).toBe(true);
    expect(settled).toMatchObject({
      bounds: layout.slots.reveal,
      faceUp: true,
      layer: "RevealLayer",
      zone: "reveal",
    });
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

  it("SHELL-3FA-004 defers an operating-system motion preference change until active motion settles", async () => {
    const scenario = getTechnicalAnimationScenario("drawReveal");
    const recording = recordingSurface(requiredProjection(scenario.projections, 0));
    const director = createAnimationDirector({
      initialProjection: requiredProjection(scenario.projections, 0),
      mode: "normal",
      surface: recording.surface,
    });
    const completion = director.play(scenario.events, { projections: scenario.projections });
    director.advanceBy(100);

    expect(() => director.setMode("reducedMotion")).not.toThrow();
    expect(director.inspect().mode).toBe("normal");

    director.advanceBy(20_000);
    expect(await completion).toBe("completed");
    expect(director.inspect()).toMatchObject({ mode: "reducedMotion", queuedPlanCount: 0 });
    expect(fingerprintProjection(recording.current())).toBe(
      fingerprintProjection(requiredProjection(scenario.projections, -1)),
    );
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
