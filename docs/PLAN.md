# KoiKoi4x Implementation Plan

**Plan version:** 1.1
**Updated:** August 11, 2026
**Current gate:** Phase 3D-C runtime themes and compact production shell are deployed and accepted;
Phase 3D-D adaptive dense-field implementation awaits owner approval

This file tracks the currently approved implementation sequence. [`DESIGN.md`](./DESIGN.md) contains the complete product plan; this file is the concise handoff for the next coding session.

## Phase protocol

- Complete one approved subphase at a time.
- Read [`PROJECT_MANIFEST.md`](./PROJECT_MANIFEST.md) and the governing specifications before substantial work.
- Preserve one clear implementation owner for rules, state, event semantics, hidden information, multiplayer authority, and other tightly coupled systems.
- Parallelize independent investigation when useful; serialize coupled integration.
- Validate against the subphase acceptance gate before recommending the next subphase.
- End every subphase report with scope, files, decisions, exact validation results, limitations, user verification/deployment steps, and the next recommended subphase.
- Never describe static inspection, compilation, or documentation review as runtime gameplay validation.

## Phase 0 — Rule lock and foundation

### Phase 0A — Canonical rules decision log

Status: **completed and owner-approved**.

Deliverables:

- concise canonical rules and terminology;
- approved decision log;
- exact spec-level test vectors and decision coverage matrix;
- intentional differences from legacy behavior;
- repository authority and AI workflow documents;
- durable phase plan, status, and progress records.

Gate:

- R-001 through R-014 are represented without unresolved engine decisions;
- every special rule maps to named fixture coverage;
- owner confirms the transcription faithfully reflects approved rules.

### Phase 0B — New repository scaffold

Status: **completed and owner-approved**.

Deliver:

- initialize the repository and workspace/package structure;
- strict TypeScript configuration;
- Vite web app with PixiJS boot screen;
- Vitest, Playwright, ESLint, Prettier, and locked dependency installation;
- GitHub Actions for typecheck, lint, format check, tests, build, and smoke E2E;
- boundary checks preventing engine imports from browser/Pixi/Firebase systems;
- root README and the initial `.codex/agents/` specialist definitions;
- `window.render_game_to_text`, deterministic `window.advanceTime(ms)`, and fullscreen behavior on the boot surface so the web-game test loop exists from the scaffold onward.

Gate:

- clean install, typecheck, lint, format check, unit test, production build, and Playwright smoke test pass;
- generated screenshot and text state are inspected;
- no legacy runtime code is copied.

Result:

- `npm ci` and the complete format/lint/typecheck/unit/build chain pass;
- Playwright smoke coverage passes at all five baseline viewports, including fullscreen and browser
  error checks;
- the bundled web-game client passes and its canvas/text artifacts were inspected;
- the Pages repository-base build was verified;
- independent acceptance review found no remaining implementation blocker after status records were
  updated.

### Phase 0C — Canonical card catalog

Status: **completed and owner-approved**.

Deliver descriptive stable CardIds, all 48 card records, metadata/yaku flags, catalog validation, and CardId-bound versions of the Phase 0A vectors.

Gate: exactly 48 unique cards, four per month, correct Sake Cup/Rain flags, and no artwork fields in domain types.

Result:

- stable descriptive CardIds and all 48 frozen domain records are exported from `packages/engine`;
- the normalized twelve-month/flower table and lookup helpers are available without art-package data;
- validation proves the 5/9/10/24 category totals, Scroll subtypes, special flags, exact fixed-yaku
  memberships, stable month order, and domain-only record keys;
- independent literal bindings lock Phase 0A's concrete and qualifying CardId subsets without
  prematurely defining Phase 1's runnable state/action fixture schema;
- `npm run validate:cards` and the full repository check pass.

### Phase 0D — Deck package and art specification foundation

Status: **completed and owner-approved**.

Deliver versioned package/transform schemas, inheritance, validation, `ART_SPEC v1` constants, immutable-source workflow, primary-deck skeleton, generated Art Guide, and dense/simple/Bright/Plain pilot inputs.

Gate: resolved 48-card coverage, deterministic normalized transforms, validation failures for missing/duplicate/cyclic packages, and pilot readiness.

Result:

- `@koikoi4x/deck-format` owns the versioned package and transform contracts, strict runtime
  validation, deterministic root-to-child inheritance with provenance, and normalized auto/manual
  transform math;
- `ART_SPEC v1` locks the 5:8 geometry, 1600×2560 preferred master, quality thresholds, 84%×88% safe
  area, game-controlled frame, and 640×1024 / 160×256 derivatives;
- `new-primary-deck` resolves all 48 canonical CardIds and includes a required card back plus four
  immutable technical pilot sources covering dense, simple, Bright, and Plain roles;
- the JSON Schemas, SVG Art Guide, and digest-bearing pilot import plan are reproducible generated
  artifacts;
