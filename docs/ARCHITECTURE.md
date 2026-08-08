# KoiKoi4x Architecture

## Package ownership

| Path | Responsibility | Forbidden ownership |
|---|---|---|
| `packages/engine` | Pure deterministic rules, state transitions, projections, replay | DOM, PixiJS, Firebase, browser app |
| `packages/protocol` | Versioned schemas and shared wire contracts | Rendering and gameplay decisions |
| `packages/test-fixtures` | Named deterministic rules, match, projection, and protocol fixtures | Production behavior |
| `apps/web` | Browser shell, input, presentation, PixiJS, accessibility | Canonical rule logic |
| `functions` | Future authoritative Firebase service | Client rendering |

Dependencies point inward: the web app and eventual backend may consume domain/protocol packages;
domain packages may not import presentation, browser, or backend systems. ESLint restrictions and the
engine architecture test enforce the first boundary from the scaffold onward.

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
