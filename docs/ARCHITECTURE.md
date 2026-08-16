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

Phase 3E-A capture inspection and result/decision disclosure are recipient-only presentation state
inside `apps/web`. They consume public captures, public Yaku/legal actions, public results, and active
deck-manifest image paths. They may not create commands, infer gameplay outcomes, access hidden
allocation, or enter authoritative replay/protocol records.

The deck-format core is browser-portable and performs schema validation, inheritance, provenance,
transform math, and complete runtime-manifest validation without filesystem access. Node-only source
inspection, hashing, technical-pilot seeding, generated artifacts, and the CLI live below
`packages/deck-format/src/node` or the CLI entry point. Authored source/transform manifests are never
browser texture manifests. Phase 2B adds a distinct `RuntimeDeckManifestV1` containing only complete
resolved face/back asset paths and provenance; the web app imports the portable entry point and never
the Node adapter.

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
  reveal/resolution, pending draw decisions, per-phase yaku checks, Bank/Koi-Koi execution, turn and
  End-of-Play completion, and atomic round-result commitment;
- `state/projection.ts` owns exact public/player state views and audience-filtered projected events;
- `serialization/canonical-json.ts` owns canonical JSON v1 and portable SHA-256 integrity hashes;
- `replay/authoritative-replay.ts` owns private production-seam command logs, deterministic replay,
  and immutable accepted-command retry receipts.

The RNG checkpoint is returned alongside, not embedded in, authoritative gameplay state. Production
setup uses the random source; authored ordered decks are available only as a deterministic
fixture/practice input. Generated states and transitions are recursively frozen.

An accepted gameplay command advances `stateVersion` exactly once and records its command ID. A
two-match hand choice is part of the atomic `playHandCard` command. Every draw instead commits
`awaitingDrawResolution`, where the revealed card is its own authoritative card zone and the
engine-owned 0/1/2/3 capture preview remains public. `resolveDrawCard` completes that Draw in a
second transition; only an exact-two preview carries a target. Captures append source first and
selected field card(s) in field order. Normal gameplay
does not consume randomness, so callers carry the Phase 1A RNG checkpoint forward unchanged.

After every resolved Hand or Draw capture window, active yaku are recomputed from public captures.
All unseen active keys are appended atomically and produce one `awaitingYakuDecision` context for
that phase. A Hand decision pauses before draw reveal; a Draw decision pauses before turn completion;
and a final-Draw decision records an End-of-Play resume marker. Phase 1D exposes actor-only executable
Bank/Koi-Koi actions, applies ordinary/special/final-leader availability, and consumes that marker in
one accepted decision command. Bank and natural exhaustion commit a typed round result and durable
history; final-month results commit a cumulative match result.

Phase 5A records each ordinary-Yaku completion in the engine at the exact trigger-time Hand/Draw
check. A scored ordinary result publishes canonical-order final rows linked to that chronology; a
shared card remains in every row it actually supports. Projection, protocol validation, and replay
carry this public evidence before Phase 5B persistence. `apps/web` renders it and sends only real
advance/rematch intents: it must not infer qualification, scoring, next-round state, or match outcome.
Nonfinal advancement preserves scores/history through `advanceRound`; a terminal result creates a
fresh authoritative local match on rematch.

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
- The Pixi ticker remains stopped. One presentation-owned AnimationDirector advances through an
  explicit delta; the browser supplies `requestAnimationFrame` only while a public-event plan is
  active, and `window.advanceTime(ms)` switches to the same director's deterministic manual clock.
- The prescribed ten scene layers persist, with separate chrome and card child containers. Chrome
  redraws for resize never recreate the scene layers or the 48 canonical CardViews.
- One persistent CardView exists per canonical CardId. Animation reparents that same object through
  Effects/transit and settles it back to its target layer without recreating it.
- The Phase 2C event planner consumes projected public semantic events plus trusted recipient-safe
  event-boundary projections. Events choose clips; projections choose final zones/faces. Pixi
  coordinates never determine capture legality, scoring, commands, or authoritative state.
- Normal, Fast, Instant, and Reduced Motion share one FIFO clip plan and exact final projection.
  Finish, cancel/snap, resize rebase, destruction, and deck switching cannot leave stale queued work
  or a CardView in transit.