- focused validation passes 6 test files / 26 tests, and development validation reports 48 resolved
  cards with 47 auto / 1 manual transforms;
- final art, derivative raster generation, dual contact sheets, runtime switching, Deck Workshop UI,
  and the 390×844 visual pilot decision remain intentionally assigned to Phase 2.

## Phase 1 — Headless engine

### Phase 1A — Deterministic state, RNG, and deal

Status: **completed, deployed, and owner-approved**.

Deliver versioned authoritative match/round state, seeded deterministic randomness and checkpoints,
immutable shuffle/deal, opening cancellation and lucky-hand outcomes, ownership/setup invariants,
semantic setup-event audiences, and executable DEAL-001 through DEAL-012 fixtures.

Gate: equal seed plus command reproduces byte-identical output; initial ownership is exactly
8/8/8/24 across all 48 unique cards; outcome precedence and automatic scoring match the canonical
rules; hidden hands and draw order do not enter public precommit events; and the engine imports no
rendering, browser, backend, deck-format, clock, timer, or ambient randomness dependency.

Result:

- a versioned `xoshiro128**` random source supports exact seed validation, unbiased bounded integers,
  snapshots/restoration, and immutable Fisher–Yates shuffle;
- match setup shuffles before starter selection, uses the locked 8/8/8/24 slice layout, commits state
  version 1, and returns a serializable RNG checkpoint;
- strict field-cancellation → lucky-hand → normal-play precedence handles one/two field months,
  complete-month hands, exact four pairs, both-lucky draws, one 6-point award at 1×, and zero ordinary
  yaku points;
- authoritative validation detects unknown, duplicate, missing, misplaced/count-invalid cards plus
  mismatched opening evidence, scores, phases, versions, match metadata, and reset state;
- events carry public, owner-private, or server-only audiences, and qualifying hands become public
  evidence only after automatic result commit;
- all twelve authored DEAL fixtures execute against complete canonical deck permutations, while
  Phase 1D retains automatic-round transition/history ownership and Phase 1E retains projections and
  replay.

### Phase 1B — Turn and capture state machine

Status: **completed, deployed, and owner-approved**.

Deliver legal hand play, canonical 0/1/2/3 same-month capture behavior, explicit two-target choices,
Four-Card Sweeps, ordered draw resolution, player-scoped legal actions, deterministic command
rejection, complete turn advancement, and an explicit End-of-Play handoff.

Gate: every CAP-000 through CAP-DRAW-003 vector executes from a complete 48-card deal; equal state
plus command produces byte-identical immutable output; accepted commands increment the state version
once while rejected commands leave input untouched; revealed/persisted cards remain in exactly one
authoritative zone; legal actions never expose an opponent hand or future draw order; and gameplay
uses no RNG, clock, rendering, browser, backend, or deck-format dependency.

Result:

- pure capture resolution preserves field order, appends zero-match placements, captures source
  first, and distinguishes selected pairs from Four-Card Sweeps;
- `playHandCard` resolves hand placement/capture and the top ordered draw atomically unless the draw
  has exactly two targets, in which case `awaitingDrawCapture` preserves the revealed card and legal
  targets for `chooseDrawCapture`;
- player-scoped legal actions preserve hand and field order, including both legal two-match targets;
- public semantic events describe played/revealed cards, placements, capture movement, choice
  windows, completed turns, and End of Play without including still-hidden cards;
- authoritative validation covers pending draw ownership/targets and turn progress, and the turn loop
  reaches an explicit Phase 1D seam with both hands empty and eight draw cards unused;
- all eight authored CAP fixtures use exact canonical 8/8/8/24 allocations and execute against the
  production transition API, with Phase 1C retaining yaku/trigger ownership and Phase 1E retaining
  formal projection/replay ownership.

### Phase 1C — Yaku and trigger system

Status: **completed, deployed, and owner-approved**.

Deliver all approved fixed, hierarchy, and incremental yaku; deterministic active totals; closed
trigger keys; player-local seen-trigger state; separate Hand/Draw checks; and one combined decision
context for all newly completed yaku in a phase.

Gate: all 39 locked YAKU vectors execute with literal expected keys/points/order; Bright tiers replace
rather than stack; fixed and generic yaku stack independently; Current-Month Set uses the scheduled
month; increments after a seen threshold change value without retriggering; Hand decisions occur
before draw reveal; Draw decisions occur before turn completion; and final-draw decisions preserve
the Phase 1D End-of-Play resume path without exposing hidden cards.

Result:

- a pure immutable evaluator returns all active yaku, exact total, category counts, and unseen active
  keys in canonical Rules-table order;
- the 13-key contract covers the four exclusive Bright tiers, five named sets, Current-Month Set,
  and the three incremental category yaku;
