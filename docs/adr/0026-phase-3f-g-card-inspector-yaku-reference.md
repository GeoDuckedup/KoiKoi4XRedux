# ADR 0026 — Phase 3F-G card inspector yaku reference and native gesture polish

**Status:** Locally complete and accepted; commit/push/hosted CI/Pages/live verification pending

## Context

Phase 3F-F established a privacy-safe native-dialog inspector for face-up public Field cards and
the local Hand. Its factual grid is too dense for the desired optional yaku explanation, and normal
browser long-press behavior can show native text-selection or touch-callout chrome before the game
inspector appears. The product needs a clean optional reference without converting card inspection
into a current-board evaluator or moving completed-yaku evidence out of Phase 5A.

## Decision

- Replace the inspector facts grid with a collapsed bottom expander labelled **Yaku this card can
  contribute to**. It is a static catalog/Yaku-Guide reference and uses the guide's presentation
  style, canonical order, requirement/points wording, and card examples where appropriate.
- Map each canonical CardId to every ordinary yaku it can generally contribute to, including
  category threshold entries and conditional Current-Month Set. A card can occur under several
  entries. Opening Luck and Four-Card Sweep are excluded because they are not ordinary card
  contribution yaku.
- The reference never reads a live evaluator, hidden state, current captures, public result, or
  trigger history. It must say neither that a yaku is available now nor that the inspected card
  achieved it.
- Suppress `user-select`, browser touch callout, and native contextual-selection behavior only for
  semantic game card interaction surfaces. Do not globally disable ordinary dialog/body text
  selection or scrolling.
- Retain the 3F-F inspector's 475ms long-press lifecycle, short-tap move behavior, cancellation,
  keyboard/context-menu affordances, native-dialog focus/escape return, mutual exclusion, privacy,
  one canvas, and 48 persistent CardViews.
- Keep Phase 3F-G presentation/reference only. Engine, protocol, rules, legal actions, scoring,
  replay, projection, result types, and completed-yaku evidence do not change.

## Consequences

- The Yaku Guide and inspector should share static presentation/reference data so wording and
  ordering cannot drift. The mapping has a complete all-48-card test rather than relying on a few
  representative cards.
- An expanded inspector may scroll internally inside its native modal. It must remain contained at
  compact portrait and short landscape sizes, with an accessible expander and reachable close
  action.
- Root and repository-prefixed Chromium traces remain release-gate evidence. WebKit or real-device
  long-press-callout evidence is supplemental when available; no new mandatory heavyweight CI
  browser installation is introduced.
- Exact card sets for a yaku at the moment it completed, including formation chronology and repeated
  cards across yaku, remain unavailable to this reference surface. Phase 5A must record them in
  authoritative result/history/projection/protocol/replay data before expanded end-of-play UI can
  show them.

## Acceptance and evidence

`VISUAL-3FG-001` through `VISUAL-3FG-007` in `docs/TEST_VECTORS.md` govern this work.
`npm run validate:phase3fg` is the flattened local/CI/Pages gate; its root/Pages screenshots and
diagnostics belong under `output/phase-3f-g/e2e/`. It adds the focused
`apps/web/tests/phase3fg-card-inspector.test.ts` contract to retained 3F-F-relevant browser and
presentation checks. `npm run check` passed 49 ordinary test files / 452 tests, all 10,002 generated
seeds, release-deck validation, and the 774-module build. `npm run validate:phase3fg` passed 48/48
release deck, 100 technical artifacts, 8 focused files / 87 tests, Workshop, 14 root/Pages density
viewports, and full root/Pages smoke. Independent Terra re-review found no blocker, high, or medium
issue. Three bundled develop-web-game client iterations at 1280×720 showed one canvas, 48 unique
CardViews, and no invalid layout; Root/Pages collapsed, expanded, and 844×390 scroll-bottom
screenshots were inspected under `output/phase-3f-g/e2e/`. Commit/push, hosted CI/Pages, and live
evidence remain pending. WebKit/iOS native touch-callout behavior remains supplemental manual-device
evidence.

## Next subphase

**Phase 5A full local match formats** owns 3/6/12-round progression, recap/rematch, and
authoritative ordered completed-yaku card evidence in expanded end-of-play details.
