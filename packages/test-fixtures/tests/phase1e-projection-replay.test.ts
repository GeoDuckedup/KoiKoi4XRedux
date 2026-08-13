import {
  CARD_IDS,
  EngineCommandError,
  ReplayVerificationError,
  applyGameplayCommand,
  canonicalStringifyV1,
  createAuthoritativeRuntime,
  createSeededRandomSource,
  executeIdempotentCommand,
  hashAuthoritativeRuntimeV1,
  hashCanonicalV1,
  hashPublicStateV1,
  projectEventsForPlayer,
  projectPlayerObservation,
  projectPublicEvents,
  projectPublicState,
  replayAuthoritativeLog,
  startMatchFromOrderedDeck,
  validateAuthoritativeState,
  validateCardOwnership,
  validatePlayerObservation,
  validatePublicProjection,
  type AuthoritativeGameStateV1,
  type CardId,
  type EngineEventV1,
  type GameplayCommandV1,
  type ReplayCommandV1,
} from "@koikoi4x/engine";
import {
  ProtocolValidationError,
  createPublicTurnRecordV1,
  decodePublicTurnRecordV1,
  decodePublicTurnRecordSequenceV1,
  verifyPublicTurnRecordResult,
} from "@koikoi4x/protocol";
import { describe, expect, it } from "vitest";

import { PHASE_1B_CAPTURE_FIXTURES } from "../src/rules/capture-fixtures";
import { PHASE_1A_DEAL_FIXTURES } from "../src/rules/deal-fixtures";
import {
  PHASE_1E_VECTOR_FIXTURES,
  PHASE_1E_VECTOR_IDS,
  getPhase1EVectorFixture,
  type Phase1EVectorId,
} from "../src/rules/phase1e-fixtures";
import { runRecordedMatch } from "./support/phase1e-driver";

function dealFixture(id: string) {
  const fixture = PHASE_1A_DEAL_FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`${id} missing.`);
  const action = fixture.when[0];
  if (action === undefined) throw new Error(`${id} action missing.`);
  return {
    fixture,
    transition: startMatchFromOrderedDeck(
      {
        type: "startMatch",
        commandId: action.commandId,
        matchId: fixture.given.matchId,
        expectedStateVersion: 0,
        matchLength: fixture.given.matchLength,
        starterPolicy: { kind: "provided", playerId: action.starterId },
      },
      action.orderedDeck,
      action.starterId,
    ),
  };
}

function captureFixture(id: "CAP-000" | "CAP-002A" | "CAP-DRAW-002") {
  const fixture = PHASE_1B_CAPTURE_FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`${id} missing.`);
  const state = startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `start-${id}`,
      matchId: fixture.matchId,
      expectedStateVersion: 0,
      matchLength: 12,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    fixture.orderedDeck,
    "player-a",
  ).state;
  return { fixture, state };
}

function expectLiteral(id: Phase1EVectorId, actual: Readonly<Record<string, unknown>>): void {
  expect(actual).toEqual(getPhase1EVectorFixture(id).then);
}

function authoritativeCardCount(state: AuthoritativeGameStateV1): number {
  const pendingDraw = state.phase.kind === "awaitingDrawResolution" ? 1 : 0;
  return (
    state.players.reduce(
      (total, player) => total + player.hand.length + player.captured.length,
      0,
    ) +
    state.round.field.length +
    state.round.drawPile.length +
    pendingDraw
  );
}

function errorCode(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof EngineCommandError ? error.code : null;
  }
}

