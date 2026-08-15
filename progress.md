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

## 2026-08-09 — Phase 2C semantic AnimationDirector started

- Owner approved Phase 2C.
- Re-read the manifest, AI workflow, complete Phase 2C animation/replay/testing design authority,
  current Pixi/CardView/deck seams, and the web-game development skill.
- Three parallel read-only audits agreed Phase 2C is presentation-only: projected public semantic
  events choose clip language, trusted before/after projections choose the exact board, and no
  engine command, rule inference, gameplay input, RNG, or protocol mutation enters this slice.
- Locked a single deterministic FIFO director, Normal/Fast/Instant/Reduced Motion policies,
  first-accelerate/second-finish behavior, explicit finish/cancel-snap, persistent CardViews, resize
  rebase, and texture-only deck switching.

## 2026-08-09 — Phase 2C implementation and local acceptance

- Added immutable complete presentation projections, deterministic fingerprints, semantic public
  event planning, and ordered selection/travel/alignment/capture/reflow/draw/flip/pause/feedback
  clips. Draw travel keeps the back visible until its dedicated flip midpoint.
- Added the pure delta-driven FIFO AnimationDirector with exact queue-source validation, all four
  motion policies, accelerate, immediate finish, explicit cancel-and-snap, destruction safety, and
  no timer/Pixi/engine ownership.
- Extended persistent CardViews with transient alpha/scale/EffectsLayer frames while retaining the
  same 48 objects and caching unchanged geometry. Resize recomputes in-flight geometry at the same
  progress; deck switching consults the displayed face and leaves the queue unchanged.
- Added five labeled technical scenarios and accessible Scenario/Motion/Play/Faster/Finish/Cancel
  controls. The harness remains explicitly presentation-only and not a playable/privacy-safe match.
- The focused gate passes 7 files / 60 tests and validates all 100 technical runtime artifacts.
  Root and `/KoiKoi4XRedux/` browser matrices pass seven viewports, all modes, mid-flight deck switch
  and resize, accelerate/finish/cancel, fullscreen, exact target/no-transit settlement, stable
  scene/CardView tokens, and zero console/network errors.
- The last uncontended `npm run check` passed formatting, zero-warning lint, all five workspace
  typechecks, authored-deck validation, 30 files / 317 tests (including 10,002 complete generated
  matches in 68.74 seconds), and the 756-module build. Two later review-repair web tests pass in the
  focused 60-test gate.
- Browser validation found the first control layout reduced 320×568 below the Phase 2A canvas
  minimum. Controls now overlay the reserved action area; the complete matrix was rerun successfully.
- The bundled game-client reported `animationRuntime`, equal idle display/target fingerprints, 48
  unique CardViews, Technical Sunrise, and no diagnostics. Its canvas plus representative compact,
  desktop, and mid-draw screenshots were inspected.
- Independent reviews found and closed two medium queue-integrity issues: an empty plan appended
  behind active work could complete the wrong FIFO head, and source equality relied on a diagnostic
  fingerprint that omitted interaction fields. Exact structural equality and queued-empty-plan
  regressions now guard both. Settled projections also redraw capture-summary chrome after resize.
- Three final reviews report no remaining blocker, high, or medium issue.
- A final combined 319-test check passed 318 assertions, but the unchanged Phase 1E 10,002-match
  stress test was starved by an external Steam process consuming about 99% CPU and timed out after
  566 seconds. This is recorded as environmental rather than hidden: the same gate passed earlier,
  Phase 2C's complete current gate passed, and hosted CI will rerun the full repository uncontended.

## 2026-08-09 — Phase 2C deployed

- Implementation commit `0139892` is on `origin/main`.
- Hosted CI run `31316814794` passed the current 30-file / 319-test repository check, including the
  10,002-match generated gate and 756-module build, then passed the 100-artifact, 7-file / 60-test
  Phase 2C gate and both seven-viewport browser bases.
- Pages run `31316814785` passed and deployed the repository-prefixed build.
- A cache-busted live browser run completed Hand-to-Field on the public Pages URL. It reported equal
  display/target fingerprints, all 48 unique persistent CardViews, zero queued/transit cards, and no
  browser error; the deployed desktop render was visually inspected.
- Phase 2C is implemented, independently accepted, pushed, and deployed; it now awaits owner review.
  Next after approval: Phase 2D selection and input.

## 2026-08-09 — Phase 2D selection and input started

- Owner approved Phase 2D.
- Re-read the project manifest, AI workflow, Phase 2D design/accessibility authority, current
  observation/legal-action contracts, Pixi/CardView/animation seams, and the web-game skill.
- Independent read-only audits agreed on a presentation-owned boundary: consume only an injected
  player observation and legal actions, emit a minimal immutable intent, and do not create a command
  ID, call the engine, advance RNG, or mutate authoritative state.
- Locked Guided explicit single-action confirmation, Fast immediate single-action emission,
  explicit target choice in both modes, optional drag deferral, and a technical non-executing
  browser fixture until Phase 3 supplies real observation presentation.

## 2026-08-09 — Phase 2D implementation and local validation in progress

- Added the pure interaction controller, four frozen technical input phases, minimal intent shape,
  duplicate/new-observation boundary, layout-derived semantic hit areas, and 14 stable `INPUT-*`
  acceptance assertions.
- Added transient Pixi selected/focus/legal-target highlights plus an absolute semantic DOM card
  overlay with pointer, roving arrows/Home/End, Enter/Space, Escape, accessible labels, and visible
  focus. Trusted Phase 2C projection state and all 48 CardView identities remain separate.
- Integrated Guided/Fast, Hand/Draw/Yaku/opponent states, animation/deck locks, diagnostic status,
  and versioned `render_game_to_text` input inspection. Emitted intents remain local and unexecuted.
- Focused web typecheck and 18 controller/snapshot tests pass. The first root seven-viewport browser
  matrix passes pointer, keyboard, resize, deck switching, motion regressions, fullscreen, stable
  CardViews, and zero console/network errors. Guided-target, Yaku, and desktop screenshots were
  inspected.
- The required bundled web-game client produced `inputRuntime` state with one selected card, exactly
  two legal targets, 10 semantic controls, 48 unique CardViews, and `intentExecution:notExecuted`;
  its screenshot was inspected and no client error was reported.
- Remaining: Pages-base/full repository gates, independent post-integration review, final docs,
  commit/push, hosted CI/Pages verification, and cache-busted live inspection.

## 2026-08-09 — Phase 2D local acceptance complete

- Closed independent-review findings for durable pending intent state across presentation locks,
  strictly newer same-match observations, phase/action and exact Draw-card/target binding, public
  field scope, and DOM blur/render re-entrancy. Hostile-source and downgrade regressions pass.
