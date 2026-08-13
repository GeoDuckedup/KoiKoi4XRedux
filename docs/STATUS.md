# KoiKoi4x Project Status

**Updated:** August 13, 2026

**Overall state:** Greenfield rewrite through Phase 3E-C deployed; Phase 3F-A simplified table and
larger-hand integration is in final acceptance

**Runtime state:** Complete deterministic headless match engine plus a playable browser-local first
round using real player observations and commands, the owner-approved primary deck, persistent Pixi
cards, deterministic public-event animation, private pass-the-device handoff, accessible turn recap,
and the retained local-only deterministic deck Workshop/raster review pipeline

## Current result

Phase 3E-A responds directly to owner playtesting. Permanent numbered field slots are removed while
adaptive geometry remains; Options moves to the bottom safe area; nonempty public capture rails
open exact card galleries; the Koi-Koi choice becomes a field-visible tray; and Round Result leads
with outcome, points, totals, and its action while secondary facts begin collapsed. This slice does
not change scoring or round progression. Phase 3E-B now separates every Draw reveal from its
resolution: the engine exposes the revealed card and canonical public 0/1/2/3 outcome, then only
the active player can resolve it. The browser makes the Reveal card selectable and reuses the
Guided/Fast field cues without deriving matching rules. Phase 3E-C now makes that same
authoritative reveal visibly leave from the top of the draw pile as a face-down card, flip only in
Reveal, pause, and then unlock the existing Reveal action. It is presentation-only: it does not add
an engine command or disclose draw order.

Phase 3F-A removes the remaining routine turn scaffolding: the in-canvas action strip, visible
phase/instruction/Confirm/Cancel row, initial-ready recap, and manual Play/Motion/animation utility
controls. Its entire canvas reserve now belongs to Player Hand, making all eight active cards
materially larger while leaving the adaptive field, captures, Draw, Reveal, and opponent geometry
unchanged. Options stays below the table and retains Theme, deck, fullscreen, restart, and critical
locks. Production uses normal animation and automatically honors operating-system reduced motion.

Release commits `0b6937a` and `818936a` passed CI run `31554760462` and Pages run `31554760390`.
The latter contains the CI timing stabilization for the retained raster-builder test. The live page
returned HTTP 200, and a cache-busted browser check reached ready state with the approved Primary
Deck, one canvas, 48 persistent CardViews, eight legal hand controls, zero empty-field placeholders,
and no layout diagnostics.

Phase 3D-C promotes all three owner-approved directions into one production build. Ink & Parchment
is the safe default; Moonlit Indigo and the original-game-inspired Warm Ivory select through the
accessible Options dialog and persist as a versioned allowlisted cosmetic preference in IndexedDB.
Theme changes repaint DOM, Pixi table chrome, and game-controlled card frames in place without
changing the engine, deck, card identities, state version, selection, legal targets, Yaku, or
result data.

Phase 3D-C originally introduced a concise turn/confirmation strip and moved play/motion utilities
into Options. Phase 3F-A supersedes that shell: routine visible turn/confirmation chrome and those
manual utilities are now removed, while compact public Yaku, meaningful event history, themes,
deck, fullscreen, and local restart remain available.

Release commit `9313b93` passed CI run `31536377258` and Pages run `31536377294`. The live page
returned HTTP 200 and a cache-busted real-browser check reached ready state with the approved Primary
Deck, Ink & Parchment default, one canvas, all 48 persistent CardViews, eight legal hand controls,
and no clipped, invalid, or overlapping board zones.

Phase 3D-D replaces the old above-eight fan with deterministic shrink-to-fit 5:8 grids. Counts
through eight retain the familiar four-by-two field; 9–17 cards maximize readable card size inside
the existing field, preserve exact public order, center the final row, and never overlap. A separate
reflow clip moves unrelated cards only after direct placement/capture motion completes.

Dense legal target territories are partitioned between visible cards rather than independently
expanded, so tapping one highlighted card cannot activate another. Hand controls remain 44px. At
the 17-card short-landscape boundary, field targets use an explicit non-overlapping 24×36px minimum
with full arrow/Home/End/Enter/Escape keyboard parity.

