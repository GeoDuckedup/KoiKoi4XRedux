import type { CardId, EnginePhaseV1, GameplayCommandV1, TurnEventV1 } from "@koikoi4x/engine";

import {
  buildExplicitOrderedDeck,
  type OrderedInitialDealAllocation,
} from "./deal-fixture-builder";

export const PHASE_1B_CAPTURE_FIXTURE_IDS = [
  "CAP-000",
  "CAP-001",
  "CAP-002A",
  "CAP-002B",
  "CAP-003",
  "CAP-DRAW-001",
  "CAP-DRAW-002",
  "CAP-DRAW-003",
] as const;

export type Phase1BCaptureFixtureId = (typeof PHASE_1B_CAPTURE_FIXTURE_IDS)[number];

export interface CaptureCheckpointExpectation {
  readonly stateVersion: number;
  readonly phase: EnginePhaseV1;
  readonly field: readonly CardId[];
  readonly playerACaptured: readonly CardId[];
  readonly playerBCaptured: readonly CardId[];
  readonly drawPileCount: number;
  readonly eventTypes: readonly TurnEventV1["type"][];
}

export interface Phase1BCaptureFixture {
  readonly id: Phase1BCaptureFixtureId;
  readonly description: string;
  readonly matchId: string;
  readonly orderedDeck: readonly CardId[];
  readonly commands: readonly GameplayCommandV1[];
  readonly checkpoints: readonly CaptureCheckpointExpectation[];
}

function deepFreezeFixture<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreezeFixture(nested);
    }
    Object.freeze(value);
  }
  return value;
}

const A0 = [
  "january-crane",
  "february-bush-warbler",
  "march-curtain",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "august-moon",
] as const satisfies readonly CardId[];

const B0 = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "april-red-scroll",
  "september-sake-cup",
  "october-deer",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];

const F0 = [
  "january-pine-plain-a",
  "february-plum-plain-a",
  "march-cherry-plain-a",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
  "august-geese",
] as const satisfies readonly CardId[];

const NO_MATCH_DRAW = [
  "november-swallow",
  "january-pine-plain-b",
  "february-plum-plain-b",
  "march-cherry-plain-b",
  "april-wisteria-plain-b",
  "may-iris-plain-a",
  "may-iris-plain-b",
  "june-peony-plain-a",
  "june-peony-plain-b",
  "july-bush-clover-plain-a",
  "july-bush-clover-plain-b",
  "august-pampas-plain-a",
  "august-pampas-plain-b",
  "september-blue-scroll",
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "october-blue-scroll",
  "october-maple-plain-a",
  "october-maple-plain-b",
  "november-red-scroll",
  "november-willow-plain",
  "december-paulownia-plain-a",
  "december-paulownia-plain-b",
  "december-paulownia-plain-c",
] as const satisfies readonly CardId[];

const JANUARY_DRAW = [
  "january-pine-plain-b",
  "february-plum-plain-b",
  "march-cherry-plain-b",
  "april-wisteria-plain-b",
  "may-iris-plain-a",
  "may-iris-plain-b",
  "june-peony-plain-a",
  "june-peony-plain-b",
  "july-bush-clover-plain-a",
  "july-bush-clover-plain-b",
  "august-pampas-plain-a",
  "august-pampas-plain-b",
  "september-blue-scroll",
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "october-blue-scroll",
  "october-maple-plain-a",
  "october-maple-plain-b",
  "november-swallow",
  "november-red-scroll",
  "november-willow-plain",
  "december-paulownia-plain-a",
  "december-paulownia-plain-b",
  "december-paulownia-plain-c",
] as const satisfies readonly CardId[];

const PLAY_THEN_PLACE_EVENTS = [
  "handCardPlayed",
  "cardPlacedOnField",
  "drawCardRevealed",
  "cardPlacedOnField",
  "turnCompleted",
] as const satisfies readonly TurnEventV1["type"][];

const HAND_CAPTURE_EVENTS = [
  "handCardPlayed",
  "captureStarted",
  "cardsCaptured",
  "drawCardRevealed",
  "cardPlacedOnField",
  "turnCompleted",
] as const satisfies readonly TurnEventV1["type"][];

function playCommand(
  id: Phase1BCaptureFixtureId,
  cardId: CardId,
  targetFieldCardId?: CardId,
): GameplayCommandV1 {
  return Object.freeze({
    type: "playHandCard",
    commandId: `play-${id.toLowerCase()}`,
    matchId: `fixture-${id.toLowerCase()}`,
    actorId: "player-a",
    expectedStateVersion: 1,
    cardId,
    ...(targetFieldCardId === undefined ? {} : { targetFieldCardId }),
  });
}

function defineFixture(
  id: Phase1BCaptureFixtureId,
  description: string,
  allocation: OrderedInitialDealAllocation,
  commands: readonly GameplayCommandV1[],
  checkpoints: readonly CaptureCheckpointExpectation[],
): Phase1BCaptureFixture {
  return deepFreezeFixture({
    id,
    description,
    matchId: `fixture-${id.toLowerCase()}`,
    orderedDeck: buildExplicitOrderedDeck(allocation),
    commands: [...commands],
    checkpoints: [...checkpoints],
  });
}