- `npm run validate:phase2d` passes all 100 generated technical assets, 8 files / 76 tests, seven
  root-base viewports, seven repository-prefixed viewports, and the complete 390×844 interaction
  trace on each base with zero browser/network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, authored-deck
  validation, 31 files / 335 tests including the 10,002-match gate, and the 761-module build. Two
  earlier generated-gate attempts timed out under transient contention; an isolated full rerun passed
  in 66 seconds and the final combined check passed in 74 seconds.
- Three independent final reviews report no blocker, high, or medium issue. Remaining: commit/push,
  hosted CI/Pages verification, and cache-busted live inspection.

## 2026-08-09 — Phase 2D deployed

- Committed Phase 2D as `3d4bc32`; hosted Linux exposed a compact 320×568 canvas-height dependency
  on font metrics and border-box sizing. Follow-up fixes `f4cdb87` and `05800e0` reserve 424 CSS
  pixels so the canvas content remains above the locked 420-pixel compact minimum.
- Hosted CI run `31322149519` passed `npm run check`, the full `validate:phase2d` root/Pages matrices,
  and artifact upload. Pages run `31322149502` passed and deployed `05800e0`.
- A cache-busted live game-client run selected April Cuckoo and reported `inputRuntime`, exactly two
  legal public targets, ten semantic controls, 48 stable CardViews, and
  `intentExecution:notExecuted`; the live screenshot was inspected.
- Phase 2D is implemented, independently accepted, pushed, deployed, and ready for owner review.
  Next after approval: Phase 2E Deck Workshop and final visual approval.

## 2026-08-09 — Phase 2E Deck Workshop and art pipeline started

- Owner approved Phase 2E. Re-read the project manifest, AI workflow, deck-art authority, current
  package/runtime seams, and the web-game testing workflow.
- Independent read-only audits agreed that the importer, deterministic derivatives, review sheets,
  local Workshop, and release validator are implementable now, while finished licensed art and
  visual approval are owner-supplied acceptance inputs that automation must not invent.
- Locked a separate technical gate and owner-gated release command. Normal Pages output must remain
  Workshop-free; authoring uses an explicit local-only Vite entry and Node adapter.

## 2026-08-09 — Phase 2E tooling implementation and local validation

- Added portable 48-slot Workshop/status, canonical auto-assignment, normalized transform editing,
  dual contact-sheet, and strict digest-bound approval contracts.
- Added the Node-only Sharp raster adapter, deterministic 640×1024 and 160×256 derivatives,
  complete-manifest withholding, immutable digest-named source assignment, atomic transform saves,
  and strict release evidence.
- Added a local-only token-protected Deck Workshop with the January–December grid, Auto/Manual
  editing, source/frame/phone/back previews, package actions, a 390×844 four-pilot board, and
  development diagnostics that explicitly expose no engine execution.
- Generated the primary technical pilot derivatives and both complete 48-slot review sheets. The
  result truthfully contains 4 of 48 technical faces, 44 missing placeholders, no runtime manifest,
  and no approval-ready claim.
- `ART2E-001` through `ART2E-012` bind assignment, status, transforms, deterministic raster output,
  partial/complete package behavior, atomic writes, immutable import, Workshop browser behavior,
  explicit approval evidence, release rejection, and production exclusion.
- The technical Phase 2E gate passes 16 files / 112 tests, local Workshop desktop/mobile browser
  validation, and both root and Pages seven-viewport production matrices. The separate release gate
  correctly fails with 44 missing sources, missing owner approval, pending pilot approval, and an
  incomplete package.
- Independent reviews found and closed selected-only/stale manifest publication, browser/Sharp
  rotation mismatch, inherited-back validation, symlink containment, package-directory assumptions,
  missing authoring previews/drag/diagnostics/back import, and the independent Pages-gate gap.
- `npm run validate:phase2e` passes 16 files / 112 tests, the desktop/mobile Workshop trace, and both
  seven-viewport production bases with the Workshop absent. `npm run check` passes 33 files / 346
  tests, the isolated 10,002-match generated gate in 72 seconds, all workspace checks, and the
  764-module build. The generated stress test is now sequenced separately from Sharp tests to avoid
  CI CPU starvation.
- Three independent final reviews report no blocker, high, or medium finding.
- Committed the accepted tooling as `31da04f` and pushed `main` to GitHub. Hosted CI run
  `31327748444` and Pages run `31327748453` passed the full repository and Phase 2E gates. The
  cache-busted live page rendered successfully; the public root returned 200 and the intentionally
  local-only Workshop route returned 404.
- Phase 2E tooling deployment is complete. Remaining before Phase 3: owner-supplied finished art
  and explicit Phase 2E visual approval.

## 2026-08-09 — Phase 2E Pilot Candidate V1 generated

- Owner said to proceed with the art-production gate. Generated an original cohesive pilot direction
  using the built-in image generator: contemporary woodblock/screen-print faces with deep indigo
  grounds, mineral gold/vermilion/teal accents, bold mobile-readable silhouettes, and washi texture.
- Created the locked four roles—November Rain dense composition, September Sake Cup simple
  composition, December Phoenix Bright focal, and January Pine Plain—plus a rotationally balanced
  matching card back. No borders, text, labels, logos, UI, or commercial-deck imitation are baked in.
- Preserved the native 992×1586 PNG outputs in the generation archive, normalized selected masters
  to exact 1600×2560 high-quality WebP, and imported them through the real Workshop service as
  immutable digest-named files without overwriting the technical placeholders.
- Rebuilt the four table derivatives, thumbnails, card back, 968×4516 art-review sheet, and 390×1624
  gameplay sheet. The package reports 3 Auto / 1 Manual / 44 Missing / 0 Warning, remains
  `awaiting-finished-art`, and correctly withholds both runtime manifest and approval.
- The real local Workshop browser trace passes at desktop and mobile and now captures the exact
  390×844 pilot board. Remaining gate: owner approves the pilot direction or requests revisions;
  only approval permits production of the other 44 faces.
- `npm run check` passes formatting, lint, all workspace typechecks, 33 files / 346 tests, the
  isolated 10,002-match deterministic gate in 102 seconds, authored-deck validation, and the
  764-module production build.

## 2026-08-09 — Phase 2E Bulk Candidate V1 generated

- Owner approved Pilot Candidate V1 by choosing to proceed. Locked the four pilot roles and generated
  the remaining 44 distinct faces with the built-in image generator in the approved contemporary
  woodblock/screen-print direction.
