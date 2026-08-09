import {
  CARD_IDS,
  getCardDefinition,
  startMatchFromOrderedDeck,
  validateInitialSetupState,
  type CompleteMonthEvidence,
  type LuckyHandEvidence,
  type RoundResultV1,
  type SetupEventV1,
  type StartMatchCommandV1,
} from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  PHASE_1A_DEAL_FIXTURE_IDS,
  PHASE_1A_DEAL_FIXTURES,
  type Phase1ADealFixture,
} from "../src/rules/deal-fixtures";

function runFixture(fixture: Phase1ADealFixture) {
  const action = fixture.when[0];
  if (action === undefined) throw new Error(`${fixture.id}: missing setup action.`);
  const command: StartMatchCommandV1 = {
    type: "startMatch",
    commandId: action.commandId,
    matchId: fixture.given.matchId,
    expectedStateVersion: fixture.given.stateVersion,
    matchLength: fixture.given.matchLength,
    starterPolicy: { kind: "provided", playerId: action.starterId },
  };
  return startMatchFromOrderedDeck(command, action.orderedDeck, action.starterId);
}

function outcomeEvidenceMonths(result: RoundResultV1 | null): readonly number[] {
  if (result === null) return [];
  if (result.evidence?.kind === "fieldCancellation") {
    return result.evidence.completeFieldMonths.map((entry) => entry.month);
  }
  if (result.evidence?.kind !== "luckyHands") return [];
  return result.evidence.hands.flatMap((entry) =>
    entry.qualification.kind === "fourMonth"
      ? entry.qualification.completeMonths.map((group) => group.month)
      : entry.qualification.pairs.map((group) => group.month),
  );
}

function evidencePlayers(result: RoundResultV1 | null): readonly string[] {
  return result?.evidence?.kind === "luckyHands"
    ? result.evidence.hands.map((entry) => entry.playerId)
    : [];
}

function resultFromFixture(fixture: Phase1ADealFixture): RoundResultV1 | null {
  const phase = runFixture(fixture).state.phase;
  return phase.kind === "roundComplete" ? phase.result : null;
}

function audienceName(event: SetupEventV1): "public" | "private" | "serverOnly" {
  return event.audience.kind;
}

