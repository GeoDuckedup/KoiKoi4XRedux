# KoiKoi4x Implementation Plan

**Plan version:** 1.1
**Updated:** August 16, 2026
**Current gate:** Phase 3F-E utility dock/capture cleanup is deployed and accepted; Phase 3F-F
interaction clarity/card inspection is deployed and accepted; Phase 3F-G card inspector yaku
reference/native gesture polish is deployed, live-verified, and accepted; Phase 3F-H active-hand
start cue is deployed, live-verified, and accepted; Phase 3F-I Reveal start cue is deployed,
live-verified, and accepted; Phase 3F-J legal destination pulse is deployed, live-verified, and
accepted; Phase 5A full local match formats is deployed, live-verified, and accepted; Phase 5B local
persistence is deployed, live-verified, and accepted; Phase 6A fair heuristic AI is deployed,
live-verified, and accepted; Phase 6B difficulty and explanations is deployed, live-verified, and
accepted; Phase 6C rollout AI and tuning is locally complete and accepted; next governed phase is
Phase 7A project and emulators

This file tracks the currently approved implementation sequence. [`DESIGN.md`](./DESIGN.md) contains the complete product plan; this file is the concise handoff for the next coding session.

## Phase protocol

- Complete one approved subphase at a time.
- Read [`PROJECT_MANIFEST.md`](./PROJECT_MANIFEST.md) and the governing specifications before substantial work.
- Preserve one clear implementation owner for rules, state, event semantics, hidden information, multiplayer authority, and other tightly coupled systems.
- Parallelize independent investigation when useful; serialize coupled integration.
- Validate against the subphase acceptance gate before recommending the next subphase.
- End every subphase report with scope, files, decisions, exact validation results, limitations, user verification/deployment steps, and the next recommended subphase.
- Never describe static inspection, compilation, or documentation review as runtime gameplay validation.

## Current Phase 5A contract — full local match formats

Status: **deployed, live-verified, and accepted**.

- Engine-owned trigger-time formation chronology is the authority for ordinary-Yaku result rows;
  browser code renders the public projection and never reconstructs qualification.
- The public/protocol/replay revision lands before Phase 5B persistence. It includes final scored rows,
  canonical contributing-card order, and intentional repeated cards across Yaku rows.
- Real local 3/6/12 formats must advance through actual months/starter plans and completed history;
  completed matches must present authoritative outcome and start a real rematch.
- The result is concise first: winner/outcome, Yaku count, multiplier, award, and next action. Ordered
  Yaku galleries, repetitions, chronology, and arithmetic begin in a closed details disclosure.
- `MATCH-5A-001` through `MATCH-5A-011`, ADR 0030, and `npm run validate:phase5a` are the release
  contract. Root and Pages artifacts target `output/phase-5a/e2e/`.
- `npm run check` passed 52 files / 489 ordinary tests, all 10,002 deterministic seeds (3/6/12 =
  3,334 each), deck validation, and the 778-module build. The final single `validate:phase5a` passed
  48/48 release deck approval, 100 technical artifacts, 17 files / 243 focused tests, Workshop,
  14-viewport density review, and full Root/Pages smoke through retained interaction suites,
  End-of-Play, concise/expanded Bank, responsive scrolling, real three-round final restriction, and
  distinct-deal rematch. Compact/expanded portrait/landscape artifacts were inspected; independent
  Terra re-review found no blocker, high, or medium issue.
- Implementation commit `945c2a3` passed CI `31909040672` (`verify`, 19m40s) and Pages
  `31909040671` (`build`, 17m34s; deploy, 10s); both `npm run check` and `validate:phase5a` passed.
  The only hosted annotation was the nonblocking Node 20 GitHub Actions deprecation. A cache-busted
  live HTTP/2 request returned 200 MISS, `Last-Modified: Sat, 15 Aug 2026 21:35:36 GMT`, and
  `assets/index-DQO4OPuh.js` containing the expected result/schema markers. The loaded live browser
  reached `ready:true` with one canvas, 48/48 unique CardViews, 24/0/8/8/8 draw/reveal/player-Hand/
  opponent-Hand/field counts, match length 3, idle `awaitingHandPlay`, no locks, and no
  clipped/invalid/overlap diagnostics. `output/phase-5a/live-ready/shot-2.png` was inspected with no
  error artifact. Phase 5A is deployed, live-verified, and accepted.

## Phase 5B contract — local persistence

Status: **deployed, live-verified, and accepted**.

- One active `mode: "local"` IndexedDB save stores private authoritative state plus checkpoint/RNG,
  required version/identity/timestamp metadata, and no command log or presentation state.
- Strict exact-shape/schema/invariant decode performs no legacy or future migration. A valid save
  offers Continue/Delete; corrupt recovery offers Delete, Start New, and a sanitized diagnostic
  export without raw private save data.
- Autosave occurs only after presentation settlement at `awaitingHandPlay`,
  `awaitingDrawResolution`, `awaitingYakuDecision`, `roundComplete`, or `matchComplete`. Writes are
  serialized/coalesced/monotonic; match-complete remains saved until explicit replacement or delete.
- Resume derives the active viewer and privacy/Ready handoff gate from authority and must remain
  deterministic through decisions, progression, results, and rematches. Storage failure is a visible
  session-only state, never a durability claim.
- `SAVE-5B-001` through `SAVE-5B-009`, ADR 0031, and `npm run validate:phase5b` are the accepted
  local release contract. Root/Pages artifacts are under `output/phase-5b/e2e/`.
- `npm run check` passed 54 files / 513 ordinary tests, 10,002 generated seeds (3/6/12 = 3,334
  each), the 48/48 deck, and the 781-module production build. The final uninterrupted
  `validate:phase5b` exited 0 with the 48/48 release deck, 100 technical artifacts, 17 Phase 5A
  focused files / 247 tests, Workshop, 14 Root/Pages density viewports, full retained Root/Pages
  smoke through 3F/3B/End-of-Play/Bank/real three-round rematch, 3 persistence focused files / 38
  tests, and dedicated Root/Pages persistence smoke with 18 artifacts (nine per base).