- Preserved the native 992×1586 outputs in the generation archive, normalized every new face to an
  exact 1600×2560 WebP master, and imported each through the immutable digest-named Workshop path.
  No Plain pair reuses one raster.
- The authoritative prompt/provenance ledger is `decks/new-primary-deck/BULK_CANDIDATE_V1.md`.
- Rebuilt all 48 table derivatives and thumbnails, the matching back, complete 968×4516 art-review
  sheet, complete 390×1624 gameplay sheet, build report, and technical runtime manifest. Both sheets
  were visually inspected for ordering, clipping, mobile readability, category distinction, and
  cross-set consistency.
- Pilot approval and package completeness are now represented truthfully. The complete deck remains
  intentionally labeled `technical-placeholder` until the owner reviews the full current sheets and
  supplies the separate final visual decision; no `approval.json` was manufactured.
- Focused validation passes 16 files / 113 tests, the local Workshop browser trace, and both root and
  repository-prefixed seven-viewport production matrices. The complete owner-gated release command
  fails only with `APPROVAL_RECORD_REQUIRED`, as intended.
- `npm run check` passes formatting, zero-warning lint, all workspace typechecks, full authored-deck
  source validation, 33 files / 347 tests including 10,002 generated matches, and the 764-module
  production build.
- Owner identified the wrong flower on July Bush Clover Plain B. Replaced the red-clover-like output
  with a new hagi/Lespedeza illustration using slender arching sprays, small purple pea-shaped
  flowers, and oval trifoliate leaflets; imported it as a new immutable digest-named master while
  retaining the rejected source only as unmapped provenance.

## 2026-08-09 — Phase 2E full-deck approval

- Owner approved the complete Bulk Candidate V1 after reviewing the corrected July Bush Clover
  Plain B and confirmed publication to GitHub.
- Promoted `new-primary-deck` to v1.0.0, updated its license status, and created the strict
  digest-bound `approval.json` naming the exact current art-review/gameplay sheet digests, approved
  four-card 390×844 pilot set, reviewer, date, and review note.
- `npm run validate:phase2e:release` builds 48/48 faces plus the back, emits an `approved` runtime
  manifest, reports `approvalReady:true`, and passes with zero issues.
- Phase 2E is complete. Additional complete or inherited deck packages remain supported without
  changing canonical CardIds or engine rules. Next: Phase 3A complete local turn loop.
- The first hosted release run exposed platform-dependent PNG byte hashes: equivalent regenerated
  contact sheets differed between macOS and Linux solely at the encoder-byte level. Replaced that
  approval boundary with canonical semantic review digests covering ordered source hashes,
  transforms, the back, art-spec version, and sheet plan; raw PNG hashes remain separate build
  diagnostics. This preserves strict stale-art detection while making approval portable.
- The repaired strict release reports 48/48 faces, a complete approved runtime manifest,
  `approvalReady:true`, and zero issues. The Phase 2E gate passes 16 files / 114 tests plus the local
  Workshop and both seven-viewport browser matrices; the full repository gate passes 33 files / 348
  tests, all 10,002 generated matches, all workspace checks, deck validation, and the 764-module
  production build.

## 2026-08-09 — Phase 3A complete local turn loop

- Replaced the public technical input fixture with a deterministic browser-local runtime over real
  `startMatch`, `projectPlayerObservation`, legal intents, and `applyGameplayCommand` seams.
- Made the approved `new-primary-deck` v1.0.0 the default runtime package and added a Vite adapter
  that serves/copies its existing generated 48-face/back package for development, root production,
  and repository-prefixed Pages builds. Technical decks remain optional switch targets.
- Added recipient-relative board projection and public-event animation boundaries. The player sees
  their own hand plus public cards; face-down opponent/draw identities are absent from
  `render_game_to_text`.
- Live browser play revealed that legal unmatched turns can grow the field above eight cards. Added
  contained overflow fanning over the stable 2×4 lanes and a focused regression instead of rejecting
  the authoritative move.
- Added full-table pass-device privacy cover, explicit next-player Ready activation, dynamic
  player/score/month/multiplier chrome, and concise HTML turn recap independent of the canvas.
- `LOCAL-001` through `LOCAL-008` bind the approved deck, safe observation, command execution,
  animation boundaries, captures/field overflow, handoff, recap, and complete deterministic round.
- The focused gate passes 17 files / 119 tests, approved release validation, all 100 technical deck
  artifacts, and the Workshop trace. The required game client loaded the approved deck with 48
  persistent CardViews and no errors. Root and Pages smokes each pass seven viewports plus a real
  Normal-motion 390×844 Player A turn, recap, privacy cover, Player B Ready, and New round reset.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 34 files / 353 tests plus the isolated 10,002-match deterministic gate, and the
  765-module production build.
- Phase 3A implementation commit `7f3d5f1` is on `origin/main`. Hosted CI run `31344124822` passed
  in 5m58s, and Pages run `31344124824` passed and deployed the same commit.
- The cache-busted public runtime manifest returned HTTP 200 and identified the approved primary
  package. A real public browser run reached `ready:true` with 48 persistent CardViews and the
  authoritative Player A `awaitingHandPlay` state; its rendered table was visually inspected.
- Phase 3A is accepted and deployed. Owner verification is next; after approval, proceed to Phase
  3B yaku/progress/Bank/Koi presentation.

## 2026-08-09 — Phase 3B yaku and Bank/Koi presentation started

- Owner approved the Sol-led multi-agent workflow. Sol retains the Phase 3B architecture,
  cross-system integration, gameplay judgment, and final verification; three explicit GPT-5.6
  Terra agents received non-overlapping engine-seam, presentation/UX, and acceptance investigations.
- The investigations agree that the existing `PlayerObservationV1`, public yaku events, decision
  context, and legal actions already contain every authoritative value required for a finished
  decision surface. Browser code must not recalculate scoring, privilege, forced-Koi availability,
  or continuation rules.
- Locked Phase 3B progress scope to public active-yaku/current-total tracking plus combined
  new-yaku and value-change feedback. Near-threshold “one card away” guidance would require a new
  engine-owned read model and remains tutorial-phase work rather than duplicated browser rules.
- Locked a DOM-led accessible decision/feedback surface with compact public yaku tracking, while
  Pixi retains persistent cards, capture rails, and short table status. Cards settle before one
  combined yaku feedback beat; only then does the decision receive focus.
- Rejected a shipped browser fixture injector. Deterministic seed `00000000000000000000000000000003`
  naturally reaches a Hand-phase Animals decision, resumes Draw after Koi-Koi, and later reaches a
  combined Draw decision, allowing the production-local runtime itself to supply browser evidence.
