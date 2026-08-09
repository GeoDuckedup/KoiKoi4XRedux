# KoiKoi4x Canonical Rules

**Rules version:** 1.0  
**Locked:** August 8, 2026  
**Status:** Approved Phase 0A baseline

This document is the concise gameplay authority for KoiKoi4x. It incorporates the owner-approved decisions in [`RULES_DECISIONS.md`](./RULES_DECISIONS.md). When a legacy implementation or a broader design note disagrees with this file, this file and its locked test vectors win.

## 1. Terminology

Use these terms in new code, tests, diagnostics, and primary player-facing copy:

| Concept | Canonical term | Identifier guidance |
|---|---|---|
| High-value category | Bright | `bright` |
| Animal/object category | Animal | `animal` |
| Illustrated strip category | Scroll | `scroll` |
| Basic category | Plain | `plain` |
| Secure the current score | Bank | `bank` |
| Continue and raise stakes | Koi-Koi | `koiKoi` |
| Current stakes | Table multiplier | `tableMultiplier` |
| A scoring combination | Yaku | `yaku` |

Ribbon, Chaff, Seed, Light, Basic, and Pass are legacy/traditional aliases only. They may appear in historical notes or secondary rulebook explanations, not as the primary new-game vocabulary.

Canonical stages are:

- **Match:** the complete competition across the configured scheduled months.
- **Round:** one deal and scoring result identified by a scheduled month.
- **Round Setup:** fresh shuffle/deal, starter establishment, and automatic opening checks.
- **Starter:** player who takes the first turn of the round.
- **Turn:** one player's Hand Phase and Draw Phase opportunity.
- **Hand Phase:** play a hand card, resolve placement/capture, then perform a Yaku Check.
- **Draw Phase:** reveal a draw-pile card, resolve placement/capture, then perform a Yaku Check.
- **Capture Resolution:** resolve zero, one, two, or three same-month field matches.
- **Yaku Check:** recalculate active yaku and identify newly completed trigger keys.
- **Yaku Decision:** one combined Bank/Koi-Koi choice for all new yaku from one phase.
- **End of Play:** both eight-card hands are empty after the final Draw Phase.
- **Round Result:** scored, no-score, cancelled, or lucky-hand outcome.
- **Round Transition:** explanation, history, next starter/privilege, and movement to the next scheduled month.

## 2. Deck and scheduled months

- The deck contains exactly 48 unique cards: four cards in each of twelve months.
- Cards capture by matching month, never by category.
- Each card has exactly one primary category: Bright, Animal, Scroll, or Plain.
- The September Sake Cup is an Animal only. It never also counts as Plain.
- The November Rain Bright is explicitly marked for Bright-tier evaluation.
- Card identity and rules metadata are independent from artwork, filenames, crops, textures, and deck-package selection.

| Round | Scheduled month | Flower |
|---:|---|---|
| 1 | January | Pine |
| 2 | February | Plum Blossom |
| 3 | March | Cherry Blossom |
| 4 | April | Wisteria |
| 5 | May | Iris |
| 6 | June | Peony |
| 7 | July | Bush Clover |
| 8 | August | Pampas Grass |
| 9 | September | Chrysanthemum |
| 10 | October | Maple |
| 11 | November | Willow |
| 12 | December | Paulownia |

Three- and six-round matches, when enabled, still start in January and advance in order. The configured last round is the final scheduled round for final-round rules.

## 3. Round Setup and opening outcomes

For a normal deal:

- Shuffle a fresh 48-card deck with the authoritative deterministic random source.
- Deal eight cards to each player and eight face-up cards to the field.
- The remaining 24 cards form the draw pile.
- Reset captures, yaku-seen keys, first-yaku tracking, most recent Koi-Koi caller, and the table multiplier.
- Start the table at 1×.
- Establish and record the starter before checking opening outcomes.

Evaluate opening outcomes in this strict order:

1. Initial-field complete-month cancellation.
2. Lucky starting hands.
3. Normal play.

