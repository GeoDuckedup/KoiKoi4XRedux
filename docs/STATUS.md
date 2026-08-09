# KoiKoi4x Project Status

**Updated:** August 8, 2026

**Overall state:** Greenfield rewrite, Phase 1B implemented, reviewed, pushed, and deployed

**Runtime state:** Deterministic headless match setup and complete capture turn loop; visible site
remains the tested PixiJS boot surface

## Current result

Phase 1B adds player-controlled turns to the headless engine without adding presentation behavior.
The engine now validates versioned gameplay commands, enumerates legal actions for the active player,
resolves 0/1/2/3 same-month hand and draw matches, preserves a revealed card while a two-target draw
choice is pending, completes turns deterministically, and hands End of Play to the future Phase 1D
round resolver.

All eight named CAP vectors execute from concrete 48-card 8/8/8/24 deals through the production
transition API. The Hand-Phase and Draw-Phase yaku checks remain explicit Phase 1C insertion seams.
The live browser remains unchanged by design because rendering integration belongs to Phase 2/3.

## Phase 1B foundation now present

- Immutable 0/1/2/3 capture inspection and resolution with field-order preservation, source-first
  capture order, selected pairs, zero-match placement, and Four-Card Sweeps.
- Versioned `playHandCard` and `chooseDrawCapture` commands carrying match, actor, expected-state, and
  command identity metadata.
- Atomic exact-two hand selection and authoritative `awaitingDrawCapture` persistence for exact-two
  draw selection.
- Ordered top-card draw reveal immediately after the Hand Phase; draw acknowledgement remains a UI
  concern and is not an engine command.
- Player-scoped legal actions in stable hand/field order, including both legal two-match targets.
- Typed command rejections for invalid metadata, actor, phase, card ownership, or target; rejected
  commands do not mutate or advance state.
- Exactly one state-version increment per accepted command and byte-identical immutable results for
  equal state/command inputs.
- Public semantic events for hand play, draw reveal, placement, capture, capture choice, turn
  completion, and End of Play without still-hidden card identifiers.
- Expanded 48-card ownership and progress invariants, including a pending drawn-card zone and exact
  pending-target validation.
- An explicit `awaitingEndOfPlayResolution` handoff after both hands empty, with eight unused draw
  cards, while Phase 1D retains score/round/match consequences.
- Complete CAP-000, CAP-001, CAP-002A, CAP-002B, CAP-003, CAP-DRAW-001, CAP-DRAW-002, and
  CAP-DRAW-003 fixture allocations and checkpoints.

## Architecture decisions

- Capture movement is source first followed by selected field card(s) in current field order;
  untouched cards keep their order and placements append.
- A hand two-match choice is part of `playHandCard`; a draw two-match choice persists between
  commands because the draw card has already become public.
- Normal turn processing consumes no randomness. The Phase 1A checkpoint remains an external
  server-owned value for later rounds.
- Hand and draw resolution remain separate yaku-check boundaries so Phase 1C can support two yaku
  decisions in one turn without rewriting capture behavior.
- Phase 1D owns End-of-Play scoring and round/match advancement. Phase 1E owns formal projections,
  redaction, replay, hashes, and durable command idempotency.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0004`](./adr/0004-phase-1b-turn-capture-state-machine.md).

## Validation

- `npm run validate:phase1a` passed 8 test files / 93 tests, preserving seeded setup, deal,
  ownership, outcome, and event regressions alongside the new engine primitive.
- `npm run validate:phase1b` passed 9 test files / 64 tests covering pure capture behavior, every
  CAP fixture/checkpoint, both two-match targets, legal-action privacy, command rejections,
  determinism/freezing, pending-card invariants, player-B turns, and the full End-of-Play path.
- `npm run check` passed formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 18 test files / 151 tests, and the 711-module production build.
- Independent read-only review found two medium issues: Phase 1A validation-code compatibility and
  starter-relative active-player validation. Both were repaired with isolated regressions; fixture
  deep-freezing and the progress record were also tightened. No blocker, high, or medium issue
  remains after repair.
- Implementation commit `7daf664` was pushed to `origin/main`. Hosted CI run `31288042436` passed
  in 1m01s, including the clean repository check, five-viewport browser smoke, and artifact upload.
- Pages run `31288042439` passed its build and deploy jobs. A cache-busted live request returned HTTP
  200 with repository-prefixed assets, and the live web-game client reported `screen: "boot"`,
  `ready: true`, one canvas, and deterministic 100 ms simulated time. The inspected composition is
  intentionally unchanged.

## Known constraints and risks

- Yaku evaluation and trigger state are not yet implemented; Phase 1C owns both phase checks, all
  approved yaku, incremental totals, and combined trigger decisions.
- Bank/Koi-Koi commands and End-of-Play scoring intentionally remain pending until Phase 1D.
- Event audiences are semantic guarantees, not formal serialized client projections; Phase 1E must
  enforce projection/redaction and replay end to end.
- Immediate duplicate command-ID reuse is rejected, but durable idempotency storage belongs to the
  future authoritative service/protocol work.
- The visible runtime remains the Phase 0B boot surface. This subphase has no gameplay UI.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No secret, Firebase project, database migration, asset upload, Pages setting, or cache action is
   required.
2. After pulling the Phase 1B commit, run `npm ci`, `npm run validate:phase1b`, and `npm run check`.
3. The push to `main` automatically runs CI and the existing GitHub Pages workflow.
4. The public page should remain the same KoiKoi4x boot surface; Phase 1B is headless and adds no
   browser UI or manual test controls.
5. Review Phase 1B through its automated CAP fixtures and state-machine tests. Visible turn behavior
   will first arrive when the renderer consumes these transitions.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 1C — Yaku and trigger system:** implement every approved fixed and incremental yaku, Bright
replacement hierarchy, Current-Month Set, active-yaku totals, seen trigger keys, Hand/Draw yaku
checks, and one combined decision context for all newly completed yaku in a phase. Phase 1D will own
the actual Bank/Koi-Koi actions and their round/match consequences.
