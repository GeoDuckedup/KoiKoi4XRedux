import type { PublicGameEventV1 } from "@koikoi4x/engine";

import { planPublicEvents } from "./event-planner";
import {
  createPresentationProjection,
  fingerprintProjection,
  projectionsEqual,
} from "./projection";
import { ANIMATION_MODES } from "./types";
import type {
  AnimationCompletion,
  AnimationDirectorV1,
  AnimationInspectionV1,
  AnimationMode,
  AnimationPlanningContextV1,
  AnimationSurfaceV1,
  PresentationAnimationPlanV1,
  PresentationBoardProjection,
} from "./types";

interface QueueEntry {
  readonly plan: PresentationAnimationPlanV1;
  readonly resolve: (completion: AnimationCompletion) => void;
}

const MODE_DURATION_FACTORS = Object.freeze({
  normal: 1,
  fast: 0.4,
  instant: 0,
  reducedMotion: 0.25,
} as const satisfies Readonly<Record<AnimationMode, number>>);

function assertDelta(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("Animation time must be a finite, non-negative number of milliseconds.");
  }
}

function assertMode(mode: AnimationMode): void {
  if (!ANIMATION_MODES.includes(mode)) throw new Error(`Unknown animation mode: ${mode}.`);
}

export function createAnimationDirector(input: {
  initialProjection: PresentationBoardProjection;
  mode: AnimationMode;
  surface: AnimationSurfaceV1;
}): AnimationDirectorV1 {
  assertMode(input.mode);
  let mode = input.mode;
  let displayProjection = createPresentationProjection(input.initialProjection);
  let targetProjection = displayProjection;
  let status: AnimationInspectionV1["status"] = "idle";
  let lastCompletion: AnimationCompletion | null = null;
  let clipIndex = 0;
  let clipElapsedMs = 0;
  let speedMultiplier = 1;
  let destroyed = false;
  const queue: QueueEntry[] = [];
  input.surface.snapTo(displayProjection);

  const activeEntry = (): QueueEntry | undefined => queue[0];

  const effectiveDuration = (durationMs: number): number =>
    Math.min(durationMs * MODE_DURATION_FACTORS[mode], mode === "reducedMotion" ? 100 : Infinity);

  const settleActiveClip = (): void => {
    const entry = activeEntry();
    const clip = entry?.plan.clips[clipIndex];
    if (!entry || !clip) return;
    input.surface.snapTo(clip.to);
    displayProjection = clip.to;
    clipIndex += 1;
    clipElapsedMs = 0;
  };

  const completeActivePlan = (completion: AnimationCompletion): void => {
    const entry = queue.shift();
    if (!entry) return;
    input.surface.snapTo(entry.plan.target);
    displayProjection = entry.plan.target;
    entry.resolve(completion);
    clipIndex = 0;
    clipElapsedMs = 0;
    speedMultiplier = 1;
    lastCompletion = completion;
    status = completion === "completed" ? "completed" : completion;
    const next = activeEntry();
    if (next) {
      status = "playing";
      targetProjection = queue.at(-1)?.plan.target ?? next.plan.target;
    } else {
      targetProjection = displayProjection;
    }
  };

  const drainZeroDurationWork = (): void => {
    while (activeEntry()) {
      const entry = activeEntry();
      if (!entry) break;
      const clip = entry.plan.clips[clipIndex];
      if (!clip) {
        completeActivePlan("completed");
        continue;
      }
      if (effectiveDuration(clip.durationMs) > 0) break;
      input.surface.renderClip(clip, 1, mode);
      settleActiveClip();
    }
  };

  const finishAll = (completion: AnimationCompletion): void => {
    while (activeEntry()) completeActivePlan(completion);
  };

  return {
    play: (events: readonly PublicGameEventV1[], context: AnimationPlanningContextV1) => {
      if (destroyed) return Promise.reject(new Error("The AnimationDirector has been destroyed."));
      const plan = planPublicEvents(events, context);
      const expectedSource = queue.at(-1)?.plan.target ?? displayProjection;
      if (!projectionsEqual(plan.source, expectedSource)) {
        return Promise.reject(
          new Error("A queued animation plan must start at the current target projection."),
        );
      }
      targetProjection = plan.target;
      status = "playing";
      lastCompletion = null;
      const completion = new Promise<AnimationCompletion>((resolve) => {
        queue.push({ plan, resolve });
      });
      drainZeroDurationWork();
      return completion;
    },
    advanceBy: (deltaMs) => {
      assertDelta(deltaMs);
      if (destroyed || !activeEntry()) return;
      let remainingMs = deltaMs * speedMultiplier;
      drainZeroDurationWork();
      while (activeEntry()) {
        const entry = activeEntry();
        if (!entry) break;
        const clip = entry.plan.clips[clipIndex];
        if (!clip) {
          completeActivePlan("completed");
          drainZeroDurationWork();
          continue;
        }
        const duration = effectiveDuration(clip.durationMs);
        if (duration === 0) {
          drainZeroDurationWork();
          continue;
        }
        const consumed = Math.min(remainingMs, duration - clipElapsedMs);
        clipElapsedMs += consumed;
        remainingMs -= consumed;
        input.surface.renderClip(clip, Math.min(1, clipElapsedMs / duration), mode);
        if (clipElapsedMs + Number.EPSILON < duration) break;
        settleActiveClip();
        if (clipIndex >= entry.plan.clips.length) completeActivePlan("completed");
        drainZeroDurationWork();
        if (remainingMs <= 0) break;
      }
    },
    accelerate: () => {
      if (destroyed || !activeEntry()) return;
      if (speedMultiplier > 1) {
        finishAll("finished");
      } else {
        speedMultiplier = 4;
      }
    },
    finishImmediately: async () => {
      if (!destroyed) finishAll("finished");
    },
    cancelAndSnapTo: async (projection) => {
      if (destroyed) return;
      const target = createPresentationProjection(projection);
      while (queue.length > 0) queue.shift()?.resolve("cancelled");
      input.surface.snapTo(target);
      displayProjection = target;
      targetProjection = target;
      clipIndex = 0;
      clipElapsedMs = 0;
      speedMultiplier = 1;
      lastCompletion = "cancelled";
      status = "cancelled";
    },
    setMode: (nextMode) => {
      assertMode(nextMode);
      if (activeEntry()) throw new Error("Animation mode can only change while the queue is idle.");
      mode = nextMode;
    },
    isBusy: () => activeEntry() !== undefined,
    inspect: () => {
      const entry = activeEntry();
      const clip = entry?.plan.clips[clipIndex];
      const duration = clip ? effectiveDuration(clip.durationMs) : 0;
      return Object.freeze({
        status: destroyed ? "destroyed" : status,
        mode,
        planId: entry?.plan.id ?? null,
        activeClip: clip
          ? Object.freeze({
              index: clipIndex,
              kind: clip.kind,
              eventType: clip.eventType,
              elapsedMs: clipElapsedMs,
              durationMs: duration,
              progress: duration === 0 ? 1 : clipElapsedMs / duration,
            })
          : null,
        queuedPlanCount: queue.length,
        queuedClipCount: queue.reduce(
          (count, candidate, index) =>
            count + candidate.plan.clips.length - (index === 0 ? clipIndex : 0),
          0,
        ),
        speedMultiplier,
        lastCompletion,
        displayFingerprint: fingerprintProjection(displayProjection),
        targetFingerprint: fingerprintProjection(targetProjection),
      });
    },
    destroy: () => {
      if (destroyed) return;
      while (queue.length > 0) queue.shift()?.resolve("cancelled");
      destroyed = true;
      status = "destroyed";
    },
  };
}