- player state stores typed seen keys, the complete active snapshot, and current total; authoritative
  validation recomputes them and proves that decision keys are the exact atomic suffix added for the
  triggering capture phase;
- Hand, direct Draw, pending-choice Draw, and final Draw transitions stop at an immutable
  `awaitingYakuDecision` context with the correct resume marker;
- public yaku completion/value/decision events contain only capture-derived information, while both
  players received no executable decision action until Phase 1D;
- all 39 locked evaluator vectors and targeted production-transition fixtures pass, including
  simultaneous viewing yaku, scheduled-month sweep, seen-value increment, Player B, and final Draw.

### Phase 1D — Bank, Koi-Koi, End of Play, and round/match lifecycle

Status: **completed, deployed, and owner-approved**.

Deliver executable Bank/Koi-Koi decisions, 1×–4× table progression, latest-caller End-of-Play
scoring, special 2× privilege, final-round leader restriction, next-starter policy, durable typed
history, automatic-result continuation, final match completion, and deterministic checkpointed
round advancement.

Gate: all 45 reachable KOI/END-PLAY/TRANS/FINAL/HIST vectors have literal fixtures and production
traces, while the two rules-unreachable `KOI-015A/B` fixtures execute literal authoritative
rejection assertions; production transition paths have complete 48-card traces where gameplay state
matters; accepted commands
increment exactly once; rejected commands do not mutate state or consume external RNG; all results
record canonical reason/arithmetic/evidence/transition data; every final-month outcome terminates;
new deals preserve score/history and event privacy; and the Phase 1C regression remains green.

Current result:

- `chooseYakuDecision` exposes actor-only Bank/Koi-Koi legal actions, including privileged 1×/2×
  Bank, privileged 1×→3× Koi-Koi, and forced final-leader Koi-Koi;
- Koi-Koi consumes the Phase 1C continuation in the same accepted command, including Hand-to-Draw,
  Draw-to-next-turn, and final-Draw-to-immediate-End-of-Play paths;
- Bank and natural End of Play commit immutable typed round results, point deltas, cumulative score,
  canonical history, next starter/privilege, or final match totals;
- `advanceRound` validates before restoring the external RNG checkpoint; its ordered-deck fixture
  sibling proves reset/retention and automatic final-month outcomes without exposing RNG or deck
  ordering publicly;
- the 47 in-scope Phase 1D IDs have literal metadata/expectations, 45 reachable cases have production
  traces, and Phase 1E retains formal projection/observation and replay/hash vectors;
- `KOI-015A/B` are unreachable under the locked rules because the privilege holder is necessarily
  the next starter and therefore cannot own alternating turn 16's final Draw; under owner-selected
  Option A, those stable IDs assert literal `ROUND_PRIVILEGE_INVALID` rejection;
- focused validation passes 13 files / 158 tests; the full check passes 22 files / 245 tests and a
  711-module build; the five-viewport Playwright suite and bundled runtime inspection pass;
- all implementation repair findings are closed; the selected rule correction and direct fixture
  expectation bindings are applied; three independent final reviews report no blocker, high, or
  medium issue;
- implementation commit `3ab3c44` is on `origin/main`; hosted CI run `31292265288` and Pages run
  `31292265276` passed, and the cache-busted live runtime was inspected successfully.

### Phase 1E — Observations, replay, and deterministic verification

Status: **completed, deployed, and owner-approved**.

Complete the headless engine with formal privacy-safe public/player projections, audience-filtered
events, canonical serialization and hashes, private command/checkpoint replay, retry-safe accepted
command receipts, and versioned public turn records.

Gate: the three retained history/evidence vectors and 11 new Phase 1E vectors remain literal and
executable; public/player/event/turn-record serializations contain no forbidden hand, future draw,
RNG, checkpoint, seen-trigger, or command-ID data; replay calls the production Start/Gameplay/Advance
seams and detects sequence/payload/state/event/checkpoint drift; exact accepted retries never mutate
or roll back current runtime and conflicting key reuse rejects; all 10,002 seeded complete matches
finish across 3/6/12-round formats with authoritative validation after each accepted transition and
sampled full privacy/replay/hash equality.

Current result:

- `PublicGameStateV1`, `PlayerObservationV1`, and typed projected event unions implement the exact
  public/owner/server visibility matrix, including pending Draw/Yaku phases and lucky evidence;
- canonical JSON v1 sorts record keys while preserving semantic arrays, and a portable engine-owned
  SHA-256 implementation produces versioned public/private integrity hashes;
- private replay logs record semantic commands plus before/after state, event, checkpoint, and public
  hashes; replay verifies every boundary and gameplay preserves the checkpoint;
- immutable accepted receipts return the original exact Start/Gameplay/Advance transition on retry,
  while changed-payload reuse conflicts and rejected commands are not cached;
