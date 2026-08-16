# ADR 0034: Phase 6C observation-only belief rollouts

**Status:** Deployed, live-verified, and accepted.

## Context

Phase 6B provides a fair CPU that receives only `PlayerObservationV1` and returns an exact action
already offered by that observation. Phase 6C needs difficulty-scaled lookahead and tuning evidence.
The observation deliberately omits authoritative formation chronology, private seen-yaku history,
the opponent hand, and draw order, so a complete authoritative game state cannot be reconstructed
from it safely or truthfully.

## Decision

- The rollout selector remains a non-authoritative, observation-only belief evaluator. It samples the
  unseen-card complement into plausible private-card/draw hypotheses consistent with public counts,
  but it never accepts live `AuthoritativeGameStateV1`, reconstructs authority, or decides legality.
- Candidate roots are exact members of `observation.legalActions`. Abstract capture lookahead may
  estimate future month/category/yaku opportunity and opponent pressure, but only the existing engine
  command path can execute the selected offered action. This limitation is explicit: these are belief
  rollouts, not complete engine match simulations.
- Fixed budgets are Easy 4 samples/1 capture ply, Standard 12/2, and Hard 24/4, with a hard 2,048-node
  cap per decision. A difficult personality receives more evidence without changing its preference
  identity.
- A predictable session-local seed may be derived from public match/version/configuration data.
  Seeded variation is tie-only: it may choose among utility-equal candidates but may not add score
  noise or overturn a non-tied result. Seeds, sampled worlds, margins, and raw candidate scores never
  enter UI, accessible text, diagnostic state, persistence, replay, or public explanations.
- Phase 5B local saves remain untouched. CPU configuration and the derived seed remain session-only.
  The public explanation continues to be computed after settlement from player-A-safe public facts.
- Simulation reports are Node-generated, aggregate-only release artifacts. They may contain matrix
  labels, counts, elapsed/budget data, win rate, average score/multiplier/turns, Koi-Koi/forced-Koi,
  lucky/automatic result, no-score, first-player advantage, illegal/no-action counts, and a canonical
  SHA-256 digest. The report labels its bounded opponent policy rather than presenting results as
  human-play claims. It must not contain card IDs, hidden assignments, seeds, commands/checkpoints,
  per-match traces, or raw candidate scores.

## Consequences

- `AI-6C-001` through `AI-6C-010` lock complement construction, fixed budgets/cap, repeatability,
  tie-only variation, exact-action submission, privacy, stale-result rejection, session-only state,
  aggregate reports, metric direction, and Root/Pages behavior.
- The initial generated report matrix is 270 complete matches: three personalities × three
  difficulties × 3/6/12 formats × ten seeds. Four sequential shards each own whole seed matrices;
  the uneven 3/3/2/2 seed split preserves complete cells. A one-matrix benchmark command must run
  before increasing that count, and hosted work stays within the existing 60-minute job budget.
- `npm run validate:phase6c` inherits all Phase 6B gates, then adds focused rollout/runtime coverage,
  the bounded generated report gate, and dedicated Root/Pages smoke. Artifacts belong under
  `output/phase-6c/e2e/` and `output/phase-6c/reports/`.

## Release status

The observation-only rollout, worker lifecycle, aggregate reports, and Root/Pages runtime are
implemented. `npm run check` passed 61 files / 557 ordinary tests, 10,002 deterministic engine seeds,
both complete decks, and the 784-module production build. The final uninterrupted
`npm run validate:phase6c` exited 0 through every inherited gate plus 27 Phase 6C focused tests, the
four-shard 270-match report matrix, and dedicated Root/Pages worker smoke. All five report safety
counters are zero; 12 PNGs were generated and representative portrait/landscape, thinking,
animation, settlement, privacy, and Options artifacts were inspected. Independent review is B0/H0.
Commit `2206804c25ecd15b38be4ab2c1bdb22fae90cffe` passed CI `31969110411` (21m19s) and
Pages `31969110390` (26m00s build; 8s deploy); the only annotation was the existing Node 20 action
deprecation. Cache-busted live HTTP/2 returned 200 for the main bundle, stylesheet, and dedicated
rollout worker. A real live Hard/Monk Hand-and-Draw trace proved worker thinking redaction, public
animation, settled public explanation, one canvas/48 CardViews, and zero browser errors; the
inspected artifact is `output/playwright/phase6c-live-monk-hard-390x844.png`.
