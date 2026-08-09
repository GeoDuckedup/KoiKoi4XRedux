# KoiKoi4x Implementation Plan

**Plan version:** 1.0  
**Updated:** August 8, 2026  
**Current gate:** Phase 1B verification and owner review

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

Status: **implemented; awaiting owner review**.

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

## Later phases

1. **Phase 1C–1E — Complete the headless engine:** yaku triggers, round/match rules, projections,
   visibility, and replay.
2. **Phase 2 — Rendering foundation:** responsive Pixi table, persistent cards, deck-package runtime, AnimationDirector, input, and Deck Workshop.
3. **Phase 3 — One-round vertical slice:** complete playable local round and presentation.
4. **Phase 4 — Onboarding:** tutorial director, Learn in 60 Seconds, contextual help, and rulebook.
5. **Phase 5 — Full local product:** 3/6/12-round formats, persistence, and pass-and-play.
6. **Phase 6 — CPU opponents:** observation-only heuristic/difficulty/personality and deterministic rollout tuning.
7. **Phase 7 — Firebase backend:** new project/emulators, authoritative service, projections, and turn publication.
8. **Phase 8 — Online client:** invite/current-games flow, confirmed commands, opponent-turn replay, and transitions.
9. **Phase 9 — Production polish:** content, accessibility, performance, telemetry/reliability, and release.

No later phase may bypass the acceptance gate of the preceding phase.
