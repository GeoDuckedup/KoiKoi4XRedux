import type { CardId } from "@koikoi4x/engine";

export const PHASE_1E_VECTOR_IDS = [
  "PROJ-LUCKY-BEFORE-COMMIT-HIDDEN",
  "PROJ-LUCKY-AFTER-COMMIT-REVEALED",
  "INV-ZONE-UNIQUENESS",
  "INV-CARD-COUNT-48",
  "INV-ACTIVE-PLAYER-ONLY",
  "INV-HAND-OWNERSHIP",
  "INV-CAPTURE-TARGET-LEGAL",
  "INV-OBSERVATION-NO-PRIVATE",
  "INV-SCORE-MULTIPLIER-RANGE",
  "INV-STATE-VERSION-ONCE",
  "INV-DETERMINISTIC-REPLAY",
] as const;

export type Phase1EVectorId = (typeof PHASE_1E_VECTOR_IDS)[number];

interface FixtureBase {
  readonly id: Phase1EVectorId;
  readonly ruleRefs: readonly string[];
  readonly description: string;
}

export type Phase1EVectorFixture =
  | (FixtureBase & {
      readonly kind: "luckyProjection";
      readonly given: { readonly dealFixtureId: "DEAL-005" };
      readonly then: {
        readonly beforeCommitPublicEventTypes: readonly string[];
        readonly hiddenBeforeCommitCardIds: readonly CardId[];
        readonly revealedPlayerId: "player-a";
        readonly revealedFullHand: readonly CardId[];
        readonly revealAfterCommit: true;
      };
    })
  | (FixtureBase & {
      readonly kind: "invariant";
      readonly then: Readonly<Record<string, string | number | boolean>>;
    })
  | (FixtureBase & {
      readonly kind: "rejection";
      readonly then: {
        readonly errorCode: "ACTOR_NOT_ACTIVE" | "HAND_CARD_NOT_OWNED" | "CAPTURE_TARGET_ILLEGAL";
        readonly stateVersionDelta: 0;
        readonly mutated: false;
      };
    })
  | (FixtureBase & {
      readonly kind: "replay";
      readonly given: {
        readonly seed: "0123456789abcdeffedcba9876543210";
        readonly matchLength: 3;
      };
      readonly then: {
        readonly replayVersion: 1;
        readonly canonicalizationVersion: 1;
        readonly hashAlgorithm: "sha256";
        readonly sameState: true;
        readonly sameEvents: true;
        readonly sameCheckpoint: true;
      };
    });

const LUCKY_FULL_HAND = [
  "april-cuckoo",
  "april-red-scroll",
  "april-wisteria-plain-a",
  "april-wisteria-plain-b",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "august-moon",
] as const satisfies readonly CardId[];

function freezeFixture<T extends Phase1EVectorFixture>(fixture: T): T {
  Object.freeze(fixture.ruleRefs);
  if ("given" in fixture) Object.freeze(fixture.given);
  for (const value of Object.values(fixture.then)) {
    if (Array.isArray(value)) Object.freeze(value);
  }
  Object.freeze(fixture.then);
  return Object.freeze(fixture);
}