describe("Phase 1E literal projection and invariant fixtures", () => {
  it("exports every Phase 1E vector exactly once with frozen literal expectations", () => {
    expect(PHASE_1E_VECTOR_FIXTURES.map((fixture) => fixture.id)).toEqual(PHASE_1E_VECTOR_IDS);
    expect(new Set(PHASE_1E_VECTOR_IDS).size).toBe(11);
    expect(PHASE_1E_VECTOR_FIXTURES.every(Object.isFrozen)).toBe(true);
    expect(PHASE_1E_VECTOR_FIXTURES.every((fixture) => Object.isFrozen(fixture.then))).toBe(true);
  });

  it("PROJ-LUCKY-BEFORE-COMMIT-HIDDEN / PROJ-LUCKY-AFTER-COMMIT-REVEALED enforce the event boundary", () => {
    const beforeFixture = getPhase1EVectorFixture("PROJ-LUCKY-BEFORE-COMMIT-HIDDEN");
    const afterFixture = getPhase1EVectorFixture("PROJ-LUCKY-AFTER-COMMIT-REVEALED");
    if (beforeFixture.kind !== "luckyProjection" || afterFixture.kind !== "luckyProjection") {
      throw new Error("Lucky fixture kind mismatch.");
    }
    const { transition } = dealFixture(beforeFixture.given.dealFixtureId);
    const commitIndex = transition.events.findIndex(
      (event) => event.type === "automaticRoundResultCommitted",
    );
    const revealIndex = transition.events.findIndex(
      (event) => event.type === "luckyHandEvidenceRevealed",
    );
    expect(commitIndex).toBeGreaterThanOrEqual(0);
    expect(revealIndex).toBeGreaterThan(commitIndex);
    const beforeCommit = projectPublicEvents(transition.events.slice(0, commitIndex));
    const serializedBefore = canonicalStringifyV1(beforeCommit);
    for (const cardId of beforeFixture.then.hiddenBeforeCommitCardIds) {
      expect(serializedBefore).not.toContain(cardId);
    }
    const allPublic = projectPublicEvents(transition.events);
    const reveal = allPublic.find((event) => event.type === "luckyHandEvidenceRevealed");
    if (reveal?.type !== "luckyHandEvidenceRevealed") throw new Error("Lucky reveal missing.");
    expect(reveal.evidence).toEqual([
      expect.objectContaining({
        playerId: afterFixture.then.revealedPlayerId,
        fullHand: afterFixture.then.revealedFullHand,
      }),
    ]);
    const publicState = projectPublicState(transition.state);
    expect(publicState.history[0]?.evidence).toEqual({
      kind: "luckyHands",
      hands: reveal.evidence,
    });
    const observed = {
      beforeCommitPublicEventTypes: beforeCommit.map((event) => event.type),
      hiddenBeforeCommitCardIds: afterFixture.then.revealedFullHand.filter(
        (cardId) => !serializedBefore.includes(cardId),
      ),
      revealedPlayerId: reveal.evidence[0]?.playerId,
      revealedFullHand: reveal.evidence[0]?.fullHand,
      revealAfterCommit: revealIndex > commitIndex,
    };
    expectLiteral("PROJ-LUCKY-BEFORE-COMMIT-HIDDEN", observed);
    expectLiteral("PROJ-LUCKY-AFTER-COMMIT-REVEALED", observed);
  });

  it("INV-OBSERVATION-NO-PRIVATE projects public, Player A, and Player B views exhaustively", () => {
    const { transition } = dealFixture("DEAL-001");
    const { state, events } = transition;
    const sourceBefore = canonicalStringifyV1({ state, events });
    const serverCheckpoint = createSeededRandomSource(
      "0123456789abcdeffedcba9876543210",
    ).snapshot();
    const publicState = projectPublicState(state);
    const playerA = projectPlayerObservation(state, "player-a");
    const playerB = projectPlayerObservation(state, "player-b");
    const publicEvents = projectPublicEvents(events);
    const playerAEvents = projectEventsForPlayer(events, "player-a");
    const playerBEvents = projectEventsForPlayer(events, "player-b");
    expect(validatePublicProjection(state, publicState)).toEqual([]);
    expect(validatePlayerObservation(state, playerA)).toEqual([]);
    expect(validatePlayerObservation(state, playerB)).toEqual([]);
    expect(playerA.ownHand).toEqual(state.players[0].hand);
    expect(playerB.ownHand).toEqual(state.players[1].hand);
    expect(playerAEvents.find((event) => event.type === "initialHandDealt")).toMatchObject({
      playerId: "player-a",
      cardIds: state.players[0].hand,
    });
    expect(playerBEvents.find((event) => event.type === "initialHandDealt")).toMatchObject({
      playerId: "player-b",
      cardIds: state.players[1].hand,
    });
    expect(canonicalStringifyV1(publicEvents)).not.toContain("initialHandDealt");
    const publicSerialized = canonicalStringifyV1(publicState);
    const playerASerialized = canonicalStringifyV1(playerA);
    for (const cardId of state.round.drawPile) {
      expect(publicSerialized).not.toContain(cardId);
      expect(playerASerialized).not.toContain(cardId);
    }
    for (const cardId of state.players[1].hand) expect(playerASerialized).not.toContain(cardId);
    expect(canonicalStringifyV1({ publicState, playerA, publicEvents })).not.toMatch(
      /checkpoint|initialRng|lastAcceptedCommandId|seenYakuKeys|drawPileOrdered|luckyHandDetected/u,
    );
    expect(canonicalStringifyV1(serverCheckpoint)).toContain("xoshiro128ss");
    expect(canonicalStringifyV1(projectPublicState(state))).toBe(canonicalStringifyV1(publicState));
    expect(canonicalStringifyV1({ state, events })).toBe(sourceBefore);
    expect(Object.isFrozen(publicState)).toBe(true);
    expect(Object.isFrozen(publicState.round)).toBe(true);
    expect(Object.isFrozen(playerA.ownHand)).toBe(true);
    expect(Object.isFrozen(publicEvents)).toBe(true);
    expectLiteral("INV-OBSERVATION-NO-PRIVATE", {
      ownHandVisible: true,
      opponentHandVisible: false,
      drawOrderVisible: false,
      rngVisible: false,
      serverEventsVisible: false,
    });
  });

  it("rejects mislabeled private/server setup events instead of trusting their audience field", () => {
    const leaked = [
      {
        type: "initialHandDealt",
        audience: { kind: "public" },
        playerId: "player-a",
        cardIds: ["january-crane"],
      },
      {
        type: "drawPileOrdered",
        audience: { kind: "public" },
        cardIds: ["february-bush-warbler"],
      },
      {
        type: "luckyHandDetected",
        audience: { kind: "public" },
        playerId: "player-b",
        qualification: { kind: "fourPairs", pairs: [] },
      },
    ] as unknown as readonly EngineEventV1[];
    expect(projectPublicEvents(leaked)).toEqual([]);
    expect(projectEventsForPlayer(leaked, "player-a")).toEqual([]);

    const serverMislabeledPrivate = [
      {
        type: "drawPileOrdered",
        audience: { kind: "private", playerId: "player-a" },
        cardIds: ["january-crane"],
      },
      {
        type: "luckyHandDetected",
        audience: { kind: "private", playerId: "player-a" },
        playerId: "player-a",
        qualification: { kind: "fourPairs", pairs: [] },
      },
    ] as unknown as readonly EngineEventV1[];
    expect(projectEventsForPlayer(serverMislabeledPrivate, "player-a")).toEqual([]);

    const crossOwnedHands = [
      {
        type: "initialHandDealt",
        audience: { kind: "private", playerId: "player-a" },
        playerId: "player-b",
        cardIds: ["february-bush-warbler"],
      },
      {
        type: "initialHandDealt",
        audience: { kind: "private", playerId: "player-b" },
        playerId: "player-a",
        cardIds: ["january-crane"],
      },
    ] as unknown as readonly EngineEventV1[];
    expect(projectEventsForPlayer(crossOwnedHands, "player-a")).toEqual([]);
    expect(projectEventsForPlayer(crossOwnedHands, "player-b")).toEqual([]);
  });

  it("INV-ZONE-UNIQUENESS / INV-CARD-COUNT-48 hold before and after an accepted command", () => {
    const { fixture, state } = captureFixture("CAP-000");
    const command = fixture.commands[0];
    if (command === undefined) throw new Error("CAP-000 command missing.");
    const after = applyGameplayCommand(state, command).state;
    for (const candidate of [state, after]) {
      expect(validateCardOwnership(candidate)).toEqual([]);
      expect(authoritativeCardCount(candidate)).toBe(48);
    }
    expectLiteral("INV-ZONE-UNIQUENESS", { duplicateCards: 0, missingCards: 0 });
    expectLiteral("INV-CARD-COUNT-48", { authoritativeCardCount: 48 });
  });

  it("projects pending Draw and Yaku decision phases without expanding either private zone", () => {
    const { fixture, state } = captureFixture("CAP-DRAW-002");
    const drawCommand = fixture.commands[0];
    if (drawCommand === undefined) throw new Error("CAP-DRAW-002 command missing.");
    const pendingDraw = applyGameplayCommand(state, drawCommand).state;
    if (pendingDraw.phase.kind !== "awaitingDrawResolution") {
      throw new Error("Pending Draw fixture did not pause.");
    }
    const publicDraw = projectPublicState(pendingDraw);
    expect(publicDraw.phase).toEqual(pendingDraw.phase);
    expect(publicDraw.round.drawPileCount).toBe(pendingDraw.round.drawPile.length);
    expect(publicDraw.players.map((player) => player.handCount)).toEqual(
      pendingDraw.players.map((player) => player.hand.length),
    );

    const replayFixture = getPhase1EVectorFixture("INV-DETERMINISTIC-REPLAY");
    if (replayFixture.kind !== "replay") throw new Error("Replay fixture kind mismatch.");
    const runtime = runRecordedMatch(replayFixture.given.seed, replayFixture.given.matchLength);
    const decisionState = runtime.acceptedCommandReceipts.find(
      (receipt) => receipt.transition.state.phase.kind === "awaitingYakuDecision",
    )?.transition.state;
    if (decisionState?.phase.kind !== "awaitingYakuDecision") {
      throw new Error("Recorded projection trace did not reach a Yaku decision.");
    }
    const publicDecision = projectPublicState(decisionState);
    expect(publicDecision.phase).toEqual(decisionState.phase);
    expect(
      projectPlayerObservation(decisionState, decisionState.phase.playerId).legalActions,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ type: "chooseYakuDecision" })]));
    expect(
      projectPlayerObservation(
        decisionState,
        decisionState.phase.playerId === "player-a" ? "player-b" : "player-a",
      ).legalActions,
    ).toEqual([]);
  });

  it("INV-ACTIVE-PLAYER-ONLY / INV-HAND-OWNERSHIP / INV-CAPTURE-TARGET-LEGAL reject atomically", () => {
    const { fixture, state } = captureFixture("CAP-002A");
    const valid = fixture.commands[0];
    if (valid?.type !== "playHandCard") throw new Error("CAP-002A command missing.");
    const validWithoutTarget = {
      type: valid.type,
      commandId: valid.commandId,
      matchId: valid.matchId,
      actorId: valid.actorId,
      expectedStateVersion: valid.expectedStateVersion,
      cardId: valid.cardId,
    };
    const cases: readonly { readonly id: Phase1EVectorId; readonly command: GameplayCommandV1 }[] =
      [
        {
          id: "INV-ACTIVE-PLAYER-ONLY" as const,
          command: {
            ...validWithoutTarget,
            commandId: "phase1e-out-of-turn",
            actorId: "player-b" as const,
            cardId: state.players[1].hand[0] as CardId,
          },
        },
        {
          id: "INV-HAND-OWNERSHIP" as const,
          command: {
            ...validWithoutTarget,
            commandId: "phase1e-not-owned",
            cardId: state.players[1].hand[0] as CardId,
          },
        },
        {
          id: "INV-CAPTURE-TARGET-LEGAL" as const,
          command: {
            ...valid,
            commandId: "phase1e-illegal-target",
            targetFieldCardId: "december-phoenix" as const,
          },
        },
      ];
    for (const { id, command } of cases) {
      const before = canonicalStringifyV1(state);
      const code = errorCode(() => applyGameplayCommand(state, command));
      expectLiteral(id, {
        errorCode: code,
        stateVersionDelta: state.stateVersion - state.stateVersion,
        mutated: canonicalStringifyV1(state) !== before,
      });
    }
  });

  it("INV-SCORE-MULTIPLIER-RANGE / INV-STATE-VERSION-ONCE bind targeted boundaries", () => {
    const { fixture, state } = captureFixture("CAP-000");
    const command = fixture.commands[0];
    if (command === undefined) throw new Error("CAP-000 command missing.");
    const accepted = applyGameplayCommand(state, command).state;
    expectLiteral("INV-SCORE-MULTIPLIER-RANGE", {
      minimumScore: Math.min(...accepted.players.map((player) => player.score)),
      minimumMultiplier: 1,
      maximumMultiplier: 4,
    });
    expectLiteral("INV-STATE-VERSION-ONCE", {
      acceptedDelta: accepted.stateVersion - state.stateVersion,
      rejectedDelta: 0,
    });
  });
});

