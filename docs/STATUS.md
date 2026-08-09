# KoiKoi4x Project Status

**Updated:** August 8, 2026

**Overall state:** Greenfield rewrite, Phase 1D implemented, fully verified, and independently
accepted; deployment pending

**Runtime state:** Deterministic headless round/match lifecycle through Bank, Koi-Koi, End of Play,
history, and next-round deals; visible site remains the tested PixiJS boot surface

## Current result

Phase 1D implements the headless round lifecycle without adding presentation behavior. The engine now
offers actor-only Bank/Koi-Koi actions at Phase 1C decision windows, applies ordinary and special
multipliers, resumes the saved Hand/Draw continuation, resolves natural/final-Draw End of Play,
commits one durable typed result per month, and prepares the exact next starter/privilege or final
match result.

Round advancement is a separate deterministic command. It validates the completed state before
restoring the external RNG checkpoint, deals the next scheduled month with the existing privacy
audiences, retains cumulative score/history, resets every round-local value, and commits automatic
opening outcomes without a second score award. The browser remains unchanged because rendering
integration belongs to later phases.

## Phase 1D foundation now present

- Closed typed keys, stable display names, and canonical Rules-table ordering for Five/Four/Four
  with Rain/Three Brights, Blossom Viewing, Moon Viewing, Animal Trio, Red Text Scrolls, Blue
  Scrolls, Current-Month Set, Animals, Scrolls, and Plain Cards.
- Pure immutable evaluation from one player's unique captured CardIds and scheduled month, returning
  active yaku, exact total, category counts, and all active keys not yet seen by that player.
- Exclusive Bright replacement hierarchy, independent fixed/generic stacking, exact Sake Cup
  category behavior, and incremental points above 5 Animals, 5 Scrolls, and 10 Plain Cards.
- Typed player-local `seenYakuKeys`, `activeYaku`, and `currentYakuTotal`, reset during match setup and
  recomputed by authoritative-state validation.
- Atomic `awaitingYakuDecision` contexts containing every new yaku, the complete active-yaku list and
  total, capture phase, and a deterministic draw/turn/End-of-Play resume marker.
- Public `yakuCompleted`, `yakuValueChanged`, and `yakuDecisionRequired` events ordered after the
  public capture that caused them and containing no opponent hand or unrevealed draw identifiers.
- First-trigger-player tracking populated only by the round's first actual unseen active key and
  preserved across later Player A/Player B triggers for Phase 1D's final-leader rule.
- Exact decision timing for Hand capture, direct Draw capture, pending two-target Draw selection, and
  final Draw; seen incremental value changes do not open another decision.
- All 39 locked Phase 1C evaluator fixtures plus targeted production state-machine fixtures for
  multi-yaku, Current-Month sweep, increments, pending choice, Player B, and final Draw.
- Executable `chooseYakuDecision` commands and deterministic Bank-then-Koi legal actions, with Bank
  omitted only for the protected final-round leader's applicable ordinary 1× first trigger.
- Ordinary table progression 1→2→3→4→4, latest-caller replacement at the cap, privileged 1×/2× Bank,
  and privileged 1×→3× Koi-Koi with explicit visible/scoring multiplier separation.
- Direct result commitment for Hand Bank, Draw Bank, natural End of Play, and final-Draw Koi-Koi;
  latest-caller scoring can differ from the final actor, while no caller records an explicit 0–0.
- Typed `RoundResultV1` history with canonical reason, point deltas, active-yaku arithmetic,
  automatic public evidence, cumulative post-result scores, and exact next-round consequence.
- Scored 1×/2× loser and 3×/4× winner starter rules, January/later 0–0 rules, next-round-only
  privilege handling, frozen final-round leader selection, and terminal cumulative match results.
- External-checkpoint `advanceRound` plus ordered-deck fixture entry point, preserving private hands,
  server-only draw order, score/history, deterministic replay, and one-version transition semantics.
