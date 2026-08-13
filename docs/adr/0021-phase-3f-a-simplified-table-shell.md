# ADR 0021 — Phase 3F-A simplified table shell

**Status:** Accepted

## Context

Owner playtesting found that routine phase copy, explicit Confirm/Cancel controls, and developer-facing
animation/input choices competed with the cards for space. The in-canvas action strip repeated the
same turn context and reduced the size of the active player's hand.

## Decision

- Remove the visible routine turn-instruction/Confirm/Cancel strip and the initial local-round recap.
  Keep a visually hidden live instruction for keyboard and screen-reader feedback.
- Remove the in-canvas action bar and give its complete reserved height to the player-hand zone.
  Field, capture, Draw, Reveal, opponent-hand, and round-status geometry remain unchanged.
- Remove Play style, Motion, Faster, and Finish controls from Options. Production uses the normal
  presentation automatically and follows the operating system's reduced-motion preference.
- Keep Theme, deck selection, fullscreen, restart, Bank/Koi-Koi, result, handoff, capture inspection,
  and critical-decision locking.
- Preserve the authoritative controller and legal-action boundary. Phase 3F-A removes visible
  confirmation chrome; Phase 3F-B owns the final unified tap-only interaction reducer.

## Consequences

- Eight hand cards are materially larger at supported phone, landscape, and desktop layouts without
  reducing the adaptive 8–17-card field.
- Options sits after the table in document flow and cannot cover the enlarged hand.
- Theme, deck, animation settlement, state version, CardView identity, and gameplay authority remain
  unchanged.
- Root and Pages browser gates must prove responsive containment, automatic reduced motion, absence
  of the removed controls/copy, direct legal card interaction, and zero browser/network errors.
