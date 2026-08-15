# ADR 0029 — Phase 3F-J legal destination pulse

**Status:** Deployed, live-verified, and accepted

## Context

The table already distinguishes a required next source from a selected source: white means “tap this
next,” while solid yellow-gold means “this source is selected.” Once a player selects a Hand or
settled Reveal source, the current legal Field target treatment is correct but too quiet to clearly
communicate the second tap. The no-match Field destination likewise needs direct, concise language.
The implementation must reuse authoritative input inspection rather than derive Hanafuda matching in
the browser.

## Decision

- After an authoritative local Hand or settled Reveal source has been selected, render a restrained
  pulsing yellow-gold decorative edge around every public legal Field target. For a no-match source,
  render one pulsing yellow-gold decorative Field perimeter and the compact badge
  `NO MATCH · PLACE HERE`.
- Keep the selected source solid yellow-gold and non-pulsing. Do not show any gold Field decoration
  before source selection; idle Hand/Reveal attention remains the white, source-only language.
- Exact-two and three-target sweep remain choices: each legal target pulses, with no default or
  browser-selected target. Do not add a target pulse/movement before a Reveal tap.
- Under reduced motion use steady gold edges. In normal motion use the established 1.2-second rhythm.
  Decorations are edge-only: no card translation, scale, fill, new placeholder, or field-card pulse
  outside legal target edges.
- Decorations must be `aria-hidden`, pointer-inert, and synchronize to the actual semantic target or
  Field bounds. They must not add a semantic control, activation route, intent, legal action, engine
  state mutation, command, observation field, CardView, or Pixi ticker.

## Consequences

- The interaction grammar becomes consistent: white asks for the next source selection; solid gold
  confirms the source selection; pulsing gold identifies the next destination selection.
- The no-match placement is explicit without reintroducing a confirmation bar or implying the player
  chooses an arbitrary field coordinate.
- Existing semantic controls retain pointer, keyboard, accessibility wording, and authority. Phase
  5A continues to own round progression and ordered completed-yaku evidence.

## Acceptance and evidence

`VISUAL-3FJ-001` through `VISUAL-3FJ-007` in `docs/TEST_VECTORS.md` govern this work.
`npm run validate:phase3fj` is the flattened local/CI/Pages gate. It retains the relevant Phase 3F-I
release-deck, technical-deck, interaction/runtime, Workshop, density-review, and root/Pages checks
while adding `apps/web/tests/phase3fj-legal-destination-pulse.test.ts`. Root and repository-prefixed
Pages browser artifacts belong under `output/phase-3f-j/e2e/`.

`npm run check` passed 52 ordinary test files / 477 tests, all 10,002 generated seeds, deck
validation, and the 777-module build. `npm run validate:phase3fj` passed the 48/48 release deck,
100 technical artifacts, 11 focused files / 112 tests, Workshop, the Phase 3D-D 14 root/Pages density
viewports, and full Root/Pages smoke through Bank/restart. Root/Pages target, no-match, Draw, Warm
Ivory, and reduced-landscape artifacts under `output/phase-3f-j/e2e/` were inspected. The first
browser harness selection mistakenly used Field `april-cuckoo` as a Hand source; it was repaired to
use the actual opening Hand `april-red-scroll`, whose legal Field target is `april-cuckoo`. The next
repair recognizes that the visual ring follows exact CardPlacement bounds while the semantic target
uses a deliberately partitioned touch territory; browser evidence checks containment and focused
coverage verifies exact placement bounds. The complete rerun passed. Terra independent review found
no blocker, high, or medium finding. The bundled client completed three ready iterations with one
canvas, 48 unique CardViews, and no diagnostics. Commit `26828d4` passed hosted CI run `31899208391`
(`verify`, 14m21s) and Pages run `31899208394` (build 12m29s; deploy 10s). The cache-busted live
response was HTTP/2 200 MISS, `Last-Modified: Sat, 15 Aug 2026 17:58:05 GMT`, with
`assets/index-61Vc__HL.js` / `assets/index-CTcqBr2T.css`; live JavaScript contains the exact new
visible and accessible strings. A three-iteration live client trace recorded loading `state-0`, then
ready `state-1`/`state-2`, one canvas, 48 unique CardViews, no clipped/invalid/overlap diagnostics,
and an inspected live shot. The hosted workflow's Node 20 deprecation annotation is nonblocking.
Phase 3F-J is deployed, live-verified, and accepted; Phase 5A is current.

## Next subphase

After this narrow presentation pass, **Phase 5A — full local match formats** remains next: 3/6/12
round progression, recap/rematch, and authoritative ordered completed-yaku-card evidence in expanded
round details.
