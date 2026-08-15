# KoiKoi4x Locked Test Vectors

**Vector specification version:** 1.0  
**Locked:** August 8, 2026  
**Status:** Phase 0C CardId bindings locked; runnable scenarios follow in Phase 1

These vectors are the behavioral contract for the deterministic engine. [`RULES.md`](./RULES.md) defines the rules; this file defines the scenarios that must prove them.

## 1. Fixture contract

Every runnable fixture derived from this specification must contain:

```ts
interface RuleFixtureSpec {
  id: string;
  ruleRefs: readonly string[];
  description: string;
  given: FixtureInitialState;
  when: readonly FixtureAction[];
  then: {
    state: FixtureStateExpectations;
    events: readonly FixtureEventExpectation[];
    visibility?: FixtureVisibilityExpectations;
    history?: FixtureHistoryExpectations;
    error?: FixtureErrorExpectation;
  };
}
```

Requirements:

- Fixture IDs are stable and unique.
- `given` includes the scheduled month, starter, phase, table/scoring context, hands, field, draw pile, captures, seen trigger keys, scores, privileges, and frozen final-round leader when relevant.
- `when` contains semantic commands or explicitly identified setup transitions, never UI coordinates or animation steps.
- `then.events` is ordered and names semantic outcomes, not tweens.
- `then.visibility` distinguishes public, actor-private, opponent-private, and server-only information.
- `then.history` verifies reason codes, arithmetic, evidence, starter, and privilege consequences.
- Every fixture verifies the global invariants unless it intentionally asserts rejection of a
  malformed or rules-unreachable state. `KOI-015A/B` are the named defensive-policy cases for an
  impossible final-Draw privilege assignment.
- Concrete card references use canonical `CardId` values from [`CARD_CATALOG.md`](./CARD_CATALOG.md).
- Phase 0C's machine-readable subsets live in `packages/test-fixtures/src/rules/card-bindings.ts`.
- Generic roles such as “played card,” “same-month target,” and “fifth Animal” remain predicates; Phase 1 binds full states and command traces.

### 1.1 Locked CardId groups

The binding manifest locks all five Brights, the four non-Rain Brights, both viewing pairs, Animal
Trio, both named Scroll sets, all ordinary Red Scrolls, deterministic category-threshold sequences,
and scheduled/nonscheduled four-card month sets. In particular:

- Rain Bright is `november-rain` and Sake Cup is `september-sake-cup`.
- Blossom Viewing is `march-curtain` + `september-sake-cup`.
- Moon Viewing is `august-moon` + `september-sake-cup`.
- Animal Trio is `june-butterfly` + `july-boar` + `october-deer`.
- Red Text Scrolls are `january-red-text-scroll`, `february-red-text-scroll`, and `march-red-text-scroll`.
- Blue Scrolls are `june-blue-scroll`, `september-blue-scroll`, and `october-blue-scroll`.
- `april-red-scroll` is the locked ordinary-Red negative substitute and seventh-Scroll companion.

## 2. Capture vectors

| ID | Given / When | Required result |
|---|---|---|
| `CAP-000` | Played card has no same-month field card. | Played card leaves hand and is placed on field; no capture event. |
| `CAP-001` | Played card has exactly one same-month field card. | Both cards enter actor captures; matching field card is removed. |
| `CAP-002A` | Played card has two same-month field cards; actor chooses the first. | Played card and first target are captured; second target remains. |
| `CAP-002B` | Same state as `CAP-002A`; actor chooses the second. | Played card and second target are captured; first target remains. |
| `CAP-003` | Three same-month cards are on the field. | Played fourth card captures all four as one Four-Card Sweep. |
| `CAP-DRAW-001` | Drawn card has exactly one match. | Drawn card and match are captured before Draw-Phase Yaku Check. |
| `CAP-DRAW-002` | Drawn card has exactly two matches. | Engine enters a draw-capture choice; chosen pair is captured. |
| `CAP-DRAW-003` | Drawn card is fourth card against three field matches. | All four cards are captured as a Draw-Phase Four-Card Sweep. |

## 3. Deal and automatic-outcome vectors

| ID | Given / When | Required result |
|---|---|---|
| `DEAL-001` | Deterministic normal deal with no opening outcome. | Zones contain 8/8/8/24 cards; total is 48; starter is recorded. |
| `DEAL-002` | Initial field contains one complete month. | Scheduled round is cancelled 0–0 with `FIELD_FOUR_MONTH_CANCELLED`; no redeal or normal turn. |
| `DEAL-003` | Field contains a complete month and a player hand is lucky. | Field cancellation wins precedence; private lucky status is neither evaluated publicly nor revealed. |
| `DEAL-004` | Initial field contains two complete months. | One cancelled 0–0 result records both month groups as evidence. |
| `DEAL-005` | One hand contains one complete month. | One automatic 6-point result at 1×; no Yaku Decision. |
| `DEAL-006` | One hand contains two complete months. | Still one 6-point award, never 12. |
| `DEAL-007` | One hand has exact month counts `[2,2,2,2]`. | One `LUCKY_FOUR_PAIRS` 6-point result at 1×. |
| `DEAL-008` | Eight-card hand has a nonexact distribution such as `[3,2,2,1]`. | Four-pairs does not qualify; normal play continues if no other opening outcome exists. |
| `DEAL-009` | Both players have any lucky condition. | Automatic `BOTH_LUCKY_DRAW` at 0–0; no Bank/Koi-Koi decision. |
| `DEAL-010` | Lucky hand also contains card patterns that would form capture-area yaku. | Only the 6-point lucky result scores; ordinary yaku total remains zero. |
| `DEAL-011` | One player qualifies for a lucky hand. | Qualifying full hand remains private before commit and becomes public evidence only after result commit. |
| `DEAL-012-BOTH-LUCKY-EVIDENCE` | Both players are lucky. | Both complete hands and both patterns become public after the 0–0 result commits and persist in history. |

## 4. Fixed-yaku vectors

Each negative fixture supplies the closest nonqualifying capture set and asserts that the named trigger key and points are absent.

| ID | Required expectation |
|---|---|
| `YAKU-FIX-BRIGHT-THREE-POS` | Exactly three non-Rain Brights activate Three Brights for 5. |
| `YAKU-FIX-BRIGHT-THREE-NEG-RAIN` | Three Brights including Rain do not activate Three Brights. |
| `YAKU-FIX-BRIGHT-FOUR-POS` | Four non-Rain Brights activate Four Brights for 8. |
| `YAKU-FIX-BRIGHT-FOUR-NEG-RAIN` | Four Brights including Rain do not activate the no-Rain Four Brights key. |
| `YAKU-FIX-BRIGHT-FOUR-RAIN-POS` | Four Brights including Rain activate Four Brights with Rain for 7. |
| `YAKU-FIX-BRIGHT-FOUR-RAIN-NEG` | Four non-Rain Brights do not activate the Rain tier. |
| `YAKU-FIX-BRIGHT-FIVE-POS` | All five Brights activate Five Brights for 10. |
| `YAKU-FIX-BRIGHT-FIVE-NEG` | Any four-Bright set does not activate Five Brights. |
| `YAKU-FIX-BLOSSOM-POS` | `march-curtain` plus `september-sake-cup` activate Blossom Viewing for 5. |
| `YAKU-FIX-BLOSSOM-NEG` | Either required Blossom Viewing card missing means no trigger. |
| `YAKU-FIX-MOON-POS` | `august-moon` plus `september-sake-cup` activate Moon Viewing for 5. |
| `YAKU-FIX-MOON-NEG` | Either required Moon Viewing card missing means no trigger. |
| `YAKU-FIX-ANIMAL-TRIO-POS` | `june-butterfly`, `july-boar`, and `october-deer` activate Animal Trio for 5. |
| `YAKU-FIX-ANIMAL-TRIO-NEG` | Any one trio member missing means no Animal Trio trigger. |
| `YAKU-FIX-RED-TEXT-POS` | `january-red-text-scroll`, `february-red-text-scroll`, and `march-red-text-scroll` activate Red Text Scrolls for 5. |
| `YAKU-FIX-RED-TEXT-NEG` | `april-red-scroll` cannot substitute for a required text Scroll. |
| `YAKU-FIX-BLUE-POS` | `june-blue-scroll`, `september-blue-scroll`, and `october-blue-scroll` activate Blue Scrolls for 5. |
| `YAKU-FIX-BLUE-NEG` | Any one required blue Scroll missing means no Blue Scroll trigger. |
| `YAKU-FIX-CURRENT-MONTH-POS` | All four scheduled-month cards in captures activate Current-Month Set for 5. |
| `YAKU-FIX-CURRENT-MONTH-NEG` | Four cards from a nonscheduled month do not activate Current-Month Set. |