- Acceptance includes strict autosave/decode/RNG provenance; Continue plus privacy/Ready; corrupt
  Download/Delete/Start New; decision, round-complete, and match-complete/rematch restore; IndexedDB
  open denial and write conflict. Independent Terra review found no blocker, high, or medium issue.
  A transient density `appReady` timeout passed isolated and uninterrupted reruns; the Pages
  click-readiness harness repair did not weaken product assertions.
- Implementation commit `e10edba` and workflow-budget commit `b8ac977` are deployed. Initial CI
  `31917983898` was canceled solely by the inherited 30-minute hard cap after `check` passed; the
  exact `verify` and Pages `build` budgets were raised to 60 minutes without test changes. Replacement
  CI `31919222493` passed verify 01:17:17–01:51:51 UTC (34m34s), check 01:17:52–01:23:20,
  validation 01:23:20–01:51:48, and artifact upload. Pages `31919222489` passed build
  01:17:37–01:52:44 UTC (35m07s), validation 01:23:58–01:52:36, and deploy 01:52:48–01:52:56 (8s).
- Cache-busted live HTTP/2 was 200 MISS with `Last-Modified: Sun, 16 Aug 2026 01:52:53 GMT`,
  `index-CSmLy86o.js`, `index-DRn1Xu7z.css`, and the expected Continue/Review/storage/corrupt-save
  markers. Three fresh live-browser iterations were ready with one canvas, 48 unique CardViews,
  24/8/8/8 zones, idle unlocked 16 semantic controls, approved `new-primary-deck`, and available idle
  persistence with `lastSavedAt` and round/month 1; clean `shot-2` was inspected.

## Phase 6A contract — fair heuristic AI

Status: **deployed, live-verified, and accepted**.

- `apps/web/src/ai` owns a pure deterministic `PlayerObservationV1 -> LegalActionV1 | null` selector.
  It receives neither authoritative state nor a random source, and it can return only an exact
  member of the observation's existing legal-action list. The runtime—not the heuristic—creates a
  command ID and submits it through the existing accepted-command path.
- Timid, Monk, and Gambler are preference profiles, not difficulty tiers. Phase 6A excludes
  explanations/reason tokens/confidence, difficulty, match-context adaptation, seeded noise,
  determinization, rollouts, online/Firebase work, and CPU/practice persistence.
- CPU matches are session-only player A (human) versus player B (CPU) in every existing 3/6/12
  format. During a CPU turn, the player-A observation remains the only renderer/text source; the
  adapter may obtain a transient player-B observation for the heuristic but must never expose that
  hand. It locks human input and sends the resulting normal legal command through the standard
  public-event AnimationDirector path.
- `AI-6A-001` through `AI-6A-005`, ADR 0032, and `npm run validate:phase6a` are locally accepted.
  Focused paths are `apps/web/tests/fair-heuristic-ai.test.ts` and
  `apps/web/tests/cpu-round-runtime.test.ts`; generated coverage is 360 deterministic complete
  trials (3 personalities × 3/6/12 formats × 40 seeds) in four bounded sequential shards. This is
  intentionally smaller than Phase 1E's 10,002-match rules gate to preserve the hosted 60-minute
  budget while still covering every personality/format cell and aggregate direction.
- Focused Root/Pages CPU artifacts pass under `output/phase-6a/e2e/`: CPU input lock, a standard
  public-event animation frame, settled return to the human, CPU-hand redaction, resume preservation,
  and landscape option/personality selection. Full seven-viewport baseline remains inherited from
  Phase 5B.
- Local closure: `npm run check` passed format/lint/all workspace typechecks/decks, 58 files / 532
  ordinary tests, 10,002 deterministic seeds (3/6/12 = 3,334 each), and the 783-module production
  build. `npm run validate:phase6a` passed its retained release deck, technical artifacts, inherited
  focused/runtime/Workshop/density/Root/Pages/persistence suites, 2 Phase 6A files / 16 tests, four
  90-trial generated shards with zero illegal/no-action outcomes and directional Bank/Koi metrics, and
  dedicated Root/Pages CPU smoke. All 26 artifacts plus bundled-client one-canvas/48-CardView/no-
  diagnostics evidence were inspected; independent Terra final review was B0/H0. Implementation commit
  `9be2a78d1b26081dd174f55a825c9499057798b4` passed CI `31923716009` (verify 03:13:04Z–03:48:58Z,
  check 03:13:47–03:19:22, validation 03:19:22–03:48:53, artifacts uploaded) and Pages `31923716038`
  (build 03:13:04–03:36:26, check 4m03s, validation 18m32s, deploy 03:36:32–03:36:42). The cache-
  busted live site returned HTTP/2 200 MISS, `Last-Modified: 03:36:37Z`, and
  `index-CsVf0PRK.js`; live Gambler CPU play verified a no-match Hand, Draw capture, status, utility
  lock, privacy, no diagnostics, and an inspected screenshot.
- Nonblocking future hardening: add an explicit landscape Options bounds assertion. Existing CSS and
  internal scroll behavior, including successful lower-action access, were reviewed.

## Phase 6B — difficulty and explanations

Status: **deployed, live-verified, and accepted**.

- Easy, Standard (default), and Hard remain deterministic configurations of the existing fair
  heuristic. Difficulty may strengthen only public score-gap, round/final-round, table-multiplier,
  scheduled-month, and already-issued-action context; it does not alter the Timid/Monk/Gambler
  identities or add RNG/noise, determinization, search, rollouts, opponent modeling, engine/protocol
  authority, replay, online work, or CPU persistence.
- A decision envelope retains an exact offered action and adds exactly one canonical public reason:
  `secureLead`, `completeYaku`, `denyVisibleThreat`, `strongFuturePotential`,
  `multiplierPressure`, or `comebackRisk`; numeric confidence is finite and inclusive `[0,1]`, then
  mapped to a compact UI band. The explanation appears only after its normal public-event animation
  settles and is derived only from the player-A-safe public observation plus public action/events.
