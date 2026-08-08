# KoiKoi4x Project Status

**Updated:** August 8, 2026  
**Overall state:** Greenfield rewrite, Phase 0B implemented  
**Runtime state:** Tested responsive PixiJS boot surface; no gameplay runtime yet

## Current result

The repository foundation is operational. A locked npm workspace now separates the browser app,
headless engine, shared protocol, test fixtures, and future Firebase service. The Vite/PixiJS boot
surface runs in a real browser at every baseline viewport and exposes deterministic test hooks from
the beginning of the project.

Phase 0B intentionally contains no card catalog, rule engine, gameplay, persistence, deck package, or
networking behavior. No legacy runtime source was copied.

## Foundation now present

- Git repository initialized on `main` with
  `https://github.com/GeoDuckedup/KoiKoi4XRedux.git` configured as `origin`.
- Node 24.14.0/npm 11 workspace with an authoritative `package-lock.json`.
- Strict TypeScript 6.0.3, Vite 8.2.1, PixiJS 8.19.0, Vitest 4.1.10, Playwright
  1.62.1, ESLint 10.8.1, and Prettier 3.9.6.
- `apps/web` responsive semantic shell and one-canvas Pixi boot presentation.
- `packages/engine`, `packages/protocol`, and `packages/test-fixtures` ownership boundaries.
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
- `VITE_BASE_PATH` supplies the repository-relative production path because the final repository
  name and production host remain open nonblocking decisions.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0001`](./adr/0001-phase-0b-scaffold.md).

## Phase 0B validation

- `npm ci` passed from the lockfile: 153 packages installed, 158 audited, 0 vulnerabilities.
- `npm run check` passed after that clean install:
  - Prettier format check passed;
  - ESLint passed with zero warnings;
  - all four workspace TypeScript checks passed;
  - Vitest passed 2 files / 4 tests, including the engine boundary tests;
  - Vite production build passed with 711 modules transformed.
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
- Canonical CardIds and verified 48-card metadata belong to Phase 0C.
- Deck package schemas and approved pilot artwork inputs belong to Phase 0D.
- Firebase, persistence, and multiplayer are intentionally absent.
- The Phase 0B baseline is committed and pushed to `origin/main`. The Pages environment still depends
  on the repository's GitHub Pages setting and successful workflow completion.
- Final repository name/host and other previously listed nonblocking product decisions remain open.

## Owner verification and deployment steps

1. From the repository root, run `npm ci`, `npm run check`, and `npm run test:e2e:smoke`.
2. Run `npm run dev`, open the printed URL, and inspect one portrait and one desktop layout. Test the
   fullscreen button, `F`, and `Esc`.
3. The Phase 0B baseline is already pushed to
   [`GeoDuckedup/KoiKoi4XRedux`](https://github.com/GeoDuckedup/KoiKoi4XRedux). The supplied ZIP
   archives remain local provenance inputs and are ignored by Git.
4. In GitHub, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The
   included workflow validates and deploys `apps/web/dist` on `main`.
5. Confirm both the CI and Deploy GitHub Pages workflows pass, then open the Pages URL and repeat the
   portrait/desktop/fullscreen smoke check.

No Firebase deployment, secrets, database, or production domain setup is required for Phase 0B.

## Next subphase

**Phase 0C — Canonical card catalog:** define descriptive stable CardIds and all 48 artwork-independent
card records; encode month/category/yaku metadata and special Sake Cup/Rain flags; add catalog
validation; and bind the Phase 0A vector specifications to canonical CardIds. The gate is exactly 48
unique cards, four per month, correct special flags, and no artwork fields in domain types.