## 5. Yaku hierarchy, increments, stacking, and triggers

| ID | Given / When | Required result |
|---|---|---|
| `YAKU-BRIGHT-UPGRADE-THREE-TO-FOUR-RAIN` | Three Brights was seen; `november-rain` becomes the fourth Bright. | Four Brights with Rain replaces the 5-point tier with 7 and creates its own new trigger. |
| `YAKU-BRIGHT-UPGRADE-FOUR-TO-FIVE` | Four Brights was seen; fifth Bright is captured. | Five Brights replaces the 8-point tier with 10 and creates its own new trigger. |
| `YAKU-BRIGHT-INDEPENDENT-STACK-020` | Captures contain all five bound Bright IDs and `september-sake-cup`. | Active yaku are Five Brights 10, Moon Viewing 5, Blossom Viewing 5; total is exactly 20 before other possible yaku. |
| `YAKU-SAKE-ANIMAL-NOT-PLAIN` | Categorize and score a capture set containing `september-sake-cup`. | `september-sake-cup` increments Animals and both viewing sets when applicable; it never increments Plain Cards. |
| `YAKU-INCR-ANIMAL-005` | Capture fifth Animal. | Animals activates at 3 with one new trigger. |
| `YAKU-INCR-ANIMAL-006` | Add sixth Animal after trigger was seen. | Animals value becomes 4 with no new trigger. |
| `YAKU-INCR-ANIMAL-007` | Add seventh Animal after trigger was seen. | Animals value becomes 5 with no new trigger. |
| `YAKU-INCR-SCROLL-005` | Capture fifth Scroll. | Scrolls activates at 1 with one new trigger. |
| `YAKU-INCR-SCROLL-006` | Add sixth Scroll after trigger was seen. | Scrolls value becomes 2 with no new trigger. |
| `YAKU-INCR-SCROLL-007` | Add seventh Scroll after trigger was seen. | Scrolls value becomes 3 with no new trigger. |
| `YAKU-INCR-PLAIN-010` | Capture tenth Plain. | Plain Cards activates at 1 with one new trigger. |
| `YAKU-INCR-PLAIN-011` | Add eleventh Plain after trigger was seen. | Plain Cards value becomes 2 with no new trigger. |
| `YAKU-INCR-PLAIN-012` | Add twelfth Plain after trigger was seen. | Plain Cards value becomes 3 with no new trigger. |
| `YAKU-CURRENT-MONTH-ACCUMULATES` | Scheduled-month cards enter captures across separate turns/actions. | Capturing the fourth activates Current-Month Set; no single-action requirement exists. |
| `YAKU-CURRENT-MONTH-SWEEP` | A Four-Card Sweep captures the scheduled month. | The sweep action also activates Current-Month Set. |
| `YAKU-MULTI-NEW-ONE-DECISION` | One capture completes multiple unseen yaku. | All new trigger keys are marked seen and one combined decision contains them all. |
| `YAKU-INCREMENT-NO-RETRIGGER` | A seen Animals/Scrolls/Plain Cards yaku increases above threshold. | Total points change but no new `YakuDecisionRequired` event occurs. |
| `YAKU-SCROLL-SEVEN-013` | Captures contain both named Scroll groups plus `april-red-scroll`. | Scores 5 + 5 + 3 = 13 across three active yaku. |
| `YAKU-SCROLL-NO-RED-BLUE-BONUS` | Both named Scroll sets are present. | No fourth combined Red+Blue yaku or extra 10-point bonus exists. |

## 6. Bank, Koi-Koi, and End-of-Play vectors

| ID | Given / When | Required result |
|---|---|---|
| `KOI-001` | Ordinary decision at table 1×; actor Banks. | Round ends and actor scores current yaku total × 1. |
| `KOI-002` | Ordinary decision at 1×; actor calls Koi-Koi. | Table becomes 2× and actor becomes most recent caller. |
| `KOI-003` | Ordinary decision at 2×; actor calls Koi-Koi. | Table becomes 3× and caller updates. |
| `KOI-004` | Ordinary decision at 3×; actor calls Koi-Koi. | Table becomes 4× and caller updates. |
| `KOI-005` | Ordinary decision at 4×; different actor calls Koi-Koi. | Table remains 4× while most recent caller changes. |
| `KOI-006` | Hand-Phase yaku decision; actor calls Koi-Koi. | Draw Phase resumes for the same actor. |
| `KOI-007` | Hand-Phase yaku decision; actor Banks. | Round ends immediately and no draw event occurs. |
| `KOI-008` | One phase creates several new yaku. | Exactly one decision event contains every new yaku. |
| `KOI-009` | Hand Phase creates unseen yaku and actor calls; Draw Phase creates a different unseen yaku. | Two decision events occur in that one turn, one per phase. |
| `KOI-010` | Both hands empty after at least one call. | Most recent caller scores their current yaku total at current table multiplier. |
| `KOI-011` | Both hands empty with no Koi-Koi caller. | Round ends 0–0 with `END_OF_PLAY_NO_SCORE`. |
| `KOI-012A-FINAL-DRAW-1X-TO-2X` | Final Draw Phase creates a new yaku at 1×; actor calls. | Table becomes 2× and actor immediately scores at 2×. |
| `KOI-012B-FINAL-DRAW-2X-TO-3X` | Final Draw Phase creates a new yaku at 2×; actor calls. | Table becomes 3× and actor immediately scores at 3×. |
| `KOI-012C-FINAL-DRAW-3X-TO-4X` | Final Draw Phase creates a new yaku at 3×; actor calls. | Table becomes 4× and actor immediately scores at 4×. |
| `KOI-013-FINAL-DRAW-AT-4X` | Another player was latest caller; final actor completes new yaku at 4× and calls. | Multiplier stays 4×, caller changes to final actor, and final actor immediately scores. |
| `KOI-014-END-SCORER-DIFFERS-FINAL-ACTOR` | Final actor completes the turn without a new decision; other player is most recent caller. | Other player scores at End of Play. |
| `KOI-015A-FINAL-DRAW-PRIVILEGED-BANK` | Intentionally malformed final-Draw candidate assigns the starter-only privilege to the nonstarter final actor, then proposes Bank. | Authoritative validation reports `ROUND_PRIVILEGE_INVALID`; no Bank command is accepted. |
| `KOI-015B-FINAL-DRAW-PRIVILEGED-KOI` | The same rules-unreachable final-Draw privilege assignment proposes Koi-Koi. | Authoritative validation reports `ROUND_PRIVILEGE_INVALID`; no Koi-Koi command is accepted. |
| `KOI-016-FINAL-LEADER-FORCED-KOI` | Frozen leader creates round's first trigger on final draw with applicable Bank at 1×. | Bank is unavailable; required call raises table and immediately resolves End of Play. |
| `END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED` | Play a legal round to natural completion. | Both hands empty after sixteen turns; sixteen draw cards revealed; eight draw cards remain server-only and unrevealed. |

