# New Primary Deck — Phase 0D skeleton

`deck.json` reserves one immutable source path for every canonical CardId. Phase 0D includes only four
technical pipeline placeholders plus a technical card back; they are not finished or visually
approved artwork.

The four pilot roles are locked in `pilot.json`. Replace each pilot placeholder with an owner-approved
`1600 × 2560` master at the same path, then regenerate and validate. Do not overwrite source files as
part of importing, fitting, or derivative generation. Authoring tools must write only to `generated/`.

The other 44 paths intentionally remain unpopulated until the four-card pilot is reviewed through the
Phase 2 Workshop and `390 × 844` board. Development validation checks the four pilot sources; release
validation checks all 48 and must fail until the finished package is complete and approved.
