import {
  CARD_IDS,
  RULES_VERSION,
  deepFreeze,
  type CardId,
  type LegalActionV1,
  type PlayerObservationV1,
  type PublicGameStateV1,
  type PublicPhaseV1,
} from "@koikoi4x/engine";

import { CARD_SHOWCASE_ASSIGNMENTS } from "../cards/showcase";
import type { CardPresentationState } from "../cards/types";
import { createPresentationProjection } from "../animation/projection";
import type { PresentationBoardProjection } from "../animation/types";
import type { InteractionSourceV1 } from "./types";

export const TECHNICAL_INPUT_FIXTURE_IDS = Object.freeze([
  "handPlay",
  "drawCapture",
  "yakuDecision",
  "opponentTurn",
] as const);
export type TechnicalInputFixtureId = (typeof TECHNICAL_INPUT_FIXTURE_IDS)[number];

export interface TechnicalInputFixtureV1 {
  readonly id: TechnicalInputFixtureId;
  readonly label: string;
  readonly description: string;
  readonly projection: PresentationBoardProjection;
  readonly source: InteractionSourceV1;
}

const HAND_CARD_IDS = Object.freeze([
  "march-curtain",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "august-geese",
  "march-cherry-plain-a",
  "april-wisteria-plain-b",
  "june-peony-plain-a",
] as const satisfies readonly CardId[]);

const HAND_FIELD_CARD_IDS = Object.freeze([
  "march-red-text-scroll",
  "april-red-scroll",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "may-iris-plain-a",
  "may-iris-plain-b",
  "june-blue-scroll",
  "july-red-scroll",
] as const satisfies readonly CardId[]);

const DRAW_FIELD_CARD_IDS = Object.freeze([
  "march-red-text-scroll",
  "april-red-scroll",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "may-iris-plain-a",
  "june-blue-scroll",
  "august-geese",
  "august-pampas-plain-b",
] as const satisfies readonly CardId[]);

function fixtureProjection(input: {
  hand: readonly CardId[];
  field: readonly CardId[];
  reveal?: CardId;
}): PresentationBoardProjection {
  const hand = new Set(input.hand);
  const field = new Set(input.field);
  const reserved = new Set<CardId>([...input.hand, ...input.field]);
  if (input.reveal) reserved.add(input.reveal);
  const zoneOrder = new Map<string, number>();
  const states = CARD_SHOWCASE_ASSIGNMENTS.map((state): CardPresentationState => {
    let zone = state.zone;
    let faceUp = state.faceUp;
    if (hand.has(state.cardId)) {
      zone = "playerHand";
      faceUp = true;
    } else if (field.has(state.cardId)) {
      zone = "field";
      faceUp = true;
    } else if (state.cardId === input.reveal) {
      zone = "reveal";
      faceUp = true;
    } else if (
      !reserved.has(state.cardId) &&
      (state.zone === "playerHand" || state.zone === "field" || state.zone === "reveal")
    ) {
      zone = "drawPile";
      faceUp = false;
    }
    const slotIndex = zoneOrder.get(zone) ?? 0;
    zoneOrder.set(zone, slotIndex + 1);
    return Object.freeze({
      ...state,
      zone,
      faceUp,
      slotIndex,
      slotId: `${zone}:${slotIndex}`,
      zIndex: slotIndex,
      selected: false,
      interactive: false,
    });
  });
  return createPresentationProjection(states);
}

function cardIdsInZones(
  projection: PresentationBoardProjection,
  zones: readonly CardPresentationState["zone"][],
): readonly CardId[] {
  const zoneSet = new Set(zones);
  return Object.freeze(
    projection.filter(({ zone }) => zoneSet.has(zone)).map(({ cardId }) => cardId),
  );
}