## 7. Round-transition vectors

| ID | Required expectation |
|---|---|
| `TRANS-1X-LOSER-STARTS-PRIVILEGE` | Loser of a 1× result starts next month and receives the special privilege. |
| `TRANS-2X-LOSER-STARTS-NO-PRIVILEGE` | Loser of a 2× result starts next month without a new privilege. |
| `TRANS-3X-WINNER-STARTS` | Winner of a 3× result starts next month. |
| `TRANS-4X-WINNER-STARTS` | Winner of a 4× result starts next month. |
| `TRANS-JANUARY-ZERO-ALTERNATES` | January 0–0 makes the opposite player from January's recorded starter begin February. |
| `TRANS-LATER-ZERO-PRESERVES` | February–November 0–0 makes that round's starter begin the next month. |
| `TRANS-ZERO-CLEARS-PRIVILEGE` | Any 0–0 result clears an unconsumed special privilege. |
| `TRANS-PRIVILEGED-BANK-SPLIT-MULTIPLIER` | Privileged Bank records visible table 1 and scoring multiplier 2; awarded points use 2. |
| `TRANS-PRIVILEGED-BANK-STARTER` | Privileged Bank is a 2× result, so its loser starts next without gaining another privilege. |
| `TRANS-PRIVILEGED-KOI-JUMPS-TO-3X` | Eligible Koi-Koi moves actual table directly from 1× to 3×. |
| `TRANS-PRIVILEGE-LOST-AFTER-TABLE-RISE` | If table leaves 1× first, the eligible player's later first trigger has only ordinary options. |
| `TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE` | One-player lucky win behaves as 1×: loser starts next month with special privilege. |

## 8. Final-round and final-month vectors

| ID | Required expectation |
|---|---|
| `FINAL-LEADER-FROZEN` | Protected leader identity is taken from scores at final-round start and never recalculated mid-round. |
| `FINAL-LEADER-FIRST-YAKU-FORCED-KOI` | Frozen leader creating the round's first trigger at applicable 1× cannot Bank. |
| `FINAL-OPPONENT-FIRST-REMOVES-RESTRICTION` | Opponent creating the first trigger consumes the rule; leader may later Bank normally. |
| `FINAL-LEADER-PRIVILEGED-BANK` | Frozen leader with applicable special 2× privilege may Bank. |
| `FINAL-TIE-PROTECTS-NONE` | Tied scores at final-round start protect neither player. |
| `FINAL-MONTH-CANCELLED-ENDS` | Final-month field cancellation records 0–0 and ends match without replacement. |
| `FINAL-MONTH-BOTH-LUCKY-ENDS` | Final-month both-lucky result records 0–0 and ends match without replacement. |
| `FINAL-MONTH-NATURAL-ZERO-ENDS` | Final-month no-caller End of Play records 0–0 and ends match. |
| `FINAL-MONTH-LUCKY-WINNER-ENDS` | Final-month lucky winner receives 6 and match ends. |
| `FINAL-RULE-3-ROUND` | In a three-round format, March uses final-round leader behavior. |
| `FINAL-RULE-6-ROUND` | In a six-round format, June uses final-round leader behavior. |
| `FINAL-RULE-12-ROUND` | In a twelve-round format, December uses final-round leader behavior. |

## 9. Projection, history, and invariant vectors

| ID | Required expectation |
|---|---|
| `HIST-RESULT-REASON-CODES` | Each automatic, Banked, and End-of-Play result stores the canonical reason code and arithmetic fields. |
| `HIST-LUCKY-EVIDENCE` | Lucky history retains full revealed qualifying hand, pattern, 6-point arithmetic, and transition consequence. |
| `HIST-CANCELLATION-EVIDENCE` | Cancellation history retains every complete field month and the 0–0 transition explanation. |
| `PROJ-LUCKY-BEFORE-COMMIT-HIDDEN` | Opponent projection before automatic-result commit contains no private lucky-hand identities. |
| `PROJ-LUCKY-AFTER-COMMIT-REVEALED` | Post-commit public projection contains exactly the approved qualifying evidence. |
| `INV-ZONE-UNIQUENESS` | Every card is in exactly one authoritative zone after every accepted command. |
| `INV-CARD-COUNT-48` | Authoritative zone counts always total 48. |
| `INV-ACTIVE-PLAYER-ONLY` | Out-of-turn gameplay command is rejected without mutation. |
| `INV-HAND-OWNERSHIP` | Playing a card not in actor hand is rejected without mutation. |
| `INV-CAPTURE-TARGET-LEGAL` | Missing or illegal two-match target is rejected without partial mutation. |
| `INV-OBSERVATION-NO-PRIVATE` | Observation excludes opponent hand identities, deck order, and server RNG state. |
| `INV-SCORE-MULTIPLIER-RANGE` | Scores remain non-negative; table/scoring multipliers remain in their legal domains. |
| `INV-STATE-VERSION-ONCE` | Accepted command increments state version exactly once; rejected command does not. |
| `INV-DETERMINISTIC-REPLAY` | Same initial state, RNG snapshot, and command sequence produce identical state/events/hash. |

Phase 1E binding:

- the three `HIST-*` IDs remain literal-bound executable Phase 1D lifecycle regressions;
- the 11 `PROJ-*`/`INV-*` IDs are typed literal Phase 1E fixtures and executable assertions;
- “before commit” means the public projection of the ordered setup-event prefix strictly before
  `automaticRoundResultCommitted`; the setup transition itself remains atomic;
- canonical hash artifacts declare canonicalization version 1 and SHA-256;
- the generated gate executes 10,002 complete legal matches, exactly 3,334 for each 3/6/12-round
  format, validates every production transition, and samples full replay/projection/hash equality
  across all formats using reproducible seeds.

## 10. Phase 2D presentation input vectors

These are presentation-only assertions. They consume injected recipient-scoped legal actions and
may emit an immutable intent, but they never execute an engine command or advance authoritative
state.

| ID | Required expectation |
|---|---|
| `INPUT-001` | Guided Hand selection records the selected own-hand CardId and exposes only its trusted public confirmation target. |
| `INPUT-002` | Escape/cancel clears selection and targets without emitting an intent. |
| `INPUT-003` | Activating a legal Guided outcome emits one frozen minimal intent and enters pending state. |
| `INPUT-004` | An exact-two capture exposes only the two legal field targets and rejects every other card. |
| `INPUT-005` | Guided mode requires explicit confirmation for a single legal Hand action. |
| `INPUT-006` | Fast mode immediately emits a single legal Hand action while preserving target choice when alternatives exist. |
| `INPUT-007` | Opponent turn and presentation locks expose no active card controls; clearing a temporary lock restores only current-source input. |
| `INPUT-008` | Pending Draw capture exposes only public legal targets and cannot be cancelled into an invalid phase. |
| `INPUT-009` | Yaku decision controls contain only current legal Bank/Koi-Koi choices and emit the chosen intent once. |
| `INPUT-010` | Double activation emits once; the pending controller requires a newer observation identity before unlocking. |
| `INPUT-011` | A source whose actions escape observing-player/own-hand scope is rejected before interaction. |
| `INPUT-012` | Every technical phase fixture owns one frozen complete 48-card presentation projection and is explicitly non-authoritative. |
| `INPUT-013` | Layout-derived semantic hit areas remain contained, ordered, and at least 44 CSS pixels across supported layout families. |
| `INPUT-014` | Card controls expose name, month, category, selected/focused state, legal-target state, and intended action semantics. |

