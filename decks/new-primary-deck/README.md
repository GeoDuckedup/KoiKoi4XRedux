# New Primary Deck v1.0.0 — owner-approved

`deck.json` maps every canonical CardId to one immutable digest-named source. The current mapping
uses 48 original AI-generated faces plus a matching card back, all normalized to the preferred
1600 × 2560 master geometry.

The owner approved Pilot Candidate V1 on August 9, 2026, unlocking bulk production. The four pilot
roles remain locked in `pilot.json`; the complete bulk provenance and prompt ledger is recorded in
`BULK_CANDIDATE_V1.md`. If revisions are requested, import new siblings rather than overwriting an
existing source. Authoring tools write derivatives only to `generated/`.

The owner approved the complete 48-card art-review sheet, gameplay-size sheet, corrected July Bush
Clover Plain B, and representative board layouts on August 9, 2026. `approval.json` binds that
decision to platform-independent semantic digests of the exact sources, transforms, back, art
specification, and review-sheet plans; strict release validation passes on macOS and Linux.
