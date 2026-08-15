# ADR 0027 — Phase 3F-H active-hand start cue

**Status:** Deployed, live-verified, and accepted

## Context

At the beginning of a local turn, the table's tap-only interaction needs a visible but restrained
indication that the player should begin by choosing a card from their Hand. Existing yellow-gold
feedback already communicates selected sources and legal destinations, so reusing that language for
the next required action would blur two different meanings. The requested cue must fit the current
calm, bold table style without restoring routine phase instructions or altering game authority.

## Decision

- During the local player's idle `awaitingHandPlay` state with at least one legal Hand card and no
  selected source, render a restrained pulsing white outline around the actual Player Hand zone.
- Remove the cue immediately when a Hand source is selected. Keep it absent during targeting,
  confirming, intent submission, animation, Draw/Reveal, decisions, results, handoff, opponent
  turns, and every external input lock. Restore it only when cancellation returns to the same active
  idle Hand state.
- Keep gold exclusively for the existing selected-source and legal-destination semantic family. Do
  not pulse individual cards, add copy or placeholder slots, create a new action, or make the outline
  a semantic DOM control.
- In reduced motion, retain a steady white outline instead of a repeating pulse.
- Keep the cue presentation-derived as an `aria-hidden`, pointer-inert decorative DOM perimeter from
  existing recipient-safe input inspection and canonical `layout.cardZones.playerHand` bounds. Pixi
  retains selected-source and legal-target feedback. The perimeter must not change engine state,
  commands, legal actions, observation, protocol, rules, scoring, replay, projection, results,
  semantic controls, or CardView identity.

## Consequences

- A player can see where the turn begins without relying on a routine instruction strip or confusing
  the start cue with gold selection/target feedback.
- Existing screen-reader and keyboard interaction remains owned by semantic controls; this cue adds
  no focusable surface and does not alter ordinary card activation.
- Browser evidence can inspect the decorative cue's visibility, canonical-layout-synchronized bounds,
  `aria-hidden`/pointer-inert state, and computed normal/reduced-motion style directly; no new
  production scene diagnostic or Pixi ticker is required.
- Exact completed-yaku formation evidence, multi-round advancement, and the redesigned expanded round
  details remain Phase 5A work.

## Acceptance and evidence

`VISUAL-3FH-001` through `VISUAL-3FH-005` in `docs/TEST_VECTORS.md` govern this work.
`npm run validate:phase3fh` is the locally accepted flattened local/CI/Pages gate. It retains the relevant
Phase 3F-G release-deck, technical-deck, interaction/runtime, Workshop, density-review, and root/Pages
checks and adds `apps/web/tests/phase3fh-hand-start-cue.test.ts`. Root and repository-prefixed Pages
browser artifacts belong under `output/phase-3f-h/e2e/`. `npm run check` passed 50 ordinary test
files / 456 tests, all 10,002 generated seeds, deck validation, and the 775-module build.
`validate:phase3fh` passed the 48/48 release deck, 100 technical artifacts, 9 focused files / 91
tests, Workshop, 14 root/Pages density viewports, and full root/Pages smoke through Bank/restart. The
bundled web-game client completed three ready 1280×720 iterations with one canvas, 48 unique CardViews,
and no layout diagnostics; Root/Pages 390×844, selected, 844×390, three-theme, and reduced-motion
screenshots were inspected. Browser acceptance caught an Options selection-reset regression from a
whole-surface refresh; a decorative-only cue renderer repaired it and the rerun was green. Independent
Terra re-review found no blocker, high, or medium issue. Commit `55a4032` passed hosted CI run
`31873371558` (`verify`, 08:00:07–08:13:59Z; both `check` and `validate:phase3fh` passed) and Pages
run `31873371515` (`build`, 08:00:08–08:12:34Z; `deploy`, 08:12:39–08:12:49Z). A cache-busted live
request returned HTTP/2 200 MISS with `Last-Modified: 2026-08-15 08:12:44 GMT`. The live bundled
client completed two ready iterations with the visible whole-Hand white perimeter, one canvas, 48
stable CardViews, and no layout diagnostics. A physical iPhone/WebKit check of perceived pulse motion
and white-outline contrast remains supplemental.

## Next subphase

**Phase 5A full local match formats** remains the next substantive product phase. It owns 3/6/12-round
progression, recap/rematch, and authoritative ordered completed-yaku card evidence in expanded
end-of-play details.
