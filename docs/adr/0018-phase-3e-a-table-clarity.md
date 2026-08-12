# ADR 0018: Phase 3E-A table clarity and decision surfaces

- **Status:** Accepted for implementation
- **Date:** August 11, 2026

## Context

Owner playtesting found that permanent numbered field slots read as fake cards, the top Options
trigger competed with play, compact capture rails could not be inspected, the Koi-Koi modal hid
decision-relevant table information, and the result modal presented too many facts at once.

## Decision

Phase 3E-A is a presentation-only correction:

- retain field geometry but render no numbered or outlined empty-card placeholders;
- anchor Options to the bottom safe area while preserving its existing dialog, persistence, and
  critical-state locks;
- expose recipient-relative public capture rails as semantic inspection controls. A focus-managed
  inspector groups only public captured cards by canonical category and uses active deck art;
- render the Yaku Decision as a non-obscuring, non-modal tray outside the game frame. Gameplay
  controls remain locked, but public capture inspection stays available;
- keep Round Result as the authoritative modal, initially showing outcome, award, totals, and its
  primary action. Scoring, evidence, next-round plan, and history begin collapsed in native
  details.

The browser may format public card metadata and use deck-manifest image paths. It may not evaluate
captures, Yaku, scoring, next-starter policy, or hidden allocation.

## Consequences

- Capture inspection is local presentation state and never an engine command.
- Opening/closing inspection cannot change state version, selection, projection, CardView identity,
  or replay data.
- The Koi tray's `aria-modal` value is false because the public capture controls remain reachable;
  Bank/Koi buttons remain the only executable gameplay controls.
- The full interactive Draw redesign remains Phase 3E-B/C and is not simulated here.
