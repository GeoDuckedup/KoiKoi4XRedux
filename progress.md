Original prompt: read the package and understand it, then let me know when we are ready to start the first subphase and let me know what it is. after each output, make sure to let me know what i need to do as deployment steps and then the next subphase and what that subphase is. proceed

# KoiKoi4x Progress

## 2026-08-08 — Phase 0A started

- Read the complete v1.6 handoff package and inspected the legacy reference repository.
- Confirmed Phase 0A is documentation-only: canonical rules, decisions, test-vector specifications, authority documents, and intentional legacy differences.
- Owner selected spec-vectors-first sequencing. Canonical CardIds remain Phase 0C work; runnable engine tests remain Phase 1 work.
- Materialized the design, deck-art specification, project manifest, AI workflow, root agent instructions, and owner-approved decision log under their repository authority paths.
- Authored `docs/RULES.md`, `docs/TEST_VECTORS.md`, `docs/LEGACY_DIFFERENCES.md`, `docs/PLAN.md`, and `docs/STATUS.md`.
- Standardized the deck-art authority path as `docs/DECK_ART.md` and added decision/legacy documents to the project manifest.
- Validation passed: all authority files are nonempty; packaged source copies match; deck-art references are normalized; 117 fixture declarations are unique; all 14 approved decisions have coverage rows; canonical score/end-of-play examples are present; legacy terms occur only in the alias definition.
- Phase 0A implementation is complete and awaits owner review.
- Next: Phase 0B repository scaffold after owner approval.

## 2026-08-08 — Phase 0B implemented

- Owner approved Phase 0A and authorized Phase 0B implementation.
- Initialized a new Git repository on `main` without creating a commit or remote.
- Created the locked npm workspace for `apps/web`, `packages/engine`, `packages/protocol`, and
  `packages/test-fixtures`, plus the reserved `functions` boundary.
- Added strict TypeScript, Vite/PixiJS, Vitest, direct Playwright smoke coverage, ESLint, Prettier,
  CI, GitHub Pages deployment, architecture tests, README, ADR, and the five packaged
  `.codex/agents` definitions.
- Implemented a responsive one-canvas Pixi boot surface with semantic DOM support, deterministic
  `window.advanceTime(ms)`, stable `window.render_game_to_text()`, manual rendering with the ticker
  stopped, resize behavior, a fullscreen button, `F` toggle, and `Esc` exit.
- Kept Firebase dependencies/configuration deferred to Phase 7 and copied no legacy runtime code.
- `npm ci` passed: 153 packages installed, 158 audited, 0 vulnerabilities.
- `npm run check` passed after the clean install: format, lint with zero warnings, all four workspace
  typechecks, 2 Vitest files / 4 tests, and the 711-module Vite production build.
- `npm run test:e2e:smoke` passed at 360×640, 390×844, 768×1024, 1366×768, and 1920×1080. It verified
  one canvas, semantic readiness, deterministic time, fullscreen button/F/Esc flows, and no browser
  errors.
- Visual inspection caught a blank stopped-ticker canvas; adding the explicit Pixi render call fixed
  it. Regenerated mobile/desktop screenshots show the intended Hanafuda boot composition.
- The bundled web-game client then passed at 1280×720, including six fractional frame steps, and its
  canvas screenshot/text state were inspected.
- A repository-relative Pages build passed and emitted `/Koikoi4xRedux/` asset URLs.
- Independent read-only acceptance review found no code/runtime/architecture blocker. Its stale-status
  reporting blocker was resolved in `docs/STATUS.md`, `docs/PLAN.md`, and this file.
- Phase 0B is implemented and awaits owner review/deployment.
- Next: Phase 0C canonical card catalog after owner approval.

## 2026-08-08 — Phase 0B baseline deployment

- Configured `https://github.com/GeoDuckedup/KoiKoi4XRedux.git` as `origin` after verifying the remote
  repository was empty.
- Kept the two original handoff ZIP archives as local provenance inputs and added `*.zip` to
  `.gitignore`; the extracted canonical documents remain in the repository.
- Re-ran the complete Phase 0B check suite before deployment.
- Created the initial Phase 0B commit and pushed `main` to GitHub at the owner's request.
- Remaining owner deployment check: confirm GitHub Actions CI, select GitHub Actions as the Pages
  source if required, and inspect the deployed Pages URL when available.
- Next: Phase 0C canonical card catalog after owner approval.

## 2026-08-08 — Phase 0B deployment correction

