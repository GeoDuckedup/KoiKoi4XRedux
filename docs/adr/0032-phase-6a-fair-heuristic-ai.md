# ADR 0032: Phase 6A fair heuristic AI boundary

**Status:** Locally complete and accepted; hosted release evidence pending.

## Context

Phase 5B supplies a playable local match, but its pass-and-play runtime cannot safely become a CPU
renderer by simply switching the visible observation to player B: that would make the CPU's private
hand face-up. Phase 6A introduces a fair local CPU without moving gameplay authority, changing the
engine, or widening Phase 5B persistence.

## Decision

- Phase 6A owns a pure deterministic selector in `apps/web/src/ai` with exactly this public shape:
  `PlayerObservationV1 -> LegalActionV1 | null`. The one input is an immutable observation; the
  production CPU adapter calls it only with player B's observation. `null` is allowed only when
  `legalActions` is empty.
- The selector may inspect public observation, its own hand, and already-issued legal actions. It
  returns an exact member of `observation.legalActions`; it neither creates actions nor creates
  commands. It must not accept/import `AuthoritativeGameStateV1`, legal-action construction or
  execution helpers, private player state, random sources, clocks/timers, persistence, DOM, Pixi,
  or Firebase. Pure card/yaku evaluation over information already present in the observation is
  permitted.
- Timid, Monk, and Gambler are deterministic preference profiles over immediate capture value, yaku
  completion/progress, public denial, current month, table multiplier, and public remaining counts.
  Stable legal-action ordering resolves ties. There is no seeded noise in 6A.
- The local CPU mode is human player A versus CPU player B in the existing 3/6/12-round formats. A
  runtime adapter privately obtains B's observation for one selector call, builds the normal command,
  and submits it through the ordinary accepted-command path. The player-A observation remains the
  sole board, text, DOM, and accessibility source during the CPU turn; public events use the current
  AnimationDirector and human input remains locked until settlement.
- CPU play is session-only. Phase 6A neither creates nor mutates the Phase 5B active local save and
  adds no CPU/practice save mode, Firebase, online contract, protocol record, or replay format.
- Difficulty, reason/confidence/explanation output, and match-context adaptation are Phase 6B.
  Hidden-card determinization, seeded rollouts/search, and simulation tuning are Phase 6C.

## Consequences

- `AI-6A-001` through `AI-6A-005` cover fixed Hand, exact-two, Draw, Bank/Koi personality, and
  forced-Koi observations. Each proves membership in existing legal actions and repeatability.
- A hidden-hand mutation test proves that changing only player A's private hand/draw allocation while
  public information and the player-B observation are preserved cannot change any player-B decision.
  A source boundary test rejects authoritative-state, engine-rule, RNG/clock, and presentation
  dependencies from the selector.
- The generated acceptance gate runs 360 complete deterministic trials: three personalities × 3/6/12
  formats × 40 fixed seeds, in four sequential timeout-bounded shards. This gives every
  personality/format cell 40 traces while preserving substantial headroom under the existing hosted
  60-minute job limit; Phase 1E remains the larger 10,002-match rules stress gate.
- The generated driver proves every selected action is already legal, every normal engine command is
  accepted, invariants hold after each transition, and illegal-command count is zero. It records only
  aggregate metrics and asserts Timid Bank frequency, Monk middle behavior, and Gambler Koi-Koi/
  multiplier pressure in the tuned fixed matrix.
- Root and repository-base smoke retain the inherited seven-viewport baseline and add CPU input-lock,
  public-event animation, settled human turn, CPU-card redaction, and landscape option/personality
  artifacts under `output/phase-6a/e2e/`.

## Release status

Local closure is complete: `npm run check` passed format/lint/all workspace typechecks/decks, 58 files /
532 ordinary tests, 10,002 deterministic seeds (3/6/12 = 3,334 each), and the 783-module production
build. `npm run validate:phase6a` passed the 48/48 release deck, 100 technical artifacts, retained
focused/runtime/Workshop/density/Root/Pages/persistence coverage, 2 Phase 6A files / 16 tests, 360
complete trials in four 90-trial shards with zero illegal/no-action outcomes and directional Bank/Koi
metrics, and dedicated Root/Pages CPU smoke. All 26 Phase 6A PNGs and bundled-client one-canvas/48-
CardView/no-diagnostics evidence were inspected. Independent Terra final review was B0/H0, after
repairing the full legal-action preview, production-B hidden mutation, metrics, `opponentTurn`
precedence, Pages keyboard placement, screenshot settlement, and documentation findings. Commit/push,
hosted CI/Pages, deployment, and live verification remain pending.