- `PublicTurnRecordV1` adds canonical/hash versions and a unique `recordSequence`; strict runtime
  decoding rejects unsupported versions, private content, unknown public fields, and hidden events;
- all 11 new literal fixtures pass; `validate:phase1e` passes 16 files / 176 tests and the full check
  passes 25 files / 263 tests plus the 711-module build;
- the required 10,002-match generated gate passes with 3,334 matches per format, five-viewport smoke
  passes, and three independent final reviews report no blocker, high, or medium issue.
- implementation commit `b0c4d06` is on `origin/main`; hosted CI run `31294666605` and Pages run
  `31294666580` passed, and the cache-busted live runtime was inspected successfully.

## Phase 2 — Rendering foundation

### Phase 2A — Responsive Pixi table

Status: **implemented, independently accepted, committed, and deployed; awaiting owner review**.

Deliver:

- a pure presentation-owned viewport/layout service with deterministic phone, tablet, landscape,
  and desktop modes;
- all fourteen logical card zones plus reserved identity, round-status, and action-bar bounds;
- the ten prescribed persistent Pixi scene layers in explicit z-order;
- a polished placeholder table skeleton with opponent/player hands, four-category capture summaries,
  stable 2×4 field slots, draw/reveal, multiplier, and a disabled action bar;
- versioned `render_game_to_text` geometry diagnostics while retaining one canvas, stopped ticker,
  deterministic `advanceTime`, fullscreen, and semantic DOM status;
- literal layout vectors and root/repository-prefixed browser checks across seven viewports.

Gate:

- `LAYOUT-001` through `LAYOUT-007` return deterministic, immutable, finite, in-bounds geometry with
  the correct responsive mode, fourteen logical card zones, eight 5:8 field slots, and an action bar
  at least 44 CSS pixels high;
- mobile portrait follows the opponent → status → field/draw → captures → hand → action hierarchy,
  short landscape has a dedicated collision-free composition, and desktop uses lateral capture
  rails around a centered field;
- scene layer containers persist across redraws and the renderer does not own rule state;
- seven-viewport screenshots, live resize, fullscreen, console/network checks, and the bundled
  web-game client are inspected successfully;
- root-base and `/KoiKoi4XRedux/` builds load every asset without error;
- no engine, CardView/deck texture, animation queue, gameplay command, or card-input behavior enters
  this slice.

Phase ownership remains strict: persistent CardViews/deck packages are 2B, AnimationDirector is 2C,
and selection/target/keyboard input is 2D.

Current result:

- a runtime-immutable layout service returns complete geometry for compact portrait, portrait,
  landscape, and desktop without importing engine or asset/runtime code;
- ten stable Pixi layer objects survive deterministic time and live portrait-to-landscape resize;
- all seven layout vectors bind literal fingerprints of the complete serialized geometry and retain
  independent containment/hierarchy/aspect/immutability assertions;
- `validate:phase2a` passes 2 files / 13 tests plus root and repository-prefixed seven-viewport
  browser matrices; the full check passes 26 files / 274 tests and a 713-module build;
- the bundled game-client screenshot/state and representative browser screenshots were inspected;
  a primary-mobile action-bar overflow found during runtime review was repaired;
- independent architecture, visual/runtime, and test/deployment reviews report no blocker, high, or
  medium finding after immutable-contract, minimum-viewport, fixture, scene-token, and workflow
  repairs;
- implementation commit `5fccfc9` passed hosted CI run `31296702209` and Pages run `31296702171`;
  cache-busted desktop and 390×844 live renders were inspected successfully.

### Phase 2B — Persistent cards and runtime deck packages

Status: **implemented, independently accepted, committed, and deployed; awaiting owner review**.

Deliver:

- a portable strict `RuntimeDeckManifestV1` with exactly 48 resolved canonical faces and one back;
- two complete, reproducibly generated, explicitly non-final technical runtime packages;
- one persistent Pixi CardView per canonical CardId, assigned immediately to the Phase 2A zones;
- separate persistent card and redrawable chrome containers within the ten scene layers;
- a Pages-safe asset manager that validates and preloads a whole candidate before atomic activation;
- local deck selection between the two installed packages without engine/protocol/replay mutation;
- deterministic diagnostics and tests for identity, placement, texture binding, failure rollback, and
  root/repository-prefixed browser delivery.

Gate:

- `DECK2B-001` through `DECK2B-003`, `CARDVIEW-001/002`, `SWITCH-001/002`, and `ASSET-003` execute
  literal contract, placement, persistence, rollback, and browser-boundary assertions;
- every installed manifest resolves exactly the 48 CardIds plus one back at ART_SPEC v1 geometry,
  and generated artifacts reproduce byte-for-byte;
- all 48 CardView tokens remain stable across resize, zone changes, face/back changes, and a complete
  deck switch; card objects are never recreated by chrome redraw;
