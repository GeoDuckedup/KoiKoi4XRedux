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
- Remaining work: commit, push, verify hosted CI/Pages, and record the deployment result.