- Owner enabled GitHub Pages with GitHub Actions and reported that the live page looked incorrect.
- Confirmed the live URL was serving GitHub's Jekyll rendering of the repository README from the
  fallback `pages-build-deployment` workflow, not the Vite/Pixi artifact.
- Confirmed the custom Pages workflow had failed before Pages was enabled and therefore needed a new
  run after enablement.
- Hosted CI completed the five-viewport smoke assertions in eight seconds but remained alive until
  the 15-minute job timeout because the spawned Vite preview process retained an orphan child.
- Replaced the smoke script's spawned preview process with an in-process static server that has
  explicit startup and shutdown ownership, removing the hosted-runner process leak.
- Pushed correction commit `2954a07`; hosted CI then passed the full suite, five-viewport browser
  smoke, and artifact upload in 58 seconds.
- The custom Pages workflow passed its build and deploy jobs after Pages enablement.
- Verified the cache-busted public HTML references repository-prefixed Vite assets rather than Jekyll
  output.
- Ran the bundled web-game client against the public URL and inspected its canvas capture and text
  state: `screen: "boot"`, `ready: true`, exactly one canvas, and six deterministic frame steps.
- The live Phase 0B deployment is correct. Next: Phase 0C canonical card catalog after owner approval.

## 2026-08-08 — Phase 0C implemented

- Owner approved the live Phase 0B baseline and authorized Phase 0C.
- Audited the canonical rules, deck-art contract, locked test-vector binding gate, and legacy factual
  card taxonomy before integration.
- Locked descriptive `<english-month>-<stable-subject-or-role>` CardIds and stable Plain-card
  `-a`/`-b`/`-c` ordinals.
- Implemented the normalized twelve-month table and all 48 frozen artwork-independent records in the
  headless engine package.
- Added exact categories, Scroll kinds, fixed-yaku memberships, Sake Cup/Rain flags, lookup helpers,
  and catalog validation with domain-only key enforcement.
- Added independent literal Phase 0A bindings for Bright subsets, named fixed yaku, category
  thresholds, the seven-Scroll 13-point set, and scheduled/nonscheduled complete-month sets.
- Published the human-readable card authority and updated the locked vector specification to use
  canonical IDs while leaving full state/action scenario schemas for Phase 1.
- `npm run validate:cards` passed 2 files / 10 tests.
- `npm run check` passed format, zero-warning lint, all four workspace typechecks, 4 test files / 15
  tests, and the 711-module production build.
- Independent review found no factual catalog error. Its metadata-lock, broader art-field guard, and
  duplicate-metadata validation findings were implemented; focused follow-up found no blocker.
- Phase 0C changes no browser presentation code; the deployed UI is expected to remain the Phase 0B
  boot surface.
- Phase 0C is implemented and awaits owner review/deployment.
- Next: Phase 0D deck package and art specification foundation after owner approval.

## 2026-08-08 — Phase 0D implemented

- Owner approved Phase 0C and authorized the deck package/art specification foundation.
- Added `@koikoi4x/deck-format` with versioned package/transform contracts, strict validation,
  deterministic root-to-child inheritance and provenance, and normalized Auto/Manual transform math.
- Locked `ART_SPEC v1` in executable constants: 5:8 geometry, source thresholds, critical-subject
  safe area, game-owned frame, format policy, and initial derivative sizes.
- Added isolated Node adapters for source metadata/digest inspection, immutable technical-pilot
  seeding, artifact generation, and CLI validation.
- Created the complete logical `new-primary-deck` 48-card mapping, default back, transforms, pilot
  manifest, and four 1600×2560 technical placeholders covering dense, simple, Bright, and Plain
  process cases.
- Generated the versioned JSON Schemas, SVG Art Guide, and digest-bearing pilot import plan from the
  same locked implementation constants.
- Visually inspected the Art Guide and four pilot PNGs; these are processability evidence only and
  are explicitly not final artwork or visual approval.
- Focused validation passed 6 test files / 26 tests; lint and all five workspace TypeScript checks
  passed; development deck validation resolved exactly 48 cards with 47 Auto / 1 Manual and the
  expected warning for 44 Phase 2 sources not yet present.
- Independent review found and prompted repairs for corrupt-image validation, generated-schema path
  alignment, cross-file package identity, missing release approval, and pre-generation gate reuse.
- The post-repair clean repository check passed 10 files / 41 tests plus format, lint, all five
  typechecks, deck validation, and the 711-module production build.