Phase 2D binding:

- reducer and hit-area assertions carry the exact stable ID in the test name;
- root and repository-prefixed browser matrices prove baseline layout/control containment at seven
  viewports, then exercise Guided/Fast pointer paths, roving keyboard focus, Enter/Escape, Draw and
  Yaku decisions, opponent/animation/deck locks, resize, persistent CardView identity, and zero
  browser/network errors in a complete 390×844 trace on each base;
- emitted intents omit `commandId`, scoring display metadata, authoritative state, RNG, and any
  engine transition, and the technical browser harness never executes them;
- optional drag input is deferred because pointer activation and keyboard input are complete.

## 11. Phase 2E deck-authoring and approval vectors

These assertions govern local authoring and review. They do not make development or candidate art a
release deck and do not permit an automated tool to impersonate owner visual approval.

| ID | Required expectation |
|---|---|
| `ART2E-001` | Canonical filenames auto-assign to exact CardIds; ambiguous/duplicate stems are reported rather than guessed. |
| `ART2E-002` | The Workshop groups exactly 48 canonical slots by month and truthfully distinguishes Auto, Manual, inherited, warning, missing, and invalid status. |
| `ART2E-003` | Auto/Manual transform editing is immutable, normalized, deterministic, and resolution-independent. |
| `ART2E-004` | Art-review and gameplay sheet plans have literal dimensions, canonical card order, 48 slots, and locked card geometry. |
| `ART2E-005` | Identical source and transform produce byte-identical table/thumbnail derivatives without changing the source digest. |
| `ART2E-006` | The four-source pilot candidate builds both complete 48-slot review sheets, remains visibly incomplete, and withholds a runtime manifest and approval. |
| `ART2E-007` | A complete second technical package builds 48 faces plus a back and decodes through the strict runtime manifest contract. |
| `ART2E-008` | Transform saves are atomic and leave every immutable source digest unchanged. |
| `ART2E-009` | Source assignment writes a digest-named immutable copy and never overwrites the original or another card's source. |
| `ART2E-010` | The local-only Workshop passes desktop/mobile browser checks for its 48-card grid, editor modes, source metadata, protected bridge, 390×844 pilot board, and no engine execution. |
| `ART2E-011` | Approval requires an explicit owner/date and exact current art-sheet, gameplay-sheet, four-pilot, note, and 390×844 evidence; stale or hostile records reject. |
| `ART2E-012` | Release rejects missing/unapproved/incomplete art, while normal root and Pages builds exclude the Workshop and authoring bridge. |

Phase 2E binding:

- `ART2E-001` through `ART2E-009` and `ART2E-011` carry their exact IDs in focused deterministic
  tests; `ART2E-010` is the dedicated local Workshop browser trace and `ART2E-012` is bound to
  release-rejection plus root/repository-prefixed production-absence assertions;
- technical acceptance may pass with missing art only because its report and sheets remain explicitly
  incomplete; the separate release command must fail until all 48 faces, the back, pilot approval,
  and digest-current owner evidence are present;
- Workshop previews and builds use the same portable transform contract and Node raster adapter;
  no alternate canvas-only crop policy is accepted;
- the normal production app contains no Workshop entry, local write API, authored source, approval
  record, Sharp import, or runtime transform resolver.

## 12. Phase 3A local-round vectors

| ID | Required expectation |
|---|---|
| `LOCAL-001` | The production browser loads the owner-approved `new-primary-deck` as its default complete 48-face/back package at root and repository-prefixed bases. |
| `LOCAL-002` | One real player observation projects exactly 48 persistent cards while opponent-hand and unrevealed-draw identities remain face-down and absent from the text/debug surface. |
| `LOCAL-003` | A legal Hand intent becomes one real gameplay command, increments authoritative state once, and emits the engine's public Hand/Draw events. |
| `LOCAL-004` | Every public event has one recipient-relative animation boundary plus the final target; legal field counts above eight use the Phase 3D-D adaptive grid without rejecting gameplay. |
| `LOCAL-005` | Real pair/sweep captures move the exact public card IDs into the acting player's category rails, and exact-two choices expose only engine-provided targets. |
| `LOCAL-006` | A completed turn covers the full table before switching observations; the next player's private hand appears only after explicit Ready activation. |
| `LOCAL-007` | Every completed turn appends one concise HTML recap naming public played, drawn, captured, yaku/result, and next-player facts without hidden data. |
| `LOCAL-008` | A deterministic legal-action driver completes the entire first round through real observation/command/handoff seams and produces exactly one durable round result. |

Phase 3A binding:

- focused tests carry all eight exact IDs and execute the production local runtime, observation
  adapter, animation-boundary planner, recap formatter, legal-capture path, handoff, and complete
  round;
- root and `/KoiKoi4XRedux/` browser gates load the approved primary deck at all seven viewports,
  execute a real Hand → Draw → field/capture turn, inspect the recap, prove the privacy cover, switch
  to Player B, and restart without browser or network errors;
- the local adapter may assign command IDs and execute the pure engine, but the input controller,
  Pixi scene, semantic DOM controls, and deck runtime remain rule-free;
- Phase 3B retains finished yaku/Bank/Koi presentation and Phase 3C retains the finished round-end
  result experience.

## 13. Phase 3B yaku and Bank/Koi presentation vectors

These are public-presentation contracts. They consume `PlayerObservationV1`, public events, and
engine legal actions; they do not recalculate yaku, scoring, privilege, forced-Koi availability, or
continuation rules. Their complete typed, frozen source catalog is
`PHASE_3B_PRESENTATION_FIXTURES` under `@koikoi4x/test-fixtures`.

| ID | Required expectation |
|---|---|
| `PRES-YAKU-001-MULTI-HAND` | The Hand decision shows Blossom Viewing 5 and Moon Viewing 5 together, active total 10, one decision surface, and `Bank 10 points`. |
| `PRES-YAKU-002-INCREMENT-NO-DECISION` | An Animals increase from 3 to 4 updates public progress and announces `Animals upgraded: 3 → 4 points.` without opening a decision. |
| `PRES-YAKU-003-BRIGHT-UPGRADE` | A public before/after active-Yaku diff shows Four Brights 8 replaced by Five Brights 10, never stacked, and announces `Four Brights upgraded to Five Brights: 8 → 10 points.` without recalculating the hierarchy. |
| `PRES-YAKU-004-TWO-WINDOW-TURN` | A Hand decision followed by Koi-Koi and a distinct Draw decision shows two sequential panels, never concurrent; the first call reaches 2×. |
| `PRES-KOI-001-BANK-HAND-AWARD` | Hand Bank at table/scoring 1× awards 10, skips Draw, and states `Player A banked 10 points.`; the full round-result screen remains Phase 3C scope. |
| `PRES-KOI-002-CONTINUE-AND-RESUME` | `Koi-Koi → 2×` updates the public table/caller and resumes the same actor's Draw before handoff. |
| `PRES-KOI-003-PRIVILEGE-SPLIT` | A privilege decision distinguishes visible table 1× from Bank `10 points × 2× = 20`, while the Koi-Koi consequence is `Koi-Koi → 3×`. |
| `PRES-KOI-004-FORCED-KOI` | When authoritative legal actions omit Bank, no executable Bank control exists; the required Koi-Koi path reaches 2×. |
| `PRES-KOI-005-CAP-CALLER` | At 4×, Koi-Koi remains legal, says `Koi-Koi — table remains 4×`, and updates the latest caller without claiming 5×. |
| `PRES-PRIV-001-SAFE-STATE` | Text/semantic output may contain public active yaku, total, multiplier, and decision arithmetic, but never opponent-hand identities, face-down identities, draw order, RNG, checkpoints, or command IDs. |

