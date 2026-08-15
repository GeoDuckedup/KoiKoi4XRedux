# ADR 0030: Phase 5A formation evidence and local match progression

**Status:** Locally accepted for Phase 5A; release/deployment evidence pending.

## Context

Phase 5A adds real 3-, 6-, and 12-round local matches, per-round advancement, final match results,
rematches, and expandable end-of-play evidence. A result must be able to show the exact cards that
qualified each scored ordinary Yaku without asking the browser to re-evaluate a later capture set.
That later set can include cards from subsequent captures and cannot establish the chronology in which
the Yaku first formed.

## Decision

- The deterministic engine records each ordinary-Yaku trigger at the exact Hand or Draw check where
  it first forms. The record has a round-global sequence, player, phase, canonical Yaku row, and
  canonical-order contributing CardIds.
- A scored ordinary round result carries public `ordinaryYaku` evidence: the formation chronology plus
  the final scored rows linked to it. Rows are ordered by formation sequence. A card may deliberately
  repeat in different rows when it contributes to more than one Yaku.
- The public observation, replay, and protocol validation schema are revised before Phase 5B so this
  evidence is validated, replayable, and recipient-safe at the same boundary as other public result
  facts. No persisted-save compatibility is implied before Phase 5B.
- The browser is render-only for formation evidence, points, progression, winner, and rematch state.
  It renders the public result projection and sends the real advance/rematch intent; it never derives
  qualifying cards or match outcomes from card presentation state.
- Local formats progress through the actual 3/6/12 schedule. A nonfinal result advances to the real
  next round and preserves authoritative history; a completed match offers a real rematch with a new
  match state. Result presentation remains concise first (winner/outcome, Yaku count, multiplier,
  award, and next action), with chronology, card galleries, repetitions, and arithmetic behind a
  closed details disclosure.

## Consequences

- Result details are explainable, deterministic, and truthful even when later captures overlap a
  previously formed Yaku.
- Public replay/projection consumers must accept the revision before Phase 5B persistence begins.
- Browser tests must reach results through production commands; they may not inject a result or an
  artificial match state solely to render the details UI.
- Local verification passed `npm run check` (52 files / 489 ordinary tests, all 10,002 deterministic
  seeds, deck validation, and a 778-module build) and the final single `validate:phase5a` gate (48/48
  release deck, 100 technical artifacts, 17 files / 243 focused tests, Workshop, 14-viewport density,
  and full Root/Pages smoke). The compact/expanded portrait/landscape result artifacts were inspected;
  independent Terra re-review found no blocker, high, or medium issue. Hosted CI/Pages, deployment,
  and live evidence remain separate release obligations.
