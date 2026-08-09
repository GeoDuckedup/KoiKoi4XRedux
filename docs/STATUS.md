# KoiKoi4x Project Status

**Updated:** August 9, 2026

**Overall state:** Greenfield rewrite, Phase 1E implemented and independently accepted; commit and
deployment verification in progress

**Runtime state:** Complete deterministic headless match engine with formal projections, replay,
hashes, retry-safe command receipts, and protocol records; visible site remains the tested PixiJS
boot surface

## Current result

Phase 1E completes the headless-engine boundary without adding presentation behavior. The engine now
projects exact public and named-player observations, filters events by audience, canonicalizes and
hashes deterministic data, records/replays the production command seams, and returns exact accepted
retries without applying or advancing them twice.

The protocol package now constructs and runtime-validates versioned public turn records. Private
hands, future draw order, RNG/checkpoints, seen-trigger history, command IDs, and server-only events
cannot enter a valid public record. The browser remains unchanged because rendering integration
belongs to Phase 2.

## Phase 1 headless foundation now present

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
- `PublicGameStateV1` exposes public captures/yaku/scores, zone counts, round facts, phase, and
  history while omitting both exact hands, future draw order, seen keys, command IDs, and RNG state.
- `PlayerObservationV1` adds only the named player's exact hand and legal actions; the other player
  receives counts only, and nonactive players receive no executable actions.
- Public/player event projection enforces audience policy. Lucky qualification remains hidden before
  automatic-result commit and the committed evidence reveals exactly the approved qualifying hand.
- Canonical JSON v1, portable SHA-256, private authoritative replay logs, public/private hash
  separation, and boundary-tamper detection are engine-owned and browser/Firebase independent.
- Immutable accepted-command receipts make exact Start/Gameplay/Advance retries safe after later
  state changes; conflicting key reuse rejects and failed commands do not enter the log/cache.
- `PublicTurnRecordV1` has protocol/canonical/hash versions plus a unique record sequence and strict
  runtime decoding that rejects private fields, unknown public fields, and hidden event types.
- Typed literal fixtures cover all 11 new Phase 1E IDs; the three retained history/evidence IDs stay
  bound to executable Phase 1D lifecycle traces.

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
- Canonical/hash/replay/idempotency contracts are pure immutable engine values. A future service is
  responsible only for authentication and atomic persistence of those returned values.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0005`](./adr/0005-phase-1c-yaku-trigger-boundaries.md).
The Phase 1D lifecycle split is recorded in
[`ADR 0006`](./adr/0006-phase-1d-round-lifecycle.md).
Phase 1E privacy, replay, hash, retry, and protocol choices are recorded in
[`ADR 0007`](./adr/0007-phase-1e-projection-replay-integrity.md).

## Validation

- `npm run validate:phase1e` passes 16 test files / 176 tests, including all prior Phase 1A–1D
  regressions, canonical/hash/projection/protocol/replay fixtures, and the generated gate.
- The generated gate passes 10,002 complete matches, exactly 3,334 per 3/6/12-round format, with
  production validation after every transition and sampled full replay/privacy/hash equality.
- `npm run check` passes formatting, zero-warning lint, all five workspace TypeScript checks, deck
  validation, 25 test files / 263 tests, and the 711-module production build.
- Five-viewport Playwright smoke and the game-client canvas/text-state inspection pass; the visible
  boot surface is intentionally unchanged.
- Three independent final reviews found no remaining blocker, high, or medium issue after adversarial
  privacy/schema, fixture-binding, sequence, and canonical-data repairs.
- Commit/push, hosted CI, Pages, and deployed-page verification remain in progress.

## Known constraints and risks

- Firebase persistence, authentication, membership checks, and transactional storage of the private
  replay/cache remain Phase 7 responsibilities; Phase 1E supplies their pure deterministic core.
- Turn-record construction/decoding is locked, while server-side grouping/publication of multi-command
  turns remains Phase 7 transaction ownership.
- The specialized CAP/YAKU fixture records predate full alignment with the generic
  `RuleFixtureSpec` description/rule-reference shape; their stable IDs, literal inputs/expectations,
  and executable production traces are locked, while metadata-shape unification remains test-infra
  cleanup.
- `KOI-015A/B` cannot occur under the locked rules: a 1x loser is both the next starter and
  the only privilege holder, the starter takes turns 1/3/.../15, and the nonstarter necessarily owns
  turn 16's final Draw. The owner selected Option A: their stable IDs now assert authoritative
  `ROUND_PRIVILEGE_INVALID` rejection rather than impossible scoring outcomes.
- The visible runtime remains the Phase 0B boot surface. Phase 1E has no gameplay UI.
- Hosted CI currently emits a nonblocking maintenance annotation that v4 checkout/setup/artifact
  actions target deprecated Node.js 20 and are being forced onto Node.js 24. The run remains green;
  workflow-action upgrades can be handled as isolated infrastructure maintenance.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No owner-side configuration is required for this headless phase.
2. Pull `main` if you want a local copy, then run `npm ci` and `npm run validate:phase1e` for an
   optional local verification.
3. Open the deployed page and confirm the intentionally unchanged KoiKoi4x boot surface loads.
4. Review Phase 1E through its automated projection/replay fixtures; visible gameplay controls will
   arrive when Phase 2 consumes the headless transition contracts.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 2A — Responsive Pixi table:** after Phase 1E's final gate and deployment, build the first
real gameplay presentation layer: responsive scene/layers, persistent card views, layout services,
input plumbing, and deterministic animation/director foundations that consume public/player
projections without reimplementing rules.