- package selection changes only local textures/labels, while authoritative engine, protocol,
  projection, replay, command, and RNG state remain outside the presentation runtime;
- failed candidate loading leaves the prior active package unchanged and releases candidate assets;
- seven root-base and seven `/KoiKoi4XRedux/` browser views load all face/back assets without error,
  switch packages, preserve scene/CardView identity, and remain visually contained;
- technical packages remain labeled placeholders; no final-art, animation, input, or Workshop claim
  enters Phase 2B.

Phase ownership remains strict: AnimationDirector is 2C, selection/target/keyboard input is 2D, and
Deck Workshop plus final visual approval is 2E.

Current result:

- implementation commit `7549973` is on `origin/main`;
- hosted CI run `31300988963` passed the full repository and Phase 2B browser/artifact gates;
- Pages run `31300988958` passed its repository-prefixed build/browser gate and deployed;
- a cache-busted live 390×844 browser check returned HTTP 200, switched Sunrise to Moonlight,
  preserved all 48 CardView tokens, changed texture bindings, and reported no geometry/browser error.

### Phase 2C — Semantic AnimationDirector

Status: **implemented, independently accepted, committed, and deployed; awaiting owner review**.

Deliver:

- immutable complete presentation projections and a pure public-semantic-event planner;
- one deterministic FIFO director with Normal, Fast, Instant, and Reduced Motion policies;
- persistent CardView travel, capture, draw-back/flip/reveal, reflow, and feedback clips;
- acceleration, immediate finish, explicit cancel-and-snap, and destruction/stale-frame safety;
- exact target settlement across motion policies, live resize, and deck switching;
- a clearly labeled presentation-only technical scenario harness and animation diagnostics;
- literal unit/adapter fixtures plus root/repository-prefixed browser matrices.

Gate:

- `ANIM-001` through `ANIM-012` prove semantic clip ordering, draw-back/flip boundaries, FIFO queue
  behavior, deterministic completion, all-mode target equality, accelerate/finish/cancel/destroy,
  resize rebase, reduced-motion no-transit behavior, persistent identity, and invalid-input rejection;
- event planning consumes only projected public events plus trusted recipient-safe before/after
  projections and never infers gameplay rules from coordinates;
- accepted plans cannot interleave, a mismatched queued source rejects without mutation, and skip or
  cancel leaves no clip/card in transit;
- the Pixi ticker remains stopped; browser RAF and deterministic `advanceTime` drive the same pure
  delta API, while commands/engine/RNG remain outside presentation code;
- all four policies settle to the identical projection fingerprint and persistent CardView tokens;
- mid-flight resize preserves normalized progress and rebases geometry; mid-flight deck switch
  preserves progress/identity and changes textures only;
- seven root and seven `/KoiKoi4XRedux/` browser viewports exercise all modes, interruption controls,
  fullscreen, exact settlement, and zero console/network errors;
- technical fixtures remain explicitly non-authoritative and non-privacy-safe; a future real
  observation uses opaque backs/counts for hidden identities;
- no selection/hit testing, legal-command submission, gameplay, final art, or Workshop behavior
  enters Phase 2C.

Phase ownership remains strict: selection/target/keyboard input is Phase 2D, Deck Workshop/final art
is 2E, and full round presentation integration is Phase 3.

Current result:

- five frozen technical scenarios produce selection/travel/alignment/capture/reflow/draw/flip/pause
  and feedback clips from projected semantic event shapes;
- one delta-driven director executes FIFO plans with fixed motion policies and exact completion,
  cancellation, finish, destruction, and queue-source contracts;
- persistent CardViews interpolate through EffectsLayer without recreation, cache unchanged geometry,
  and settle face/layer/zone state exactly;
- the focused gate passes 7 files / 60 tests plus 100 generated technical artifacts;
- hosted CI run `31316814794` passed 30 files / 319 tests, including the complete 10,002-match
  deterministic engine regression, the 756-module build, all 100 technical artifacts, the focused
  7-file / 60-test gate, and both seven-viewport browser bases;
- both seven-viewport browser bases pass every policy, mid-flight deck switch and resize, accelerate,
  finish, cancel/snap, fullscreen, exact no-transit settlement, and zero browser/network errors;
- compact 320×568 runtime inspection caught and closed a control-row canvas regression before
  acceptance by overlaying controls on the already-reserved action area;
- three independent final reviews report no blocker, high, or medium finding after FIFO empty-plan,
  exact source-equality, and settled chrome-refresh repairs;
- implementation commit `0139892` is on `origin/main`, Pages run `31316814785` deployed, and a
  cache-busted live run completed Hand-to-Field with equal display/target fingerprints, 48 unique
  CardViews, no transit/queue residue, and no browser error.

### Phase 2D — Selection and input

Status: **implemented, independently accepted, committed, and deployed; owner review next**.

Deliver:

