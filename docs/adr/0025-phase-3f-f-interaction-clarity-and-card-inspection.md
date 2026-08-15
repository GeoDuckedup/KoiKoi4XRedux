# ADR 0025 — Phase 3F-F interaction clarity and card inspection

**Status:** Locally implemented and validated; review/hosted release pending

## Context

Playtesting found the table’s source and target meaning inconsistent: selected Hand/Reveal cards use
gold while field targets read blue, and no-match placement needs a clearer visual destination. Players
also need optional next-step help and a way to inspect face-up cards without turning either surface
into a move, tutorial, or strategic evaluator.

## Decision

- Use one stronger yellow-gold semantic family for selected Hand/settled Reveal sources, legal field
  capture targets, and legal no-match field destinations. Preserve source-versus-target distinction
  through geometry/layering, not competing semantic colors.
- Add a top-right, optional contextual-help dialog. Its content derives only from the current public
  observation, existing legal actions, and presentation selection. It is read-only: it does not
  compute strategy, evaluate current Yaku, submit an intent, or become onboarding.
- Add a native-dialog card inspector for face-up public Field cards and the local player’s own Hand.
  Long press, keyboard, and context-menu invocation show public factual card metadata in a regular
  5:8 presentation. A short tap retains existing move behavior. Hidden opponent cards, face-down
  Draw/deck cards, future Draw order, RNG, checkpoints, and command identifiers remain unavailable.
- Help and inspector share the established modal/focus/input-lock policy with History, Yaku Guide,
  Options, capture inspection, and critical decisions. No second overlapping card-input overlay is
  introduced.
- Keep this work presentation/input only. Do not change engine, protocol, legal actions, scoring,
  replay, public projection, event authority, result types, or persistent CardView identity.

## Consequences

- The same public legal-action data continues to decide what can be activated; Pixi retains visible
  cue ownership and semantic DOM retains keyboard/pointer focus.
- Long-press lifecycle must suppress its follow-up activation and cancel on movement, early release,
  source replacement, animation/state change, or an input-locking dialog.
- Exact ordered cards for a completed yaku cannot be reconstructed from final captures: category
  upgrades and Bright replacements lose formation chronology. Phase 5A must record that public
  trigger-time evidence in authoritative result/history/projection/protocol/replay data before an
  expanded end-of-play UI presents it.

## Acceptance and evidence

`VISUAL-3FF-001` through `VISUAL-3FF-008` in `docs/TEST_VECTORS.md` govern local implementation.
The intended flattened gate is `npm run validate:phase3ff`; its root/Pages screenshots and diagnostics
belong under `output/phase-3f-f/e2e/`. Local completion and independent review passed: release deck
48/48, 100 technical artifacts, 7 focused files / 83 tests, Workshop,
14 root/Pages density viewports, and root/Pages production smoke. All-web focused validation passed
143 tests and a production build. Initial independent review found four medium gesture/scope issues;
they were repaired and clean re-review is recorded. Screenshots under `output/phase-3f-f/e2e/` were
inspected. `npm run check` also passed 48 files / 448 ordinary tests, all 10,002 deterministic seeds,
and the 774-module production build. The bundled skill client reached ready at 1280×720 with one
canvas, 48 unique CardViews, 8 hand / 8 field / 24 draw, 8 actionable plus 8 inspect-only semantic
controls, closed utility surfaces, and no diagnostics; its screenshot/state under
`output/phase-3f-f/game-client-final/` were inspected. Commit, hosted CI/Pages, and live verification
remain pending.

## Next subphase

**Phase 5A full local match formats** owns 3/6/12-round progression, recap/rematch, and authoritative
ordered yaku-card evidence in expanded end-of-play details.
