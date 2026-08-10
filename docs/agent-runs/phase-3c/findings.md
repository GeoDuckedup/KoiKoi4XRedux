# Phase 3C Findings

## F-3C-001 — Privileged multiplier distinction was absent from the DOM

- **Status:** verified
- **Severity:** high
- **Requirement:** `PRES-RESULT-008-PRIVILEGED-BANK-SPLIT`
- **Owner:** `3C-INTEGRATION`
- **Evidence:** `apps/web/src/main.ts`, result multiplier copy; focused presentation tests
- **Impact:** a privileged 1× table / 2× Bank could appear as arithmetic without explaining the
  distinct authoritative table and scoring multipliers.
- **Repair:** render both mapper-supplied multiplier labels beside the award arithmetic.
- **Verification:** focused tests, lint/typecheck, root/Pages screenshots, and independent re-review.

## F-3C-002 — Terminal totals could use the last round row instead of MatchResult

- **Status:** verified
- **Severity:** high
- **Requirement:** `PRES-RESULT-009-MATCH-COMPLETE-WINNER`, `PRES-RESULT-010-MATCH-COMPLETE-TIE`
- **Owner:** `3C-IMPLEMENT`
- **Evidence:** `apps/web/src/game/round-result-presentation.ts`; winner/tie final-score regressions
- **Impact:** a terminal screen could disagree with authoritative final match totals.
- **Repair:** copy `MatchResultV1.finalScores` for terminal presentation while retaining the current
  round deltas separately.
- **Verification:** focused winner/tie tests and independent re-review.

## F-3C-003 — Invalid null-next round result could fabricate a match shell

- **Status:** verified
- **Severity:** medium
- **Requirement:** `D-3C-002`, `PRES-RESULT-011-SAFE-PROJECTION`
- **Owner:** `3C-IMPLEMENT`
- **Evidence:** public-result mapper fail-closed regression
- **Impact:** presentation code derived a synthetic tied match when an invalid nonterminal public
  result omitted its next-round plan.
- **Repair:** return no presentation unless roundComplete has a public next plan or the phase carries
  an actual MatchResult.
- **Verification:** focused regression and independent re-review.

## F-3C-004 — Result containment wording exceeded the scrollable-page contract

- **Status:** verified
- **Severity:** medium
- **Requirement:** `PRES-RESULT-012-MODAL-LOCK`
- **Owner:** `3C-INTEGRATION`
- **Evidence:** seven-viewport root/Pages bounding-box assertions and screenshots
- **Impact:** the initial wording implied the entire dialog must fit the physical viewport even when
  the compact app intentionally scrolls vertically.
- **Repair:** lock and assert horizontal containment plus vertical scrollability inside the game
  frame/page, while keeping the result card inside its overlay.
- **Verification:** root and Pages seven-viewport browser gates.