- CPU match configuration and the latest explanation remain session-only. They neither create nor
  mutate the Phase 5B local save. During CPU thinking, player A sees no selected CPU card, action,
  reason, confidence, candidate score, hidden-card inference, or private-hand rationale.
- `AI-6B-001` through `AI-6B-007`, ADR 0033, and `npm run validate:phase6b` are the accepted local
  release contract. The gate retains `validate:phase6a`, adds focused decision/runtime/preview tests, and
  runs 1,080 deterministic complete trials (3 personalities × 3 difficulties × 3/6/12 × 40 seeds)
  in four 270-trial bounded shards. Root/Pages artifacts belong under `output/phase-6b/e2e/`.
- Required browser matrix per Root and Pages: session-only resume start; Timid/Easy 390×844 Options;
  Gambler/Hard 844×390 Options bounds/lower-action access; Monk/Standard resume thinking, animation,
  explanation, settled, and privacy; Timid/Easy thinking, explanation, and settled; Gambler/Hard
  thinking, explanation, and settled. Every CPU-thinking substep retains explanation privacy; after
  settlement the public banner is compact and does not obscure the field.
- `npm run check` passed 59 files / 539 ordinary tests, 10,002 seeded matches, the 48/48 deck, and the
  783-module build. The uninterrupted final `npm run validate:phase6b` exited 0 with 17 inherited
  focused files / 247 tests, Workshop, 14 density viewports, full retained Root/Pages Phase 5A, 3
  persistence files / 38 tests plus dedicated Root/Pages, 2 Phase 6A focused files / 22 tests, 360
  generated trials, Phase 6A Root/Pages, 3 Phase 6B focused files / 25 tests, 1,080 generated trials,
  and Phase 6B Root/Pages. All 26 Phase 6B PNGs were visually inspected; independent review was B0/H0.
  The late-suite first-navigation flake was repaired narrowly with navigation `commit` plus the retained
  application-ready assertion and revalidated. Implementation commit
  `2a84ce143db29f9172590419f9b9492a22dbe643` passed CI `31958387075` (verify 37m47s; check
  16:22:38–16:28:14Z; validation 16:28:14–16:59:38Z; artifact upload), with only a Node 20 action
  deprecation notice. Pages `31958387069` passed build 16:21:54–16:52:24Z, validation
  16:27:50–16:52:18Z, and deploy 16:52:29–16:52:39Z. Live HTTP/2 was 200 MISS with
  `Last-Modified: 16:52:34Z`, `index-WMa9jsmo.js`, `index-D3Qe8KIR.css`, and the exact
  difficulty/reason markers. Live Playwright observed Standard default, selected CPU Hard/Monk,
  completed real no-match Hand/Draw interaction into CPU settlement, reported zero console errors,
  and inspected `output/playwright/phase6b-live-monk-hard-390x844.png`. Phase 6C is next.

## Phase 6C — rollout AI and tuning

Status: **locally complete and accepted; hosted release pending**.

- ADR 0034 locks a non-authoritative observation-only belief rollout. It samples the unseen-card
  complement consistently with public counts but cannot receive/reconstruct live authority or create
  legality; each result must remain one exact action already offered by the CPU observation.
- Fixed budgets are Easy 4 sampled worlds/1 abstract capture ply, Standard 12/2, and Hard 24/4,
  with a 2,048-node hard cap. A predictable public-derived seed is session-only and breaks utility
  ties only; it may not add score noise or overturn a non-tied decision.
- Belief worlds, seeds, margins, and raw candidate scores are private implementation data and are
  forbidden from UI, accessible text, diagnostic state, save/replay data, and public explanations.
  The Phase 6B after-settlement public explanation and Phase 5B save boundary remain unchanged.
- `AI-6C-001` through `AI-6C-010` and `npm run validate:phase6c` are the accepted local contract.
  The gate inherits Phase 6B, adds `fair-rollout-ai` plus CPU runtime/preview coverage, an
  initial 270-complete-match matrix (3 personalities × 3 difficulties × 3/6/12 × 10 seeds), and
  dedicated Root/Pages smoke. Generated work is split into four whole-seed shards after a one-matrix
  benchmark; artifacts belong under `output/phase-6c/reports/` and `output/phase-6c/e2e/`.
- Reports are aggregate-only: matrix labels/counts, budget/time and balance metrics, illegal/no-action
  counts, and a canonical digest are allowed. Card IDs, hidden assignments, seeds, command/checkpoint
  material, per-match traces, and raw candidate scores are forbidden.
- `npm run check` passed 61 files / 557 ordinary tests, all 10,002 engine seeds, both complete decks,
  and the 784-module production build with a dedicated worker chunk. The uninterrupted
  `npm run validate:phase6c` exited 0 through 247 inherited focused tests, Workshop, 14 density
  viewports, all retained Root/Pages suites, 360 Phase 6A trials, 1,080 Phase 6B trials, 27 Phase 6C
  focused tests, 270 rollout-report matches, and final Root/Pages worker smoke.
- The four release reports have zero illegal/no-action/invalid-state/command-limit/non-finite
  counters. Twelve Root/Pages PNGs cover resume, worker thinking, public animation, settlement,
  stale-request cancellation, privacy, and portrait/landscape Options; representative artifacts were
  inspected. Independent review is B0/H0. Commit, push, hosted CI/Pages, deployment, and live
  verification remain pending.

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
- `playHandCard` resolves the hand and reveals the top ordered Draw card, then always enters
  `awaitingDrawResolution`; the engine provides the public 0/1/2/3 preview and only
  `resolveDrawCard` completes the Draw in a second accepted transition;
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

Status: **Phase 3D-A/B/C/D deployed and accepted**.

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

Phase 3D-D gate:

- counts through eight preserve the familiar four-by-two field, while 9–17 cards use the
  deterministic maximum-readable-size adaptive grid with exact public field order;
