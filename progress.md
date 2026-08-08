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
