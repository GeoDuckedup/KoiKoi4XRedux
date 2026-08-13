# ADR 0019: Authoritative Draw resolution

## Decision

After every successful Hand resolution, the engine reveals exactly one Draw card and enters
`awaitingDrawResolution`. The Draw card is an authoritative temporary card zone. Its public
`resolution` is the canonical 0/1/2/3 same-month preview derived by the engine.

`resolveDrawCard` is the only command that completes that Draw. Zero-match placement, one-match
pair, and a four-card sweep require no target; an exact-two preview requires one of the two ordered
public targets. The resolving player receives every legal action; all other observers receive none.

## Consequences

- A player can deliberately tap the revealed card before choosing or confirming its outcome, without
  the browser deriving any capture rule.
- Every Draw consumes two accepted transitions: reveal/pending, then resolution. Replays and public
  projections record both deterministically.
- Draw yaku checks, turn handoff, and End-of-Play happen only after `resolveDrawCard`.
- This ADR does not prescribe physical movement from the top of the deck; that visual choreography
  remains Phase 3E-C.