- 8/9/12/17 remain 5:8, contained, and non-overlapping at every supported viewport; above-seventeen
  presentation counts fail closed;
- dense target territories never overlap, remain at least 24×36px at the legal boundary, retain
  roving-keyboard activation, and leave hand controls at 44px;
- direct placement/capture motion completes before the separate density reflow settles unrelated
  cards, with no CardView recreation or browser-side rules;
- an isolated non-shipping Pixi harness passes all seven root and Pages viewports with 17 cards,
  three semantic targets, pointer/keyboard activation, one canvas, 48 CardViews, and zero errors;
- `validate:phase3dd` retains every Phase 3D-C/release/Workshop/root/Pages gate and adds the isolated
  dense-field browser matrix.

Architecture is recorded in
[`ADR 0017`](./adr/0017-phase-3d-d-adaptive-dense-field.md).

### Phase 3E — Playability corrections

Status: **deployed and accepted**.

- **3E-A — Table clarity and decision surfaces:** remove empty field-slot chrome, anchor Options at
  the bottom, add public capture inspection, keep the field visible during Koi-Koi decisions, and
  stage result details behind disclosure.
- **3E-B — Authoritative interactive Draw resolution:** introduce an explicit legal Draw-resolution
  action for no-match, unique-pair, exact-two, and sweep outcomes without duplicating rules in the
  browser.
- **3E-C — Draw animation and browser integration:** animate the physical top card into Reveal,
  connect the shared Hand/Draw interaction language, and validate accessibility/replay.

Phase 3E-A gate:

- permanent field slot outlines/numbers are absent while adaptive placement geometry remains;
- Options stays at the bottom safe area without covering active play;
- each nonempty public capture rail opens an exact category/card inspector and changes no game
  state or private projection;
- the Koi-Koi tray does not overlap the game frame, retains capture inspection, and leaves only
  authoritative Bank/Koi actions executable;
- Round Result initially shows outcome, points, totals, and one action; secondary scoring,
  evidence, transition, and history begin collapsed;
- root and Pages real-game traces pass required responsive/focus/privacy/card-identity checks with
  no browser or network errors.

Architecture is recorded in [`ADR 0018`](./adr/0018-phase-3e-a-table-clarity.md).

Phase 3E-B gate:

- each Hand command reveals exactly one Draw card into `awaitingDrawResolution`, without resolving
  it or checking Draw yaku early;
- engine-owned public previews and player-scoped legal actions cover no-match placement, unique
  pair, exact-two target choice, and four-card sweep; stale/illegal resolution commands are inert;
- `resolveDrawCard` is the only Draw completion command; replay/projection/protocol validation retain
  the revealed card but never opponent hands, deck order, RNG, checkpoints, or command metadata;
- Guided and Fast interaction require an explicit tap of Reveal, then expose only the authoritative
  field cues/confirmation for that preview;
- focused engine, protocol, fixture, web, and Root/Pages browser traces pass. Physical top-of-deck
  choreography remains Phase 3E-C.

Architecture is recorded in [`ADR 0019`](./adr/0019-phase-3e-b-authoritative-draw-resolution.md).

Phase 3E-C gate:

- exactly one face-down CardView visibly departs from the geometry-only top of the draw pile after
  the authoritative `drawCardRevealed` event, while every remaining hidden back stays in place;
- it travels to Reveal, flips there, pauses for identification, and only then exposes the existing
  single Reveal control and 3E-B Guided/Fast resolution cues;
- engine state, commands, legal actions, replay payloads, and public projections remain unchanged;
- root and repository-prefixed Pages traces capture travel, pause, and keyboard-actionable Reveal
  checkpoints with one canvas, 48 stable CardViews, no hidden identity leak, and zero errors;
- `npm run validate:phase3ec` retains the complete 3E-B engine/protocol/replay gate plus focused
  physical-draw tests and root/Pages browser evidence.

Architecture is recorded in [`ADR 0020`](./adr/0020-phase-3e-c-physical-draw-choreography.md).

### Phase 3F — Focused playtesting polish

Status: **Phase 3F-A, the player-facing Phase 3F-B tap-only outcome, and Phase 3F-C visual
interaction cues are deployed and accepted.**

- **3F-A — Simplified table and larger hand:** remove routine phase/status and confirmation chrome,
  give the former canvas action-strip height to Player Hand, and reduce Options to essential
  cosmetic/table controls.
- **3F-B — Unified tap-only interaction:** remove the temporary Guided confirmation state so legal
  card/field taps are the only ordinary play language; explicit Bank/Koi-Koi remains. The legacy
  internal Guided naming is deferred because it does not affect player behavior.
- **3F-C — Visual interaction cues:** clarify selected source, legal targets, no-match field
  destination, and settled Reveal actionability while keeping the table uncluttered and responsive.

Phase 3F-A gate:

- the table has no visible routine phase/status, initial-ready recap, or Confirm/Cancel strip;
- the player-hand zone receives the removed action-strip reserve and materially enlarges all eight
  cards without reducing field, Draw, Reveal, capture, or opponent geometry;
- Options contains Theme, deck, fullscreen, restart, and close, with no Play style, Motion, Faster,
  or Finish controls;
- normal presentation automatically honors the operating-system reduced-motion preference;
- authoritative legal actions, Draw resolution, Bank/Koi-Koi, handoff/result/capture inspection,
  one canvas, 48 CardViews, and the 8–17-card field remain intact;
- CI/Pages run the full repository `check` once, then `npm run validate:phase3fa` runs one copy each
  of the release deck, technical decks, focused shell/input/animation/runtime tests, Workshop,
  dense-field review, and root/Pages seven-viewport browser evidence with no errors.

Architecture is recorded in [`ADR 0021`](./adr/0021-phase-3f-a-simplified-table-shell.md).

Phase 3F-C gate:

- selected sources, legal field targets, no-match field destinations, and settled Reveal sources use
  one readable visual language without restoring visible Confirm/Cancel or routine status chrome;
