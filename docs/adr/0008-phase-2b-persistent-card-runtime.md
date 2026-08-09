# ADR 0008: Phase 2B persistent card and runtime-deck boundary

**Status:** Accepted

**Date:** August 9, 2026

## Decision

Keep authored deck packages and browser runtime decks as separate contracts. Authored packages may
reference immutable source files, inheritance, and normalized transforms. The browser consumes only
a portable `RuntimeDeckManifestV1`: one resolved face for every canonical `CardId`, one resolved
back, fixed ART_SPEC v1 geometry, local relative asset paths, provenance, and an explicit approval
status. Runtime validation rejects missing/unknown/duplicate cards, unsafe paths, invalid geometry,
unknown nested fields, inherited or accessor-backed objects, and sparse/decorated arrays. The web
runtime may import the portable deck-format entry point but never its Node authoring adapters.

Create exactly one persistent Pixi `CardView` for each canonical `CardId`. A view owns its container,
sprite, mask, frame, and stable diagnostic token. Responsive layout changes reparent and resize those
same objects; a deck change swaps their textures in place. The Phase 2A scene layers remain stable and
each layer keeps separate persistent card and redrawable chrome containers so chrome redraw cannot
destroy a card.

Load all 48 candidate faces and the back before activation. A successful activation atomically
changes every CardView to the complete candidate bundle. The former active bundle unloads only after
the views retarget successfully. A failed or superseded activation unloads candidate resources and
leaves the previously active package and all view identities unchanged.
Asset URLs resolve from Vite's configurable base path so root and GitHub Pages builds use the same
runtime.

Install two complete deterministic technical packages, `technical-sunrise` and
`technical-moonlight`, to exercise the contract and switching path. They are generated development
fixtures marked `technical-placeholder`, not approved art direction or final deck content. Their
48-card board allocation is a local presentation showcase only; it is not an authoritative match,
projection, replay record, or gameplay command source.

Deck selection remains local presentation state. It does not enter the engine, protocol, public
events, replay log, hashes, or multiplayer commands. Phase 2B does not add animation, card input,
gameplay commands, Workshop/importer behavior, or final-art approval.

## Consequences

- Browser code never interprets authoring transforms or filesystem source paths.
- Each canonical identity has one stable display object across layout, zone, face/back, and package
  changes.
- A partial package can never become visually active.
- Two players may select different visual packages while sharing identical authoritative state.
- Technical generated assets make runtime/deployment validation complete without falsely approving
  unfinished artwork.
- Phase 2C can animate the persistent objects, Phase 2D can make them interactive, and Phase 2E can
  build/approve authored packages without replacing this runtime boundary.
