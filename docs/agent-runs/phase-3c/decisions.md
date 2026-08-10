# Phase 3C Decisions

## D-3C-001 — Operational ledger adopted

**Status:** accepted for Phase 3C planning.

Phase 3C will use the workstream, finding, and evidence-maturity records in this directory. The
ledger tracks decisions and observable evidence only; it does not store private reasoning or replace
the governing workflow.

## D-3C-002 — Public result authority

**Status:** accepted.

Presentation consumes only `PlayerObservationV1.publicState.phase`, the latest public history row,
and projected public events. It may map authoritative enums to fixed explanatory copy, but it may
not recalculate scoring, Yaku, starter policy, privilege, evidence visibility, or match outcome.

## D-3C-003 — Presentation-only transition shell

**Status:** accepted after Sol reconciled the engine and UX investigations.

Phase 3C displays the authoritative `nextRound` month, starter, starter reason, and privilege, then
offers `Start another local round`. It does not call `advanceRound`, expose the checkpoint, or call
the deterministic January reset “February.” Actual multi-round local execution remains Phase 5.

## D-3C-004 — Acceptance and browser evidence

**Status:** accepted.

Twelve frozen `PRES-RESULT-*` contracts cover Bank, End of Play, no-score, automatic evidence,
starter/privilege consequences, match completion, safe projection, and modal locking. The production
seed supplies real Bank and final-Draw Koi-Koi browser result paths without a shipped state injector.
