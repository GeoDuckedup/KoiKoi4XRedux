# ADR 0033: Phase 6B deterministic difficulty and public explanations

**Status:** Deployed, live-verified, and accepted.

## Context

Phase 6A provides a fair deterministic player-B CPU that selects an already-issued legal action from
its private player observation. The next product increment needs selectable difficulty, useful concise
explanations, and score-aware strategy without weakening that privacy boundary or pulling Phase 6C
rollout work forward.

## Decision

- Phase 6B adds Easy, Standard (default), and Hard as deterministic configurations of the existing
  fair heuristic. Personality remains independent: a difficult Timid remains cautious and a difficult
  Gambler remains aggressive.
- Difficulty may change only public context weighting over score lead/deficit, round/final-round
  position, table multiplier, scheduled month, and already-issued legal-action facts. It may not use
  RNG/noise, clocks, hidden-card determinization, search, rollouts, opponent modeling, or
  authoritative-state input.
- A CPU decision retains one exact offered `LegalActionV1` and adds one canonical reason token:
  `secureLead`, `completeYaku`, `denyVisibleThreat`, `strongFuturePotential`,
  `multiplierPressure`, or `comebackRisk`. Its confidence is finite and inclusive `[0,1]`; the UI maps
  it to a compact confidence band.
- Explanation data shown to player A is public-safe. It is produced only after the associated command
  has been accepted and its existing public-event animation settles, and is reproducible from player
  A's public observation plus the now-public action/events. It does not reveal private CPU-hand
  support, candidate scores/ranking, hidden-card hypotheses, command IDs, checkpoints, RNG, or
  chain-of-thought. During CPU thinking no action, reason, or confidence is rendered or exposed to
  accessible text/diagnostic state.
- CPU configuration and latest explanation remain session-only. Phase 6B neither creates nor mutates
  the Phase 5B active local save and changes no engine, protocol, rules, replay, Firebase, or online
  contract.
- Phase 6C retains hidden-card determinization, seeded variation, rollout/search, simulation tuning,
  and richer opponent modeling.

## Consequences

- `AI-6B-001` through `AI-6B-007` define deterministic legal decisions, difficulty/personality
  separation, public match context, bounded explanation data, hidden-hand invariance, session-only
  runtime behavior, and Root/Pages accessibility/privacy.
- The Phase 6A release gate remains mandatory. Phase 6B adds 1,080 complete fixed trials: three
  personalities × Easy/Standard/Hard × 3/6/12 formats × 40 seeds, split into four bounded
  270-trial shards. The gate must prove zero illegal/no-action outcomes, invariant-valid completion,
  populated cells, fixed-matrix personality direction, and documented difficulty behavior.
- Root and Pages acceptance must preserve CPU-thinking redaction, standard public-event animation,
  player-A-only rendering, unchanged Phase 5B save, one canvas/48 CardViews, accessibility, and
  explicit landscape Options bounds/lower-action access. Artifacts belong under
  `output/phase-6b/e2e/`.

## Release status

Local implementation and evidence are accepted. `npm run check` passed 59 files / 539 ordinary tests,
10,002 seeded matches, the 48/48 release deck, and the 783-module build. The uninterrupted final
`npm run validate:phase6b` exited 0 with 17 inherited focused files / 247 tests, Workshop, 14 density
viewports, full retained Root/Pages Phase 5A, 3 persistence files / 38 tests plus dedicated Root/Pages,
2 Phase 6A focused files / 22 tests, 360 generated trials, Phase 6A Root/Pages, 3 Phase 6B focused
files / 25 tests, 1,080 generated trials, and Phase 6B Root/Pages. All 26 Phase 6B PNGs were visually
inspected; CPU-thinking explanation privacy was checked at every substep, and the post-settlement
portrait/landscape banner is compact. Independent review was B0/H0. A late-suite initial-navigation
flake was repaired narrowly with navigation `commit` plus the retained app-ready assertion, then
revalidated.

Implementation commit `2a84ce143db29f9172590419f9b9492a22dbe643` passed CI `31958387075`: verify
16:21:54–16:59:41Z (37m47s), check 16:22:38–16:28:14Z (5m36s), validation
16:28:14–16:59:38Z (31m24s), and artifact upload 16:59:38–16:59:39Z; only a Node 20 action
deprecation was reported. Pages `31958387069` passed build 16:21:54–16:52:24Z, check
16:22:32–16:27:50Z, validation 16:27:50–16:52:18Z, deploy job 16:52:29–16:52:39Z, and Deploy
16:52:31–16:52:37Z. The live HTTP/2 response was 200 MISS with `Last-Modified: 16:52:34Z`,
`index-WMa9jsmo.js`, `index-D3Qe8KIR.css`, and exact difficulty/reason markers. Live Playwright
verified Standard default and CPU Hard/Monk through real 3-round no-match Hand/Draw play into CPU
settlement: `{mode:cpu,cpuDifficulty:hard,cpuPersonality:monk,cpuDecision:{reason:denyVisibleThreat,confidence:measured},cpuTurnState:idle}`
and `Claims a visible threat · Measured`, with zero console errors; it inspected
`output/playwright/phase6b-live-monk-hard-390x844.png`. Phase 6C is next.
