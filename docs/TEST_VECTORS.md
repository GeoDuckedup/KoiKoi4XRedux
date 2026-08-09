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

## 10. Approved-decision coverage matrix

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

## 11. Binding gates

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
