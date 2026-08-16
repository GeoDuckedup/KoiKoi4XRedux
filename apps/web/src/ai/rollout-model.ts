import {
  canonicalStringifyV1,
  evaluateYaku,
  getCardDefinition,
  resolveCapture,
  type CardId,
  type LegalActionV1,
  type PlayerObservationV1,
} from "@koikoi4x/engine";

import type { CpuPersonalityV1 } from "./types";
import type { CpuBeliefWorldV1 } from "./rollout-determinization";

export interface CpuAbstractRolloutResultV1 {
  readonly captureNodes: number;
  readonly utility: number;
}

interface AbstractStateV1 {
  field: CardId[];
  cpuCaptured: CardId[];
  opponentCaptured: CardId[];
  cpuHand: CardId[];
  opponentHand: CardId[];
  drawPile: CardId[];
}

const UTILITY_WEIGHTS: Readonly<
  Record<
    CpuPersonalityV1,
    Readonly<{
      captured: number;
      yaku: number;
      opponentCaptured: number;
      opponentYaku: number;
      potential: number;
    }>
  >
> = Object.freeze({
  timid: Object.freeze({
    captured: 5,
    yaku: 28,
    opponentCaptured: 6,
    opponentYaku: 24,
    potential: 1,
  }),
  monk: Object.freeze({
    captured: 4,
    yaku: 22,
    opponentCaptured: 5,
    opponentYaku: 20,
    potential: 4,
  }),
  gambler: Object.freeze({
    captured: 3,
    yaku: 18,
    opponentCaptured: 2,
    opponentYaku: 12,
    potential: 9,
  }),
});

function cardValue(cardId: CardId): number {
  const definition = getCardDefinition(cardId);
  return (
    (definition.category === "bright"
      ? 10
      : definition.category === "animal"
        ? 5
        : definition.category === "scroll"
          ? 3
          : 1) +
    definition.fixedYakuMemberships.length * 3
  );
}

function sourceCardId(action: LegalActionV1): CardId | undefined {
  return action.type === "playHandCard"
    ? action.cardId
    : action.type === "resolveDrawCard"
      ? action.drawnCardId
      : undefined;
}

function bestTarget(field: readonly CardId[], source: CardId): CardId | undefined {
  const month = getCardDefinition(source).month;
  const matching = field.filter((cardId) => getCardDefinition(cardId).month === month);
  if (matching.length !== 2) return undefined;
  return [...matching].sort(
    (left, right) => cardValue(right) - cardValue(left) || left.localeCompare(right),
  )[0];
}

function captureInto(state: AbstractStateV1, actor: "cpu" | "opponent", source: CardId): void {
  const target = bestTarget(state.field, source);
  const resolution = resolveCapture(state.field, source, target);
  if (resolution.kind === "choiceRequired") {
    throw new Error("CPU_ROLLOUT_CAPTURE_CHOICE_UNRESOLVED");
  }
  state.field = [...resolution.field];
  if (resolution.kind === "captured") {
    if (actor === "cpu") state.cpuCaptured.push(...resolution.capturedCardIds);
    else state.opponentCaptured.push(...resolution.capturedCardIds);
  }
}

function applyCandidate(state: AbstractStateV1, action: LegalActionV1): void {
  if (action.type === "chooseYakuDecision") return;
  const source = sourceCardId(action);
  if (source === undefined) throw new Error("CPU_ROLLOUT_SOURCE_MISSING");
  if (action.type === "playHandCard") {
    const index = state.cpuHand.indexOf(source);
    if (index < 0) throw new Error("CPU_ROLLOUT_SOURCE_NOT_IN_HAND");
    state.cpuHand.splice(index, 1);
  }
  const resolution = resolveCapture(state.field, source, action.targetFieldCardId);
  if (resolution.kind === "choiceRequired") {
    throw new Error("CPU_ROLLOUT_OFFERED_ACTION_INCOMPLETE");
  }
  state.field = [...resolution.field];
  if (resolution.kind === "captured") state.cpuCaptured.push(...resolution.capturedCardIds);
}

function developingPotential(cards: readonly CardId[]): number {
  const fixed = cards.reduce(
    (total, cardId) => total + getCardDefinition(cardId).fixedYakuMemberships.length,
    0,
  );
  const valuableCategories = cards.filter((cardId) => {
    const category = getCardDefinition(cardId).category;
    return category === "bright" || category === "animal" || category === "scroll";
  }).length;
  return fixed * 3 + valuableCategories;
}

