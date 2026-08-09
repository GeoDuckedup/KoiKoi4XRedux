# KoiKoi4x Rules and Product Decision Log

**Decision-log version:** 1.3  
**Owner approvals recorded:** August 8, 2026  
**Status:** All blocking engine-rule decisions from the package audit are resolved

This file records the approved edge-case behavior that supplements the main design document. The rules below are canonical. The coding AI must convert them into named fixtures and must not substitute legacy behavior where it differs.

---

# A. Approved canonical engine rules

## R-001 — Initial opening precedence

**Approved:** Evaluate the initial face-up field before lucky hands. If the field contains all four cards from any month, cancel that scheduled round at 0–0. Do not inspect, score, or reveal lucky hands from the invalidated deal. Record every complete field month if two complete months appear among the eight field cards.

## R-002 — Lucky-hand edge cases

**Approved:**

- A four-pairs lucky hand is exactly `[2,2,2,2]` across four distinct months.
- One or more complete four-card months in a starting hand produce one 6-point automatic award, never 6 points per month.
- If both players have any lucky condition, the round is a 0–0 automatic draw.
- Lucky-hand cards are not captured cards and do not also score ordinary capture-area yaku.
- A lucky-hand result is a 1× scored result for starter/privilege purposes, but it has no Bank/Koi-Koi decision.

## R-003 — Lucky-hand evidence and explanation

**Approved:** After the automatic result is committed, reveal the qualifying player’s entire eight-card starting hand. Visually group/highlight the complete month or four month-pairs, name the rule, show the 6-point arithmetic, explain the next-starter consequence, and preserve the evidence in round history. A both-lucky draw reveals and explains both hands.

## R-004 — Bright hierarchy and independent stacking

**Approved:**

- Three Brights, Four Brights, Four Brights with Rain, and Five Brights are distinct yaku and distinct trigger keys.
- Only the highest currently applicable Bright tier contributes Bright points; tiers do not add together.
- Reaching a higher tier is a new yaku completion and can create another Yaku Decision.
- Other independent yaku stack with the active Bright tier, even when sharing cards.
- All 5 Brights plus the September Sake Cup score at least 20: Five Brights 10 + Moon Viewing 5 + Blossom Viewing 5.
- Any additional qualifying Animals or Current-Month Set points also stack.

## R-005 — Several yaku in one phase

**Approved:** One capture resolution can complete several new yaku. Show every newly completed yaku together, mark all new trigger keys as seen, and open one combined Bank/Koi-Koi decision for that phase.

## R-006 — Two Yaku Decisions in one turn

**Approved:** The Hand Phase and Draw Phase are separate resolution windows. If the Hand Phase completes a new yaku and the player calls Koi-Koi, a different new yaku completed by the Draw Phase creates a second Bank/Koi-Koi decision in the same turn. This does not conflict with R-005: there is one decision per phase, not one decision per yaku.

## R-007 — Current-Month Set

**Approved:** Current-Month Set is a 5-point capture-area yaku completed by accumulating all four cards from the scheduled month at any time during that round. The cards do not need to be captured in one action. Use **Four-Card Sweep** only for the capture action that takes all four same-month cards at once.

## R-008 — End of Play

**Approved:** A normal round ends when both eight-card hands are empty. Each player can take eight two-phase turns, for sixteen total turns. Eight draw-pile cards normally remain unused and unrevealed. If there was at least one Koi-Koi call, the most recent caller scores at the current table multiplier; otherwise the result is 0–0.

## R-009 — Final-draw Koi-Koi

**Approved Option A:** A new yaku completed on the final Draw Phase still offers Bank or Koi-Koi. Calling Koi-Koi updates the most recent caller, raises the table by one up to 4×, and then immediately resolves End of Play. This is intentionally legal even though no further card play remains. At 4×, the call can still change the most recent caller.

## R-010 — Final-round leader scope

**Approved:** Freeze the match leader at the start of the final scheduled round. The forced-Koi rule applies only if that frozen leader creates the first yaku-triggering event of the entire round and their applicable Bank multiplier is 1×. If the opponent creates the first yaku, the restriction does not apply to the leader later. A special 2× privilege permits Banking. Tied matches protect neither player.

## R-011 — Starter after a 0–0 round

**Approved:**

- Do not replay the scheduled month.
- Clear any unconsumed special 2× privilege.
- For February through November, the player who started the 0–0 round also starts the next month.
- If January ends 0–0, the opposite player from the randomly selected January starter begins February.
- The January exception must be explicitly explained in the result presentation and history.

## R-012 — Special 2× privilege

**Approved:** A privileged Bank made while the visible table is 1× records `tableMultiplierAtDecision = 1` and `scoringMultiplier = 2`. The score and next-starter logic use 2×. The visible table does not become 2×, and the result does not grant another special privilege. Privileged Koi-Koi moves the actual table directly from 1× to 3×.