- semantic target and field-destination overlays retain pointer and keyboard behavior but do not draw
  pointer-visible DOM border/background chrome over Pixi cards or the field;
- all three runtime themes, root and Pages bases, seven supported viewports, one canvas, 48 CardViews,
  field readability, and current authority boundaries remain intact;
- CI/Pages run `npm run validate:phase3fc`, a flattened release/deck/focused-test/Workshop/density/
  root/Pages gate, and upload `output/phase-3f-c/e2e/` evidence.

Architecture is recorded in [`ADR 0022`](./adr/0022-phase-3f-c-visual-interaction-cues.md).

Release commit `4181375` passed CI run `31820056292` (`verify`, 16m03s) and Pages run
`31820056288` (`build`, 15m58s; `deploy`, 46s). A cache-busted live request returned HTTP 200 with a
cache MISS and `Last-Modified: Fri, 14 Aug 2026 16:52:20 GMT`. The live bundled game client reached
ready state with the approved Primary Deck, one canvas, 48 CardViews / 48 unique identities, the
expected 8 hand / 8 field / 24 draw allocation, no empty placeholders, no layout diagnostics, and
a clean idle screenshot under `output/phase-3f-c/live-ready/shot-1.png`. No secret, hosting setting,
or runtime configuration change was required.

### Phase 3F-D — Placement and capture choreography

Status: **implemented, deployed, live-verified, and accepted**.

Keep the interaction architecture from 3F-B/C. This presentation-only pass first reflows the
existing field to prepare a no-match source's final slot, then travels that source directly to it.
Hand and Draw capture use source-over-authoritative-target, 180ms hold, then collection.
`captureStarted` is the only anchor authority; a sweep anchors to its first public target while all
targets remain still. `drawResolutionRequired` has no generic motion before the Reveal action. A
selected no-match field gains a stronger temporary cue and header-adjacent `PLACE HERE` badge, never
idle placeholders or copy over art.

Gate:

- `CHOREO-3FD-001` through `CHOREO-3FD-007` bind Hand/Draw 0/1/2/3 outcomes, frozen first-target
  metadata, overlap/hold/collection ordering, no pre-tap Draw motion, pre-travel field reflow, and
  all-mode final parity;
- root and Pages browser runs capture a real no-match mid-travel and Hand pair overlap hold, and
  retain the top-card Draw/reveal flow with no movement before Reveal is tapped;
- one canvas, 48 persistent CardViews, public-projection authority, dense-field containment, and
  reduced-motion parity remain intact.

Architecture is recorded in [`ADR 0023`](./adr/0023-phase-3f-d-placement-capture-choreography.md).

Local evidence: `npm run check` passed format/lint/typecheck/decks, 46 files / 442 tests, all 10,002
generated seeds, and the production build. One final `npm run validate:phase3fd` invocation passed
the approved 48/48 release deck, 100 technical artifacts, focused 5 files / 77 tests, Workshop,
the 17-card density review at 14 root/Pages viewports, and full root/Pages smoke. The bundled
web-game client also passed with one canvas, 48 CardViews, clean diagnostics, and inspected
`output/phase-3f-d/game-client` state/screenshot evidence. Independent Terra review found no
blocker, high, or medium issue; the Root and Pages CHOREO screenshots were visually inspected and
matched. Release commit `108fb05` passed CI run `31844698117` (`verify`, 9m04s) and Pages run
`31844698124` (`build`, 11m33s; `deploy`, 9s). The cache-busted live URL
`https://geoduckedup.github.io/KoiKoi4XRedux/?phase3fd=108fb05` returned HTTP/2 200 with `x-cache:
MISS`, `Last-Modified: Fri, 14 Aug 2026 22:09:56 GMT`, and `assets/index-DjACAdI7.js`. Two bundled
live-client iterations reached `ready: true` with the approved `new-primary-deck`, one canvas, 48/48
CardViews, 8 field / 8 hand / 24 draw, and zero clipped/invalid/overlap diagnostics. The inspected
live screenshot and state are `output/phase-3f-d/live-ready/shot-1.png` and `state-1.json`.

### Phase 3F-E — Utility dock and capture cleanup

Status: **implemented, independently reviewed, deployed, live-verified, and accepted**.

This is a presentation-only refinement of the established local-table shell. The bottom-safe utility
row contains exactly **History**, **Yaku Guide**, and **Options**, in that order. History exposes the
complete public event recap without reopening the retired inline recap. Yaku Guide is a read-only
reference to the closed thirteen-yaku ruleset, with an example image and short explanation for every
canonical yaku; it is not tutorial/onboarding logic and never evaluates the current table. Options
retains its existing cosmetic/table controls.

Capture inspection keeps its public-card-only ownership and modal/focus behavior, but gallery cards
must retain the regular 5:8 Hanafuda proportion and a clear light frame rather than appearing
vertically stretched. Routine hand count/points labels, capture-category zero counts, and the Reveal
section label are removed where the card/table already communicates that information. This slice
does not alter rules, legal actions, scoring, animation authority, card identity, or hidden-state
projection. Exact yaku-card evidence in formation order remains Phase 5A result-detail ownership.

Gate:

- `UTILITY-3FE-001` through `UTILITY-3FE-008` bind utility order, modal/focus behavior, closed
  thirteen-yaku reference completeness, decluttered table labels, capture-only positive counts,
  regular-ratio/light-frame capture cards, privacy, and responsive root/Pages behavior;
- root and repository-prefixed production traces exercise History, Yaku Guide, Options, and public
  capture inspection at all seven supported viewports plus focused 390×844 and 844×390 checks;
- dialogs are mutually exclusive, Escape restores focus to the initiating utility/capture control,
  inactive routine recap has no visible footprint, and no utility action changes authoritative state;
- one canvas, 48 persistent CardViews, public-projection boundaries, dense-field containment, and
  zero browser/network errors remain intact;