- Added architecture enforcement and ADR 0002 for the engine/deck-format and portable/Node boundaries.
- Independent follow-up review found no remaining blocker, high, or medium issue and declared Phase
  0D ready to commit and push.
- Committed the Phase 0D implementation as `15ba6b7` and pushed `main` to GitHub.
- Hosted CI run `31284468169` passed in 1m04s, including the five-viewport browser smoke and artifact
  upload. Pages run `31284468195` passed build and deployment.
- Verified the cache-busted public URL returns HTTP 200 and repository-prefixed Vite assets; the live
  boot surface is intentionally unchanged because Phase 0D adds no browser runtime UI.
- Phase 0D is implemented, independently reviewed, pushed, deployed, and awaiting owner approval.
- Next: Phase 1A deterministic headless state, seeded RNG, and deal foundation after owner approval.

## 2026-08-08 — Phase 1B verification in progress

- Implemented the deterministic hand-play, draw, capture, pending draw-choice, turn-completion, and
  End-of-Play seam transitions in the headless engine.
- Added the eight locked `CAP-*` fixtures as complete canonical 48-card allocations and generated
  regression coverage for both legal targets where a two-match choice is required.
- Focused verification passes all five workspace typechecks and 9 test files / 64 tests.
- The browser surface is intentionally unchanged in this headless subphase; visual regression will
  be covered by the existing smoke suite during the full repository check.
- Full formatting, lint, five-workspace typecheck, deck validation, 18-file / 151-test repository
  suite, production build, five-viewport browser smoke, and canvas/text-state inspection passed.
- Independent integration review found two medium invariant/compatibility gaps and two cleanup items;
  all were repaired with regression coverage. No blocker, high, or medium issue remains.
- Clean install, five-viewport browser smoke, and skill-based canvas/text-state inspection pass; the
  inspected browser remains the intended Phase 0B boot surface.
- Committed the reviewed Phase 1B implementation as `7daf664` and pushed it to `origin/main`.
- Hosted CI run `31288042436` passed in 1m01s, including the 151-test repository check,
  five-viewport browser smoke, and artifact upload. Pages run `31288042439` passed build and deploy.
- A cache-busted live request returned HTTP 200 with repository-prefixed assets. The live web-game
  client and inspected screenshot confirmed `screen: "boot"`, `ready: true`, one canvas, and the
  intentionally unchanged Phase 0B composition.
- Phase 1B is implemented, independently reviewed, pushed, deployed, and owner-approved.
- Next: Phase 1C yaku evaluation, active totals, trigger keys, and per-phase combined decision
  contexts after owner approval.

## 2026-08-08 — Phase 1C implemented and deployed

- Owner approved Phase 1C: yaku evaluation, active totals, trigger keys, and per-phase combined
  decision contexts; Bank/Koi-Koi execution remains Phase 1D.
- Completed three parallel read-only audits covering canonical scoring, Phase 1B state-machine seams,
  and all locked Phase 1C fixture IDs.
- Added the closed 13-key yaku contract, immutable active-yaku/decision types, and a pure evaluator
  with one active Bright tier, independent stacking, incremental points, Current-Month Set, and
  capture-evidenced seen-trigger history.
- Integrated separate Hand and Draw checks. Hand decisions commit before draw reveal; Draw decisions
  commit before turn/End-of-Play completion; pending draw choices evaluate only after selection.
- Added explicit literal totals/new-key lists for all 39 locked `YAKU-*` vectors plus production
  traces for multi-yaku, Current-Month sweep/accumulation, value-only increments, pending draws,
  Player B, and final Draw.
- `npm run validate:phase1c` passes 12 files / 115 tests. `npm run check` passes 21 files / 202 tests,
  all five typechecks, format/lint/deck gates, and the 711-module build.
- Five-viewport browser smoke and the skill-based canvas/text-state inspection pass; the visible boot
  surface is intentionally unchanged.
- Independent scoring, state-machine, and fixture reviews found three medium acceptance gaps; all
  were repaired, and follow-up review found no remaining blocker, high, or medium issue.
- Committed the reviewed Phase 1C implementation as `5474fdb` and pushed `main` to GitHub.
- Hosted CI run `31289584472` passed in 1m09s, including the 202-test repository check,
  five-viewport browser smoke, and artifact upload. Pages run `31289584476` passed build/deploy.
- A cache-busted live request returned HTTP 200 with repository-prefixed assets. The live web-game
  client and inspected screenshot confirmed `screen: "boot"`, `ready: true`, one canvas, and the
  intentionally unchanged Phase 0B composition.
