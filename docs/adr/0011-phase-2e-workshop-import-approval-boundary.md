# ADR 0011: Phase 2E Workshop, import, and approval boundary

- **Status:** accepted
- **Date:** 2026-08-09

## Context

Deck authors need a practical 48-card import/editor workflow, deterministic runtime derivatives,
and review artifacts. The game client must not gain filesystem access, Node image dependencies, raw
source art, or a way to turn incomplete technical placeholders into an approved release package.
Visual approval also contains an owner judgment that cannot be inferred from a passing build.

## Decision

1. ART_SPEC geometry, normalized transforms, Workshop state, contact-sheet plans, and approval-record
   validation are portable `@koikoi4x/deck-format` contracts.
2. Image decode, EXIF orientation, Sharp processing, source hashing, atomic file writes, package
   builds, and local workspace inspection stay in the package's explicit Node adapter.
3. Source files are immutable. An upload is validated, content-hashed, written under a digest-named
   path, and then assigned in package metadata. Transform saves replace only `transforms.json`.
4. A development build may process an incomplete package and generate visibly incomplete 48-slot
   review sheets. It emits a runtime manifest only after all 48 canonical faces and one back exist.
5. The Deck Workshop is a separate local-development Vite entry. Its exact package/card API is
   protected by a per-process session token and never exists in the normal production build.
6. Release approval requires a strict versioned owner record containing the approver, real date,
   review note, exact current art-review and gameplay-review SHA-256 digests, the exact four pilot
   CardIds, and the locked 390×844 board viewport. The pilot metadata must separately be marked
   approved. Automation validates this evidence but cannot create or self-approve it.
7. Technical acceptance and release acceptance are separate commands. CI may run the technical gate
   while finished art is absent; the release gate must fail until the art and owner evidence are
   complete and current.

## Consequences

- The normal browser imports neither Sharp nor Node/filesystem authoring adapters and receives no
  source paths, transform documents, approval record, or local write endpoint.
- Identical source bytes and transforms produce identical derivatives and contact sheets.
- Replacing art invalidates digest-bound approval automatically.
- Incomplete packages remain useful for process testing without being mislabeled as release-ready.
- Phase 3 cannot claim the visually mature one-round slice until the Phase 2E owner gate passes.

## Rejected alternatives

- Shipping the Workshop in Pages: rejected because it creates a misleading and unnecessary
  production authoring surface.
- Letting the browser resolve source transforms: rejected because runtime packages must be complete,
  portable, and free of Node authoring behavior.
- Overwriting source files in place: rejected because it breaks provenance and reproducibility.
- Treating a green technical build as visual approval: rejected because visual quality and licensed
  source acceptance are explicit owner decisions.