### 3.1 Initial-field complete-month cancellation

If the initial field contains all four cards from any month:

- Cancel that scheduled round immediately at 0–0.
- Do not redeal or replay the scheduled month.
- Do not inspect, score, or reveal either player's lucky-hand eligibility.
- Record every complete field month when the eight-card field contains two complete months.
- Preserve the triggering field cards as public history evidence.
- Apply the no-score next-starter rule and clear any unconsumed special 2× privilege.
- If this is the final scheduled month, end the match without a replacement month.

### 3.2 Lucky starting hands

A starting eight-card hand is lucky when it contains either:

- at least one complete four-card month; or
- exactly four distinct month pairs with count distribution `[2,2,2,2]`.

Rules:

- Either condition produces one automatic 6-point award at a 1× scoring multiplier.
- More than one complete month in the same hand still produces only one 6-point award.
- Lucky-hand cards are dealt cards, not captured cards, and score no capture-area yaku.
- A one-player lucky result has no Bank/Koi-Koi decision.
- If both players have any lucky condition, the round is an automatic 0–0 draw.
- A one-player lucky win is a 1× scored result for next-starter and special-privilege purposes.
- The final-round forced-Koi rule does not apply to lucky results.
- A final-scheduled-month lucky winner receives 6 points and the match ends; a both-lucky draw ends the match at 0–0.

After the automatic result is committed:

- Reveal the qualifying player's complete starting hand and identify the qualifying pattern.
- Reveal and explain both complete hands for a both-lucky draw.
- Show `6 × 1× = 6` for a winner, or 0–0 for both-lucky.
- Explain the next-starter/privilege consequence.
- Preserve the evidence and explanation in round history.

Private lucky-hand evidence must remain hidden before the automatic result is committed.

## 4. Turn and capture rules

A normal turn is:

```text
Hand Phase
  → Capture Resolution
  → Yaku Check
  → optional Yaku Decision
  → Draw Phase
  → Capture Resolution
  → Yaku Check
  → optional Yaku Decision
  → turn ends
```

- Banking after the Hand Phase ends the round immediately; no Draw Phase occurs.
- Calling Koi-Koi after the Hand Phase resumes the Draw Phase.
- The draw reveal acknowledgement is presentation behavior, not a separate gameplay rule.

For a played or drawn card:

- **Zero matches:** place the card on the field.
- **One match:** capture the played/drawn card and the one matching field card.
- **Two matches:** the active player chooses one matching field card; capture that pair and leave the other match.
- **Three matches:** capture the played/drawn fourth card and all three same-month field cards. This action is a **Four-Card Sweep**.

Field coordinates and slots have no strategic meaning.

## 5. Yaku and scoring

### 5.1 Fixed yaku

| Trigger key guidance | Yaku | Requirement | Points |
|---|---|---|---:|
| `fiveBrights` | Five Brights | All five Brights | 10 |
| `fourBrights` | Four Brights | Four Brights without Rain | 8 |
| `fourBrightsWithRain` | Four Brights with Rain | Four Brights including Rain | 7 |
| `threeBrights` | Three Brights | Three Brights without Rain | 5 |
| `blossomViewing` | Blossom Viewing | March Cherry Curtain + September Sake Cup | 5 |
| `moonViewing` | Moon Viewing | August Moon + September Sake Cup | 5 |
| `animalTrio` | Animal Trio | June Butterfly + July Boar + October Deer | 5 |
| `redTextScrolls` | Red Text Scrolls | January, February, and March text Scrolls | 5 |
| `blueScrolls` | Blue Scrolls | June, September, and October blue Scrolls | 5 |
| `currentMonthSet` | Current-Month Set | All four cards from the scheduled month in captures | 5 |

### 5.2 Incremental yaku

| Trigger key guidance | Yaku | Threshold | Threshold points | Additional cards |
|---|---|---:|---:|---:|
| `animals` | Animals | 5 | 3 | +1 per Animal above 5 |
| `scrolls` | Scrolls | 5 | 1 | +1 per Scroll above 5 |
| `plainCards` | Plain Cards | 10 | 1 | +1 per Plain above 10 |