- Phase 1C is implemented, independently reviewed, pushed, and deployed; it awaits owner review.
- Next: Phase 1D Bank/Koi-Koi commands, End-of-Play scoring, table multipliers, special/final-round
  rules, starter selection, history, and round/match advancement after owner approval.

## 2026-08-08 — Phase 1D Option A rule-lock correction

- Owner approved Phase 1D.
- Completed parallel read-only audits of the Bank/Koi-Koi rules, state/RNG lifecycle seams, and all
  58 locked Phase 1D-adjacent vectors.
- Added typed Bank/Koi-Koi commands and legal actions, durable round/match result contracts,
  next-starter plans, public lifecycle events, and typed history.
- Integrated ordinary and privileged Bank/Koi-Koi execution, forced final-leader Koi-Koi, Hand-phase
  Draw resumption, direct natural End-of-Play resolution, score commitment, and match completion.
- Added the separate external-checkpoint round-advance API plus an ordered-deck fixture entry point;
  new-round deals reset round-local state while retaining scores/history and privacy audiences.
- Added literal records for all 47 in-scope IDs and executable production traces for the 45 reachable
  cases, including a full natural 16-turn round. Strengthened result/history validation rejects
  fabricated no-score deltas and noncanonical scoring evidence.
- Fixed independent-review findings for inherited privilege on automatic outcomes, no-score result
  arithmetic, live result evidence, and cross-match checkpoint ownership.
- `npm run validate:phase1d` passes 13 files / 158 tests. `npm run check` passes 22 files / 245 tests
  and the 711-module production build. The five-viewport Playwright suite and bundled web-game
  runtime/screenshot inspection pass.
- Independent review proved that `KOI-015A/B` are unreachable under the locked rules: the 1x loser
  is both the next starter and privilege holder, while strict alternation makes the nonstarter the
  final-Draw actor. The current policy-only test therefore cannot become a valid production trace.
- Owner selected Option A: preserve the starter/privilege/turn-order rules and retain `KOI-015A/B`
  as unreachable defensive-policy IDs.
- Canonical Rules, Design, decisions, legacy-difference, and vector records now state the exact
  reachability invariant. Fixture metadata distinguishes 45 reachable traces from two unreachable
  policy assertions.
- Replaced the invalid synthetic success test with authoritative `ROUND_PRIVILEGE_INVALID` rejection
  for both proposed decisions. Production gameplay code remains unchanged because it already
  validates the state before command execution.
- Bound the literal Phase 1D fixture expectations directly into their acceptance traces.
- Repeat validation passed: Phase 1D focused 13 files / 158 tests; full check 22 files / 245 tests,
  five workspace typechecks, deck validation, and 711-module production build; five-viewport
  Playwright smoke passed.
- The bundled browser client reported the expected ready boot state; the 1280x720 screenshot was
  inspected and every requested asset returned successfully with no browser error output.
- Three independent final reviews report no blocker, high, or medium issue.
- Committed Phase 1D as `3ab3c44` and pushed it to `origin/main`.
- Hosted CI run `31292265288` passed in 58 seconds, including install, the full check, five-viewport
  browser smoke, and artifact upload. Its only annotation is nonblocking Node.js action-runtime
  maintenance.
- Pages run `31292265276` passed. A cache-busted request returned HTTP 200 with repository-prefixed
  assets, and the live bundled browser client confirmed the ready boot state, deterministic time,
  and inspected unchanged composition without browser errors.
- Remaining: record and push this deployment-verification note, then owner review before Phase 1E.

## 2026-08-08 — Phase 1E implementation in progress

- Owner approved Phase 1E.
- Completed parallel read-only audits of the privacy/projection boundary, canonical serialization and
  replay/idempotency architecture, and all 14 locked Phase 1E-adjacent vectors.
- Locked the engine-owned Phase 1E contracts: public/player projections, audience-filtered events,
  canonical JSON v1 with portable SHA-256, private authoritative replay logs, exact accepted-command
  retry receipts, and versioned public turn records in the protocol package.
- Added typed literal fixtures for the 11 new Phase 1E vectors; the three history/evidence vectors
  remain bound to their Phase 1D lifecycle traces.
- Focused projection, replay, retry, protocol, and canonical-hash tests pass. The required 10,002
  complete-match gate passes with exactly 3,334 generated matches per 3/6/12-round format; the full
  repository/build/browser gates also pass, and independent-review repairs are in progress.

## 2026-08-09 — Phase 1E acceptance

