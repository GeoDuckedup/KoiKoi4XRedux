# KoiKoi4x Project Status

**Updated:** August 8, 2026

**Overall state:** Greenfield rewrite, Phase 1C implemented and independently reviewed; deployment in
progress

**Runtime state:** Deterministic headless turns with exact active-yaku totals and Hand/Draw trigger
boundaries; visible site remains the tested PixiJS boot surface

## Current result

Phase 1C completes the scoring and trigger layer of the headless engine without adding presentation
behavior. The engine evaluates all 13 approved yaku keys from captured cards, maintains the complete
active-yaku total, marks newly active trigger keys per player, and pauses at exactly one combined
decision context for each triggering Hand or Draw phase.

A Hand trigger commits before any draw card is revealed. A direct or chosen Draw trigger commits
before turn completion, including the final Draw where the context records the Phase 1D End-of-Play
resume path. Phase 1C intentionally provides no Bank/Koi-Koi command or legal action; Phase 1D owns
decision availability, multipliers, scoring, round completion, and match consequences. The browser
remains unchanged because rendering integration belongs to later phases.

## Phase 1C foundation now present

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
  Phase 1D will add executable Bank/Koi-Koi commands and legal actions.
- Phase 1E retains formal client projection/redaction, replay, hashes, and durable idempotency.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0005`](./adr/0005-phase-1c-yaku-trigger-boundaries.md).

## Validation

- `npm run validate:phase1c` passes 12 test files / 115 tests, covering the full engine regression
  surface, eight CAP fixtures, 39 literal YAKU vectors, all targeted trigger boundaries, immutable
  results, public-event privacy, exact state versions, and authoritative validation.
- `npm run check` passes formatting, zero-warning lint, all five workspace TypeScript checks,
  development deck validation, 21 test files / 202 tests, and the 711-module production build.
- Five-viewport Playwright smoke passes. The bundled web-game runtime inspection reports
  `screen: "boot"`, `ready: true`, one canvas, and deterministic simulated time; its screenshot was
  inspected and remains the intended Phase 0B composition.
- Independent scoring, state-machine, and fixture reviews found no blocker/high issue. Their
  fabricated seen-trigger history, partly derived expected results, and missing multi-action
  Current-Month trace findings were repaired; follow-up reviews report no remaining blocker, high,
  or medium issue.
- Hosted CI and Pages verification remain to be recorded before Phase 1C is declared deployed.

## Known constraints and risks

- Bank/Koi-Koi commands, option availability, forced-Koi/special-privilege logic, multipliers,
  End-of-Play scoring, starter selection, and round/match advancement intentionally remain Phase 1D.
- Event audiences are semantic guarantees, not formal serialized client projections; Phase 1E must
  enforce projection/redaction and replay end to end.
- Immediate duplicate command-ID reuse is rejected, but durable idempotency storage belongs to the
  future authoritative service/protocol work.
- The specialized CAP/YAKU fixture records predate full alignment with the generic
  `RuleFixtureSpec` description/rule-reference shape; their stable IDs, literal inputs/expectations,
  and executable production traces are locked, while metadata-shape unification remains test-infra
  cleanup.
- The visible runtime remains the Phase 0B boot surface. Phase 1C has no gameplay UI.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No secret, Firebase project, database migration, asset upload, Pages setting, or cache action is
   required.
2. After pulling the Phase 1C commit, run `npm ci`, `npm run validate:phase1c`, and `npm run check`.
3. The push to `main` automatically runs CI and the existing GitHub Pages workflow.
4. The public page should remain the same KoiKoi4x boot surface; Phase 1C is headless and adds no
   browser UI or manual test controls.
5. Review Phase 1C through the automated YAKU fixtures and state-machine tests. Visible scoring
   decisions will first arrive when a later renderer consumes these transition contracts.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 1D — Bank, Koi-Koi, End-of-Play, and round/match rules:** add executable decision commands,
1×–4× table progression, most-recent-caller exhaustion scoring, special 2× privilege, final-round
forced-Koi handling, starter rules, score/history records, and deterministic round/match advancement.
