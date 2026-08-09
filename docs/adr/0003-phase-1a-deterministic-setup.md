# ADR 0003: Phase 1A deterministic setup boundary

**Status:** Accepted

**Date:** August 8, 2026

## Decision

Use a versioned `xoshiro128**` random source with an exact 128-bit lowercase hexadecimal seed,
serializable four-word state, and draw count. Use rejection sampling for unbiased bounded integers
and immutable Fisher–Yates shuffling. A normal match start consumes randomness in one locked order:
shuffle all 48 canonical cards first, then select the starter when the command did not provide one.

Deal the shuffled deck with the versioned `8 / 8 / 8 / 24` slice layout: player A hand, player B
hand, field, then ordered draw pile. Commit the complete initial authoritative state as state version
1, validate all 48 cards across authoritative zones, and keep the RNG snapshot in a server-only
checkpoint rather than gameplay state.

Evaluate opening outcomes in strict precedence order: complete field month cancellation, then lucky
hands, then normal play. Field cancellation never evaluates or reveals lucky hands. Automatic lucky
results commit before full qualifying-hand evidence becomes public. Setup events declare public,
per-player private, or server-only audiences so Phase 1E can project them without recovering lost
privacy intent.

Phase 1A commits automatic opening points and leaves a completed round transition pending. Phase 1D
owns next-starter selection, special privilege, round/match advancement, and durable recap/history.
Phase 1E owns formal client projections, replay, and wire-level privacy enforcement.

## Consequences

- Equal seeds and commands produce byte-identical state, events, and checkpoints.
- Invalid start commands are rejected before consuming random draws.
- The RNG algorithm, seed representation, shuffle, deal layout, state, and checkpoint formats are
  explicit versioned contracts rather than ambient platform behavior.
- Engine source may not use `Math.random`, clocks, timers, browser APIs, PixiJS, Firebase, or
  deck-format data.
- Authored ordered decks are a deterministic fixture/practice entry point; production starts use the
  random source.
- DEAL-001 through DEAL-012 lock the opening outcome, scoring, evidence, ordering, and visibility
  behavior before player-controlled turns are introduced.
