# ADR 0012: Phase 3A local round adapter and handoff boundary

**Status:** Accepted

**Date:** August 9, 2026

## Context

Phase 2D stopped at an immutable input intent over a technical observation. Phase 3A must execute a
real round without moving rules into the browser, leaking the opponent hand or future draw order,
or pretending that local execution is the future authenticated online transport.

## Decision

- A browser-local runtime owns one deterministic three-round engine match but exposes only the first
  round in this slice. It starts through `startMatch`, reads through `projectPlayerObservation`, and
  applies each accepted intent through `applyGameplayCommand` with a local command ID.
- The existing interaction controller remains rule-free. It receives only the current player's
  `PlayerObservationV1` and legal actions; the local adapter, not Pixi or DOM input, turns its intent
  into an engine command.
- The board projection shows the viewer's hand, public field/captures, and the currently revealed
  draw card. Opponent-hand and unrevealed-draw cards remain face-down, and their identities are
  omitted from `render_game_to_text`.
- Public engine events create recipient-relative animation boundaries. Newly public draw identity
  may replace an indistinguishable hidden back immediately before reveal. Legal field overflow is
  fanned over the stable 2×4 field lanes.
- A completed turn enters a full-table privacy cover before changing viewers. The next player's hand
  is projected only after that player activates the explicit Ready control.
- Public events accumulate into a concise HTML turn recap. The canvas is not the sole source of
  played, drawn, captured, turn-complete, or round-result text.
- The owner-approved `new-primary-deck` is the default runtime package. Build and development serve
  its checked-in generated runtime directory, while additional installed packages remain selectable
  texture-only alternatives.
- Phase 3A includes the existing engine Bank/Koi command seam so a round cannot deadlock, but Phase
  3B owns the finished yaku/decision presentation and Phase 3C owns the finished round-result screen.

## Consequences

- One full round is now playable locally with authoritative scoring/state, deterministic animation,
  pass-the-device privacy, and accessible recap text.
- This adapter is not persistence, CPU play, authentication, or network transport. Those remain in
  their scheduled phases.
- `render_game_to_text` reports only face-up card identities and public/player-scoped diagnostics;
  the persistent Pixi registry may retain local face-down objects without making them observable.
- A new local round restarts the locked Phase 3A deal. Multi-round continuation is intentionally
  deferred to the full local product phase.