describe("Phase 1E replay, idempotency, public hashes, and protocol", () => {
  it("INV-DETERMINISTIC-REPLAY reproduces the exact private/public result and detects tampering", () => {
    const fixture = getPhase1EVectorFixture("INV-DETERMINISTIC-REPLAY");
    if (fixture.kind !== "replay") throw new Error("Replay fixture kind mismatch.");
    const runtime = runRecordedMatch(fixture.given.seed, fixture.given.matchLength);
    const replayed = replayAuthoritativeLog(runtime.log);
    expect(replayed.state).toEqual(runtime.state);
    expect(replayed.checkpoint).toEqual(runtime.checkpoint);
    expect(replayed.log).toEqual(runtime.log);
    expect(hashAuthoritativeRuntimeV1(replayed)).toBe(hashAuthoritativeRuntimeV1(runtime));
    expectLiteral("INV-DETERMINISTIC-REPLAY", {
      replayVersion: runtime.log.replayVersion,
      canonicalizationVersion: runtime.log.canonicalizationVersion,
      hashAlgorithm: runtime.log.hashAlgorithm,
      sameState: true,
      sameEvents: true,
      sameCheckpoint: true,
    });
    const entry = runtime.log.entries[1];
    const firstEntry = runtime.log.entries[0];
    if (firstEntry === undefined || entry === undefined) {
      throw new Error("Replay fixture needs two entries.");
    }
    const tamperedLogs = [
      {
        ...runtime.log,
        entries: [firstEntry, { ...entry, sequence: 99 }, ...runtime.log.entries.slice(2)],
      },
      {
        ...runtime.log,
        entries: [
          firstEntry,
          { ...entry, after: { ...entry.after, eventsHash: hashCanonicalV1("tampered") } },
          ...runtime.log.entries.slice(2),
        ],
      },
      {
        ...runtime.log,
        entries: [
          firstEntry,
          {
            ...entry,
            command: {
              ...entry.command,
              expectedStateVersion: entry.command.expectedStateVersion + 1,
            } as ReplayCommandV1,
          },
          ...runtime.log.entries.slice(2),
        ],
      },
      {
        ...runtime.log,
        initialRng: { ...runtime.log.initialRng, drawCount: runtime.log.initialRng.drawCount + 1 },
      },
    ];
    for (const tampered of tamperedLogs) {
      expect(() => replayAuthoritativeLog(tampered)).toThrow(ReplayVerificationError);
    }
    for (const gameplayEntry of runtime.log.entries.filter(
      (candidate) =>
        candidate.command.type !== "startMatch" && candidate.command.type !== "advanceRound",
    )) {
      expect(gameplayEntry.after.checkpointHash).toBe(gameplayEntry.before.checkpointHash);
    }
  });

  it("returns any exact accepted retry without rolling current state/log/checkpoint backward", () => {
    const runtime = runRecordedMatch("0123456789abcdeffedcba9876543210", 3);
    const gameplay = runtime.log.entries.find((entry) => "actorId" in entry.command);
    const advance = runtime.log.entries.find((entry) => entry.command.type === "advanceRound");
    const start = runtime.log.entries[0];
    if (start === undefined || gameplay === undefined || advance === undefined) {
      throw new Error("Retry fixtures missing.");
    }
    for (const entry of [start, gameplay, advance]) {
      const before = canonicalStringifyV1(runtime);
      const retry = executeIdempotentCommand(runtime, entry.command);
      expect(retry.replayed).toBe(true);
      expect(retry.runtime).toBe(runtime);
      expect(retry.receipt.sequence).toBe(entry.sequence);
      expect(canonicalStringifyV1(runtime)).toBe(before);
    }
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Object.isFrozen(runtime.log.entries)).toBe(true);
    expect(Object.isFrozen(runtime.acceptedCommandReceipts)).toBe(true);
    expect(() =>
      executeIdempotentCommand(runtime, {
        ...gameplay.command,
        expectedStateVersion: gameplay.command.expectedStateVersion + 1,
      } as ReplayCommandV1),
    ).toThrowError(expect.objectContaining({ code: "IDEMPOTENCY_KEY_CONFLICT" }));
  });

  it("hashes identical public information equally while private future-affecting state differs", () => {
    const { transition } = dealFixture("DEAL-001");
    const state = transition.state;
    const privateVariant: AuthoritativeGameStateV1 = {
      ...state,
      players: [
        state.players[0],
        { ...state.players[1], hand: [...state.players[1].hand].reverse() },
      ],
      round: { ...state.round, drawPile: [...state.round.drawPile].reverse() },
    };
    expect(validateAuthoritativeState(privateVariant)).toEqual([]);
    expect(hashPublicStateV1(privateVariant)).toBe(hashPublicStateV1(state));
    expect(hashCanonicalV1(privateVariant)).not.toBe(hashCanonicalV1(state));
  });

  it("creates and decodes a redacted PublicTurnRecord with deterministic result hash", () => {
    const { fixture, state } = captureFixture("CAP-000");
    const command = fixture.commands[0];
    if (command === undefined) throw new Error("CAP-000 command missing.");
    const transition = applyGameplayCommand(state, command);
    const before = projectPublicState(state);
    const after = projectPublicState(transition.state);
    const record = createPublicTurnRecordV1({
      recordSequence: 1,
      roundNumber: 1,
      turnNumber: 1,
      recordKind: "playerTurn",
      actorId: "player-a",
      nextActorId: "player-b",
      beforePublicState: before,
      publicEvents: projectPublicEvents(transition.events),
      resultingPublicState: after,
      endedRound: false,
      endedMatch: false,
      committedAt: "2026-08-08T00:00:00.000Z",
    });
    expect(decodePublicTurnRecordV1(JSON.parse(JSON.stringify(record)))).toEqual(record);
    expect(verifyPublicTurnRecordResult(record, after)).toBe(true);
    expect(canonicalStringifyV1(record)).not.toMatch(
      /audience|checkpoint|commandId|drawPileOrdered|initialHandDealt|initialRng|seenYakuKeys/u,
    );
    expect(() =>
      decodePublicTurnRecordV1({
        ...record,
        publicEvents: [{ type: "drawPileOrdered", cardIds: CARD_IDS }],
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      decodePublicTurnRecordV1({
        ...record,
        publicEvents: [
          {
            type: "cardsDealt",
            field: [],
            handCounts: { "player-a": 8, "player-b": 8 },
            drawPileCount: 24,
            cardIds: CARD_IDS,
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "PUBLIC_CONTENT_FIELD_INVALID" }));
    expect(() =>
      decodePublicTurnRecordV1({
        ...record,
        beforePublicState: { ...record.beforePublicState, secret: CARD_IDS },
      }),
    ).toThrowError(expect.objectContaining({ code: "PUBLIC_CONTENT_FIELD_INVALID" }));

    const pendingFixture = captureFixture("CAP-DRAW-002");
    const pendingCommand = pendingFixture.fixture.commands[0];
    if (pendingCommand === undefined) throw new Error("Pending Draw command missing.");
    const pendingState = applyGameplayCommand(pendingFixture.state, pendingCommand).state;
    const replayFixture = getPhase1EVectorFixture("INV-DETERMINISTIC-REPLAY");
    if (replayFixture.kind !== "replay") throw new Error("Replay fixture kind mismatch.");
    const runtime = runRecordedMatch(replayFixture.given.seed, replayFixture.given.matchLength);
    const decisionState = runtime.acceptedCommandReceipts.find(
      (receipt) => receipt.transition.state.phase.kind === "awaitingYakuDecision",
    )?.transition.state;
    if (decisionState?.phase.kind !== "awaitingYakuDecision" || runtime.state === null) {
      throw new Error("Protocol phase fixtures missing.");
    }
    const luckyState = dealFixture("DEAL-005").transition.state;
    const cancellation = dealFixture("DEAL-002").transition;
    const bothLucky = dealFixture("DEAL-012-BOTH-LUCKY-EVIDENCE").transition;
    const candidateStates = [
      before,
      projectPublicState(pendingState),
      projectPublicState(decisionState),
      projectPublicState(luckyState),
      projectPublicState(cancellation.state),
      projectPublicState(bothLucky.state),
      projectPublicState(runtime.state),
    ];
    const wireForState = (publicState: (typeof candidateStates)[number]) => ({
      ...record,
      matchId: publicState.matchId,
      previousStateVersion: publicState.stateVersion,
      resultingStateVersion: publicState.stateVersion + 1,
      beforePublicState: publicState,
    });
    for (const candidate of candidateStates) {
      expect(() => decodePublicTurnRecordV1(wireForState(candidate))).not.toThrow();
    }
    const publicEventBatches = [
      dealFixture("DEAL-001").transition.events,
      dealFixture("DEAL-005").transition.events,
      cancellation.events,
      bothLucky.events,
      ...runtime.acceptedCommandReceipts.map((receipt) => receipt.transition.events),
    ].map((events) => projectPublicEvents(events));
    for (const publicEvents of publicEventBatches) {
      expect(() => decodePublicTurnRecordV1({ ...record, publicEvents })).not.toThrow();
    }

    const decisionPublic = projectPublicState(decisionState);
    if (decisionPublic.phase.kind !== "awaitingYakuDecision") {
      throw new Error("Projected Yaku decision phase missing.");
    }
    const decisionPlayerIndex = decisionPublic.phase.playerId === "player-a" ? 0 : 1;
    const decisionPlayer = decisionPublic.players[decisionPlayerIndex];
    const firstYaku = decisionPlayer.activeYaku[0];
    if (firstYaku === undefined) throw new Error("Decision active Yaku missing.");
    const nestedLeakCases = [
      {
        ...decisionPublic,
        players: decisionPublic.players.map((player, index) =>
          index === decisionPlayerIndex
            ? {
                ...player,
                activeYaku: [{ ...firstYaku, opponentCards: ["january-crane"] }],
              }
            : player,
        ),
      },
      {
        ...decisionPublic,
        phase: {
          ...decisionPublic.phase,
          context: { ...decisionPublic.phase.context, opponentCards: ["january-crane"] },
        },
      },
      {
        ...projectPublicState(luckyState),
        history: projectPublicState(luckyState).history.map((result) => ({
          ...result,
          evidence:
            result.evidence === null
              ? null
              : { ...result.evidence, opponentCards: ["january-crane"] },
        })),
      },
      {
        ...projectPublicState(pendingState),
        phase: { ...projectPublicState(pendingState).phase, drawnCardId: "not-a-card" },
      },
    ];
    for (const malformed of nestedLeakCases) {
      expect(() => decodePublicTurnRecordV1(wireForState(malformed as typeof before))).toThrow(
        ProtocolValidationError,
      );
    }

    const nonenumerablePlayer = { ...before.players[0] } as Record<string, unknown>;
    Object.defineProperty(nonenumerablePlayer, "opponentCards", {
      enumerable: false,
      value: ["january-crane"],
    });
    const accessorPlayer = { ...before.players[0] } as Record<string, unknown>;
    Object.defineProperty(accessorPlayer, "score", {
      enumerable: true,
      get: () => before.players[0].score,
    });
    const sparseField = [...before.round.field];
    delete sparseField[0];
    const extraField = [...before.round.field] as CardId[] & { opponentCards?: readonly CardId[] };
    extraField.opponentCards = ["january-crane"];
    const hostileShapes = [
      Object.create(before) as typeof before,
      { ...before, players: [nonenumerablePlayer, before.players[1]] },
      { ...before, players: [accessorPlayer, before.players[1]] },
      { ...before, round: { ...before.round, field: sparseField } },
      { ...before, round: { ...before.round, field: extraField } },
    ];
    for (const hostile of hostileShapes) {
      expect(() => decodePublicTurnRecordV1(wireForState(hostile as typeof before))).toThrow(
        ProtocolValidationError,
      );
    }

    const nestedEventLeak = {
      ...record,
      publicEvents: [
        {
          type: "yakuDecisionRequired",
          actorId: decisionState.phase.playerId,
          context: { ...decisionState.phase.context, opponentCards: ["january-crane"] },
        },
      ],
    };
    expect(() => decodePublicTurnRecordV1(nestedEventLeak)).toThrow(ProtocolValidationError);

    const secondRecord = {
      ...record,
      recordSequence: 2,
      previousStateVersion: record.resultingStateVersion,
      resultingStateVersion: record.resultingStateVersion + 1,
      beforePublicState: after,
    };
    expect(decodePublicTurnRecordSequenceV1([record, secondRecord])).toHaveLength(2);
    for (const malformed of [
      [record, { ...secondRecord, recordSequence: 1 }],
      [record, { ...secondRecord, recordSequence: 3 }],
      [
        record,
        {
          ...secondRecord,
          previousStateVersion: 1,
          beforePublicState: { ...after, stateVersion: 1 },
        },
      ],
    ]) {
      expect(() => decodePublicTurnRecordSequenceV1(malformed)).toThrowError(
        expect.objectContaining({ code: "TURN_RECORD_SEQUENCE_INVALID" }),
      );
    }
  });

  it("does not cache rejected commands or consume the replay RNG checkpoint", () => {
    const seed = "0123456789abcdeffedcba9876543210";
    const matchId = "phase1e-rejected-runtime";
    let runtime = createAuthoritativeRuntime(matchId, createSeededRandomSource(seed).snapshot());
    runtime = executeIdempotentCommand(runtime, {
      type: "startMatch",
      commandId: "phase1e-start",
      matchId,
      expectedStateVersion: 0,
      matchLength: 3,
      starterPolicy: { kind: "chooseWithRng" },
    }).runtime;
    if (runtime.state === null) throw new Error("Runtime failed to start.");
    const before = canonicalStringifyV1(runtime);
    const actor =
      runtime.state.phase.kind === "awaitingHandPlay" ? runtime.state.phase.playerId : null;
    if (actor === null) return;
    const rejectedCardId = runtime.state.players[0].hand[0];
    if (rejectedCardId === undefined) throw new Error("Rejected command fixture hand is empty.");
    const rejected: ReplayCommandV1 = {
      type: "playHandCard",
      commandId: "phase1e-rejected",
      matchId,
      actorId: actor === "player-a" ? "player-b" : "player-a",
      expectedStateVersion: runtime.state.stateVersion,
      cardId: rejectedCardId,
    };
    expect(() => executeIdempotentCommand(runtime, rejected)).toThrow(EngineCommandError);
    expect(canonicalStringifyV1(runtime)).toBe(before);
    expect(
      runtime.acceptedCommandReceipts.some((entry) => entry.commandId === rejected.commandId),
    ).toBe(false);
    const rejectedAdvance: ReplayCommandV1 = {
      type: "advanceRound",
      commandId: "phase1e-rejected-advance",
      matchId,
      expectedStateVersion: runtime.state.stateVersion,
    };
    expect(() => executeIdempotentCommand(runtime, rejectedAdvance)).toThrow(EngineCommandError);
    expect(canonicalStringifyV1(runtime)).toBe(before);
    expect(
      runtime.acceptedCommandReceipts.some(
        (entry) => entry.commandId === rejectedAdvance.commandId,
      ),
    ).toBe(false);
  });
});
