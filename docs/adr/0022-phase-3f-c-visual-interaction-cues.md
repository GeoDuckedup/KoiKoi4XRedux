# ADR 0022 — Phase 3F-C visual interaction cues

**Status:** Accepted

## Context

The player-facing 3F-B outcome is already tap-only: ordinary Hand and Draw play completes through
legal cards and the field, while Bank/Koi-Koi remains explicit. Owner playtesting identified a
remaining presentation need: the source, legal target, no-match field destination, and settled
Reveal action must read immediately without bringing back routine labels or confirmation chrome.

## Decision

- Keep legal-action authority, selection semantics, keyboard controls, and the current player-facing
  tap-only behavior unchanged. The legacy internal `Guided` controller terminology is not part of
  this subphase.
- Use one visual language to distinguish a selected Hand/Reveal source from legal field targets and
  the no-match field destination. The field destination must not imply a strategic placement slot.
- DOM semantic target and field-destination overlays remain interactive, focusable, and named, but
  draw no ordinary pointer-visible border, background, outline, or shadow. Pixi owns visible cues.
- Preserve field readability, empty-field absence, all themes, reduced-motion behavior, root/Pages
  support, one canvas, and persistent CardViews.

## Consequences

- 3F-C is presentation-only: it introduces no engine, protocol, rules, command, projection, tutorial,
  multi-round, or controller-refactor work.
- Browser evidence must capture selected source, pair target, no-match field destination, settled
  Reveal source, and themes at root and Pages bases. It must verify focus/accessibility alongside
  pointer-quiet overlay chrome.

## Owner verification and deployment steps

1. No hosting configuration, secret, migration, or manual asset step is required. Pushes to `main`
   run CI and deploy Pages after the gate succeeds.
2. On a phone-sized table, tap a Hand card with a pair, then a no-match card after reset. The selected
   card, the legal target, and the field destination should each be obvious without a Confirm button
   or a grid of empty field slots.
3. Complete a Draw and wait through its reveal pause. The settled Reveal card should become the clear
   source for the same target/field language.
4. Repeat after choosing Moonlit Indigo and Warm Ivory in Options, and at a desktop width. The cue
   meaning must remain clear while the field stays readable.

## Next subphase

**Phase 5 — Full local product:** add the approved multi-round formats, persistence, and
pass-and-play only after the interaction-polish sequence is accepted.
