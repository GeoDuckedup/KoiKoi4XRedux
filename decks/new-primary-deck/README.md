# New Primary Deck — Phase 0D skeleton

`deck.json` reserves one immutable source path for every canonical CardId. The current mapping uses
four original AI-generated pilot candidates plus a matching card back. They are normalized to the
preferred 1600 × 2560 master geometry, but they are not owner-approved artwork.

The four pilot roles are locked in `pilot.json`. Review the current immutable digest-named sources
through both contact sheets and the real `390 × 844` board. If revisions are requested, import new
siblings rather than overwriting existing sources. Authoring tools write derivatives only to
`generated/`.

The other 44 paths intentionally remain unpopulated until the four-card pilot is reviewed through the
Phase 2 Workshop and `390 × 844` board. Development validation checks the four pilot sources; release
validation checks all 48 and must fail until the finished package is complete and explicitly
approved. See `PILOT_CANDIDATE_V1.md` for the art direction, provenance, and prompt set.