- Independent review found and closed adversarial privacy-boundary gaps: public event projection now
  uses an explicit event-type whitelist, and private initial-hand delivery requires payload owner,
  audience owner, and requesting player to agree.
- Replaced the shallow wire check with recursive allowlist validation for every public state, phase,
  Yaku context, result/evidence, privilege, and event variant, including canonical CardIds and scalar
  domains. Added a monotonic record-sequence chain decoder.
- Hardened canonical data against sparse arrays, extra/symbol/non-enumerable fields, accessors, and
  inherited/non-plain objects without invoking hostile getters.
- Added nested leak, mislabeled audience, cross-owner hand, hostile object/array, sequence-gap,
  rejected-advance, and genuine phase/result/event regressions. Bound the before/after lucky fixtures
  separately to observed projections.
- Final `npm run validate:phase1e` passes 16 files / 176 tests. Final `npm run check` passes 25 files /
  263 tests, all five workspace typechecks, deck validation, and the 711-module production build.
- Five-viewport Playwright smoke and the skill-based canvas/text-state inspection pass; the visible
  boot surface remains intentionally unchanged.
- Three independent final reviews report no blocker, high, or medium issue. Remaining: commit, push,
  hosted CI/Pages verification, and cache-busted live inspection.
- Committed Phase 1E as `b0c4d06` and pushed it to `origin/main`.
- Hosted CI run `31294666605` passed in 3m33s, including the 263-test full repository check,
  five-viewport browser smoke, and artifact upload. Its only annotation is the existing nonblocking
  Node.js action-runtime maintenance notice.
- Pages run `31294666580` passed build and deployment. A cache-busted live request returned HTTP 200
  with repository-prefixed assets; the live game client and inspected screenshot confirmed the
  intentionally unchanged ready boot surface without browser errors.
- Phase 1E is implemented, independently accepted, pushed, deployed, and ready for owner review.
- Next: Phase 2A responsive Pixi scene layers, pure layout service, and mobile/desktop table skeleton
  after owner approval. Persistent cards, animation, and input remain 2B–2D.

## 2026-08-09 — Phase 2A responsive table completed and deployed

- Owner approved Phase 2A.
- Re-read the project manifest, AI workflow, complete Phase 2A design authority, current web runtime,
  browser smoke, and the web-game development skill.
- Parallel read-only audits independently locked the narrow Phase 2A boundary: scene layers, pure
  responsive layout, and a mobile/desktop skeleton only. Persistent CardViews/deck packages remain
  2B, animation remains 2C, and gameplay input remains 2D.
- Added a pure immutable board-layout service with compact portrait, portrait, short-landscape, and
  desktop modes; all fourteen logical card zones; three UI zones; 5:8 generic slots; and structural
  diagnostics.
- Replaced the Phase 0B boot composition with ten persistent Pixi scene layers and a polished
  placeholder table containing hand silhouettes, four capture summaries per player, stable 2×4
  field slots, draw/reveal, round/month, textual multiplier, and a disabled action bar.
- `render_game_to_text` now reports the actual canvas viewport, layout mode, ordered layer names,
  public skeleton geometry, placeholder counts, deterministic time, and empty diagnostic violations.
- Added seven literal layout vectors for 320×568, 360×640, 390×844, 768×1024, 844×390,
  1366×768, and 1920×1080.
- Root-base browser smoke passes all seven viewports, fullscreen, deterministic-time/no-geometry
  drift, live resize, and console/network checks. Repository-prefixed Pages smoke passes the same
  matrix beneath `/KoiKoi4XRedux/`.
- The bundled web-game client reported the expected desktop table geometry and its canvas screenshot
  was inspected. A primary-mobile action-bar overflow found in the first visual pass was repaired and
  the 390×844 screenshot was re-run and approved.
- `npm run validate:phase2a` passes 2 focused files / 13 tests plus both seven-viewport root and
  repository-prefixed browser matrices. `npm run check` passes 26 files / 274 tests, five workspace
  typechecks, deck validation, and the 713-module production build.
- Independent review found and closed runtime-mutable layer/zone contracts, an invalid accepted
  minimum viewport, insufficiently literal layout expectations, missing actual-layer persistence
  proof, and missing hosted Pages-prefix enforcement. CI now runs the combined Phase 2A gate; Pages
  installs Chromium and validates the prefixed build before artifact upload.
- Three independent follow-up reviews report no remaining blocker, high, or medium issue.
- Committed the accepted implementation as `5fccfc9` and pushed `main` to GitHub.
- Hosted CI run `31296702209` passed in 3m42s. Pages run `31296702171` passed the full prefixed
  browser build and deployment gate.
