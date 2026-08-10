# KoiKoi4x Project Status

**Updated:** August 9, 2026

**Overall state:** Greenfield rewrite through Phase 3B deployed and accepted; Phase 3C round-end
presentation is implemented and locally accepted, with hosted deployment verification pending

**Runtime state:** Complete deterministic headless match engine plus a playable browser-local first
round using real player observations and commands, the owner-approved primary deck, persistent Pixi
cards, deterministic public-event animation, private pass-the-device handoff, accessible turn recap,
and the retained local-only deterministic deck Workshop/raster review pipeline

## Current result

Phase 3C implementation and local acceptance are complete. Twelve `PRES-RESULT-*` contracts verify
authoritative Bank,
End-of-Play, no-score, automatic evidence, privileged multiplier, next-starter, match-result,
privacy, and modal-lock presentation. The browser will display only public result/history/event
facts; the browser does not calculate scoring or transition policy.

The responsive result dialog opens only after card motion and the Phase 3B consequence beat. It
copies public scoring arithmetic, explicit table/scoring multipliers, committed automatic evidence,
score deltas/totals, terminal winner/tie, and next-round consequences. Card and unrelated toolbar
controls remain locked until the focused result action is chosen.

The next-round shell shows the authoritative next month/starter/privilege, then offers an explicitly
named local one-round restart. It does not call `advanceRound` or mislabel the January reset as the
displayed next month; full local match execution remains Phase 5.

Phase 3B completes the deterministic local runtime's player-facing Yaku and Bank/Koi-Koi seam. The
browser displays canonical public Yaku progress for both players, presents one accessible combined
decision per capture phase, and copies Bank/Koi-Koi arithmetic only from authoritative legal
actions. Public feedback is shown after cards settle and before decision focus; a pending decision
locks all unrelated controls.

The Phase 3A foundation replaces the technical browser fixture with a deterministic local runtime.
The existing rule-free input controller consumes the active player's real `PlayerObservationV1`;
its intent is turned into one engine gameplay command, and public engine events drive the trusted
animation boundaries and accessible recap. The whole first round is executable, including exact
capture choices and the existing Bank/Koi engine seam.

A completed turn covers the full table before the active observation changes. Player B's hand is
not projected until the Ready button is activated. The serialized text surface includes only
face-up identities and player/public state, never opponent-hand assignment, unrevealed draw order,
RNG, checkpoint, or command IDs.

The approved `new-primary-deck` v1.0.0 is the default root/Pages runtime package. Technical Sunrise
and Moonlight remain optional installed packages, proving that more decks can be added without
changing engine state or canonical CardIds.

## Phase 3C implemented and locally accepted

- Twelve typed, deeply frozen `PRES-RESULT-*` fixtures and a pure public-result mapper cover Bank,
  End of Play, 0–0, cancellation/lucky evidence, January transition, privileged multiplier split,
  winner/tie, privacy, and modal locking.
- The production trace reaches both final-Draw Koi-Koi (`11 × 3× = 33`) and Hand Bank
  (`3 × 1× = 3`) through real engine commands, public projections, card animation, feedback, and
  result focus; no state injector or browser scoring evaluator exists.
- Root and repository-prefixed Pages traces pass all seven supported viewports. Result cards remain
  horizontally contained and vertically scrollable, and the explicit local restart cannot be
  mistaken for advancing to the displayed authoritative February plan.
- `npm run validate:phase3c` passes 22 test files / 153 tests, the approved-deck release gate,
  Workshop exclusion/runtime trace, root/Pages browser runs, and zero browser/network errors.
- `npm run check` passes 40 test files / 390 tests, the 10,002-match deterministic replay gate, and
  a 767-module production build. Independent review reports no blocker, high, or medium findings.

## Phase 3B completed and accepted

- Ten typed, deeply frozen `PRES-*` fixtures bind public yaku progress, combined decisions,
  incremental and Bright upgrades, Bank/Koi decisions, privilege/forced/capped cases, and safe text
  state to Phase 1C/1D/1E authoritative source fixtures.