export const PHASE_1E_VECTOR_FIXTURES: readonly Phase1EVectorFixture[] = Object.freeze([
  freezeFixture({
    id: "PROJ-LUCKY-BEFORE-COMMIT-HIDDEN",
    kind: "luckyProjection",
    ruleRefs: ["DESIGN-19.6", "R-003"],
    description: "Lucky identities remain hidden in the public event prefix before commit.",
    given: { dealFixtureId: "DEAL-005" },
    then: {
      beforeCommitPublicEventTypes: [
        "matchStarted",
        "starterSelected",
        "roundStarted",
        "cardsDealt",
      ],
      hiddenBeforeCommitCardIds: LUCKY_FULL_HAND,
      revealedPlayerId: "player-a",
      revealedFullHand: LUCKY_FULL_HAND,
      revealAfterCommit: true,
    },
  }),
  freezeFixture({
    id: "PROJ-LUCKY-AFTER-COMMIT-REVEALED",
    kind: "luckyProjection",
    ruleRefs: ["DESIGN-19.6", "R-003"],
    description: "Committed lucky evidence reveals exactly the qualifying full hand.",
    given: { dealFixtureId: "DEAL-005" },
    then: {
      beforeCommitPublicEventTypes: [
        "matchStarted",
        "starterSelected",
        "roundStarted",
        "cardsDealt",
      ],
      hiddenBeforeCommitCardIds: LUCKY_FULL_HAND,
      revealedPlayerId: "player-a",
      revealedFullHand: LUCKY_FULL_HAND,
      revealAfterCommit: true,
    },
  }),
  freezeFixture({
    id: "INV-ZONE-UNIQUENESS",
    kind: "invariant",
    ruleRefs: ["DESIGN-9.6"],
    description: "Every authoritative card belongs to one zone.",
    then: { duplicateCards: 0, missingCards: 0 },
  }),
  freezeFixture({
    id: "INV-CARD-COUNT-48",
    kind: "invariant",
    ruleRefs: ["DESIGN-9.6"],
    description: "Every authoritative state accounts for 48 cards.",
    then: { authoritativeCardCount: 48 },
  }),
  freezeFixture({
    id: "INV-ACTIVE-PLAYER-ONLY",
    kind: "rejection",
    ruleRefs: ["DESIGN-9.6"],
    description: "Out-of-turn commands reject without mutation.",
    then: { errorCode: "ACTOR_NOT_ACTIVE", stateVersionDelta: 0, mutated: false },
  }),
  freezeFixture({
    id: "INV-HAND-OWNERSHIP",
    kind: "rejection",
    ruleRefs: ["DESIGN-9.6"],
    description: "A player cannot play a card outside their hand.",
    then: { errorCode: "HAND_CARD_NOT_OWNED", stateVersionDelta: 0, mutated: false },
  }),
  freezeFixture({
    id: "INV-CAPTURE-TARGET-LEGAL",
    kind: "rejection",
    ruleRefs: ["DESIGN-9.6"],
    description: "An illegal same-month target rejects atomically.",
    then: { errorCode: "CAPTURE_TARGET_ILLEGAL", stateVersionDelta: 0, mutated: false },
  }),
  freezeFixture({
    id: "INV-OBSERVATION-NO-PRIVATE",
    kind: "invariant",
    ruleRefs: ["DESIGN-19.6", "DESIGN-24.7"],
    description: "Player/public projections exclude all forbidden hidden information.",
    then: {
      ownHandVisible: true,
      opponentHandVisible: false,
      drawOrderVisible: false,
      rngVisible: false,
      serverEventsVisible: false,
    },
  }),
  freezeFixture({
    id: "INV-SCORE-MULTIPLIER-RANGE",
    kind: "invariant",
    ruleRefs: ["DESIGN-9.6"],
    description: "Scores and multipliers remain in their legal domains.",
    then: { minimumScore: 0, minimumMultiplier: 1, maximumMultiplier: 4 },
  }),
  freezeFixture({
    id: "INV-STATE-VERSION-ONCE",
    kind: "invariant",
    ruleRefs: ["DESIGN-9.6"],
    description: "Accepted commands advance once and rejected commands do not.",
    then: { acceptedDelta: 1, rejectedDelta: 0 },
  }),
  freezeFixture({
    id: "INV-DETERMINISTIC-REPLAY",
    kind: "replay",
    ruleRefs: ["DESIGN-9.6", "DESIGN-23.6"],
    description: "The same seed and semantic commands reproduce exact hashes and transitions.",
    given: { seed: "0123456789abcdeffedcba9876543210", matchLength: 3 },
    then: {
      replayVersion: 1,
      canonicalizationVersion: 1,
      hashAlgorithm: "sha256",
      sameState: true,
      sameEvents: true,
      sameCheckpoint: true,
    },
  }),
]);

const PHASE_1E_VECTOR_FIXTURE_BY_ID = Object.freeze(
  Object.fromEntries(PHASE_1E_VECTOR_FIXTURES.map((fixture) => [fixture.id, fixture])),
) as Readonly<Record<Phase1EVectorId, Phase1EVectorFixture>>;

export function getPhase1EVectorFixture(id: Phase1EVectorId): Phase1EVectorFixture {
  return PHASE_1E_VECTOR_FIXTURE_BY_ID[id];
}