- Terra implementation is underway in three serialized-safe units: pure presentation model/tests,
  deterministic authoritative runtime trace/tests, and the strict ten-vector Phase 3B fixture
  catalog. Sol will integrate the DOM/Pixi/animation/snapshot/browser seams after those contracts land.

## 2026-08-09 — Phase 3B acceptance and deployment gate locked

- Added the ten typed, frozen `PRES-*` presentation contracts and linked each to Phase 1C/1D/1E
  authority rather than duplicating yaku, scoring, privilege, or continuation rules in the browser.
- Locked production-local seed `00000000000000000000000000000003` for the real root/Pages browser
  trace: Hand Animals offers Bank 3 or Koi-Koi 1×→2×; later final Draw combines Blue Scrolls and
  Scrolls for total 11 with Bank 22 or Koi-Koi 2×→3×. A clean fresh-run Bank path must prove no Draw
  after Hand Bank and record the public award recap.
- Added `validate:phase3b`, which keeps release deck validation, Workshop exclusion, all web/deck
  tests, and root/Pages browser traces. The separate full `check` retains the 10,002-match
  deterministic gate. CI/Pages
  now publish Phase 3B screenshot artifacts at `output/phase-3b/e2e`.
- Phase 3C remains next after Phase 3B: it owns the dedicated round-result, scoring animation, and
  next-round transition surface.

## 2026-08-09 — Phase 3B implemented and accepted

- Integrated public canonical-order Yaku progress, one combined accessible decision surface per
  capture phase, public feedback/value changes, authoritative Bank/Koi-Koi arithmetic, and pending
  decision input/focus locks. The browser consumes only player observations, public events, and
  legal actions; it does not recalculate scoring or expose hidden state.
- The production-local seed trace passes on both root and repository-prefixed builds at all seven
  supported viewports. Focused 390×844 traces prove Hand Animals Bank/Koi choices, Koi-Koi Draw
  continuation, the combined Blue Scrolls + Scrolls final-Draw decision, and Hand Bank award/no Draw.
- `npm run validate:phase3b` passed its release deck, 20-file/136-test, Workshop, root, and Pages
  gates. Independent authority/privacy and interaction reviews report no blocker, high, or medium
  findings after the decision-lock and feedback-order repairs.
- The final `npm run check` passed formatting, zero-warning lint, all five workspace typechecks,
  both deck packages, 38 files / 373 ordinary tests, the 10,002-match generated replay/invariant
  gate, and the 766-module production build.
- The first hosted CI run exposed a timing-only Playwright race: the runner completed the short
  feedback beat before its external poll observed the transient state. The browser trace now
  installs a page-side mutation observer before the decisive click, retaining the exact
  feedback-visible/dialog-hidden/input-locked assertion without lengthening player-facing timing;
  both root and Pages gates pass with the hardened observation.
- Phase 3C is next: a dedicated round-result screen, score breakdown/animation, and next-round
  transition surface driven by the existing authoritative result state.

## 2026-08-09 — Phase 3C architecture and agent ledger locked

- Owner approved Phase 3C using the upgraded Sol-led workflow and requested durable documentation
  of the overall subagent plan. A Terra documentation workstream created `docs/SUBAGENT_PLAN.md`,
  the ledger guide, and the Phase 3C directive/workstream/decision/finding/verification/handoff set.
- Parallel Terra engine and UX investigations agreed that completed public observations/history and
  events already contain every result, arithmetic, evidence, starter, privilege, and match fact the
  browser needs; no engine or rules change is required.
- Sol resolved the sole scope disagreement in favor of the documented phase boundary: Phase 3C
  shows the authoritative next-round plan but uses a truthfully named local one-round restart.
  Actual `advanceRound`, new-deal privacy handoff, and full match formats remain Phase 5.
- Locked twelve `PRES-RESULT-*` contracts, production-seed Bank and final-Draw Koi-Koi browser paths,
  page-side feedback/result ordering evidence, modal input/focus locks, and root/Pages seven-viewport
  gates. Pure result-model and literal-fixture implementations now have separate Terra write scopes;
  Sol retains tightly coupled DOM/runtime integration and final verification.

## 2026-08-09 — Phase 3C implemented and locally accepted

- Added the public-only result mapper, twelve typed/frozen presentation fixtures, recipient-safe
  diagnostic result DTO, accessible score/result modal, committed evidence/history presentation,
  explicit table-versus-scoring multiplier copy, modal focus/input locks, and truthful local restart.
- The real production seed passes both result paths: final-Draw Koi-Koi commits End of Play at
  `11 × 3× = 33`, while a fresh Hand Bank commits `3 × 1× = 3` and preserves the authoritative
  February starter/privilege plan without pretending the local reset advances that plan.
- Root and Pages browser runs pass seven opening layouts plus seven Bank-result layouts, with focused
  End-of-Play captures, page-side feedback-before-result evidence, no private/server tokens, and no
  browser/network errors. The required web-game client also returned the real text snapshot and a
  clean screenshot without an error artifact.
- `npm run validate:phase3c` passed 22 files / 153 tests, the approved release deck, technical deck,
  Workshop, root, and Pages gates. `npm run check` passed 40 files / 390 tests, the 10,002-match
  deterministic gate, and a 767-module build. Independent review signed off after terminal-total,
  fail-closed match, multiplier-copy, traceability, and formatting repairs.
- CI run `31351999052` and Pages run `31351999091` passed for exact release `c2224aa`. The public
  Pages build returned HTTP 200 and initialized in a real browser with the approved Primary Deck,
  playable local round, eight accessible hand controls, public yaku progress, and turn recap.
- Phase 3C evidence maturity is now `live`. Phase 4A onboarding foundation is next.

## 2026-08-10 — Phase 3D-A visual direction review built

- Inserted Phase 3D before onboarding in response to the owner-reported clutter, disliked palette,
  desired select/highlight/tap matching flow, and need for fields larger than eight cards.
- Built three environment-selected review directions over the real approved deck without changing
  the normal production default: Ink & Parchment, Moonlit Indigo, and Charcoal & Moss. Ink &
  Parchment is recommended after mobile and desktop inspection.
- The review hierarchy hides the persistent advanced toolbar, compresses Yaku progress to one line
  per player, keeps only the latest recap, and gives neutral, legal, and escalation states distinct
  colors.
- Focused tests passed 3 files / 22 tests. The real-browser review produced ten screenshots with no
  clipped/invalid board zones or browser/network errors, including a final production-default
  isolation check, and the required web-game client returned a valid 48-card authoritative snapshot
  for Direction A.
- The interaction/layout audit identified the next concrete repairs: live unique-match and sweep
  highlighting, no-match field placement preview, and a shrink-to-fit field grid tested at 8, 9,
  12, and the derived 17-card playable bound.
