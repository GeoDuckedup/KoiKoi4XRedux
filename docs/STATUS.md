# KoiKoi4x Project Status

**Updated:** August 9, 2026

**Overall state:** Greenfield rewrite, Phase 2D selection/input implemented, independently accepted,
committed, and deployed; owner review next

**Runtime state:** Complete deterministic headless match engine with formal projections, replay,
hashes, retry-safe command receipts, and protocol records, plus a presentation-only responsive Pixi
table with 48 persistent canonical CardViews, two locally switchable technical packages, one
deterministic semantic animation queue, and an intent-only accessible input harness

## Current result

Phase 2D consumes an injected recipient-scoped observation and its legal actions through a pure
presentation controller. Guided/Fast pointer and keyboard paths emit one immutable diagnostic intent
without a command ID, engine execution, RNG, or state mutation.

The browser consumes a strict, complete runtime manifest rather than authoring source/transform
data. Two generated technical packages exercise all 48 faces, a back, repository-base routing, and
atomic local switching. Five animation scenarios exercise persistent identities and interruption
behavior. They remain intentionally non-final development fixtures rather than a playable or
privacy-safe match. Phase 2D's browser fixture is explicitly technical and does not execute intents.

## Phase 2D input runtime now present

- Pure `InteractionControllerV1` over one `PlayerObservationV1`, legal actions, public confirmation
  hints, confirmation policy, and external presentation locks.
- Guided explicit confirmation, Fast immediate single-action emission, and explicit target choice
  whenever several legal capture actions exist.
- Draw-capture and Bank/Koi-Koi controls sourced only from current legal actions, with one-intent
  duplicate suppression until a newer observation identity arrives.
- Minimal frozen intent values containing match, expected state version, actor, and legal action;
  no command ID, display scoring metadata, authoritative state, RNG, replay, or engine transition.
- Persistent Pixi selection/focus/legal-target highlights kept separate from trusted animation
  projection state and all 48 persistent CardView identities.
- Semantic DOM card buttons with layout-derived hit areas, roving arrow/Home/End focus, Enter/Space,
  Escape, visible focus, selection state, and name/month/category/action labels.
- Animation, deck-loading, opponent-turn, replay/disconnect, and round-transition locks clear stale
  selection and suppress the semantic input surface.
- Four frozen technical input phases cover Hand, Draw capture, Yaku decision, and opponent turn. The
  current page displays emitted intents locally and never executes them.

## Phase 2C presentation runtime now present

- Pure immutable event-boundary projections and planner output for Hand-to-Field, Pair Capture,
  Draw/Reveal/Flip, Four-Card Sweep, and semantic Koi-Koi feedback.
- One FIFO AnimationDirector with Normal, Fast, Instant, and Reduced Motion duration policies; all
  four settle to the same exact projection.
- Deterministic `advanceBy`, first-tap acceleration, second-tap/immediate finish, explicit
  cancel-and-snap, destruction safety, and rejection of a queued plan with the wrong source.
- Persistent CardViews move through Effects/transit and flip at a dedicated midpoint; settlement
  leaves no transit view or queued clip.
- Live resize rebases active source/target geometry at the same normalized progress. A mid-flight
  deck change alters only texture bindings and preserves the clip, position, identity, and queue.
- Accessible technical scenario/motion/Play/Faster/Finish/Cancel controls overlay the previously
  reserved action area, preserving the minimum supported 320×568 canvas.
- `render_game_to_text` now reports only presentation-safe animation mode/status/clip/counts and
  projection fingerprints in addition to prior scene/deck/layout diagnostics.

- Pure deterministic layout modes for compact portrait, portrait/tablet, short landscape, and
  desktop, derived from the actual canvas rather than the browser window.
- All fourteen DESIGN logical card zones, three reserved UI zones, stable 5:8 field/hand/draw/reveal
  slot geometry, a 44-pixel minimum action target, and structural clip/overlap diagnostics.
- Ten persistent Pixi containers from Background through Interaction Overlay; redraw clears only
  layer content and never recreates the scene/layer hierarchy.
- Mobile vertical hierarchy, dedicated landscape composition, and desktop lateral capture rails,
  with semantic DOM status and a canvas description.
- Exactly 48 persistent CardViews keyed by canonical CardId, with stable object tokens, presentation
  zone/layer assignments, face/back state, and in-place texture replacement.
- Strict `RuntimeDeckManifestV1` decoding: exact card coverage, one back, ART_SPEC v1 dimensions,
  safe local paths, provenance, approval status, and hostile-data rejection.
- Complete reproducible `technical-sunrise` and `technical-moonlight` packages, both visibly and
  machine-readably labeled technical placeholders rather than final artwork.
- Candidate-wide preload and atomic activation; a failed package leaves the prior package active
  and unloads candidate successes.