const CAP_000_A = [...A0.slice(0, 7), "december-phoenix"] as const;
const CAP_000_B = [...B0.slice(0, 7), "august-moon"] as const;
const CAP_000_FINAL_FIELD = [...F0, "december-phoenix", "november-swallow"] as const;

const TWO_MATCH_B = ["february-plum-plain-a", ...B0.slice(1)] as const satisfies readonly CardId[];
const TWO_MATCH_FIELD = [
  "january-pine-plain-a",
  "january-red-text-scroll",
  ...F0.slice(2),
] as const satisfies readonly CardId[];

const CAP_003_B = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "february-plum-plain-a",
  "september-sake-cup",
  "october-deer",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];
const CAP_003_FIELD = [
  "april-red-scroll",
  "april-wisteria-plain-a",
  "april-wisteria-plain-b",
  "january-pine-plain-a",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
  "august-geese",
] as const satisfies readonly CardId[];
const CAP_003_DRAW = [
  "november-swallow",
  "january-pine-plain-b",
  "february-plum-plain-b",
  "march-cherry-plain-a",
  "march-cherry-plain-b",
  "may-iris-plain-a",
  "may-iris-plain-b",
  "june-peony-plain-a",
  "june-peony-plain-b",
  "july-bush-clover-plain-a",
  "july-bush-clover-plain-b",
  "august-pampas-plain-a",
  "august-pampas-plain-b",
  "september-blue-scroll",
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "october-blue-scroll",
  "october-maple-plain-a",
  "october-maple-plain-b",
  "november-red-scroll",
  "november-willow-plain",
  "december-paulownia-plain-a",
  "december-paulownia-plain-b",
  "december-paulownia-plain-c",
] as const satisfies readonly CardId[];

const DRAW_TWO_A = [
  "january-crane",
  "february-bush-warbler",
  "march-curtain",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "december-phoenix",
] as const satisfies readonly CardId[];
const DRAW_TWO_B = [
  "february-plum-plain-a",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "april-red-scroll",
  "september-sake-cup",
  "october-deer",
  "november-rain",
  "august-moon",
] as const satisfies readonly CardId[];
const DRAW_TWO_FIELD = [
  "january-pine-plain-a",
  "january-red-text-scroll",
  "march-cherry-plain-a",
  "april-wisteria-plain-a",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
  "august-geese",
] as const satisfies readonly CardId[];

const DRAW_SWEEP_A = [
  "january-crane",
  "february-bush-warbler",
  "march-curtain",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "august-moon",
  "december-phoenix",
] as const satisfies readonly CardId[];
const DRAW_SWEEP_B = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "september-sake-cup",
  "october-deer",
  "november-rain",
  "may-iris-plain-a",
  "june-peony-plain-a",
] as const satisfies readonly CardId[];
const DRAW_SWEEP_FIELD = [
  "april-red-scroll",
  "april-wisteria-plain-a",
  "april-wisteria-plain-b",
  "january-pine-plain-a",
  "march-cherry-plain-a",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
] as const satisfies readonly CardId[];
const DRAW_SWEEP_PILE = [
  "april-cuckoo",
  "january-pine-plain-b",
  "february-plum-plain-a",
  "february-plum-plain-b",
  "march-cherry-plain-b",
  "may-iris-plain-b",
  "june-peony-plain-b",
  "july-bush-clover-plain-a",
  "july-bush-clover-plain-b",
  "august-geese",
  "august-pampas-plain-a",
  "august-pampas-plain-b",
  "september-blue-scroll",
  "september-chrysanthemum-plain-a",
  "september-chrysanthemum-plain-b",
  "october-blue-scroll",
  "october-maple-plain-a",
  "october-maple-plain-b",
  "november-swallow",
  "november-red-scroll",
  "november-willow-plain",
  "december-paulownia-plain-a",
  "december-paulownia-plain-b",
  "december-paulownia-plain-c",
] as const satisfies readonly CardId[];

const FINAL_B_PHASE = Object.freeze({ kind: "awaitingHandPlay", playerId: "player-b" } as const);

