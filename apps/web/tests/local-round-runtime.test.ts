import { CARD_IDS, type LegalActionV1, type PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import {
  createFreshLocalMatchSeed,
  createLocalRoundRuntime,
  PHASE_3B_LOCAL_SEED,
  resolveFreshLocalMatchLength,
} from "../src/game/local-round-runtime";
import {
  createInteractionSourceFromObservation,
  projectObservationToBoard,
  projectTransitionForPlayer,
} from "../src/game/observation-presentation";
import { formatTurnRecap } from "../src/game/turn-recap";
import { computeBoardLayout } from "../src/presentation/board/board-layout";
import {
  computeCardPlacements,
  computeDrawPileTopBounds,
} from "../src/presentation/cards/card-layout";
import { computeAnimatedCardPlacements } from "../src/presentation/animation/card-animation-frame";
import { planPublicEvents } from "../src/presentation/animation/event-planner";
import { INSTALLED_DECKS } from "../src/presentation/deck/installed-decks";
import type { InputCommandIntentV1 } from "../src/presentation/input/types";

function intentFromAction(
  observation: PlayerObservationV1,
  action: LegalActionV1,
): InputCommandIntentV1 {
  const base = {
    formatVersion: 1 as const,
    matchId: observation.publicState.matchId,
    expectedStateVersion: observation.publicState.stateVersion,
    actorId: observation.playerId,
  };
  if (action.type === "playHandCard") {
    return Object.freeze({
      ...base,
      action: Object.freeze({
        type: "playHandCard" as const,
        cardId: action.cardId,
        ...(action.targetFieldCardId === undefined
          ? {}
          : { targetFieldCardId: action.targetFieldCardId }),
      }),
    });
  }
  if (action.type === "resolveDrawCard") {
    return Object.freeze({
      ...base,
      action: Object.freeze({
        type: "resolveDrawCard" as const,
        targetFieldCardId: action.targetFieldCardId,
      }),
    });
  }
  return Object.freeze({
    ...base,
    action: Object.freeze({
      type: "chooseYakuDecision" as const,
      choice: action.choice,
    }),
  });
}

function completeCurrentRound(runtime: ReturnType<typeof createLocalRoundRuntime>): void {
  let commandCount = 0;
  while (
    runtime.state.phase.kind !== "roundComplete" &&
    runtime.state.phase.kind !== "matchComplete"
  ) {
    const observation = runtime.observe();
    const action = observation.legalActions[0];
    if (!action) throw new Error(`No legal action in ${observation.publicState.phase.kind}.`);
    const transition = runtime.submit(intentFromAction(observation, action));
    commandCount += 1;
    if (transition.handoffPlayerId) runtime.switchViewer(transition.handoffPlayerId);
    if (commandCount > 64) throw new Error("LOCAL_MATCH_DRIVER_EXHAUSTED: round did not complete.");
  }
}

describe("Phase 3A local authoritative round", () => {
  it("LOCAL-001 installs the approved primary runtime descriptor first", () => {
    expect(INSTALLED_DECKS[0]).toEqual({
      id: "new-primary-deck",
      name: "Primary Deck",
      manifestPath: "decks/new-primary-deck/manifest.v1.json",
    });
  });

  it("LOCAL-002 projects the local deal without hidden face identities", () => {
    const runtime = createLocalRoundRuntime({ matchId: "phase3a-projection" });
    const observation = runtime.observe();
    const source = createInteractionSourceFromObservation(observation);
    const projection = projectObservationToBoard(observation);
    const projectedFieldOrder = projection
      .filter(({ zone }) => zone === "field")
      .sort((left, right) => left.slotIndex - right.slotIndex)
      .map(({ cardId }) => cardId);

    expect(observation.playerId).toBe("player-a");
    expect(observation.publicState.phase).toEqual({
      kind: "awaitingHandPlay",
      playerId: "player-a",
    });
    expect(projection).toHaveLength(48);
    expect(projectedFieldOrder).toEqual(observation.publicState.round.field);
    expect(new Set(projection.map(({ cardId }) => cardId))).toEqual(new Set(CARD_IDS));
    expect(
      projection.filter(({ zone }) => zone === "playerHand").every(({ faceUp }) => faceUp),
    ).toBe(true);
    expect(
      projection
        .filter(({ zone }) => zone === "opponentHand" || zone === "drawPile")
        .every(({ faceUp }) => !faceUp),
    ).toBe(true);
    expect(source.observation).toBe(observation);
    expect(JSON.stringify(source)).not.toContain("drawPileOrdered");
    expect(JSON.stringify(source)).not.toContain("commandId");
    expect(Object.isFrozen(projection)).toBe(true);
  });

  it.each([3, 6, 12] as const)(
    "PHASE-5A starts the configured %i-round local format",
    (matchLength) => {
      const runtime = createLocalRoundRuntime({
        matchId: `phase5a-format-${matchLength}`,
        matchLength,
      });

      expect(runtime.state.matchLength).toBe(matchLength);
      expect(runtime.observe().publicState.matchLength).toBe(matchLength);
      expect(runtime.state.round).toMatchObject({ roundNumber: 1, scheduledMonth: 1 });
    },
  );

  it("PHASE-5A preserves a completed format for rematch while fresh matches use the selected format", () => {
    expect(resolveFreshLocalMatchLength(6, 3)).toBe(3);
    expect(resolveFreshLocalMatchLength(12, 6)).toBe(6);
    expect(resolveFreshLocalMatchLength(6)).toBe(6);
  });

  it("PHASE-5A assigns fresh local matches distinct reproducible seeds and opening deals", () => {
    const firstSeed = createFreshLocalMatchSeed(1);
    const secondSeed = createFreshLocalMatchSeed(2);
    expect(firstSeed).toMatch(/^[0-9a-f]{32}$/u);
    expect(secondSeed).toMatch(/^[0-9a-f]{32}$/u);
    expect(firstSeed).not.toBe(PHASE_3B_LOCAL_SEED);
    expect(secondSeed).not.toBe(firstSeed);

    const first = createLocalRoundRuntime({
      matchId: "phase5a-fresh-seed-one",
      matchLength: 3,
      seed: firstSeed,
    });
    const repeatedFirst = createLocalRoundRuntime({
      matchId: "phase5a-fresh-seed-one-repeat",
      matchLength: 3,
      seed: firstSeed,
    });
    const second = createLocalRoundRuntime({
      matchId: "phase5a-fresh-seed-two",
      matchLength: 3,
      seed: secondSeed,
    });

    expect(first.observe().ownHand).toEqual(repeatedFirst.observe().ownHand);
    expect(first.state.round.field).toEqual(repeatedFirst.state.round.field);
    expect(second.observe().ownHand).not.toEqual(first.observe().ownHand);
    expect(second.state.round.field).not.toEqual(first.state.round.field);
  });

  it("LOCAL-003/004 executes Hand → Draw and creates exact event-boundary animation data", () => {
    const runtime = createLocalRoundRuntime({ matchId: "phase3a-turn" });
    const before = runtime.observe();
    const beforeJson = JSON.stringify(before);
    const beforeProjection = projectObservationToBoard(before);
    const action = before.legalActions[0];
    if (!action) throw new Error("The locked Phase 3A deal has no legal opening action.");

    const transition = runtime.submit(intentFromAction(before, action));
    const presentation = projectTransitionForPlayer({
      before: beforeProjection,
      events: transition.events,
      nextObservation: transition.after,
    });

    expect(transition.after.publicState.stateVersion).toBe(before.publicState.stateVersion + 1);
    expect(transition.events.some(({ type }) => type === "handCardPlayed")).toBe(true);
    expect(transition.events.some(({ type }) => type === "drawCardRevealed")).toBe(true);
    const draw = transition.events.find(
      (
        event,
      ): event is Extract<
        (typeof transition.events)[number],
        { readonly type: "drawCardRevealed" }
      > => event.type === "drawCardRevealed",
    );
    if (!draw) throw new Error("The Hand transition did not reveal a Draw card.");
    const drawSource = presentation.source.find(({ cardId }) => cardId === draw.cardId);
    if (!drawSource) throw new Error("The Draw card is absent from the source projection.");
    const highestDrawSlot = Math.max(
      ...presentation.source
        .filter(({ zone }) => zone === "drawPile")
        .map(({ slotIndex }) => slotIndex),
    );
    expect(drawSource).toMatchObject({ zone: "drawPile", faceUp: false });
    expect(drawSource.slotIndex).toBeLessThanOrEqual(highestDrawSlot);
    const drawLayout = computeBoardLayout({ width: 390, height: 844 });
    const drawPlan = planPublicEvents(transition.events, { projections: presentation.projections });
    const drawClip = drawPlan.clips.find(({ kind }) => kind === "draw");
    if (!drawClip) throw new Error("The Draw transition did not create a draw clip.");
    const drawFrame = computeAnimatedCardPlacements(drawLayout, drawClip, 0, "normal").find(
      ({ cardId }) => cardId === draw.cardId,
    );
    expect(drawFrame).toMatchObject({
      bounds: computeDrawPileTopBounds(drawLayout, presentation.source),
      faceUp: false,
      zone: "transit",
    });
    expect(presentation.projections).toHaveLength(transition.events.length + 1);
    expect(presentation.projections[0]).toBe(presentation.source);
    expect(presentation.projections.at(-1)).toBe(presentation.target);
    expect(formatTurnRecap(transition.events)).toContain("Player A played");
    expect(JSON.stringify(before)).toBe(beforeJson);
  });

  it("PHASE-3FD-REAL-RUNTIME anchors a Hand capture to its originally highlighted target", () => {
    const runtime = createLocalRoundRuntime({
      matchId: "phase3fd-january-pine-anchor",
      seed: "00000000000000000000000000000253",
    });
    const before = runtime.observe();
    const action = before.legalActions.find(
      (candidate): candidate is Extract<LegalActionV1, { type: "playHandCard" }> =>
        candidate.type === "playHandCard" &&
        candidate.cardId === "january-pine-plain-a" &&
        candidate.targetFieldCardId === "january-pine-plain-b",
    );
    if (!action) throw new Error("Locked opening should offer the January pine pair.");
    const beforeProjection = projectObservationToBoard(before);
    const transition = runtime.submit(intentFromAction(before, action));
    const presentation = projectTransitionForPlayer({
      before: beforeProjection,
      events: transition.events,
      nextObservation: transition.after,
    });
    const plan = planPublicEvents(transition.events, { projections: presentation.projections });
    const hold = plan.clips.find(
      ({ eventType, kind }) => eventType === "captureStarted" && kind === "alignment",
    );
    if (!hold) throw new Error("Hand capture did not create an overlap hold.");

    for (const viewport of [
      { width: 390, height: 844 },
      // The 390×844 browser capture has a 376×642 game-host content box after shell chrome.
      { width: 376, height: 642 },
    ]) {
      const layout = computeBoardLayout(viewport);
      const originalTarget = computeCardPlacements(layout, beforeProjection).find(
        ({ cardId }) => cardId === "january-pine-plain-b",
      );
      const holdFrame = computeAnimatedCardPlacements(layout, hold, 0.5, "normal");
      const source = holdFrame.find(({ cardId }) => cardId === "january-pine-plain-a");
      const target = holdFrame.find(({ cardId }) => cardId === "january-pine-plain-b");
      if (!originalTarget || !source || !target)
        throw new Error("Pine capture geometry is incomplete.");
      expect(source.bounds.x).toBeCloseTo(
        originalTarget.bounds.x + originalTarget.bounds.width * 0.12,
      );
      expect(source.bounds.y).toBeCloseTo(
        originalTarget.bounds.y + originalTarget.bounds.height * 0.1,
      );
      expect(target.bounds).toEqual(originalTarget.bounds);
    }
  });

  it("LOCAL-005/006/007/008 plays a complete captured, recapped, private-handoff round", () => {
    const runtime = createLocalRoundRuntime({ matchId: "phase3a-complete-round" });
    let commandCount = 0;
    let handoffCount = 0;
    let captureObserved = false;
    let drawObserved = false;
    let recapObserved = false;

    while (
      runtime.state.phase.kind !== "roundComplete" &&
      runtime.state.phase.kind !== "matchComplete" &&
      commandCount < 64
    ) {
      const observation = runtime.observe();
      const action = observation.legalActions[0];
      if (!action) throw new Error(`No legal action in ${observation.publicState.phase.kind}.`);
      const transition = runtime.submit(intentFromAction(observation, action));
      commandCount += 1;
      captureObserved ||= transition.events.some(({ type }) => type === "cardsCaptured");
      drawObserved ||= transition.events.some(({ type }) => type === "drawCardRevealed");
      recapObserved ||=
        formatTurnRecap(transition.events).includes("Turn complete") ||
        formatTurnRecap(transition.events).includes("Round complete");
      if (transition.handoffPlayerId) {
        const previousHand = new Set(transition.after.ownHand);
        const next = runtime.switchViewer(transition.handoffPlayerId);
        handoffCount += 1;
        expect(next.playerId).toBe(transition.handoffPlayerId);
        expect(next.ownHand.some((cardId) => previousHand.has(cardId))).toBe(false);
      }
    }

    expect(runtime.state.phase.kind).toBe("roundComplete");
    expect(runtime.state.history).toHaveLength(1);
    expect(commandCount).toBeGreaterThan(1);
    expect(handoffCount).toBeGreaterThan(0);
    expect(captureObserved).toBe(true);
    expect(drawObserved).toBe(true);
    expect(recapObserved).toBe(true);
    expect(runtime.checkpoint.matchId).toBe("phase3a-complete-round");
  });

  it("PHASE-5A advances a completed match checkpoint into the next scheduled round", () => {
    const runtime = createLocalRoundRuntime({
      matchId: "phase5a-advance-round",
      matchLength: 3,
    });
    while (runtime.state.phase.kind !== "roundComplete") {
      const current = runtime.observe();
      const action = current.legalActions[0];
      if (!action) throw new Error(`No legal action in ${current.publicState.phase.kind}.`);
      const transition = runtime.submit(intentFromAction(current, action));
      if (transition.handoffPlayerId) runtime.switchViewer(transition.handoffPlayerId);
    }

    const history = runtime.state.history;
    const checkpoint = runtime.checkpoint;
    const advanced = runtime.advanceRound();

    expect(advanced.before.publicState.phase.kind).toBe("roundComplete");
    expect(runtime.state.matchLength).toBe(3);
    expect(runtime.state.round).toMatchObject({ roundNumber: 2, scheduledMonth: 2 });
    expect(runtime.state.history).toEqual(history);
    expect(runtime.checkpoint.matchId).toBe(checkpoint.matchId);
    expect(runtime.checkpoint).not.toEqual(checkpoint);
    if (advanced.handoffPlayerId) {
      expect(advanced.after.playerId).not.toBe(advanced.handoffPlayerId);
      expect(runtime.switchViewer(advanced.handoffPlayerId).playerId).toBe(
        advanced.handoffPlayerId,
      );
    }
  });

  it.each([3, 6, 12] as const)(
    "PHASE-5A completes a real %i-round local match and a fresh runtime resets its match state",
    (matchLength) => {
      const runtime = createLocalRoundRuntime({
        matchId: `phase5a-full-match-${matchLength}`,
        matchLength,
      });
      let advances = 0;
      while (runtime.state.phase.kind !== "matchComplete") {
        completeCurrentRound(runtime);
        if (runtime.state.phase.kind === "roundComplete") {
          const transition = runtime.advanceRound();
          advances += 1;
          if (transition.handoffPlayerId) runtime.switchViewer(transition.handoffPlayerId);
        }
      }

      expect(runtime.state.status).toBe("complete");
      expect(runtime.state.round).toMatchObject({
        roundNumber: matchLength,
        scheduledMonth: matchLength,
        isFinalScheduledRound: true,
      });
      expect(runtime.state.history).toHaveLength(matchLength);
      expect(runtime.state.phase).toMatchObject({
        kind: "matchComplete",
        result: { matchLength, roundsPlayed: matchLength },
      });
      expect(advances).toBe(matchLength - 1);

      const fresh = createLocalRoundRuntime({
        matchId: `phase5a-fresh-match-${matchLength}`,
        matchLength,
      });
      expect(fresh.state).toMatchObject({
        matchLength,
        status: "inProgress",
        history: [],
        round: { roundNumber: 1, scheduledMonth: 1, isFinalScheduledRound: false },
      });
      expect(fresh.state.players.map(({ score }) => score)).toEqual([0, 0]);
    },
  );
});