Only reaching the threshold creates the incremental yaku's trigger. Later point increases do not create another trigger or Yaku Decision.

### 5.3 Bright hierarchy

- The four Bright tiers are distinct trigger keys.
- Only the highest currently applicable Bright tier contributes points.
- Lower Bright tiers are replaced, not added, when a higher tier becomes active.
- Reaching a higher tier is a new completion and may open another Yaku Decision.
- Three total Brights including Rain do not satisfy Three Brights.

### 5.4 Independent stacking

Independent yaku stack even when they share cards:

- Animal Trio stacks with Animals.
- Named Scroll yaku stack with generic Scrolls.
- Moon Viewing and Blossom Viewing may stack with each other and with a Bright tier.
- Current-Month Set stacks with every other qualifying yaku.
- All five Brights plus the Sake Cup score 20: Five Brights 10 + Moon Viewing 5 + Blossom Viewing 5.

Scroll rules are exact:

- Red Text Scrolls score 5.
- Blue Scrolls score 5.
- Generic Scrolls score 1 at five, 2 at six, 3 at seven, and so on.
- There is no additional combined Red + Blue bonus.
- Seven Scrolls containing both named sets score 13 across three active yaku.

### 5.5 Current-Month Set versus Four-Card Sweep

- Current-Month Set is accumulated in the capture area across any number of turns.
- The four cards need not be captured together.
- Four cards from a nonscheduled month do not qualify.
- Four-Card Sweep describes only the capture action that takes all four same-month cards together.
- A scheduled-month Four-Card Sweep also completes Current-Month Set.

## 6. Yaku triggers and decisions

A Yaku Decision occurs only when one or more previously unseen trigger keys appear during the current phase's Yaku Check.

- Mark all new keys seen when the decision window is created.
- Several new yaku in one phase produce one combined decision showing every new yaku.
- The complete current active-yaku total is offered for Banking, not merely the newly completed points.
- Hand Phase and Draw Phase are separate resolution windows.
- A player may call Koi-Koi after a Hand-Phase decision and receive a second decision if the Draw Phase completes a different unseen yaku.
- An already seen fixed trigger never repeats in the same round.
- Incremental increases above a count threshold never retrigger.

## 7. Bank, Koi-Koi, and the special 2× privilege

### 7.1 Bank

- End the round immediately.
- Award only the Banking player:

```text
current active-yaku total × applicable scoring multiplier
```

- Banking after the Hand Phase skips the Draw Phase.

### 7.2 Koi-Koi

- Continue the round.
- Set the caller as the most recent Koi-Koi caller.
- Raise the table multiplier by one, capped at 4×.
- Calling at 4× keeps the table at 4× but still changes the most recent caller.
- Resume the Draw Phase after a Hand-Phase call; otherwise complete the turn when play remains.

### 7.3 Special first-yaku 2× privilege

After a player wins at a 1× scoring multiplier, the losing player starts the next scheduled month with a next-round-only privilege.

If that player creates their first yaku trigger while the table is still 1×, they may:

- Bank with `tableMultiplierAtDecision = 1` and `scoringMultiplier = 2`; or
- call Koi-Koi and move the actual table directly from 1× to 3×.

The score and next-starter rule use the scoring multiplier. A privileged 2× Bank does not change the visible table and does not grant another special privilege. The privilege is consumed when used, cleared when the round ends for any reason, and lost if the table leaves 1× before the eligible player's first trigger.

## 8. End of Play and final-draw decisions

A normal round reaches End of Play when both eight-card hands are empty:

- Each player can take eight complete turns, for sixteen turns total.
- Sixteen draw cards have been revealed.
- Eight draw-pile cards remain unused, unrevealed, and discarded.
- The draw pile is not exhausted.

After the final Draw Phase:

- Resolve any new Yaku Decision before End of Play scoring.
- If at least one Koi-Koi call occurred, the most recent caller scores their current active-yaku total at the current table multiplier.
- Otherwise the round ends 0–0.
- The scorer need not be the player who took the final turn.

