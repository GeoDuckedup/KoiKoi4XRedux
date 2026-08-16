# ADR 0031: Phase 5B local persistence boundary

**Status:** Deployed, live-verified, and accepted.

## Context

Phase 5A established authoritative local 3/6/12-round progression, result evidence, and real
rematches. Phase 5B must let a local match continue after reload without moving authority into the
browser, leaking private state, or treating a visual/tween state as durable game state.

## Decision

- Phase 5B has one active IndexedDB save and produces only `mode: "local"`. CPU, practice, online,
  Firebase, and legacy-save compatibility are not implementation scope. The `LocalSaveV1` union is
  retained for future modes, but no command log is persisted in this phase.
- A save is a private authoritative state plus its engine checkpoint/RNG and required version,
  identity, and timestamp metadata. It excludes presentation state: CardViews, coordinates, tween
  progress, dialogs, selections, audio, textures, network state, and command logs.
- The decode boundary is strict and versioned. It accepts only the exact supported `LocalSaveV1` and
  nested state/checkpoint schemas, matching state/checkpoint identity, and valid authoritative
  invariants. Extra, missing, malformed, corrupt, mismatched, old, and future data are rejected.
  Phase 5B deliberately performs no migration.
- Only stable authority phases (`awaitingHandPlay`, `awaitingDrawResolution`,
  `awaitingYakuDecision`, `roundComplete`, and `matchComplete`) can be saved, and only after their
  public presentation has settled. Writes are serialized, coalesced, and monotonic. The completed
  match remains the active save until replacement or deletion.
- A valid active save offers Continue/Delete. Corrupt recovery is atomic and offers Delete, Start
  New, and an explicit sanitized diagnostic export. Storage denial/failure retains the live match
  with a visible session-only warning and never claims durability.
- Resume derives the active viewer and privacy/Ready cover from restored authority. No raw save,
  private hand, draw order, RNG, checkpoint, or command data can enter DOM, text diagnostics, logs,
  or default diagnostic export before that gate opens.

## Consequences

- Runtime restore must be deterministic with uninterrupted play after the same legal commands, and
  must not replay a command, score, result action, animation, or handoff.
- Browser acceptance must cover decision, result/progression, rematch, private handoff, animation
  settlement, corrupt recovery, storage failure, and accessible Root/Pages controls.
- `SAVE-5B-001` through `SAVE-5B-009` and `npm run validate:phase5b` are the release contract.
  Root/Pages artifacts belong under `output/phase-5b/e2e/`.

## Local acceptance evidence

- `npm run check` passed 54 files / 513 ordinary tests, all 10,002 generated seeds (3/6/12 = 3,334
  each), 48/48 deck validation, and the 781-module production build.
- The final uninterrupted `npm run validate:phase5b` exited 0 with the 48/48 release deck, 100
  technical artifacts, 17 Phase 5A focused files / 247 tests, Workshop, 14 Root/Pages Phase-3D-D
  viewports, retained Root/Pages interaction/progression smoke, 3 persistence focused files / 38
  tests, and dedicated Root plus Pages persistence smoke. The persistence suite wrote 18 artifacts,
  nine per base.
- Browser evidence covers strict autosave/decode/RNG provenance; Continue plus private Ready;
  corrupt Download/Delete/Start New; decision, round-complete, and match-complete/rematch resume;
  IndexedDB open denial and write conflict. The Pages click-readiness harness repair did not weaken
  product assertions. A transient density-harness readiness timeout passed an isolated rerun and the
  final uninterrupted gate. Independent Terra review found no blocker, high, or medium issue.
- Implementation commit `e10edba` and workflow-budget commit `b8ac977` deployed this boundary.
  Initial CI `31917983898` was canceled solely by the inherited 30-minute cap after `check` passed.
  The two job budgets increased to 60 minutes without changing tests. Replacement CI `31919222493`
  passed verify 01:17:17–01:51:51 UTC (34m34s), check 01:17:52–01:23:20, validation
  01:23:20–01:51:48, and artifact upload; Pages `31919222489` passed build 01:17:37–01:52:44 UTC,
  validation 01:23:58–01:52:36, and deploy 01:52:48–01:52:56.
- Live cache-busted HTTP/2 was 200 MISS, `Last-Modified: Sun, 16 Aug 2026 01:52:53 GMT`, with
  `index-CSmLy86o.js` / `index-DRn1Xu7z.css` and expected persistence markers. Three fresh live
  iterations were ready with one canvas, 48 unique CardViews, 24/8/8/8 zones, idle unlocked 16
  semantic controls, approved deck, and available idle persistence with `lastSavedAt` and round/month
  1. The clean live `shot-2` was inspected.
