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

Dependencies point inward: deck-format and protocol may consume engine contracts, while the engine
cannot import either package or any presentation/authoring system. The web app and eventual backend
may consume domain/protocol packages; domain packages may not import presentation, browser, or
backend systems. ESLint restrictions and executable architecture tests enforce these boundaries.

The deck-format core is browser-portable and performs schema validation, inheritance, provenance, and
transform math without filesystem access. Node-only source inspection, hashing, technical-pilot
seeding, generated artifacts, and the CLI live below `packages/deck-format/src/node` or the CLI entry
point. Phase 0D does not install deck packages into the browser runtime.

## Deterministic headless engine

Phases 1A through 1E establish deterministic gameplay and verification wholly inside
`packages/engine`:

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
- `rules/round-results.ts` owns score arithmetic, canonical result normalization, next-starter and
  privilege plans, frozen-leader selection, and final match totals;
- `rules/round-advance.ts` owns validated checkpoint restoration, next-month setup, round-local
  resets, automatic-result continuation, and private/server-only deal events;
- `rules/turn.ts` owns command validation, legal-action generation, hand resolution, ordered draw
  reveal/resolution, pending draw choices, per-phase yaku checks, Bank/Koi-Koi execution, turn and
  End-of-Play completion, and atomic round-result commitment;
- `state/projection.ts` owns exact public/player state views and audience-filtered projected events;
- `serialization/canonical-json.ts` owns canonical JSON v1 and portable SHA-256 integrity hashes;
- `replay/authoritative-replay.ts` owns private production-seam command logs, deterministic replay,
  and immutable accepted-command retry receipts.

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
and a final-Draw decision records an End-of-Play resume marker. Phase 1D exposes actor-only executable
Bank/Koi-Koi actions, applies ordinary/special/final-leader availability, and consumes that marker in
one accepted decision command. Bank and natural exhaustion commit a typed round result and durable
history; final-month results commit a cumulative match result.

Result commitment and next-round dealing are separate transitions. `advanceRound` validates the
completed state and command before restoring the external RNG checkpoint, then returns the newly
advanced checkpoint. Its ordered-deck sibling supports authored fixtures. New deals reset all
round-local zones/yaku/multiplier/caller/trigger state while retaining scores and history. Legal
actions remain requested for one player at a time.

Every setup/gameplay event declares an audience: public, private to one player, or server-only.
Phase 1E projects only public events for shared records and additionally the owning player's private
initial-hand event for that player's view; server-only events cannot appear in projected unions.
Public state exposes hand/draw counts but not either exact hand, future draw order, RNG/checkpoints,
seen-trigger keys, or accepted command IDs. Automatic opening outcomes use the same typed round
history and transition plan as played results; lucky identities remain hidden before commit and are
revealed only by committed public evidence.

The authoritative replay log and accepted-command cache are immutable engine values intended for
private/server persistence. The initial RNG and checkpoint never enter public state, public events,
or protocol records. An exact accepted retry returns its original transition before stale-version
validation and does not roll current runtime backward; changed payload/principal reuse conflicts.
`packages/protocol` owns versioned `PublicTurnRecordV1` construction and strict runtime decoding,
including unique record sequence, canonical/hash versions, public before-state/events, and the
resulting public hash. Future Firebase transaction storage/publication remains Phase 7 ownership.

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
DEAL-001 through DEAL-012, CAP-000 through CAP-DRAW-003, 39 locked YAKU vectors, and 47 Phase 1D
Bank/Koi/transition/final/history vectors plus 11 new Phase 1E projection/invariant/replay vectors
live in `packages/test-fixtures` while production behavior stays in the engine. Phase 1E also runs
10,002 complete generated legal matches, split evenly across 3/6/12-round formats, with production
validation after every transition and sampled full replay/privacy hash equality. The project smoke
script owns browser, responsive,
fullscreen, semantic DOM, canvas, diagnostic-hook, and browser-error checks. The bundled web-game
client provides an additional artifact-compatible canvas/text-state pass during local validation.
