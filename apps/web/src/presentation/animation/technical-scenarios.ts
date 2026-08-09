import { deepFreeze, type CardId, type PublicGameEventV1 } from "@koikoi4x/engine";

import { CARD_SHOWCASE_ASSIGNMENTS } from "../cards/showcase";
import type { CardPresentationState } from "../cards/types";
import { createPresentationProjection } from "./projection";
import type { PresentationBoardProjection } from "./types";

export const TECHNICAL_ANIMATION_SCENARIO_IDS = Object.freeze([
  "handToField",
  "pairCapture",
  "drawReveal",
  "fourCardSweep",
  "multiplierFeedback",
] as const);

export type TechnicalAnimationScenarioId = (typeof TECHNICAL_ANIMATION_SCENARIO_IDS)[number];

export interface TechnicalAnimationScenarioV1 {
  readonly description: string;
  readonly events: readonly PublicGameEventV1[];
  readonly id: TechnicalAnimationScenarioId;
  readonly label: string;
  readonly projections: readonly PresentationBoardProjection[];
}

type StatePatch = Partial<Omit<CardPresentationState, "cardId">>;

function transformProjection(
  source: PresentationBoardProjection,
  patches: Readonly<Partial<Record<CardId, StatePatch>>>,
): PresentationBoardProjection {
  const patched = source.map((state) => Object.freeze({ ...state, ...patches[state.cardId] }));
  const zoneOrder = new Map<string, number>();
  return createPresentationProjection(
    patched.map((state) => {
      if (state.zone === "transit") {
        return Object.freeze({
          ...state,
          slotId: `transit:${state.cardId}`,
          slotIndex: 0,
          zIndex: 1000,
        });
      }
      const slotIndex = zoneOrder.get(state.zone) ?? 0;
      zoneOrder.set(state.zone, slotIndex + 1);
      return Object.freeze({
        ...state,
        slotId: `${state.zone}:${slotIndex}`,
        slotIndex,
        zIndex: slotIndex,
      });
    }),
  );
}

function scenario(input: TechnicalAnimationScenarioV1): TechnicalAnimationScenarioV1 {
  return Object.freeze({
    ...input,
    events: deepFreeze(input.events.map((event) => ({ ...event }))),
    projections: Object.freeze(input.projections.map(createPresentationProjection)),
  });
}

const showcase = createPresentationProjection(CARD_SHOWCASE_ASSIGNMENTS);

const handInitial = transformProjection(showcase, {
  "june-peony-plain-b": { zone: "drawPile", faceUp: false },
});
const handTransit = transformProjection(handInitial, {
  "march-curtain": { zone: "transit", faceUp: true },
});
const handFinal = transformProjection(handTransit, {
  "march-curtain": { zone: "field", faceUp: true },
});

const captureInitial = transformProjection(showcase, {
  "april-wisteria-plain-a": { zone: "field", faceUp: true },
  "may-iris-plain-a": { zone: "playerHand", faceUp: true },
});
const captureTransit = transformProjection(captureInitial, {
  "april-cuckoo": { zone: "transit", faceUp: true },
});
const captureFinal = transformProjection(captureTransit, {
  "april-cuckoo": { zone: "playerAnimals", faceUp: true },
  "april-wisteria-plain-a": { zone: "playerPlains", faceUp: true },
});

const drawInitial = transformProjection(showcase, {
  "august-geese": { zone: "drawPile", faceUp: false },
  "june-peony-plain-b": { zone: "playerPlains", faceUp: true },
});
const drawRevealed = transformProjection(drawInitial, {
  "august-pampas-plain-a": { zone: "reveal", faceUp: true },
});
const drawFinal = transformProjection(drawRevealed, {
  "august-pampas-plain-a": { zone: "field", faceUp: true },
});

