# ADR 0013: Phase 3B authoritative Yaku presentation boundary

**Status:** Accepted

**Date:** August 9, 2026

## Context

Phase 3A can execute Bank and Koi-Koi commands but exposes them through generic input controls. Phase
3B must make completed Yaku, changing values, scoring arithmetic, continuation risk, and forced
choices understandable without moving scoring rules into the browser or widening the public privacy
surface.

## Decision

- Browser Yaku presentation consumes only `PlayerObservationV1`, `PublicGameEventV1`, and the
  observer's `LegalActionV1` values. It never evaluates captured cards, thresholds, Bright hierarchy,
  privilege, final-leader restrictions, scoring multipliers, or continuation results.
- Public active Yaku and current totals remain visible for both players. This is current public state,
  not near-threshold advice; future “one card away” guidance requires a separate engine-owned read
  model.
- Every newly completed Yaku from one capture phase is presented in one combined feedback and one
  decision surface. Hand and Draw decisions remain separate sequential windows.
- Bank availability and arithmetic come directly from the legal Bank action. Absence of that action
  removes the Bank control and produces only the neutral statement “Bank is unavailable for this
  decision.” The browser does not infer or disclose the rule-specific reason.
- Koi-Koi text uses the legal action's current and resulting multiplier. A capped call states that the
  table remains 4×; it never suggests a 5× value.
- The accessible DOM owns Yaku progress, live feedback, focus, and decision controls. Pixi continues
  to own the persistent card table. Card controls remain locked while the authoritative phase is
  `awaitingYakuDecision`.
- Transition feedback appears only after card animation settles. The decision receives focus after
  processing settles, and only once for a given authoritative state version.
- `render_game_to_text` may include public active Yaku, current totals, multiplier, feedback, and
  exact legal-action decision arithmetic. It may not include opponent-hand identities, face-down
  identities, draw order, RNG, checkpoints, seen-trigger history, or command IDs.
- Phase 3B may include a brief Bank award in the live feedback/turn recap. Phase 3C retains the
  dedicated round-result, scoring animation, and next-round transition experience.

## Consequences

- The same presentation model supports ordinary, privileged, forced-Koi, and capped-table decisions
  without duplicating gameplay policy.
- Engine and presentation tests can vary legal action payloads independently and prove that UI text
  follows authoritative values exactly.
- A deterministic production-local seed supplies browser evidence through real commands; no fixture
  injector or arbitrary-state hook is shipped to the deployed build.
- Near-completion coaching and full round closure remain explicit later work instead of being implied
  by this slice.
