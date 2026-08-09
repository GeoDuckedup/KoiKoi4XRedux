# KoiKoi4x

KoiKoi4x is a greenfield TypeScript rewrite of a two-player Hanafuda strategy game. The repository
has locally completed **Phase 2C: semantic AnimationDirector**. It contains the canonical rules
authority, all 48 artwork-independent card records, the complete deterministic headless match
engine, privacy-safe projections and replay, a versioned deck authoring contract, strict workspace
boundaries, and a responsive Pixi table with 48 persistent canonical CardViews, local atomic deck
switching, and one deterministic presentation-only animation queue.

## Prerequisites

- Node.js 24.14.0 (see `.nvmrc`)
- npm 11.9 or newer

## Start locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Press `F` to enter or leave fullscreen; `Esc` exits fullscreen.

## Validate

```sh
npm run check
npm run validate:phase1a
npm run validate:phase1b
npm run validate:phase1c
npm run validate:phase1d
npm run validate:phase1e
npm run validate:phase2a
npm run validate:phase2b
npm run validate:phase2c
npm run validate:cards
npm run validate:decks
npx playwright install chromium
npm run test:e2e:smoke
```

`npm run generate:deck-artifacts` regenerates the JSON Schemas, SVG Art Guide, and pilot import plan
from the locked Phase 0D constants. Development deck validation accepts the four checked-in technical
pilot sources and reports the other 44 final-art files as pending; release validation remains blocked
until Phase 2 visual approval.

`npm run generate:technical-runtime-decks` regenerates the two complete Phase 2B browser fixtures,
and `npm run validate:technical-runtime-decks` proves their 100 checked-in manifest/face/back
artifacts are current. `technical-sunrise` and `technical-moonlight` are intentionally obvious
technical placeholders; they validate the runtime and are not approved deck art.

`npm run validate:phase1a` executes the seeded RNG, shuffle/deal, state-invariant, automatic opening
outcome, event-visibility, and DEAL-001–012 fixture suite. The Phase 2A browser smoke produces
responsive table screenshots and serialized layout diagnostics under `output/phase-2a/e2e/`.

`npm run validate:phase1b` executes the pure capture primitive, gameplay command state machine,
legal-action generation, authoritative invariants, and all eight CAP-000 through CAP-DRAW-003
fixtures. Exact two-match hand choices travel atomically with the hand command; exact two-match draw
choices persist as an authoritative pending phase.

`npm run validate:phase1c` executes all 39 locked `YAKU-*` evaluator vectors plus Hand, Draw,
pending-choice, incremental-value, multi-yaku, Player B, and final-draw state-machine integration.
It verifies that all new yaku from one capture phase share one decision context and that Bank/Koi-Koi
execution remains unavailable until Phase 1D.

`npm run validate:phase2a` runs the pure responsive layout vectors plus root-base and
repository-prefixed browser validation at seven phone, tablet, landscape, and desktop viewports.
It verifies all prescribed Pixi layers and logical zones, deterministic geometry, fullscreen,
resize behavior, Pages asset routing, and zero browser/network errors.

`npm run validate:phase2b` additionally validates the strict complete runtime-manifest contract,
two technical packages, all 48 persistent CardView identities and 5:8 placements, atomic switch
rollback, browser/Node package boundaries, live deck switching, and root plus GitHub Pages asset
delivery. Browser screenshots and serialized diagnostics are written under `output/phase-2b/e2e/`.

`npm run validate:phase2c` adds literal semantic planner/director coverage and root/Pages browser
matrices for Normal, Fast, Instant, and Reduced Motion, exact final-state equality,
accelerate/finish/cancel, mid-flight resize and deck switching, persistent CardViews, fullscreen,
and zero browser/network errors. Artifacts are written under `output/phase-2c/e2e/`.

## Workspace map

- `apps/web` — Vite/Pixi browser presentation.
- `packages/engine` — pure deterministic card, RNG, setup, turn, capture, and state domain.
- `packages/deck-format` — portable deck schemas, resolution, transforms, Art Spec, and Node authoring CLI.
- `packages/protocol` — versioned shared contracts.
- `packages/test-fixtures` — deterministic fixture ownership.
- `functions` — reserved for the Phase 7 authoritative Firebase service.
- `docs` — product, rules, architecture, phase, and workflow authority.

Read `AGENTS.md` and `docs/PROJECT_MANIFEST.md` before implementation work. Architecture ownership is
summarized in `docs/ARCHITECTURE.md`.

## Deploy

The repository is hosted at
[`GeoDuckedup/KoiKoi4XRedux`](https://github.com/GeoDuckedup/KoiKoi4XRedux) and includes a GitHub
Pages workflow. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The
workflow derives the correct Vite base path from the repository name and deploys `apps/web/dist` only
after checks pass.

No Firebase project, credentials, database migration, final artwork upload, or production domain is
needed for Phase 2C. The page presents a responsive technical animation harness and local Sunrise/
Moonlight selector. Its scenario/motion controls are presentation-only and issue no game commands;
selection and gameplay input arrive in Phase 2D, while Workshop/final-art approval remains Phase 2E.
