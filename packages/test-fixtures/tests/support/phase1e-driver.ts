import {
  advanceRound,
  applyGameplayCommand,
  createAuthoritativeRuntime,
  createSeededRandomSource,
  executeIdempotentCommand,
  getLegalActions,
  startMatch,
  type AdvanceRoundCommandV1,
  type AuthoritativeGameStateV1,
  type AuthoritativeRuntimeV1,
  type EngineCheckpointV1,
  type EngineEventV1,
  type GameplayCommandV1,
  type LegalActionV1,
  type MatchLength,
  type PlayerId,
  type RandomSource,
  type ReplayCommandV1,
  type StartMatchCommandV1,
} from "@koikoi4x/engine";

export interface DirectMatchTrace {
  readonly state: AuthoritativeGameStateV1;
  readonly checkpoint: EngineCheckpointV1;
  readonly commands: readonly ReplayCommandV1[];
  readonly eventBatches: readonly (readonly EngineEventV1[])[];
}

function activePlayer(state: AuthoritativeGameStateV1): PlayerId {
  if (
    state.phase.kind !== "awaitingHandPlay" &&
    state.phase.kind !== "awaitingDrawCapture" &&
    state.phase.kind !== "awaitingYakuDecision"
  ) {
    throw new Error(`No active player in ${state.phase.kind}.`);
  }
  return state.phase.playerId;
}

function actionToCommand(
  state: AuthoritativeGameStateV1,
  action: LegalActionV1,
  commandId: string,
): GameplayCommandV1 {
  if (action.type === "playHandCard") {
    return {
      type: "playHandCard",
      commandId,
      matchId: state.matchId,
      actorId: action.actorId,
      expectedStateVersion: state.stateVersion,
      cardId: action.cardId,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    };
  }
  if (action.type === "chooseDrawCapture") {
    return {
      type: "chooseDrawCapture",
      commandId,
      matchId: state.matchId,
      actorId: action.actorId,
      expectedStateVersion: state.stateVersion,
      targetFieldCardId: action.targetFieldCardId,
    };
  }
  return {
    type: "chooseYakuDecision",
    commandId,
    matchId: state.matchId,
    actorId: action.actorId,
    expectedStateVersion: state.stateVersion,
    choice: action.choice,
  };
}

function nextCommand(
  state: AuthoritativeGameStateV1,
  sequence: number,
  policy: RandomSource,
): GameplayCommandV1 | AdvanceRoundCommandV1 {
  const commandId = `${state.matchId}-command-${sequence}`;
  if (state.phase.kind === "roundComplete") {
    return {
      type: "advanceRound",
      commandId,
      matchId: state.matchId,
      expectedStateVersion: state.stateVersion,
    };
  }
  const actorId = activePlayer(state);
  const actions = getLegalActions(state, actorId);
  if (actions.length === 0) throw new Error(`No legal action in ${state.phase.kind}.`);
  const action = actions[policy.nextInt(actions.length)];
  if (action === undefined) throw new Error("Policy selected a missing action.");
  return actionToCommand(state, action, commandId);
}

function policySeed(seed: string): string {
  return seed.split("").reverse().join("");
}

function startCommand(matchId: string, matchLength: MatchLength): StartMatchCommandV1 {
  return {
    type: "startMatch",
    commandId: `${matchId}-command-1`,
    matchId,
    expectedStateVersion: 0,
    matchLength,
    starterPolicy: { kind: "chooseWithRng" },
  };
}

export function runRecordedMatch(seed: string, matchLength: MatchLength): AuthoritativeRuntimeV1 {
  const matchId = `recorded-${matchLength}-${seed}`;
  let runtime = createAuthoritativeRuntime(matchId, createSeededRandomSource(seed).snapshot());
  runtime = executeIdempotentCommand(runtime, startCommand(matchId, matchLength)).runtime;
  const policy = createSeededRandomSource(policySeed(seed));
  for (let sequence = 2; sequence < 2_000; sequence += 1) {
    if (runtime.state?.phase.kind === "matchComplete") return runtime;
    if (runtime.state === null) throw new Error("Recorded match failed to start.");
    runtime = executeIdempotentCommand(
      runtime,
      nextCommand(runtime.state, sequence, policy),
    ).runtime;
  }
  throw new Error(`${matchId}: recorded match exceeded the command limit.`);
}

export function runDirectMatch(
  seed: string,
  matchLength: MatchLength,
  onState?: (state: AuthoritativeGameStateV1, checkpoint: EngineCheckpointV1) => void,
): DirectMatchTrace {
  const matchId = `generated-${matchLength}-${seed}`;
  const random = createSeededRandomSource(seed);
  const initialCommand = startCommand(matchId, matchLength);
  const initial = startMatch(initialCommand, random);
  let state = initial.state;
  let checkpoint = initial.checkpoint;
  const commands: ReplayCommandV1[] = [initialCommand];
  const eventBatches: (readonly EngineEventV1[])[] = [initial.events];
  const policy = createSeededRandomSource(policySeed(seed));
  onState?.(state, checkpoint);
  for (let sequence = 2; sequence < 2_000; sequence += 1) {
    if (state.phase.kind === "matchComplete") {
      return { state, checkpoint, commands, eventBatches };
    }
    try {
      const command = nextCommand(state, sequence, policy);
      commands.push(command);
      const previousVersion = state.stateVersion;
      if (command.type === "advanceRound") {
        const transition = advanceRound(state, command, checkpoint);
        state = transition.state;
        checkpoint = transition.checkpoint;
        eventBatches.push(transition.events);
      } else {
        const transition = applyGameplayCommand(state, command);
        state = transition.state;
        eventBatches.push(transition.events);
      }
      if (state.stateVersion !== previousVersion + 1) {
        throw new Error(`Accepted command advanced ${previousVersion} to ${state.stateVersion}.`);
      }
      onState?.(state, checkpoint);
    } catch (error) {
      throw new Error(
        `${matchId}: stateVersion=${state.stateVersion}, phase=${state.phase.kind}, recentCommands=${JSON.stringify(commands.slice(-12))}. ${String(error)}`,
        { cause: error },
      );
    }
  }
  throw new Error(`${matchId}: generated match exceeded the command limit.`);
}

export function replayDirectTrace(trace: DirectMatchTrace, seed: string): DirectMatchTrace {
  const [initialCommand, ...commands] = trace.commands;
  if (initialCommand?.type !== "startMatch") throw new Error("Trace start command missing.");
  const initial = startMatch(initialCommand, createSeededRandomSource(seed));
  let state = initial.state;
  let checkpoint = initial.checkpoint;
  const eventBatches: (readonly EngineEventV1[])[] = [initial.events];
  for (const command of commands) {
    if (command.type === "startMatch") throw new Error("Trace contains a second start command.");
    if (command.type === "advanceRound") {
      const transition = advanceRound(state, command, checkpoint);
      state = transition.state;
      checkpoint = transition.checkpoint;
      eventBatches.push(transition.events);
    } else {
      const transition = applyGameplayCommand(state, command);
      state = transition.state;
      eventBatches.push(transition.events);
    }
  }
  return { state, checkpoint, commands: trace.commands, eventBatches };
}
