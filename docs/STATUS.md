# KoiKoi4x Project Status

**Updated:** August 8, 2026

**Overall state:** Greenfield rewrite, Phase 1A implemented

**Runtime state:** Deterministic headless match setup; visible site remains the tested PixiJS boot
surface

## Current result

Phase 1A establishes the first gameplay-domain transition without adding presentation behavior. The
engine can validate a start command, shuffle the canonical 48-card catalog from a reproducible seeded
source, select or accept the starter, deal immutable 8/8/8/24 zones, evaluate automatic opening
outcomes in canonical precedence, commit an authoritative versioned state, emit audience-tagged
semantic events, and preserve a restorable RNG checkpoint.

All twelve named DEAL vectors now run against concrete full-deck fixtures. The live browser remains
unchanged by design: turns, capture, yaku during play, and rendering integration belong to later
subphases.

## Phase 1A foundation now present

- Versioned `xoshiro128**` source with exact 128-bit hexadecimal seeds, serializable four-word state,
  draw count, restoration, and unbiased bounded integers.
- Immutable Fisher–Yates shuffle with the locked production consumption order: shuffle first, then
  starter selection when a starter was not provided.
- Versioned `8 / 8 / 8 / 24` slice deal: player A, player B, field, ordered draw pile.
- JSON-safe, recursively frozen match/player/round/phase/result/event/checkpoint contracts.
- Atomic state version 1 containing match length, scheduled round/month, starter, scores, all card
  zones, reset round-local fields, transition state, and reserved history boundary.
- Strict opening order: field complete-month cancellation, lucky hands, then normal play.
- Exact lucky behavior for one/two complete hand months, exact `[2,2,2,2]`, simultaneous lucky hands,
  one 6-point result at 1×, and no ordinary-yaku or decision flow.
- Complete evidence for one or two cancelled field months and qualifying lucky hands in canonical
  month/card order.
- Public, per-player private, and server-only event audiences. Lucky evidence becomes public only
  after the automatic result commits; field cancellation performs no lucky evaluation/reveal.
- Stable ownership/setup validation for unknown, duplicate, missing, total/zone-count-invalid cards,
  reset fields, scores, result/evidence consistency, versions, and new-match metadata.
- Concrete, exact 48-card DEAL-001 through DEAL-012 fixtures plus architecture guards against ambient
  randomness, clocks/timers, rendering, browser, backend, and deck-format dependencies.

## Architecture decisions

- Randomness is injected and checkpointed; engine behavior never reads platform randomness or time.
- The seed, random algorithm, shuffle algorithm, deal layout, state, and checkpoint are explicit
  versioned contracts.
- Production starts consume a random source. Ordered-deck starts exist for authored fixture/practice
  behavior and must still pass the same production state/outcome validation.
- Automatic opening score is committed in Phase 1A, but next starter, special privilege,
  round/match advancement, recap/history completion, and final-match completion remain Phase 1D.
- Event audiences preserve privacy intent now; formal public/player projections, redaction, command
  replay, and deterministic state hashes remain Phase 1E.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0003`](./adr/0003-phase-1a-deterministic-setup.md).

## Validation

- `npm run validate:phase1a` passed 7 test files / 87 tests covering RNG golden output and restore,
  immutable shuffle, exact deal slices, setup reset, ownership invariants, outcome classifiers,
  automatic scores, all twelve DEAL fixtures, event ordering/audiences, and privacy evidence timing.
- Clean `npm ci` passed from the authoritative lockfile: 156 packages installed.
- `npm run check` passed: formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 15 test files / 119 tests, and the 711-module production build.
- The unchanged boot surface passed browser smoke at 360×640, 390×844, 768×1024, 1366×768, and
  1920×1080 with no browser/runtime error.
- Independent read-only review verified the reference RNG algorithm, command/random-consumption
  boundaries, deal and outcome rules, evidence/privacy ordering, fixtures, and phase ownership after
  repairs; no blocker, high, or medium issue remains.
- GitHub CI, Pages deployment, and cache-busted live-site verification remain before final handoff.

## Known constraints and risks

- There is no player-controlled turn yet; Phase 1B owns hand play, capture choices, draw resolution,
  legal actions, and the turn phase state machine.
- Automatic completed-round transitions intentionally remain pending until Phase 1D defines starter,
  privilege, round/month, match completion, and durable recap/history behavior.
- Event audiences are semantic guarantees at this stage, not formal serialized client projections;
  Phase 1E must enforce projection/redaction and replay end to end.
- The visible runtime remains the Phase 0B boot surface. This subphase has no gameplay UI to test.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No secret, Firebase project, database migration, asset upload, Pages setting, or cache action is
   required.
2. After pulling the Phase 1A commit, run `npm ci`, `npm run validate:phase1a`, and `npm run check`.
3. The push to `main` automatically runs CI and the existing GitHub Pages workflow.
4. The public page should remain the same KoiKoi4x boot surface; Phase 1A is headless and adds no
   browser UI or test controls.
5. Review Phase 1A as the deterministic setup/rules foundation. Its visible behavior will first be
   exercised by the later rendering integration.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 1B — Turn and capture state machine:** implement legal hand play, 0/1/2/3 same-month match
behavior, explicit two-target choices, four-card sweeps, ordered draw resolution, legal-action
generation, and the hand-play → hand-capture → draw → draw-capture phase sequence. It remains
headless/test-driven and will execute CAP-000 through CAP-DRAW-003.