- a pure controller over one injected `PlayerObservationV1` and current legal actions;
- Guided single-action confirmation and Fast single-action emission, with explicit multi-target
  selection in both modes;
- immutable minimal input intents that contain no command ID and execute no engine transition;
- separate Pixi selected/focus/legal-target highlights without changing trusted animation
  projections or recreating CardViews;
- semantic DOM card controls for pointer, roving keyboard focus, Enter/Space, Escape, accessible
  card identity/category/action labels, and visible focus;
- Draw and Bank/Koi-Koi input states, opponent/presentation locks, duplicate suppression, and
  newer-observation unlock behavior;
- explicitly non-authoritative technical input fixtures until Phase 3 supplies a real observation
  adapter and Phase 7 supplies command transport.

Gate:

- `INPUT-001` through `INPUT-014` execute literal reducer, intent, source-boundary, fixture,
  hit-area, and semantic-label assertions;
- only own-hand legal actions and public legal targets become controls; opponent turns and hidden
  fixture identities never become semantic actions;
- a legal activation emits exactly one frozen intent, locks until a newer observation, and cannot
  mutate engine state, RNG, projection, replay, or idempotency state;
- Guided and Fast behavior matches DESIGN, while exact-two Hand and Draw captures always require an
  explicit legal target;
- animation and deck loading clear stale selection and temporarily remove controls; settled
  animation stays locked until a fresh technical observation is loaded;
- resize and deck switching preserve all 48 CardView tokens; selection/highlight state remains
  transient and outside the Phase 2C trusted projection;
- seven root and seven `/KoiKoi4XRedux/` browser viewports prove baseline layout/control containment;
  a complete 390×844 trace on each base exercises pointer, keyboard, Draw/Yaku, opponent and
  animation locks, motion regressions, fullscreen, and zero browser/network errors;
- optional drag, real match execution, authenticated command submission, final art, and Workshop
  behavior remain outside Phase 2D.

Architecture is locked in
[`ADR 0010`](./adr/0010-phase-2d-input-intent-boundary.md).

Current result:

- 14 stable input vectors pass within the 8-file / 76-test focused gate, with all 100 generated
  technical deck artifacts current;
- root and repository-prefixed browser gates pass seven baseline viewports plus the complete
  390×844 pointer/keyboard/Draw/Yaku/lock trace with zero browser/network errors;
- `npm run check` passes 31 files / 335 tests, including all 10,002 generated matches, all workspace
  checks, authored-deck validation, and the 761-module production build;
- the required game client produced the selected/two-target `inputRuntime` diagnostic and screenshot;
- three independent final reviews report no blocker, high, or medium finding after pending-intent,
  observation-order, phase/action, exact Draw target, and DOM focus re-entrancy hardening.
- implementation commit `3d4bc32` plus compact-host fixes through `05800e0` are on `origin/main`;
  CI run `31322149519` and Pages run `31322149502` passed, and a cache-busted live interaction
  selected April Cuckoo with the exact two legal targets and no executed intent.

### Phase 2E — Deck Workshop and final visual approval

Status: **completed, owner-approved, and release-validated**.

Deliver:

- deterministic Sharp-based import of immutable PNG/JPEG/WebP sources into 640×1024 table and
  160×256 thumbnail derivatives using the shared ART_SPEC transform math;
- a local-development-only 48-slot Workshop with truthful Auto/Manual/inherited/warning/missing/
  invalid status, source assignment, normalized transform editing, preview, and package rebuilds;
- canonical 968×4516 art-review and 390×1624 gameplay-size contact sheets, each containing all 48
  slots in month order and visibly marked when incomplete;
- a strict complete runtime manifest only when all 48 faces plus the back build successfully;
- a platform-independent semantic-digest-bound owner approval record requiring both sheets, the four
  pilot roles on the real 390×844 board, an approver, and a date;
- separate technical and owner-gated release validation, with Workshop filesystem access excluded
  from normal production and GitHub Pages output.

Gate:

- `ART2E-001` through `ART2E-012` bind canonical assignment, truthful grid state, immutable
  transforms/sources, deterministic raster outputs, both contact sheets, complete second-package
  proof, atomic saves, digest-named import, local Workshop behavior, exact approval evidence, and
  production exclusion/release rejection;
- `npm run validate:phase2e` passes the technical unit/browser/production gates without weakening
  owner approval or production-exclusion boundaries;
- `npm run validate:phase2e:release` must fail while any source is missing, the four-card pilot is
  not owner-approved, an exact approval record is absent/stale, or the runtime package is incomplete;
- the four finished pilot cards and back must first be reviewed in both sheets and the 390×844 board;
  after pilot approval, the remaining faces may be imported, but the final approval record may only
  be created after the owner reviews the current complete 48-card sheets;
- normal `npm run build` and Pages output must return 404 for `workshop.html` and include no authored
  sources, local filesystem bridge, approval record, or Sharp/Node adapter.