describe("Phase 1A deal fixture contract", () => {
  it("exports every locked Phase 1A deal vector exactly once", () => {
    expect(PHASE_1A_DEAL_FIXTURES.map((fixture) => fixture.id)).toEqual(PHASE_1A_DEAL_FIXTURE_IDS);
    expect(new Set(PHASE_1A_DEAL_FIXTURE_IDS).size).toBe(PHASE_1A_DEAL_FIXTURE_IDS.length);
  });

  it.each(PHASE_1A_DEAL_FIXTURES)("$id materializes 48 unique canonical cards", (fixture) => {
    const deck = fixture.when[0]?.orderedDeck ?? [];
    expect(deck).toHaveLength(48);
    expect(new Set(deck)).toEqual(new Set(CARD_IDS));
    expect(deck.every((cardId) => getCardDefinition(cardId) !== undefined)).toBe(true);
  });

  it.each(PHASE_1A_DEAL_FIXTURES)("$id executes the locked opening result", (fixture) => {
    const transition = runFixture(fixture);
    const result =
      transition.state.phase.kind === "roundComplete" ? transition.state.phase.result : null;
    const actualKind = result?.kind ?? "normal";
    const expected = fixture.then.state;
    expect(actualKind, fixture.id).toBe(expected.openingKind);
    expect(result?.reasonCode ?? null, fixture.id).toBe(expected.reasonCode);
    expect(result?.kind === "luckyWin" ? result.scorerId : null, fixture.id).toBe(
      expected.winnerId,
    );
    expect(result?.pointDeltas ?? { "player-a": 0, "player-b": 0 }, fixture.id).toEqual(
      expected.pointDeltas,
    );
    expect(outcomeEvidenceMonths(result), fixture.id).toEqual(expected.completeEvidenceMonths);
    expect(evidencePlayers(result), fixture.id).toEqual(expected.evidencePlayerIds);
    expect(validateInitialSetupState(transition.state), fixture.id).toEqual([]);
    expect(transition.state.round.starterId, fixture.id).toBe("player-a");
    expect(transition.state.stateVersion, fixture.id).toBe(1);
  });

  it.each(PHASE_1A_DEAL_FIXTURES)("$id emits the required semantic setup events", (fixture) => {
    const events = runFixture(fixture).events;
    for (const expectedEvent of fixture.then.events) {
      expect(
        events.some(
          (event) =>
            event.type === expectedEvent.type && audienceName(event) === expectedEvent.audience,
        ),
        `${fixture.id}: missing ${expectedEvent.audience} ${expectedEvent.type}`,
      ).toBe(true);
    }
    const result = resultFromFixture(fixture);
    const detectedCount = events.filter((event) => event.type === "luckyHandDetected").length;
    const expectedDetectedCount =
      result?.evidence?.kind === "luckyHands" ? result.evidence.hands.length : 0;
    expect(detectedCount, fixture.id).toBe(expectedDetectedCount);
  });

  it.each(PHASE_1A_DEAL_FIXTURES)(
    "$id keeps every undeclared card out of public setup events",
    (fixture) => {
      const { state, events } = runFixture(fixture);
      const revealIndex = events.findIndex((event) => event.type === "luckyHandEvidenceRevealed");
      const publicBeforeReveal = events
        .slice(0, revealIndex < 0 ? events.length : revealIndex)
        .filter((event) => event.audience.kind === "public");
      const hiddenCardIds = [
        ...state.players[0].hand,
        ...state.players[1].hand,
        ...state.round.drawPile,
      ];
      const serializedPublicEvents = JSON.stringify(publicBeforeReveal);
      for (const cardId of hiddenCardIds) {
        expect(
          serializedPublicEvents,
          `${fixture.id}: public event exposed ${cardId}`,
        ).not.toContain(cardId);
      }

      const handEvents = events.filter((event) => event.type === "initialHandDealt");
      expect(handEvents).toHaveLength(2);
      for (const event of handEvents) {
        expect(event.audience).toEqual({ kind: "private", playerId: event.playerId });
        const owner = state.players.find((player) => player.id === event.playerId);
        expect(event.cardIds).toEqual(owner?.hand);
      }
      expect(events.find((event) => event.type === "drawPileOrdered")?.audience).toEqual({
        kind: "serverOnly",
      });
    },
  );

  it("DEAL-003 returns before any lucky evaluation or evidence event", () => {
    const fixture = PHASE_1A_DEAL_FIXTURES.find((entry) => entry.id === "DEAL-003");
    if (fixture === undefined) throw new Error("DEAL-003 fixture missing.");
    const { state, events } = runFixture(fixture);
    expect(state.phase).toMatchObject({
      kind: "roundComplete",
      result: { kind: "fieldCancellation" },
    });
    expect(events.some((event) => event.type === "luckyHandDetected")).toBe(false);
    expect(events.some((event) => event.type === "luckyHandEvidenceRevealed")).toBe(false);
  });

  it.each(PHASE_1A_DEAL_FIXTURES.filter((fixture) => fixture.then.visibility !== undefined))(
    "$id keeps lucky evidence private until the automatic result commits",
    (fixture) => {
      const events = runFixture(fixture).events;
      const commitIndex = events.findIndex(
        (event) => event.type === "automaticRoundResultCommitted",
      );
      expect(commitIndex, fixture.id).toBeGreaterThanOrEqual(0);
      const publicBeforeCommit = events
        .slice(0, commitIndex)
        .filter((event) => event.audience.kind === "public");
      expect(JSON.stringify(publicBeforeCommit), fixture.id).not.toMatch(
        /fullHand|qualification|luckyHand/iu,
      );
      const revealIndex = events.findIndex((event) => event.type === "luckyHandEvidenceRevealed");
      if (fixture.then.state.openingKind === "fieldCancellation") {
        expect(revealIndex, fixture.id).toBe(-1);
        return;
      }
      expect(revealIndex, fixture.id).toBeGreaterThan(commitIndex);
      const reveal = events[revealIndex];
      if (reveal?.type !== "luckyHandEvidenceRevealed") {
        throw new Error(`${fixture.id}: reveal event missing after commit.`);
      }
      expect(
        reveal.evidence.map((entry: LuckyHandEvidence) => entry.playerId),
        fixture.id,
      ).toEqual(fixture.then.visibility?.publicEvidencePlayerIdsAfterCommit);
    },
  );

  it("DEAL-010 awards only the lucky result and leaves capture/yaku state empty", () => {
    const fixture = PHASE_1A_DEAL_FIXTURES.find((entry) => entry.id === "DEAL-010");
    if (fixture === undefined) throw new Error("DEAL-010 fixture missing.");
    const { state } = runFixture(fixture);
    expect(state.phase).toMatchObject({
      kind: "roundComplete",
      result: { kind: "luckyWin", awardedPoints: 6, activeYaku: [] },
    });
    expect(state.players.map((player) => player.captured)).toEqual([[], []]);
    expect(state.players.map((player) => player.seenYakuKeys)).toEqual([[], []]);
  });

  it("DEAL-004 cancellation evidence retains both complete field groups in month order", () => {
    const fixture = PHASE_1A_DEAL_FIXTURES.find((entry) => entry.id === "DEAL-004");
    if (fixture === undefined) throw new Error("DEAL-004 fixture missing.");
    const result = resultFromFixture(fixture);
    if (result?.kind !== "fieldCancellation") throw new Error("DEAL-004 did not cancel.");
    if (result.evidence?.kind !== "fieldCancellation") {
      throw new Error("DEAL-004 cancellation evidence missing.");
    }
    expect(
      result.evidence.completeFieldMonths.map((group: CompleteMonthEvidence) => [
        group.month,
        group.cardIds.length,
      ]),
    ).toEqual([
      [1, 4],
      [2, 4],
    ]);
  });
});