Phase 3B binding:

- `00000000000000000000000000000003` is the production local deterministic deal used by focused
  root and `/KoiKoi4XRedux/` 390×844 browser traces. The trace reaches Hand Animals (Bank 3 at
  1×, Koi-Koi 1×→2×), then a final-Draw Blue Scrolls + Scrolls combined decision (total 11,
  Bank 22 at 2×, Koi-Koi 2×→3×) through real observations, legal actions, and commands;
- a separate fresh-run Bank trace proves no draw event follows Hand Bank and records the public
  award/recap; this is not a fixture injector or a browser scoring implementation;
- root and Pages builds retain the seven-viewport layout, asset, persistent-card, privacy, and
  zero-console/network-error baseline; focused traces add yaku decision/continuation/Bank screenshots
  under `output/phase-3b/e2e`.

## 14. Phase 3C round-result presentation vectors

These public-presentation contracts consume completed public observations, public history, and
projected public events. The browser may format authoritative enums and numbers but may not
recalculate scoring, Yaku, starter/privilege policy, evidence visibility, or match outcome.

| ID | Required expectation |
|---|---|
| `PRES-RESULT-001-BANKED-SCORE` | Shows the authoritative scorer, active Yaku, base/table/scoring/award values, public deltas/totals, and next-round plan. |
| `PRES-RESULT-002-END-PLAY-LAST-KOI` | Names End of Play and awards the most recent Koi-Koi caller even when that player is not the final actor. |
| `PRES-RESULT-003-END-PLAY-NO-SCORE` | States that no Koi-Koi caller exists and the round ends 0–0; no Yaku arithmetic or award is invented. |
| `PRES-RESULT-004-FIELD-CANCELLATION` | Shows cancellation, all committed complete-field-month evidence, and 0–0 without revealing private lucky evidence. |
| `PRES-RESULT-005-LUCKY-WIN-EVIDENCE` | Shows the committed lucky qualification/eight-card evidence and exact authoritative 6-point award. |
| `PRES-RESULT-006-BOTH-LUCKY-DRAW-EVIDENCE` | Shows both committed lucky evidence groups and 0–0 without a tiebreaker. |
| `PRES-RESULT-007-JANUARY-ZERO-TRANSITION` | Displays the authoritative February starter and January alternation explanation literally. |
| `PRES-RESULT-008-PRIVILEGED-BANK-SPLIT` | Keeps visible table 1× distinct from scoring 2× and copies the exact award/next-starter consequence. |
| `PRES-RESULT-009-MATCH-COMPLETE-WINNER` | Shows final public scores, winner, public round history, no next-round plan, and `Start a new local match`. |
| `PRES-RESULT-010-MATCH-COMPLETE-TIE` | Shows equal final public scores and a tied match without an invented tiebreaker. |
| `PRES-RESULT-011-SAFE-PROJECTION` | Result text contains only committed public facts/evidence and omits private hands, unused draw identities/order, RNG, checkpoint, command IDs, and authoritative state. |
| `PRES-RESULT-012-MODAL-LOCK` | Result focus opens after the score beat; cards and unrelated controls remain unavailable until the explicit local action. |

Phase 3C binding:

- the exact typed, frozen catalog binds all twelve IDs to existing Phase 1D/DEAL/history/privacy
  authority; no production state injector is added;
- the real production seed supplies root and `/KoiKoi4XRedux/` Bank and final-Draw Koi-Koi result
  traces. Page-side ordering evidence proves cards settle, Phase 3B feedback appears, then the result
  modal receives focus;
- the Bank result remains horizontally contained and vertically scrollable inside the game frame at
  every supported viewport; focused 390×844 artifacts cover Bank and End-of-Play result screens,
  public score movement, modal locking, and local restart;
- the next-round plan is informational in Phase 3C. `Start another local round` resets the explicit
  one-round slice and is never labeled as beginning the authoritative next scheduled month.

## 15. Phase 3D-B authoritative interaction-preview vectors

These vectors lock the public explanation attached to an already-legal Hand action. They do not
authorize the browser to calculate matches, manufacture targets, or choose a capture from Pixi
coordinates.

| ID | Required expectation |
|---|---|
| `TABLE-INPUT-001-PLACE` | A no-match Hand action carries `placeOnField` with zero matching IDs. Guided selection exposes one semantic field-placement surface and Confirm/Cancel without changing authoritative state. |
| `TABLE-INPUT-002-PAIR` | A unique match carries `capturePair` with exactly its one public field CardId. Guided highlights that card; tapping it submits the existing target-free action. |
| `TABLE-INPUT-003-CHOICE` | Exactly two matches carry `captureChoice` with the two ordered public field CardIds and exactly two corresponding targeted legal actions. Tapping one preserves that target. |
| `TABLE-INPUT-004-SWEEP` | Three matches carry `fourCardSweep` with all three ordered public field CardIds. Guided highlights all three; tapping any submits the one target-free sweep action. |
| `TABLE-INPUT-005-FAST` | Fast submits no-match, pair, and sweep immediately, but never skips an exact-two target choice. |
| `TABLE-INPUT-006-A11Y` | Semantic controls truthfully distinguish placing, confirming a matching capture, choosing one of two targets, and confirming a four-card sweep; Confirm/Cancel and keyboard behavior remain equivalent. |
| `TABLE-INPUT-007-BOUNDARY` | Duplicate, off-field, wrong-count, wrong-kind, or action-inconsistent previews reject before any intent; selection alone never increments state and one accepted intent remains locked until a newer observation. |

Phase 3D-B binding:

- engine fixture tests assert all four exact frozen preview shapes beside canonical legal actions;
- focused web tests carry every exact ID and exercise Guided/Fast state, emitted intent shape,
  accessibility labels, malformed-source rejection, and unchanged Draw targeting;
- root and `/KoiKoi4XRedux/` production browser traces select and execute a real no-match placement
  plus a real unique pair at 390×844, and retain the seven-viewport, Yaku, result, privacy, card-
  identity, and zero-browser/network-error gates;
- field position is automatic presentation only. Adaptive 9–17-card field sizing belongs to Phase
  3D-D and cannot change action legality.

## 16. Phase 3D-C runtime-theme and compact-shell vectors

These vectors are presentation-only. A theme identifier may affect DOM/Pixi colors and local
cosmetic persistence, but it may not enter gameplay authority or change any projected card state.

| ID | Required expectation |
|---|---|
| `TABLE-THEME-001-DEFAULT-INK` | With no valid stored preference, Ink & Parchment is applied before readiness to both DOM and Pixi. |
| `TABLE-THEME-002-RUNTIME-SWITCH` | Selecting each approved theme updates DOM, metadata, card frames, and table chrome in place while retaining one canvas and all 48 CardView tokens. |
| `TABLE-THEME-003-PERSIST-RELOAD` | A valid version-1 IndexedDB preference restores after reload; missing, malformed, unknown, unsupported, or failed persistence falls back safely to Ink. |
| `TABLE-THEME-004-AUTHORITY-NEUTRAL` | Theme switching leaves match/state version, active deck, projection, selection, legal targets, Yaku, result, and command count unchanged. |
| `TABLE-SHELL-001-OPTIONS-A11Y` | Options is a labelled modal dialog; opening focuses the selected theme, Escape closes and returns focus, and gameplay/fullscreen shortcuts do not execute beneath it. |
| `TABLE-SHELL-002-CRITICAL-LOCK` | Options cannot open during handoff, Yaku decision, or round-result focus ownership; all valid decision/result controls remain usable. |
| `TABLE-SHELL-003-COMPACT-TURN` | The current instruction and conditional Confirm/Cancel remain visible next to the table; secondary controls remain reachable only through Options. |
| `TABLE-SHELL-004-YAKU-HISTORY` | Both players' public active-Yaku names/totals and latest event remain visible; the complete ordered recap remains reachable through native disclosure. |
| `TABLE-SHELL-005-RESPONSIVE` | Root and repository-prefixed builds contain the compact shell at all supported viewports and emit no browser/network errors. |

