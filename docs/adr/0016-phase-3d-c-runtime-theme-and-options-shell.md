# ADR 0016: Phase 3D-C runtime theme and options shell

**Status:** Accepted

**Date:** 2026-08-11

## Context

Phase 3D-A established three owner-approved visual directions, but selected them at build time and
left the deployed application on its older palette. The production shell also exposed every
secondary setting beside the table, repeated turn information in several places, and made public
Yaku/history occupy more space than the current play decision.

Theme selection is cosmetic. It must not recreate or modify the local engine, player observation,
legal actions, animation plan, card identities, or deck bindings. Design §22.1 assigns cosmetic
preferences to IndexedDB.

## Decision

Ink & Parchment is the compiled and no-preference default. Moonlit Indigo and Warm Ivory are
selectable from one accessible Options dialog. Only an allowlisted version-1 record containing one
known theme ID is stored in IndexedDB. Missing, malformed, unsupported, or unavailable persistence
falls back to Ink without preventing the game from starting. A successful runtime selection stays
active in memory even when persistence is unavailable.

The current theme is applied through two presentation-only surfaces:

- semantic CSS tokens and the browser theme-color metadata;
- scene-local Pixi colors, including table chrome and game-controlled card frames/shadows.

Changing the theme redraws the existing scene. It may not recreate the canvas, 48 persistent
CardViews, deck textures, layout/projection, local round, interaction controller, selection, legal
targets, Yaku state, or result state.

The production shell uses this hierarchy:

- header title and Options trigger;
- playable table and existing critical gameplay dialogs;
- one visible turn bar with the current instruction and conditional Confirm/Cancel;
- compact public Yaku names and totals for both players;
- the latest event plus a native disclosure containing the complete ordered history.

Deck, confirmation style, motion, animation utilities, fullscreen, and local restart remain
available in Options. The dialog is unavailable while handoff, Yaku, or result modals own focus.
Opening it focuses the selected theme, Escape closes it and returns focus to its trigger, and global
card/fullscreen shortcuts do not operate beneath it.

## Consequences

- The approved Phase 3D-A palette is now a production feature rather than a review build.
- The table keeps critical play and scoring context visible while secondary controls remain
  reachable and keyboard accessible.
- Cosmetic persistence remains local and cannot enter gameplay/replay/network authority.
- Phase 3D-D can change 9–17-card field density independently of theme and shell organization.

## Verification

Phase 3D-C tests cover exact preference decoding/fallback, all three runtime selections, reload
persistence, one-canvas/48-CardView preservation, unchanged deck/state/selection, dialog focus and
critical-modal locks, compact public Yaku/history content, root and repository-prefixed builds, all
supported viewports, and zero browser/network errors.