- Evidence maturity reached `local browser review`; the owner palette decision was the remaining
  gate at the end of the initial review run.

## 2026-08-10 — Phase 3D-A direction family approved

- Owner approved removal of the untracked iCloud-style `* 2.*` conflict copies; only those eight
  copies were deleted, while the unrelated design archive was preserved.
- Owner approved Ink & Parchment and Moonlit Indigo and requested future options-menu theme
  switching. Ink & Parchment is the recommended default and Moonlit Indigo is an approved alternate.
- Replaced the rejected Charcoal & Moss review with Warm Ivory, inspired by the original game's calm
  cream canvas, dark outlines, orange selection, and blue instructional callouts while ignoring its
  crowded information organization.
- Runtime selection and persistence belong to Phase 3D-C. Phase 3D-A keeps build-time review
  isolation, and Phase 3D-B remains focused on authoritative interaction cues.
- Final validation passed the 3-file/22-test Phase 3D-A gate, all five workspace typechecks,
  zero-warning lint, 41 files/393 ordinary tests, the 10,002-match deterministic generated gate,
  the production build, the Warm Ivory web-game-client capture, and independent delta review. All
  changed files pass Prettier; the global format scan remains blocked only by the preserved untracked
  design-package archive.

## 2026-08-10 — Phase 3D-B direct interaction implemented

- Added an engine-owned, recursively frozen Hand-resolution preview to every legal Hand action:
  `placeOnField`, `capturePair`, `captureChoice`, or `fourCardSweep`. The browser validates and
  displays this public explanation but never recomputes capture legality.
- Guided no-match now lifts the selected card and turns the field into one semantic placement
  surface; unique pair highlights its one match; exact-two exposes exactly two choices; sweep
  highlights all three matching cards. Pair/sweep taps reuse the target-free legal action and
  exact-two retains the chosen engine target.
- Fast mode still submits unambiguous no-match/pair/sweep actions immediately, while exact-two and
  Draw choices remain explicit. Confirm/Cancel and accurate DOM labels remain available for pointer,
  keyboard, and assistive-technology parity.
- Focused authority/controller tests pass 3 files / 40 tests and all five workspaces typecheck.
  Production root and `/KoiKoi4XRedux/` browser runs pass seven viewports, real 390×844 Guided
  placement and unique-match execution, every prior Yaku/result trace, and zero browser/network
  errors. Evidence is under `output/phase-3d-b/e2e/`.
- The final `npm run validate:phase3db` gate passes the 3-file/22-test visual review, approved release
  deck, 100 technical assets, 24 files/175 Phase 3D-B tests, Workshop browser trace, and both
  production browser bases. The wider suite passes 42 files/409 tests plus the 10,002-match
  deterministic replay/invariant gate and production build.
- Phase 3D-C is next: integrate Ink & Parchment as the default, add Moonlit Indigo and Warm Ivory to
  the persistent options menu, and collapse advanced controls/history. Adaptive 9–17 card field
  sizing remains Phase 3D-D.

## 2026-08-11 — Phase 3D-C production integration started

- Locked Ink & Parchment as the safe/default production theme, with Moonlit Indigo and Warm Ivory
  as runtime-selectable alternatives. Cosmetic preference persistence uses the Design §22.1
  IndexedDB boundary and never enters engine commands, observations, events, or replay data.
- Locked the compact production hierarchy: one Options dialog for secondary settings, one visible
  turn bar with conditional Confirm/Cancel, compact public Yaku names/totals, and a visible latest
  event with full history behind a native disclosure.
- Theme changes must repaint DOM and Pixi card/table chrome in place while preserving the one
  canvas, all 48 CardView identities, active deck, authoritative local-round version, current
  selection, legal targets, Yaku state, and result state.
- Parallel implementation is split between the theme/Pixi seam and shell markup/CSS; the primary
  agent owns main-runtime integration, browser acceptance, documentation, release, and final
  judgment. Adaptive 9–17-card field sizing remains strictly deferred to Phase 3D-D.

## 2026-08-11 — Phase 3D-C local acceptance complete

- Integrated Ink & Parchment, Moonlit Indigo, and Warm Ivory into one production build. The
  accessible Options dialog changes DOM and Pixi chrome in place and persists only a versioned,
  allowlisted cosmetic preference in IndexedDB.
- Replaced the permanent advanced toolbar with a compact turn bar, conditional Confirm/Cancel,
  concise public Yaku progress, latest-event recap, and native History disclosure. Short landscape
  retains those semantic surfaces instead of hiding them.
- Root and repository-prefixed browser gates pass all seven supported viewports, all three themes,
  actual reload persistence, Guided placement/matching, Yaku/Bank/Koi, result/modality locks, one
  canvas, stable 48 CardView identities, and zero browser/network errors.
- Closed review findings so cosmetic confirmation cannot overwrite the current turn instruction and
  the 844x390 layout keeps turn, Yaku, and recap facts visible. Independent review reports no
  blocker, high, or medium finding.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 43 files/415 ordinary tests, the 10,002-match deterministic generated gate, and the
  769-module production build. The final Pages-path smoke also passes every gameplay and viewport
  trace. Phase 3D-C is ready to commit and deploy; adaptive 9–17-card field sizing is Phase 3D-D.

## 2026-08-11 — Phase 3D-C deployed and accepted

- Pushed release commit `9313b93`. CI run `31536377258` and Pages run `31536377294` both passed the
  full `npm run check` plus `validate:phase3dc` workflow; the Pages deploy job completed successfully.
- The public URL returned HTTP 200 with the new Options/theme shell. A cache-busted real-browser
  check reached ready state with Ink & Parchment, the approved Primary Deck, one canvas, 48
  persistent CardViews, eight legal hand controls, and no board-layout diagnostics.
- Phase 3D-C evidence maturity is `live`. No manual hosting setting, secret, migration, or cache
  reset is required. Phase 3D-D adaptive dense-field layout is the next recommended subphase.

## 2026-08-11 — Phase 3D-D adaptive dense field integrated

- Replaced the above-eight modulo/fan behavior with a pure versioned adaptive grid. Zero through
  eight cards retain four-by-two geometry; 9–17 cards choose the deterministic 5:8 grid that
  maximizes readable width, minimizes empty cells, and centers the final row.
- Corrected recipient presentation normalization so field slot order follows the public
  `round.field` sequence rather than canonical CardId order. Resize and themes now change geometry
  without changing semantic order.
- Partitioned dense field target territories so they cannot overlap. Hand targets remain 44px; the
  legal 17-card short-landscape boundary uses an explicit 24×36px field-target minimum with full
  keyboard parity.