- CI/Pages run `npm run validate:phase3fe`, a flattened successor gate that runs the approved release
  deck, technical decks, focused presentation tests, Workshop, density review, and root/Pages smoke,
  then uploads `output/phase-3f-e/e2e/` evidence.

Architecture is recorded in [`ADR 0024`](./adr/0024-phase-3f-e-utility-dock-and-capture-cleanup.md).

Local closure evidence: `npm run check` passed format/lint/typecheck/decks, 47 files / 444 ordinary
tests, all 10,002 generated matches, and the 772-module production build. `npm run
validate:phase3fe` passed release deck approval (48/48), all 100 technical deck artifacts, 6 focused
files / 79 tests, Workshop, fourteen root/Pages dense-field checks, and root/Pages utility smoke.
The bundled skill client reached ready state with one canvas and 48 persistent CardViews. The focused
390×844 Guide and capture-inspection screenshots plus the 844×390 dock screenshot were visually
inspected under `output/phase-3f-e/e2e/`. Independent Terra review initially found two medium issues:
the frame test did not prove a clearly light border in every theme, and Options was missing from the
complete utility-dialog mutual-exclusion guard. Both were repaired; the post-repair review reports no
blocker, high, or medium finding.

Release commit `f8358d8` passed CI run `31855285354` (`verify`, 01:00:16–01:11:13 UTC) and Pages
run `31855285349` (`build`, 01:00:17–01:13:15; `deploy`, 01:13:19–01:13:27). The cache-busted live
URL returned HTTP/2 200 with a cache MISS, `Last-Modified: Sat, 15 Aug 2026 01:13:23 GMT`, and
production assets `index-DMr_DIMH.js` / `index-DwN18UTX.css`. The bundled live client first captured
the expected `ready:false` texture-loading state, then `state-1` and `state-2` at `ready:true` with
the approved `new-primary-deck`, one canvas, 48/48 unique CardViews, 8 field, 8 hand, 24 draw, and
clean diagnostics. The states and screenshots under `output/phase-3f-e/live-ready/` were inspected.

### Phase 3F-F — Interaction clarity and card inspection

Status: **deployed, live-verified, and accepted**.

This presentation/input pass makes selected Hand and settled Reveal sources, legal field targets,
and legal no-match field destinations share a stronger yellow-gold language. It adds optional,
read-only phase help and a privacy-safe card inspector for face-up public Field cards and the local
player’s own Hand. Short taps retain their existing legal-action behavior; inspection never submits a
move. Help is contextual but is not tutorial/onboarding or strategic advice.

Gate:

- `VISUAL-3FF-001` through `VISUAL-3FF-008` bind the gold cue family, 20% stronger normalized cue
  tokens, no-match field destination, Reveal parity/no pre-tap movement, phase help, inspector
  gesture cancellation, accessibility/modal behavior, and root/Pages privacy/containment;
- no engine, protocol, scoring, replay, result, hidden-information, or persistent-CardView semantics
  change; exact chronological yaku-card evidence remains Phase 5A;
- CI/Pages ran the flattened `npm run validate:phase3ff` gate and uploaded
  `output/phase-3f-f/e2e/` evidence.

Local evidence: `validate:phase3ff` passed release approval (48/48), 100 technical artifacts, 7
focused files / 83 tests, Workshop, 14 root/Pages density viewports, and root/Pages smoke. All-web
validation passed 143 tests and build. Initial independent review found four medium gesture/scope
issues; repairs received clean re-review. `npm run check` passed 48 files / 448 ordinary tests, all
10,002 deterministic seeds, and the 774-module production build. The inspected final bundled-client
state/screenshot under `output/phase-3f-f/game-client-final/` show ready at 1280×720 with one canvas,
48 unique CardViews, 8 hand / 8 field / 24 draw, 8 actionable plus 8 inspect-only semantic controls,
closed utility surfaces, and no diagnostics. CI/Pages and live verification are complete.

Architecture is recorded in [`ADR 0025`](./adr/0025-phase-3f-f-interaction-clarity-and-card-inspection.md).

### Phase 3F-G — Card inspector yaku reference and native gesture polish

Status: **deployed, live-verified, and accepted**.

This narrow presentation/reference follow-up to 3F-F replaces the inspector's factual grid
with a collapsed optional **Yaku this card can contribute to** expander that reuses the Yaku Guide's
static reference language and visual treatment. It names general catalog-defined contributions only;
it never claims a yaku is achieved, available now, or strategically preferable. Native selection and
browser touch-callout suppression apply only to game card interaction surfaces so a long press does
not produce browser-owned selection chrome; ordinary dialog/body text remains selectable and
scrollable.

Gate:

- `VISUAL-3FG-001` through `VISUAL-3FG-007` bind scoped native-selection suppression, collapsed
  expander semantics, all-48-card canonical reference mapping, internal dialog scrolling,
  keyboard/pointer/modal parity, privacy/authority invariants, and root/Pages responsive theme
  evidence;
- this remains browser presentation/reference work only: no engine, protocol, rules, scoring, legal
  actions, replay, public projection, result type, or persistent-CardView identity changes; Phase 5A
  alone records exact completed-yaku cards and their formation chronology in results;
- `npm run validate:phase3fg` is the flattened gate. It retains release-deck, technical-deck,
  interaction/runtime, Workshop, density-review, and root/Pages smoke checks while adding focused
  `phase3fg-card-inspector.test.ts` coverage. CI and Pages use `output/phase-3f-g/e2e/` evidence.

Local evidence: `npm run check` passed 49 ordinary test files / 452 tests, all 10,002 generated
seeds, release-deck validation, and the 774-module build. `npm run validate:phase3fg` passed the
48/48 release deck, 100 technical artifacts, 8 focused files / 87 tests, Workshop, 14 root/Pages
density viewports, and full root/Pages smoke. An independent Terra re-review found no blocker, high,
or medium issue. The bundled develop-web-game client completed three 1280×720 iterations with one
canvas, 48 unique CardViews, and no invalid layout; Root/Pages collapsed, expanded, and 844×390
scroll-bottom screenshots were inspected under `output/phase-3f-g/e2e/`. A WebKit or real-device
check remains supplemental evidence for browser touch-callout behavior; no additional heavyweight CI
browser install is required.

