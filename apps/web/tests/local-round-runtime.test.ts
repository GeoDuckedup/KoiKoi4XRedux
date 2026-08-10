import { CARD_IDS, type LegalActionV1, type PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createLocalRoundRuntime } from "../src/game/local-round-runtime";
import {
  createInteractionSourceFromObservation,
  projectObservationToBoard,
  projectTransitionForPlayer,
} from "../src/game/observation-presentation";
import { formatTurnRecap } from "../src/game/turn-recap";
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
  if (action.type === "chooseDrawCapture") {
    return Object.freeze({
      ...base,
      action: Object.freeze({
        type: "chooseDrawCapture" as const,
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

    expect(observation.playerId).toBe("player-a");
    expect(observation.publicState.phase).toEqual({
      kind: "awaitingHandPlay",
      playerId: "player-a",
    });
    expect(projection).toHaveLength(48);
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
    expect(presentation.projections).toHaveLength(transition.events.length + 1);
    expect(presentation.projections[0]).toBe(presentation.source);
    expect(presentation.projections.at(-1)).toBe(presentation.target);
    expect(formatTurnRecap(transition.events)).toContain("Player A played");
    expect(JSON.stringify(before)).toBe(beforeJson);
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
});