Phase 3D-C binding:

- preference/store tests execute exact decoder, IndexedDB, failure, and in-memory fallback cases;
- scene tests prove runtime color invalidation preserves persistent card identity and deck bindings;
- root and `/KoiKoi4XRedux/` browser traces select every theme from one production build, reload a
  stored preference, exercise Options focus/locks, and retain the Phase 3D-B interaction and Phase
  3C Yaku/result traces;
- adaptive field-card density remains Phase 3D-D and cannot be introduced as part of a theme or
  shell change.

## 17. Phase 3D-D adaptive dense-field vectors

These presentation vectors consume only recipient-safe public projection order/count and existing
legal target IDs. They do not create legal actions, infer capture eligibility, or access hidden card
allocation.

| ID | Required expectation |
|---|---|
| `TABLE-DENSITY-001-BASE-EIGHT` | Eight or fewer field cards retain the stable four-by-two geometry and card size. |
| `TABLE-DENSITY-002-NINE` | Nine field cards occupy one deterministic contained 5:8 grid with no overlap or fanning. |
| `TABLE-DENSITY-003-TWELVE` | Twelve field cards remain distinct, ordered, and contained at every supported viewport. |
| `TABLE-DENSITY-004-LEGAL-SEVENTEEN` | The derived legal maximum of seventeen remains visible, contained, and non-overlapping; eighteen fails closed. |
| `TABLE-DENSITY-005-REFLOW` | Direct placement/capture motion completes before unrelated field cards interpolate to the new density. |
| `TABLE-DENSITY-006-TARGETS` | Dense legal targets retain public order, distinct pointer territories of at least 24×36px, and complete keyboard activation; hand controls remain 44px. |
| `TABLE-DENSITY-007-RESIZE` | Resize changes geometry without changing public field order, CardView identity, or active target identity. |
| `TABLE-DENSITY-008-BOUND` | Non-integer, negative, or above-seventeen presentation counts are rejected without altering source state. |

Phase 3D-D binding:

- geometry tests execute 8/9/12/17 at all seven supported viewports and verify deterministic frozen
  5:8 slots, containment, non-overlap, ordering, target partitioning, and threshold reflow;
- a separate non-shipping Vite entry renders the real Pixi scene with 17 cards and three legal
  targets. Root and `/KoiKoi4XRedux/` builds execute pointer and keyboard activation across all
  seven viewports with one canvas, 48 persistent CardViews, and zero browser/network errors;
- the normal application contains no fixture selector, query parameter, global state injector, or
  deployed density-review HTML entry. Evidence is written under `output/phase-3d-d/e2e/`.

## 18. Phase 3E-A table-clarity vectors

| ID | Required expectation |
|---|---|
| `TABLE-CLARITY-001-EMPTY-FIELD` | No numbered or outlined unused slots render; adaptive geometry and temporary legal placement cues remain. |
| `TABLE-CLARITY-002-OPTIONS-BOTTOM` | Options remains inside the bottom safe area at every supported viewport and preserves focus/locks. |
| `TABLE-CLARITY-003-CAPTURE-INSPECT` | Either nonempty public capture rail opens exactly that player's category-grouped captured cards; Close/Escape restores focus and changes no authority. |
| `TABLE-CLARITY-004-KOI-VISIBLE-TABLE` | A real Yaku Decision tray does not overlap the game frame; public capture inspection remains available while gameplay and Options stay locked. |
| `TABLE-CLARITY-005-CONCISE-RESULT` | Bank and End-of-Play results initially show outcome, award/totals, and one action; scoring/evidence/transition/history are collapsed until requested. |
| `TABLE-CLARITY-006-RESPONSIVE-A11Y` | Root/Pages mobile, landscape, and desktop traces preserve keyboard focus, one canvas, 48 CardViews, privacy, containment, and zero errors. |

Phase 3E-A binding:

- a pure capture presenter proves exact public category grouping, immutability, and no private-state
  fields;
- scene/text inspection reports zero permanent empty-field placeholders;
- the existing deterministic production round supplies real Koi-Koi, capture-inspection, Bank, and
  End-of-Play traces without a production state injector;
- browser artifacts are written under `output/phase-3e-a/e2e/`.

## 19. Phase 3E-B authoritative Draw-resolution vectors

| ID | Required expectation |
|---|---|
| `DRAW-INTERACT-001-PLACE` | A no-match Draw reveals into a public pending state, then only an explicit target-free resolution places it on the field. |
| `DRAW-INTERACT-002-UNIQUE-PAIR` | A one-match Draw pauses before its sole public matching pair is captured. |
| `DRAW-INTERACT-003-EXACT-TWO` | An exact-two Draw exposes precisely two ordered legal targets and requires one; neither target is defaulted. |
| `DRAW-INTERACT-004-SWEEP` | A three-match Draw pauses before one target-free resolution captures all four cards in canonical order. |
| `DRAW-INTERACT-005-STATE-VERSION-REPLAY` | Each reveal and resolution advances once; stale/missing/illegal resolutions preserve state and replay remains deterministic. |
| `DRAW-INTERACT-006-PUBLIC-PRIVACY` | Pending Draw projection/event data includes only the revealed card and public preview, never a hand, future Draw order, RNG, checkpoint, or command metadata. |

Phase 3E-B binding: `phase3eb-draw-resolution.test.ts` executes the four canonical CAP draw
families through the production engine API, with the existing state-machine, yaku, replay, protocol,
and web interaction suites retaining the phase transition. Browser choreography from the top card of
the deck is deliberately deferred to Phase 3E-C.

## 20. Phase 3E-C physical Draw vectors

| ID | Required expectation |
|---|---|
| `DRAW-PHYSICAL-001-TOP-SOURCE` | One face-down CardView starts at the geometry-only foremost draw-pile bounds and travels to Reveal; all other hidden pile backs remain stable. |
| `DRAW-PHYSICAL-002-FACE-DOWN-FLIP` | The moving card remains face-down during travel, flips only in Reveal, and no face-down CardId or future draw order reaches text/semantic output. |
| `DRAW-PHYSICAL-003-PAUSE-THEN-INPUT` | Draw, flip, and identify-pause frames expose no semantic Draw control; after settlement exactly one keyboard-accessible Reveal control appears and reuses the authoritative 3E-B interaction flow. |
| `DRAW-PHYSICAL-004-MODES-REPLAY` | Normal, Fast, Instant, and reduced-motion modes settle to the same authoritative pending Draw state; the four 3E-B resolution families and replay contract remain unchanged. |
| `DRAW-PHYSICAL-005-ROOT-PAGES` | Root and repository-prefixed browser traces capture travel, pause, and actionable Reveal checkpoints with one canvas, 48 persistent CardViews, and zero browser/network errors. |

Phase 3E-C binding: `animation-runtime.test.ts` and `local-round-runtime.test.ts` bind the exact
geometry/identity/face contract; the root and Pages browser smoke traces inspect travel, pause, and
keyboard activation artifacts under `output/phase-3e-c/e2e/`. ADR 0020 records the presentation-only
boundary.

