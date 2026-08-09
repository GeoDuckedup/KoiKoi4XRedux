# Intentional Differences from the Legacy Game

**Status:** Phase 0A locked rewrite boundary  
**Legacy reference:** <https://github.com/GeoDuckedup/HanafudaKoiKoi4x>

The legacy repository is historical evidence, not a compatibility target. This document records the differences that must not be mistaken for regressions when the greenfield implementation is compared with it.

## 1. Rules and terminology

| Area | Legacy behavior or representation | Canonical rewrite behavior |
|---|---|---|
| Invalid initial field | `dealRound()` silently reshuffles until no field contains four of a month. | Commit the deal, cancel that scheduled month 0–0, record every complete field month, and advance without redealing. |
| January 0–0 starter | Keeps the existing dealer/starter. | The opposite player from January's recorded starter begins February. |
| Later 0–0 starter | Preserves the dealer derived from prior state. | Explicitly preserve the starter of the 0–0 round for the next scheduled month. |
| Category vocabulary | Light, Seed, Scroll, Basic/Plain. | Bright, Animal, Scroll, Plain. |
| Stop action | Pass. | Bank. |
| Scheduled-month yaku | “Round Month Sweep,” even when accumulated. | Current-Month Set for the accumulated yaku; Four-Card Sweep only for the capture action. |
| Red + Blue Scrolls | Defines a separate 10-point `redBlueScrollSet` in addition to individual sets. | No combined bonus. Named sets and generic Scroll count stack; seven qualifying Scrolls total 13. |
| Lucky-hand evidence | Automatic result presentation is not a durable, fully specified public evidence transition. | Reveal the complete qualifying hand only after commit, explain the pattern/arithmetic, and preserve evidence in history. |
| Opening precedence | Invalid field layouts are removed by redealing before they can be represented as outcomes. | Field cancellation takes precedence over any lucky hand in the same committed deal. |
| Result history | Compact score/multiplier/no-score rows with free-text reasons. | Durable explicit reason codes, arithmetic, evidence, starter, and privilege consequences. |
| Final-draw Koi-Koi | Useful behavior exists and is intentionally retained. | Locked with reachable 1×–4× and forced-final-round fixtures; the former special-privilege final-draw vectors are retained as unreachable-state rejection cases because the privilege holder is necessarily the starter. |
| Bright tiers | Separate legacy keys largely reflect the intended hierarchy. | Explicit replacement hierarchy plus independent trigger history and stacking requirements. |

## 2. Architecture

| Area | Legacy | Rewrite |
|---|---|---|
| Runtime | Classic scripts and broad global browser state. | Strict TypeScript workspace with explicit module/package boundaries. |
| Rules transition | Rules mutate shared state and call rendering/timers directly. | Pure `GameCommand → state + GameEvents` transition. |
| Randomness | `Math.random()` drives shuffle, starter, AI personality, and AI jitter. | Injected, seeded `RandomSource`; multiplayer RNG remains server-only. |
| Presentation | `renderAll()` rebuilds hands, field, captures, and repaints card canvases. | Persistent PixiJS `CardView` objects keyed by canonical `CardId`. |
| Timing | `setTimeout()` participates in CPU and reveal flow. | Timers exist only in presentation/orchestration; engine state is timing-independent. |
| State categories | Authoritative, private, public, presentation, network, and save data coexist in one broad state model. | Separate `AuthoritativeGameState`, `PublicGameState`, `PlayerObservation`, and presentation state. |
| Events | Text recap records useful steps, but no authoritative semantic event pipeline exists. | Semantic events drive presentation, replay, projection, diagnostics, and protocol records. |
| Saves | Encoded full browser snapshots with v2→v3 migration. | New versioned save format at stable engine checkpoints; no legacy importer. |
| Compatibility | Existing DOM IDs, URLs, snapshots, and Firebase project are operational dependencies. | No compatibility layer, legacy link, save, schema, or project migration. |

## 3. CPU fairness