Current result:

- the deterministic importer, package builder, dual sheets, local Workshop, token-protected local
  bridge, strict approval validator, and technical/release scripts are implemented;
- Pilot Candidate V1 was owner-approved, and the primary package now truthfully builds all 48
  original faces plus a matching back from immutable 1600×2560 WebP masters;
- its complete runtime manifest, all 48 table/thumbnail derivatives, and both complete contact
  sheets build deterministically;
- the owner approved the complete deck after the July Bush Clover Plain B correction; package
  v1.0.0 now has a current semantic-digest-bound `approval.json`, an `approved` runtime manifest,
  and a clean `npm run validate:phase2e:release` result;
- a complete 48-face plus back second technical package is built in tests and decoded through the
  strict runtime manifest contract;
- implementation commit `31da04f` is on `origin/main`; CI run `31327748444` and Pages run
  `31327748453` passed the full repository and Phase 2E gates, the cache-busted live page rendered,
  and the local-only Workshop route returned 404;
- additional decks remain supported as separate complete packages or inherited packages that
  override selected faces/back without changing canonical CardIds or engine rules.

Architecture is locked in
[`ADR 0011`](./adr/0011-phase-2e-workshop-import-approval-boundary.md).

### Phase 3A — Complete local turn loop

Status: **implemented, accepted, committed, and deployed; owner verification next**.

Deliver:

- replace the technical input browser fixture with a real local `PlayerObservationV1` adapter;
- execute legal Hand, Draw-choice, capture, and existing decision intents through the pure engine;
- use the approved primary deck by default while retaining additional installed deck packages;
- animate engine public events through recipient-relative trusted projection boundaries;
- support legal field overflow above eight cards without abandoning the stable 2×4 layout;
- cover the table before switching local players and reveal the next hand only after explicit Ready;
- append a concise accessible HTML recap after every completed turn or round-result boundary;
- keep hidden hands/draw order, checkpoints, RNG, and command IDs out of the public text surface.

Gate:

- `LOCAL-001` through `LOCAL-008` execute the real runtime/projection/command/animation/recap/handoff
  paths with literal expectations;
- a deterministic legal-action driver completes the first round and records one authoritative
  result without mutating earlier observations or consuming gameplay RNG;
- the root and repository-prefixed production builds load the approved 48-card primary package at
  seven supported viewports with no clipped layout zones or browser/network errors;
- a real 390×844 browser trace executes Hand → Draw → field/capture, appends one recap, enters the
  full privacy cover, switches to Player B only after Ready, and restarts cleanly;
- `render_game_to_text` includes only face-up card identities plus recipient/public state and never
  includes an opponent hand, future draw order, RNG, checkpoint, or command ID;
- Phase 2E's owner approval/release validation and local-only Workshop production exclusion remain
  green.

