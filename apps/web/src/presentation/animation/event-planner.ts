import type { CardId, PublicGameEventV1 } from "@koikoi4x/engine";

import { changedCardIds, createPresentationProjection } from "./projection";
import type {
  AnimationClipKind,
  AnimationClipV1,
  AnimationPlanningContextV1,
  PresentationAnimationPlanV1,
  PresentationBoardProjection,
} from "./types";

const NORMAL_DURATIONS = Object.freeze({
  selection: 120,
  travel: 280,
  alignment: 180,
  capture: 320,
  reflow: 200,
  draw: 260,
  flip: 220,
  revealPause: 400,
  feedback: 600,
} as const satisfies Readonly<Record<AnimationClipKind, number>>);

function eventCardIds(event: PublicGameEventV1): readonly CardId[] {
  switch (event.type) {
    case "handCardPlayed":
    case "cardPlacedOnField":
    case "drawCardRevealed":
      return Object.freeze([event.cardId]);
    case "captureStarted":
      return Object.freeze([event.sourceCardId, ...event.targetFieldCardIds]);
    case "cardsCaptured":
      return Object.freeze([...event.cardIds]);
    case "drawResolutionRequired":
      return Object.freeze([event.drawnCardId, ...event.resolution.matchingFieldCardIds]);
    case "cardsDealt":
      return Object.freeze([...event.field]);
    case "initialFieldCancellationDetected":
      return Object.freeze(event.completeFieldMonths.flatMap(({ cardIds }) => cardIds));
    case "luckyHandEvidenceRevealed":
      return Object.freeze(event.evidence.flatMap(({ fullHand }) => fullHand));
    default:
      return Object.freeze([]);
  }
}

interface ClipSpec {
  readonly eventCardsOnly?: boolean;
  readonly kind: AnimationClipKind;
  readonly settlesBoundary: boolean;
}

function isLaterCombinedFeedback(
  event: PublicGameEventV1,
  nextEvent: PublicGameEventV1 | undefined,
): boolean {
  if (!nextEvent) return false;
  if (event.type === "yakuCompleted" || event.type === "yakuValueChanged") {
    return (
      nextEvent.type === "yakuCompleted" ||
      nextEvent.type === "yakuValueChanged" ||
      nextEvent.type === "yakuDecisionRequired"
    );
  }
  if (event.type === "yakuDecisionChosen") {
    return nextEvent.type === "koiKoiCalled" || nextEvent.type === "roundResultCommitted";
  }
  return false;
}

function clipSpecs(event: PublicGameEventV1, hasProjectionChange: boolean): readonly ClipSpec[] {
  switch (event.type) {
    case "handCardPlayed":
      return Object.freeze([
        { kind: "selection", settlesBoundary: false, eventCardsOnly: true },
        { kind: "travel", settlesBoundary: true },
      ]);
    case "cardPlacedOnField":
      return Object.freeze([
        { kind: "travel", settlesBoundary: true },
        { kind: "reflow", settlesBoundary: true },
      ]);
    case "captureStarted":
      return Object.freeze([{ kind: "alignment", settlesBoundary: true }]);
    case "cardsCaptured":
      return Object.freeze([
        { kind: "capture", settlesBoundary: true },
        { kind: "reflow", settlesBoundary: true },
      ]);
    case "drawCardRevealed":
      throw new Error("Draw-reveal clips use the dedicated flip boundary planner.");
    case "drawResolutionRequired":
      return Object.freeze([{ kind: "alignment", settlesBoundary: true }]);
    case "cardsDealt":
    case "roundReady":
      return Object.freeze([
        { kind: hasProjectionChange ? "reflow" : "feedback", settlesBoundary: true },
      ]);
    case "yakuCompleted":
    case "yakuValueChanged":
    case "yakuDecisionRequired":
    case "yakuDecisionChosen":
    case "koiKoiCalled":
    case "roundResultCommitted":
    case "roundTransitionPrepared":
    case "matchCompleted":
    case "initialFieldCancellationDetected":
    case "automaticRoundResultCommitted":
    case "luckyHandEvidenceRevealed":
      return Object.freeze([{ kind: "feedback", settlesBoundary: true }]);
    default:
      return Object.freeze([
        { kind: hasProjectionChange ? "reflow" : "feedback", settlesBoundary: true },
      ]);
  }
}