- Browser presentation may consume public `activeYaku`, `currentYakuTotal`, decision context, legal
  decision actions, multiplier, and public events. It may not infer any rule outcome or disclose
  hidden cards, draw order, RNG, checkpoints, or command IDs.
- Seed `00000000000000000000000000000003` is the locked production-local Phase 3B browser trace;
  it reaches Hand Animals, Koi-Koi Draw continuation, and a later combined final-Draw decision.
- Phase 3C remains responsible for the finished round-result/score-transition experience. Phase 3B
  only presents the authoritative award/recap and locks the completed local round.
- The focused gate passes 20 Vitest files / 136 tests, the local-only Workshop exclusion check, all
  seven root and Pages viewports, and real Hand Animals, Koi-Koi Draw continuation, combined
  final-Draw, and Bank award browser traces. Independent authority/privacy and interaction reviews
  report no blocker, high, or medium findings.

## Phase 3A local-round runtime now present

- Production local runtime over `startMatch`, `projectPlayerObservation`, legal input intents, and
  `applyGameplayCommand`, with one accepted command/state-version increment per activation.
- Recipient-relative 48-card board projection, public-event animation boundaries, stable hidden
  backs, and field-overflow fanning above the base eight slots.
- Guided/Fast pointer and keyboard play, exact Hand/Draw targets, existing Bank/Koi commands, and
  deck/animation input locks remain connected to the Phase 2 foundations.
- Full-table private handoff plus explicit Ready activation before changing to the next player's
  observation.
- HTML turn recap names public play, draw, capture, yaku/result, and next-player facts independently
  of the canvas.
- `LOCAL-001` through `LOCAL-008`, a deterministic complete-round driver, seven root/Pages
  viewports, and a real 390×844 two-player handoff trace pass locally.

Architecture: [`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md).

## Phase 2E authoring runtime retained

- Portable 48-slot Workshop/status, normalized transform-editing, contact-sheet geometry, and strict
  owner-approval contracts under `@koikoi4x/deck-format`.
- Explicit Node-only Sharp adapter for orientation-aware PNG/JPEG/WebP decode, deterministic
  640×1024 table and 160×256 thumbnail derivatives, SHA-256 provenance, and atomic output.
- Immutable digest-named source assignment and atomic transform saves; imports never overwrite
  existing source art.
- Local-only Workshop with January–December grid, Auto/Manual editing, source/frame/phone/back
  previews, package actions, exact errors/warnings, and a four-pilot 390×844 board review.
- Token-protected exact package/card filesystem bridge enabled only by the Workshop Vite config.
  Normal root/Pages builds return 404 for `workshop.html` and contain no authoring bridge.
- Canonical 968×4516 art-review and 390×1624 gameplay-size sheets with all 48 slots and explicit
  incomplete watermarking when sources are absent.
- Complete runtime manifest generation only for 48 faces plus one back. A second complete technical
  package is constructed and decoded in tests without labeling it final art.
- Strict release evidence: approved pilot metadata plus an explicit owner/date/note bound to the
  platform-independent source/transform/back/sheet-plan review digests, four pilot CardIds, and
  390×844 viewport. Raw encoded PNG hashes remain separate build diagnostics.

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
Phase 2E authoring/approval boundaries are recorded in
[`ADR 0011`](./adr/0011-phase-2e-workshop-import-approval-boundary.md), and Phase 3A local execution,
projection, recap, and handoff are recorded in
[`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md).

## Validation

- The primary candidate uses 49 immutable 1600×2560 WebP masters with no source-quality warning.
  All 48 face derivatives, the back, both complete review sheets, and the approved four-card 390×844
  pilot board were visually inspected.
- Phase 2E's technical gate passes 16 focused files / 114 tests, builds the complete primary
  candidate, exercises the local Workshop at desktop and 390×844, and passes both root and
  repository-prefixed seven-viewport production matrices with the Workshop absent.