function publicState(input: {
  projection: PresentationBoardProjection;
  phase: PublicPhaseV1;
  stateVersion: number;
}): PublicGameStateV1 {
  return deepFreeze({
    formatVersion: 1,
    rulesVersion: RULES_VERSION,
    stateVersion: input.stateVersion,
    matchId: "technical-input-fixture",
    matchLength: 3,
    status: "inProgress",
    players: [
      {
        id: "player-a",
        score: 0,
        handCount: cardIdsInZones(input.projection, ["playerHand"]).length,
        captured: cardIdsInZones(input.projection, [
          "playerBrights",
          "playerAnimals",
          "playerScrolls",
          "playerPlains",
        ]),
        activeYaku: [],
        currentYakuTotal: 0,
      },
      {
        id: "player-b",
        score: 0,
        handCount: cardIdsInZones(input.projection, ["opponentHand"]).length,
        captured: cardIdsInZones(input.projection, [
          "opponentBrights",
          "opponentAnimals",
          "opponentScrolls",
          "opponentPlains",
        ]),
        activeYaku: [],
        currentYakuTotal: 0,
      },
    ],
    round: {
      roundNumber: 1,
      scheduledMonth: 1,
      isFinalScheduledRound: false,
      starterId: "player-a",
      field: cardIdsInZones(input.projection, ["field"]),
      drawPileCount: cardIdsInZones(input.projection, ["drawPile"]).length,
      tableMultiplier: 1,
      mostRecentKoiKoiCallerId: null,
      firstYakuTriggerPlayerId: null,
      specialPrivilege: null,
      frozenFinalRoundLeaderId: null,
    },
    phase: input.phase,
    history: [],
  });
}

function observation(input: {
  projection: PresentationBoardProjection;
  phase: PublicPhaseV1;
  legalActions: readonly LegalActionV1[];
  stateVersion: number;
}): PlayerObservationV1 {
  return deepFreeze({
    formatVersion: 1,
    playerId: "player-a",
    publicState: publicState(input),
    ownHand: cardIdsInZones(input.projection, ["playerHand"]),
    legalActions: input.legalActions,
  });
}

const handProjection = fixtureProjection({ hand: HAND_CARD_IDS, field: HAND_FIELD_CARD_IDS });
const drawProjection = fixtureProjection({
  hand: HAND_CARD_IDS.filter((cardId) => cardId !== "august-geese"),
  field: DRAW_FIELD_CARD_IDS,
  reveal: "august-pampas-plain-a",
});

const handLegalActions: readonly LegalActionV1[] = deepFreeze([
  { type: "playHandCard", actorId: "player-a", cardId: "march-curtain" },
  {
    type: "playHandCard",
    actorId: "player-a",
    cardId: "april-cuckoo",
    targetFieldCardId: "april-red-scroll",
  },
  {
    type: "playHandCard",
    actorId: "player-a",
    cardId: "april-cuckoo",
    targetFieldCardId: "april-wisteria-plain-a",
  },
  { type: "playHandCard", actorId: "player-a", cardId: "may-bridge" },
  { type: "playHandCard", actorId: "player-a", cardId: "june-butterfly" },
  { type: "playHandCard", actorId: "player-a", cardId: "august-geese" },
  { type: "playHandCard", actorId: "player-a", cardId: "march-cherry-plain-a" },
  {
    type: "playHandCard",
    actorId: "player-a",
    cardId: "april-wisteria-plain-b",
    targetFieldCardId: "april-red-scroll",
  },
  {
    type: "playHandCard",
    actorId: "player-a",
    cardId: "april-wisteria-plain-b",
    targetFieldCardId: "april-wisteria-plain-a",
  },
  { type: "playHandCard", actorId: "player-a", cardId: "june-peony-plain-a" },
]);

