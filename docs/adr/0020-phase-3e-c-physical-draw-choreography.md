# ADR 0020 — Phase 3E-C physical Draw choreography

**Status:** Accepted

## Context

Phase 3E-B makes every Draw an authoritative two-step flow: the engine reveals one card, publishes
its public resolution preview, and waits for the active player to resolve it. Owner playtesting also
requires that the visual card visibly leave the **top** of the deck and arrive in Reveal before the
player acts.

The recipient projection intentionally uses stable synthetic identities for face-down opponent and
draw-pile cards. It cannot know the future top card before `drawCardRevealed` without leaking draw
order.

## Decision

- The presentation derives one geometry-only `drawPileTopBounds` from the current face-down pile.
  It does not reveal or persist a deck-card identity.
- Once the authoritative public `drawCardRevealed` event exists, the existing recipient-safe
  projection may temporarily place that now-public card at the pile source, face-down.
- Exactly that one CardView travels from the pile top to Reveal, lifts slightly during travel, flips
  there, and pauses for identification before interaction is refreshed.
- Hidden pile allocation changes are not animated. Remaining face-down backs stay in the pile.
- Normal, Fast, Instant, and reduced-motion modes all settle to the same public pending Draw state.
  Only the settled state exposes the single Reveal control; the later resolution still uses the
  engine-owned legal action and preview from ADR 0019.
- This remains a presentation-only decision. It changes no engine state, command, replay payload,
  projection schema, deck order, or browser rules calculation.

## Consequences

- The browser retains one canvas and the existing 48 persistent CardViews rather than creating a
  separate fake-card renderer.
- `render_game_to_text` continues to omit every face-down CardId. It can describe only the
  already-authoritative revealed card after the motion settles.
- Unit and browser traces must prove the top source, one-card travel, face-down travel, flip/pause,
  post-pause accessibility, and root/Pages parity.