Deployment evidence: commit `9fafb2f` passed hosted CI run `31868152672` (`verify`, 10m38s) and
Pages run `31868152577` (build through 06:05:54Z; deploy 06:05:58–06:06:06Z). The cache-busted live
site returned HTTP/2 200 MISS with `Last-Modified: 2026-08-15 06:06:03 GMT`. The live bundled
game-client completed two ready iterations with one canvas, 48 unique CardViews, and no layout
diagnostics. Live Playwright semantic verification focused January Pine Plain B, pressed `I`, opened
the locked inspector with collapsed count 2, then expanded Current-Month Set and Plain Cards with
their exact example images and conditional copy.

Architecture is recorded in [`ADR 0026`](./adr/0026-phase-3f-g-card-inspector-yaku-reference.md).

### Phase 3F-H — Active-hand start cue

Status: **deployed, live-verified, and accepted**.

This narrow presentation-only follow-up makes the beginning of a local Hand turn visually obvious:
an `aria-hidden`, pointer-inert decorative DOM perimeter follows the canonical actual Player Hand
zone while the player is idle and must choose a Hand card. It is neither a card selection nor a
legal-target cue. Selecting a source removes it immediately; Pixi's existing gold
selected-source/target language, no-match destination, and tap-only authority remain unchanged. It
stays absent outside the idle local Hand step and becomes a steady white outline under reduced motion.

Gate:

- `VISUAL-3FH-001` through `VISUAL-3FH-005` bind eligibility, lifecycle, theme/reduced-motion
  treatment, privacy/authority, and root/Pages evidence;
- no engine, protocol, rules, legal-action, scoring, replay, projection, result, semantic-control,
  or persistent-CardView semantics change; Phase 5A retains ordered completed-yaku result evidence;
- `npm run validate:phase3fh` is the flattened successor gate. It retains the 3F-G relevant
  release-deck, technical-deck, interaction/runtime, Workshop, density-review, and root/Pages smoke
  checks while adding focused `phase3fh-hand-start-cue.test.ts` coverage. CI and Pages will use
  `output/phase-3f-h/e2e/` evidence.

Local evidence: `npm run check` passed 50 ordinary test files / 456 tests, all 10,002 generated
seeds, deck validation, and the 775-module build. `npm run validate:phase3fh` passed the 48/48
release deck, 100 technical artifacts, 9 focused files / 91 tests, Workshop, 14 root/Pages density
viewports, and full root/Pages smoke through Bank/restart. The bundled web-game client completed
three ready 1280×720 iterations with one canvas, 48 unique CardViews, and no layout diagnostics.
Root/Pages 390×844, selected, 844×390, three-theme, and reduced-motion screenshots under
`output/phase-3f-h/e2e/` were inspected. Initial browser evidence caught an Options path that reset a
selected source by refreshing the whole interaction surface; it was repaired with a decorative-only
cue renderer, preserving the existing selection lifecycle, and the rerun was green. Independent Terra
re-review found no blocker, high, or medium issue.

Deployment evidence: commit `55a4032` passed hosted CI run `31873371558` (`verify`,
08:00:07–08:13:59Z; both `check` and `validate:phase3fh` passed) and Pages run `31873371515`
(`build`, 08:00:08–08:12:34Z; `deploy`, 08:12:39–08:12:49Z). A cache-busted live request returned
HTTP/2 200 MISS with `Last-Modified: 2026-08-15 08:12:44 GMT`. The live bundled client completed two
ready iterations with the visible whole-Hand white perimeter, one canvas, 48 stable CardViews, and no
layout diagnostics. A physical iPhone/WebKit check of perceived pulse motion and white-outline
contrast remains supplemental.

### Phase 3F-I — Reveal start cue

Status: **deployed, live-verified, and accepted**.

This narrow presentation-only follow-up makes the settled Draw Reveal step visually obvious without
using the already-reserved gold selection/target language. Once the physical Draw card has completed
travel, flip, and reveal pause, an `aria-hidden`, pointer-inert white outer-edge perimeter will follow
the actual public Reveal card while the local player must select it. It remains absent before that
settled idle Draw state and during locks/utilities. Selecting Reveal removes white; existing gold
selected-source and legal field target/no-match destination feedback then applies. Escape/cancel will
restore the white affordance only when returning to the same idle Reveal state. No field pulse,
movement, card scale, instructions, or new action is introduced.

Gate:

- `VISUAL-3FI-001` through `VISUAL-3FI-006` bind settled-state eligibility, lifecycle, four
  resolution-family predicate coverage, motion/theme responsiveness, privacy/authority, and
  root/Pages evidence;
- no engine, protocol, rules, legal-action, scoring, replay, projection, result, semantic-control,
  or persistent-CardView semantics change; Phase 5A retains ordered completed-yaku result evidence;
- `npm run validate:phase3fi` is the flattened successor gate. It retains the 3F-H relevant
  release-deck, technical-deck, interaction/runtime, Workshop, density-review, and root/Pages smoke
  checks while adding focused `phase3fi-reveal-attention.test.ts` coverage. CI and Pages will use
  `output/phase-3f-i/e2e/` evidence.