function buildFixture(id: TechnicalInputFixtureId, stateVersion: number): TechnicalInputFixtureV1 {
  if (id === "handPlay") {
    return deepFreeze({
      id,
      label: "Hand choices",
      description: "Guided/Fast hand selection with unique, two-target, sweep, and no-match cases.",
      projection: handProjection,
      source: {
        observation: observation({
          projection: handProjection,
          phase: { kind: "awaitingHandPlay", playerId: "player-a" },
          legalActions: handLegalActions,
          stateVersion,
        }),
        confirmationTargetCardIds: {
          "march-curtain": ["march-red-text-scroll"],
          "april-cuckoo": ["april-red-scroll", "april-wisteria-plain-a"],
          "may-bridge": ["may-red-scroll", "may-iris-plain-a", "may-iris-plain-b"],
          "june-butterfly": ["june-blue-scroll"],
          "august-geese": [],
          "march-cherry-plain-a": ["march-red-text-scroll"],
          "april-wisteria-plain-b": ["april-red-scroll", "april-wisteria-plain-a"],
          "june-peony-plain-a": ["june-blue-scroll"],
        },
      },
    });
  }
  if (id === "drawCapture") {
    const targets = ["august-geese", "august-pampas-plain-b"] as const;
    return deepFreeze({
      id,
      label: "Draw targets",
      description: "A public revealed draw with exactly two legal capture targets.",
      projection: drawProjection,
      source: {
        observation: observation({
          projection: drawProjection,
          phase: {
            kind: "awaitingDrawCapture",
            playerId: "player-a",
            drawnCardId: "august-pampas-plain-a",
            targetFieldCardIds: targets,
          },
          legalActions: targets.map((targetFieldCardId) => ({
            type: "chooseDrawCapture" as const,
            actorId: "player-a" as const,
            drawnCardId: "august-pampas-plain-a" as const,
            targetFieldCardId,
          })),
          stateVersion,
        }),
        confirmationTargetCardIds: {},
      },
    });
  }
  if (id === "yakuDecision") {
    return deepFreeze({
      id,
      label: "Yaku decision",
      description: "Cards lock while only the legal Bank and Koi-Koi intents remain available.",
      projection: handProjection,
      source: {
        observation: observation({
          projection: handProjection,
          phase: {
            kind: "awaitingYakuDecision",
            playerId: "player-a",
            context: {
              phase: "hand",
              newYaku: [{ key: "animals", name: "Animals", points: 5 }],
              activeYaku: [{ key: "animals", name: "Animals", points: 5 }],
              currentYakuTotal: 5,
              resume: { kind: "drawPhase" },
            },
          },
          legalActions: [
            {
              type: "chooseYakuDecision",
              actorId: "player-a",
              choice: "bank",
              tableMultiplierAtDecision: 1,
              scoringMultiplier: 1,
              awardedPoints: 5,
            },
            {
              type: "chooseYakuDecision",
              actorId: "player-a",
              choice: "koiKoi",
              currentTableMultiplier: 1,
              resultingTableMultiplier: 2,
            },
          ],
          stateVersion,
        }),
        confirmationTargetCardIds: {},
      },
    });
  }
  return deepFreeze({
    id,
    label: "Opponent locked",
    description: "The observing player has no legal controls during the opponent's turn.",
    projection: handProjection,
    source: {
      observation: observation({
        projection: handProjection,
        phase: { kind: "awaitingHandPlay", playerId: "player-b" },
        legalActions: [],
        stateVersion,
      }),
      confirmationTargetCardIds: {},
    },
  });
}

export function getTechnicalInputFixture(
  id: TechnicalInputFixtureId,
  stateVersion = 1,
): TechnicalInputFixtureV1 {
  if (!TECHNICAL_INPUT_FIXTURE_IDS.includes(id)) {
    throw new Error(`Unknown technical input fixture: ${id}.`);
  }
  if (!Number.isInteger(stateVersion) || stateVersion < 1) {
    throw new Error("Technical input fixture stateVersion must be a positive integer.");
  }
  return buildFixture(id, stateVersion);
}

export function assertTechnicalInputFixtureCompleteness(): void {
  for (const id of TECHNICAL_INPUT_FIXTURE_IDS) {
    const fixture = getTechnicalInputFixture(id);
    if (
      fixture.projection.length !== CARD_IDS.length ||
      new Set(fixture.projection.map(({ cardId }) => cardId)).size !== CARD_IDS.length
    ) {
      throw new Error(`${id} is not a complete technical input fixture.`);
    }
  }
}