## 21. Phase 3F-A simplified-table vectors

| ID | Required expectation |
|---|---|
| `SHELL-3FA-001-DECLUTTER` | No visible routine phase/status, initial-ready recap, or Confirm/Cancel strip remains; hidden accessible turn feedback and Bank/Koi-Koi controls remain. |
| `SHELL-3FA-002-HAND-PROMINENCE` | The removed canvas action strip is reassigned to Player Hand, materially enlarging all eight cards while field, Draw, Reveal, captures, and opponent geometry remain contained. |
| `SHELL-3FA-003-OPTIONS-ESSENTIALS` | Options contains themes, deck, fullscreen, restart, and close; Play style, Motion, Faster, and Finish are absent and unfocusable. |
| `SHELL-3FA-004-AUTO-REDUCED-MOTION` | Production uses normal animation with no manual motion chooser and automatically follows `prefers-reduced-motion` without changing game state. |
| `SHELL-3FA-005-AUTHORITY-PRESERVED` | Legal card/field targets, Draw resolution, Escape cancellation, Bank/Koi-Koi, one canvas, and 48 persistent CardViews retain their established authority and identity contracts. |
| `SHELL-3FA-006-ROOT-PAGES` | Root and repository-prefixed seven-viewport traces show contained enlarged hands, bottom Options, unchanged dense field capacity, and zero browser/network errors. |

Phase 3F-A binding: `board-layout.test.ts`, `input-runtime.test.ts`, and
`phase3db-interaction.test.ts` bind geometry and interaction regressions. The root and Pages browser
gate binds the shell, automatic reduced-motion behavior, real Hand/Draw play, and artifacts under
`output/phase-3f-a/e2e/`. ADR 0021 records the presentation-only scope.

## 22. Phase 3F-C visual-interaction-cue vectors

| ID | Required expectation |
|---|---|
| `VISUAL-3FC-001-SOURCE` | Selecting a legal Hand or settled Reveal source gives exactly that source a durable, visibly distinct selected treatment; unrelated cards do not resemble a selected source. |
| `VISUAL-3FC-002-LEGAL-TARGETS` | A pair exposes one, exact-two exposes two, and a sweep exposes three legal field targets. Legal targets remain visibly distinct from the selected source and every other field card. |
| `VISUAL-3FC-003-NO-MATCH-FIELD` | A no-match source makes the actual field the clear tap destination without implying strategic field coordinates, restoring empty-slot chrome, or exposing visible Confirm/Cancel controls. |
| `VISUAL-3FC-004-REVEAL-ACTIONABLE` | Draw remains unavailable through travel, flip, and identify pause; after settlement the visible Reveal card is an actionable selected source and reuses the same authoritative target/field-destination language. |
| `VISUAL-3FC-005-DECLUTTERED-CUES` | Routine phase/status/instruction/Confirm/Cancel chrome remains absent; cue copy and visual treatment do not cover selected or target cards, and field readability remains intact. |
| `VISUAL-3FC-006-THEME-RESPONSIVE` | Ink & Parchment, Moonlit Indigo, and Warm Ivory preserve cue meaning at mobile, landscape, and desktop widths without changing theme-neutral selection, legal targets, authority, or CardView identity. |
| `VISUAL-3FC-007-INPUT-PARITY` | Pointer and keyboard retain equivalent source/target/field activation, Escape cancellation, accessible names, and focus; Bank/Koi-Koi remain the only ordinary explicit decision buttons. |

Phase 3F-C binding: focused interaction semantics retain the trusted public-preview tests. Root and
repository-prefixed browser traces prove selected source, unique target, no-match field destination,
settled Reveal source, theme persistence, seven-viewport containment, and zero browser/network
errors. Semantic target and field-destination overlays must remain keyboard-addressable and named,
but have no pointer-visible DOM border, background, outline, or shadow; Pixi owns the visible cue.
Artifacts are written under `output/phase-3f-c/e2e/`, including
`source-selected-pair-target-390x844[-pages].png`,
`no-match-field-destination-390x844[-pages].png`,
`draw-reveal-selected-390x844[-pages].png`, and the existing per-theme mobile/desktop captures.
ADR 0022 records the presentation-only scope.

## 23. Phase 3F-D placement and capture choreography vectors

| ID | Required expectation |
|---|---|
| `CHOREO-3FD-001-NO-MATCH-HAND` | A no-match Hand source travels directly from Hand to its final automatic field slot; it never overlays an unrelated field card. |
| `CHOREO-3FD-002-NO-MATCH-REFLOW` | Existing field cards first reflow to prepare the final automatic slot, then the no-match source travels directly into that opening without crossing another card. |
| `CHOREO-3FD-003-PAIR-HAND` | A Hand pair source uses the first authoritative `captureStarted.targetFieldCardIds` card as its offset overlap anchor, holds 150–200ms, then source and target collect. |
| `CHOREO-3FD-004-PAIR-DRAW` | After Reveal is tapped, a Draw pair uses the same source-over-target hold and collection language as a Hand pair. |
| `CHOREO-3FD-005-EXACT-TWO` | The chosen exact-two target supplied by `captureStarted` is the only overlap anchor; the browser never recomputes a match. |
| `CHOREO-3FD-006-SWEEP` | A three-target sweep anchors the source on the first public target; all three targets remain spatially still during the hold and all four cards collect. |
| `CHOREO-3FD-007-DRAW-PRE-TAP-AND-MOTION` | `drawResolutionRequired` produces no target pulse or movement before the Reveal tap; Normal and Reduced Motion settle to the identical authoritative final projection. |

Phase 3F-D binding: `animation-runtime.test.ts` covers the public planner/frame contracts for
Hand/Draw 0/1/2/3 resolution families, frozen anchor data, target immobility, and final parity. Root
and Pages browser traces write `no-match-direct-field-travel-390x844[-pages].png` and
`hand-pair-overlap-hold-390x844[-pages].png` under `output/phase-3f-d/e2e/`; Draw evidence retains
the top-card/reveal trace and asserts there is no active movement before the player taps Reveal.
ADR 0023 records the presentation-only boundary.

## 24. Phase 3F-E utility-dock and capture-cleanup vectors

| ID | Required expectation |
|---|---|
| `UTILITY-3FE-001-DOCK-ORDER` | The only ordinary bottom-safe utility controls are History, Yaku Guide, and Options in that left-to-right DOM and visual order. They remain below the game frame at all supported viewports and are unavailable only under existing critical gameplay locks. |
| `UTILITY-3FE-002-HISTORY` | History opens a modal/dialog containing the complete public ordered recap. It changes neither authoritative state nor card identity, is mutually exclusive with the other utility dialogs, Escape closes it, and focus returns to History. Retired inline recap content has no visible footprint in routine play. |
| `UTILITY-3FE-003-YAKU-GUIDE-COMPLETE` | Yaku Guide is a read-only reference, not a tutorial or current-board evaluator. It contains exactly the canonical thirteen yaku — Five Brights, Four Brights, Four Brights with Rain, Three Brights, Blossom Viewing, Moon Viewing, Animal Trio, Red Text Scrolls, Blue Scrolls, Current-Month Set, Animals, Scrolls, and Plain Cards — each with a short rules/points explanation and an example image. |
| `UTILITY-3FE-004-UTILITY-FOCUS` | History, Yaku Guide, and Options are mutually exclusive modal surfaces; opening one closes none implicitly because another cannot be opened while one is active. Escape/close restores focus to the initiating control, preserves current game state, and does not unlock a critical decision. |
| `UTILITY-3FE-005-DECLUTTER` | No routine hand count/point suffix, capture-category zero, or standalone Reveal label is visible. Field/card actionability and required accessible names remain intact; no old inline recap or instruction strip returns. |
| `UTILITY-3FE-006-CAPTURE-GALLERY` | A nonempty public capture rail opens only its owner’s current public cards. Every gallery face has the regular 5:8 aspect ratio (computed ratio near 0.625), object-fit card artwork, and a visible light/white frame; it does not stretch the card or disclose hidden order/identity. |
| `UTILITY-3FE-007-PRIVACY-IDENTITY` | All utility and capture dialogs preserve one canvas, the 48 persistent CardViews, current authoritative state, and recipient-safe text projection. They expose neither opponent hand identity, draw order, RNG, checkpoint, nor command IDs. |
| `UTILITY-3FE-008-ROOT-PAGES-RESPONSIVE` | Root and repository-prefixed Pages traces cover seven baseline responsive viewports plus focused 390×844 and 844×390 dialog/capture checks, with no clipping, browser/network errors, or utility order change. |