## R-013 — Final scheduled-month automatic outcomes

**Approved:** A cancellation, both-lucky draw, or natural 0–0 End of Play in the final scheduled month ends the match. A final-month lucky-hand winner receives 6 points and the match ends. There is no replacement or thirteenth month.

## R-014 — Scroll scoring

**Approved:**

- Red Text Scrolls = 5 points and one fixed yaku.
- Blue Scrolls = 5 points and one separate fixed yaku.
- Generic Scrolls begin at 5 total Scrolls for 1 point, then +1 per additional Scroll.
- Cards beyond 5 increase that one incremental yaku and do not create new yaku triggers.
- There is no combined Red + Blue bonus.
- Seven total Scrolls containing both named sets score 13 across three active yaku.

---

# B. Canonical terminology

## B-001 — Card and action terms

| Concept | Canonical term | New-code identifier |
|---|---|---|
| High-value category | Bright | `bright` |
| Animal/object category | Animal | `animal` |
| Illustrated strip category | Scroll | `scroll` |
| Basic category | Plain | `plain` |
| Secure the current score | Bank | `bank` |
| Continue and raise stakes | Koi-Koi | `koiKoi` |

Ribbon, Chaff, Seed, and Pass may appear only as secondary legacy/traditional aliases in the rulebook or legacy review notes.

## B-002 — Stages of play

| Term | Definition |
|---|---|
| Match | Complete competition across configured scheduled months |
| Round | One deal and scoring result, identified by a scheduled month |
| Round Setup | Fresh shuffle/deal plus automatic opening checks |
| Starter | Player who takes the round’s first turn |
| Turn | One player’s complete Hand Phase and Draw Phase opportunity |
| Hand Phase | Play one hand card, resolve capture/placement, then Yaku Check |
| Draw Phase | Reveal one draw-pile card, resolve capture/placement, then Yaku Check |
| Capture Resolution | Resolve zero/one/two/three same-month matches |
| Yaku Check | Recalculate active yaku and identify new triggers |
| Yaku Decision | One combined Bank/Koi-Koi choice for new yaku from one phase |
| End of Play | Both hands empty after the final Draw Phase |
| Round Result | Scored, no-score, cancelled, or lucky-hand outcome |
| Round Transition | Explanation, recap, next starter/privilege, and move to next month |

---

# C. Required named-test clarifications

The Phase 0A test-vector pack must include all approved rules above and expressly test:

- field cancellation taking precedence over lucky hands;
- two complete field months;
- one lucky award for a hand containing more than one complete month;
- full evidence reveal after automatic result commit;
- Bright-tier replacement and trigger history;
- Five Brights + Sake Cup = 20;
- one phase / several yaku / one decision;
- one turn / two phases / two decisions;
- Current-Month Set accumulated across turns;
- sixteen-turn natural completion with eight unused draw cards;
- final-draw Koi-Koi at 1×–3× and at 4×;
- the invariant that the starter-only special 2× privilege cannot belong to turn 16's nonstarter
  final-Draw actor;
- final-draw interaction with the final-round forced-Koi rule;
- January 0–0 starter alternation;
- later 0–0 starter preservation;
- special 2× table/scoring multiplier separation;
- final scheduled-month automatic outcomes;
- a 1× lucky-hand win granting the loser the next starter and special privilege;
- all Scroll scoring thresholds and stacking.

---

# D. Remaining nonblocking product and online decisions

These items do not block the headless engine. They should be decided before their corresponding product/backend phase:

## O-001 — Asynchronous round acknowledgement

**Recommendation pending approval:** The server advances immediately after a round result. Watching/acknowledging the result is local presentation state; do not require both players to press Ready.

## O-002 — Closing during a multi-command turn

**Recommendation pending approval:** Preserve the authoritative pending phase and let the same player resume later. Do not unlock the opponent until the turn or round reaches a stable boundary.

## O-003 — System timeline records

**Architecture accepted in Phase 1E:** Use `recordKind: "system"` and `actorId: null` for
cancellations, lucky hands, automatic transitions, and other records without a normal acting
player. `recordSequence` uniquely orders player and system records; exact Firebase persistence and
publication remain Phase 7 work.

## O-004 — Resignation

**Recommendation pending approval:** Resignation ends the match and marks the non-resigning player as winner without fabricating round points. Use an explicit `RESIGNATION` result.

## O-005 — Inactivity expiration

**Recommendation pending approval:** Archive an inactive match as expired/abandoned rather than awarding a scored win, unless a future competitive mode adds timeout forfeits.

## P-001 — Release and rematch choices

Still open:

- final repository name;
- initial deck skin;
- whether 3- and 6-round Quick Match ship in the first public release;
- whether a rematch randomizes the first starter or uses the previous result;
- PWA notification scope;
- production hosting choice while retaining static-build compatibility.
