# ADR 0014: Phase 3C Round-Result Presentation Boundary

**Status:** Accepted  
**Date:** August 9, 2026

## Context

The engine already commits complete public `RoundResultV1` and `MatchResultV1` values, including
reason codes, score arithmetic, committed evidence, next-round starter/privilege, totals, and public
history. Phase 3B displays the immediate Bank/Koi-Koi consequence but intentionally leaves the
dedicated result experience to Phase 3C.

The engine also has an authoritative checkpoint-owning `advanceRound` seam. Calling it from the
current browser would create actual multi-round local play and require a new-deal privacy handoff,
while Phase 5 owns full local match formats, persistence, recap, and rematch.

## Decision

- Add a pure browser presentation mapper over completed `PlayerObservationV1` public state/history
  and projected public events. It may format supplied values and map enums to fixed copy; it may not
  evaluate Yaku, multiply/recompute score, derive starter/privilege, or infer evidence.
- Present one accessible modal after physical card motion and Phase 3B consequence feedback settle.
  The modal contains the public result, exact arithmetic, score deltas/totals, committed evidence,
  next-round consequence, or final match outcome.
- Use a short CSS/DOM score-settlement beat whose final state is identical in Normal, Fast, Instant,
  and Reduced Motion. Critical result information remains textual.
- Lock all unrelated card and application controls while the result is open and move focus to its
  explicit action only after the result beat.
- Show the authoritative `nextRound` plan when present, but keep Phase 3C's action explicitly
  `Start another local round`. The action resets the one-round local slice; it does not call
  `advanceRound` and is not labeled as beginning the displayed next scheduled month.
- Do not ship a result-state injector. Pure tests cover automatic/final variants; production-seed
  browser traces cover real Bank and final-Draw Koi-Koi results.

## Consequences

- Result presentation remains deterministic, recipient-safe, and rule-free.
- Phase 3 becomes a complete one-round vertical slice with a finished result experience.
- Phase 5 retains actual 3/6/12-round execution, new-deal handoff, persistence, full-match recap,
  and rematch ownership.
- A future online service may advance immediately after commit while clients independently present
  the same public result; Phase 3C does not settle the pending asynchronous-acknowledgement policy.
