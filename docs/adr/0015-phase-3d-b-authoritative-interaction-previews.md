# ADR 0015: Phase 3D-B authoritative interaction previews

**Status:** Accepted

**Date:** 2026-08-10

## Context

Engine Hand actions historically named a field target only when exactly two same-month cards
required a choice. Unique captures and four-card sweeps were target-free because the player did not
choose their outcome. That command contract was correct, but the browser could not truthfully show
which public cards would be captured. A no-match card also lacked an obvious field-placement tap
surface.

Recomputing same-month matches in `apps/web` would violate package ownership: the web app may
present legal state but may not own canonical capture rules.

## Decision

Every engine-generated `playHandCard` legal action carries one frozen
`HandPlayResolutionPreviewV1`:

- `placeOnField` with zero matching field IDs;
- `capturePair` with one matching field ID;
- `captureChoice` with two matching field IDs;
- `fourCardSweep` with three matching field IDs.

The preview is produced next to the engine's existing capture inspection and contains only public
field CardIds. It explains an action; it is not part of the gameplay command and callers cannot
supply it back as authority.

The web input controller validates the preview against the public field, phase, actor, and complete
legal-action set. For defense in depth it calls the engine-owned public-field preview helper and
requires an exact ordered match; the web does not reproduce that rule. It may then render
selection/highlight/placement cues, but it emits only an existing action:

- a no-match field tap, unique-pair target tap, or sweep target tap submits the existing target-free
  action;
- an exact-two target tap submits the one existing legal action bearing that target;
- Guided keeps Confirm/Cancel and semantic controls; Fast remains immediate for unambiguous Hand
  actions but never skips exact-two choice;
- accepted input remains locked until a strictly newer observation.

Field coordinates are presentation-only. A no-match tap does not choose a strategic position.

## Consequences

- The UI can provide the owner-requested select → highlight → tap behavior without a duplicate rules
  engine.
- Legal-action payloads grow slightly, but the added data is public, deterministic, immutable, and
  directly testable.
- Draw capture remains unchanged because its authoritative phase already exposes the revealed card
  and exact two targets.
- Phase 3D-C can restyle and reorganize these controls without changing authority.
- Phase 3D-D can replace overflow fanning with shrink-to-fit layout without changing the preview or
  command contract.

## Verification

`TABLE-INPUT-001` through `TABLE-INPUT-007` cover the four preview shapes, Guided/Fast behavior,
semantic labels, emitted intent shape, and malformed-source rejection. Production root and
repository-prefixed browser traces execute a real Guided no-match placement and unique capture at
390×844 while preserving all prior viewport, Yaku, result, privacy, and browser-error gates.