A final-draw Koi-Koi is legal:

- At 1×, 2×, or 3× it raises the table and immediately scores the new caller at the resulting multiplier.
- At 4× it leaves the multiplier at 4× but still updates the most recent caller before immediate scoring.
- A special 2× privilege belongs only to the next round's starter. Since turns alternate and the
  final Draw is taken by turn 16's nonstarter, the privilege cannot apply to a final-Draw Yaku
  Decision. Final-draw Bank/Koi-Koi options use the ordinary table rule unless another independent
  restriction applies.
- A protected final-round leader who creates the round's first trigger at an applicable 1× Bank multiplier is still forced to call Koi-Koi, then End of Play resolves immediately.

## 9. Round transition and match completion

After a scored round:

- A 1× or 2× winner causes the loser to start the next scheduled month.
- A 3× or 4× winner starts the next scheduled month.
- Only a 1× scored result grants the losing next starter the special privilege.
- Use `scoringMultiplier`, not the visible table value, for these rules.

After a cancelled or other 0–0 round:

- Advance to the next scheduled month without a replay.
- Clear any unconsumed special privilege.
- January 0–0 alternates: the opposite player from January's recorded starter begins February.
- February through November 0–0 preserves that round's starter for the next month.
- No next starter is assigned after the final scheduled month.

### 9.1 Final-round leader rule

- Freeze the match leader at the start of the configured final scheduled round.
- A tie protects neither player.
- Force that frozen leader to Koi-Koi only if they create the first yaku-triggering event of the entire round and their applicable Bank multiplier is 1×.
- If the opponent creates the first trigger, the restriction is consumed and never affects the leader later.
- A special 2× privilege permits the leader to Bank.
- Do not recalculate protected-leader identity during the round.

### 9.2 Final scheduled month

The match ends after every final-month result, including:

- field cancellation;
- both-lucky draw;
- natural 0–0 End of Play;
- lucky-hand 6-point win;
- ordinary Bank or End-of-Play score.

Never create a replacement or thirteenth month.

At match completion, sum all recorded round points. Higher total wins; equal totals are a tied match.

## 10. Required result history

Every scheduled round creates one durable history record, including automatic and no-turn outcomes. Record at least:

- scheduled month and round number;
- starter;
- result type and explicit reason code;
- points for each player;
- active yaku and score arithmetic when applicable;
- table multiplier at decision;
- scoring multiplier;
- public evidence for cancellations/lucky hands;
- next starter and privilege consequence when another round remains.

Canonical reason codes include:

- `BANKED_SCORE`
- `END_OF_PLAY_LAST_KOI_CALLER`
- `END_OF_PLAY_NO_SCORE`
- `FIELD_FOUR_MONTH_CANCELLED`
- `LUCKY_FOUR_MONTH`
- `LUCKY_FOUR_PAIRS`
- `BOTH_LUCKY_DRAW`

Automatic and cancelled outcomes must never advance silently.

## 11. Engine invariants

After every accepted command:

- Every card exists in exactly one authoritative zone.
- No card appears twice and the total remains 48.
- Only the active player may issue gameplay commands.
- A played hand card belonged to the actor before the command.
- A chosen capture target is legal.
- Player observations contain no opponent private hand or unrevealed deck order.
- Score and multiplier values remain valid and non-negative.
- State version increases exactly once.
- The same initial state, RNG state, and command list reproduce the same result.

## 12. Deferred nonblocking decisions

The following do not affect Phase 1 engine implementation and remain outside this rules lock:

- asynchronous round acknowledgement policy;
- closing/resuming during a multi-command online turn;
- final system-record storage policy;
- resignation and inactivity outcomes;
- final repository name and production host;
- initial deck skin and first-release Quick Match options;
- rematch starter and notification scope.

They must be resolved before their corresponding product or online phase, without changing the rules above unless an explicit owner-approved amendment is recorded.
