# ADR 0002: Phase 0D deck authoring boundary

**Status:** Accepted

**Date:** August 8, 2026

## Decision

Create `@koikoi4x/deck-format` as a dedicated authoring-format package that depends inward on the
engine's canonical `CardId` catalog. Keep its schemas, runtime validation, inheritance/provenance,
Art Spec constants, and transform math portable. Isolate filesystem inspection, source hashing,
technical-pilot seeding, generated artifacts, and CLI behavior in Node-specific adapters.

Require every release package to resolve exactly all 48 canonical cards and a default card back.
Allow the primary Phase 0D skeleton to declare the complete logical mapping while development source
validation reads only the four representative technical pilots. Full source coverage, final visual
approval, derivatives, contact sheets, runtime selection, and the Deck Workshop remain Phase 2 work.

Generate the JSON Schemas, SVG Art Guide, and digest-bearing pilot import plan from the same locked
constants and resolver used by validation. Source files are read-only inputs; generated output never
overwrites `source/`.

## Consequences

- Canonical game identity remains artwork-independent and the engine cannot import deck-format.
- Package inheritance is deterministic root-to-child, cycle-checked, and provenance-preserving.
- Changing a child source retains an inherited transform unless the child explicitly supplies an
  Auto or Manual transform; an explicit Auto transform is therefore the reset mechanism.
- `npm run validate:decks` is suitable for the Phase 0D development gate and intentionally warns
  about the other 44 pending sources.
- Release validation is intentionally blocked until the complete source set and Phase 2 pilot
  approval exist.
- The checked-in pilot raster files demonstrate technical processability only and carry no visual
  design approval.
