# ADR 0005: Phase 1C yaku evaluation and trigger boundaries

**Status:** Accepted

**Date:** August 8, 2026

## Decision

Represent yaku with a closed 13-key union and evaluate one player's public captured cards through a
pure deterministic function. The evaluator returns every active yaku in canonical Rules-table order,
the summed current total, category counts, and the active entries whose keys are absent from that
player's seen-trigger history.

Only one Bright tier may be active: Five Brights, Four Brights with Rain, Four Brights without Rain,
or Three Brights without Rain. A higher tier replaces the lower active entry while the lower key
remains seen. All non-Bright yaku stack independently. Current-Month Set is derived from all four
captured cards whose month equals the scheduled month; it is not tied to one capture action.

After every successful Hand or Draw resolution, recompute the actor's active snapshot. Append all new
keys atomically and emit one combined `awaitingYakuDecision` context containing those new entries,
the complete active list and total, the capture phase, and a deterministic continuation marker. A
Hand trigger pauses before draw reveal. A Draw trigger pauses before turn completion. A final-Draw
trigger pauses before End of Play with an `endOfPlay` continuation marker.

Record the first yaku-triggering player only when the first nonempty unseen-key set is committed.
Emit public semantic events for each newly completed yaku, seen incremental value changes, and the
combined decision. These payloads may contain only information derived from already-public captures.

Do not add a Bank/Koi-Koi command or decision legal actions in Phase 1C. Phase 1D owns option
availability, forced-Koi and privilege rules, multiplier effects, scoring, and execution of the saved
continuation marker.

## Consequences

- Equal captures, scheduled month, and seen keys produce byte-identical immutable evaluation.
- Player state carries typed seen keys, the complete current active snapshot, and its exact sum.
- Authoritative validation can recompute active scoring and prove that a saved decision contains the
  exact key suffix appended by its triggering capture phase.
- Several yaku completed by one Hand or Draw capture create one decision, while different Hand and
  Draw triggers can create separate decisions in the same turn once Phase 1D resumes play.
- Incrementing a previously seen Animals, Scrolls, or Plain Cards value emits a public value change
  but does not retrigger a decision.
- Final-draw Bank/Koi-Koi remains possible because End of Play is deferred behind the decision
  context rather than committed early.
- The browser boot surface remains unchanged until a later presentation phase consumes these domain
  transitions.