`npm run check` passed 51 ordinary test files / 466 tests, all 10,002 generated seeds, deck
validation, and the 776-module build. `npm run validate:phase3fi` passed the 48/48 release deck, 100
technical artifacts, 10 focused files / 101 tests, Workshop, the Phase 3D-D 14 root/Pages density
viewports, and full root/Pages smoke through Bank/restart. Screenshots in `output/phase-3f-i/e2e/`
were inspected for white-before/gold-after source and legal-target/destination language.
The bundled develop-web-game client completed two 1280×720 iterations against the final root
production build: ready `state-0`/`state-1`, one canvas, 48 unique persistent CardViews, 8/8/24
Hand/opponent/draw allocation, idle input, no diagnostics or clipped/invalid/overlap zones, and an
inspected screenshot. Independent Terra review initially found three medium issues—face-up Reveal gating, an exact-bounds regression
from `min-height`, and indirect family/render/selected-Options evidence. All were repaired; clean
re-review found no blocker, high, or medium issue. Commit `a469b4c` passed hosted CI run
`31888143328`: `verify` 13:47:14–14:01:33Z, `check` 13:47:58–13:54:09Z,
`validate:phase3fi` 13:54:09–14:01:26Z, and artifact upload succeeded. Pages run `31888143474`
passed: build 13:47:15–13:59:41Z, `check` 13:47:54–13:53:43Z, `validate:phase3fi`
13:53:43–13:59:35Z, deploy 13:59:46–13:59:54Z. The cache-busted live response was HTTP/2 200 MISS,
`Last-Modified: Sat, 15 Aug 2026 13:59:51 GMT`, bundle `assets/index-Vt-DMjm5.js` /
`assets/index-DsY0wC-9.css`. Its initial two-snapshot client trace captured expected texture loading;
a longer cache-busted run reached ready in 4/4 snapshots with one canvas, 48 unique CardViews, idle
`awaitingHandPlay`, 8/8/24/8 allocation, no clipped/invalid/overlap diagnostics, and an inspected
screenshot. Phase 3F-I is deployed, live-verified, and accepted; iOS/WebKit perceived pulse remains
supplemental.

### Phase 3F-J — Legal destination pulse

Status: **deployed, live-verified, and accepted**.

After the local player selects a Hand or settled Reveal source, the already-authoritative next tap
must become visually active: every legal matching Field card gets a restrained pulsing yellow-gold
edge, or the actual Field receives one pulsing yellow-gold perimeter plus the compact badge
`NO MATCH · PLACE HERE`. The selected source remains solid gold and does not pulse. Before a source
is selected, no Field target or no-match perimeter appears; white remains exclusive to the required
Hand/Reveal start cue. Exact-two and sweep preserve one pulse per legal target without choosing one
for the player. No card moves, scales, fills, or gains a browser-owned legal action.

Gate:

- `VISUAL-3FJ-001` through `VISUAL-3FJ-007` bind source/target lifecycle, no-match wording,
  cardinality, motion/theme/viewport behavior, semantic inertness, and Root/Pages smoke;
- `npm run validate:phase3fj` is the flattened successor gate. It retains the Phase 3F-I release
  deck, technical-deck, interaction/runtime, Workshop, density-review, and Root/Pages smoke checks
  while adding `phase3fj-legal-destination-pulse.test.ts`; CI/Pages artifacts are written under
  `output/phase-3f-j/e2e/`;
- this is presentation-only: it changes no engine, protocol, rules, legal-action, scoring, replay,
  projection, result, semantic-control, or persistent-CardView behavior.

Local closure: `npm run check` passed 52 ordinary test files / 477 tests, all 10,002 generated
seeds, deck validation, and the 777-module build. `npm run validate:phase3fj` passed the 48/48
release deck, 100 technical artifacts, 11 focused files / 112 tests, Workshop, the Phase 3D-D 14
root/Pages density viewports, and full Root/Pages smoke through Bank/restart. Inspected artifacts
under `output/phase-3f-j/e2e/` cover target, no-match, Draw, Warm Ivory, reduced landscape, and
Pages. The first smoke attempt used Field `april-cuckoo` as a Hand source; production opening state
instead exposes Hand `april-red-scroll`, whose authoritative Field target is `april-cuckoo`. A second
repair changed the browser check from false direct equality with the semantic hit area (which is
intentionally partitioned for touch) to legal-territory containment; focused coverage retains exact
CardPlacement-ring geometry. The full rerun was green. Terra independent review found no blocker,
high, or medium finding. The final bundled game client completed three ready iterations with one
canvas, 48 unique CardViews, and no diagnostics. Commit `26828d4` passed hosted CI run `31899208391`
(`verify`, 14m21s) and Pages run `31899208394` (build 12m29s; deploy 10s). The cache-busted live
response was HTTP/2 200 MISS, `Last-Modified: Sat, 15 Aug 2026 17:58:05 GMT`, with
`assets/index-61Vc__HL.js` / `assets/index-CTcqBr2T.css`; live JS contains the exact newly shipped
visible and accessible strings. A three-iteration live client trace recorded loading `state-0`, then
ready `state-1`/`state-2`, one canvas, 48 unique CardViews, no clipped/invalid/overlap diagnostics,
and an inspected live screenshot. The hosted workflow's Node 20 deprecation notice is nonblocking.
Phase 3F-J, Phase 5A, and Phase 5B are deployed, live-verified, and accepted.

## Later phases

1. **Phase 7A — Project and emulators:** Firebase development project, Auth, Firestore, Functions,
   emulator configuration, and deny-by-default rules.
2. **Phase 7B/7C — Authoritative backend:** match service, recipient projections, turn records, and
   callable operations.
3. **Phase 8 — Online client:** invite/current-games flow, confirmed commands, opponent-turn replay, and transitions.
4. **Phase 9A — Product polish:** final interface, accessibility, performance, and reliability pass.
5. **Phase 4 — Onboarding:** tutorial director, Learn in 60 Seconds, contextual help, and rulebook,
   deliberately executed after the final interaction and progression model stabilizes.
6. **Phase 9B — Release acceptance:** final content, telemetry, cross-platform, and release checks.

No later phase may bypass the acceptance gate of the preceding phase.

Phase 3F-E is deployed, live-verified, and accepted. Phase 3F-F interaction clarity/card inspection
is deployed, live-verified, and accepted. Phase 3F-G is deployed, live-verified, and accepted.
Phase 3F-H is deployed, live-verified, and accepted. Phase 3F-I is deployed, live-verified, and
accepted. None of these presentation slices reopen 3F-D
animation authority or transfer Phase 5A's
ordered completed-yaku evidence into routine play.
