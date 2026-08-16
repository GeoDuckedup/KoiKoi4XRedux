# KoiKoi4x Reimagined
## Product, Game, UX, and Technical Design Document

**Document version:** 1.6  
**Date:** August 8, 2026  
**Status:** Canonical greenfield baseline; blocking engine-rule decisions approved  
**Legacy reference repository:** [GeoDuckedup/HanafudaKoiKoi4x](https://github.com/GeoDuckedup/HanafudaKoiKoi4x)  
**New repository:** Separate repository to be created; the legacy repository must not be modified  
**Backend:** Separate, newly created Firebase project  
**Primary platform:** Responsive web application, mobile-first, installable/PWA-ready  
**Canonical product name:** **KoiKoi4x**

---

# 1. Document purpose and authority

This document defines the intended product, rules, user experience, architecture, development sequence, and acceptance gates for a complete rewrite of KoiKoi4x.

The companion `docs/DECK_ART.md` defines the authoring/import contract for replaceable card-art packages and is authoritative for deck-package workflow unless this design document is explicitly amended.

The rewrite is a **greenfield implementation**. The legacy game is useful as:

- a behavioral reference for the custom KoiKoi4x rules;
- a source of card metadata, artwork, theme ideas, CPU personality concepts, and known edge cases;
- an example of features that proved useful, such as turn recaps, current-game lists, reduced-motion support, and opponent-turn pacing;
- evidence of implementation problems that the new architecture must avoid.

The legacy code is **not** the new source of truth. Once the decisions and rule vectors in this document are approved, this document and the tests created from it become authoritative.

When this document conflicts with the legacy implementation:

1. An explicitly approved rule in this document wins.
2. Any future item marked **Owner decision required** must be resolved before the affected engine code is finalized.
3. The coding AI must not silently infer the answer from the legacy code.
4. No compatibility layer should be created unless this document is deliberately amended.

---

# 2. Greenfield mandate

## 2.1 Required reset

The project starts fresh with:

- a new GitHub repository;
- a new Firebase project;
- a new TypeScript codebase;
- a new save format;
- a new multiplayer protocol;
- a new deployment configuration;
- a new analytics property, if analytics is enabled;
- a new test suite;
- a new rules specification.

## 2.2 Explicitly excluded legacy work

The rewrite must not include:

- import or conversion of old save codes;
- import of old local saves;
- migration of old Firebase rooms or users;
- compatibility with old room links;
- support for partially completed legacy matches;
- preservation of old global JavaScript APIs;
- preservation of old DOM IDs or CSS selectors;
- preservation of old snapshot schemas;
- reuse of old Firebase security rules;
- a requirement to retain the old repository history in the new repository;
- a requirement to keep the old deployment URL working as the new game.

The new project should still version its own data formats from day one. “No legacy migration” does not mean “no versioning.”

## 2.3 Legacy asset policy

Artwork and audio may be copied selectively only after:

- verifying ownership or license;
- confirming the source image is the best available version;
- assigning a stable asset ID;
- documenting dimensions and crop rules;
- placing it in the new asset pipeline;
- confirming it is not coupled to the legacy sprite-sheet layout.

Do not copy the legacy repository wholesale. Copy only reviewed assets and factual card data.

---


# 2A. Codex development orchestration

The repository must include a durable AI-development operating layer so substantial implementation work is consistently decomposed, delegated, integrated, and verified rather than depending on a one-off chat prompt.

The repository will contain:

```text
AGENTS.md
docs/PROJECT_MANIFEST.md
docs/AI_WORKFLOW.md
.codex/agents/
```

The authoritative division of responsibility is:

- **Primary/orchestrator agent:** owns requirement interpretation, architecture, implementation ownership, cross-system integration, conflict resolution, definition of done, and the final verification result.
- **Engineering investigator/reviewer:** performs bounded exploration, execution-path tracing, architecture review, regression analysis, performance analysis, meaningful test design, and independent review.
- **Bounded worker/validator:** performs narrow inventories, searches, asset audits, coverage checks, repetitive/mechanical edits when expressly assigned, and build/test/lint/typecheck result validation.

The August 8, 2026 routing baseline is:

| Semantic role | Preferred Codex model | Typical reasoning effort |
|---|---|---|
| Primary/orchestrator or demanding implementation owner | `gpt-5.6-sol` | High; stronger effort only when justified |
| Engineering investigator/reviewer | `gpt-5.6-terra` | Medium to High |
| Bounded worker/validator | `gpt-5.6-luna` | Low to Medium |

These are model routes, not permanent product dependencies. If a listed model is unavailable, retired, or superseded, use the closest currently supported model matching the semantic role and continue the work.

## Delegation policy

For every substantial subphase, the primary agent must first assess whether delegation will materially improve speed, context efficiency, verification, or quality.

Prefer parallel subagents for independent, read-heavy work such as:

- codebase and dependency mapping;
- gameplay/system tracing;
- bug investigation;
- rules and state-machine review;
- UI/rendering review;
- asset/data audits;
- test coverage analysis;
- build/runtime validation;
- security/privacy review;
- documentation consistency checks.

Do not create subagents merely to increase agent count.

For tightly coupled code, use the principle:

> **Parallelize discovery; serialize integration.**

Multiple agents may investigate the same feature in parallel, but one clearly designated implementation owner should modify intertwined rules/state/event code unless isolated worktrees make the ownership boundaries genuinely independent.

Every delegated task must receive a bounded contract containing:

1. exact objective/question;
2. relevant scope, systems, or files;
3. read-only versus edit permission;
4. constraints that must be preserved;
5. evidence/validation required;
6. exact result expected back by the primary agent.

The primary agent remains responsible for inspecting all delegated findings, reconciling contradictions, integrating changes, and verifying the combined result.

## Required substantial-work loop

Use this pattern when the task warrants it:

```text
understand
  → identify governing docs/acceptance criteria
  → decompose
  → parallel investigation where useful
  → implement with clear ownership
  → integrate
  → test/build/lint/typecheck
  → runtime/playtest when possible
  → independent review when justified
  → repair
  → final verification
  → update durable project status/docs
```

Substantial game changes should verify observable player behavior when the environment can actually run the game. Static inspection or compilation alone must not be described as gameplay validation.

The detailed operating policy lives in `docs/AI_WORKFLOW.md`. `AGENTS.md` must remain concise and point agents to the authoritative workflow and project manifest.

---

# 3. Product vision

## 3.1 Product statement

**KoiKoi4x is a two-player Hanafuda strategy game that makes an unfamiliar card tradition understandable to Western newcomers while emphasizing the tension of deciding whether to bank a scoring set or keep playing and raise the table as high as 4×.**

## 3.2 Elevator pitch

Match cards by month, capture valuable combinations called yaku, and choose whether to secure your points or call Koi-Koi. Each Koi-Koi call raises the stakes, creating a readable escalation from 1× to 4× across a twelve-round match.

## 3.3 Product pillars

### Pillar A — Learn by playing

A first-time player should understand the basic turn loop and the Bank/Koi-Koi decision through a short scripted lesson, without reading a manual first.

### Pillar B — Cards behave like physical objects

Cards should persist on the table and visibly move from hand to field, into a match, and into the correct capture collection. The player should be able to follow every state change through motion.

### Pillar C — The 4× risk is always legible

The current multiplier, possible banked score, and consequence of calling Koi-Koi must be understandable before every decision.

### Pillar D — Opponents play fairly

CPU opponents must never inspect hidden information they are not entitled to know. Online clients must never receive the opponent’s private hand or the complete deck order.

### Pillar E — Asynchronous multiplayer still feels alive

A remote player may complete a turn while the recipient is offline. When the recipient returns, the completed turn should animate on their table before their controls unlock.

### Pillar F — The rules engine is deterministic and testable

Rules, graphics, AI, networking, persistence, and timing must be separate systems. The same command sequence must produce the same result.

### Pillar G — Card identity is independent from card artwork

The rules engine knows canonical card IDs and metadata, never filenames, crop coordinates, sprite-sheet positions, or deck-package names. New visual decks must be importable without modifying scoring or gameplay code. Deck artwork is a replaceable presentation package layered onto the same 48 canonical cards.

---

# 4. Goals and non-goals

## 4.1 Primary goals

1. Reproduce the approved KoiKoi4x rules accurately.
2. Create a high-quality mobile and desktop card-table presentation.
3. Give cards persistent visual identity and physical motion.
4. Make the game approachable to players unfamiliar with Hanafuda.
5. Provide fair CPU opponents with recognizable personalities.
6. Support local play, CPU play, and asynchronous online play.
7. Make every online turn replayable from semantic events.
8. Establish comprehensive automated tests before multiplayer.
9. Keep the web build static-host compatible.
10. Make future deck skins, themes, and rule explanations data-driven.
11. Make a complete new 48-card art set importable through a documented deck-package workflow with automatic, manual, or mixed image normalization.

## 4.2 Secondary goals

- Installable PWA behavior.
- Previous-turn replay.
- Accessible text recap for every animated turn.
- Reduced-motion and instant-animation modes.
- A current-games shelf for local and online matches.
- Optional telemetry for onboarding and reliability.
- A reusable engine that could later power a native wrapper.

## 4.3 Non-goals for the first production release

- Legacy save migration.
- Ranked matchmaking.
- Real-money play or wagering.
- Public chat.
- Spectator mode.
- Tournaments.
- User-generated card art.
- A native iOS or Android application.
- AI based on a remote language model.
- Fully live, step-by-step opponent decision streaming.
- An authoritative competitive anti-cheat system beyond server-validated rules and hidden-information protection.
- Additional Hanafuda rule sets before KoiKoi4x is stable.

---

# 5. Target audience and platforms

## 5.1 Audience

### Newcomer

Has little or no knowledge of Hanafuda. Needs month matching, card categories, yaku progress, and Koi-Koi risk explained visually.

### Casual returning player

Understands the game but may forget named yaku or special KoiKoi4x carryover rules. Benefits from contextual help and clear scoring arithmetic.

### Strategy player

Wants fast controls, strong CPU play, visible public information, minimal interruption, and reliable online turns.

### Asynchronous friend player

Wants to take a turn, close the game, and return later without losing context. Needs clear notifications, replay, and match status.

## 5.2 Platform priorities

1. Mobile web in portrait orientation.
2. Desktop web.
3. Tablet web.
4. Landscape mobile as a supported responsive layout, not the primary design target.
5. PWA installation as an enhancement.

## 5.3 Baseline viewport support

The application should remain usable at:

- 360 × 640 CSS pixels;
- 390 × 844 CSS pixels;
- 768 × 1024 CSS pixels;
- 1366 × 768 CSS pixels;
- 1920 × 1080 CSS pixels.

No core action may require hover.

---

# 6. Product and play terminology

The rewrite uses clear, consistent terms in onboarding, normal play, recaps, tests, and diagnostics. The new codebase should use the same core category names where practical rather than carrying legacy terminology forward.

## 6.1 Canonical player-facing terms

| Concept | Canonical player-facing term | Internal identifier guidance |
|---|---|---|
| High-value light card | Bright | `bright` |
| Animal/object scoring category | Animal | `animal` |
| Illustrated paper-strip category | Scroll | `scroll` |
| Basic card category | Plain | `plain` |
| Scoring combination | Yaku | `yaku` |
| End the round and score | Bank | command may remain `bank` |
| Continue and raise stakes | Koi-Koi | `koiKoi` |
| Current stakes | Table multiplier | `tableMultiplier` |
| Complete scheduled competition | Match | `match` |
| One deal/scoring unit | Round | `roundNumber` |
| Calendar identity assigned to a round | Scheduled month | `month` |

Guidelines:

- Use **Bright, Animal, Scroll, and Plain** throughout the new player-facing UI.
- The Animal category includes traditional *tane* cards that depict objects, including the September Sake Cup. The card guide should explain this once; the primary category label remains **Animal**.
- **Ribbon**, **Chaff**, and **Seed** are legacy/traditional aliases. They may appear in migration notes about the old source or as secondary rulebook aliases, but not as the primary new-game terminology.
- Use **Bank** as the primary action label. “Pass” may appear only as a secondary traditional/legacy synonym in the rulebook.
- Do not show unexplained abbreviations in onboarding.
- Card inspection should show static yaku contributions through an optional reference expander; it
  must not imply a yaku is currently achieved or achievable.
- Button arithmetic must be explicit, such as **Bank 15 points**.

## 6.2 Canonical stages of play

| Stage | Meaning | Recommended UI language |
|---|---|---|
| Match | The complete competition across the configured scheduled months | `Full Match`, `Score after 12 rounds` |
| Round | One deal and its scoring result | `March — Round 3 of 12` |
| Round Setup | Shuffle a fresh deck, deal hands and field, establish the starter, and check automatic opening outcomes | `Dealing March…` |
| Starter | The player who takes the first turn of the round | `You start March` |
| Turn | One player’s complete opportunity, normally containing a Hand Phase and Draw Phase | `Your Turn` / `Opponent’s Turn` |
| Hand Phase | Play one card from hand, resolve placement/capture, then check yaku | `Hand Phase — play a card` |
| Draw Phase | Reveal one card from the draw pile, resolve placement/capture, then check yaku | `Draw Phase — reveal a card` |
| Capture Resolution | Determine zero, one, two, or three same-month matches and move cards to the appropriate zones | Usually communicated through card motion rather than a modal |
| Yaku Check | Recalculate active yaku after a capture resolution | `Checking yaku…` only when useful |
| Yaku Decision | One combined Bank/Koi-Koi choice caused by one or more newly completed yaku in that phase | `Yaku complete — Bank or Koi-Koi?` |
| End of Play | Both eight-card hands are empty; unused draw-pile cards remain unrevealed | `End of Play — both hands are empty` |
| Round Result | The scored, no-score, cancelled, or automatic outcome for the scheduled month | `March Result` |
| Round Transition | Explain the result, update the recap, identify the next starter/privilege, and move to the next month | `Moving to April` |

A normal turn is:

```text
Hand Phase
  → capture/placement
  → Yaku Check
  → optional Yaku Decision
  → Draw Phase
  → capture/placement
  → Yaku Check
  → optional Yaku Decision
  → turn ends
```

If the player Banks after the Hand Phase, the round ends immediately and no Draw Phase occurs. If the player calls Koi-Koi after the Hand Phase, the Draw Phase resumes. One phase can complete several yaku but creates only one combined decision. The two phases are separate resolution windows, so one turn can contain two Yaku Decisions.

# 7. Core game modes

## 7.1 Learn in 60 Seconds

A deterministic scripted micro-round teaching:

1. match by month;
2. play one card;
3. reveal one deck card;
4. capture cards;
5. complete a yaku;
6. Bank versus Koi-Koi;
7. multiplier escalation.

This mode uses authored scenarios, not random deals.

## 7.2 Guided Practice

A one-round or short-match mode with:

- legal target highlights;
- yaku progress guidance;
- contextual explanations;
- optional undo before a command is committed;
- a forgiving CPU;
- no pressure to learn every special rule at once.

## 7.3 Quick Match

A shorter configurable match intended for casual sessions. The recommended initial options are:

- 3 rounds;
- 6 rounds;
- 12 rounds.

The full 12-round format is canonical. For shorter formats, “final-round” rules apply to the last scheduled round. This must be represented explicitly in tests.

## 7.4 Full Match

Twelve rounds corresponding to January through December.

## 7.5 CPU Match

Available in Quick Match and Full Match formats. Personality and difficulty are separate settings.

## 7.6 Local Pass-and-Play

Two people share one device. Private hands must be protected by a handoff screen and explicit “ready” action. This mode is lower priority than CPU play but should reuse the same engine and event pipeline.

## 7.7 Online Asynchronous Match

Two authenticated players use a server-authoritative match. Each player can act at a different time. A completed opponent turn is replayed before the receiving player acts.

---

# 8. Canonical KoiKoi4x rules baseline

This section records the behavior identified in the legacy game and the agreed rewrite direction. The engine test suite must convert each rule into explicit scenario fixtures.

## 8.1 Deck

- The deck contains 48 cards.
- There are 12 months.
- Each month contains 4 cards.
- Cards match by month, not by category.
- Every card has one primary category: Bright, Animal, Scroll, or Plain.
- The September Sake Cup counts as an Animal only and does not also count as Plain.
- The November Rain Bright is identified separately for Bright yaku calculations.

## 8.2 Month sequence

| Round | Month | Flower |
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

For shorter matches, rounds still advance in month order from January unless the design is deliberately amended later.

## 8.3 Round setup

At the beginning of a normal round:

- shuffle a fresh 48-card deck;
- each player receives 8 cards;
- 8 cards are placed face-up on the field;
- the remaining 24 cards form the draw pile;
- the table multiplier starts at 1×;
- both capture collections start empty;
- yaku-seen state resets for each player;
- most recent Koi-Koi caller resets;
- first-yaku tracking resets.

Cards, captures, and unused draw-pile cards never carry into another scheduled month.

Opening outcomes are evaluated in this order:

1. initial-field four-of-a-month cancellation;
2. lucky starting hands;
3. normal play.

### Initial-field four-of-a-month cancellation

If the initial field contains all four cards from any month, **that scheduled round is cancelled immediately**.

The field rule takes precedence over lucky hands from the same deal. Do not inspect, score, or reveal either player’s private lucky-hand eligibility after the field has invalidated the round. If the eight-card field contains two complete months, record and visually identify both qualifying month sets.

This is not a redeal of the same round. No normal turns are played, neither player scores, and the match advances to the next scheduled month. For example, if this occurs in the March round, March is recorded as a cancelled 0–0 round and play proceeds to April.

The round-transition presentation must clearly show:

- the four same-month field cards—or both four-card groups—that caused the cancellation;
- a concise explanation such as **“All four June cards were dealt to the field. June is cancelled.”**;
- 0 points for both players;
- the current scheduled month marked **Cancelled** in the match recap;
- the next-starter rule and any cleared privilege;
- an explicit transition such as **“June cancelled — moving to July.”**

Select and record the first-round starter before evaluating opening outcomes, using deterministic local RNG or server authority online. Even if January is cancelled, that recorded starter remains visible so the interface can explain why the opposite player starts February. January-specific no-score starter behavior is defined in Section 8.11.

## 8.4 Lucky starting hands

A player has a lucky hand when their initial eight-card hand contains either:

- all four cards from at least one month; or
- exactly four distinct month pairs, with hand-month counts `[2,2,2,2]`.

Either condition is one automatic round win worth **6 base points at 1×**. No normal turns are played. A hand containing two complete four-card months still receives one 6-point lucky-hand award, not 12 points.

Lucky-hand cards are dealt cards, not captured cards. A lucky hand does not also score Current-Month Set, Brights, Animals, Scrolls, Plain Cards, viewing combinations, or any other ordinary capture-area yaku.

If both players satisfy any lucky-hand condition, the scheduled round is a 0–0 automatic draw. After the result is explained and recorded, the match advances to the next scheduled month.

A one-player lucky-hand win is treated as a 1× scored round for next-starter and special 2× privilege rules. The final-round forced-Koi rule does not apply because no Yaku Decision occurs.

### Mandatory lucky-hand presentation and evidence

Automatic results must never appear as an unexplained jump to the next month.

After the server or local engine commits the automatic result:

1. deal the starting hands and field visibly;
2. reveal the winning player’s entire eight-card starting hand to both players;
3. group, raise, outline, or glow the qualifying four-card month or four month-pairs;
4. name the rule and describe the exact pattern;
5. show **Automatic win: 6 points × 1× = 6**;
6. apply the score after the result is visually understood;
7. show the round recap and next-starter consequence;
8. require local acknowledgement or use a clearly timed, acceleratable transition before moving to the next scheduled month.

For a complete-month hand, example copy is:

> **Lucky Hand — all four April cards. Automatic win: 6 points.**

For four pairs, example copy is:

> **Lucky Hand — four month pairs. Automatic win: 6 points.**

For a both-lucky draw, reveal both complete starting hands, identify each qualifying pattern, show 0–0, and explain why neither player scores.

The evidence and explanation must remain available in round history after transition.

## 8.5 Turn structure

A normal turn has two gameplay phases. Each phase ends with its own capture resolution and Yaku Check.

### Hand Phase

1. The active player chooses one card from their hand.
2. The card is played against field cards from the same month.
3. Capture or placement resolves.
4. Captured cards move to the player’s collection.
5. Active yaku are evaluated.
6. If one or more new yaku trigger keys appeared in this phase, open one combined Yaku Decision.
7. If the player Banks, the round ends immediately and the Draw Phase is skipped.
8. If the player calls Koi-Koi, continue to the Draw Phase.

### Draw Phase

1. Reveal the top draw-pile card.
2. Resolve its capture or placement.
3. Move captured cards to the player’s collection.
4. Evaluate active yaku.
5. If one or more new yaku trigger keys appeared in this phase, open one combined Yaku Decision.
6. If no decision ends the round, complete the turn and pass control to the opponent.

One phase can complete several new yaku, but those yaku share one decision panel. The Hand Phase and Draw Phase are separate resolution windows. Therefore, a player who calls Koi-Koi after a Hand-Phase yaku can receive a second Yaku Decision if the Draw Phase completes another previously unseen yaku.

Every draw reveal enters an authoritative pending Draw-resolution state. The engine exposes the
revealed card and its canonical public 0/1/2/3 capture preview, then accepts one
`resolveDrawCard` command before placement/capture, Yaku Check, or turn handoff. A renderer may
still wait for its reveal animation before enabling that interaction, but it may not derive capture
legality or resolve the Draw locally.

## 8.6 Capture rules

For a played or drawn card:

### Zero matching field cards

- The card remains on the field.

### One matching field card

- The played/drawn card and the matching field card are captured.

### Two matching field cards

- The active player chooses one matching field card.
- The played/drawn card and selected field card are captured.
- The unselected same-month field card remains.

### Three matching field cards

- The played/drawn card is the fourth card of that month.
- All four cards are captured as a sweep.

There is no strategic field-position selection in the rules. Field positions are presentation-only.

## 8.7 Yaku scoring baseline

### Fixed yaku

| Yaku | Requirement | Base points |
|---|---|---:|
| Five Brights | All 5 Brights | 10 |
| Four Brights | 4 Brights without Rain Bright | 8 |
| Four Brights with Rain | 4 Brights including Rain Bright | 7 |
| Three Brights | 3 Brights without Rain Bright | 5 |
| Blossom Viewing | March Cherry Curtain + September Sake Cup | 5 |
| Moon Viewing | August Moon + September Sake Cup | 5 |
| Animal Trio | June Butterfly + July Boar + October Deer | 5 |
| Red Text Scrolls | January, February, and March text Scrolls | 5 |
| Blue Scrolls | June, September, and October blue Scrolls | 5 |
| Current-Month Set | All 4 cards from the scheduled round’s month in the player’s capture area | 5 |

### Incremental yaku

| Yaku | Threshold | Base points | Additional cards |
|---|---:|---:|---:|
| Animals | 5 | 3 | +1 per Animal above 5 |
| Scrolls | 5 | 1 | +1 per Scroll above 5 |
| Plain Cards | 10 | 1 | +1 per Plain above 10 |

### Bright hierarchy

The four Bright tiers are distinct yaku and distinct trigger keys, but they form a replacement hierarchy for current scoring:

- score only the highest currently applicable Bright tier;
- do not add Three Brights + Four Brights + Five Brights together;
- reaching a higher tier is a new yaku completion and may create a new Yaku Decision;
- the score panel should communicate an upgrade, such as **“Bright yaku upgraded: 8 → 10 points.”**

Examples:

- Three Brights without Rain = 5 current Bright points.
- Adding Rain as the fourth Bright creates Four Brights with Rain = 7 current Bright points, replacing the 5-point tier.
- Four Brights without Rain = 8 current Bright points.
- Adding the fifth Bright creates Five Brights = 10 current Bright points, replacing the four-Bright tier.
- Three total Brights that include Rain do not satisfy Three Brights.

### Independent stacking

Independent yaku stack, even when they share cards.

Examples:

- Animal Trio stacks with the Animals count yaku.
- Moon Viewing can stack with Blossom Viewing, a Bright tier, and the Animals count yaku.
- Current-Month Set stacks with every other qualifying yaku.
- Scroll count stacks with named Scroll combinations.
- The September Sake Cup counts as an Animal, can participate in both viewing yaku, and never counts as Plain.

Canonical high-value example:

A capture area containing all 5 Brights and the September Sake Cup has:

- Five Brights: 10;
- Moon Viewing: 5, because the August Moon and Sake Cup are present;
- Blossom Viewing: 5, because the March Curtain and Sake Cup are present;
- **total: 20 points across 3 active yaku**, before any additional qualifying Animals or Current-Month Set points.

### Current-Month Set clarification

Current-Month Set is a capture-area collection yaku. The player completes it by accumulating all four cards from the currently scheduled month at any time during that round. The four cards do not need to be captured in one action.

Reserve **Four-Card Sweep** for the capture action in which a played or drawn fourth card captures the other three same-month cards from the field. A Four-Card Sweep completes Current-Month Set only when those cards belong to the scheduled month.

### Scroll stacking clarification

The named Scroll yaku and generic Scroll count yaku overlap and score independently:

- all 3 Red Text Scrolls = 5 points and one fixed yaku;
- all 3 Blue Scrolls = 5 points and one separate fixed yaku;
- reaching 5 total Scrolls = 1 point and one additional incremental Scroll yaku;
- each Scroll beyond 5 adds +1 point to that same incremental Scroll yaku;
- additional Scrolls beyond 5 do not create additional yaku;
- there is no separate Red + Blue combined bonus yaku.

Example: all 3 Red Text Scrolls, all 3 Blue Scrolls, and 1 additional plain red Scroll contain 7 total Scrolls and score:

- Red Text Scrolls: 5;
- Blue Scrolls: 5;
- generic Scrolls at 7 cards: 3 (1 for reaching 5, +1 for the 6th, +1 for the 7th);
- **total: 13 points across 3 active yaku**.

The first completion of each of those three yaku is a new trigger. The 6th and 7th Scroll only increase the existing generic Scroll yaku and do not create another trigger.

## 8.8 New-yaku trigger and decision behavior

A Yaku Decision occurs only when one or more new trigger keys appear for that player during a phase’s Yaku Check.

Canonical behavior:

- first completion of a fixed yaku creates a new trigger;
- reaching the threshold for Animals, Scrolls, or Plain Cards creates a new trigger;
- later incremental points in the same count yaku do not create another trigger;
- each higher Bright tier is a distinct yaku trigger, although only the highest tier contributes current Bright points;
- a yaku trigger already seen earlier in the same round does not repeatedly trigger;
- the player’s complete current active-yaku total is the base score offered for Banking, not merely the newly added yaku value.

### One combined decision per phase

If one capture resolution completes two or more new yaku, show all of them together and open one Yaku Decision. Mark every newly completed trigger key as seen when that decision window is created.

Example:

```text
NEW YAKU
Red Text Scrolls      5
Scrolls               1
Current-Month Set     5

Current yaku total   11
```

This is one Bank/Koi-Koi choice, not three consecutive choices.

### Two decisions can occur in one turn

The Hand Phase and Draw Phase are separate Yaku Check windows. A player may:

1. complete one or more new yaku from their hand play;
2. call Koi-Koi;
3. resume the required Draw Phase;
4. complete another previously unseen yaku from the revealed card; and
5. make a second Bank/Koi-Koi decision in the same turn.

This does not conflict with the one-decision-per-phase rule. It is two distinct phase resolutions.

## 8.9 Bank and Koi-Koi

When a new Yaku Decision occurs:

### Bank

- End the round immediately.
- The scoring player receives:

```text
current active-yaku total × applicable scoring multiplier
```

- Only that player scores in the round.
- If Banking occurs after the Hand Phase, no Draw Phase occurs.

### Koi-Koi

- Continue the round.
- Set the caller as the most recent Koi-Koi caller.
- Increase the table multiplier by 1, capped at 4×.
- Calling Koi-Koi while already at 4× keeps the table at 4× but still updates the most recent caller.
- If the decision occurred after the Hand Phase, resume the Draw Phase.
- If it occurred after the Draw Phase and play remains, pass control to the opponent.

### Final-draw Koi-Koi — approved legacy behavior

If the final Draw Phase completes a new yaku after both hands have become empty, the player is still offered Bank or Koi-Koi.

If the player calls Koi-Koi:

1. update the most recent Koi-Koi caller;
2. raise the table multiplier by 1, capped at 4×;
3. immediately resolve End of Play because no hand cards remain;
4. award that caller their current active-yaku total at the resulting table multiplier.

This final Koi-Koi call is intentionally allowed even though no additional card play remains. At 4×, it can still change the most recent caller and therefore determine who receives End-of-Play scoring.

## 8.10 End of Play — both hands empty

Each player begins a normal round with 8 hand cards. Unless the round ends early, each player takes 8 turns and each turn resolves one Hand Phase and one Draw Phase. A complete natural round therefore contains 16 total player turns.

After the final Hand Phase and Draw Phase:

- both player hands are empty;
- 16 draw-pile cards have been revealed during turns;
- 8 cards remain unused in the draw pile;
- those unused cards stay unrevealed and are discarded when the round ends.

The natural endpoint is **End of Play** or **hand exhaustion**, not draw-pile exhaustion.

After any final-phase Yaku Decision resolves:

- if at least one player called Koi-Koi during the round, the most recent Koi-Koi caller scores their current active-yaku total at the current table multiplier;
- otherwise, the round ends 0–0.

The End-of-Play scorer is not necessarily the player who took the final turn. A final-draw Koi-Koi call follows Section 8.9 and can update the scorer immediately before End-of-Play resolution.

## 8.11 Next-round starter after a scored or no-score result

After a scored round:

- if the scoring multiplier was 3× or 4×, the winner starts the next scheduled month;
- if the scoring multiplier was 1× or 2×, the loser starts the next scheduled month.

Use the actual scoring multiplier for this rule. A special-privilege Bank scored at 2× counts as a 2× result even though the visible table remained at 1×.

After a cancelled or other 0–0 round:

- do not replay the scheduled month;
- clear any unconsumed special 2× privilege;
- for February through November, the player who started the no-score round also starts the next scheduled month;
- if January ends 0–0 before any scored-round history exists, the **opposite player** from the randomly selected January starter begins February.

Example:

```text
January starter: Player A
January result: Cancelled, 0–0
February starter: Player B
```

The January exception must be telegraphed in the result screen and history, for example:

> **January ended 0–0. The opening player alternates, so Player B starts February.**

No next starter is assigned after the final scheduled month.

## 8.12 Special first-yaku 2× privilege

After a player wins a round at a 1× scoring multiplier:

- the losing player starts the next scheduled month;
- that losing player receives a next-round-only privilege;
- if that player creates their first yaku trigger while the table is still 1×, they may:
  - Bank at a 2× scoring multiplier; or
  - call Koi-Koi and move the actual table directly from 1× to 3×.

The previous winner does not receive this privilege.

For a privileged Bank, record the distinction explicitly:

```ts
tableMultiplierAtDecision: 1
scoringMultiplier: 2
```

The score and next-starter rule use `scoringMultiplier = 2`. The visible table never passes through a persistent 2× state, and the 2× result does not create another special privilege.

The privilege is consumed when used and is cleared when the round ends for any reason. It is also lost if the table is no longer at 1× before the eligible player creates their first yaku trigger.

## 8.13 Final-round leader rule

At the start of the final scheduled round:

- compare match scores and freeze the identity of the current leader;
- if tied, neither player is the protected leader;
- do not recalculate protected-leader identity during the round.

The forced-Koi restriction applies only when all of the following are true:

1. the frozen leader is the first player in the entire round to create a yaku-triggering event;
2. that player’s applicable Bank multiplier is only 1×; and
3. the result is an ordinary Yaku Decision rather than an automatic lucky-hand result.

When all conditions apply, the leader may not Bank and must call Koi-Koi.

If the opponent creates the round’s first yaku-triggering event, the restriction is consumed and does not affect the leader’s later yaku. If the leader has the special 2× Bank privilege, they may Bank at 2× and the forced-Koi restriction does not apply.

For shortened formats, the final scheduled round means the configured last round.

## 8.14 Round history, final-month outcomes, and match completion

Every scheduled round must create one durable history entry, including rounds with no normal turns.

A round history record should identify:

- scheduled month and round number;
- starter;
- result type;
- explicit reason code;
- points awarded to each player;
- active yaku and scoring arithmetic when applicable;
- table multiplier at decision;
- scoring multiplier;
- next starter and privilege consequence when another round remains.

Use explicit result/reason codes including:

- `BANKED_SCORE`;
- `END_OF_PLAY_LAST_KOI_CALLER`;
- `END_OF_PLAY_NO_SCORE`;
- `FIELD_FOUR_MONTH_CANCELLED`;
- `LUCKY_FOUR_MONTH`;
- `LUCKY_FOUR_PAIRS`;
- `BOTH_LUCKY_DRAW`.

Automatic and cancelled outcomes must never silently advance the interface.

In the final scheduled month:

- a cancellation records 0–0 and ends the match;
- a both-lucky draw records 0–0 and ends the match;
- a natural no-score End of Play records 0–0 and ends the match;
- a lucky-hand winner receives 6 points at 1× and the match ends;
- no replacement or thirteenth month is created.

At match completion:

- add all round scores;
- the higher total wins;
- equal totals produce a tied match unless a later approved amendment introduces a tiebreaker;
- show a complete round-by-round recap with scheduled month, outcome reason, points, and multiplier arithmetic.

# 9. Rule-lock test vector requirements

Before the headless engine is considered stable, create named fixtures for at least the following.

## 9.1 Capture vectors

- `CAP-000`: no match places card.
- `CAP-001`: one match captures pair.
- `CAP-002A`: two matches choose first.
- `CAP-002B`: two matches choose second.
- `CAP-003`: three field matches sweep all four.
- `CAP-DRAW-001`: draw card with one match.
- `CAP-DRAW-002`: draw card with two choices.
- `CAP-DRAW-003`: draw card completes sweep.

## 9.2 Deal and opening-outcome vectors

- `DEAL-001`: exactly 8/8/8/24 ownership after a normal deal.
- `DEAL-002`: initial field complete month cancels the scheduled round at 0–0 and advances; no redeal.
- `DEAL-003`: field cancellation takes precedence over a lucky hand in the same deal.
- `DEAL-004`: two complete months on the eight-card field are both recorded as cancellation evidence.
- `DEAL-005`: lucky complete-month hand produces one 6-point result.
- `DEAL-006`: two complete months in one hand still produce one 6-point result.
- `DEAL-007`: exactly four month pairs `[2,2,2,2]` produce a 6-point result.
- `DEAL-008`: a nonexact pair distribution does not qualify as four pairs.
- `DEAL-009`: both players lucky produce a 0–0 automatic draw.
- `DEAL-010`: lucky-hand cards do not also score ordinary capture-area yaku.
- `DEAL-011`: automatic-result public projection reveals the complete qualifying starting hand only after result commit.

## 9.3 Yaku vectors

At minimum, one positive and one negative vector for every fixed yaku, plus:

- Three Brights excludes any three-card set containing Rain.
- Four Brights with Rain and Four Brights without Rain are mutually exclusive.
- Bright upgrades replace current Bright points but create new trigger keys.
- Five Brights + Sake Cup = 20 from Five Brights, Moon Viewing, and Blossom Viewing.
- Sake Cup counts as Animal and never Plain.
- Animals at 5, 6, and 7.
- Scrolls at 5, 6, and 7.
- Plain Cards at 10, 11, and 12.
- Current-Month Set can accumulate across separate captures.
- Four cards from a nonscheduled month do not satisfy Current-Month Set.
- A Four-Card Sweep of the scheduled month satisfies Current-Month Set.
- Named yaku stacking.
- One capture completing several new yaku creates one combined decision.
- Later incremental count points do not create another decision.
- Scroll stacking: Red Text 5 + Blue 5 + generic 5-Scroll threshold/increments; no combined Red+Blue bonus.

## 9.4 KoiKoi4x vectors

- `KOI-001`: Bank at 1×.
- `KOI-002`: Koi-Koi changes 1× to 2×.
- `KOI-003`: Koi-Koi changes 2× to 3×.
- `KOI-004`: Koi-Koi changes 3× to 4×.
- `KOI-005`: Koi-Koi at 4× remains 4× and updates most recent caller.
- `KOI-006`: Hand-Phase yaku Koi-Koi resumes Draw Phase.
- `KOI-007`: Hand-Phase Bank skips Draw Phase and ends the round.
- `KOI-008`: several new yaku in one phase create one decision.
- `KOI-009`: Hand-Phase yaku followed by a new Draw-Phase yaku creates two decisions in one turn.
- `KOI-010`: most recent Koi-Koi caller scores at End of Play.
- `KOI-011`: no Koi-Koi caller produces 0–0 End of Play.
- `KOI-012`: final Draw-Phase yaku may call Koi-Koi and immediately score at the raised multiplier.
- `KOI-013`: final-draw Koi-Koi at 4× changes most recent caller without increasing multiplier.
- `KOI-014`: End-of-Play scorer can differ from the player who took the final turn.
- `KOI-015`: a final Draw-Phase actor assigned the starter-only special privilege is an unreachable
  state and must fail authoritative validation. The privilege holder starts the round and therefore
  takes turns 1, 3, …, 15; turn 16's final Draw belongs to the nonstarter.
- `KOI-016`: final-round protected leader creating the round’s first yaku on the final draw is forced to Koi-Koi and immediately resolves End of Play at the raised multiplier.

## 9.5 Round-transition vectors

- 1× winner causes loser to start and grants the loser the special privilege.
- 2× winner causes loser to start without granting a new privilege.
- 3× winner starts.
- 4× winner starts.
- February–November 0–0 round preserves that round’s starter for the next month.
- January 0–0 round alternates to the opposite initial starter for February.
- Any 0–0 round clears an unconsumed special privilege.
- Eligible privilege Banks at 2× while table state remains 1×.
- Special 2× scoring controls next-starter logic.
- Eligible privilege Koi-Koi jumps table from 1× directly to 3×.
- Privilege does not activate after table leaves 1×.
- Final-round leader identity freezes at round start.
- Final-round leader is forced only if they create the first yaku-triggering event of the entire round at an applicable 1× Bank multiplier.
- Opponent creating the first yaku removes the later restriction from the leader.
- Final-round leader may Bank using the special 2× privilege.
- Final-round tie protects neither player.
- Final-month cancellation/no-score ends the match without a replacement month.
- Final-month lucky hand scores 6 and ends the match.
- A 1× lucky-hand win gives the loser the next-round starter position and special 2× privilege.

## 9.6 Invariants

After every legal command:

- every card exists in exactly one authoritative zone;
- no card appears twice;
- the total card count remains 48;
- only the active player may issue gameplay commands;
- a hand-played card belonged to the actor before the command;
- a selected capture target is legal;
- player observations contain no forbidden private cards;
- score and multiplier are non-negative and valid;
- state version increases exactly once per accepted command;
- replaying the same seed and command list produces the same result.

---

# 10. User experience architecture

## 10.1 Main navigation

Recommended first-run home screen order:

1. **Learn in 60 Seconds**
2. **Play vs CPU**
3. **Play Online**
4. **Local Pass-and-Play**
5. **Continue Games**
6. **Rules and Card Guide**
7. **Settings**

Deck and theme selection should not dominate the first-run screen. They belong in Settings and a secondary pre-match setup panel.

## 10.2 First-run gating

On a first launch:

- prominently recommend the 60-second lesson;
- allow experienced players to skip;
- remember tutorial completion locally;
- never permanently lock modes behind tutorial completion;
- offer contextual assistance in the first normal match even after the lesson.

## 10.3 Match setup

CPU setup should include:

- match length;
- CPU personality;
- difficulty;
- animation speed;
- optional beginner assistance;
- deck skin;
- theme.

Online setup should initially include:

- create match;
- join by invite link/code;
- match length;
- display name;
- deck/theme as local-only presentation preferences.

Do not synchronize cosmetic deck or theme choices unless a later design specifically requires it.

---

# 11. Onboarding design

## 11.1 Instruction principle

Do not teach every card and yaku before the player acts. Teach one concept immediately before it becomes useful.

## 11.2 Learn in 60 Seconds sequence

### Step 1 — Match the month

Board state:

- one playable hand card;
- one obvious same-month field card;
- unrelated cards dimmed.

Copy:

> Cards capture cards from the same month. Play the March card onto the other March card.

Required action:

- tap the hand card;
- tap the highlighted field match.

Visual lesson:

- hand card lifts;
- target glows;
- cards align;
- pair moves to the player’s capture area.

### Step 2 — A turn has two halves

Copy:

> Every turn has two parts: play one card, then reveal one card from the deck.

Required action:

- tap the deck/reveal area.

Visual lesson:

- top card leaves deck;
- flips in reveal area;
- target highlights;
- capture resolves.

### Step 3 — Captures build yaku

Script the player to reach 4 of 5 Animals.

Copy:

> Captured cards build scoring sets called yaku. One more Animal completes this set.

Show:

```text
Animals 4 / 5
```

### Step 4 — Complete a yaku

Script the next capture to complete Animals.

Show:

```text
Animals complete — 3 points
```

Do not open the decision panel until the completed cards and progress change have been visually acknowledged.

### Step 5 — Bank or Koi-Koi

Decision presentation:

```text
BANK 3 POINTS
3 × 1 = 3
End the round safely.

CALL KOI-KOI
Bank nothing yet.
Raise the table to 2× and continue.
```

### Step 6 — Demonstrate escalation

Have the tutorial choose or strongly guide Koi-Koi.

- transform the table from 1× to 2×;
- explain that future Banking uses the higher multiplier;
- complete one final scripted scoring action;
- finish with a concise recap.

### Step 7 — Exit

Offer:

- Play a guided round;
- Play vs CPU;
- Review the card guide.

## 11.3 Advanced tutorial

A later tutorial should cover:

- two-match capture choice;
- four-card sweep;
- named yaku;
- incremental yaku;
- 1× carryover privilege;
- starter changes;
- final-round leader rule;
- End of Play and last Koi-Koi caller.

## 11.4 Contextual teaching in normal play

- Legal month matches glow after selecting a hand card.
- Card inspection shows month and flower.
- Capture lanes show yaku progress.
- Newly completed yaku show exact point changes.
- A “Why?” affordance explains a forced rule.

The optional in-play `?` control is a narrow, read-only next-step aid, not a tutorial or strategy
advisor. It may describe only the current public phase, legal interaction shape, and current visual
selection; it must not evaluate the table, recommend a move, calculate live yaku, or submit an action.
- The first occurrence of a special rule triggers one short explanation.
- Explanations can be dismissed and reviewed later.
- A beginner setting can keep month/category labels visible.
- No tutorial should require memorizing all 48 cards.

## 11.5 Onboarding telemetry

If telemetry is enabled, record:

- tutorial started;
- step reached;
- tutorial completed;
- tutorial abandoned;
- first normal match started;
- first normal match completed;
- rulebook opened from a contextual prompt;
- first Bank;
- first Koi-Koi;
- first use of animation skip.

Do not record private online hands or deck order.

---

# 12. Board and screen layout

## 12.1 Logical board zones

The presentation system must define these logical zones:

```ts
type CardZone =
  | "drawPile"
  | "reveal"
  | "playerHand"
  | "opponentHand"
  | "field"
  | "playerBrights"
  | "playerAnimals"
  | "playerScrolls"
  | "playerPlains"
  | "opponentBrights"
  | "opponentAnimals"
  | "opponentScrolls"
  | "opponentPlains"
  | "transit";
```

## 12.2 Mobile portrait hierarchy

Recommended vertical hierarchy:

1. Opponent identity, score, and hand backs.
2. Opponent capture summary/progress.
3. Table multiplier and round status.
4. Field and draw/reveal area.
5. Player capture summary/progress.
6. Player hand.
7. Context-sensitive action bar.

The action bar must remain reachable with one hand and avoid covering selected cards.

## 12.3 Desktop hierarchy

Use a wider table:

- opponent hand at top;
- player hand at bottom;
- field center;
- draw/reveal area to one side;
- capture lanes or expandable panels to left and right;
- persistent score/multiplier header.

## 12.4 Field layout behavior

Requirements:

- field cards use stable visual slots during an action;
- removal does not cause unrelated cards to jump before the capture animation finishes;
- reflow occurs only after the semantic action settles;
- new no-match cards enter a predictable available slot;
- matching highlights remain clear even when the field is dense;
- month labels may appear in beginner mode;
- the layout service, not the rules engine, controls coordinates.

## 12.5 Capture lanes

Each player has four categories:

- Brights;
- Animals;
- Scrolls;
- Plain.

The capture presentation should support:

- expanded card lanes;
- compact summary mode;
- count and threshold progress;
- named yaku progress;
- recent-capture emphasis;
- responsive collapse on small screens.

Example:

```text
ANIMALS                 4 / 5
[card] [card] [card] [card]

RED TEXT SCROLLS        2 / 3
[card] [card]

PLAIN CARDS             7 / 10
[card] [card] [card] ...
```

## 12.6 Card inspection

Tap-and-hold, right-click, or a dedicated info affordance opens:

- large card image;
- a collapsed **Yaku this card can contribute to** reference expander, using the Yaku Guide's style
  and static descriptions;
- scrollable reference content when expanded, with a persistent close control.

The reference may show a card under every canonical yaku it can generally contribute to, including
category thresholds and the conditional Current-Month Set. It does not evaluate the current table,
make a strategic recommendation, or represent achieved yaku/formation evidence. Browser native
selection and touch-callout suppression is limited to game card interaction surfaces; regular dialog
text remains selectable.

Inspection is available only for face-up public Field cards and the local player’s face-up Hand; it
never exposes opponent-hand identity, face-down Draw/deck identity/order, or private engine state. It
must not submit a move, and short taps preserve ordinary card interaction.

---

# 13. Input model

## 13.1 Primary click/tap flow

1. Tap a hand card.
2. Selected card lifts.
3. Legal targets illuminate.
4. Tap the intended target when a target choice is required.
5. Submit the engine command.
6. Lock conflicting input.
7. Animate the confirmed events.

## 13.2 Match confirmation setting

Support:

- **Guided:** require target confirmation for all matches, including unique matches and sweeps.
- **Fast:** auto-resolve a unique match and a three-card sweep; require selection only when two field cards match.

The tutorial uses Guided behavior.

## 13.3 No-match placement

Because field coordinates have no strategic meaning:

- after selecting a card with no match, show a field preview;
- Guided mode may require tapping the preview to confirm;
- Fast mode may submit immediately;
- the layout service chooses the final slot.

## 13.4 Optional drag interaction

Dragging is an optional convenience:

- valid targets respond visually;
- releasing on a valid target submits the same command as tapping;
- releasing elsewhere returns the card to the hand;
- keyboard and tap controls remain complete;
- the engine never receives “drag” as a distinct rules action.

## 13.5 Input locking

Input is disabled while:

- a submitted action awaits server confirmation;
- required animations are playing, unless skip is used;
- an opponent turn replay is active;
- a round or match transition modal is active;
- the client is disconnected during an online active turn;
- a pending yaku decision is open, except its valid buttons.

---

# 14. Physical card animation system

## 14.1 Persistent CardView

Every visible card should have a persistent presentation object.

```ts
interface CardViewState {
  cardId: CardId;
  zone: CardZone;
  slotId: string;
  faceUp: boolean;
  selected: boolean;
  interactive: boolean;
  zIndex: number;
}
```

A card must not be recreated merely because it moved from hand to field or field to captures.

## 14.2 Semantic animation pipeline

```text
Validated command
      ↓
Pure engine transition
      ↓
Semantic game events
      ↓
Presentation planner
      ↓
Animation clips
      ↓
CardView and HUD settle to final projection
```

The renderer may never infer a rule result from sprite coordinates.

## 14.3 Recommended event-to-animation language

### Select

- card lifts slightly;
- scale increases subtly;
- legal targets glow;
- invalid cards dim only when useful.

### Play with no match

1. Card leaves hand.
2. Hand closes its gap.
3. Card travels to field preview.
4. Card settles into its assigned field slot.
5. Field reflow completes if needed.

### Play with one selected match

1. Card leaves hand.
2. Field match highlights.
3. Played card aligns with matched card.
4. Pair rises as a unit.
5. Pair moves toward the actor’s capture area.
6. Cards split into category lanes when categories differ.
7. Lanes reflow.
8. Yaku progress updates.

### Four-card sweep

1. All three field matches illuminate.
2. Played/drawn card moves to the month group.
3. Four cards cluster.
4. Cluster lifts.
5. Cards travel toward captures.
6. Cards separate into category lanes.
7. “Current-Month Set” feedback appears if the captured cards complete the scheduled month’s set.

### Draw

1. Top card lifts from deck.
2. Card moves to reveal area face-down.
3. Card flips face-up.
4. Card pauses long enough to identify.
5. Legal targets illuminate.
6. Placement or capture resolves.

### New yaku

1. Captured cards settle.
2. Relevant lane or named-yaku tracker illuminates.
3. Contributing cards pulse once.
4. Yaku name and point change appear.
5. Total current yaku points update.
6. Decision panel enters.

### Koi-Koi

1. Confirm selection.
2. Update multiplier through a clear transformation.
3. Increase table tension without obscuring cards.
4. Mark current yaku as unbanked.
5. Resume draw or hand off turn.

### Bank

1. Confirm exact arithmetic.
2. Move current yaku total into match score.
3. Resolve round-end feedback.
4. Open round recap after score settles.

## 14.4 Timing targets

Normal-mode starting values:

| Beat | Approximate duration |
|---|---:|
| Selection lift | 100–140 ms |
| Hand-to-field travel | 240–320 ms |
| Match alignment | 140–220 ms |
| Capture travel | 260–360 ms |
| Hand/field reflow | 160–240 ms |
| Deck draw travel | 220–300 ms |
| Card flip | 180–260 ms |
| Reveal pause | 300–500 ms |
| Yaku feedback | 450–750 ms |
| Multiplier escalation | 600–900 ms |

These are presentation targets, not network timing.

## 14.5 Animation modes

- **Normal**
- **Fast**
- **Instant**
- **Reduced motion**

Behavior:

- Fast shortens movement and pauses.
- Instant applies final layouts with minimal feedback.
- Reduced motion uses fades, outlines, and short position changes instead of large travel paths.
- A tap during replay accelerates the current clip.
- A second deliberate skip may finish the queue.
- Skipping must always produce the exact correct final board.

## 14.6 AnimationDirector

```ts
interface AnimationDirector {
  play(events: readonly PublicGameEvent[], context: AnimationContext): Promise<void>;
  accelerate(): void;
  finishImmediately(): Promise<void>;
  cancelAndSnapTo(projection: BoardProjection): Promise<void>;
}
```

The director owns sequencing. Individual rules functions must not use timers.

## 14.7 Authoritative versus displayed state

The application maintains:

- **authoritative state:** latest confirmed logical state;
- **display projection:** what the player has visually seen so far;
- **target projection:** board layout after all queued events.

This allows:

- server confirmation before animation completes;
- reliable skip behavior;
- reconnect recovery;
- replay from a known snapshot;
- reduced-motion substitution;
- independent UI timing.

---

# 15. Multiplier visual language

The 1×–4× table state should be one of the strongest visual motifs.

## 15.1 Requirements

- Always visible.
- Readable as text, not color alone.
- Each increase must feel consequential.
- Effects must remain restrained enough to read cards.
- Reduced-motion mode must preserve information.
- Audio cues are supportive, not required.

## 15.2 Suggested progression

### 1×

Neutral table state.

### 2×

Subtle border energy, warmer lighting, short pulse.

### 3×

Stronger contrast, more persistent tension treatment, distinct transition sound.

### 4×

Maximum state: unmistakable border/lighting treatment, strongest but controlled transition, persistent 4× badge.

The theme system supplies colors and textures. The multiplier system supplies intensity tokens.

---

# 16. Turn history and replay

## 16.1 Text recap

Every completed turn creates a concise accessible recap.

Example:

```text
Opponent played March Scroll.
Captured March Plain.
Drew August Animal.
Captured August Bright.
Completed Animals for 3 points.
Called Koi-Koi. Table increased to 2×.
```

## 16.2 Replay previous turn

The game should support **Replay Turn** after a CPU or remote turn.

Requirements:

- replay uses a presentation-only pre-turn snapshot;
- replay does not mutate authoritative game state;
- replay can be accelerated or skipped;
- controls remain locked until replay returns to the current projection;
- text recap remains available if replay is skipped.

## 16.3 Replay record boundary

A turn record begins when a player selects their hand card and ends when:

- control passes to the opponent;
- the round ends;
- the match ends.

A yaku decision after the hand phase remains part of the same turn. If the player Banks there, no draw event exists.

---

# 17. Technical stack

Use current supported stable releases at repository creation and lock exact versions in the package lockfile.

## 17.1 Required stack

- TypeScript with strict compiler settings.
- Vite for the web build.
- PixiJS for the card table and animated scene.
- Semantic HTML and CSS for menus, settings, rulebook, dialogs, and accessible controls.
- Vitest for unit and integration tests.
- Playwright for browser and end-to-end tests.
- Firebase modular SDK.
- Firebase Authentication.
- Cloud Firestore for match documents, projections, and turn records.
- Cloud Functions for authoritative online commands.
- Realtime Database for presence if robust disconnect presence is required.
- Firebase Emulator Suite for backend development and security testing.
- Zod or equivalent runtime schemas for network and persistence boundaries.
- ESLint and Prettier.
- GitHub Actions for continuous integration.

## 17.2 UI framework policy

Do not add React or another full UI framework by default.

Use:

- modular TypeScript DOM controllers for the shell;
- PixiJS for the table;
- explicit state selectors.

A framework may be introduced only through a documented architecture decision if shell complexity justifies it.

## 17.3 Hosting

The web build must remain a static output suitable for GitHub Pages. Configure Vite’s base path for a repository subpath.

Firebase backend services deploy independently.

Firebase Hosting may replace GitHub Pages later, but the codebase must not require that decision during the local/CPU phases.

---

# 18. Repository architecture

A workspace layout is recommended so the same pure engine can run in the browser and Cloud Functions.

```text
/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ presentation/
│     │  │  ├─ pixi/
│     │  │  └─ dom/
│     │  ├─ tutorial/
│     │  ├─ ai/
│     │  ├─ persistence/
│     │  ├─ multiplayer/
│     │  ├─ audio/
│     │  └─ telemetry/
│     ├─ public/
│     │  ├─ cards/
│     │  ├─ ui/
│     │  └─ audio/
│     └─ tests/
│
├─ packages/
│  ├─ engine/
│  │  ├─ src/
│  │  │  ├─ cards/
│  │  │  ├─ rules/
│  │  │  ├─ state/
│  │  │  ├─ commands/
│  │  │  ├─ events/
│  │  │  ├─ observations/
│  │  │  ├─ replay/
│  │  │  └─ rng/
│  │  └─ tests/
│  │
│  ├─ protocol/
│  │  ├─ src/
│  │  └─ tests/
│  │
│  └─ test-fixtures/
│     ├─ rules/
│     ├─ matches/
│     └─ multiplayer/
│
├─ functions/
│  ├─ src/
│  │  ├─ callable/
│  │  ├─ match-service/
│  │  ├─ projections/
│  │  ├─ cleanup/
│  │  └─ notifications/
│  └─ tests/
│
├─ docs/
│  ├─ DESIGN.md
│  ├─ RULES.md
│  ├─ ARCHITECTURE.md
│  ├─ ANIMATION_LANGUAGE.md
│  ├─ MULTIPLAYER_PROTOCOL.md
│  ├─ ONBOARDING.md
│  ├─ TEST_VECTORS.md
│  └─ adr/
│
├─ firebase/
│  ├─ firestore.rules
│  ├─ firestore.indexes.json
│  └─ database.rules.json
│
├─ .github/
│  └─ workflows/
├─ AGENTS.md
├─ package.json
├─ tsconfig.base.json
├─ firebase.json
├─ .firebaserc.example
├─ .nvmrc
└─ README.md
```

## 18.1 Dependency boundaries

### `packages/engine`

May depend on:

- TypeScript/runtime-standard utilities;
- deterministic RNG implementation;
- schema-free domain types.

Must not depend on:

- DOM;
- PixiJS;
- Firebase;
- timers;
- localStorage/IndexedDB;
- audio;
- browser globals.

### `packages/protocol`

Contains:

- network DTOs;
- runtime schemas;
- protocol versioning;
- event visibility types;
- idempotency fields.

### `apps/web`

Owns:

- presentation;
- input;
- local AI orchestration;
- local persistence;
- tutorial;
- online client adapters.

### `functions`

Owns:

- authentication checks;
- membership checks;
- authoritative private match state;
- command validation;
- transactions;
- turn publication;
- cleanup;
- notification triggers.

---

# 19. Engine architecture

## 19.1 Core transition contract

```ts
interface EngineTransition {
  state: AuthoritativeGameState;
  events: readonly GameEvent[];
  checkpoint: EngineCheckpoint;
}

function applyCommand(
  state: AuthoritativeGameState,
  command: GameCommand,
  rng: RandomSource
): EngineTransition;
```

Properties:

- pure for the same inputs;
- no rendering calls;
- no network calls;
- no timers;
- no persistence;
- no random calls outside `RandomSource`;
- rejected commands return structured errors without partial mutation.

## 19.2 State categories

### AuthoritativeGameState

Contains all information required to enforce rules:

- full deck order;
- both private hands;
- public field;
- captures;
- scores;
- round/match state;
- active player;
- pending legal choice;
- yaku-seen keys;
- multiplier;
- last Koi-Koi caller;
- special privilege;
- command/version metadata.

### PublicGameState

Contains:

- field;
- visible captures;
- hand counts;
- scores;
- round;
- multiplier;
- public decision/result state;
- public history.

Must not contain:

- unrevealed deck order;
- opponent private hand;
- server-only RNG state.

### PlayerObservation

Contains:

```ts
interface PlayerObservation {
  formatVersion: 1;
  playerId: PlayerId;
  publicState: PublicGameState;
  ownHand: readonly CardId[];
  legalActions: readonly LegalAction[];
}
```

`publicState` carries captures, counts, field, score, phase, and history without either exact hand or
the unrevealed draw order. `ownHand` is the only private card zone added by the observation. This is
the only game view available to CPU decision code.

## 19.3 Phase state machine

Use a discriminated union.

```ts
type EnginePhase =
  | { kind: "awaitingHandPlay"; playerId: PlayerId }
  | { kind: "awaitingDrawResolution"; playerId: PlayerId; drawnCardId: CardId; resolution: CapturePreview }
  | { kind: "awaitingYakuDecision"; playerId: PlayerId; context: YakuDecisionContext }
  | { kind: "roundComplete"; result: RoundResult }
  | { kind: "awaitingRoundReady"; nextRoundNumber: number }
  | { kind: "matchComplete"; result: MatchResult };
```

The engine should avoid presentation-only phases such as “card is halfway through a flip.”

## 19.4 Commands

Initial command catalog:

```ts
type GameCommand =
  | StartMatchCommand
  | PlayHandCardCommand
  | ResolveDrawCardCommand
  | ChooseYakuDecisionCommand
  | AcknowledgeRoundCommand
  | StartRematchCommand;
```

Examples:

```ts
interface PlayHandCardCommand {
  type: "playHandCard";
  commandId: string;
  actorId: PlayerId;
  expectedStateVersion: number;
  cardId: CardId;
  targetFieldCardId?: CardId;
}

interface ResolveDrawCardCommand {
  type: "resolveDrawCard";
  commandId: string;
  actorId: PlayerId;
  expectedStateVersion: number;
  targetFieldCardId?: CardId;
}

interface ChooseYakuDecisionCommand {
  type: "chooseYakuDecision";
  commandId: string;
  actorId: PlayerId;
  expectedStateVersion: number;
  decision: "bank" | "koiKoi";
}
```

## 19.5 Events

Events express what happened, not how to animate it.

Representative catalog:

```ts
type GameEvent =
  | MatchStarted
  | RoundStarted
  | CardsDealt
  | InitialFieldCancellationDetected
  | LuckyHandDeclared
  | AutomaticRoundResultCommitted
  | HandCardPlayed
  | CardPlacedOnField
  | CaptureStarted
  | CardsCaptured
  | DrawCardRevealed
  | DrawCaptureChoiceRequired
  | YakuCompleted
  | YakuValueChanged
  | YakuDecisionRequired
  | KoiKoiCalled
  | TableMultiplierChanged
  | PointsBanked
  | EndOfPlayReached
  | TurnCompleted
  | RoundCompleted
  | StarterChanged
  | SpecialPrivilegeGranted
  | MatchCompleted;
```

## 19.6 Event visibility

Every internal event must have a projection policy:

- `public`;
- `private:<playerId>`;
- `serverOnly`.

Examples:

- exact initial hand cards: private to owning player;
- deck order: server-only;
- played card: public;
- drawn/revealed card: public;
- remaining opponent hand contents: never public;
- hand count: public.

## 19.7 Event versus state responsibility

State answers:

> What is true now?

Events answer:

> What changed to make it true?

Persistence stores authoritative state checkpoints. Animation and replay use events.

## 19.8 Deterministic random source

Local and CPU games use a seeded RNG.

```ts
interface RandomSource {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  snapshot(): RngSnapshot;
}
```

Requirements:

- no `Math.random()` in engine or AI;
- seed included in test failures and local replay diagnostics;
- shuffle algorithm covered by tests;
- server multiplayer does not expose its RNG seed or deck order to clients.

## 19.9 Canonical serialization, replay, and integrity

Canonical JSON version 1 sorts plain-record keys, preserves semantic array order, accepts only
JSON-safe primitive values and safe integers, and rejects cycles or non-plain objects. Deterministic
integrity hashes use portable SHA-256 and the `sha256:<lowercase-hex>` encoding.

Public-state hashes exclude both exact hands, the unrevealed draw order, RNG/checkpoints,
server-only events, seen-trigger history, and accepted command IDs. Private authoritative replay
hashes include state plus the external checkpoint and are never exposed as a client projection.
Hashes detect deterministic drift; they are not signatures or authorization proofs.

Private replay logs contain the initial RNG snapshot and each accepted semantic command with exact
before/after state, event, checkpoint, and public-state hashes. Replaying a log calls the production
Start, Gameplay, and Advance seams and verifies every boundary. Ordered-deck fixture entry points are
not production replay commands.

---

# 20. Presentation architecture

## 20.1 Pixi scene

Recommended scene containers:

```text
TableScene
├─ BackgroundLayer
├─ OpponentHandLayer
├─ OpponentCaptureLayer
├─ FieldLayer
├─ DrawPileLayer
├─ RevealLayer
├─ PlayerCaptureLayer
├─ PlayerHandLayer
├─ EffectsLayer
└─ InteractionOverlayLayer
```

Use explicit z-ordering. Cards in transit move temporarily to the transit/effects layer.

## 20.2 Layout service

```ts
interface BoardLayoutService {
  compute(viewport: Viewport, projection: BoardProjection): BoardLayout;
}
```

It returns logical transforms:

- position;
- scale;
- rotation;
- overlap;
- z-order;
- interaction bounds.

It does not mutate game state.

## 20.3 Card asset manager

Runtime responsibilities:

- load the selected **resolved deck package manifest**;
- resolve card face texture by canonical card ID;
- resolve card-back texture and package preview assets;
- validate that all 48 canonical card IDs resolve after inheritance;
- preload the active deck efficiently;
- support runtime switching between installed deck packages without changing engine state;
- provide fallback art only in development;
- report missing or invalid assets clearly;
- remain independent from legacy sprite-sheet coordinates.

The runtime asset manager consumes generated/normalized assets. It does **not** destructively crop source artwork and does not own the authoring workflow.

Prefer one stable texture/atlas entry per canonical card ID in generated runtime output.

## 20.4 Deck package resolver

The renderer must resolve artwork through a package abstraction rather than hard-coded paths.

```ts
interface ResolvedDeckPackage {
  formatVersion: number;
  id: string;
  name: string;
  cardFaces: Readonly<Record<CardId, ResolvedCardArt>>;
  cardBack: ResolvedImageAsset;
  preview: DeckPreviewMetadata;
}
```

Requirements:

- one canonical `CardId` always refers to the same game card regardless of artwork package;
- a package may optionally inherit from another package during development;
- a resolved/shipping package must provide complete effective coverage for all 48 cards;
- package choice is local presentation state and must never affect gameplay, save semantics, CPU decisions, network commands, or multiplayer fairness;
- two online opponents may use different deck packages while playing the same match;
- network records contain canonical card IDs, never package filenames or texture identifiers.

The complete deck-package authoring contract is defined in `docs/DECK_ART.md`.

## 20.5 DOM shell

HTML/CSS should own:

- home and match setup;
- settings;
- rulebook;
- card guide;
- decision panel;
- round and match recap;
- current-games shelf;
- online invite/join flow;
- accessible text history;
- connection state;
- dialogs and error messages.

The canvas must not be the only source of critical text.

## 20.6 State store

Use a small explicit application store with selectors.

Separate:

- confirmed engine state;
- current player observation;
- presentation queue;
- screen/navigation state;
- settings;
- network status;
- tutorial director state.

Avoid a single global mutable object containing all systems.

---

# 21. CPU opponent design

## 21.1 Fairness boundary

CPU code receives only `PlayerObservation`.

A test must prove:

> Changing the human player’s hidden hand while preserving all public information does not change the CPU’s input observation.

No CPU function may accept `AuthoritativeGameState`.

## 21.2 Personality versus difficulty

Personality controls preferences:

- **The Timid:** secures points, avoids exposing high-value cards, Banks earlier.
- **The Monk:** balances immediate value, denial, and yaku development.
- **The Gambler:** pursues high multipliers and accepts volatility.

Difficulty controls competence:

- search/rollout count;
- rollout depth;
- quality of opponent modeling;
- amount of seeded decision noise;
- awareness of match score and final-round consequences.

A difficult Timid remains cautious but makes stronger cautious decisions. A difficult Gambler remains aggressive but is not random.

## 21.3 AI development stages

### Stage 1 — Fair heuristic AI

Phase 6A receives one `PlayerObservationV1` and returns exactly one existing `LegalActionV1` or
`null` when the observation has no legal action. It is deterministic and has no random source,
authoritative-state parameter, private-state reconstruction, command-ID generation, or browser side
effect. The caller alone turns the returned existing legal action into a command.

Score only the observation's legal actions using:

- immediate captured value;
- yaku completion;
- yaku progress;
- denial from public information;
- current round month;
- table multiplier;
- remaining card counts;
- personality weights.

Phase 6A is player A (human) versus player B (CPU) for every existing 3/6/12-round match format.
It is session-only: it does not create or mutate a Phase 5B local save. CPU actions use the same
accepted command, public-event, and animation path as a human action, while the renderer remains on
the human observation and never receives the CPU's private hand.

Difficulty tiers, reason/confidence tokens, and match-context adaptation are Phase 6B. Seeded
noise, hidden-card determinization, rollout/search, and simulation tuning are Phase 6C.

### Stage 2 — Determinization rollouts

1. Generate plausible assignments of unseen cards consistent with public information.
2. Simulate candidate actions.
3. Aggregate expected outcomes.
4. Select according to personality utility.
5. Use seeded randomness for ties/noise.

## 21.4 AI decision explanation

Return an explanation token, not hidden chain-of-thought.

```ts
interface AIDecision {
  command: GameCommand;
  reason:
    | "secureLead"
    | "completeYaku"
    | "denyVisibleThreat"
    | "strongFuturePotential"
    | "multiplierPressure"
    | "comebackRisk";
  confidence: number;
}
```

UI example:

> The Gambler called Koi-Koi because several public cards still support a high-value yaku.

## 21.5 CPU pacing

CPU computation and presentation timing are separate.

- Compute immediately or in a worker.
- Add a short configurable “thinking” beat.
- Animate the exact same public events used by remote turns.
- Fast/Instant modes shorten or remove the artificial delay.

## 21.6 Simulation metrics

Run large seeded batches and report by personality/difficulty:

- win rate;
- average score;
- average multiplier at Bank;
- Koi-Koi frequency;
- forced-Koi outcomes;
- lucky-hand frequency and automatic-round-result presentation;
- no-score rounds;
- average match length in turns;
- first-player advantage;
- illegal-command count, which must be zero.

---

# 22. Local persistence

## 22.1 Storage

Use IndexedDB for:

- local/CPU saves;
- tutorial progress;
- user settings;
- cosmetic preferences;
- replay diagnostics if enabled.

Online match authority remains on Firebase.

## 22.2 Save boundary

Autosave only at stable engine checkpoints, such as:

- awaiting a hand play;
- awaiting draw resolution;
- awaiting a player choice that can be reconstructed;
- round complete;
- match complete.

Do not save halfway through a tween. A browser write occurs only after the corresponding public
presentation has settled; writes are serialized, coalesced, and monotonic so an older completion
cannot overwrite a newer checkpoint. A completed match remains the active save until explicit
replacement or deletion.

## 22.3 New format

```ts
interface LocalSaveV1 {
  formatVersion: 1;
  gameVersion: string;
  saveId: string;
  mode: "cpu" | "local" | "practice";
  createdAt: number;
  updatedAt: number;
  authoritativeState: SerializedAuthoritativeGameState;
  rng: SerializedRngState;
  commandLog?: SerializedGameCommand[];
}
```

Phase 5B produces only one active `mode: "local"` save. The union reserves future modes; it does
not authorize CPU, practice, online, Firebase, or legacy-save behavior in this phase. `commandLog`
is not persisted in Phase 5B. The checkpoint contains private authoritative state and RNG data and
is never a public projection, DOM/debug payload, console payload, or default diagnostic export.

The local save decoder is a strict versioned boundary: it accepts only the exact supported
`LocalSaveV1` shape and supported nested state/checkpoint revisions, validates match/checkpoint
identity and authoritative invariants, and rejects unknown, missing, malformed, or unsupported
fields/versions. Phase 5B performs no migration of old or future save formats.

Do not include:

- sprite coordinates;
- animation timers;
- loaded textures;
- hover state;
- open menu;
- audio playback position;
- network connection state;
- legacy codes.

## 22.4 Recovery

On startup:

- validate schema;
- validate card ownership invariants;
- reject corrupt saves with a clear message;
- never partially load;
- offer Continue/Delete for a valid active save;
- offer Delete, Start New, and a sanitized diagnostic export for a corrupt save;
- keep a live match usable with an explicit session-only warning when storage is unavailable or a
  write fails;
- derive the active viewer and privacy/Ready cover from restored authority rather than serializing
  an open modal, tween, selection, or other presentation state.

---

# 23. Online multiplayer model

## 23.1 Experience definition

Online play is asynchronous turn-based play.

A remote player may complete a turn while the receiving player is absent. The receiving player must see that turn replay before their own controls unlock.

## 23.2 Core rule

The network sends semantic commands and events, never animation instructions.

Do not transmit:

- screen coordinates;
- tween durations;
- sprite names;
- audio timing;
- complete deck seed;
- opponent hand;
- unrevealed deck order.

## 23.3 Authoritative command flow

```text
Active player input
      ↓
Client submits command with idempotency key
      ↓
Cloud Function authenticates and validates membership
      ↓
Transaction reads private authoritative state
      ↓
Shared engine validates and applies command
      ↓
Server stores new private state and projected player views
      ↓
When turn reaches a stable boundary, server publishes TurnRecord
      ↓
Recipient receives TurnRecord
      ↓
Recipient replays public events
      ↓
Recipient controls unlock
```

## 23.4 Multi-command turn

A player’s turn may require multiple server commands:

- play a hand card;
- choose among two field matches;
- choose a draw capture after the server reveals a drawn card;
- Bank or call Koi-Koi.

The server may return interim private responses to the active player. The opponent-facing `TurnRecord` is published when the turn ends or the round/match ends.

## 23.5 Initial live behavior

For the first multiplayer release:

- do not stream the opponent’s unresolved thinking;
- publish the completed turn as one replayable record;
- if both players are online, the receiver gets the record immediately after commit;
- if offline, the record waits for the receiver;
- later live/provisional streaming is optional and must not replace the canonical completed record.

## 23.6 TurnRecord

```ts
interface PublicTurnRecordV1 {
  protocolVersion: 1;
  canonicalizationVersion: 1;
  hashAlgorithm: "sha256";
  recordSequence: number;
  matchId: string;
  roundNumber: number;
  turnNumber: number;
  recordKind: "playerTurn" | "system";
  actorId: PlayerId | null;
  nextActorId: PlayerId | null;
  previousStateVersion: number;
  resultingStateVersion: number;
  beforePublicState: PublicGameState;
  publicEvents: readonly PublicGameEvent[];
  resultingPublicStateHash: string;
  endedRound: boolean;
  endedMatch: boolean;
  committedAt: string;
}
```

`beforePublicState` allows a new device to replay the latest opponent turn without relying on a prior local cache. System records use `actorId: null` for cancellations, lucky-hand results, automatic transitions, and other outcomes without a normal acting player.

`recordSequence` uniquely orders player and system records; `turnNumber` remains the round-local
gameplay number. `committedAt` is transport metadata and is excluded from canonical state/event
hashes. Runtime decoding rejects unknown versions, forbidden private fields, and non-public events.

## 23.7 Recipient replay sequence

1. Load the recipient’s current private projected view.
2. Load the newest unacknowledged opponent `TurnRecord`.
3. Set the board to `beforePublicState`, merged with the recipient’s permitted private information.
4. Disable gameplay input.
5. Play events in order.
6. Update HUD/yaku/multiplier at event-appropriate moments.
7. Verify the derived public state hash.
8. Snap to the server-projected current view if needed.
9. Show **Your Turn**.
10. Enable controls.

If hash verification fails:

- stop animation;
- fetch a fresh projected view;
- snap to authoritative presentation;
- show a non-destructive sync warning;
- send diagnostics without private card content.

## 23.8 Opponent hand animation

During remote replay:

- opponent hand is shown as card backs;
- one card back leaves the hand;
- the played card becomes face-up after clearing the private hand area;
- remaining opponent hand cards reflow;
- only the played card is revealed;
- draw card is shown when publicly drawn;
- no other private card face is ever available to the client.

## 23.9 Replay controls

During remote replay:

- normal/fast/instant setting applies;
- tap accelerates;
- skip is allowed;
- text recap stays visible;
- input unlocks only after the presentation reaches current state;
- server does not wait for replay acknowledgment to advance authoritative state.

## 23.10 Multiple queued records

Normally, two-player turn order means only one opponent turn precedes the local player’s turn. The client must still handle:

- round-start system records;
- lucky-hand immediate round results;
- reconnect after multiple unviewed round transitions;
- match-end records.

Replay in chronological order when meaningful, with an option to skip to current state.

---

# 24. Firebase architecture

## 24.1 Services

Recommended:

- Firebase Authentication for identity.
- Anonymous authentication initially, with optional account linking later.
- Cloud Firestore for match records, player projections, turns, and user match indexes.
- Cloud Functions callable endpoints for all authoritative mutations.
- Realtime Database for presence/disconnect state if required.
- App Check before public release.
- Emulator Suite for local integration and security tests.

## 24.2 Client write policy

Clients must not directly write authoritative match state.

Allowed direct writes should be minimal and limited to carefully secured non-authoritative data, such as presence if using Realtime Database.

All gameplay mutations go through callable functions.

## 24.3 Suggested Firestore structure

```text
matches/{matchId}
  public summary fields
  status
  roundNumber
  activePlayerId
  stateVersion
  expiresAt
  createdAt
  updatedAt

matches/{matchId}/members/{uid}
  role
  playerId
  displayName
  joinedAt
  lastSeenAt

matches/{matchId}/serverState/current
  complete private authoritative state
  RNG/deck state
  denied to all client SDK reads/writes

matches/{matchId}/views/{uid}
  private player projection
  own hand
  public board
  legal actions
  readable only by matching uid
  server-write only

matches/{matchId}/turns/{turnNumber}
  PublicTurnRecordV1
  readable only by members
  server-write only

users/{uid}/matchIndex/{matchId}
  display summary
  opponent label
  status
  whose turn
  updatedAt
  archived
```

## 24.4 Callable endpoints

Initial set:

- `createMatch`
- `joinMatch`
- `submitGameCommand`
- `acknowledgeTurnReplay`
- `markRoundReady`
- `resignMatch`
- `requestRematch`
- `archiveMatch`
- `leaveWaitingMatch`

## 24.5 Command idempotency

Every submitted command includes:

- unique `commandId`;
- expected state version;
- actor identity;
- match ID.

The server stores accepted command receipts. After authentication and membership validation, an
exact retry is looked up before active-player and expected-version checks. The same principal and
canonical command returns its original result without applying it twice, even after later commands
have advanced the match. Reusing the same accepted ID with a different payload or principal is an
idempotency conflict; rejected commands are not cached.

## 24.6 Transaction behavior

`submitGameCommand` must:

1. authenticate caller;
2. verify App Check when enforced;
3. verify match membership;
4. parse the versioned command schema;
5. return an exact accepted-command retry or reject a conflicting reuse;
6. verify caller is the active player when the command requires one;
7. verify expected state version;
8. apply shared engine;
9. persist the accepted receipt with private state/checkpoint/log atomically;
10. update both player projections atomically;
11. publish a completed turn when a turn boundary is reached;
12. update match index summaries;
13. return the caller’s permitted result.

## 24.7 Privacy rules

A player may read:

- their own view;
- public turn records for matches they belong to;
- match summary;
- member display names;
- their own match index.

A player may not read:

- opponent private view;
- server state;
- full deck order;
- server RNG;
- opponent unplayed hand.

## 24.8 Match expiration

Recommended default:

- 30-day inactivity expiration;
- configurable backend constant;
- warning before archival if notifications exist;
- cleanup function deletes or archives private state;
- completed matches may retain a public recap longer than abandoned matches.

## 24.9 Presence

Presence is informational and must not determine rules legality.

Show:

- online;
- offline;
- last active;
- opponent is taking a turn;
- waiting on you.

A player can submit a turn regardless of whether the opponent is online.

## 24.10 Notifications

Deferred but architecturally supported:

- browser/PWA notification when it becomes the user’s turn;
- round result, including explicit cancellation/lucky-hand reason codes;
- match invite;
- match expiration warning.

Notifications must never include private card information.

---

# 25. Security and abuse resistance

## 25.1 Baseline protections

- Server-authoritative engine.
- Firebase Authentication.
- App Check.
- Membership checks.
- Runtime schema validation.
- Command size limits.
- Rate limits per user and match.
- Idempotency keys.
- Expected state versions.
- Server timestamps.
- Deny-by-default rules.
- Emulator security tests.
- Structured audit logs without private card dumps.

## 25.2 Threats addressed

- submitting a card not in the caller’s hand;
- choosing an illegal capture;
- acting out of turn;
- fabricating score or multiplier;
- replaying the same command;
- reading opponent hand;
- deriving deck order from a shared seed;
- overwriting a completed turn;
- joining a match without an invite;
- writing arbitrary snapshots.

## 25.3 Not claimed

The first release does not claim protection against:

- collusion;
- a player using external assistance;
- screen recording;
- advanced account abuse beyond normal Firebase controls.

---

# 26. Accessibility

## 26.1 Required

- Full keyboard navigation for DOM controls.
- Keyboard-accessible card selection.
- Visible focus.
- Text alternatives for card images.
- Month/category information not dependent on color.
- Multiplier expressed in text.
- Text turn recap.
- Reduced motion.
- Animation speed control.
- Sufficient contrast.
- No critical information communicated only through sound.
- Scalable text.
- Screen-reader announcements for turn, capture, yaku, multiplier, and score changes.

## 26.2 Canvas accessibility bridge

Each interactive Pixi card should have a corresponding semantic DOM representation or accessibility overlay that exposes:

- card name;
- month;
- category;
- selected state;
- legal target state;
- action label.

## 26.3 Input tolerance

- Touch targets at least approximately 44 CSS pixels where practical.
- Avoid precision dragging as a requirement.
- Allow canceling a selection.
- Prevent accidental double-submit.
- Keep important controls away from mobile browser gesture edges.

---

# 27. Visual and audio direction

## 27.1 Art direction

Recommended tone:

- tactile card-table experience;
- paper, lacquer, wood, or cloth-inspired surfaces;
- restrained Japanese visual influence without ornamental clutter;
- modern Western-readable information hierarchy;
- strong card art priority;
- calm at 1×, escalating tension through 4×.

## 27.2 Deck art packages

The user intends to create a completely new 48-card art set. The art pipeline must therefore be a first-class development system rather than a one-time asset conversion step.

Architecture supports multiple local visual deck packages. Deck selection is cosmetic and does not alter game state. A deck package maps the 48 canonical card IDs to visual source artwork and generated runtime textures.

Initial release should ship only deck packages that have:

- complete effective 48-card coverage after inheritance resolution;
- a valid package manifest;
- a valid card back;
- consistent normalized output geometry;
- clear canonical card-ID mapping;
- verified ownership or license;
- readable portrait-mobile presentation;
- both generated contact sheets (art-review and gameplay-size) have been visually reviewed;
- no unresolved importer validation errors.

The game must support more than one installed deck package without code changes to the rules engine or card-table logic.

## 27.3 Deck art authoring and import pipeline

### 27.3.1 Core separation

Use three independent concepts:

```text
Canonical card data
    ↓ CardId
Deck art package
    ↓ source art + transform metadata
Asset importer/builder
    ↓ normalized generated textures
Runtime CardAssetManager
```

The engine understands cards. The deck package understands artwork. The importer understands image normalization. These responsibilities must not be coupled.

### 27.3.2 Non-destructive source policy

Original source art is immutable input. Automatic or manual resizing/cropping must be represented as metadata and generated derivatives. Never overwrite the source file during normalization.

Recommended package layout:

```text
decks/<deck-id>/
  deck.json
  source/
    <canonical-card-id>.<ext>
    card-back.<ext>
  transforms.json
  preview/
    thumbnail.<ext>
    showcase.<ext>
  generated/
    manifest.json
    cards/
    backs/
    thumbnails/
    contact-sheet.<ext>
```

`generated/` is derived output and must be reproducible from `source/`, package metadata, and transform metadata.

### 27.3.3 Import modes per card

Each card may independently use one of three authoring modes:

- **Automatic:** importer fits source art to the canonical art frame using package defaults and an optional focal point.
- **Manual:** author specifies a normalized crop/transform for precise composition.
- **Mixed:** package uses automatic behavior by default with manual overrides only for cards that need correction. This is the expected normal workflow.

Manual transform data must be resolution-independent. Store focal points/crop rectangles/offsets in normalized coordinates rather than output-pixel offsets so transforms remain valid when runtime texture resolutions change.

Representative transform model:

```ts
interface CardArtTransform {
  mode: "auto" | "manual";
  fit?: "cover" | "contain";
  focusX?: number; // 0..1
  focusY?: number; // 0..1
  crop?: { x: number; y: number; width: number; height: number }; // normalized
  zoom?: number;
  rotationDeg?: number;
}
```

The exact schema is versioned and validated at build time.

### 27.3.4 Canonical frame, aspect ratio, and safe area

Before final production of the new art set, lock an **Art Specification Decision** containing:

- canonical visible-art aspect ratio;
- recommended master/source resolution;
- minimum accepted source resolution before warnings/errors;
- runtime derivative sizes or density policy;
- bleed rules;
- safe-area percentage for critical subjects;
- whether transparent source art is supported/expected.

Do not invent these dimensions during engine implementation. They are an art-direction decision and must be approved before mass card generation.

Default design direction: the game supplies the physical card frame, corner radius, selection treatment, shadow, and interaction effects. The new source art should generally be full-bleed artwork inside that game-controlled frame rather than baking gameplay UI, month labels, selection effects, or accessibility labels into each image.

### 27.3.5 Canonical filename mapping and assignment

The fastest path should be naming source files with canonical card IDs. The importer should bulk-match exact filenames automatically.

The Deck Workshop must also allow a source file to be assigned/reassigned to a card ID through UI so imperfect filenames do not require manual JSON editing. Duplicate assignments and missing IDs are validation errors.

### 27.3.6 Package inheritance

Support optional package inheritance:

```json
{
  "id": "modern-halloween",
  "extends": "modern-base"
}
```

An inherited package may override only selected cards or the card back. The resolver fills all other cards from its parent. Circular inheritance is invalid. Before shipping, validation operates on the **resolved package**, not merely the local override folder.

This enables seasonal variants, art experiments, accessibility variants, and incremental replacement without duplicating 48 source files.

### 27.3.7 Card backs and package preview

Card backs are package-owned visual assets and may vary by deck package. A package contains at least one default back. Additional back variants may be added later without changing the engine.

Package preview metadata should support:

- deck display name;
- author/credit/license metadata;
- thumbnail;
- featured card IDs;
- optional showcase image;
- package/version information.

### 27.3.8 Deck Workshop

Build a development-only **Deck Workshop** early in the rendering phase. It must make normal art iteration possible without hand-editing transform JSON.

Required capabilities:

- display all 48 canonical card slots grouped by month;
- show missing, auto-fitted, manually adjusted, warning, and invalid status;
- import/assign source files to card IDs;
- auto-match canonical filenames;
- preview the final game-controlled card frame;
- drag artwork within the crop frame;
- zoom and optionally rotate;
- set/reset focal point;
- switch between Auto and Manual;
- reset a card to package defaults;
- save normalized transform overrides;
- preview at portrait-phone card size and larger inspection size;
- preview the card back;
- generate/rebuild all runtime derivatives;
- generate a 48-card contact sheet;
- run validation and show actionable warnings/errors.

The Workshop is a developer tool, not a public runtime card editor for the first release.

### 27.3.9 Deck validation report

The importer/validator must report at minimum:

- package schema version;
- resolved cards found out of 48;
- missing card IDs;
- duplicate assignments;
- unreadable/corrupt images;
- source files below recommended/minimum resolution;
- transform schema errors;
- inheritance errors/cycles;
- missing/invalid card back;
- automatic versus manual transform counts;
- preview/contact-sheet generation status.

Warnings may permit a development build. Missing canonical cards, unreadable required assets, duplicate IDs, invalid inheritance, or invalid transforms are release-blocking.

### 27.3.10 Runtime deck switching

A `CardView` retains its canonical `cardId` when the user switches deck packages. Runtime switching changes textures only. Existing game state and replay records are unaffected.

Multiplayer deck choice is local-only. Player A and Player B may use different art packages while the network exchanges the same canonical card IDs.

### 27.3.11 Information overlays are not baked into art

Beginner and accessibility overlays—month, flower, category, yaku relevance, legal-target state—belong to the game presentation layer, not individual deck artwork. This keeps radically different art packages equally teachable and allows overlays to be disabled for experienced players.

### 27.3.12 Approved `ART_SPEC v1`

The new primary deck and all v1-compatible visual deck packages use one immutable physical card geometry:

| Property | Approved v1 value |
|---|---|
| Outer card ratio | **5:8 portrait** |
| Source visible-art ratio | **5:8 full bleed** |
| Preferred master | **1600 × 2560 px** or larger |
| Recommended-quality floor | **1200 × 1920 px** |
| Release minimum | **800 × 1280 px** unless expressly overridden |
| Preferred source format | **PNG**; JPEG/WebP accepted by importer |
| Color space | **sRGB** |
| Critical safe area | **84% width × 88% height**, centered |
| Approximate margins | **8% left/right; 6% top/bottom** |
| Physical frame | **Game-controlled** |
| Initial visual frame width | approximately **3% of card width**, tunable |
| Default auto-fit | **cover + normalized focal point** |
| Runtime table texture | **640 × 1024 px** |
| Runtime thumbnail | **160 × 256 px** |
| Optional inspection texture | **1280 × 2048 px only if measured need justifies it** |
| Card back | supplied per resolved deck package |
| Package-specific geometry | **not allowed in v1** |

Sources below `1200 × 1920` produce a quality warning. Sources below `800 × 1280` are release-blocking by default unless an explicit owner-approved exception is recorded.

The source illustration is full bleed. The game, not the source image, owns physical border/frame geometry, corner rounding, shadows, selection/legal-target effects, accessibility overlays, and hitboxes.

Phase 0D must define/export a reusable Art Guide showing the `1600 × 2560` canvas, full-bleed edge, 84% × 88% safe area, and approximate frame overlay.

Before full-deck visual production is considered locked, test four representative finished cards through the real pipeline: one visually dense card, one simple card, one Bright with a large focal subject, and one Plain. Review them at phone gameplay size and in the primary `390 × 844` board. If they expose geometry/readability problems, revise the art spec before approving the remaining set.

### 27.3.13 Dual contact-sheet approval

Every candidate deck must generate:

1. an **art-review contact sheet** at a large review size; and
2. a **gameplay-size contact sheet** approximating card size in the primary `390 × 844` portrait-phone layout.

A deck is not visually approved until both sheets are reviewed, validation is clean, and representative cards have been checked in the real portrait board.

### 27.3.14 Expected author workflow

```text
Create/generate high-resolution source art
        ↓
Assign canonical CardId / filename
        ↓
Drop into deck source folder or assign in Workshop
        ↓
Run automatic importer
        ↓
Inspect 48-card grid plus art-review and gameplay-size contact sheets
        ↓
Manually correct only problem cards
        ↓
Save normalized transform overrides
        ↓
Generate optimized runtime derivatives
        ↓
Validate complete resolved package
        ↓
Deck becomes selectable in development/game build
```

The workflow must make replacing one card, rebuilding one package, or adding a second complete deck routine and repeatable.

## 27.4 Audio

Initial audio categories:

- card lift;
- card place;
- capture;
- deck draw;
- card flip;
- yaku completion;
- Bank;
- Koi-Koi;
- multiplier increase;
- round result, including explicit cancellation/lucky-hand reason codes;
- match result.

Provide:

- master volume;
- effects volume;
- music volume if music is added;
- mute;
- reduced audio intensity if needed.

---

# 28. Performance targets

## 28.1 Runtime

- Target 60 FPS during normal card animations on modern mobile devices.
- Avoid recreating all card objects on each state update.
- No unbounded event listeners or timers.
- Load one primary deck skin initially; lazy-load alternatives.
- Reuse textures and containers.
- Pause nonessential ticker work when tab is hidden.
- Avoid layout thrashing between DOM and canvas.

## 28.2 Loading

- Show meaningful loading progress for card assets.
- Validate card manifest before enabling play.
- Cache versioned assets through normal browser/PWA mechanisms.
- Fail visibly if required card art is missing.

## 28.3 Network

- Online commands use compact semantic payloads.
- Do not send full authoritative state on every animation step.
- Store turn records small enough for quick mobile retrieval.
- Compress only if measurement shows it is needed.
- Avoid polling when Firestore listeners can provide updates.

---

# 29. Testing strategy

## 29.1 Unit tests

- card catalog;
- deck-package manifest schemas and inheritance resolution;
- normalized art-transform schemas;
- asset importer mapping and deterministic generated manifest;
- shuffle and seeded RNG;
- legal move generation;
- capture resolution;
- yaku scoring;
- yaku trigger detection;
- Bank/Koi-Koi decisions;
- round transitions;
- match completion;
- state projections;
- protocol schemas.

## 29.2 Property/invariant tests

Use generated legal sequences to verify:

- 48-card ownership;
- no duplicates;
- valid active player;
- legal phase progression;
- deterministic replay;
- no private leakage;
- score/multiplier constraints.

## 29.3 Scenario tests

Use human-readable fixture files:

```json
{
  "id": "KOI-006",
  "description": "Hand-phase yaku Koi-Koi resumes draw",
  "initialState": {},
  "command": {},
  "expectedEvents": [],
  "expectedState": {}
}
```

## 29.4 AI tests

- CPU accepts only `PlayerObservation`.
- Fixed observation produces a fixed existing legal action without RNG.
- No illegal moves over large simulation batches.
- Personality metrics differ in expected directions.
- Difficulty improves outcome without changing personality identity only after Phase 6B.

## 29.5 Presentation tests

- event sequence produces expected final CardView zones;
- skip produces same final projection as normal animation;
- reduced motion produces same final projection;
- viewport layout snapshots;
- runtime switching between at least two deck packages preserves CardView identity/state;
- Deck Workshop transforms reproduce the same generated crop after rebuild;
- no card remains in transit after queue completion;
- replay does not mutate authoritative state.

## 29.6 Browser end-to-end tests

- tutorial completion;
- one full local round;
- Bank after hand phase;
- Koi-Koi after hand phase then draw;
- two-match choice;
- four-card sweep;
- save/reload stable checkpoint;
- CPU turn animation;
- responsive layouts;
- keyboard operation.

## 29.7 Firebase emulator tests

- create/join;
- unauthorized read denial;
- opponent-view denial;
- legal command accepted;
- illegal command rejected;
- stale state version rejected;
- duplicate command idempotent;
- turn record published once;
- reconnect view correct;
- rules deny direct authoritative writes;
- expiration cleanup.

## 29.8 Visual regression

Capture representative screenshots for:

- first-run menu;
- tutorial target highlight;
- normal board;
- 1×, 2×, 3×, 4×;
- yaku decision;
- remote turn replay;
- round recap;
- mobile and desktop.

---

# 30. Diagnostics and developer tools

## 30.1 Engine text renderer

Preserve the useful concept from the legacy project, but move it into the pure engine.

```ts
function renderStateForDiagnostics(
  observation: PlayerObservation | PublicGameState
): string;
```

It must:

- be stable for snapshots;
- omit forbidden private information;
- include phase, legal actions, scores, multiplier, field, captures, hand count, and pending decision;
- support bug reports and AI-assisted debugging.

## 30.2 Seeded scenario runner

Developer page/tool should allow:

- enter seed;
- load fixture;
- step commands;
- inspect events;
- change animation speed;
- replay previous turn;
- export sanitized diagnostics.

## 30.3 Animation sandbox

A separate development route should demonstrate:

- hand-to-field;
- pair capture;
- four-card sweep;
- deck reveal;
- category split;
- yaku completion;
- Koi-Koi 1×–4×;
- skip and reduced motion.

This allows graphics tuning without manufacturing full match states.

## 30.4 Deck Workshop and package validator

Provide the development-only authoring tool described in Section 27.3.8. The Workshop should be reachable from a development route and must use the same package schema/importer as production builds rather than maintaining a second crop system.

It should support batch validation, per-card fitting, contact-sheet generation, and rebuilding a selected deck package.

## 30.5 Network simulator

Development-only controls:

- latency;
- disconnect before response;
- duplicate response;
- stale client state;
- missed listener event;
- reconnect with pending opponent turn.

---

# 31. Telemetry and privacy

## 31.1 Principle

Telemetry should answer product and reliability questions without collecting private card state.

## 31.2 Useful events

- session start;
- mode selected;
- tutorial funnel;
- match started/completed/abandoned;
- animation speed;
- reduced motion;
- rule help usage;
- CPU personality/difficulty;
- online turn submit success/failure;
- opponent replay started/completed/skipped;
- reconnect success/failure;
- sync hash mismatch;
- crash/error code.

## 31.3 Avoid

- raw private hand;
- deck order;
- full save snapshots;
- invite links;
- personally identifying chat, because chat is out of scope;
- authentication tokens;
- Firebase credentials.

## 31.4 User control

Provide a clear telemetry toggle if nonessential analytics is enabled.

---

# 32. Continuous integration and deployment

## 32.1 Pull request checks

Required:

- install with locked dependencies;
- TypeScript typecheck;
- lint;
- format check;
- unit tests;
- engine scenario tests;
- protocol tests;
- production build;
- selected Playwright smoke tests.

Multiplayer phases add:

- Functions tests;
- Emulator rules tests;
- deployment config validation.

## 32.2 Branch policy

Recommended:

- protected `main`;
- phase/subphase feature branches;
- no direct unreviewed production deployment;
- version tags for playable milestones.

## 32.3 Deployment

Static web:

- GitHub Pages workflow;
- correct Vite base path;
- preview artifact for pull requests when practical.

Firebase:

- separate development and production projects;
- emulator-first;
- explicit deploy workflow;
- no service-account credentials committed;
- environment configuration documented.

---

# 33. Development phases

No phase may bypass the acceptance gate of the preceding phase.

## Phase 0 — Rule lock and project foundation

### Phase 0A — Canonical rules decision log

Deliver:

- `docs/RULES.md`;
- `docs/TEST_VECTORS.md`;
- resolved Scroll-scoring record and completed rules decision checklist;
- terminology lock;
- match-length/final-round behavior lock;
- list of intentional differences from legacy;
- initial `docs/PROJECT_MANIFEST.md` authority map;
- initial `docs/AI_WORKFLOW.md` orchestration policy;
- root `AGENTS.md` operating instructions.

Acceptance:

- no unresolved rule affects Phase 1 implementation;
- every special KoiKoi4x rule has at least one test vector;
- owner approves all blocking rules interpretations recorded in the checklist.

### Phase 0B — New repository scaffold

Deliver:

- workspace structure;
- TypeScript strict config;
- Vite web app;
- PixiJS boot screen;
- Vitest;
- Playwright;
- lint/format;
- GitHub Actions;
- README;
- architecture boundary tests where practical;
- project-scoped `.codex/agents/` definitions for the initial specialist set.

Acceptance:

- clean install;
- typecheck/lint/test/build pass;
- no legacy runtime code copied;
- old repository untouched.

### Phase 0C — Canonical card catalog

Deliver:

- 48-card data catalog;
- month/category/yaku metadata;
- stable canonical card ID convention;
- explicit separation between card metadata and artwork;
- card-catalog validation script.

Acceptance:

- exactly 48 unique canonical cards;
- exactly 4 per month;
- Sake Cup and Rain Bright flags verified;
- no engine/card-domain type contains deck-package filenames, crop data, or texture coordinates.

### Phase 0D — Deck package and art specification foundation

Deliver:

- `docs/DECK_ART.md` based on the package spec;
- versioned `deck.json` package schema;
- versioned normalized transform schema;
- optional `extends` inheritance contract;
- canonical filename/assignment convention;
- CLI/dev validation command;
- skeleton package for the new primary deck;
- encoded `ART_SPEC v1` constants and validation: 5:8 full bleed, 1600×2560 preferred master, 1200×1920 quality floor, 800×1280 release minimum, 84%×88% safe area, game-controlled frame, 640×1024 table derivative, and 160×256 thumbnail;
- exportable KoiKoi4x Art Guide/template generated from the same locked configuration;
- four-card pilot inputs covering dense, simple, Bright, and Plain compositions.

Acceptance:

- a package can map all 48 canonical IDs without changes to engine code;
- schema validation detects missing/duplicate IDs and inheritance cycles;
- source artwork is treated as immutable input;
- transform metadata uses normalized/resolution-independent coordinates;
- `ART_SPEC v1` values above are treated as approved and encoded in tooling/tests rather than re-decided by implementation;
- the four-card pilot can be processed through the importer before the remaining deck is visually approved.

## Phase 1 — Headless engine

### Phase 1A — State, RNG, deal

- deterministic RNG;
- match/round state;
- deal and initial-deal outcome handling;
- lucky hands;
- ownership invariants.

### Phase 1B — Turn and capture

- hand play;
- 0/1/2/3 match behavior;
- draw resolution;
- legal actions;
- phase state machine.

### Phase 1C — Yaku and trigger system

- all approved yaku;
- incremental scoring;
- trigger keys;
- current yaku total;
- rule fixtures.

### Phase 1D — KoiKoi4x round/match rules

- Bank;
- multiplier 1×–4×;
- last-caller exhaustion;
- starter rules;
- special 2× privilege;
- final-round leader;
- match recap data.

### Phase 1E — Projections and replay

- typed public state and own-player observation;
- exhaustive audience-based event visibility;
- canonical JSON v1 and portable SHA-256 state/event hashes;
- private command/checkpoint log and deterministic production-seam replay;
- immutable accepted-command retry receipts and conflict detection;
- versioned public turn-record protocol with runtime redaction validation;
- literal projection/invariant/replay fixtures and hidden-information tests.

Phase 1 acceptance:

- full rules suite passes;
- engine has no browser/Firebase dependencies;
- 10,002 generated legal matches complete across 3/6/12-round formats without invariant failure;
- same seed and commands reproduce exact state, events, checkpoint, and hash;
- all public/player/event/record serializations exclude forbidden private or server-only data.

## Phase 2 — Rendering foundation

### Phase 2A — Responsive Pixi table

- scene layers;
- viewport/layout service;
- mobile and desktop board skeleton.

### Phase 2B — Persistent cards and deck-package runtime

- CardView registry keyed by canonical CardId;
- resolved deck-package loader;
- face/back texture resolution;
- support for at least two installed deck packages;
- runtime deck switching without state mutation;
- zone assignment;
- hand/field/capture layouts.

### Phase 2C — AnimationDirector

- event planner;
- queue;
- normal/fast/instant;
- cancel/snap;
- reduced-motion interface.

### Phase 2D — Input

- selection;
- target highlights;
- Guided/Fast confirmation;
- optional drag;
- keyboard bridge.

### Phase 2E — Deck Workshop and importer

- 48-card package grid grouped by month;
- source assignment and canonical filename auto-match;
- Auto/Manual/Mixed fitting;
- drag/zoom/focal-point editing with normalized transforms;
- game-controlled frame preview;
- card-back preview;
- warnings/errors;
- art-review and gameplay-size contact-sheet generation;
- Art Guide/template export;
- generated runtime derivative rebuild;
- at least one second test package proving multi-deck support.

Phase 2 acceptance:

- animation sandbox demonstrates every core movement;
- skipping and normal playback reach identical final projections;
- responsive screenshots approved;
- a source image can be replaced and rebuilt without hand-editing application code;
- most cards can use automatic fitting while selected cards retain manual overrides;
- a second deck package can be installed and selected without engine changes;
- runtime switching preserves the same game state and canonical card identities;
- validator-generated art-review and gameplay-size 48-card contact sheets are reviewable before a deck is approved;
- the four-card pilot is approved in the 390×844 primary board before bulk deck geometry is treated as final.

## Phase 3 — One-round vertical slice

### Phase 3A — Complete local turn loop

- one full first round executes through real `PlayerObservationV1` inputs and engine gameplay
  commands; no browser/Pixi capture or scoring logic;
- legal Hand play, automatic Draw, exact-two Hand/Draw targets, pair/sweep capture, and the existing
  engine decision seam cannot deadlock;
- the owner-approved primary deck is the default while additional packages remain texture-only;
- public events drive recipient-relative animation boundaries, including legal field overflow above
  the base stable 2×4 lanes;
- completed turns cover the whole table before local viewer handoff and reveal the next private hand
  only after explicit Ready activation;
- a concise HTML text recap records public played, drawn, captured, yaku/result, and next-player
  facts; canvas output is not the sole record;
- opponent hands, unrevealed draw order, RNG/checkpoints, and command IDs remain outside player text
  and semantic controls.

### Phase 3B — Yaku decision presentation

- Render only the authoritative public active-yaku list/current total, value-change events, decision
  context, legal Bank/Koi-Koi actions, and table multiplier; browser presentation must not calculate
  yaku, scores, privilege, forced-Koi availability, or continuation outcomes.
- Show every new yaku in a phase together in one accessible decision surface. Hand and Draw remain
  separate decision windows, so a Koi-Koi call may lead to one later Draw decision, never concurrent
  decision surfaces.
- Make Bank arithmetic and Koi-Koi consequence explicit from the legal action: visible table and
  scoring multiplier are distinct under the special privilege; a 4× call remains 4×.
- Keep all decision controls actor-scoped and lock card play while an authoritative decision is open.
- Public yaku progress, multiplier, decision arithmetic, and post-command award/continuation feedback
  may enter accessible DOM/text output. Opponent hands, face-down identities, draw order, RNG,
  checkpoints, and command IDs may not.
- Phase 3B may state the authoritative Bank award/recap, but a dedicated round result, scoring
  animation, and transition screen remain Phase 3C work.

### Phase 3C — Round end

- Render one public result dialog only after card motion and any Phase 3B consequence feedback have
  settled. The dialog copies `RoundResultV1`/`MatchResultV1` values and committed public evidence; it
  does not calculate scoring, starter policy, privilege, or match outcome.
- Show the scheduled month/result reason, scorer or explicit 0–0 outcome, canonical active Yaku,
  base/table/scoring/award values, public score deltas and totals, and committed cancellation/lucky
  evidence where applicable.
- Animate the authoritative score change as a short presentation beat. Fast, Instant, and Reduced
  Motion reach the same final text and values; critical result information is never animation-only.
- Show the authoritative next-round month, starter, starter reason, and special privilege when
  present. Phase 3C's local action is explicitly `Start another local round`; it does not call the
  engine's multi-round advance seam or claim that the deterministic reset begins the displayed next
  month. Actual 3/6/12-round local execution remains Phase 5.
- Lock cards and every unrelated control while the modal is open, trap focus within its legal
  action, and include a recipient-safe whitelisted result object in `render_game_to_text`.

Phase 3 acceptance:

- one full round can be played without developer controls;
- all card movements are physical and legible;
- no full-board DOM rebuild for card motion.

## Phase 3E — Playability corrections

### Phase 3E-A — Table clarity and decision surfaces

- remove permanent empty field-slot chrome;
- bottom-safe Options access;
- public captured-card inspection;
- field-visible Koi-Koi decision tray;
- concise result summary with disclosed secondary details.

### Phase 3E-B — Authoritative interactive Draw resolution

- every revealed Draw card pauses for an authoritative player resolution action;
- no-match placement, unique pair, exact-two choice, and sweep reuse the same public interaction
  language as Hand play;
- browser presentation never reconstructs capture legality.

### Phase 3E-C — Physical Draw integration

- the top card visibly leaves the draw-pile top and enters Reveal;
- resolution input, animation, recap, replay, and accessibility remain aligned;
- root/Pages and deterministic replay gates cover every Draw-resolution family.

## Phase 3F — Focused playtesting polish

### Phase 3F-A — Simplified table and larger hand

- remove routine phase/status scaffolding and visible Confirm/Cancel controls from the table shell;
- reclaim the noninteractive canvas action strip for a materially larger active hand;
- reduce Options to themes, deck, fullscreen, and local restart;
- use one production animation presentation while automatically honoring reduced-motion settings;
- preserve Bank/Koi-Koi, result, handoff, capture inspection, legal-action authority, and the
  adaptive 8–17-card field.

### Phase 3F-B — Unified tap-only interaction

- make legal card and field taps the only ordinary Hand/Draw confirmation language;
- retain explicit Bank/Koi-Koi decisions and keyboard-equivalent semantic controls;
- preserve engine-owned capture legality; player-facing tap-only completion does not require an
  internal controller naming refactor.

### Phase 3F-C — Visual interaction cues

- make a selected Hand or Reveal source, its legal field targets, and the no-match field destination
  immediately distinguishable without restoring routine instruction or confirmation chrome;
- keep DOM semantic overlays pointer-quiet so Pixi owns ordinary visual feedback while keyboard focus
  and accessible names remain available;
- retain field readability, theme-neutral cue meaning, reduced-motion behavior, and root/Pages
  responsiveness without altering gameplay authority or rules.

### Phase 3F-D — Placement and capture choreography

- A no-match Hand or resolved Draw first reflows existing field cards to prepare the final automatic
  slot, then travels directly from its source to that slot without crossing another card.
- A pair or exact-two resolution moves its source onto the first authoritative
  `captureStarted.targetFieldCardIds` target with a small visible offset, holds there briefly, then
  sends the source and every captured field card to the capture areas. A three-target sweep uses the
  first target only as its overlap anchor and leaves every target spatially still during the hold.
- Draw capture mirrors Hand capture after the player taps Reveal. The browser must not create a
  pulse or movement when `drawResolutionRequired` arrives before that tap.
- A selected no-match source makes the field more legible as a destination with a compact
  header-adjacent `PLACE HERE` badge. No idle placeholders or copy over card art returns.
- This is a presentation-only choreography pass: capture authority, projections, event semantics,
  rules, controls, CardView identity, and reduced-motion final parity remain unchanged.

### Phase 3F-G — Card inspector yaku reference and native gesture polish

- Replace the inspector's factual grid with a collapsed, keyboard-accessible yaku-reference
  expander using the existing Yaku Guide's presentation vocabulary.
- Cover every canonical CardId's static yaku contribution relationships without running the yaku
  evaluator or describing current-table availability; retain Phase 5A ownership of exact
  completed-yaku cards and their trigger-time formation order.
- Suppress browser native selection/touch-callout behavior only on game card interaction surfaces;
  short taps, long-press cancellation, context-menu/keyboard inspection, modal focus, privacy, and
  normal dialog scrolling remain intact.
- Keep this as presentation/reference-only work: no tutorial, engine, protocol, rule, scoring,
  replay, projection, result, or CardView-identity change.

### Phase 3F-H — Active-hand start cue

- When the local player is idle and must choose a Hand card, give the actual Player Hand zone a
  restrained, pulsing white start outline. It is an affordance for the next required interaction,
  not a selected-card or legal-target indicator.
- Remove the outline as soon as a Hand source is selected. It remains absent while resolving a
  source, during animation, Draw/Reveal, decisions, results, handoff, opponent turns, and all input
  locks; Escape/cancel restores it only when the same active idle Hand state returns.
- Keep gold for selected sources and legal destinations. Do not pulse individual cards, restore
  instruction copy, introduce placeholder slots, create a new action, or change the authoritative
  Hand/Draw state machine.
- Honor reduced motion with a steady visible white outline rather than a pulse. The cue remains
  presentation-only: no tutorial, engine, protocol, rules, scoring, replay, projection, result,
  semantic-control, or CardView-identity change.

### Phase 3F-I — Reveal start cue

- After a physical Draw has settled face-up in Reveal, give only that public Reveal card a restrained
  pulsing white outer-edge start outline while the local player must tap it. It means "interact next,"
  not selected or matched.
- Keep the outline absent during Draw travel, flip, reveal pause, locks, utilities, decisions,
  results, handoff, and opponent turns. On Reveal selection it disappears; gold then marks the
  selected source and legal field target/no-match destination. Escape/cancel restores white only at
  the same settled idle Reveal state.
- Do not move/pulse field cards before selection, add copy/placeholder controls, create a new action,
  or change the authoritative Draw state machine. All no-match, unique-pair, exact-two, and sweep
  Draw families retain their existing behavior.
- Honor reduced motion with a steady visible white outline. The cue is presentation-only: no tutorial,
  engine, protocol, rules, scoring, replay, projection, result, semantic-control, or CardView-
  identity change.

### Phase 3F-J — Legal destination pulse

- After the player selects a Hand or settled Reveal source, pulse the yellow-gold edge of every
  authoritative legal Field target. The selected source remains solid gold; it does not pulse.
- When no Field card matches, pulse the actual Field perimeter yellow-gold and show only the compact
  `NO MATCH · PLACE HERE` badge. Do not restore empty slots, numbered placeholders, routine copy,
  or a strategic placement coordinate.
- Do not show a gold Field destination before source selection, choose a target from exact-two/sweep
  choices, move/scale/fill cards, or create a semantic control. Under reduced motion retain the
  same target/destination emphasis as a steady gold edge.
- This is presentation-only and preserves the canonical legal-action, Draw, animation, scoring,
  engine, protocol, replay, projection, and persistent CardView boundaries.

## Phase 4 — Onboarding

Phase 4 retains its numeric identity but is intentionally executed after full-match progression,
final interaction work, and the product-polish pass. The tutorial must teach the settled game rather
than encode temporary table behavior.

### Phase 4A — Tutorial director

- deterministic scenario loader;
- allowed-action constraints;
- callout anchors;
- completion state.

### Phase 4B — Learn in 60 Seconds

- complete scripted lesson;
- explanatory copy;
- animation and input integration.

### Phase 4C — Contextual help and rulebook

- card inspection;
- yaku guide;
- special-rule explanations;
- searchable/illustrated rules.

Phase 4 acceptance:

- a new tester can complete the tutorial without external instructions;
- tutorial funnel telemetry available in development;
- tutorial never leaks into normal engine logic.

## Phase 5 — Full local product

### Phase 5A — Full match formats

- 3/6/12-round formats advance through the actual scheduled months/starter plans and retain the full
  public recap;
- engine-owned trigger-time ordinary-Yaku formation chronology renders the exact qualifying cards in
  formation order, including intentional repeated cards where one card supports more than one Yaku;
- completed ordinary results expose only final scored rows and their authoritative arithmetic; the
  browser does not reconstruct qualifying cards, points, chronology, progression, winner, or rematch;
- concise result first: outcome/winner, Yaku count, multiplier, award, and next action; chronology,
  card galleries, repetitions, and arithmetic begin behind a closed details disclosure;
- final-round rules and authoritative terminal winner/tie outcome;
- rematch starts an actual fresh local match, not a presentation-only reset;
- public observation, protocol, and replay schema revision complete before Phase 5B persistence, with
  recipient-safe evidence only.

### Phase 5B — Local persistence

- IndexedDB;
- autosave;
- continue/delete;
- schema validation.
- one active local authoritative save only; strict decode/no migration; private state and RNG never
  enter recipient-facing output;
- saved checkpoints are written after presentation settlement, resume deterministically behind a
  derived privacy/Ready gate, and recover atomically through Continue/Delete or corrupt-save
  Delete/Start New/sanitized diagnostic export;
- storage failure is visible session-only degradation, never a false durable-save claim.

### Phase 5C — Local pass-and-play

- private handoff;
- turn replay;
- ready screen.

Phase 5 acceptance:

- full 12-round match completes;
- reload at every stable checkpoint works;
- corrupted save fails safely.

## Phase 6 — CPU opponents

### Phase 6A — Fair heuristic AI

- `PlayerObservationV1 -> LegalActionV1 | null` only; never `AuthoritativeGameStateV1`;
- deterministic Timid, Monk, and Gambler preferences over already-issued legal actions;
- CPU is player B against local human player A for the existing 3/6/12-round formats;
- CPU commands use the existing public-event animation path while the human projection remains the
  sole presentation source;
- session-only CPU play with no local-save mutation, difficulty, reasons, confidence, match-context
  adaptation, seeded noise, determinization, rollout, online, or Firebase work.

### Phase 6B — Difficulty and explanations

- difficulty tiers;
- reason tokens;
- match-context strategy.

### Phase 6C — Rollout AI and tuning

- determinization;
- seeded rollouts;
- simulation reports.

Phase 6 acceptance:

- zero hidden-hand access;
- zero illegal actions in large simulations;
- personality behavior measurably differs;
- CPU turn uses standard event animation.

## Phase 7 — Firebase backend

### Phase 7A — Project and emulators

- new Firebase development project;
- Auth;
- Firestore;
- Functions;
- emulator config;
- deny-by-default rules.

### Phase 7B — Authoritative match service

- create/join;
- private server state;
- player views;
- command transactions;
- idempotency.

### Phase 7C — Turn publication

- public turn records;
- hashes;
- user match index;
- expiration.

Phase 7 acceptance:

- emulator security suite passes;
- client cannot read opponent hand/server state;
- illegal commands rejected server-side.

## Phase 8 — Online client and asynchronous replay

### Phase 8A — Invite and current-games flow

- create match;
- join link/code;
- current games;
- status and presence.

### Phase 8B — Active-turn commands

- server-confirmed step flow;
- reconnect;
- stale-version handling.

### Phase 8C — Opponent-turn replay

- load `beforePublicState`;
- animate events;
- accelerate/skip;
- text recap;
- hash verification;
- input unlock.

### Phase 8D — Round and match transitions

- both-player readiness where needed;
- lucky hands;
- rematch;
- expiration/leave.

Phase 8 acceptance:

- Player A can complete a turn, close the app, and Player B can later open, watch the complete turn, and act;
- no opponent private card is present in Player B’s data;
- reconnect and duplicate-command tests pass.

## Phase 9 — Production polish

### Phase 9A — Visual/audio content

- final deck skin(s);
- themes;
- sound;
- 1×–4× polish.

### Phase 9B — Accessibility and performance

- keyboard;
- screen reader;
- reduced motion;
- mobile performance;
- asset loading.

### Phase 9C — Analytics and reliability

- error reporting;
- privacy controls;
- production logging;
- operational dashboards.

### Phase 9D — Release

- production Firebase;
- production deploy;
- release checklist;
- public rules;
- version tag.

---

# 34. Per-subphase implementation protocol

For every implementation subphase, the coding AI must perform a **delegation assessment** when the work is substantial:

- identify independent investigation/review/validation work that can run in parallel;
- choose semantic agent roles before concrete model names;
- avoid overlapping write ownership;
- record any model-routing limitation without abandoning useful delegation.

Then provide:

1. **Scope completed**
2. **Files added/changed**
3. **Architecture decisions**
4. **Tests run and exact results**
5. **Known limitations**
6. **User-facing verification steps**
7. **Delegation used** — agents/roles used, their bounded contracts, and how findings were integrated; or why delegation was not useful
8. **Independent review** — whether a separate post-integration review was performed and what it found
9. **Recommended next subphase**

User-facing verification steps must be concrete, for example:

```text
1. Run `npm install`.
2. Run `npm run dev`.
3. Open the displayed local URL.
4. Select Animation Sandbox.
5. Trigger “Pair Capture.”
6. Verify both cards travel together and separate into category lanes.
7. Switch to Reduced Motion and verify the final layout is unchanged.
```

Do not claim runtime verification when only static inspection was performed.

---

# 35. Acceptance criteria for the complete rewrite

The rewrite is ready for production when:

- canonical rules and all owner decisions are locked;
- engine tests cover all rule vectors;
- no engine code imports browser, Pixi, or Firebase modules;
- all 48 cards maintain ownership invariants;
- CPU opponents use only legal observations;
- local and CPU matches complete reliably;
- the 60-second tutorial is functional and understandable;
- cards visibly move through hand, field, match, and capture zones;
- a complete deck package can be imported/rebuilt without changing gameplay code;
- automatic and manual per-card fitting can coexist in the same package;
- source art remains non-destructive and regenerable;
- at least two deck packages resolve correctly and can be switched locally without changing game state;
- Normal, Fast, Instant, and Reduced Motion reach identical states;
- online commands are server-validated;
- clients cannot read opponent hands or deck order;
- remote completed turns replay correctly after offline return;
- turn record hashes reconcile;
- saves and reconnects recover cleanly;
- mobile and desktop layouts are approved;
- accessibility checks pass;
- CI is green;
- repository AI workflow/manifest is present and consistent with the current project;
- substantial implementation tasks follow clear ownership, integration, and verification rules;
- deployment and rollback are documented.

---

# 36. Known risks and mitigations

| Risk | Mitigation |
|---|---|
| Custom rules remain ambiguous | Rule-lock decisions and fixture-based tests before engine work |
| Graphics work begins before engine stability | Phase gates; rendering starts after core engine tests |
| Animation timing contaminates rules state | Pure engine plus AnimationDirector |
| CPU accidentally cheats | Observation-only API and leakage tests |
| Online client fabricates state | Server-authoritative commands and denied client writes |
| Shared seed exposes deck | Server-only multiplayer RNG/deck state |
| Remote replay lacks a base state | Store `beforePublicState` in TurnRecord |
| Skipped animation desynchronizes board | Snap to target projection and hash check |
| Mobile field becomes unreadable | Responsive layout service, compact capture lanes, card inspection |
| Too much onboarding text | Scripted micro-round and progressive disclosure |
| New architecture becomes overbuilt | Deliver vertical slice early and defer non-goals |
| Firebase costs/complexity grow | Emulator-first tests, compact records, measured reads/writes |
| Asset inconsistency | Manifest validation and complete-deck release gate |
| New custom card art requires repeated manual resizing | Non-destructive automatic importer, normalized manual overrides, Deck Workshop, and contact-sheet validation |
| Deck packages accidentally affect card identity/rules | Canonical CardId boundary; package resolver exists only in presentation/asset layers |

---

# 37. Rules decision status and owner approvals

## 37.1 Blocking engine rules — resolved August 8, 2026

The package audit’s blocking engine decisions are approved and canonical:

- initial-field cancellation takes precedence over lucky hands from the same deal;
- lucky-hand edge cases, full-hand evidence reveal, and automatic-result explanations are defined;
- Bright tiers replace lower Bright points but each tier is a distinct yaku trigger;
- independent yaku stack, including the canonical Five Brights + Sake Cup = 20 example;
- one phase completing several yaku creates one combined Yaku Decision;
- Hand Phase and Draw Phase can each create a Yaku Decision in the same turn;
- Current-Month Set is accumulated in the capture area across any number of turns;
- a normal round ends when both eight-card hands are empty, leaving eight draw-pile cards unused;
- final-draw Koi-Koi remains legal and immediately resolves End of Play at the resulting multiplier;
- final-round protected-leader identity and trigger scope are frozen at round start;
- later no-score rounds preserve their starter, while a January 0–0 result alternates the opening player for February;
- special 2× Banking separates visible table state from scoring multiplier;
- an automatic or no-score final scheduled month ends the match without a replacement month.

The full approved wording and test implications are recorded in:

- `KoiKoi4x_Rules_Decision_Checklist.md`

The coding AI must treat those decisions as authoritative and must not reopen them without a deliberate design amendment.

## 37.2 Canonical terminology — resolved

Player-facing and new-code terminology is:

- Bright;
- Animal;
- Scroll;
- Plain;
- Bank;
- Koi-Koi;
- Match, Round, Hand Phase, Draw Phase, Yaku Check, Yaku Decision, End of Play, Round Result, and Round Transition as defined in Section 6.

## 37.3 Remaining nonblocking product and online decisions

These do not block the headless rules engine:

- final new repository name;
- production hosting target, while preserving GitHub Pages compatibility;
- initial deck skin selection;
- whether 3- and 6-round Quick Match ship in the first public release;
- rematch starter policy;
- whether PWA notifications ship in the first online release;
- final approval of online resignation, inactivity-expiration, and local acknowledgement policies listed in the decision checklist.

# 38. Legacy review notes

The legacy repository demonstrates valuable product ideas but also validates the rewrite decision.

Observed characteristics include:

- a large central `game.js` coordinating rules, rendering, timers, saves, and networking;
- global state exposed across classic scripts;
- card faces painted into individual canvases after DOM regeneration;
- `renderAll()` rebuilding broad sections and repainting card canvases;
- timer-driven CPU pacing;
- non-seeded `Math.random()` use;
- a CPU Bank/Koi-Koi evaluation that can inspect both players’ hands;
- a useful early turn-recap/replay concept based on textual steps;
- multiple deck skins and themes;
- local, CPU, pass-and-play, and online concepts;
- substantial save and reconnect logic that does not need migration.

The rewrite should preserve the product lessons while replacing the implementation model.

---

# 39. Final architectural summary

The required system is:

```text
Input, CPU choice, or remote command
              ↓
Validated GameCommand
              ↓
Pure deterministic TypeScript engine
              ↓
Authoritative next state + semantic GameEvents
              ↓
Visibility projection
      ┌───────┴────────┐
      ↓                ↓
Local/CPU presenter    Firebase authoritative service
      ↓                ↓
Pixi AnimationDirector Public TurnRecord + private views
      ↓                ↓
Physical card motion   Recipient opponent-turn replay
```

The rewrite succeeds when KoiKoi4x feels simple to enter, tactile to play, strategically distinct, fair against the CPU, and coherent even when two online players take turns hours or days apart.