function stateUtility(
  state: AbstractStateV1,
  observation: PlayerObservationV1,
  personality: CpuPersonalityV1,
): number {
  const weights = UTILITY_WEIGHTS[personality];
  const month = observation.publicState.round.scheduledMonth;
  const cpuYaku = evaluateYaku(state.cpuCaptured, month).currentYakuTotal;
  const opponentYaku = evaluateYaku(state.opponentCaptured, month).currentYakuTotal;
  return (
    state.cpuCaptured.reduce((sum, cardId) => sum + cardValue(cardId), 0) * weights.captured +
    cpuYaku * weights.yaku -
    state.opponentCaptured.reduce((sum, cardId) => sum + cardValue(cardId), 0) *
      weights.opponentCaptured -
    opponentYaku * weights.opponentYaku +
    developingPotential([...state.cpuCaptured, ...state.cpuHand]) * weights.potential
  );
}

export type AbstractCaptureCursorV1 = "cpuDraw" | "opponentHand" | "opponentDraw" | "cpuHand";

export function abstractRolloutInitialCursor(
  action: LegalActionV1,
  observation: PlayerObservationV1,
): AbstractCaptureCursorV1 | null {
  if (action.type === "playHandCard") return "cpuDraw";
  if (action.type === "resolveDrawCard") return "opponentHand";
  if (action.choice === "bank") return null;
  if (observation.publicState.phase.kind !== "awaitingYakuDecision") return null;
  const resume = observation.publicState.phase.context.resume;
  if (resume.kind === "endOfPlay") return null;
  return resume.kind === "drawPhase" ? "cpuDraw" : "opponentHand";
}

function nextCursor(cursor: AbstractCaptureCursorV1): AbstractCaptureCursorV1 {
  if (cursor === "cpuDraw") return "opponentHand";
  if (cursor === "opponentHand") return "opponentDraw";
  if (cursor === "opponentDraw") return "cpuHand";
  return "cpuDraw";
}

/**
 * A deliberately abstract capture projection: it never creates commands or
 * claims to reproduce the engine state machine. It only applies canonical
 * capture and Yaku evaluation to sampled current-round card zones.
 */
export function evaluateAbstractRollout(
  observation: PlayerObservationV1,
  action: LegalActionV1,
  world: CpuBeliefWorldV1,
  personality: CpuPersonalityV1,
  depth: number,
): CpuAbstractRolloutResultV1 {
  const cpu = observation.publicState.players.find(({ id }) => id === observation.playerId);
  const opponent = observation.publicState.players.find(({ id }) => id !== observation.playerId);
  if (cpu === undefined || opponent === undefined) throw new Error("CPU_ROLLOUT_PLAYERS_MISSING");
  const state: AbstractStateV1 = {
    field: [...observation.publicState.round.field],
    cpuCaptured: [...cpu.captured],
    opponentCaptured: [...opponent.captured],
    cpuHand: [...observation.ownHand].sort(),
    opponentHand: [...world.opponentHand].sort(),
    drawPile: [...world.drawPile],
  };
  const baselineCpuYaku = cpu.currentYakuTotal;
  const baselineOpponentYaku = opponent.currentYakuTotal;
  applyCandidate(state, action);

  if (action.type === "chooseYakuDecision" && action.choice === "bank") {
    return {
      captureNodes: 0,
      utility: action.awardedPoints * 100 + stateUtility(state, observation, personality),
    };
  }

  let captureNodes = 0;
  let cursor = abstractRolloutInitialCursor(action, observation);
  const candidateCreatedYaku =
    evaluateYaku(state.cpuCaptured, observation.publicState.round.scheduledMonth).currentYakuTotal >
    baselineCpuYaku;
  for (let step = 0; step < depth && cursor !== null && !candidateCreatedYaku; step += 1) {
    const source =
      cursor === "cpuDraw" || cursor === "opponentDraw"
        ? state.drawPile.shift()
        : cursor === "opponentHand"
          ? state.opponentHand.shift()
          : state.cpuHand.shift();
    const actor = cursor === "opponentHand" || cursor === "opponentDraw" ? "opponent" : "cpu";
    cursor = nextCursor(cursor);
    if (source === undefined) continue;
    captureInto(state, actor, source);
    captureNodes += 1;
    const month = observation.publicState.round.scheduledMonth;
    if (
      evaluateYaku(state.cpuCaptured, month).currentYakuTotal > baselineCpuYaku ||
      evaluateYaku(state.opponentCaptured, month).currentYakuTotal > baselineOpponentYaku
    ) {
      break;
    }
  }

  const koiValue =
    action.type === "chooseYakuDecision" && action.choice === "koiKoi"
      ? action.resultingTableMultiplier * 12
      : 0;
  return {
    captureNodes,
    utility: stateUtility(state, observation, personality) + koiValue,
  };
}

export function canonicalRolloutActionKey(action: LegalActionV1): string {
  return canonicalStringifyV1(action);
}
