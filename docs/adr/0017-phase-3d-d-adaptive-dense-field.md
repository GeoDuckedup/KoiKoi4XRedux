# ADR 0017: Phase 3D-D adaptive dense field

**Status:** Accepted
**Date:** 2026-08-11

## Context

The production table had eight fixed field slots. A ninth or later public field card reused those
slots with a diagonal fan, which obscured identities and made direct matching less reliable. The
legal game can reach seventeen field cards: an eight-card opening can occupy only three months,
then one no-match play can add a card from each of the nine initially absent months.

The owner requires every legal field card to remain individually visible and directly selectable.
This work must not change gameplay authority, public/private projections, CardView identity, or the
approved Phase 3D-A/C themes.

## Decision

- Counts zero through eight retain the familiar fixed four-column/two-row presentation.
- Counts nine through seventeen use a deterministic public-count-driven grid inside the existing
  field content bounds. Candidate grids use at least two rows; the selected grid maximizes 5:8 card
  width, then minimizes empty cells, then prefers fewer rows. The last row is centered.
- Field order is the exact public `round.field` order. Recipient projection normalization preserves
  that order, and resizing or theme switching changes geometry only.
- The layout fails closed above the derived legal seventeen-card bound and exports versioned public
  diagnostics through `render_game_to_text`.
- Dense field targets use deterministic, non-overlapping card-cell territories. Hand controls
  retain the 44px minimum. At the legal seventeen-card boundary, field targets retain at least
  24×36px across all supported viewports plus complete roving-keyboard/Enter/Escape operation.
  The smaller dense-field exception is intentional: overlapping 44px buttons could activate a
  different card from the one visibly selected.
- Placement/capture motion and density reflow are distinct clips. The direct card movement does not
  commit the target projection; the following reflow settles the projection so unrelated field
  cards do not jump before the direct action completes.
- The seventeen-card browser fixture is a separate Vite entry and output directory used only by
  `review:phase3dd`. It is not an input, route, query flag, or global mutation seam in the normal
  root/Pages production build.

## Consequences

- Legal 8/9/12/17-card fields are contained, non-overlapping, deterministic, and retain persistent
  CardViews at every supported viewport.
- Dense short-landscape cards are necessarily small, but pointer targets cannot overlap and the
  keyboard path remains complete.
- Pixi remains presentation-only. Grid count/order comes from the public projection, while matching
  legality and target membership remain engine/observation owned.
- The isolated harness adds a review build but does not increase the deployed application surface.