function makeClip(input: {
  affectedCardIds: readonly CardId[];
  event: PublicGameEventV1;
  eventIndex: number;
  from: PresentationBoardProjection;
  kind: AnimationClipKind;
  sequence: number;
  settlesProjection?: boolean;
  to: PresentationBoardProjection;
}): AnimationClipV1 {
  return Object.freeze({
    id: `event-${input.eventIndex}-${input.sequence}-${input.kind}`,
    eventIndex: input.eventIndex,
    eventType: input.event.type,
    kind: input.kind,
    durationMs: NORMAL_DURATIONS[input.kind],
    settlesProjection: input.settlesProjection ?? true,
    affectedCardIds: Object.freeze([...new Set(input.affectedCardIds)]),
    from: input.from,
    to: input.to,
  });
}

export function planPublicEvents(
  events: readonly PublicGameEventV1[],
  context: AnimationPlanningContextV1,
): PresentationAnimationPlanV1 {
  if (!Array.isArray(events)) throw new TypeError("Animation events must be an array.");
  if (context.projections.length !== events.length + 1) {
    throw new Error(
      "Animation planning requires one event-boundary projection per event plus one.",
    );
  }
  const projections = Object.freeze(context.projections.map(createPresentationProjection));
  const clips: AnimationClipV1[] = [];
  for (const [eventIndex, event] of events.entries()) {
    const before = projections[eventIndex];
    const after = projections[eventIndex + 1];
    if (!before || !after) throw new Error(`Missing projection boundary ${eventIndex}.`);
    const changed = changedCardIds(before, after);
    const directEventCardIds = eventCardIds(event);
    const affected = Object.freeze([...new Set([...directEventCardIds, ...changed])]);
    if (event.type === "cardPlacedOnField" || event.type === "cardsCaptured") {
      const direct = new Set(directEventCardIds);
      const reflowCardIds = Object.freeze(
        [...before, ...after]
          .filter(({ zone }) => zone === "field")
          .map(({ cardId }) => cardId)
          .filter((cardId, index, all) => !direct.has(cardId) && all.indexOf(cardId) === index),
      );
      clips.push(
        makeClip({
          affectedCardIds: directEventCardIds,
          event,
          eventIndex,
          from: before,
          kind: event.type === "cardPlacedOnField" ? "travel" : "capture",
          sequence: 0,
          settlesProjection: false,
          to: after,
        }),
        makeClip({
          affectedCardIds: reflowCardIds,
          event,
          eventIndex,
          from: before,
          kind: "reflow",
          sequence: 1,
          to: after,
        }),
      );
      continue;
    }
    if (event.type === "drawCardRevealed") {
      const intermediate = createPresentationProjection(
        after.map((state) =>
          state.cardId === event.cardId ? Object.freeze({ ...state, faceUp: false }) : state,
        ),
      );
      clips.push(
        makeClip({
          // Hidden card allocation may be normalized when the now-public card is swapped
          // into the synthetic pile source. Only the authoritative revealed card should
          // visibly leave the deck; the remaining card backs stay visually stable.
          affectedCardIds: directEventCardIds,
          event,
          eventIndex,
          from: before,
          kind: "draw",
          sequence: 0,
          to: intermediate,
        }),
        makeClip({
          affectedCardIds: directEventCardIds,
          event,
          eventIndex,
          from: intermediate,
          kind: "flip",
          sequence: 1,
          to: after,
        }),
        makeClip({
          affectedCardIds: directEventCardIds,
          event,
          eventIndex,
          from: after,
          kind: "revealPause",
          sequence: 2,
          to: after,
        }),
      );
      continue;
    }
    if (isLaterCombinedFeedback(event, events[eventIndex + 1])) continue;
    let current = before;
    for (const [sequence, spec] of clipSpecs(event, changed.length > 0).entries()) {
      const to = spec.settlesBoundary ? after : current;
      clips.push(
        makeClip({
          affectedCardIds: spec.eventCardsOnly ? directEventCardIds : affected,
          event,
          eventIndex,
          from: current,
          kind: spec.kind,
          sequence,
          to,
        }),
      );
      current = to;
    }
  }
  const source = projections[0];
  const target = projections.at(-1);
  if (!source || !target)
    throw new Error("An animation plan requires source and target projections.");
  return Object.freeze({
    id: `presentation-plan-v1:${events.map(({ type }) => type).join("+") || "settle"}`,
    eventCount: events.length,
    source,
    target,
    clips: Object.freeze(clips),
  });
}
