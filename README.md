# KoiKoi4x

KoiKoi4x is a greenfield TypeScript rewrite of a two-player Hanafuda strategy game. The repository is
currently at **Phase 1B: deterministic turn and capture state machine**. It contains the
canonical rules authority, all 48 artwork-independent card records, a versioned deck authoring
contract, strict workspace boundaries, a tested PixiJS boot surface, reproducible match setup, and
the complete headless hand-play/capture/draw turn loop through its End-of-Play handoff.

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
npm run validate:cards
npm run validate:decks
npx playwright install chromium
npm run test:e2e:smoke
```

`npm run generate:deck-artifacts` regenerates the JSON Schemas, SVG Art Guide, and pilot import plan
from the locked Phase 0D constants. Development deck validation accepts the four checked-in technical
pilot sources and reports the other 44 final-art files as pending; release validation remains blocked
until Phase 2 visual approval.

`npm run validate:phase1a` executes the seeded RNG, shuffle/deal, state-invariant, automatic opening
outcome, event-visibility, and DEAL-001–012 fixture suite. The browser smoke produces responsive
screenshots and the serialized runtime state under
`output/phase-0b/e2e/`.

`npm run validate:phase1b` executes the pure capture primitive, gameplay command state machine,
legal-action generation, authoritative invariants, and all eight CAP-000 through CAP-DRAW-003
fixtures. Exact two-match hand choices travel atomically with the hand command; exact two-match draw
choices persist as an authoritative pending phase.

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
needed in Phase 1B. This subphase is headless, so the deployed page intentionally remains the Phase
0B boot surface until rendering/gameplay integration begins.