const sweepInitial = transformProjection(showcase, {
  "march-red-text-scroll": { zone: "field", faceUp: true },
  "march-cherry-plain-a": { zone: "field", faceUp: true },
  "march-cherry-plain-b": { zone: "field", faceUp: true },
  "may-bridge": { zone: "playerHand", faceUp: true },
  "may-red-scroll": { zone: "playerHand", faceUp: true },
  "may-iris-plain-a": { zone: "playerHand", faceUp: true },
});
const sweepTransit = transformProjection(sweepInitial, {
  "march-curtain": { zone: "transit", faceUp: true },
});
const sweepFinal = transformProjection(sweepTransit, {
  "march-curtain": { zone: "playerBrights", faceUp: true },
  "march-red-text-scroll": { zone: "playerScrolls", faceUp: true },
  "march-cherry-plain-a": { zone: "playerPlains", faceUp: true },
  "march-cherry-plain-b": { zone: "playerPlains", faceUp: true },
});

export const TECHNICAL_ANIMATION_SCENARIOS = Object.freeze({
  handToField: scenario({
    id: "handToField",
    label: "Hand → field",
    description: "Presentation-only no-match play path with stable CardViews.",
    events: [
      { type: "handCardPlayed", actorId: "player-a", cardId: "march-curtain" },
      {
        type: "cardPlacedOnField",
        actorId: "player-a",
        phase: "hand",
        cardId: "march-curtain",
      },
    ],
    projections: [handInitial, handTransit, handFinal],
  }),
  pairCapture: scenario({
    id: "pairCapture",
    label: "Pair capture",
    description: "Presentation-only play, target emphasis, capture cluster, and reflow.",
    events: [
      { type: "handCardPlayed", actorId: "player-a", cardId: "april-cuckoo" },
      {
        type: "captureStarted",
        actorId: "player-a",
        phase: "hand",
        sourceCardId: "april-cuckoo",
        targetFieldCardIds: ["april-wisteria-plain-a"],
        captureKind: "pair",
      },
      {
        type: "cardsCaptured",
        actorId: "player-a",
        phase: "hand",
        cardIds: ["april-cuckoo", "april-wisteria-plain-a"],
        captureKind: "pair",
      },
    ],
    projections: [captureInitial, captureTransit, captureTransit, captureFinal],
  }),
  drawReveal: scenario({
    id: "drawReveal",
    label: "Draw + reveal",
    description: "Presentation-only draw-back travel, flip, reveal pause, and field settle.",
    events: [
      {
        type: "drawCardRevealed",
        actorId: "player-a",
        cardId: "august-pampas-plain-a",
        remainingDrawPileCount: 15,
      },
      {
        type: "cardPlacedOnField",
        actorId: "player-a",
        phase: "draw",
        cardId: "august-pampas-plain-a",
      },
    ],
    projections: [drawInitial, drawRevealed, drawFinal],
  }),
  fourCardSweep: scenario({
    id: "fourCardSweep",
    label: "Four-card sweep",
    description: "Presentation-only three-target emphasis and four-card capture settlement.",
    events: [
      { type: "handCardPlayed", actorId: "player-a", cardId: "march-curtain" },
      {
        type: "captureStarted",
        actorId: "player-a",
        phase: "hand",
        sourceCardId: "march-curtain",
        targetFieldCardIds: [
          "march-red-text-scroll",
          "march-cherry-plain-a",
          "march-cherry-plain-b",
        ],
        captureKind: "fourCardSweep",
      },
      {
        type: "cardsCaptured",
        actorId: "player-a",
        phase: "hand",
        cardIds: [
          "march-curtain",
          "march-red-text-scroll",
          "march-cherry-plain-a",
          "march-cherry-plain-b",
        ],
        captureKind: "fourCardSweep",
      },
    ],
    projections: [sweepInitial, sweepTransit, sweepTransit, sweepFinal],
  }),
  multiplierFeedback: scenario({
    id: "multiplierFeedback",
    label: "Koi-Koi feedback",
    description: "Presentation-only semantic feedback with no board mutation.",
    events: [
      {
        type: "koiKoiCalled",
        actorId: "player-a",
        previousTableMultiplier: 1,
        currentTableMultiplier: 2,
        privilegeUsed: false,
      },
    ],
    projections: [showcase, showcase],
  }),
} as const satisfies Readonly<Record<TechnicalAnimationScenarioId, TechnicalAnimationScenarioV1>>);

export function getTechnicalAnimationScenario(
  scenarioId: TechnicalAnimationScenarioId,
): TechnicalAnimationScenarioV1 {
  return TECHNICAL_ANIMATION_SCENARIOS[scenarioId];
}
