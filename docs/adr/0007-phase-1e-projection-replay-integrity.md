# ADR 0007: Phase 1E projection, replay, and integrity contracts

**Status:** Accepted

**Date:** August 9, 2026

## Decision

Keep public/player projection, canonical serialization and hashing, authoritative replay, and the
immutable idempotency core in `packages/engine`. Keep versioned public wire records and runtime
decoding in `packages/protocol`; the protocol package may import engine contracts, but the engine
must never import protocol, browser, Firebase, Node crypto, or presentation modules.

`PublicGameStateV1` exposes both players' public score, captures, active yaku, and hand count, plus
the public field, draw-pile count, round facts, pending public phase, result, and history. It omits
both exact hands, unrevealed draw order, seen-trigger keys, accepted command IDs, RNG, and
checkpoints. `PlayerObservationV1` adds only the named player's exact hand and legal actions.
Public event projection admits only public-audience events; a player projection additionally admits
that player's private initial-hand event. Server-only events are unrepresentable in projected event
unions.

Use canonical JSON version 1 for deterministic integrity data. It accepts JSON-safe null, booleans,
strings, finite safe integers, arrays, and plain records; sorts record keys lexicographically;
preserves array order; and rejects unsupported values, prototypes, symbols, and cycles. Hash the
canonical UTF-8 bytes with portable synchronous SHA-256 and encode hashes as lowercase
`sha256:<hex>`. Public-state hashes and private authoritative/checkpoint hashes are separate.

An `AuthoritativeReplayLogV1` is private diagnostic/server data. It records the initial RNG snapshot
and each accepted semantic Start, Gameplay, or Advance command with exact before/after state,
checkpoint, event, and public-state hashes. Replay calls the same production seams, verifies every
sequence and hash boundary, and carries the checkpoint unchanged through gameplay commands. Ordered
deck fixture entry points never appear in production replay logs.

The engine's immutable idempotency runtime stores accepted receipts by `(matchId, commandId)`.
After authentication and membership checks in a future service, an exact retry lookup occurs before
active-player and expected-version validation. The same principal and canonical command returns the
original transition without changing current state, checkpoint, log, or cache. Reusing an accepted
key with different payload or principal rejects as `IDEMPOTENCY_KEY_CONFLICT`. Rejected commands are
never cached.

`PublicTurnRecordV1` adds a unique monotonic `recordSequence` alongside the round-local
`turnNumber`, records canonical/hash versions, a public before-state, public events, and the
resulting public-state hash. `committedAt` is transport metadata and is excluded from deterministic
state/event hashes. System records use `recordKind: "system"` and `actorId: null`; player records
may aggregate several accepted subcommands until turn, round, or match completion. Exact service
persistence and publication remain Phase 7 responsibilities.

## Consequences

- CPU and client code can consume a typed observation without access to opponent cards, future draw
  order, RNG, checkpoints, or server-only events.
- Lucky-hand identities remain absent from the public event prefix before automatic-result commit
  and become public only through the committed evidence event/result.
- Equal public facts hash equally even when hidden future-affecting state differs; the private
  authoritative hash still detects that difference.
- Hashes prove deterministic equality and drift, not authenticity or authorization.
- Exact retries remain safe after later accepted commands and cannot roll current runtime backward.
- Runtime decoders reject unsupported versions, forbidden content, unknown public fields, and
  non-public event shapes.
- Phase 1E acceptance executes 10,002 seeded complete matches split evenly across 3-, 6-, and
  12-round formats, with authoritative validation after every production transition and sampled
  full replay/public-privacy hash equality in addition to literal targeted vectors.
