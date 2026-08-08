# KoiKoi4x Architecture

## Package ownership

| Path | Responsibility | Forbidden ownership |
|---|---|---|
| `packages/engine` | Pure deterministic rules, state transitions, projections, replay | DOM, PixiJS, Firebase, browser app |
| `packages/deck-format` | Portable deck schemas, package resolution, normalized transforms, Art Spec, and isolated Node authoring adapters | Canonical game rules, DOM, PixiJS, Firebase |
| `packages/protocol` | Versioned schemas and shared wire contracts | Rendering and gameplay decisions |
| `packages/test-fixtures` | Named deterministic rules, match, projection, and protocol fixtures | Production behavior |
| `apps/web` | Browser shell, input, presentation, PixiJS, accessibility | Canonical rule logic |
| `functions` | Future authoritative Firebase service | Client rendering |

Dependencies point inward: the deck-format package may consume canonical `CardId` values from the
engine, while the engine cannot import deck-format or any presentation/authoring system. The web app
and eventual backend may consume domain/protocol packages; domain packages may not import
presentation, browser, or backend systems. ESLint restrictions and executable architecture tests
enforce these boundaries.

The deck-format core is browser-portable and performs schema validation, inheritance, provenance, and
transform math without filesystem access. Node-only source inspection, hashing, technical-pilot
seeding, generated artifacts, and the CLI live below `packages/deck-format/src/node` or the CLI entry
point. Phase 0D does not install deck packages into the browser runtime.

## Runtime baseline

- The web app is framework-free TypeScript on Vite and PixiJS.
- The Pixi ticker is stopped on the boot surface; test time advances only through
  `window.advanceTime(ms)`.
- `window.render_game_to_text()` returns a stable JSON description of the visible runtime state.
- The Vite base path is configurable with `VITE_BASE_PATH` for repository-relative GitHub Pages
  deployment.
- Firebase dependencies and configuration are deliberately deferred to Phase 7 so Phase 0B cannot
  establish accidental backend contracts.

## Testing layers

Vitest owns pure unit and boundary checks. The project smoke script owns browser, responsive,
fullscreen, semantic DOM, canvas, diagnostic-hook, and browser-error checks. The bundled web-game
client provides an additional artifact-compatible canvas/text-state pass during local validation.