- The owner-gated release command passes with zero issues. The v1.0.0 runtime manifest is labeled
  `approved` and matches the exact semantic review identities on both macOS and Linux.
- The Phase 3A production build contains the approved primary runtime and real local-round adapter;
  the local Workshop still reports 48 slots, 47 Auto faces, 1 Manual face, 0 missing, and
  `engineExecution:notAvailable`.
- `npm run check` passes 33 files / 348 tests and the isolated 10,002-match generated gate,
  all workspace checks, authored-package validation, and the 764-module production build. Isolating
  the CPU-heavy generated gate prevents Sharp raster tests from starving its deterministic timeout.
- Three independent Phase 2E reviews report no blocker, high, or medium finding after selected-build,
  stale-manifest, rotation-preview, inheritance/back, source-containment, package-path, Workshop UX,
  and Pages-gating repairs.
- Implementation commit `31da04f` is on `origin/main`. Hosted CI run `31327748444` passed the full
  repository and Phase 2E gates; Pages run `31327748453` passed the same gates and deployed. A
  cache-busted Phase 2E live browser run rendered the then-current technical table without errors, the public root
  returned 200, and the intentionally local-only `workshop.html` route returned 404.
- Phase 3A's focused gate passes 17 files / 119 tests plus all 100 technical deck artifacts,
  approved release validation, and the local Workshop browser trace. Root and repository-prefixed
  smokes each pass seven viewports plus a Normal-motion 390×844
  Hand/Draw/recap/privacy-handoff/Player-B/New-round trace with zero browser or network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 34 files / 353 tests plus the isolated 10,002-match deterministic gate, and the
  765-module production build. Implementation commit `7f3d5f1` is on `origin/main`; hosted CI run
  `31344124822` and Pages run `31344124824` passed the Phase 3A gates and deployed it.
- The cache-busted public approved manifest returned HTTP 200 with package
  `new-primary-deck`/`approvalStatus:approved`. A real public browser run reported `ready:true`, 48
  persistent CardViews, the approved primary deck, and the authoritative `awaitingHandPlay` local
  round; its rendered table was visually inspected without clipping.
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
- The browser-local Phase 3A runtime deliberately restarts the first round and stores nothing.
  Multi-round continuation/save-resume remains Phase 5, while authenticated remote command transport
  remains Phase 7/8.
- Phase 3A can execute engine Bank/Koi decisions so the round cannot deadlock, but the finished yaku,
  progress, multiplier, and Bank/Koi presentation remains Phase 3B; finished round-result
  presentation remains Phase 3C.
- Hosted CI currently emits a nonblocking maintenance annotation that v4 checkout/setup/artifact
  actions target deprecated Node.js 20 and are being forced onto Node.js 24. The run remains green;
  workflow-action upgrades can be handled as isolated infrastructure maintenance.
- Firebase, persistence, multiplayer, CPU play, onboarding, and final presentation polish remain
  deferred. The primary card artwork itself is approved and deployed with Phase 3A.

## Owner verification and deployment steps

1. No hosting configuration, Firebase project, secret, or migration is required. Pushing `main`
   triggers CI and GitHub Pages.
2. After deployment, open the live URL and play the deterministic local round. At each Yaku
   decision, verify the public Yaku list, Bank award, Koi-Koi multiplier, and combined decision text;
   unrelated controls must remain locked until Bank or Koi-Koi is chosen. Bank to inspect the result
   screen, exact arithmetic, updated scores, and authoritative February starter/privilege plan.
3. Use `Start another local round` on the result screen to restore Player A/state version 1. It is a
   local practice restart, not February advancement. Deck switching remains texture-only, and the
   approved Primary Deck should be selected by default.
4. Additional decks may still be added as complete or inherited packages; each receives separate
   evidence and approval.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 4A — Onboarding foundation:** lock the tutorial-director contract and build the newcomer
entry experience, beginning with Learn in 60 Seconds and contextual table guidance over the
authoritative local round.