- Split direct placement/capture motion from projection-settling reflow so unrelated cards do not
  jump before the direct action completes. The 48 persistent CardViews and scene layers remain in
  place.
- Added an isolated, non-shipping Pixi review build. It passed all seven supported viewports for
  both root and repository-prefixed bases with 17 cards, three semantic targets, pointer/keyboard
  activation, one canvas, 48 CardViews, no overlap/clipping, and zero browser/network errors. Six
  screenshots are under `output/phase-3d-d/e2e/`.
- Focused geometry/animation/runtime/input tests pass 5 files / 52 tests, including all eight dense
  vectors. `validate:phase3dd` passes the retained 3-file/23-test theme gate, approved release deck,
  100 technical artifacts, 26 files/189 tests, Workshop, root/Pages gameplay, and the 14-viewport
  dense matrix. `npm run check` passes 44 files/423 tests, the 10,002-match deterministic gate, and
  the production build.
- Independent final review found and closed one missing pointer-action assertion, then signed off
  with no blocker, high, or medium finding. The production build explicitly returns 404 for the
  review entry.

## 2026-08-11 — Phase 3D-D deployed and accepted

- Pushed release commit `07ae604`. CI run `31545456869` and Pages run `31545456817` both passed;
  the Pages deploy job completed successfully after the complete `validate:phase3dd` gate.
- The public URL returned HTTP 200. A cache-busted real-browser check reached ready state with the
  approved Primary Deck, Ink & Parchment, one canvas, 48 persistent CardViews, eight legal hand
  controls, and no layout diagnostics.
- The deliberately non-shipping `field-density-review.html` route returned HTTP 404 on the live
  site. Phase 3D-D evidence maturity is `live`; Phase 4A tutorial director is next.

## 2026-08-11 — Phase 3E-A table clarity integrated

- Removed permanent empty-card slot outlines and numbers while retaining the field region,
  adaptive geometry, and temporary legal placement highlight.
- Moved Options to a bottom-safe utility. Added exact public capture galleries over the active deck
  art without creating cards, commands, or hidden-state projections.
- Moved the Yaku Decision outside the game frame so the field stays visible and capture galleries
  remain available. Gameplay and unrelated settings remain locked.
- Reduced Round Result to outcome, award, totals, and one primary action; scoring, evidence,
  transition, and history begin collapsed under native Details.
- Focused capture/result/Yaku/snapshot tests pass 4 files / 27 tests. Root and Pages browser traces
  pass all seven viewports, themes, direct interactions, Koi inspection, End-of-Play, Bank, result
  disclosure, one-canvas/48-CardView, and zero-error checks. The retained 17-card stress harness
  also passes all 14 root/Pages viewports after excluding its non-shipping shell from the new
  production bottom-utility reserve.
- The complete Phase 3E-A gate passes 3 Phase 3D-A files / 23 tests, 27 web/deck/fixture files / 190
  tests, Workshop, root and Pages gameplay, and the 14-viewport dense-field review. Independent
  release review reports no blocker, high, or medium finding. Deployment remains.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 45 files / 424 ordinary tests, the 10,002-match deterministic generated gate, and the
  771-module production build.
- Owner direction moves the full tutorial after interaction, full-match, and product polish work.
  Phase 3E-B authoritative interactive Draw resolution is next after 3E-A acceptance.

## 2026-08-11 — Phase 3E-A deployed and accepted

- Pushed implementation commit `0b6937a` and CI-stability commit `818936a`. CI run `31554760462`
  and Pages run `31554760390` passed; the Pages deployment completed successfully.
- The first Pages attempt exposed a pre-existing 5-second timeout on a raster-builder test under
  shared-runner load. The test performs the same contact-sheet work as neighboring 60-second tests;
  applying that established timeout policy closed the flake without changing product code.
- The live URL returned HTTP 200. A cache-busted real-browser check reached ready state with the
  approved Primary Deck, one canvas, 48 persistent CardViews, eight legal hand controls, zero
  empty-field placeholders, and no layout diagnostics. Phase 3E-A evidence maturity is `live`.

## 2026-08-12 — Phase 3E-B authoritative Draw resolution integrated

- Every Hand completion now reveals one Draw card into `awaitingDrawResolution`; no Draw placement,
  capture, Yaku Check, handoff, or End-of-Play result occurs until the player resolves it.
- The engine owns the frozen 0/1/2/3 public preview and `resolveDrawCard` legality. The web app
  requires an explicit Reveal-card tap, then follows the existing Guided/Fast interaction language
  without recomputing capture rules.
- Engine, protocol, fixture, replay, and web tests pass 31 files / 269 tests; formatter, lint, all
  workspace typechecks, root smoke, and Pages-base smoke passed locally. The first hosted
  validation exposed a browser-test timing race around a fast Draw resolution; Phase 3E-C now
  repairs that trace before the next combined CI/Pages deployment.

## 2026-08-12 — Phase 3E-C physical Draw choreography integrated

- Kept the Phase 3E-B authoritative pause untouched. The presentation now derives a geometry-only
  foremost draw-pile position, moves exactly one face-down CardView from that top position into
  Reveal with a small lift, flips it there, pauses, then unlocks the existing engine-owned Reveal
  interaction.
- Hidden allocation churn is no longer animated: the remaining face-down backs stay in the draw
  pile. No engine state, command, legal action, replay payload, or recipient projection changed.
- Focused runtime tests pass 2 files / 26 tests. Root and Pages focused Playwright traces passed;
  inspected artifacts under `output/phase-3e-c/e2e/` show travel, Reveal pause, and keyboard-actionable
  Reveal with one canvas, 48 CardViews, and no browser/network errors.
- Next: run the complete Phase 3E-C gate, independent review, then commit/push and verify CI/Pages.

## 2026-08-12 — Phase 3E-C accepted locally; hosted gate repaired

- The complete `npm run validate:phase3ec` gate passed, including the inherited 3E-A/3E-B engine,
  protocol, replay, deck, Workshop, Root, Pages, responsive, and density checks. Root and
  repository-prefixed Pages browser suites both passed independently after the combined gate.
- The initial 3E-B GitHub Actions failure was a smoke-test race: a fast/instant explicit Draw could
  settle before the test observed its transient pending status. The trace now accepts either an
  active interaction state or an increased authoritative state version, then handles the new
  Draw-to-handoff boundary before continuing its deterministic Yaku path.
- Independent review reports no blocker, high, or medium issue. The next action is commit/push,
  followed by CI/Pages verification; it is not yet a hosted/live claim.

## 2026-08-13 — Phase 3F-A simplified table integrated