- Literal metadata/expectations for all 47 Phase 1D KOI/END-PLAY/TRANS/FINAL/HIST vectors, executable
  production traces for the 45 reachable cases, and a complete 16-turn natural round with eight
  unused draws. `KOI-015A/B` are explicit unreachable-policy rejection cases because their former
  premise conflicts with the next-starter/privilege and alternating-turn rules.

## Architecture decisions

- `rules/yaku.ts` is the sole pure scoring authority. It does not mutate state, emit events, execute
  Bank/Koi-Koi, apply multipliers, or depend on rendering/networking.
- Active yaku use canonical Rules-table order. Only one Bright tier is active at a time; an upgraded
  lower tier remains in seen-trigger history but no longer contributes to the active total.
- Every successful capture/placement resolution recomputes the actor's active snapshot. One capture
  phase can append several unseen keys but creates only one decision context.
- Trigger keys are marked seen when the decision window is committed, allowing authoritative
  validation to prove that the context is the exact newly appended suffix rather than a subset.
- Hand and Draw resume markers describe the unresolved continuation but are not player commands.
  Phase 1D consumes them through one decision command without an intermediate state version.
- Result commitment and next-deal advancement are separate authoritative transitions. This preserves
  an explicit result/presentation seam and keeps RNG checkpoints outside state and events.
- Phase 1E retains formal client projection/redaction, replay, hashes, and durable idempotency.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0005`](./adr/0005-phase-1c-yaku-trigger-boundaries.md).
The Phase 1D lifecycle split is recorded in
[`ADR 0006`](./adr/0006-phase-1d-round-lifecycle.md).

## Validation

- `npm run validate:phase1d` passes 13 test files / 158 tests, including the complete Phase
  1C regression plus Bank/Koi, final Draw, transition, final leader, round advance/checkpoint, final
  automatic result, and full natural-round traces.
- `npm run check` passes formatting, zero-warning lint, all five workspace TypeScript checks, deck
  validation, 22 test files / 245 tests, and the 711-module production build.
- The five-viewport Playwright smoke suite passes. The bundled web-game client reported the expected
  ready boot state and its screenshot was inspected with no browser error output.
- Three independent final reviews found no blocker, high, or medium issue after the owner-selected
  Option A rule correction and direct literal-fixture binding.

## Known constraints and risks

- Event audiences are semantic guarantees, not formal serialized client projections; Phase 1E must
  enforce projection/redaction and replay end to end.
- Only immediate duplicate command-ID reuse is rejected; durable idempotency storage belongs to the
  future authoritative service/protocol work.
- The specialized CAP/YAKU fixture records predate full alignment with the generic
  `RuleFixtureSpec` description/rule-reference shape; their stable IDs, literal inputs/expectations,
  and executable production traces are locked, while metadata-shape unification remains test-infra
  cleanup.
- `KOI-015A/B` cannot occur under the locked rules: a 1x loser is both the next starter and
  the only privilege holder, the starter takes turns 1/3/.../15, and the nonstarter necessarily owns
  turn 16's final Draw. The owner selected Option A: their stable IDs now assert authoritative
  `ROUND_PRIVILEGE_INVALID` rejection rather than impossible scoring outcomes.
- The visible runtime remains the Phase 0B boot surface. Phase 1D has no gameplay UI.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No owner-side configuration is required for this headless phase.
2. Rerun the focused, full, and browser gates, obtain final independent sign-off, then commit and
   push `main`.
3. The existing GitHub Actions and Pages workflows perform deployment from `main`.
4. No secret, Firebase project, database migration, asset upload, Pages setting, or cache action is
   required. The public page will remain the same boot surface because Phase 1D is headless.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 1E — Observations, replay, and deterministic verification:** after Phase 1D's final gate and
deployment, add formal player/spectator projections and redaction, versioned command/event
serialization, deterministic replay and hashes, durable idempotency semantics, and the deferred
projection/invariant vectors.
