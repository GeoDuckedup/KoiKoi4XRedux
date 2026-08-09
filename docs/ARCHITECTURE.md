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

## Deterministic headless engine

Phases 1A through 1C establish deterministic gameplay transitions wholly inside `packages/engine`:

- `random/` owns the versioned `xoshiro128**` source, snapshots, unbiased bounded integers, and
  immutable Fisher–Yates shuffle;
- `state/` owns JSON-safe authoritative state/event/checkpoint contracts, recursive freezing, and
  ownership/setup validation;
- `rules/round-setup.ts` owns the start command, locked shuffle-then-starter consumption order,
  8/8/8/24 deal layout, atomic state-version-1 commit, and semantic setup events;
- `rules/opening-outcomes.ts` owns complete-month and exact-four-pairs classification plus strict
  field-cancellation-before-lucky precedence;
- `rules/capture.ts` owns ordered 0/1/2/3 same-month inspection and immutable placement, selected
  pair, and Four-Card Sweep resolution;
- `rules/yaku.ts` owns the pure 13-key active-yaku evaluator, Bright replacement hierarchy,
  Current-Month Set, incremental category values, totals, and unseen-trigger derivation;
- `rules/turn.ts` owns command validation, legal-action generation, hand resolution, ordered draw
  reveal/resolution, pending draw choices, per-phase yaku checks, decision pauses, turn completion,
  and the End-of-Play handoff.

The RNG checkpoint is returned alongside, not embedded in, authoritative gameplay state. Production
setup uses the random source; authored ordered decks are available only as a deterministic
fixture/practice input. Generated states and transitions are recursively frozen.

An accepted gameplay command advances `stateVersion` exactly once and records its command ID. A
two-match hand choice is part of the atomic `playHandCard` command. A two-match draw instead commits
`awaitingDrawCapture`, where the revealed card is its own authoritative card zone and the two legal
targets remain ordered field references; `chooseDrawCapture` then completes that turn in a second
transition. Captures append source first and selected field card(s) in field order. Normal gameplay
does not consume randomness, so callers carry the Phase 1A RNG checkpoint forward unchanged.

After every resolved Hand or Draw capture window, active yaku are recomputed from public captures.
All unseen active keys are appended atomically and produce one `awaitingYakuDecision` context for
that phase. A Hand decision pauses before draw reveal; a Draw decision pauses before turn completion;
and a final-Draw decision records an End-of-Play resume marker. Phase 1C exposes no decision command
or legal Bank/Koi-Koi action: Phase 1D owns those options, scoring, and round/match consequences.
Legal actions are requested for one player at a time, while Phase 1E still owns formal client
projections, redaction, replay, and full idempotency storage.

Every setup event declares an audience: public, private to one player, or server-only. Phase 1A
preserves those semantics but does not yet construct formal client projections. Full projection,
redaction, command replay, and hashes remain Phase 1E responsibilities. Likewise, Phase 1A records an
automatic result and leaves its transition pending; Phase 1D owns future starter, privilege,
round/month advancement, and match recap/history behavior.

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

Vitest owns pure unit, fixture, invariant, determinism, privacy-semantics, and boundary checks. The
DEAL-001 through DEAL-012, CAP-000 through CAP-DRAW-003, and 39 locked YAKU suites live in
`packages/test-fixtures` while production behavior stays in the engine. The project smoke script owns browser, responsive,
fullscreen, semantic DOM, canvas, diagnostic-hook, and browser-error checks. The bundled web-game
client provides an additional artifact-compatible canvas/text-state pass during local validation.