- Removed the visible routine phase/instruction/Confirm/Cancel strip and empty initial-ready recap.
  The hidden accessible live instruction remains, as do Bank/Koi-Koi, result, handoff, and capture
  inspection controls.
- Removed the noninteractive in-canvas action bar and reassigned its complete responsive reserve to
  Player Hand. Supported 320×568, 390×844, 844×390, and desktop layouts show materially larger
  eight-card hands while field, captures, Draw, Reveal, opponent hand, and 8–17-card capacity remain
  contained.
- Options now contains only Theme, deck, fullscreen, local restart, and close. Production uses
  normal animation and follows operating-system reduced-motion changes; changes during active
  motion are deferred until the plan settles.
- Focused layout/input/animation/runtime validation passes 5 files / 71 tests, including the added
  reduced-motion preference regression. Full
  `npm run check` passes 46 files / 435 ordinary tests, the deterministic 10,002-match gate, deck
  validation, all workspace typechecks, lint/format, and the 771-module production build.
- Root and repository-prefixed Pages smoke suites pass all seven viewports, themes, direct Hand and
  Draw interaction, Yaku/Bank/Koi/result/handoff/capture flows, automatic reduced motion, one canvas,
  48 persistent CardViews, and zero browser/network errors. Inspected evidence is under
  `output/phase-3f-a/e2e/`. Hosted CI/Pages/live evidence remains pending commit and push.
- The inherited combined release wrapper exposed a subpixel timing race because Playwright sampled
  the result overlay and card in separate layout reads. The assertion now samples both DOMRects in
  one browser evaluation; the repository-prefixed Pages suite passes after that test-only repair.
- Phase 3F-B unified tap-only interaction is next; no engine or protocol behavior changed here.

## 2026-08-13 — Phase 3F-A hosted timeout repair

- Release commit `7cf5c44` triggered the new hosted gate. The CI run completed `npm run check`
  successfully, then was cancelled by the workflow's former 15-minute job ceiling while the
  inherited `validate:phase3fa` chain was still running; no test reported a failure.
- Raised only the CI job ceiling to 30 minutes so the deliberately comprehensive inherited browser,
  Workshop, replay, and generated-game gate can complete. Pages already had no 15-minute limit.
- The superseded Pages run also exposed that its short-landscape result assertion required the
  overlay's full internally scrollable content height to fit the document height. That contradicts
  the accepted horizontal-containment/vertical-scroll contract and failed despite a correct visible
  screenshot. The gate now asserts horizontal bounds and computed `overflow-y` scrolling directly.
- The replacement CI run proved the recursive phase-script chain still repeated prior root/Pages
  gates until the 30-minute ceiling. Flattened `validate:phase3fa` to one pass of each phase-specific
  release deck, technical deck, focused test, Workshop, dense-field, root, and Pages gate. CI and
  Pages continue to run the full repository `check` immediately before it, so coverage is unchanged
  while redundant browser work is removed.

## 2026-08-13 — Phase 3F-A deployed and accepted

- Release commit `51a1821` passed CI run `31742306302` in 13m28s and Pages run `31742306314`; the
  Pages deployment completed successfully.
- The cache-busted live URL returned HTTP 200. A real-browser state/screenshot check reached ready
  state with the approved Primary Deck, one canvas, 48 persistent CardViews, eight enlarged active
  hand cards, no initial recap/routine confirmation strip, and zero layout diagnostics.
- Phase 3F-A evidence maturity is `live`. Phase 3F-B unified tap-only interaction is next.

## 2026-08-13 — Mobile hand-layout regression repaired

- The enlarged single-row hand had incorrectly used its vertical space first and then fanned eight
  cards into the available width. Hands now size from available width, so all eight cards remain
  separate and tappable at every supported viewport.
- Selection is now a single in-canvas frame confined to the selected card; the duplicate DOM ring,
  hand-card scale, and outward selection padding were removed. The no-match field cue remains a
  quiet outline without text over the field cards.
- Focused layout/input/interaction/animation/runtime tests pass 5 files / 71 tests. Formatter,
  lint, workspace typechecks, and the Root browser smoke pass; mobile screenshots were inspected.

## 2026-08-14 — Phase 3F-C deployed and accepted

- Recorded the presentation-only selected-source, legal-target, no-match field, Reveal, declutter,
  theme/responsive, and input-parity contract as `VISUAL-3FC-001` through `VISUAL-3FC-007`.
- Advanced browser evidence to `output/phase-3f-c/e2e/` and added root/Pages smoke checkpoints for
  selected Hand/Reveal sources, pair targets, no-match field destination, and themes. The smoke
  gate also requires semantic target/field overlays to be pointer-quiet while retaining focus and
  accessible names.
- Added flattened `validate:phase3fc` CI/Pages routing. The focused five files / 71 tests pass. Full
  `npm run check` is green with 46 files / 436 regular tests, all 10,002 generated seeds (exactly
  3,334 per format), and the production build.
- `npm run validate:phase3fc` passes the release deck, all 100 technical artifacts, Workshop,
  17-card density review, and root/Pages browser suites. The post-repair root smoke also passes and
  its final source/target, field, Reveal, and theme screenshots were inspected.
- The generated-match gate runner was safely sharded only after diagnosing a false host/Vitest
  wall-clock timeout; it preserves the exact seeds and formats and changes no engine or gameplay
  behavior. Independent post-repair review reports no blocker, high, or medium finding.
- Release commit `4181375` passed CI run `31820056292` (`verify`, 16m03s) and Pages run
  `31820056288` (`build`, 15m58s; `deploy`, 46s). No secret or hosting/runtime configuration change
  was required.
- A cache-busted live request returned HTTP 200 with a cache MISS and `Last-Modified: Fri, 14 Aug
  2026 16:52:20 GMT`. The bundled live game client reached `ready: true` with the approved
  `new-primary-deck`, one canvas, 48 CardViews / 48 unique identities, 8 hand / 8 field / 24 draw,
  zero empty placeholders, no diagnostics, and a clean idle screenshot at
  `output/phase-3f-c/live-ready/shot-1.png`.
- Phase 5 full local product is next. Continued owner visual notes may still be handled as bounded
  polish without reopening the accepted interaction architecture.

## 2026-08-14 — Phase 3F-D local implementation

- Implemented presentation-only pre-travel no-match field reflow followed by a direct source path,
  first-authoritative-target capture overlap/hold/collection, Draw parity after Reveal activation,
  and no generic pre-tap Draw pulse.
- Added the compact temporary `PLACE HERE` field badge and stronger destination outline without
  bringing back empty field placeholders or text over card art.