- Phase 3A's browser-local adapter owns the sole production call from an accepted input intent to an
  engine command. Input/Pixi remain rule-free, and a fresh `PlayerObservationV1` replaces the source
  after the public-event animation settles.
- Phase 3D-B attaches a frozen public Hand-resolution preview to each engine legal action. The
  preview distinguishes field placement, unique pair, exact-two choice, and four-card sweep and
  names only public field cards. Web input validates/renders that preview but still emits only one
  existing legal action; Pixi positions never create targets or choose a command.
- Phase 3D-C owns a presentation-only runtime theme store. It persists only a versioned allowlisted
  theme ID in IndexedDB and repaints existing DOM/Pixi/card chrome; it cannot recreate or modify the
  canvas, CardViews, deck, projection, interaction controller, observation, command, Yaku, or result.
- Phase 5B adds one local IndexedDB checkpoint at the web/runtime boundary, not as an engine
  persistence side effect. Its
  exact versioned decoder validates the private authoritative state and engine checkpoint/RNG before
  constructing a runtime, including state invariants and matching identity; unsupported versions,
  extra/missing fields, and corrupt records reject without migration or partial load. The one active
  save contains `mode: "local"` only and no command log, presentation state, or replay/tween data.
- A Phase 5B checkpoint is requested only after public-event presentation settlement at stable
  authority phases (`awaitingHandPlay`, `awaitingDrawResolution`, `awaitingYakuDecision`,
  `roundComplete`, or `matchComplete`). Serialized/coalesced monotonic writes prevent a late old
  completion from replacing newer authority. `matchComplete` is retained until explicit replacement
  or deletion; storage denial leaves the in-memory match live with a session-only warning.
- Resume never publishes a raw save or private state/RNG/checkpoint to DOM, text diagnostics, logs,
  or default diagnostic export. The active viewer and pass-the-device Ready cover are derived anew
  from restored authority before private observation is rendered. Corrupt recovery is an explicit
  Delete/Start New/sanitized-export surface, not a browser-side reconstruction. Firebase, online
  authority, CPU/practice saves, and legacy-save migration remain out of Phase 5B.
- The compact Options shell owns secondary browser controls. Critical turn instruction/actions,
  public Yaku names/totals, and latest history remain visible, while Yaku/result/handoff modals keep
  focus priority and prevent unrelated option changes.
- Phase 3D-D derives adaptive field geometry only from the public field-card count and preserves the
  exact public field order. Counts through eight retain the four-by-two layout; nine through the
  legal seventeen-card bound shrink into deterministic non-overlapping 5:8 grids.
- Dense field targets are non-overlapping card-cell territories with keyboard parity. Direct
  placement/capture clips complete before a separate reflow clip settles unrelated field cards.
  The isolated seventeen-card browser harness is built to a non-production output directory.
- The browser asset manager validates and preloads every candidate face/back before atomically
  switching local textures. Candidate failure leaves the active deck unchanged.
- `window.render_game_to_text()` returns stable JSON describing responsive layout, scene/CardView
  counts, face-up card identities, approved active deck, current player/public phase, input,
  animation, recap, and handoff state. It omits face-down identities, raw authoritative state,
  commands, checkpoints, RNG, texture URLs, and runtime coordinates.
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
script owns browser, seven-viewport responsive layout, fullscreen, live resize, repository-base asset,
semantic DOM, canvas, diagnostic-hook, and browser/network-error checks. The bundled web-game
client provides an additional artifact-compatible canvas/text-state pass during local validation.
Phase 2B additionally validates two complete technical runtime packages, all 48 persistent view
identities, exact zone coverage, 5:8 placement containment, atomic package failure, root/Pages asset
resolution, live deck switching, and identity preservation across resize.
Phase 2C adds literal semantic-plan/director tests, all-mode exact settlement, FIFO/rejection,
accelerate/finish/cancel/destroy, draw-back/flip ordering, reduced-motion/no-transit behavior, and
root/Pages browser matrices covering mid-flight deck switching and resize rebasing.
Phase 2D keeps input presentation-owned: a pure controller consumes only an injected
`PlayerObservationV1`, current legal actions, public confirmation hints, and presentation locks. It
emits a minimal immutable intent without a command ID and cannot import engine execution, RNG, or
transport. Pixi owns transient highlights; a semantic DOM overlay owns pointer/keyboard focus and
labels. A newer observation is required after intent emission. The current technical fixture is not
a real recipient projection or command sink. See
[`ADR 0010`](./adr/0010-phase-2d-input-intent-boundary.md).

