# KoiKoi4x Project Status

**Updated:** August 8, 2026  
**Overall state:** Greenfield rewrite, Phase 0C implemented

**Runtime state:** Tested responsive PixiJS boot surface; no gameplay runtime yet

## Current result

The repository foundation and canonical card domain are operational. A locked npm workspace
separates the browser app, headless engine, shared protocol, test fixtures, and future Firebase
service. The engine now exports 48 stable artwork-independent card records and validated Phase 0A
CardId bindings. The Vite/PixiJS boot surface remains the only browser runtime.

Phase 0C intentionally contains no rule execution, gameplay, persistence, deck package, artwork
mapping, or networking behavior. No legacy runtime source was copied.

## Foundation now present

- Git repository initialized on `main` with
  `https://github.com/GeoDuckedup/KoiKoi4XRedux.git` configured as `origin`.
- Node 24.14.0/npm 11 workspace with an authoritative `package-lock.json`.
- Strict TypeScript 6.0.3, Vite 8.2.1, PixiJS 8.19.0, Vitest 4.1.10, Playwright
  1.62.1, ESLint 10.8.1, and Prettier 3.9.6.
- `apps/web` responsive semantic shell and one-canvas Pixi boot presentation.
- `packages/engine`, `packages/protocol`, and `packages/test-fixtures` ownership boundaries.
- Frozen 48-card catalog with descriptive `CardId` values, normalized month/flower data, and domain
  lookup helpers.
- Exact Bright/Animal/Scroll/Plain, Scroll-kind, named-yaku, Sake Cup, and Rain Bright metadata.
- Machine-readable Phase 0A CardId groups and category-threshold sequences in `test-fixtures`.
- `npm run validate:cards` plus runtime/source guards that reject art-package fields from card-domain
  records and types.
- ESLint and executable Vitest guards preventing the headless engine from importing PixiJS,
  Firebase, or the web app, or opting into DOM libraries.
- Deterministic `window.advanceTime(ms)` and stable JSON `window.render_game_to_text()` browser hooks.
- Fullscreen button, `F` toggle, native/explicit `Esc` exit, responsive resize, and reduced-motion
  baseline.
- GitHub Actions CI and repository-name-aware GitHub Pages deployment.
- Root README, architecture record, accepted scaffold ADR, and five project-scoped specialist
  definitions under `.codex/agents/`.

## Architecture decisions

- npm workspaces are the initial monorepo mechanism.
- The browser presentation remains framework-free TypeScript plus PixiJS.
- TypeScript 6.0.3 is pinned because it is the newest stable release inside the current
  `typescript-eslint` peer range; TypeScript 7 is not yet compatible with that toolchain.
- The Pixi ticker is stopped. Visual time advances through the deterministic hook, and every scene
  change is rendered explicitly.
- Firebase code and dependencies remain deferred to Phase 7, avoiding premature protocol/backend
  contracts.
- Canonical IDs use `<english-month>-<stable-subject-or-role>`; duplicate-looking Plains have stable
  semantic `-a`/`-b`/`-c` ordinals.
- Card identity is normalized from month data and remains independent from Phase 0D art packages.
- `VITE_BASE_PATH` supplies the repository-relative production path because the final repository
  name and production host remain open nonblocking decisions.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0001`](./adr/0001-phase-0b-scaffold.md).

## Validation

- `npm run validate:cards` passed: 2 files / 10 tests covering the catalog and Phase 0A bindings.
- The validator proves 48 unique cards, exactly four per month, 5 Brights, 9 Animals, 10 Scrolls,
  24 Plains, and 3 Red Text / 4 ordinary Red / 3 Blue Scrolls.
- Exact fixed-yaku groups, Sake Cup as Animal-only, Rain Bright metadata, frozen records, stable
  lookup behavior, and art-field rejection passed.
- Independent read-only Phase 0C review found no remaining blocker after its regression-guard
  findings were repaired and rechecked.
- `npm run check` passed:
  - Prettier format check passed;
  - ESLint passed with zero warnings;
  - all four workspace TypeScript checks passed;
  - Vitest passed 4 files / 15 tests;
  - Vite production build passed with 711 modules transformed.
- Phase 0C changes no browser or presentation code, so its acceptance evidence is domain/static
  validation rather than a new gameplay or visual runtime claim.

The prior Phase 0B runtime baseline remains valid:

- `npm ci` passed from the lockfile: 153 packages installed, 158 audited, 0 vulnerabilities.
- `npm run test:e2e:smoke` passed in installed Chromium at all five baseline viewports: 360×640,
  390×844, 768×1024, 1366×768, and 1920×1080.
- The smoke test verified one visible canvas, semantic heading/status, ready state, deterministic
  250 ms advancement, button/F/Esc fullscreen flows, and zero browser/page errors.
- The required bundled web-game client passed at 1280×720 and produced an inspected canvas capture
  plus text state after six fractional frame steps (`simulationTimeMs` approximately 100 ms).
- Mobile and desktop screenshots were visually inspected. That inspection found an initially blank
  stopped-ticker canvas; an explicit Pixi render call repaired it, and the regenerated Hanafuda boot
  composition was re-inspected.
- A Pages-path build with `VITE_BASE_PATH=/Koikoi4xRedux/` passed and emitted repository-prefixed
  asset URLs.
- Independent read-only acceptance review found no remaining implementation blocker after this
  status/progress update.

Generated runtime artifacts are local and Git-ignored under `output/phase-0b/`; CI uploads its smoke
artifacts for inspection.

## Known constraints and risks

- There is no playable game yet. Runtime validation covers only the boot surface and diagnostics.
- Deck package schemas and approved pilot artwork inputs belong to Phase 0D.
- Firebase, persistence, and multiplayer are intentionally absent.
- The Phase 0B baseline is on `origin/main`; Phase 0C is ready for its commit and push. GitHub Actions
  CI and the custom Pages workflow already pass for the baseline, and the Vite/Pixi build is live at
  `https://geoduckedup.github.io/KoiKoi4XRedux/`.
- Final repository name/host and other previously listed nonblocking product decisions remain open.

## Owner verification and deployment steps

1. No manual hosting setup, secrets, Firebase work, or asset upload is required.
2. To verify locally, run `npm ci`, `npm run validate:cards`, and `npm run check`.
3. Review [`CARD_CATALOG.md`](./CARD_CATALOG.md) if you want to inspect the 48 locked identities.
4. After the Phase 0C push, GitHub Actions will validate and redeploy automatically. The public page
   will still show the Phase 0B boot surface because Phase 0C is headless domain data.
5. Check the repository Actions page for green CI and Pages runs; no new visual smoke action is
   required from you for this subphase.

No Firebase deployment, secrets, database, artwork package, or production domain setup is required
for Phase 0C.

## Next subphase

**Phase 0D — Deck package and art specification foundation:** define versioned art-package and
transform schemas, inheritance and validation, `ART_SPEC v1` constants, immutable-source workflow,
the primary-deck skeleton, generated Art Guide, and representative pilot inputs. Its gate is complete
resolved 48-card art coverage, deterministic normalized transforms, correct validation failures, and
pilot readiness without coupling artwork to canonical card identity.