- Added CHOREO-3FD vector/ADR/gate documentation and root/Pages screenshot hooks for a direct
  no-match travel and a Hand pair overlap hold.
- Local closure is green: `npm run check` passed format/lint/typecheck/decks, 46 files / 442 tests,
  all 10,002 generated seeds, and the production build. One final `validate:phase3fd` run passed the
  48/48 release deck, 100 technical artifacts, focused 5 files / 77 tests, Workshop, 14-viewport
  density review, and root/Pages smoke; the bundled game client and CHOREO screenshots were
  inspected. Independent Terra review found no blocker, high, or medium issue.
- Release commit `108fb05` passed CI run `31844698117` (`verify`, 9m04s) and Pages run
  `31844698124` (`build`, 11m33s; `deploy`, 9s). The cache-busted live URL returned HTTP/2 200 with
  `x-cache: MISS`, `Last-Modified: Fri, 14 Aug 2026 22:09:56 GMT`, and `assets/index-DjACAdI7.js`.
  Two bundled live-client iterations were ready with the approved deck, one canvas, 48/48 CardViews,
  8 field / 8 hand / 24 draw, and clean diagnostics; `output/phase-3f-d/live-ready/shot-1.png` and
  `state-1.json` were inspected.
- Phase 3F-F deployed/live accepted at `b787faa158dd1b62fb98f085d0c6020f00889d9d`: CI `31865103301`
  and Pages `31865103302` passed, and the live cache-busted build returned HTTP/2 200 MISS. Earlier
  hosted browser failures were test-harness scroll/primary-pointer receipt issues repaired without
  production changes. Final live client evidence is ready with one canvas, 48 unique CardViews, 24/8/8/8
  zones, 16 semantic controls, closed utilities, and no diagnostics. Next: Phase 5A.
- Phase 3F-D is deployed and accepted. Next: Phase 3F-E utility dock/capture cleanup, then Phase 5A
  full local match formats and ordered yaku-card evidence.

## 2026-08-14 — Phase 3F-E utility dock/capture cleanup local gate

- Added the fixed bottom-safe **History**, **Yaku Guide**, **Options** dock, native read-only History
  and Yaku Guide dialogs, and a static frozen thirteen-yaku reference with canonical example cards.
  It is intentionally not tutorial/onboarding or a live-table evaluator.
- Removed redundant routine hand count/points, capture zero-count, and Reveal-section labels. Public
  capture inspection retains its modal ownership/privacy boundary and now uses regular 5:8 cards with
  a clearly light frame.
- Added `UTILITY-3FE-001` through `UTILITY-3FE-008`, ADR 0024, a `validate:phase3fe` flattened gate,
  and CI/Pages artifact routing to `output/phase-3f-e/e2e/`. Root and Pages production smokes now
  exercise exact dock order, History/Guide/Options mutual exclusion, Escape focus restoration, all
  thirteen guide entries/example images, capture frame geometry, privacy, one canvas, and 48 stable
  CardViews at seven baseline viewports plus focused 390×844 and 844×390 dialogs.
- Local closure is green. `npm run check` passed format/lint/typecheck/decks, 47 files / 444 ordinary
  tests, all 10,002 generated matches, and the 772-module build. `validate:phase3fe` passed release
  deck approval (48/48), 100 technical artifacts, 6 focused files / 79 tests, Workshop, the
  14-viewport density review, and full root/Pages smoke. The bundled skill client reached ready state
  with one canvas and 48 persistent CardViews; Yaku Guide, landscape dock, and capture-gallery
  screenshots were visually inspected.
- Independent Terra review initially found two medium issues: the browser gate did not prove clearly
  light borders in all themes, and utility mutual exclusion did not include Options. The shared
  light-frame token, complete one-dialog-at-a-time guards, and strengthened browser assertions repair
  both. Root and Pages smokes pass after repair, and post-repair review reports no blocker, high, or
  medium finding.
- Release commit `f8358d8` passed CI run `31855285354` (`verify`, 01:00:16–01:11:13 UTC) and Pages
  run `31855285349` (`build`, 01:00:17–01:13:15; `deploy`, 01:13:19–01:13:27). The cache-busted
  live URL returned HTTP/2 200 with a cache MISS, `Last-Modified: Sat, 15 Aug 2026 01:13:23 GMT`,
  and production assets `index-DMr_DIMH.js` / `index-DwN18UTX.css`.
- The bundled live client recorded expected `ready:false` in `state-0` while textures loaded, then
  `state-1` and `state-2` reached `ready:true` with the approved `new-primary-deck`, one canvas,
  48/48 unique CardViews, 8 field, 8 hand, 24 draw, and clean diagnostics. The states and screenshots
  under `output/phase-3f-e/live-ready/` were inspected.
- Phase 3F-E is deployed, live-verified, and accepted. Next: Phase 5A full local match formats.

## 2026-08-14 — Phase 3F-F interaction clarity/card inspection gate (in progress)

- Added the Phase 3F-F acceptance boundary: stronger shared yellow-gold source/target/field cues,
  optional read-only public-observation phase help, and privacy-safe card inspection. `VISUAL-3FF-001`
  through `VISUAL-3FF-008`, ADR 0025, the manifest, and in-progress PLAN/STATUS/README records all
  state that rules, engine/protocol/replay, scoring, result authority, and persistent CardViews remain
  unchanged.
- Exact yaku-card formation evidence remains Phase 5A. It cannot be reconstructed from a final
  capture set because category upgrades and Bright replacements lose chronology; Phase 5A must persist
  public trigger-time evidence in result/history/projection/protocol/replay data.
- Added the flattened `validate:phase3ff` successor command, CI/Pages routing, and Phase 3F-F browser
  artifact destination. UI selectors, focused test implementation, browser smoke extension, local
  validation, independent review, deployment, and live verification are still pending; do not report
  Phase 3F-F as complete until those evidence steps finish.
- Local closure now passes: 48/48 release deck, 100 artifacts, 7 files / 83 tests, Workshop, 14 density
  viewports, and root/Pages smoke; all-web validation passed 143 tests/build. Initial four-medium review
  findings were repaired and cleanly re-reviewed. Commit, hosted CI/Pages, and live verification remain pending.
- `npm run check` passed 48 files / 448 ordinary tests, all 10,002 deterministic seeds, and the
  774-module production build. The final bundled skill client at 1280×720 reached ready with one canvas,
  48 unique CardViews, 8 hand / 8 field / 24 draw, 8 actionable plus 8 inspect-only semantic controls,
  closed utility surfaces, and no diagnostics; `output/phase-3f-f/game-client-final/shot-1.png` and
  `state-1.json` were inspected.