The isolated non-shipping Pixi harness passed 17-card pointer/keyboard checks at all fourteen root
and Pages viewport combinations, with one canvas, 48 persistent CardViews, no clipped zones, and no
browser/network errors. Six representative screenshots are under `output/phase-3d-d/e2e/`.

Release commit `07ae604` passed CI run `31545456869` and Pages run `31545456817`, including the
complete Phase 3D-D gate and Pages deploy job. The live page returned HTTP 200; a cache-busted
real-browser check reached ready state with the approved Primary Deck, Ink & Parchment, one canvas,
all 48 persistent CardViews, eight legal hand controls, and no clipped, invalid, or overlapping
zones. The non-shipping density-review route returned HTTP 404 as required.

Phase 3D-B now completes the desired direct interaction flow. Selecting a no-match card highlights
the field placement surface; selecting a unique match highlights its one matching card; exact-two
continues to expose two authoritative choices; and a four-card sweep highlights all three matching
field cards. Guided mode accepts the highlighted field/card or Confirm, while Fast keeps immediate
unambiguous play. Phase 3D-D now supplies the adaptive field geometry for those same authoritative
targets.

The browser never derives this from Pixi coordinates or reimplements capture rules. Every Hand
legal action carries a frozen public resolution preview produced beside engine legality. The input
controller validates that preview against the existing action set, emits only an existing legal
intent, and requires a newer observation after submission.

Phase 3C implementation, hosted deployment, and live acceptance are complete. Twelve
`PRES-RESULT-*` contracts verify
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

## Phase 3D-D deployed and accepted

- `TABLE-DENSITY-001` through `008` cover stable eight-card geometry, 9/12/17-card grids, public
  field order, resize, non-overlapping targets, separated reflow, immutability, and the legal bound.
- The recipient projection now preserves `publicState.round.field` order instead of normalizing
  field positions by canonical CardId.
- Snapshot diagnostics report adaptive field count, rows/columns, gap, and card dimensions while
  continuing to omit hidden identities and runtime coordinates from the production text surface.
- The 17-card review entry builds only to `apps/web/dist-phase3dd`; the normal root/Pages production
  build has no state injection or review route.
- `npm run validate:phase3dd` passes the 3-file/23-test theme gate, approved deck release, 100
  technical assets, 26 files/189 retained web/deck/turn tests, Workshop, root/Pages gameplay, and
  the 14-viewport dense review. `npm run check` passes 44 files/423 tests, the 10,002-match gate, and
  the production build. Independent review reports no blocker, high, or medium finding.
- CI, Pages, and live-browser verification passed. No manual hosting setting, secret, migration, or
  cache reset is required.

## Phase 3C deployed and accepted

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
- CI run `31351999052` and Pages run `31351999091` passed for release `c2224aa`; the live Pages
  build returned HTTP 200 and initialized the approved deck and playable local round in a real
  browser.

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
  backs, and Phase 3D-D adaptive field geometry above the base eight slots.
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
2. Verify the larger eight-card hand at phone and desktop widths. There should be no visible
   `Player A · play a hand card`, initial-ready message, routine Confirm/Cancel row, or numbered
   empty field placeholders.
3. After deployment, play a hand card and watch the next Draw: one face-down card must leave the
   visible top of the deck, flip only in **Reveal**, pause briefly, then become the only actionable
   Reveal card. Activate it with the keyboard or tap and follow the engine-provided field cue.
4. Open **Options** and verify it contains only themes, deck, fullscreen, restart, and close. Select
   Moonlit Indigo or Warm Ivory, close Options, and reload once to verify the cosmetic preference
   persists without restarting the round.
5. Select a hand card and verify changing the theme preserves the active selection and highlighted
   field target. Play through Yaku/Bank/Koi and confirm unrelated Options
   controls remain locked during critical decisions.
6. Expand **History** to inspect the complete disclosed recap. `Start another local round` remains a
   local practice restart, not February advancement. Additional deck packages remain supported.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next subphase

**Phase 3F-B — Unified tap-only interaction:** remove the temporary Guided confirmation state so
ordinary Hand and Draw play is completed only by legal card/field taps. Bank/Koi-Koi remains an
explicit decision. Phase 5 full multi-round progression follows the interaction-polish sequence;
tutorial work remains deferred.