- Local accessible deck selection with no engine/protocol/replay/command mutation.
- Versioned machine-readable diagnostics preserving the one-canvas, stopped-ticker,
  deterministic-time, fullscreen, CardView-identity, and GitHub Pages base-path contracts.

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
The authored/runtime deck boundary, persistent-card identity, and atomic local-switch policy are
recorded in [`ADR 0008`](./adr/0008-phase-2b-persistent-card-runtime.md).
Phase 2C semantic planning, queue, motion, and interruption choices are recorded in
[`ADR 0009`](./adr/0009-phase-2c-animation-director.md).
Phase 2D observation, intent, confirmation, semantic-overlay, and execution boundaries are recorded
in [`ADR 0010`](./adr/0010-phase-2d-input-intent-boundary.md).

## Validation

- Phase 2D's focused gate passes 8 files / 76 tests and byte-checks all 100 generated technical
  artifacts. Both seven-viewport root and `/KoiKoi4XRedux/` baseline matrices and each base's complete
  390×844 interaction trace pass with zero browser/network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, authored-deck
  validation, 31 files / 335 tests including 10,002 generated matches, and a 761-module build.
- The bundled game client reported `inputRuntime`, one selected Hand card, the exact two legal public
  targets, ten semantic controls, 48 stable CardViews, and `intentExecution:notExecuted`; its
  screenshot and the Guided/Yaku/desktop browser screenshots were inspected.
- Three independent Phase 2D reviews report no blocker, high, or medium finding after source-phase,
  exact Draw target, monotonic observation, duplicate suppression, and DOM focus hardening.
- Hosted CI run `31322149519` passed the full repository and Phase 2D gates. Pages run `31322149502`
  passed its repository-prefixed matrix and deployed commit `05800e0`. A cache-busted live run
  selected April Cuckoo, exposed exactly two legal targets, reported ten semantic controls and 48
  stable CardViews, and retained `intentExecution:notExecuted`.
- Phase 2C's focused unit gate passes 7 files / 60 tests and byte-checks all 100 generated technical
  artifacts. Both seven-viewport root and `/KoiKoi4XRedux/` browser matrices pass.
- `npm run validate:phase1e` passes 16 test files / 176 tests, including all prior Phase 1A–1D
  regressions, canonical/hash/projection/protocol/replay fixtures, and the generated gate.
- The generated gate passes 10,002 complete matches, exactly 3,334 per 3/6/12-round format, with
  production validation after every transition and sampled full replay/privacy/hash equality.
- Hosted CI run `31316814794` passed the exact Phase 2C implementation commit: 30 files / 319 tests,
  the complete 10,002-match generated gate, the 756-module production build, all 100 technical deck
  artifacts, 7 files / 60 focused tests, and both seven-viewport browser matrices. A final local
  combined rerun had previously timed out only because an external 99%-CPU process starved the same
  generated test; the uncontended hosted result closes that environmental verification gap.
- Seven-viewport Phase 2C smoke passes root and repository-prefixed builds, all four modes, live
  mid-clip resize, mid-clip deck switching, accelerate, finish, cancel/snap, fullscreen, stable scene
  and CardView identities, exact target settlement, and zero console/network errors.
- The bundled game-client reported `animationRuntime`, 48 unique persistent CardViews, idle equal
  display/target fingerprints, the active technical package, and no diagnostics. Its canvas and
  representative 320×568, 390×844 mid-draw, and 1366×768 browser screenshots were inspected.
- Three independent Phase 2C planner/privacy, Pixi/runtime, and fixture/deployment reviews report no
  blocker, high, or medium finding after FIFO empty-plan, exact projection-equality, and settled
  chrome-refresh hardening.
- Pages run `31316814785` deployed commit `0139892`. A cache-busted live browser run completed the
  Hand-to-Field scenario with equal display/target fingerprints, 48 unique persistent CardViews,
  no queued/transit card, and no browser error.

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
- The Phase 2D table is a technical animation/input harness, not a playable match. Its visible CardIds
  include local opponent/draw fixture allocations and must not be mistaken for a public engine
  observation. A real recipient adapter must represent hidden identities as opaque backs/counts.
  Real observation-to-board presentation and local execution remain Phase 3.
- Both installed packages are generated technical placeholders. The real four-card pilot decision,
  complete art production, Workshop/importer, and final visual approval remain Phase 2E.
- Hosted CI currently emits a nonblocking maintenance annotation that v4 checkout/setup/artifact
  actions target deprecated Node.js 20 and are being forced onto Node.js 24. The run remains green;
  workflow-action upgrades can be handled as isolated infrastructure maintenance.
- Final artwork, Firebase, persistence, multiplayer, CPU play, and finished rendering remain deferred.

## Owner verification and deployment steps

1. No owner-side configuration is required for Phase 2D.
2. After deployment, refresh the live page. In Hand choices, select a card in Guided mode, inspect
   its legal highlight, then confirm or cancel. Try Fast, Draw targets, Yaku decision, and Opponent
   locked. The status must say the intent was not executed.
3. Use Tab/arrow keys, Enter/Space, and Escape to verify visible keyboard focus and cancellation.
   Scenario/Motion/Faster/Finish/Cancel + snap and Sunrise/Moonlight switching remain available.
4. Pull `main`, run `npm ci`, and run `npm run validate:phase2d` only if optional local verification
   is desired.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 2E — Deck Workshop and final visual approval:** add the importer/editor workflow, complete
package management, finish all 48 production faces and back, and obtain explicit visual approval.
