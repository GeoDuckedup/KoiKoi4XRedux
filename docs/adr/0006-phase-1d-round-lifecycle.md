# ADR 0006: Phase 1D round-result and advancement lifecycle

**Status:** Accepted

**Date:** August 8, 2026

## Decision

Resolve each Bank/Koi-Koi choice through one typed `chooseYakuDecision` command. Legal actions expose
only executable options for the decision actor, in Bank-then-Koi-Koi order, and omit Bank when the
frozen final-round leader must call. The saved Phase 1C continuation remains authoritative: Hand
Koi-Koi resumes Draw, ordinary Draw Koi-Koi completes the turn, and final-Draw Koi-Koi immediately
resolves End of Play.

Represent every completed scheduled month with one typed immutable `RoundResultV1` history entry.
The entry contains its canonical reason code, point deltas, applicable active yaku and arithmetic,
automatic public evidence, match scores after the result, and either the exact next-round starter
and privilege plan or `null` after the final month. Bank and natural End of Play commit the result,
history, score, and `roundComplete`/`matchComplete` phase in the accepted gameplay command.

Keep result commitment separate from the next deal. A system-level `advanceRound` command accepts
the completed authoritative state plus the external engine checkpoint, validates both state and
command before restoring randomness, shuffles/deals the next scheduled month, and returns the next
checkpoint. An ordered-deck sibling exists for deterministic fixtures. Neither authoritative state
nor public/private events contain RNG state.

Opening cancellation and lucky outcomes use the same durable result/history contract. The setup
layer's already-applied lucky points are normalized into history without a second award. Automatic
outcomes in later months commit immediately after the deal; a final-month automatic outcome enters
`matchComplete` and never creates a replacement round.

## Consequences

- Every accepted gameplay or round-advance command increments `stateVersion` exactly once.
- Bank after Hand skips Draw; Koi-Koi executes the saved continuation without an intermediate
  authoritative commit.
- The visible table progresses 1→2→3→4→4 and always records the latest caller. Privileged Bank
  records visible 1× and scoring 2×; privileged Koi-Koi moves the actual table directly 1×→3×.
- Natural End of Play is no longer a dead-end client phase. The final card command, or a final-Draw
  Koi-Koi command, commits the caller/no-caller result directly.
- New-round setup resets hands, captures, yaku history, table/caller/trigger state, and final-leader
  identity while retaining cumulative scores and durable history.
- Initial hands remain player-private and draw ordering remains server-only for every new deal.
- Formal projections, command-log replay, hashes, and durable service idempotency remain Phase 1E.
