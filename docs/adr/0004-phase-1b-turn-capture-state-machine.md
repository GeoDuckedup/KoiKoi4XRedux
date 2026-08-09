# ADR 0004: Phase 1B turn and capture state machine

**Status:** Accepted

**Date:** August 8, 2026

## Decision

Resolve Hanafuda placement and capture from the source card's month against field order. Zero
matches append the source to the field; one match captures the source and target; exactly two
matches require one selected target; and three matches capture the source plus all three targets as
a Four-Card Sweep. Captured order is always source first, followed by target cards in field order.

Carry an exact two-match hand selection on the atomic `playHandCard` command. A hand play resolves,
then the engine immediately reveals and resolves the first card of the ordered draw pile. The reveal
acknowledgement remains presentation-only. When a draw has exactly two targets, commit an
`awaitingDrawCapture` state instead: the drawn card becomes an authoritative card zone and the two
targets are stored as ordered references to cards still on the field. A `chooseDrawCapture` command
resolves that pair and completes the turn.

Every accepted gameplay command increments `stateVersion` exactly once and replaces
`lastAcceptedCommandId`; rejected commands throw a typed `EngineCommandError` without mutating the
input state. Gameplay accepts no random source and leaves the setup checkpoint unchanged outside the
transition. All Phase 1B movement and choice events are public semantic facts, but legal actions are
generated for one requesting player and never contain hidden hand or future draw data.

Leave explicit boundaries after Hand-Phase and Draw-Phase capture resolution for Phase 1C yaku
evaluation. When both hands become empty after the final Draw Phase, emit turn completion and enter
`awaitingEndOfPlayResolution`; Phase 1D owns Bank/Koi-Koi consequences, score, starter, history, and
round/match advancement. Phase 1E owns formal projection/redaction, replay, hashes, and durable
idempotency beyond immediate command-ID reuse.

## Consequences

- Equal authoritative state plus command produces byte-identical, recursively frozen state/events.
- Hand two-match selection costs one transition; draw two-match selection costs two transitions,
  each with one state-version increment.
- The pending drawn card participates in the 48-card ownership invariant without being placed or
  captured early.
- Untouched zones and field order remain stable, which makes replay and animation inputs
  deterministic.
- CAP-000 through CAP-DRAW-003 are complete executable 48-card fixtures rather than partial setup
  descriptions.
- The browser boot surface remains unchanged until a later presentation phase consumes these domain
  transitions.
