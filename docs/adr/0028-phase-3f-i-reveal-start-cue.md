# ADR 0028 — Phase 3F-I Reveal start cue

**Status:** Deployed, live-verified, and accepted

## Context

The physical Draw choreography deliberately separates reveal from resolution. Once the Draw card has
settled face-up in Reveal, the player must tap it before any field destination is selected. Existing
yellow-gold feedback already communicates a selected source and legal destination. Using gold before
the Reveal tap would blur "interact next" with "selected." The requested treatment must make the
Reveal interaction obvious without reintroducing routine instructions, pre-tap target movement, or
browser-derived game authority.

## Decision

- After the physical Draw transit, flip, and reveal pause have completed, render a restrained pulsing
  white outer-edge outline around the canonical public Reveal card only while the local player is
  idle in `awaitingDrawResolution` with exactly one selectable Reveal source and no selected source.
- Keep it absent during travel, flip, reveal pause, selection/intent/animation locks, decisions,
  results, handoff, opponent turn, and utility dialogs. Tapping Reveal removes it immediately;
  existing Pixi yellow-gold selected-source and legal-target/no-match destination language then
  applies. Opening and closing Options preserves an already-selected Reveal source and its existing
  legal target/field-placement state while the cue remains hidden. Escape/cancel restores white only
  when the same settled idle Reveal state returns.
- Do not add a field pulse, card scale, random overlay, placeholder, instructions, semantic control,
  new action, or pre-tap legal-target cue. The four canonical Draw resolution families keep their
  existing authoritative semantics.
- In reduced motion, keep a steady visible white outline rather than a repeating pulse.
- Keep the cue presentation-derived as an `aria-hidden`, pointer-inert decorative DOM perimeter from
  recipient-safe input inspection and canonical Reveal-card bounds. Pixi retains selected-source and
  legal-target feedback. The perimeter must not change engine state, commands, legal actions,
  observation, protocol, rules, scoring, replay, projection, results, semantic controls, or CardView
  identity.

## Consequences

- White consistently means the next required card interaction; gold consistently means a selected
  source or legal destination.
- A player sees the settled Reveal card as the next action without relying on routine copy or a
  target pulse that could imply a match before selection.
- Existing semantic controls continue to own activation and keyboard behavior; the cue introduces no
  focusable surface and needs no Pixi ticker.
- Ordered achieved-yaku cards, their formation chronology, round progression, and expanded result
  evidence remain Phase 5A responsibilities.

## Acceptance and evidence

`VISUAL-3FI-001` through `VISUAL-3FI-006` in `docs/TEST_VECTORS.md` govern this work.
`npm run validate:phase3fi` is the flattened local/CI/Pages gate. It retains the relevant
Phase 3F-H release-deck, technical-deck, interaction/runtime, Workshop, density-review, and
root/Pages checks while adding `apps/web/tests/phase3fi-reveal-attention.test.ts`. Root and
repository-prefixed Pages browser artifacts will belong under `output/phase-3f-i/e2e/`.

`npm run check` passed 51 ordinary test files / 466 tests, all 10,002 generated seeds, deck
validation, and the 776-module build. `npm run validate:phase3fi` passed the 48/48 release deck, 100
technical artifacts, 10 focused files / 101 tests, Workshop, the Phase 3D-D 14 root/Pages density
viewports, and full root/Pages smoke through Bank/restart. Root/Pages screenshots under
`output/phase-3f-i/e2e/` were inspected for the exact white-before/gold-after source and legal-
target/destination treatment.

The bundled develop-web-game client completed two 1280×720 iterations against the final root
production build. Its ready authoritative-local-round `state-0`/`state-1` show one canvas, 48 unique
persistent CardViews, the 8/8/24 Hand/opponent/draw allocation, idle input, and no diagnostics or
clipped/invalid/overlap zones; its screenshot was inspected.

Independent Terra review initially found three medium findings: require the rendered Reveal
placement to be face-up; remove a `min-height` that could expand the decorative cue beyond exact card
bounds; and replace indirect Draw-family/render/selected-Options evidence. The repairs add face-up
gating, exact placement geometry, authoritative four-family test coverage, a direct stable Pixi
interaction-highlight treatment assertion, and selected-Reveal Options round-trip evidence. Clean
re-review found no blocker, high, or medium issue. Commit `a469b4c` passed hosted CI run
`31888143328`: `verify` 13:47:14–14:01:33Z, `check` 13:47:58–13:54:09Z,
`validate:phase3fi` 13:54:09–14:01:26Z, and artifact upload succeeded. Pages run `31888143474`
passed: build 13:47:15–13:59:41Z, `check` 13:47:54–13:53:43Z, `validate:phase3fi`
13:53:43–13:59:35Z, deploy 13:59:46–13:59:54Z. A cache-busted live response returned HTTP/2 200
MISS with `Last-Modified: Sat, 15 Aug 2026 13:59:51 GMT` and bundles `assets/index-Vt-DMjm5.js` /
`assets/index-DsY0wC-9.css`. The first short live-client trace captured expected texture loading in
two snapshots; a longer cache-busted run reached ready in 4/4 snapshots with one canvas, 48 unique
CardViews, idle `awaitingHandPlay`, 8/8/24/8 allocation, no clipped/invalid/overlap diagnostics, and
an inspected screenshot. Phase 3F-I is deployed, live-verified, and accepted. A physical
iPhone/WebKit check of perceived pulse motion and white-outline contrast remains supplemental.

The focused presentation test directly exercises the scene's stable interaction-highlight treatment:
an unselected actionable Reveal remains muted, while a selected Reveal source and an authoritative
legal target use gold. Browser evidence records the same selected state and its target/no-match
semantics with screenshots; it does not rely on brittle pixel sampling.

## Next subphase

After this narrow cue is accepted, **Phase 5A full local match formats** remains the next substantive
product phase. It owns 3/6/12-round progression, recap/rematch, and authoritative ordered completed-
yaku card evidence in expanded end-of-play details.