export const PHASE_1B_CAPTURE_FIXTURES: readonly Phase1BCaptureFixture[] = Object.freeze([
  defineFixture(
    "CAP-000",
    "A zero-match hand card and zero-match draw are placed on the field.",
    { playerAHand: CAP_000_A, playerBHand: CAP_000_B, field: F0, drawPile: NO_MATCH_DRAW },
    [playCommand("CAP-000", "december-phoenix")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: CAP_000_FINAL_FIELD,
        playerACaptured: [],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: PLAY_THEN_PLACE_EVENTS,
      },
    ],
  ),
  defineFixture(
    "CAP-001",
    "One matching field card captures the hand source and target as a pair.",
    { playerAHand: A0, playerBHand: B0, field: F0, drawPile: NO_MATCH_DRAW },
    [playCommand("CAP-001", "january-crane")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: [...F0.slice(1), "november-swallow"],
        playerACaptured: ["january-crane", "january-pine-plain-a"],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: HAND_CAPTURE_EVENTS,
      },
    ],
  ),
  defineFixture(
    "CAP-002A",
    "The first of two legal hand targets is captured and the second remains.",
    { playerAHand: A0, playerBHand: TWO_MATCH_B, field: TWO_MATCH_FIELD, drawPile: NO_MATCH_DRAW },
    [playCommand("CAP-002A", "january-crane", "january-pine-plain-a")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: ["january-red-text-scroll", ...F0.slice(2), "november-swallow"],
        playerACaptured: ["january-crane", "january-pine-plain-a"],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: HAND_CAPTURE_EVENTS,
      },
    ],
  ),
  defineFixture(
    "CAP-002B",
    "The second of two legal hand targets is captured and the first remains.",
    { playerAHand: A0, playerBHand: TWO_MATCH_B, field: TWO_MATCH_FIELD, drawPile: NO_MATCH_DRAW },
    [playCommand("CAP-002B", "january-crane", "january-red-text-scroll")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: ["january-pine-plain-a", ...F0.slice(2), "november-swallow"],
        playerACaptured: ["january-crane", "january-red-text-scroll"],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: HAND_CAPTURE_EVENTS,
      },
    ],
  ),
  defineFixture(
    "CAP-003",
    "The played fourth April card sweeps all three field matches.",
    { playerAHand: A0, playerBHand: CAP_003_B, field: CAP_003_FIELD, drawPile: CAP_003_DRAW },
    [playCommand("CAP-003", "april-cuckoo")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: [...CAP_003_FIELD.slice(3), "november-swallow"],
        playerACaptured: [
          "april-cuckoo",
          "april-red-scroll",
          "april-wisteria-plain-a",
          "april-wisteria-plain-b",
        ],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: HAND_CAPTURE_EVENTS,
      },
    ],
  ),
  defineFixture(
    "CAP-DRAW-001",
    "A drawn card with one field match captures that pair before turn completion.",
    { playerAHand: CAP_000_A, playerBHand: CAP_000_B, field: F0, drawPile: JANUARY_DRAW },
    [playCommand("CAP-DRAW-001", "december-phoenix")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: [...F0.slice(1), "december-phoenix"],
        playerACaptured: ["january-pine-plain-b", "january-pine-plain-a"],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: [
          "handCardPlayed",
          "cardPlacedOnField",
          "drawCardRevealed",
          "captureStarted",
          "cardsCaptured",
          "turnCompleted",
        ],
      },
    ],
  ),
  defineFixture(
    "CAP-DRAW-002",
    "A two-match draw pauses for one explicit target before completing the turn.",
    {
      playerAHand: DRAW_TWO_A,
      playerBHand: DRAW_TWO_B,
      field: DRAW_TWO_FIELD,
      drawPile: JANUARY_DRAW,
    },
    [
      playCommand("CAP-DRAW-002", "december-phoenix"),
      {
        type: "chooseDrawCapture",
        commandId: "choose-cap-draw-002",
        matchId: "fixture-cap-draw-002",
        actorId: "player-a",
        expectedStateVersion: 2,
        targetFieldCardId: "january-pine-plain-a",
      },
    ],
    [
      {
        stateVersion: 2,
        phase: {
          kind: "awaitingDrawCapture",
          playerId: "player-a",
          drawnCardId: "january-pine-plain-b",
          targetFieldCardIds: ["january-pine-plain-a", "january-red-text-scroll"],
        },
        field: [...DRAW_TWO_FIELD, "december-phoenix"],
        playerACaptured: [],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: [
          "handCardPlayed",
          "cardPlacedOnField",
          "drawCardRevealed",
          "drawCaptureChoiceRequired",
        ],
      },
      {
        stateVersion: 3,
        phase: FINAL_B_PHASE,
        field: ["january-red-text-scroll", ...DRAW_TWO_FIELD.slice(2), "december-phoenix"],
        playerACaptured: ["january-pine-plain-b", "january-pine-plain-a"],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: ["captureStarted", "cardsCaptured", "turnCompleted"],
      },
    ],
  ),
  defineFixture(
    "CAP-DRAW-003",
    "The drawn fourth April card sweeps all three field matches.",
    {
      playerAHand: DRAW_SWEEP_A,
      playerBHand: DRAW_SWEEP_B,
      field: DRAW_SWEEP_FIELD,
      drawPile: DRAW_SWEEP_PILE,
    },
    [playCommand("CAP-DRAW-003", "december-phoenix")],
    [
      {
        stateVersion: 2,
        phase: FINAL_B_PHASE,
        field: [...DRAW_SWEEP_FIELD.slice(3), "december-phoenix"],
        playerACaptured: [
          "april-cuckoo",
          "april-red-scroll",
          "april-wisteria-plain-a",
          "april-wisteria-plain-b",
        ],
        playerBCaptured: [],
        drawPileCount: 23,
        eventTypes: [
          "handCardPlayed",
          "cardPlacedOnField",
          "drawCardRevealed",
          "captureStarted",
          "cardsCaptured",
          "turnCompleted",
        ],
      },
    ],
  ),
]);