The legacy AI controller receives the broad shared state. Its threat evaluation calls hand-opportunity logic for both players, so opponent decision policy can inspect the human hand even when that information should be hidden.

The rewrite must instead:

- expose only `PlayerObservation` to CPU code;
- include the CPU's own hand, public field/captures/scores, opponent hand count, draw-pile count, round context, and legal actions;
- exclude opponent hand identities, deck order, and server RNG state;
- prove that changing the human hidden hand while keeping public information constant does not change the CPU input observation;
- return explanation tokens rather than internal reasoning traces.

## 4. Multiplayer authority and privacy

Legacy online snapshots are produced from the general save snapshot. Even after trimming UI fields, they retain:

- both complete player hands;
- the remaining draw-pile order;
- current pending rules state;
- enough full-state information for either member client to reconstruct private state.

Both room members can read and write the shared snapshot under the legacy Realtime Database rules. This is incompatible with the rewrite's fairness and authority requirements.

The rewrite must use:

- a new Firebase project;
- callable server-authoritative command handling;
- server-only authoritative state and RNG/deck order;
- per-player private projections;
- public semantic `TurnRecord` events;
- idempotency keys and expected state versions;
- opponent-turn replay from `beforePublicState` without exposing private cards;
- deny-by-default security rules and emulator tests.

No legacy room, snapshot, invite, Firebase rule, or partially completed match will migrate.

## 5. Cards and artwork

Useful factual legacy card data:

- 48 cards represented as short IDs `1a` through `12d`;
- four cards per month;
- stable month, display name, category, Scroll-kind, and Rain-Bright facts;
- Sake Cup is represented as the Animal-equivalent category and not Plain;
- three existing deck variants demonstrate the value of cosmetic deck switching.

Legacy art is stored as twelve month sheets per deck. Individual cards are selected with hard-coded pixel rectangles that vary by month and source-sheet dimensions. Several alternative decks reuse the classic crop rectangles against matching sheet layouts.

The rewrite intentionally does not preserve:

- short legacy IDs as the final canonical ID convention;
- sprite-sheet coordinates in card-domain data;
- month-sheet filenames as identity;
- legacy card aspect ratios or crop geometry;
- the assumption that alternative decks share the same source layout.

Phase 0C must assign descriptive canonical CardIds and verify the factual catalog. Phase 0D must implement the approved 5:8 full-bleed package contract, normalized transforms, inheritance, validation, Art Guide, and pilot inputs. Legacy images may be copied only after ownership/license and source-quality review.

## 6. User experience retained or reinterpreted

Retain as product lessons:

- tap-first card selection and highlighted month matches;
- CPU personalities The Timid, The Monk, and The Gambler;
- action recap and previous-turn replay concepts;
- multiple deck/theme choices;
- current-games and reconnect concepts;
- fast/reduced-motion intent;
- explicit table multiplier display.

Reimplement rather than copy:

- Learn in 60 Seconds as a deterministic playable lesson;
- persistent card motion through hand, field, match, and capture zones;
- semantic accessible recaps;
- complete animation skip/snap equivalence;
- async opponent-turn replay before controls unlock;
- semantic DOM accessibility for canvas cards.

## 7. Known risks and Phase gates

- **Canonical CardIds are not yet locked.** This is intentional Phase 0C work; Phase 0A vectors use unambiguous semantic card names.
- **Legacy artwork ownership and best-source status are not proven.** Do not copy it into a shipping package before review.
- **Legacy sheet crops are inconsistent with `ART_SPEC v1`.** They cannot seed the new geometry contract.
- **The package contained a stale README version header and two proposed deck-art filenames.** Repository authority uses design version 1.6 and `docs/DECK_ART.md`.
- **Online policy decisions remain open.** They do not block Phase 1 but must be closed before the affected Firebase/online phase.
- **Test vectors are specifications in Phase 0A.** They become CardId-bound in Phase 0C and executable when the Phase 1 test harness exists.
