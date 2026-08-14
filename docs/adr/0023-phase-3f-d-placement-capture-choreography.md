# ADR 0023 — Phase 3F-D placement and capture choreography

**Status:** Accepted, deployed, and live-verified

## Context

Playtesting found that a no-match source could appear to cross an unrelated field card, while Hand
and Draw captures lacked one consistent physical language. The Draw-resolution preview also created
an unnecessary movement cue before the player had acted on Reveal.

## Decision

- Keep game, projection, and input authority unchanged. Presentation reads anchor data only from the
  public `captureStarted.targetFieldCardIds` event.
- A pair or exact-two source travels onto the first supplied target with a small offset, holds for
  180ms, then the capture group collects. A three-target sweep uses its first supplied target only
  as the anchor; all targets remain spatially fixed until collection.
- Draw uses the same pattern only after its Reveal action. `drawResolutionRequired` creates no
  generic alignment, pulse, or target movement.
- A no-match action first reflows existing field cards to prepare its final automatic slot. The source
  then travels directly into that opening; it never crosses an unrelated field card.
- A selected no-match source receives a stronger temporary field outline and compact `PLACE HERE`
  badge beside the FIELD header. There are no idle placeholders or labels over card art.

## Consequences

- Clip-level immutable overlap metadata is resolved against the current board layout; no logical
  zones, capture legality, or hidden state are inferred in Pixi.
- The existing 48 persistent CardViews, dense field, recipient-safe projections, one canvas, and
  reduced-motion final projection remain unchanged.
- Browser evidence must show a live no-match travel and Hand pair hold at root and Pages bases. Unit
  evidence covers Hand/Draw 0/1/2/3 resolution families and no pre-Reveal movement.

## Owner verification and deployment steps

1. Local validation completed: `npm run check` passed format/lint/typecheck/decks, 46 files / 442
   tests, all 10,002 generated seeds, and the production build. One final `npm run validate:phase3fd`
   invocation passed the approved 48/48 release deck, 100 technical artifacts, 77 focused tests,
   Workshop, the 14-viewport density review, and root/Pages smoke. Release commit `108fb05` then
   passed CI run `31844698117` (`verify`, 9m04s) and Pages run `31844698124` (`build`, 11m33s;
   `deploy`, 9s). No secret, hosting, migration, or asset action was needed.
2. Play a no-match Hand card: existing field cards should first make room, then the source should go
   straight to that open field position. The temporary `PLACE HERE` cue should disappear after action.
3. Play a pair from Hand and resolve a pair from Reveal: in both cases the source should briefly sit
   offset on the matched field card before both cards collect. A sweep may use one matched card as
   its anchor while all three are otherwise still.
4. At the Reveal pause, do not tap the card. The field should not pulse or move. Then tap Reveal and
   verify the capture choreography begins.

## Next subphase

**Phase 3F-E utility dock and capture cleanup**, followed by Phase 5A full local match formats and
expanded ordered yaku-card evidence once the visual shell is accepted.