Phase 3F-F extends that presentation boundary with read-only contextual help and a semantic-card
inspection gesture. Both consume only recipient-safe observation/card metadata; neither evaluates
rules, emits an intent, creates a CardView, or expands hidden-information visibility. See
[`ADR 0025`](./adr/0025-phase-3f-f-interaction-clarity-and-card-inspection.md).

Phase 3F-G retains that boundary while replacing factual inspector content with a static
catalog/Yaku-Guide reference expander. It may map a public card to general yaku contributions but
does not query live scoring, result evidence, or trigger chronology. Scoped interaction-surface CSS
prevents browser-owned long-press selection/touch callouts without disabling normal dialog text
selection or scrolling. See [`ADR 0026`](./adr/0026-phase-3f-g-card-inspector-yaku-reference.md).

Phase 3F-H adds a presentation-owned decorative DOM perimeter around the canonical Player Hand zone.
It synchronizes from recipient-safe input inspection and `layout.cardZones.playerHand`, is
`aria-hidden` and pointer-inert, and does not create an input intent, legal action, semantic DOM
control, CardView, or authoritative state transition. Pixi continues to own selected-source and
legal-target feedback; the white perimeter is distinct and becomes steady under reduced motion. See
[`ADR 0027`](./adr/0027-phase-3f-h-active-hand-start-cue.md).

Phase 3F-I extends the same presentation-only affordance pattern to the canonical public Reveal-card
bounds after the physical Draw settles. It is derived from recipient-safe input inspection only when
the unselected Reveal source is actionable; it is `aria-hidden` and pointer-inert, introduces no
input intent, legal action, semantic DOM control, CardView, or authoritative transition, and remains
absent until the Draw reveal pause completes. Pixi continues to own gold selected-source and legal-
target feedback. See [`ADR 0028`](./adr/0028-phase-3f-i-reveal-start-cue.md).

Phase 3F-J extends the presentation boundary only after an authoritative source selection: recipient-
safe input inspection supplies the existing legal Field target IDs or no-match placement state, which
may drive `aria-hidden`, pointer-inert gold destination perimeters and compact no-match copy. These
decorations neither infer matches nor create controls, intents, legal actions, CardViews, or state
transitions. The semantic overlay remains the sole activation surface. See
[`ADR 0029`](./adr/0029-phase-3f-j-legal-destination-pulse.md).

Phase 2E keeps deck authoring outside the production client. Portable package, transform,
contact-sheet, and approval contracts live in `packages/deck-format/src`; Sharp, filesystem access,
atomic writes, source decoding, and deterministic raster generation live only under
`packages/deck-format/src/node`. The Workshop uses a separate local-development Vite entry with a
session-token bridge. Normal Vite/Pages builds exclude that entry and bridge and consume only strict
complete runtime manifests. Source files are immutable inputs, assigned imports are digest-named,
and automated builds may verify but never manufacture owner visual approval. See
[`ADR 0011`](./adr/0011-phase-2e-workshop-import-approval-boundary.md).

Phase 3A adds a browser-local runtime adapter without changing engine ownership. It starts a
deterministic match, projects only the current player's observation, converts one already-validated
intent into one gameplay command, and uses public events for animation and recap. Hidden cards stay
face-down and are omitted from the text surface. Turn completion enters a full privacy cover before
the next player's observation is requested. The approved primary runtime directory is served/copied
by Vite and remains separate from authoring source. See
[`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md).

Phase 3D-D keeps dense layout presentation-owned and public-projection-only. Its deterministic grid,
target-territory exception, reflow boundary, and non-shipping browser harness are recorded in
[`ADR 0017`](./adr/0017-phase-3d-d-adaptive-dense-field.md).
