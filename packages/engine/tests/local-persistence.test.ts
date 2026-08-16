import {
  CARD_IDS,
  applyGameplayCommand,
  advanceRound,
  createSeededRandomSource,
  decodeLocalAuthoritativeSnapshotV1,
  getLegalActions,
  startMatch,
  startMatchFromOrderedDeck,
  type AuthoritativeGameStateV1,
  type CardId,
  type EngineCheckpointV1,
  type GameplayCommandV1,
  type LegalActionV1,
} from "../src/index";
import { describe, expect, it } from "vitest";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialSnapshot(): { state: AuthoritativeGameStateV1; checkpoint: EngineCheckpointV1 } {
  const started = startMatch(
    {
      type: "startMatch",
      commandId: "persistence:start",
      matchId: "persistence-match",
      expectedStateVersion: 0,
      matchLength: 3,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    createSeededRandomSource("00000000000000000000000000000003"),
  );
  return { state: started.state, checkpoint: started.checkpoint };
}

function orderedDeck(
  playerAHand: readonly CardId[],
  playerBHand: readonly CardId[],
  field: readonly CardId[],
): readonly CardId[] {
  const dealt = [...playerAHand, ...playerBHand, ...field];
  if (new Set(dealt).size !== 24) throw new Error("Automatic fixture cards must be unique.");
  return [...dealt, ...CARD_IDS.filter((cardId) => !dealt.includes(cardId))];
}

function automaticSnapshot(
  id: string,
  playerAHand: readonly CardId[],
  playerBHand: readonly CardId[],
  field: readonly CardId[],
): { state: AuthoritativeGameStateV1; checkpoint: EngineCheckpointV1 } {
  const matchId = `persistence-${id}`;
  const state = startMatchFromOrderedDeck(
    {
      type: "startMatch",
      commandId: `${matchId}:start`,
      matchId,
      expectedStateVersion: 0,
      matchLength: 3,
      starterPolicy: { kind: "provided", playerId: "player-a" },
    },
    orderedDeck(playerAHand, playerBHand, field),
    "player-a",
  ).state;
  const checkpoint = initialSnapshot().checkpoint;
  return { state, checkpoint: { ...checkpoint, matchId } };
}

function commandFromAction(
  state: AuthoritativeGameStateV1,
  action: LegalActionV1,
): GameplayCommandV1 {
  const base = {
    commandId: `persistence:command:${state.stateVersion}`,
    matchId: state.matchId,
    actorId: action.actorId,
    expectedStateVersion: state.stateVersion,
  };
  if (action.type === "playHandCard") {
    return {
      ...base,
      type: "playHandCard",
      cardId: action.cardId,
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    };
  }
  if (action.type === "resolveDrawCard") {
    return {
      ...base,
      type: "resolveDrawCard",
      ...(action.targetFieldCardId === undefined
        ? {}
        : { targetFieldCardId: action.targetFieldCardId }),
    };
  }
  return { ...base, type: "chooseYakuDecision", choice: action.choice };
}

function advanceTo(
  initial: AuthoritativeGameStateV1,
  phase: AuthoritativeGameStateV1["phase"]["kind"],
): AuthoritativeGameStateV1 {
  let state = initial;
  for (let count = 0; count < 80; count += 1) {
    if (state.phase.kind === phase) return state;
    if (state.phase.kind === "roundComplete" || state.phase.kind === "matchComplete") break;
    const actorId = state.phase.playerId;
    const action = getLegalActions(state, actorId)[0];
    if (action === undefined) throw new Error(`Missing legal action for ${state.phase.kind}.`);
    state = applyGameplayCommand(state, commandFromAction(state, action)).state;
  }
  throw new Error(`Could not reach ${phase}.`);
}

describe("private local authoritative snapshot decoder", () => {
  it("accepts a JSON-round-tripped awaiting-hand snapshot and returns an isolated deep-frozen clone", () => {
    const source = initialSnapshot();
    const decoded = decodeLocalAuthoritativeSnapshotV1(clone(source));

    expect(decoded).toEqual(source);
    expect(decoded).not.toBe(source);
    expect(decoded.state).not.toBe(source.state);
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.state)).toBe(true);
    expect(Object.isFrozen(decoded.state.players)).toBe(true);
    expect(() => (decoded.state.players[0].hand as string[]).push("january-crane")).toThrow();
  });

  it("accepts JSON-round-tripped reconstructable Draw and Yaku-decision snapshots", () => {
    const source = initialSnapshot();
    const draw = advanceTo(source.state, "awaitingDrawResolution");
    const decision = advanceTo(source.state, "awaitingYakuDecision");
    const complete = advanceTo(source.state, "roundComplete");

    expect(
      decodeLocalAuthoritativeSnapshotV1(clone({ state: draw, checkpoint: source.checkpoint })),
    ).toEqual({
      state: draw,
      checkpoint: source.checkpoint,
    });
    expect(
      decodeLocalAuthoritativeSnapshotV1(clone({ state: decision, checkpoint: source.checkpoint })),
    ).toEqual({ state: decision, checkpoint: source.checkpoint });
    expect(
      decodeLocalAuthoritativeSnapshotV1(clone({ state: complete, checkpoint: source.checkpoint })),
    ).toEqual({ state: complete, checkpoint: source.checkpoint });
  });

  it("accepts canonical nonzero RNG checkpoints after a round advance", () => {
    const source = initialSnapshot();
    const complete = advanceTo(source.state, "roundComplete");
    if (complete.phase.kind !== "roundComplete" || complete.phase.result.nextRound === null) {
      throw new Error("Expected a nonfinal completed round.");
    }
    const advanced = advanceRound(
      complete,
      {
        type: "advanceRound",
        commandId: "persistence:advance",
        matchId: complete.matchId,
        expectedStateVersion: complete.stateVersion,
      },
      source.checkpoint,
    );

    expect(advanced.checkpoint.rng.drawCount).toBeGreaterThan(source.checkpoint.rng.drawCount);
    expect(
      decodeLocalAuthoritativeSnapshotV1(
        clone({ state: advanced.state, checkpoint: advanced.checkpoint }),
      ),
    ).toEqual({ state: advanced.state, checkpoint: advanced.checkpoint });
  });

  it("accepts canonical RNG states across binary jump-ahead boundaries", () => {
    for (const drawCount of [0, 1, 47, 128, 391]) {
      const random = createSeededRandomSource("00000000000000000000000000000003");
      for (let draw = 0; draw < drawCount; draw += 1) random.nextUint32();
      const source = clone(initialSnapshot()) as unknown as {
        checkpoint: { rng: EngineCheckpointV1["rng"] };
      };
      source.checkpoint.rng = clone(random.snapshot());

      expect(decodeLocalAuthoritativeSnapshotV1(source).checkpoint.rng).toEqual(random.snapshot());
    }
  });

  it("accepts JSON-round-tripped field-cancellation, lucky-win, and both-lucky automatic results", () => {
    const cancellation = automaticSnapshot(
      "field-cancellation",
      [
        "february-bush-warbler",
        "march-curtain",
        "april-cuckoo",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "september-sake-cup",
        "october-deer",
      ],
      [
        "february-red-text-scroll",
        "march-red-text-scroll",
        "april-red-scroll",
        "may-iris-plain-a",
        "june-peony-plain-a",
        "july-bush-clover-plain-a",
        "september-blue-scroll",
        "october-blue-scroll",
      ],
      [
        "january-crane",
        "january-red-text-scroll",
        "january-pine-plain-a",
        "january-pine-plain-b",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "august-moon",
      ],
    );
    const luckyWin = automaticSnapshot(
      "lucky-win",
      [
        "january-crane",
        "january-red-text-scroll",
        "january-pine-plain-a",
        "january-pine-plain-b",
        "march-curtain",
        "august-moon",
        "september-sake-cup",
        "december-phoenix",
      ],
      [
        "february-bush-warbler",
        "march-red-text-scroll",
        "april-cuckoo",
        "may-bridge",
        "june-butterfly",
        "july-boar",
        "october-deer",
        "november-rain",
      ],
      [
        "february-red-text-scroll",
        "march-cherry-plain-a",
        "april-red-scroll",
        "may-red-scroll",
        "june-blue-scroll",
        "july-red-scroll",
        "october-blue-scroll",
        "november-swallow",
      ],
    );
    const bothLucky = automaticSnapshot(
      "both-lucky",
      [
        "january-crane",
        "january-red-text-scroll",
        "february-bush-warbler",
        "february-red-text-scroll",
        "march-curtain",
        "march-red-text-scroll",
        "april-cuckoo",
        "april-red-scroll",
      ],
      [
        "may-bridge",
        "may-red-scroll",
        "may-iris-plain-a",
        "may-iris-plain-b",
        "june-butterfly",
        "june-blue-scroll",
        "june-peony-plain-a",
        "june-peony-plain-b",
      ],
      [
        "july-boar",
        "july-red-scroll",
        "august-moon",
        "august-geese",
        "september-sake-cup",
        "october-deer",
        "november-rain",
        "december-phoenix",
      ],
    );

    for (const [snapshot, expectedReason] of [
      [cancellation, "FIELD_FOUR_MONTH_CANCELLED"],
      [luckyWin, "LUCKY_FOUR_MONTH"],
      [bothLucky, "BOTH_LUCKY_DRAW"],
    ] as const) {
      expect(snapshot.state.phase).toMatchObject({
        kind: "roundComplete",
        result: { reasonCode: expectedReason },
      });
      expect(decodeLocalAuthoritativeSnapshotV1(clone(snapshot))).toEqual(snapshot);
    }
  });

  it("rejects missing and extra fields before passing values to engine validation", () => {
    const source = initialSnapshot();
    const missing = clone(source) as Record<string, unknown>;
    delete missing.checkpoint;
    const extra = clone(source) as Record<string, unknown>;
    extra.unexpected = true;

    expect(() => decodeLocalAuthoritativeSnapshotV1(missing)).toThrow("LOCAL_SNAPSHOT_INVALID");
    expect(() => decodeLocalAuthoritativeSnapshotV1(extra)).toThrow("LOCAL_SNAPSHOT_INVALID");
  });

  it("rejects nested extra fields and unsupported nested versions", () => {
    const source = clone(initialSnapshot()) as {
      state: { phase: Record<string, unknown> };
      checkpoint: { rng: { initialSeed: { version: number } } };
    };
    source.state.phase.unexpected = true;
    expect(() => decodeLocalAuthoritativeSnapshotV1(source)).toThrow("LOCAL_SNAPSHOT_INVALID");

    const unsupported = clone(initialSnapshot()) as {
      checkpoint: { rng: { initialSeed: { version: number } } };
    };
    unsupported.checkpoint.rng.initialSeed.version = 2;
    expect(() => decodeLocalAuthoritativeSnapshotV1(unsupported)).toThrow("LOCAL_SNAPSHOT_INVALID");
  });

  it("rejects accessors, symbols, exotic arrays, and sparse arrays", () => {
    const accessor = clone(initialSnapshot()) as unknown as { state: Record<string, unknown> };
    Object.defineProperty(accessor.state, "matchId", {
      enumerable: true,
      get: () => "persistence-match",
    });
    expect(() => decodeLocalAuthoritativeSnapshotV1(accessor)).toThrow("LOCAL_SNAPSHOT_INVALID");

    const symbols = clone(initialSnapshot()) as unknown as { state: Record<PropertyKey, unknown> };
    symbols.state[Symbol("private")] = true;
    expect(() => decodeLocalAuthoritativeSnapshotV1(symbols)).toThrow("LOCAL_SNAPSHOT_INVALID");

    const sparse = clone(initialSnapshot()) as unknown as {
      checkpoint: { rng: { state: number[] } };
    };
    delete sparse.checkpoint.rng.state[2];
    expect(() => decodeLocalAuthoritativeSnapshotV1(sparse)).toThrow("LOCAL_SNAPSHOT_INVALID");

    class UnsafeArray extends Array<number> {}
    const exotic = clone(initialSnapshot()) as unknown as {
      checkpoint: { rng: { state: number[] } };
    };
    exotic.checkpoint.rng.state = new UnsafeArray(...exotic.checkpoint.rng.state);
    expect(() => decodeLocalAuthoritativeSnapshotV1(exotic)).toThrow("LOCAL_SNAPSHOT_INVALID");
  });

  it("rejects duplicate card ownership, malformed RNG state, and checkpoint match mismatches", () => {
    const duplicate = clone(initialSnapshot());
    const card = duplicate.state.players[0].hand[0];
    if (card === undefined) throw new Error("Expected an opening hand card.");
    (duplicate.state.round.drawPile as unknown as string[])[0] = card;
    expect(() => decodeLocalAuthoritativeSnapshotV1(duplicate)).toThrow("STATE_INVARIANT_FAILED");

    const malformedRng = clone(initialSnapshot());
    (malformedRng.checkpoint.rng.state as unknown as number[]).splice(0, 4, 0, 0, 0, 0);
    expect(() => decodeLocalAuthoritativeSnapshotV1(malformedRng)).toThrow("RNG_SNAPSHOT_INVALID");

    const mismatch = clone(initialSnapshot()) as unknown as { checkpoint: { matchId: string } };
    mismatch.checkpoint.matchId = "another-match";
    expect(() => decodeLocalAuthoritativeSnapshotV1(mismatch)).toThrow("LOCAL_SNAPSHOT_INVALID");
  });

  it("rejects a structurally valid RNG snapshot whose state is inconsistent with its draw count", () => {
    const source = clone(initialSnapshot());
    const rng = source.checkpoint.rng as unknown as {
      state: [number, number, number, number];
      drawCount: number;
    };
    rng.drawCount = 1;
    rng.state[0] = (rng.state[0] ^ 1) >>> 0;

    expect(() => decodeLocalAuthoritativeSnapshotV1(source)).toThrow(
      "state does not match the initial seed and draw count",
    );
  });

  it("rejects a huge inconsistent draw count without linearly replaying untrusted storage", () => {
    const source = clone(initialSnapshot()) as unknown as {
      checkpoint: { rng: { drawCount: number } };
    };
    source.checkpoint.rng.drawCount = Number.MAX_SAFE_INTEGER;
    const startedAt = Date.now();

    expect(() => decodeLocalAuthoritativeSnapshotV1(source)).toThrow(
      "state does not match the initial seed and draw count",
    );
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it("does not mutate or partially accept a rejected storage value", () => {
    const malformed = clone(initialSnapshot()) as unknown as {
      checkpoint: { rng: { state: number[] } };
    };
    malformed.checkpoint.rng.state[0] = 0;
    malformed.checkpoint.rng.state[1] = 0;
    malformed.checkpoint.rng.state[2] = 0;
    malformed.checkpoint.rng.state[3] = 0;
    const before = JSON.stringify(malformed);

    expect(() => decodeLocalAuthoritativeSnapshotV1(malformed)).toThrow();
    expect(JSON.stringify(malformed)).toBe(before);
  });
});
