# ADR 0030: Phase 5A formation evidence and local match progression

**Status:** Deployed, live-verified, and accepted for Phase 5A.

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
  independent Terra re-review found no blocker, high, or medium issue. Implementation commit `945c2a3`
  passed CI `31909040672` (`verify`, 19m40s) and Pages `31909040671` (`build`, 17m34s; deploy, 10s);
  both `npm run check` and `validate:phase5a` passed. The only hosted annotation was the nonblocking
  Node 20 GitHub Actions deprecation. A cache-busted live HTTP/2 200 MISS response, dated Sat, 15 Aug
  2026 21:35:36 GMT, served `assets/index-DQO4OPuh.js` with the expected result/schema markers. The
  loaded live browser was ready with one canvas, 48/48 unique CardViews, 24/0/8/8/8
  draw/reveal/player-Hand/opponent-Hand/field counts, match length 3, idle input, no locks, no layout
  diagnostics, and an inspected `output/phase-5a/live-ready/shot-2.png`; no error artifact was
  produced. Phase 5A is deployed, live-verified, and accepted. Phase 5B local persistence is next.