- The cache-busted live Pages URL returned HTTP 200. A real game-client render reported the expected
  desktop layout with ten stable layers, fourteen zones, eight field slots, and no diagnostics; the
  desktop and 390×844 portrait screenshots were inspected and approved.
- No owner-side deployment action is required. Phase 2A is awaiting owner review; Phase 2B is the
  next proposed subphase.

## 2026-08-09 — Phase 2B persistent cards and deck runtime started

- Owner approved Phase 2B.
- Re-read the manifest, AI workflow, Phase 2B design/deck-art/architecture authority, current table
  runtime, complete CardId catalog, and the web-game development skill.
- Three parallel read-only audits confirmed that the existing authored deck is a four-face technical
  pilot rather than a browser-ready runtime deck. Phase 2B therefore introduces a distinct portable
  runtime-manifest contract and two complete, explicitly non-final generated technical packages.
- Scope remains presentation-only: persistent CardViews, complete face/back texture resolution,
  immediate zone layouts, and local atomic deck switching. Animation, gameplay input, and the Deck
  Workshop remain Phases 2C, 2D, and 2E.

## 2026-08-09 — Phase 2B implementation and local acceptance

- Added browser-portable `RuntimeDeckManifestV1` validation for exact 48-card/back coverage, fixed
  ART_SPEC v1 geometry, safe local paths, provenance, approval status, strict nested data shapes, and
  runtime freezing. Browser source is mechanically prevented from importing Node authoring adapters.
- Added a reproducible generator and byte-current check for 100 artifacts across two complete
  `technical-placeholder` packages: Technical Sunrise and Technical Moonlight. They are explicit
  runtime fixtures rather than approved artwork.
- Added exactly 48 persistent CardViews keyed by canonical CardId. Responsive layout reparents and
  resizes the same tokens across separate per-layer card containers while chrome redraw remains
  isolated. The visible allocation covers both hands, all capture categories, field, draw pile, and
  reveal as a clearly labeled technical showcase.
- Added complete candidate preload, atomic activation, superseded/failure cleanup, and a local
  accessible package selector. Deck switching changes only local texture bindings; it does not call
  an engine command or alter engine/protocol/replay state.
- `npm run validate:phase2b` passes 6 files / 42 tests, validates all 100 generated artifacts, and
  passes seven root plus seven repository-prefixed browser viewports with live switching, resize,
  fullscreen, stable scene/CardView identity, and zero browser/network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, authored-deck
  validation, 29 files / 301 tests, and the 750-module production build. The isolated required
  10,002-match gate also passed in 67.30 seconds; an earlier concurrent-review timeout was rerun
  uncontended before acceptance.
- The required web-game client reported `cardRuntime`, 48 unique views, all expected zone counts,
  Technical Sunrise active, and no diagnostics. Its screenshot and representative 390×844/1366×768
  Sunrise plus 390×844 Moonlight browser screenshots were visually inspected.
- Independent review found two related mobile memory issues: prior active and fully loaded stale
  texture bundles were cached indefinitely. Activation now retargets all views before manager-owned
  eviction, serializes switch-back against release, and generation-safely unloads stale candidates.
  Tests cover apply-before-unload, switch-back reload, partial failure, and deferred supersession.
- Runtime provenance is now constrained to the declared inheritance chain. Three independent
  follow-up reviews report no remaining blocker, high, or medium issue.
- Remaining: commit/push, hosted CI/Pages verification, and cache-busted live deck-switch inspection.

## 2026-08-09 — Phase 2B deployed

- Committed the accepted implementation as `7549973` and pushed `main` to GitHub.
- Hosted CI run `31300988963` passed in 4m22s, including the full 301-test repository check, the
  complete 42-test/two-base Phase 2B browser gate, and screenshot artifact upload.
- Pages run `31300988958` passed its 100-artifact check, full repository check, repository-prefixed
  seven-viewport browser switch gate, artifact upload, and deployment.
- A cache-busted live 390×844 request returned HTTP 200. The live runtime switched from Technical
  Sunrise to Technical Moonlight, preserved every one of 48 CardView tokens, changed the texture
  bindings, and reported no clipped/invalid/overlapping zones or browser/network error. Both live
  screenshots were inspected and are readable and contained.
- Phase 2B is implemented, independently accepted, pushed, deployed, and ready for owner review.
  Next: Phase 2C AnimationDirector after owner approval; gameplay input remains Phase 2D.