Phase 3F-E binding: focused utility-guide presentation tests and root/Pages production smoke prove
the exact dock order, modal/focus behavior, thirteen-guide content/example images, capture-card
geometry/frame, decluttered DOM/canvas labels, privacy, persistent-card identity, and responsive
containment. Artifacts are written under `output/phase-3f-e/e2e/`. ADR 0024 records the
presentation-only boundary; Phase 5A retains ordered per-yaku scoring evidence in expanded results.

## 25. Phase 3F-F interaction-clarity and card-inspection vectors

| ID | Required expectation |
|---|---|
| `VISUAL-3FF-001-GOLD-SEMANTICS` | An actively selected Hand or settled Reveal source and every legal field capture target use the same yellow-gold semantic family. Source and target remain distinguishable by geometry/layering, not by blue-versus-yellow meaning. |
| `VISUAL-3FF-002-GLOW-STRENGTH` | Selected-source, legal-target, and legal field-destination cues are at least 20% stronger than the Phase 3F-C baseline through stable normalized cue tokens (opacity, blur/spread, or stroke), while noninteractive cards remain unchanged. |
| `VISUAL-3FF-003-NO-MATCH-DESTINATION` | A selected no-match Hand or settled Reveal source makes the actual field an unambiguous yellow-gold placement destination. It restores neither empty slots/numbering nor routine text instructions, Confirm/Cancel, or unrelated-card overlay choreography. |
| `VISUAL-3FF-004-REVEAL-PARITY` | A settled Draw Reveal source uses the same selected and gold-target language as a Hand source. Before the player selects Reveal, a pending Draw causes no target pulse or movement; the authoritative Draw-resolution flow remains unchanged. |
| `VISUAL-3FF-005-PHASE-HELP` | A top-right optional help control opens a read-only contextual dialog derived solely from the current public observation, existing legal actions, and current presentation selection. It explains the next permitted interaction without creating an intent, evaluating strategy/current Yaku, or acting as onboarding. |
| `VISUAL-3FF-006-CARD-INSPECT` | A 450–500ms press on a face-up public Field card or the local player’s Hand card opens a larger regular 5:8 inspector with only public factual card information. Short tap preserves normal play; early release, drag beyond 8px, cancellation, state/animation change, or dialog opening prevents inspection. |
| `VISUAL-3FF-007-A11Y-INPUT` | Help and inspector controls have accessible names, native-dialog focus/Escape/focus-return behavior, and explicit mutual exclusion with History, Yaku Guide, Options, capture inspection, and critical decisions. Keyboard/context-menu inspection has the same zero-intent behavior as long press; existing source/target pointer and keyboard activation plus Escape cancellation remain equivalent. |
| `VISUAL-3FF-008-THEME-RESPONSIVE-PRIVACY` | Root and repository-prefixed Pages traces cover seven baseline viewports plus focused 390×844 and 844×390 checks across all themes. They retain one canvas, 48 persistent CardViews, containment, no browser/network errors, and recipient-safe text: no opponent-hand identity, hidden Draw/deck identity or order, RNG, checkpoint, or command ID reaches help or inspector. |

Phase 3F-F binding: cue-token/interaction tests and root/Pages production smoke prove selected-source
and target gold semantics, stronger legal field destination, settled Reveal parity with no pre-tap
movement, contextual help, and privacy-safe card inspection. Focused artifacts are written under
`output/phase-3f-f/e2e/`. This remains presentation/input only: no engine, protocol, replay, scoring,
or result-evidence authority changes. Phase 5A alone records ordered, exact yaku-card evidence at
formation time for expanded end-of-play details.

## 26. Approved-decision coverage matrix

| Decision | Required fixture coverage |
|---|---|
| R-001 | `DEAL-002`–`DEAL-004`, `HIST-CANCELLATION-EVIDENCE` |
| R-002 | `DEAL-005`–`DEAL-010`, `TRANS-LUCKY-1X-LOSER-STARTS-PRIVILEGE` |
| R-003 | `DEAL-011`, `DEAL-012-BOTH-LUCKY-EVIDENCE`, `HIST-LUCKY-EVIDENCE`, projection fixtures |
| R-004 | All Bright fixed/upgrade fixtures and `YAKU-BRIGHT-INDEPENDENT-STACK-020` |
| R-005 | `YAKU-MULTI-NEW-ONE-DECISION`, `KOI-008` |
| R-006 | `KOI-006`, `KOI-009` |
| R-007 | Current-Month fixed, accumulated, and sweep fixtures |
| R-008 | `KOI-010`, `KOI-011`, `KOI-014`, `END-PLAY-001-SIXTEEN-TURNS-EIGHT-UNUSED` |
| R-009 | Reachable `KOI-012A`–`KOI-014` and `KOI-016` final-draw traces; `KOI-015A/B` unreachable-provenance rejection |
| R-010 | All `FINAL-LEADER-*`, `FINAL-OPPONENT-*`, and `FINAL-TIE-*` fixtures |
| R-011 | `TRANS-JANUARY-ZERO-ALTERNATES`, `TRANS-LATER-ZERO-PRESERVES`, `TRANS-ZERO-CLEARS-PRIVILEGE` |
| R-012 | All `TRANS-PRIVILEGED-*` and `TRANS-PRIVILEGE-*` traces, plus defensive privilege-provenance rejection in `KOI-015A/B` |
| R-013 | All `FINAL-MONTH-*` fixtures |
| R-014 | Scroll fixed, incremental, seven-Scroll, and no-combined-bonus fixtures |

## 20. Binding gates

Phase 0C completed:

- every referenced card has a canonical `CardId`;
- validation proves exactly 48 unique cards and four per month;
- Sake Cup and Rain Bright metadata are exact;
- concrete vector references and machine-readable subsets use canonical IDs.

Phase 1 must:

- implement the fixture schema and scenario runner;
- make every reachable vector executable and deterministic;
- execute intentionally malformed or rules-unreachable vectors as literal validation-rejection
  assertions without evaluating gameplay policy on invalid state;
- include vector IDs in test names and failure output;
- report the RNG seed and state/command trace on failure;
- run invariant checks after every accepted command;
- make canonical serialization/hash versions explicit in replay/protocol artifacts and reject
  unsupported versions or tampered replay boundaries.

Phase 2 presentation/art gates must:

- keep technical fixtures explicitly non-authoritative and non-final;
- run browser validation against both root and repository-prefixed production bases;
- make each stable `INPUT-*` and `ART2E-*` expectation executable or bind it to a named browser/
  release assertion with actionable failure output;
- keep the local Workshop and authored source pipeline absent from production builds;
- reject Phase 2E release until complete assets and exact current owner evidence exist.
