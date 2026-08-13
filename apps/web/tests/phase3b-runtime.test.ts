import type { LegalActionV1, PlayerObservationV1 } from "@koikoi4x/engine";
import { describe, expect, it } from "vitest";

import { createLocalRoundRuntime, PHASE_3B_LOCAL_SEED } from "../src/game/local-round-runtime";
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
    action: Object.freeze({ type: "chooseYakuDecision" as const, choice: action.choice }),
  });
}

function actionByChoice(
  observation: PlayerObservationV1,
  choice: "bank" | "koiKoi",
): LegalActionV1 {
  const action = observation.legalActions.find(
    (candidate) => candidate.type === "chooseYakuDecision" && candidate.choice === choice,
  );
  if (!action) throw new Error(`PRES_ACTION_MISSING: ${choice} is not legal.`);
  return action;
}

describe("Phase 3B deterministic local yaku decision seam", () => {
  it("PRES-KOI-002-CONTINUE-AND-RESUME reaches Hand Animals, resumes Draw, and later proves a combined final-Draw decision", () => {
    const runtime = createLocalRoundRuntime({ matchId: "phase3b-decision-trace" });
    expect(PHASE_3B_LOCAL_SEED).toBe("00000000000000000000000000000003");

    let steps = 0;
    let handDecision: PlayerObservationV1 | null = null;
    while (handDecision === null && steps < 32) {
      const observation = runtime.observe();
      if (observation.publicState.phase.kind === "awaitingYakuDecision") {
        throw new Error("PRES_UNEXPECTED_DECISION: expected Hand Animals as the first decision.");
      }
      const action = observation.legalActions[0];
      if (!action)
        throw new Error("PRES_ACTION_MISSING: deterministic trace stopped before Hand Animals.");
      const beforeVersion = observation.publicState.stateVersion;
      const transition = runtime.submit(intentFromAction(observation, action));
      expect(transition.after.publicState.stateVersion).toBe(beforeVersion + 1);
      steps += 1;
      if (transition.handoffPlayerId) runtime.switchViewer(transition.handoffPlayerId);
      if (
        transition.after.publicState.phase.kind === "awaitingYakuDecision" &&
        transition.after.publicState.phase.context.phase === "hand"
      ) {
        handDecision = transition.after;
      }
    }

    if (!handDecision || handDecision.publicState.phase.kind !== "awaitingYakuDecision") {
      throw new Error("PRES_HAND_ANIMALS_MISSING");
    }
    expect(handDecision.publicState.phase.context).toMatchObject({
      phase: "hand",
      newYaku: [{ key: "animals", name: "Animals", points: 3 }],
      currentYakuTotal: 3,
      resume: { kind: "drawPhase" },
    });
    expect(actionByChoice(handDecision, "bank")).toMatchObject({
      tableMultiplierAtDecision: 1,
      scoringMultiplier: 1,
      awardedPoints: 3,
    });
    expect(actionByChoice(handDecision, "koiKoi")).toMatchObject({
      currentTableMultiplier: 1,
      resultingTableMultiplier: 2,
    });

    const handKoi = runtime.submit(
      intentFromAction(handDecision, actionByChoice(handDecision, "koiKoi")),
    );
    expect(handKoi.after.publicState.stateVersion).toBe(handDecision.publicState.stateVersion + 1);
    const handKoiEventTypes = handKoi.events.map(({ type }) => type);
    expect(handKoiEventTypes).toEqual(
      expect.arrayContaining(["yakuDecisionChosen", "koiKoiCalled", "drawCardRevealed"]),
    );
    expect(handKoiEventTypes).toContain("drawResolutionRequired");
    expect(handKoiEventTypes).not.toContain("turnCompleted");
    const pendingDraw = runtime.observe();
    const pendingDrawAction = pendingDraw.legalActions[0];
    if (!pendingDrawAction) throw new Error("PRES_HAND_KOI_DRAW_RESOLUTION_MISSING");
    const resolvedDraw = runtime.submit(intentFromAction(pendingDraw, pendingDrawAction));
    const handKoiHandoffPlayerId = resolvedDraw.handoffPlayerId;
    expect(handKoiHandoffPlayerId).toBe("player-a");
    if (!handKoiHandoffPlayerId) throw new Error("PRES_HAND_KOI_HANDOFF_MISSING");
    runtime.switchViewer(handKoiHandoffPlayerId);

    let drawDecision: PlayerObservationV1 | null = null;
    while (drawDecision === null && steps < 64) {
      const observation = runtime.observe();
      if (observation.publicState.phase.kind === "awaitingYakuDecision") {
        const action = actionByChoice(observation, "koiKoi");
        const transition = runtime.submit(intentFromAction(observation, action));
        expect(transition.after.publicState.stateVersion).toBe(
          observation.publicState.stateVersion + 1,
        );
        steps += 1;
        continue;
      }
      const action = observation.legalActions[0];
      if (!action)
        throw new Error("PRES_ACTION_MISSING: deterministic trace stopped before Draw decision.");
      const transition = runtime.submit(intentFromAction(observation, action));
      expect(transition.after.publicState.stateVersion).toBe(
        observation.publicState.stateVersion + 1,
      );
      steps += 1;
      if (
        transition.after.publicState.phase.kind === "awaitingYakuDecision" &&
        transition.after.publicState.phase.context.phase === "draw"
      ) {
        drawDecision = transition.after;
      }
      if (transition.handoffPlayerId) runtime.switchViewer(transition.handoffPlayerId);
    }

    if (!drawDecision || drawDecision.publicState.phase.kind !== "awaitingYakuDecision") {
      throw new Error("PRES_DRAW_COMBINED_MISSING");
    }
    expect(drawDecision.publicState.phase.context).toMatchObject({
      phase: "draw",
      newYaku: [
        { key: "blueScrolls", name: "Blue Scrolls", points: 5 },
        { key: "scrolls", name: "Scrolls", points: 1 },
      ],
      currentYakuTotal: 11,
      resume: { kind: "endOfPlay", lastActorId: drawDecision.playerId },
    });
    expect(drawDecision.publicState.round.tableMultiplier).toBe(2);
    expect(actionByChoice(drawDecision, "bank")).toMatchObject({
      tableMultiplierAtDecision: 2,
      scoringMultiplier: 2,
      awardedPoints: 22,
    });
    expect(actionByChoice(drawDecision, "koiKoi")).toMatchObject({
      currentTableMultiplier: 2,
      resultingTableMultiplier: 3,
    });

    const observationJson = JSON.stringify(drawDecision);
    const opponentId = drawDecision.playerId === "player-a" ? "player-b" : "player-a";
    const hiddenOpponentHand =
      runtime.state.players.find(({ id }) => id === opponentId)?.hand ?? [];
    for (const hiddenCardId of [...hiddenOpponentHand, ...runtime.state.round.drawPile]) {
      expect(observationJson).not.toContain(hiddenCardId);
    }
    expect(observationJson).not.toContain("commandId");
  });
});