Architecture is locked in
[`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md) and
[`ADR 0013`](./adr/0013-phase-3b-yaku-presentation-boundary.md).

### Phase 3B — Yaku and Bank/Koi presentation

Status: **implemented and accepted**.

Deliver:

- public, canonical-order yaku progress for both player capture collections;
- one accessible combined decision surface driven only by an authoritative
  `awaitingYakuDecision` context and its legal actions;
- new-yaku, incremental-value-change, Bank award, Koi-Koi continuation, multiplier, special
  privilege, forced-Koi, and 4× cap feedback without browser rule calculation;
- recipient-safe text snapshot/semantic controls and a deterministic production-local browser trace
  using seed `00000000000000000000000000000003`.

Gate:

- all ten `PRES-YAKU-*`, `PRES-KOI-*`, and `PRES-PRIV-001-SAFE-STATE` literal fixture contracts
  are frozen, exported, and executed by presentation/runtime tests;
- root and repository-prefixed production browser traces at 390×844 reach Hand Animals Bank 3 / Koi
  1×→2×, verify Draw continuation before handoff, then reach the final-Draw Blue Scrolls + Scrolls
  total 11 decision with Bank 22 / Koi 2×→3×; a separate fresh Bank trace proves no Hand-Bank Draw;
- seven supported viewports retain the approved deck, 48 persistent cards, no clipped zones, and no
  browser/network errors; output includes yaku-decision, continuation, and Bank-award screenshots;
- `npm run check` retains the full 10,002-match deterministic gate, while `npm run validate:phase3b`
  retains the Phase 2E release/Workshop/root/Pages gates.

Phase 3C owns the dedicated round-result screen, scoring animation, and next-round transition.

### Phase 3C — Round-end presentation

Status: **deployed, live, and owner-accepted**.

Deliver:

- one accessible result dialog driven only by completed public observations/history/events;
- exact Bank, End-of-Play, no-score, automatic evidence, privileged multiplier, and match-complete
  presentation without browser-side scoring or transition-policy calculation;
- a short score-settlement beat with identical final output in every animation mode;
- a public next-round consequence shell plus truthfully named local-slice restart;
- recipient-safe result snapshot, modal focus/input lock, seven-viewport root/Pages evidence, and
  real production-seed Bank/final-Koi browser traces.

Gate:

- all twelve `PRES-RESULT-*` literals are typed, frozen, exported, and executed;
- exact authoritative reason/arithmetic/evidence/next-starter values remain unchanged through the
  presentation mapper and serialized surface;
- cards settle before Phase 3B feedback, score/result reveal, and modal focus; the modal cannot be
  escaped through card, deck, motion, fullscreen, handoff, or restart controls;
- `npm run check` retains the 10,002-match deterministic gate, while `validate:phase3c` retains the
  release deck, Workshop exclusion, root/Pages, and all prior Phase 3 gates.

Architecture is recorded in [`ADR 0014`](./adr/0014-phase-3c-round-result-presentation.md).

### Phase 3D — Table clarity and direct interaction

Status: **Phase 3D-A/B/C deployed and accepted**.

Phase 3D addresses the owner-reported visual clutter, disliked color scheme, direct tap-to-match
interaction, and field growth beyond eight cards before onboarding teaches the table.

- **3D-A — Visual direction:** approved Ink & Parchment as the default plus Moonlit Indigo and the
  original-game-inspired Warm Ivory as runtime-selectable themes.
- **3D-B — Interaction cues:** implemented authoritative frozen resolution previews for no-match,
  unique pair, exact-two choice, and sweep. Guided play highlights and accepts the field/matching
  cards directly; Fast still submits unambiguous moves immediately and retains exact-two choice.
- **3D-C — Decluttered production shell:** adopt Ink & Parchment as default, add an accessible
  options-menu theme selector for all three approved schemes, collapse advanced controls and long
  history, and preserve critical turn/Yaku/result information.
- **3D-D — Adaptive dense field:** replace overflow fanning with deterministic shrink-to-fit grids
  for 8, 9, 12, and the derived 17-card playable bound across supported viewports.

The lean Phase 3D-A decision record and local browser evidence are documented in
[`phase-3d-a-visual-direction.md`](./phase-3d-a-visual-direction.md).

Phase 3D-B gate:

- the engine's `LegalActionV1` supplies the public frozen resolution preview; the web layer may
  validate and render it but cannot infer capture rules or construct another legal action;
- Guided no-match exposes one semantic field-placement surface, unique pair highlights one matching
  field card, exact-two exposes exactly two choices, and sweep highlights all three field cards;
- activating a pair/sweep target reuses the one target-free engine action, while exact-two preserves
  the selected target; selection alone never changes authoritative state;
- root and repository-prefixed Pages traces execute real no-match placement and unique capture at
  390×844, while seven-viewport and all previous result/Yaku/browser gates remain green;
- `validate:phase3db` retains the Phase 3D-A review, approved release deck, Workshop, unit,
  root, and Pages gates.

Architecture is recorded in [`ADR 0015`](./adr/0015-phase-3d-b-authoritative-interaction-previews.md).

Phase 3D-C gate:

- fresh profiles use Ink & Parchment; all three approved themes select at runtime and persist only
  a versioned allowlisted cosmetic record in IndexedDB;
- DOM and Pixi table/card chrome repaint in place while one canvas, 48 CardView identities, deck,
  state version, selection, legal targets, Yaku, and result data remain unchanged;
- Options contains secondary settings and obeys modal focus/critical-state locks; the visible turn
  bar, active-Yaku names/totals, latest event, and complete disclosed history remain accessible;
- root and repository-prefixed Pages builds pass all supported viewports, the one-build three-theme
  gallery, Phase 3D-B interaction traces, Phase 3C scoring/result traces, and zero browser/network
  errors;
- `validate:phase3dc` retains the release-deck, Workshop, unit, root, and Pages gates.

Architecture is recorded in
[`ADR 0016`](./adr/0016-phase-3d-c-runtime-theme-and-options-shell.md).

## Later phases

1. **Phase 4 — Onboarding:** tutorial director, Learn in 60 Seconds, contextual help, and rulebook,
   built over the owner-approved Phase 3D table and interaction model.
2. **Phase 5 — Full local product:** 3/6/12-round formats, persistence, and pass-and-play.
3. **Phase 6 — CPU opponents:** observation-only heuristic/difficulty/personality and deterministic rollout tuning.
4. **Phase 7 — Firebase backend:** new project/emulators, authoritative service, projections, and turn publication.
5. **Phase 8 — Online client:** invite/current-games flow, confirmed commands, opponent-turn replay, and transitions.
6. **Phase 9 — Production polish:** content, accessibility, performance, telemetry/reliability, and release.

No later phase may bypass the acceptance gate of the preceding phase.
