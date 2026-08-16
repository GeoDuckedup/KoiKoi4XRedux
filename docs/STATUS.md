# KoiKoi4x Project Status

**Updated:** August 16, 2026

**Overall state:** Greenfield rewrite through Phase 3F-E utility dock/capture cleanup is deployed,
live-verified, and accepted; Phase 3F-F interaction clarity/card inspection is deployed,
live-verified, and accepted; Phase 3F-G card inspector yaku reference/native gesture polish is
deployed, live-verified, and accepted; Phase 3F-H active-hand start cue is deployed, live-verified,
and accepted; Phase 3F-I Reveal start cue is deployed, live-verified, and accepted; Phase 3F-J legal
destination pulse is deployed, live-verified, and accepted; Phase 5A full local match formats is
deployed, live-verified, and accepted; Phase 5B local persistence is deployed, live-verified, and
accepted; Phase 6A fair heuristic AI is deployed, live-verified, and accepted; Phase 6B difficulty
and explanations is next

**Runtime state:** Complete deterministic headless match engine plus playable browser-local 3/6/12-round
formats using real player observations and commands, the owner-approved primary deck, persistent Pixi
cards, deterministic public-event animation, private pass-the-device handoff, accessible recap/result
evidence, and the retained local-only deterministic deck Workshop/raster review pipeline

## Phase 6A — deployed, live-verified, and accepted

Phase 6A is scoped to a deterministic, observation-only fair heuristic in `apps/web/src/ai`: one
`PlayerObservationV1` becomes one exact existing `LegalActionV1` or `null`. It has no authoritative
state input, RNG, hidden-card reconstruction, command construction, persistence, DOM/Pixi work, or
online/Firebase dependency. Timid, Monk, and Gambler are the three preference profiles.

The CPU is player B; the local human is player A, and all existing 3/6/12 formats remain available.
The renderer remains on player A's observation during CPU work, human controls lock, and only the
ordinary public events enter the existing animation path. CPU matches are session-only and do not
mutate the one active Phase 5B local save. Difficulty/reasons/confidence/match-context adaptation
remain 6B; determinization/seeded rollouts/tuning remain 6C.

Focused production Root and Pages CPU smoke both pass. They exercise each personality through a real
human action, visible `opponentTurn` input lock, standard public event/animation, settled human/result
boundary, renderer/text privacy, unchanged local save, and the 1-canvas/48-CardView invariant at
390x844 and 844x390. `npm run check` passed format/lint/all workspace typechecks/decks, 58 files / 532
ordinary tests, 10,002 deterministic seeds (3/6/12 = 3,334 each), and the 783-module build.
`npm run validate:phase6a` passed the release deck (48/48), 100 technical artifacts, retained
focused/runtime/Workshop/density/Root/Pages/persistence coverage, 2 Phase 6A files / 16 tests, 360
complete AI trials in four 90-trial shards with zero illegal/no-action results and directional Bank/Koi
metrics, and dedicated Root/Pages CPU smoke. All 26 Phase 6A PNGs and bundled-client one-canvas/48-
CardView/no-diagnostics evidence were inspected. Independent Terra final review is B0/H0; earlier
H/M findings were repaired. Implementation commit `9be2a78d1b26081dd174f55a825c9499057798b4` passed
CI `31923716009`: verify 03:13:04Z–03:48:58Z, check 03:13:47–03:19:22, validation
03:19:22–03:48:53, and artifact upload. Pages `31923716038` passed build 03:13:04–03:36:26, check
4m03s, validation 18m32s, and deploy 03:36:32–03:36:42 (Deploy 03:36:34–03:36:40). Cache-busted live
HTTP/2 was 200 MISS with `Last-Modified: 03:36:37Z` and `index-CsVf0PRK.js`; the exact CPU/resume
markers were present. Live Gambler CPU play verified human no-match Hand then Draw capture, CPU status,
locked utilities, player-A face-up/player-B back-only privacy, no console diagnostics, and an inspected
screenshot. A nonblocking future hardening item is an explicit landscape Options bounds assertion;
CSS/internal scrolling and successful lower-action access were reviewed. Next is Phase 6B: difficulty
and explanations (reasons, confidence, and match-context strategy); rollouts remain Phase 6C.

## Phase 5A — deployed, live-verified, and accepted

Phase 5A delivers real 3/6/12 local match progression, public trigger-time ordinary-Yaku evidence,
concise-first result details, and rematch. ADR 0030 locks engine ownership of formation chronology and
the pre-5B public/protocol/replay revision; the browser remains render-only for those facts.
`MATCH-5A-001` through `MATCH-5A-011` and `validate:phase5a` define the accepted release gate.
`npm run check` passed 52 files / 489 ordinary tests, all 10,002 deterministic seeds (3/6/12 = 3,334
each), deck validation, and the 778-module build. The final single `npm run validate:phase5a` passed
the 48/48 release deck, 100 technical artifacts, 17 files / 243 focused tests, Workshop, 14-viewport
density review, and full Root/Pages smoke through the retained interaction suites plus End-of-Play,
concise/expanded Bank, responsive scrolling, real three-round progression/final restriction, and
distinct-deal rematch. Compact and expanded portrait/landscape artifacts were inspected; independent
Terra re-review found no blocker, high, or medium issue. Implementation commit `945c2a3` passed CI
`31909040672` (`verify`, 19m40s) and Pages `31909040671` (`build`, 17m34s; deploy, 10s); both
`npm run check` and `validate:phase5a` passed. The only hosted annotation was the nonblocking Node 20
GitHub Actions deprecation. The cache-busted live HTTP/2 response was 200 MISS, `Last-Modified: Sat,
15 Aug 2026 21:35:36 GMT`, with `assets/index-DQO4OPuh.js` containing `See winning yaku & score`,
`Start rematch`, `completedYakuFormations`, and `ordinaryYaku`. After assets loaded, the live browser
was `ready:true` with one canvas, 48/48 unique CardViews, 24/0/8/8/8 draw/reveal/player-Hand/
opponent-Hand/field counts, match length 3, idle `awaitingHandPlay`, no locks, and no
clipped/invalid/overlap diagnostics. `output/phase-5a/live-ready/shot-2.png` was visually inspected;
no error artifact was produced. Phase 5A is deployed, live-verified, and accepted.

## Phase 5B — deployed, live-verified, and accepted

Phase 5B implements the local authoritative-save contract. ADR 0031 and `SAVE-5B-001` through
`SAVE-5B-009` lock one active local IndexedDB checkpoint, strict no-migration decode,
post-presentation-settlement serialized/coalesced autosave, Continue/Delete, corrupt-save
Download/Delete/Start New recovery, derived privacy/Ready resume, and a visible session-only storage
warning. Acceptance covers autosave, strict decode/RNG provenance, decision, round-complete,
match-complete/rematch, IndexedDB open denial, and write conflict without raw save/private-state
leakage.

`npm run check` passed 54 files / 513 ordinary tests, 10,002 generated seeds (3/6/12 = 3,334 each),
the 48/48 deck, and the 781-module production build. The final uninterrupted
`npm run validate:phase5b` exited 0: 48/48 release deck, 100 technical artifacts, 17 Phase 5A
focused files / 247 tests, Workshop, 14 Phase-3D-D Root/Pages viewports, full retained Root/Pages
smoke through 3F/3B/End-of-Play/Bank/real three-round rematch, 3 persistence focused files / 38
tests, and dedicated Root/Pages persistence smoke. The persistence smoke produced 18 artifacts
(nine per base) under `output/phase-5b/e2e/`. Independent Terra review found no blocker, high, or
medium issue. One transient density-review `appReady` timeout passed isolated and then uninterrupted
reruns; the Pages click-readiness harness repair retained every product assertion.

Implementation commit `e10edba` and workflow-budget commit `b8ac977` are deployed. Initial CI
`31917983898` was canceled solely by the inherited 30-minute hard cap after `check` passed; the
two exact job budgets increased to 60 minutes without test changes. Replacement CI `31919222493`
passed verify 01:17:17–01:51:51 UTC (34m34s), check 01:17:52–01:23:20, validation
01:23:20–01:51:48, and artifact upload. Pages `31919222489` passed build 01:17:37–01:52:44 UTC
(35m07s), validation 01:23:58–01:52:36, and deploy 01:52:48–01:52:56 (8s). A cache-busted live
HTTP/2 request returned 200 MISS with `Last-Modified: Sun, 16 Aug 2026 01:52:53 GMT`,
`index-CSmLy86o.js`, `index-DRn1Xu7z.css`, and the expected `Continue saved match?`,
`Review completed match?`, `Saving is unavailable`, and `This saved game cannot be opened` markers.
Three fresh live-browser iterations were `ready:true` with one canvas, 48 unique CardViews, 24/8/8/8
zones, idle unlocked 16 semantic controls, approved `new-primary-deck`, and available idle persistence
with `lastSavedAt` plus round/month 1. The clean live `shot-2` was visually inspected. Phase 5B is
deployed, live-verified, and accepted.

## Current result

Phase 3E-A responds directly to owner playtesting. Permanent numbered field slots are removed while
adaptive geometry remains; Options moves to the bottom safe area; nonempty public capture rails
open exact card galleries; the Koi-Koi choice becomes a field-visible tray; and Round Result leads
with outcome, points, totals, and its action while secondary facts begin collapsed. This slice does
not change scoring or round progression. Phase 3E-B now separates every Draw reveal from its
resolution: the engine exposes the revealed card and canonical public 0/1/2/3 outcome, then only
the active player can resolve it. The browser makes the Reveal card selectable and reuses the
Guided/Fast field cues without deriving matching rules. Phase 3E-C now makes that same
authoritative reveal visibly leave from the top of the draw pile as a face-down card, flip only in
Reveal, pause, and then unlock the existing Reveal action. It is presentation-only: it does not add
an engine command or disclose draw order.

Phase 3F-A removes the remaining routine turn scaffolding: the in-canvas action strip, visible
phase/instruction/Confirm/Cancel row, initial-ready recap, and manual Play/Motion/animation utility
controls. Its entire canvas reserve now belongs to Player Hand, making all eight active cards
materially larger while leaving the adaptive field, captures, Draw, Reveal, and opponent geometry
unchanged. Options stays below the table and retains Theme, deck, fullscreen, restart, and critical
locks. Production uses normal animation and automatically honors operating-system reduced motion.

Phase 3F-B's player-facing outcome is already present: ordinary Hand and Draw completion uses legal
card and field taps, while Bank/Koi-Koi remains explicit. The remaining internal `Guided` naming is
implementation terminology only and is deliberately deferred. Phase 3F-C now polishes the visual
language around that settled interaction: selected sources, legal targets, no-match field
destinations, and actionable Reveal cards must read clearly without adding routine labels, visible
confirmation controls, browser-owned legality, or field clutter.

Phase 3F-C release commit `4181375` passed CI run `31820056292` (`verify`, 16m03s) and Pages run
`31820056288` (`build`, 15m58s; `deploy`, 46s). A cache-busted live request returned HTTP 200 with a
cache MISS and `Last-Modified: Fri, 14 Aug 2026 16:52:20 GMT`. The bundled live game client reached
`ready: true` with the approved `new-primary-deck`, one canvas, 48 CardViews / 48 unique identities,
8 hand cards, 8 field cards, 24 draw cards, zero empty placeholders, and no diagnostics. The clean
idle screenshot is `output/phase-3f-c/live-ready/shot-1.png`. No secret, hosting configuration, or
runtime setting was added.

Phase 3F-D is a bounded presentation correction from playtesting. No-match sources now first reflow
existing field cards to prepare the final slot, then use a direct source-to-final-field path. Pair,
exact-two, and sweep captures use an
immutable first public capture target as their visual anchor: the source overlaps it with a small
offset, holds, then the capture set collects. Draw capture follows the same sequence only after the
player taps Reveal; `drawResolutionRequired` itself does not move or pulse field cards. A selected
no-match source adds a stronger field cue and compact `PLACE HERE` header badge without restoring
idle slots or card-covering instructions. Local validation is complete: `npm run check` passed
format/lint/typecheck/decks, 46 files / 442 tests, all 10,002 generated seeds, and the production
build. A final single `npm run validate:phase3fd` passed release deck approval (48/48), 100 technical
artifacts, focused 5 files / 77 tests, Workshop, the 14-viewport density review, and full root/Pages
smoke. The bundled game client passed with one canvas, 48 CardViews, clean diagnostics, and inspected
evidence in `output/phase-3f-d/game-client`; Root/Pages CHOREO screenshots were visually identical.
Independent Terra review found no blocker, high, or medium issue. Release commit `108fb05` passed CI
run `31844698117` (`verify`, 9m04s) and Pages run `31844698124` (`build`, 11m33s; `deploy`, 9s).
The cache-busted live URL `https://geoduckedup.github.io/KoiKoi4XRedux/?phase3fd=108fb05` returned
HTTP/2 200 with `x-cache: MISS`, `Last-Modified: Fri, 14 Aug 2026 22:09:56 GMT`, and bundle
`assets/index-DjACAdI7.js`. Two bundled live-client iterations reached `ready: true` with approved
`new-primary-deck`, one canvas, 48/48 CardViews, 8 field / 8 hand / 24 draw, and zero
clipped/invalid/overlap diagnostics. `output/phase-3f-d/live-ready/shot-1.png` and `state-1.json`
were inspected. Phase 3F-D is deployed and accepted.

Phase 3F-E is a presentation-only refinement. It moves the full public recap into a History
dialog, adds a static thirteen-yaku reference dialog with canonical example cards, and fixes the
bottom utility row to History, Yaku Guide, then Options. Capture inspection remains public-only but
uses regular 5:8, light-framed cards. The table removes redundant hand score/count suffixes,
capture-category zeros, and the Reveal section label. It changes neither legal actions, scoring,
engine/protocol state, public projection, animation authority, nor the 48 persistent CardViews.
The Yaku Guide is a reference rather than tutorial or live analysis; Phase 5A retains exact ordered
yaku-card evidence in expanded results. Local closure is green: `npm run check` passed 47 files /
444 ordinary tests, all 10,002 generated matches, and the 772-module production build; `npm run
validate:phase3fe` passed the approved 48/48 release deck, 100 technical artifacts, 6 focused files /
79 tests, Workshop, the 14-viewport density review, and root/Pages browser suites. The bundled skill
client reached ready state with one canvas and 48 persistent CardViews. Guide, landscape-dock, and
capture-gallery screenshots under `output/phase-3f-e/e2e/` were inspected. Independent Terra review
initially found two medium issues around cross-theme frame evidence and complete utility-dialog mutual
exclusion. Both were repaired; post-repair review reports no blocker, high, or medium finding.
Release commit `f8358d8` passed CI run `31855285354` (`verify`, 01:00:16–01:11:13 UTC) and Pages
run `31855285349` (`build`, 01:00:17–01:13:15; `deploy`, 01:13:19–01:13:27). The cache-busted live
URL returned HTTP/2 200 with a cache MISS, `Last-Modified: Sat, 15 Aug 2026 01:13:23 GMT`, and assets
`index-DMr_DIMH.js` / `index-DwN18UTX.css`. The bundled live client recorded the expected initial
`ready:false` texture-loading state before `state-1` and `state-2` reached `ready:true`, approved
`new-primary-deck`, one canvas, 48/48 unique CardViews, 8 field, 8 hand, 24 draw, and clean
diagnostics. The live states and screenshots under `output/phase-3f-e/live-ready/` were inspected.
Phase 3F-E is deployed and accepted.

Phase 3F-F is a locally complete presentation/input clarification pass. It unifies selected Hand and
settled Reveal sources, legal field targets, and legal no-match field destinations around a stronger
yellow-gold cue; add optional read-only phase help; and add a privacy-safe long-press/card-inspection
surface for public Field cards and the local Hand. It must preserve short-tap move behavior, public
authority, animation choreography, one canvas, and 48 persistent CardViews. Exact yaku-card formation
evidence remains a Phase 5A engine/protocol/history/result responsibility rather than a Phase 3F-F
browser reconstruction. Local validation passed `validate:phase3ff`: 48/48 release deck, 100 technical
artifacts, 7 files / 83 tests, Workshop, 14 density viewports, and root/Pages smoke; all-web validation
also passed 143 tests/build. Initial independent review found four medium issues, repaired before clean
re-review. `npm run check` passed 48 files / 448 ordinary tests, all 10,002 deterministic seeds, and
the 774-module production build. The bundled skill client was ready at 1280×720 with one canvas, 48
unique CardViews, 8 hand / 8 field / 24 draw, 8 actionable plus 8 inspect-only semantic controls,
closed utility surfaces, and no diagnostics; its final screenshot/state were inspected under
`output/phase-3f-f/game-client-final/`. Deployed head `b787faa158dd1b62fb98f085d0c6020f00889d9d`
passed CI `31865103301` and Pages `31865103302`. The cache-busted live build returned HTTP/2 200 MISS,
and the inspected final live client was ready with one canvas, 48 unique CardViews, 24/8/8/8 zones,
16 semantic controls (8 actionable + 8 inspect-only), closed utilities, and no diagnostics. Phase 3F-F
is deployed, live-verified, and accepted.

Phase 3F-G is a locally complete and accepted presentation/reference follow-up. It replaces the
inspector's facts grid with an optional collapsed yaku-reference expander and suppresses browser native
selection/touch-callout only over game card interaction surfaces. It remains static catalog reference
content, not a current-table evaluator, tutorial, strategy adviser, or completed-yaku result. No
engine, protocol, rules, scoring, replay, public projection, result evidence, or persistent CardView
semantics are authorized. Exact achieved-yaku cards and formation chronology remain Phase 5A work.
`npm run check` passed 49 ordinary test files / 452 tests, all 10,002 generated seeds, release-deck
validation, and the 774-module build. `npm run validate:phase3fg` passed 48/48 release deck, 100
technical artifacts, 8 focused files / 87 tests, Workshop, 14 root/Pages density viewports, and full
root/Pages smoke. Independent Terra re-review found no blocker, high, or medium issue. Three bundled
develop-web-game client iterations at 1280×720 showed one canvas, 48 unique CardViews, and no invalid
layout; Root/Pages collapsed, expanded, and 844×390 scroll-bottom screenshots under
`output/phase-3f-g/e2e/` were inspected. Commit `9fafb2f` passed hosted CI `31868152672` (`verify`,
10m38s) and Pages `31868152577` (build through 06:05:54Z; deploy 06:05:58–06:06:06Z). A cache-busted
live request returned HTTP/2 200 MISS with `Last-Modified: 2026-08-15 06:06:03 GMT`. The live bundled
game-client completed two ready iterations with one canvas, 48 unique CardViews, and no layout
diagnostics. Live Playwright semantic verification focused January Pine Plain B, pressed `I`, opened
the locked inspector with collapsed count 2, then expanded Current-Month Set and Plain Cards with
their exact example images and conditional copy. Phase 3F-G is deployed, live-verified, and accepted.
WebKit/iOS native touch-callout behavior remains a supplemental manual-device check.

Phase 3F-H is a locally complete and accepted narrow presentation pass. It adds an `aria-hidden`,
pointer-inert decorative DOM perimeter synchronized to the canonical Player Hand zone only while the local player is idle in
`awaitingHandPlay` and needs to select a Hand card. The outline disappears as soon as the source is
selected, remains absent during every other interaction/lock state, and becomes steady under reduced
motion. Pixi continues to own yellow-gold selected-source or legal-destination feedback. The cue must
not add instructions, placeholders, individual-card pulses, semantic controls, input intents, or any
engine/protocol/rules/scoring/replay/projection/result authority. `npm run check` passed 50 ordinary
test files / 456 tests, all 10,002 generated seeds, deck validation, and the 775-module build.
`npm run validate:phase3fh` passed the 48/48 release deck, 100 technical artifacts, 9 focused files /
91 tests, Workshop, 14 root/Pages density viewports, and full root/Pages smoke through Bank/restart.
Root/Pages 390×844, selected, 844×390, three-theme, and reduced-motion screenshots under
`output/phase-3f-h/e2e/` were inspected. The bundled web-game client completed three ready 1280×720
iterations with one canvas, 48 unique CardViews, and no layout diagnostics. Browser evidence initially
caught an Options selection-reset regression; replacing the whole-surface refresh with a
decorative-only cue renderer preserved selection and the rerun was green. Independent Terra re-review
found no blocker, high, or medium issue. Commit `55a4032` passed hosted CI run `31873371558`
(`verify`, 08:00:07–08:13:59Z; both `check` and `validate:phase3fh` passed) and Pages run
`31873371515` (`build`, 08:00:08–08:12:34Z; `deploy`, 08:12:39–08:12:49Z). A cache-busted live
request returned HTTP/2 200 MISS with `Last-Modified: 2026-08-15 08:12:44 GMT`. The live bundled
client completed two ready iterations with the visible whole-Hand white perimeter, one canvas, 48
stable CardViews, and no layout diagnostics. Phase 3F-H is deployed, live-verified, and accepted. A
physical iPhone/WebKit check of perceived pulse motion and white-outline contrast remains
supplemental; Phase 5A is the current substantive product phase.

Phase 3F-I is a deployed, live-verified, and accepted presentation-only follow-up. After a physical Draw card completes
travel, flip, and reveal pause, the unselected public Reveal card will receive a restrained white
outer-edge start cue. White means the next required interaction; gold remains reserved for the
selected source and legal field target/no-match destination after the player taps Reveal. The cue
will be absent during transit, locks, utility dialogs, decisions, results, handoff, and opponent
turns, and it restores only if cancellation returns to the settled idle Reveal state. It adds no
field pulse, movement, card scaling, instructions, semantic control, action, or authority. Focused
unit coverage covers no-match, unique-pair, exact-two, and sweep predicate families, while one
deterministic real physical Draw trace supplies browser evidence. `npm run check` passed 51 ordinary
test files / 466 tests, all 10,002 generated seeds, deck validation, and the 776-module build.
`npm run validate:phase3fi` passed the 48/48 release deck, 100 technical artifacts, 10 focused files
/ 101 tests, Workshop, the Phase 3D-D 14 root/Pages density viewports, and full root/Pages smoke
through Bank/restart. Inspected `output/phase-3f-i/e2e/` screenshots show the intended white-before/
gold-after source and legal-target/destination language.
The bundled develop-web-game client completed two 1280×720 iterations against the final root
production build: ready authoritative local-round `state-0`/`state-1`, one canvas, 48 unique
persistent CardViews, 8/8/24 Hand/opponent/draw allocation, idle input, no diagnostics or
clipped/invalid/overlap zones, and an inspected screenshot. Independent Terra review initially found
three medium findings—face-up eligibility, `min-height` exact-bounds expansion, and indirect
family/render/selected-Options evidence—which were repaired; clean re-review found no blocker, high,
or medium issue. Commit `a469b4c` passed hosted CI run `31888143328`: `verify`
13:47:14–14:01:33Z, `check` 13:47:58–13:54:09Z, `validate:phase3fi` 13:54:09–14:01:26Z, and artifact
upload succeeded. Pages run `31888143474` passed: build 13:47:15–13:59:41Z, `check`
13:47:54–13:53:43Z, `validate:phase3fi` 13:53:43–13:59:35Z, deploy 13:59:46–13:59:54Z. A
cache-busted live response returned HTTP/2 200 MISS with `Last-Modified: Sat, 15 Aug 2026 13:59:51
GMT` and bundles `assets/index-Vt-DMjm5.js` / `assets/index-DsY0wC-9.css`. The first short live
client trace captured expected texture loading in two snapshots; a longer cache-busted run reached
ready in 4/4 snapshots: one canvas, 48 unique CardViews, idle `awaitingHandPlay`, 8/8/24/8 allocation,
no clipped/invalid/overlap diagnostics, and an inspected screenshot. Phase 3F-I is deployed,
live-verified, and accepted. iOS/WebKit perceived-pulse inspection remains supplemental.
Phase 5A retains ordered exact achieved-yaku cards and formation chronology.

Phase 3F-J is locally complete and accepted as a presentation-only continuation of the established
interaction language. Once the player selects a Hand or settled Reveal source, every already-authoritative
matching Field target will pulse yellow-gold as the next required tap. A no-match source instead
gives the actual Field a pulsing yellow-gold perimeter and the compact copy `NO MATCH · PLACE HERE`.
The selected source stays solid gold; idle Hand/Reveal start cues stay white; no target appears,
moves, scales, or becomes semantic before source selection. Exact-two and sweep retain all legal
choices. Engine, scoring, action authority, projection, replay, semantic-control counts, and
persistent CardView identity remain out of scope. `npm run check` passed 52 ordinary test files /
477 tests, all 10,002 generated seeds, deck validation, and the 777-module build. `npm run
validate:phase3fj` passed the 48/48 release deck, 100 technical artifacts, 11 focused files / 112
tests, Workshop, the Phase 3D-D 14 root/Pages density viewports, and full Root/Pages smoke through
Bank/restart. Target, no-match, Draw, Warm Ivory, reduced-landscape, and Pages screenshots were
inspected. The first smoke harness selection incorrectly treated Field `april-cuckoo` as a Hand
source; it now selects opening Hand `april-red-scroll` and proves its authoritative `april-cuckoo`
target. The browser assertion also now correctly checks the exact visual ring within its intended
partitioned semantic target territory; focused tests retain the exact CardPlacement-bound guarantee.
The full rerun passed. Terra independent review found no blocker, high, or medium finding. The final
bundled client completed three ready iterations with one canvas, 48 unique CardViews, and no
diagnostics. Commit `26828d4` passed hosted CI run `31899208391` (`verify`, 14m21s) and Pages run
`31899208394` (build 12m29s; deploy 10s). The cache-busted live response was HTTP/2 200 MISS,
`Last-Modified: Sat, 15 Aug 2026 17:58:05 GMT`, with `assets/index-61Vc__HL.js` /
`assets/index-CTcqBr2T.css`; live JS contains the exact shipped visible and accessible strings.
Three live-client iterations recorded loading `state-0`, then ready `state-1`/`state-2`, one canvas,
48 unique CardViews, no clipped/invalid/overlap diagnostics, and an inspected live shot. The hosted
workflow's Node 20 deprecation annotation is nonblocking. At that release point, Phase 3F-J and
Phase 5A were deployed, live-verified, and accepted; Phase 5B local persistence was the next
product phase.

Release commit `51a1821` passed CI run `31742306302` and Pages run `31742306314`; the Pages deploy
job completed successfully. A cache-busted live browser check reached ready state with the approved
Primary Deck, one canvas, 48 persistent CardViews, eight enlarged hand cards, no initial recap or
routine confirmation strip, and no clipped/invalid/overlapping board zones.

Release commits `0b6937a` and `818936a` passed CI run `31554760462` and Pages run `31554760390`.
The latter contains the CI timing stabilization for the retained raster-builder test. The live page
returned HTTP 200, and a cache-busted browser check reached ready state with the approved Primary
Deck, one canvas, 48 persistent CardViews, eight legal hand controls, zero empty-field placeholders,
and no layout diagnostics.

Phase 3D-C promotes all three owner-approved directions into one production build. Ink & Parchment
is the safe default; Moonlit Indigo and the original-game-inspired Warm Ivory select through the
accessible Options dialog and persist as a versioned allowlisted cosmetic preference in IndexedDB.
Theme changes repaint DOM, Pixi table chrome, and game-controlled card frames in place without
changing the engine, deck, card identities, state version, selection, legal targets, Yaku, or
result data.

Phase 3D-C originally introduced a concise turn/confirmation strip and moved play/motion utilities
into Options. Phase 3F-A supersedes that shell: routine visible turn/confirmation chrome and those
manual utilities are now removed, while compact public Yaku, meaningful event history, themes,
deck, fullscreen, and local restart remain available.

Release commit `9313b93` passed CI run `31536377258` and Pages run `31536377294`. The live page
returned HTTP 200 and a cache-busted real-browser check reached ready state with the approved Primary
Deck, Ink & Parchment default, one canvas, all 48 persistent CardViews, eight legal hand controls,
and no clipped, invalid, or overlapping board zones.

Phase 3D-D replaces the old above-eight fan with deterministic shrink-to-fit 5:8 grids. Counts
through eight retain the familiar four-by-two field; 9–17 cards maximize readable card size inside
the existing field, preserve exact public order, center the final row, and never overlap. A separate
reflow clip moves unrelated cards only after direct placement/capture motion completes.

Dense legal target territories are partitioned between visible cards rather than independently
expanded, so tapping one highlighted card cannot activate another. Hand controls remain 44px. At
the 17-card short-landscape boundary, field targets use an explicit non-overlapping 24×36px minimum
with full arrow/Home/End/Enter/Escape keyboard parity.

The isolated non-shipping Pixi harness passed 17-card pointer/keyboard checks at all fourteen root
and Pages viewport combinations, with one canvas, 48 persistent CardViews, no clipped zones, and no
browser/network errors. Six representative screenshots are under `output/phase-3d-d/e2e/`.

Release commit `07ae604` passed CI run `31545456869` and Pages run `31545456817`, including the
complete Phase 3D-D gate and Pages deploy job. The live page returned HTTP 200; a cache-busted
real-browser check reached ready state with the approved Primary Deck, Ink & Parchment, one canvas,
all 48 persistent CardViews, eight legal hand controls, and no clipped, invalid, or overlapping
zones. The non-shipping density-review route returned HTTP 404 as required.

Phase 3D-B now completes the desired direct interaction flow. Selecting a no-match card highlights
the field placement surface; selecting a unique match highlights its one matching card; exact-two
continues to expose two authoritative choices; and a four-card sweep highlights all three matching
field cards. Guided mode accepts the highlighted field/card or Confirm, while Fast keeps immediate
unambiguous play. Phase 3D-D now supplies the adaptive field geometry for those same authoritative
targets.

The browser never derives this from Pixi coordinates or reimplements capture rules. Every Hand
legal action carries a frozen public resolution preview produced beside engine legality. The input
controller validates that preview against the existing action set, emits only an existing legal
intent, and requires a newer observation after submission.

Phase 3C implementation, hosted deployment, and live acceptance are complete. Twelve
`PRES-RESULT-*` contracts verify
authoritative Bank,
End-of-Play, no-score, automatic evidence, privileged multiplier, next-starter, match-result,
privacy, and modal-lock presentation. The browser will display only public result/history/event
facts; the browser does not calculate scoring or transition policy.

The responsive result dialog opens only after card motion and the Phase 3B consequence beat. It
copies public scoring arithmetic, explicit table/scoring multipliers, committed automatic evidence,
score deltas/totals, terminal winner/tie, and next-round consequences. Card and unrelated toolbar
controls remain locked until the focused result action is chosen.

The next-round shell shows the authoritative next month/starter/privilege, then offers an explicitly
named local one-round restart. It does not call `advanceRound` or mislabel the January reset as the
displayed next month; full local match execution remains Phase 5.

Phase 3B completes the deterministic local runtime's player-facing Yaku and Bank/Koi-Koi seam. The
browser displays canonical public Yaku progress for both players, presents one accessible combined
decision per capture phase, and copies Bank/Koi-Koi arithmetic only from authoritative legal
actions. Public feedback is shown after cards settle and before decision focus; a pending decision
locks all unrelated controls.

The Phase 3A foundation replaces the technical browser fixture with a deterministic local runtime.
The existing rule-free input controller consumes the active player's real `PlayerObservationV1`;
its intent is turned into one engine gameplay command, and public engine events drive the trusted
animation boundaries and accessible recap. The whole first round is executable, including exact
capture choices and the existing Bank/Koi engine seam.

A completed turn covers the full table before the active observation changes. Player B's hand is
not projected until the Ready button is activated. The serialized text surface includes only
face-up identities and player/public state, never opponent-hand assignment, unrevealed draw order,
RNG, checkpoint, or command IDs.

The approved `new-primary-deck` v1.0.0 is the default root/Pages runtime package. Technical Sunrise
and Moonlight remain optional installed packages, proving that more decks can be added without
changing engine state or canonical CardIds.

## Phase 3D-D deployed and accepted

- `TABLE-DENSITY-001` through `008` cover stable eight-card geometry, 9/12/17-card grids, public
  field order, resize, non-overlapping targets, separated reflow, immutability, and the legal bound.
- The recipient projection now preserves `publicState.round.field` order instead of normalizing
  field positions by canonical CardId.
- Snapshot diagnostics report adaptive field count, rows/columns, gap, and card dimensions while
  continuing to omit hidden identities and runtime coordinates from the production text surface.
- The 17-card review entry builds only to `apps/web/dist-phase3dd`; the normal root/Pages production
  build has no state injection or review route.
- `npm run validate:phase3dd` passes the 3-file/23-test theme gate, approved deck release, 100
  technical assets, 26 files/189 retained web/deck/turn tests, Workshop, root/Pages gameplay, and
  the 14-viewport dense review. `npm run check` passes 44 files/423 tests, the 10,002-match gate, and
  the production build. Independent review reports no blocker, high, or medium finding.
- CI, Pages, and live-browser verification passed. No manual hosting setting, secret, migration, or
  cache reset is required.

## Phase 3C deployed and accepted

- Twelve typed, deeply frozen `PRES-RESULT-*` fixtures and a pure public-result mapper cover Bank,
  End of Play, 0–0, cancellation/lucky evidence, January transition, privileged multiplier split,
  winner/tie, privacy, and modal locking.
- The production trace reaches both final-Draw Koi-Koi (`11 × 3× = 33`) and Hand Bank
  (`3 × 1× = 3`) through real engine commands, public projections, card animation, feedback, and
  result focus; no state injector or browser scoring evaluator exists.
- Root and repository-prefixed Pages traces pass all seven supported viewports. Result cards remain
  horizontally contained and vertically scrollable, and the explicit local restart cannot be
  mistaken for advancing to the displayed authoritative February plan.
- `npm run validate:phase3c` passes 22 test files / 153 tests, the approved-deck release gate,
  Workshop exclusion/runtime trace, root/Pages browser runs, and zero browser/network errors.
- `npm run check` passes 40 test files / 390 tests, the 10,002-match deterministic replay gate, and
  a 767-module production build. Independent review reports no blocker, high, or medium findings.
- CI run `31351999052` and Pages run `31351999091` passed for release `c2224aa`; the live Pages
  build returned HTTP 200 and initialized the approved deck and playable local round in a real
  browser.

## Phase 3B completed and accepted

- Ten typed, deeply frozen `PRES-*` fixtures bind public yaku progress, combined decisions,
  incremental and Bright upgrades, Bank/Koi decisions, privilege/forced/capped cases, and safe text
  state to Phase 1C/1D/1E authoritative source fixtures.
- Browser presentation may consume public `activeYaku`, `currentYakuTotal`, decision context, legal
  decision actions, multiplier, and public events. It may not infer any rule outcome or disclose
  hidden cards, draw order, RNG, checkpoints, or command IDs.
- Seed `00000000000000000000000000000003` is the locked production-local Phase 3B browser trace;
  it reaches Hand Animals, Koi-Koi Draw continuation, and a later combined final-Draw decision.
- Phase 3C remains responsible for the finished round-result/score-transition experience. Phase 3B
  only presents the authoritative award/recap and locks the completed local round.
- The focused gate passes 20 Vitest files / 136 tests, the local-only Workshop exclusion check, all
  seven root and Pages viewports, and real Hand Animals, Koi-Koi Draw continuation, combined
  final-Draw, and Bank award browser traces. Independent authority/privacy and interaction reviews
  report no blocker, high, or medium findings.

## Phase 3A local-round runtime now present

- Production local runtime over `startMatch`, `projectPlayerObservation`, legal input intents, and
  `applyGameplayCommand`, with one accepted command/state-version increment per activation.
- Recipient-relative 48-card board projection, public-event animation boundaries, stable hidden
  backs, and Phase 3D-D adaptive field geometry above the base eight slots.
- Guided/Fast pointer and keyboard play, exact Hand/Draw targets, existing Bank/Koi commands, and
  deck/animation input locks remain connected to the Phase 2 foundations.
- Full-table private handoff plus explicit Ready activation before changing to the next player's
  observation.
- HTML turn recap names public play, draw, capture, yaku/result, and next-player facts independently
  of the canvas.
- `LOCAL-001` through `LOCAL-008`, a deterministic complete-round driver, seven root/Pages
  viewports, and a real 390×844 two-player handoff trace pass locally.

Architecture: [`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md).

## Phase 2E authoring runtime retained

- Portable 48-slot Workshop/status, normalized transform-editing, contact-sheet geometry, and strict
  owner-approval contracts under `@koikoi4x/deck-format`.
- Explicit Node-only Sharp adapter for orientation-aware PNG/JPEG/WebP decode, deterministic
  640×1024 table and 160×256 thumbnail derivatives, SHA-256 provenance, and atomic output.
- Immutable digest-named source assignment and atomic transform saves; imports never overwrite
  existing source art.
- Local-only Workshop with January–December grid, Auto/Manual editing, source/frame/phone/back
  previews, package actions, exact errors/warnings, and a four-pilot 390×844 board review.
- Token-protected exact package/card filesystem bridge enabled only by the Workshop Vite config.
  Normal root/Pages builds return 404 for `workshop.html` and contain no authoring bridge.
- Canonical 968×4516 art-review and 390×1624 gameplay-size sheets with all 48 slots and explicit
  incomplete watermarking when sources are absent.
- Complete runtime manifest generation only for 48 faces plus one back. A second complete technical
  package is constructed and decoded in tests without labeling it final art.
- Strict release evidence: approved pilot metadata plus an explicit owner/date/note bound to the
  platform-independent source/transform/back/sheet-plan review digests, four pilot CardIds, and
  390×844 viewport. Raw encoded PNG hashes remain separate build diagnostics.

## Phase 2D input runtime now present

- Pure `InteractionControllerV1` over one `PlayerObservationV1`, legal actions, public confirmation
  hints, confirmation policy, and external presentation locks.
- Guided explicit confirmation, Fast immediate single-action emission, and explicit target choice
  whenever several legal capture actions exist.
- Draw-capture and Bank/Koi-Koi controls sourced only from current legal actions, with one-intent
  duplicate suppression until a newer observation identity arrives.
- Minimal frozen intent values containing match, expected state version, actor, and legal action;
  no command ID, display scoring metadata, authoritative state, RNG, replay, or engine transition.
- Persistent Pixi selection/focus/legal-target highlights kept separate from trusted animation
  projection state and all 48 persistent CardView identities.
- Semantic DOM card buttons with layout-derived hit areas, roving arrow/Home/End focus, Enter/Space,
  Escape, visible focus, selection state, and name/month/category/action labels.
- Animation, deck-loading, opponent-turn, replay/disconnect, and round-transition locks clear stale
  selection and suppress the semantic input surface.
- Four frozen technical input phases cover Hand, Draw capture, Yaku decision, and opponent turn. The
  current page displays emitted intents locally and never executes them.

## Phase 2C presentation runtime now present

- Pure immutable event-boundary projections and planner output for Hand-to-Field, Pair Capture,
  Draw/Reveal/Flip, Four-Card Sweep, and semantic Koi-Koi feedback.
- One FIFO AnimationDirector with Normal, Fast, Instant, and Reduced Motion duration policies; all
  four settle to the same exact projection.
- Deterministic `advanceBy`, first-tap acceleration, second-tap/immediate finish, explicit
  cancel-and-snap, destruction safety, and rejection of a queued plan with the wrong source.
- Persistent CardViews move through Effects/transit and flip at a dedicated midpoint; settlement
  leaves no transit view or queued clip.
- Live resize rebases active source/target geometry at the same normalized progress. A mid-flight
  deck change alters only texture bindings and preserves the clip, position, identity, and queue.
- Accessible technical scenario/motion/Play/Faster/Finish/Cancel controls overlay the previously
  reserved action area, preserving the minimum supported 320×568 canvas.
- `render_game_to_text` now reports only presentation-safe animation mode/status/clip/counts and
  projection fingerprints in addition to prior scene/deck/layout diagnostics.

- Pure deterministic layout modes for compact portrait, portrait/tablet, short landscape, and
  desktop, derived from the actual canvas rather than the browser window.
- All fourteen DESIGN logical card zones, three reserved UI zones, stable 5:8 field/hand/draw/reveal
  slot geometry, a 44-pixel minimum action target, and structural clip/overlap diagnostics.
- Ten persistent Pixi containers from Background through Interaction Overlay; redraw clears only
  layer content and never recreates the scene/layer hierarchy.
- Mobile vertical hierarchy, dedicated landscape composition, and desktop lateral capture rails,
  with semantic DOM status and a canvas description.
- Exactly 48 persistent CardViews keyed by canonical CardId, with stable object tokens, presentation
  zone/layer assignments, face/back state, and in-place texture replacement.
- Strict `RuntimeDeckManifestV1` decoding: exact card coverage, one back, ART_SPEC v1 dimensions,
  safe local paths, provenance, approval status, and hostile-data rejection.
- Complete reproducible `technical-sunrise` and `technical-moonlight` packages, both visibly and
  machine-readably labeled technical placeholders rather than final artwork.
- Candidate-wide preload and atomic activation; a failed package leaves the prior package active
  and unloads candidate successes.
- Local accessible deck selection with no engine/protocol/replay/command mutation.
- Versioned machine-readable diagnostics preserving the one-canvas, stopped-ticker,
  deterministic-time, fullscreen, CardView-identity, and GitHub Pages base-path contracts.

## Phase 1 headless foundation now present

- Closed typed keys, stable display names, and canonical Rules-table ordering for Five/Four/Four
  with Rain/Three Brights, Blossom Viewing, Moon Viewing, Animal Trio, Red Text Scrolls, Blue
  Scrolls, Current-Month Set, Animals, Scrolls, and Plain Cards.
- Pure immutable evaluation from one player's unique captured CardIds and scheduled month, returning
  active yaku, exact total, category counts, and all active keys not yet seen by that player.
- Exclusive Bright replacement hierarchy, independent fixed/generic stacking, exact Sake Cup
  category behavior, and incremental points above 5 Animals, 5 Scrolls, and 10 Plain Cards.
- Typed player-local `seenYakuKeys`, `activeYaku`, and `currentYakuTotal`, reset during match setup and
  recomputed by authoritative-state validation.
- Atomic `awaitingYakuDecision` contexts containing every new yaku, the complete active-yaku list and
  total, capture phase, and a deterministic draw/turn/End-of-Play resume marker.
- Public `yakuCompleted`, `yakuValueChanged`, and `yakuDecisionRequired` events ordered after the
  public capture that caused them and containing no opponent hand or unrevealed draw identifiers.
- First-trigger-player tracking populated only by the round's first actual unseen active key and
  preserved across later Player A/Player B triggers for Phase 1D's final-leader rule.
- Exact decision timing for Hand capture, direct Draw capture, pending two-target Draw selection, and
  final Draw; seen incremental value changes do not open another decision.
- All 39 locked Phase 1C evaluator fixtures plus targeted production state-machine fixtures for
  multi-yaku, Current-Month sweep, increments, pending choice, Player B, and final Draw.
- Executable `chooseYakuDecision` commands and deterministic Bank-then-Koi legal actions, with Bank
  omitted only for the protected final-round leader's applicable ordinary 1× first trigger.
- Ordinary table progression 1→2→3→4→4, latest-caller replacement at the cap, privileged 1×/2× Bank,
  and privileged 1×→3× Koi-Koi with explicit visible/scoring multiplier separation.
- Direct result commitment for Hand Bank, Draw Bank, natural End of Play, and final-Draw Koi-Koi;
  latest-caller scoring can differ from the final actor, while no caller records an explicit 0–0.
- Typed `RoundResultV1` history with canonical reason, point deltas, active-yaku arithmetic,
  automatic public evidence, cumulative post-result scores, and exact next-round consequence.
- Scored 1×/2× loser and 3×/4× winner starter rules, January/later 0–0 rules, next-round-only
  privilege handling, frozen final-round leader selection, and terminal cumulative match results.
- External-checkpoint `advanceRound` plus ordered-deck fixture entry point, preserving private hands,
  server-only draw order, score/history, deterministic replay, and one-version transition semantics.
- Literal metadata/expectations for all 47 Phase 1D KOI/END-PLAY/TRANS/FINAL/HIST vectors, executable
  production traces for the 45 reachable cases, and a complete 16-turn natural round with eight
  unused draws. `KOI-015A/B` are explicit unreachable-policy rejection cases because their former
  premise conflicts with the next-starter/privilege and alternating-turn rules.
- `PublicGameStateV1` exposes public captures/yaku/scores, zone counts, round facts, phase, and
  history while omitting both exact hands, future draw order, seen keys, command IDs, and RNG state.
- `PlayerObservationV1` adds only the named player's exact hand and legal actions; the other player
  receives counts only, and nonactive players receive no executable actions.
- Public/player event projection enforces audience policy. Lucky qualification remains hidden before
  automatic-result commit and the committed evidence reveals exactly the approved qualifying hand.
- Canonical JSON v1, portable SHA-256, private authoritative replay logs, public/private hash
  separation, and boundary-tamper detection are engine-owned and browser/Firebase independent.
- Immutable accepted-command receipts make exact Start/Gameplay/Advance retries safe after later
  state changes; conflicting key reuse rejects and failed commands do not enter the log/cache.
- `PublicTurnRecordV1` has protocol/canonical/hash versions plus a unique record sequence and strict
  runtime decoding that rejects private fields, unknown public fields, and hidden event types.
- Typed literal fixtures cover all 11 new Phase 1E IDs; the three retained history/evidence IDs stay
  bound to executable Phase 1D lifecycle traces.

## Architecture decisions

- `rules/yaku.ts` is the sole pure scoring authority. It does not mutate state, emit events, execute
  Bank/Koi-Koi, apply multipliers, or depend on rendering/networking.
- Active yaku use canonical Rules-table order. Only one Bright tier is active at a time; an upgraded
  lower tier remains in seen-trigger history but no longer contributes to the active total.
- Every successful capture/placement resolution recomputes the actor's active snapshot. One capture
  phase can append several unseen keys but creates only one decision context.
- Trigger keys are marked seen when the decision window is committed, allowing authoritative
  validation to prove that the context is the exact newly appended suffix rather than a subset.
- Hand and Draw resume markers describe the unresolved continuation but are not player commands.
  Phase 1D consumes them through one decision command without an intermediate state version.
- Result commitment and next-deal advancement are separate authoritative transitions. This preserves
  an explicit result/presentation seam and keeps RNG checkpoints outside state and events.
- Canonical/hash/replay/idempotency contracts are pure immutable engine values. A future service is
  responsible only for authentication and atomic persistence of those returned values.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`ADR 0005`](./adr/0005-phase-1c-yaku-trigger-boundaries.md).
The Phase 1D lifecycle split is recorded in
[`ADR 0006`](./adr/0006-phase-1d-round-lifecycle.md).
Phase 1E privacy, replay, hash, retry, and protocol choices are recorded in
[`ADR 0007`](./adr/0007-phase-1e-projection-replay-integrity.md).
The authored/runtime deck boundary, persistent-card identity, and atomic local-switch policy are
recorded in [`ADR 0008`](./adr/0008-phase-2b-persistent-card-runtime.md).
Phase 2C semantic planning, queue, motion, and interruption choices are recorded in
[`ADR 0009`](./adr/0009-phase-2c-animation-director.md).
Phase 2D observation, intent, confirmation, semantic-overlay, and execution boundaries are recorded
in [`ADR 0010`](./adr/0010-phase-2d-input-intent-boundary.md).
Phase 2E authoring/approval boundaries are recorded in
[`ADR 0011`](./adr/0011-phase-2e-workshop-import-approval-boundary.md), and Phase 3A local execution,
projection, recap, and handoff are recorded in
[`ADR 0012`](./adr/0012-phase-3a-local-round-adapter.md).

## Validation

- The primary candidate uses 49 immutable 1600×2560 WebP masters with no source-quality warning.
  All 48 face derivatives, the back, both complete review sheets, and the approved four-card 390×844
  pilot board were visually inspected.
- Phase 2E's technical gate passes 16 focused files / 114 tests, builds the complete primary
  candidate, exercises the local Workshop at desktop and 390×844, and passes both root and
  repository-prefixed seven-viewport production matrices with the Workshop absent.
- The owner-gated release command passes with zero issues. The v1.0.0 runtime manifest is labeled
  `approved` and matches the exact semantic review identities on both macOS and Linux.
- The Phase 3A production build contains the approved primary runtime and real local-round adapter;
  the local Workshop still reports 48 slots, 47 Auto faces, 1 Manual face, 0 missing, and
  `engineExecution:notAvailable`.
- `npm run check` passes 33 files / 348 tests and the isolated 10,002-match generated gate,
  all workspace checks, authored-package validation, and the 764-module production build. Isolating
  the CPU-heavy generated gate prevents Sharp raster tests from starving its deterministic timeout.
- Three independent Phase 2E reviews report no blocker, high, or medium finding after selected-build,
  stale-manifest, rotation-preview, inheritance/back, source-containment, package-path, Workshop UX,
  and Pages-gating repairs.
- Implementation commit `31da04f` is on `origin/main`. Hosted CI run `31327748444` passed the full
  repository and Phase 2E gates; Pages run `31327748453` passed the same gates and deployed. A
  cache-busted Phase 2E live browser run rendered the then-current technical table without errors, the public root
  returned 200, and the intentionally local-only `workshop.html` route returned 404.
- Phase 3A's focused gate passes 17 files / 119 tests plus all 100 technical deck artifacts,
  approved release validation, and the local Workshop browser trace. Root and repository-prefixed
  smokes each pass seven viewports plus a Normal-motion 390×844
  Hand/Draw/recap/privacy-handoff/Player-B/New-round trace with zero browser or network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, deck
  validation, 34 files / 353 tests plus the isolated 10,002-match deterministic gate, and the
  765-module production build. Implementation commit `7f3d5f1` is on `origin/main`; hosted CI run
  `31344124822` and Pages run `31344124824` passed the Phase 3A gates and deployed it.
- The cache-busted public approved manifest returned HTTP 200 with package
  `new-primary-deck`/`approvalStatus:approved`. A real public browser run reported `ready:true`, 48
  persistent CardViews, the approved primary deck, and the authoritative `awaitingHandPlay` local
  round; its rendered table was visually inspected without clipping.
- Phase 2D's focused gate passes 8 files / 76 tests and byte-checks all 100 generated technical
  artifacts. Both seven-viewport root and `/KoiKoi4XRedux/` baseline matrices and each base's complete
  390×844 interaction trace pass with zero browser/network errors.
- `npm run check` passes formatting, zero-warning lint, all five workspace typechecks, authored-deck
  validation, 31 files / 335 tests including 10,002 generated matches, and a 761-module build.
- The bundled game client reported `inputRuntime`, one selected Hand card, the exact two legal public
  targets, ten semantic controls, 48 stable CardViews, and `intentExecution:notExecuted`; its
  screenshot and the Guided/Yaku/desktop browser screenshots were inspected.
- Three independent Phase 2D reviews report no blocker, high, or medium finding after source-phase,
  exact Draw target, monotonic observation, duplicate suppression, and DOM focus hardening.
- Hosted CI run `31322149519` passed the full repository and Phase 2D gates. Pages run `31322149502`
  passed its repository-prefixed matrix and deployed commit `05800e0`. A cache-busted live run
  selected April Cuckoo, exposed exactly two legal targets, reported ten semantic controls and 48
  stable CardViews, and retained `intentExecution:notExecuted`.
- Phase 2C's focused unit gate passes 7 files / 60 tests and byte-checks all 100 generated technical
  artifacts. Both seven-viewport root and `/KoiKoi4XRedux/` browser matrices pass.
- `npm run validate:phase1e` passes 16 test files / 176 tests, including all prior Phase 1A–1D
  regressions, canonical/hash/projection/protocol/replay fixtures, and the generated gate.
- The generated gate passes 10,002 complete matches, exactly 3,334 per 3/6/12-round format, with
  production validation after every transition and sampled full replay/privacy/hash equality.
- Hosted CI run `31316814794` passed the exact Phase 2C implementation commit: 30 files / 319 tests,
  the complete 10,002-match generated gate, the 756-module production build, all 100 technical deck
  artifacts, 7 files / 60 focused tests, and both seven-viewport browser matrices. A final local
  combined rerun had previously timed out only because an external 99%-CPU process starved the same
  generated test; the uncontended hosted result closes that environmental verification gap.
- Seven-viewport Phase 2C smoke passes root and repository-prefixed builds, all four modes, live
  mid-clip resize, mid-clip deck switching, accelerate, finish, cancel/snap, fullscreen, stable scene
  and CardView identities, exact target settlement, and zero console/network errors.
- The bundled game-client reported `animationRuntime`, 48 unique persistent CardViews, idle equal
  display/target fingerprints, the active technical package, and no diagnostics. Its canvas and
  representative 320×568, 390×844 mid-draw, and 1366×768 browser screenshots were inspected.
- Three independent Phase 2C planner/privacy, Pixi/runtime, and fixture/deployment reviews report no
  blocker, high, or medium finding after FIFO empty-plan, exact projection-equality, and settled
  chrome-refresh hardening.
- Pages run `31316814785` deployed commit `0139892`. A cache-busted live browser run completed the
  Hand-to-Field scenario with equal display/target fingerprints, 48 unique persistent CardViews,
  no queued/transit card, and no browser error.

## Known constraints and risks

- Firebase persistence, authentication, membership checks, and transactional storage of the private
  replay/cache remain Phase 7 responsibilities; Phase 1E supplies their pure deterministic core.
- Turn-record construction/decoding is locked, while server-side grouping/publication of multi-command
  turns remains Phase 7 transaction ownership.
- The specialized CAP/YAKU fixture records predate full alignment with the generic
  `RuleFixtureSpec` description/rule-reference shape; their stable IDs, literal inputs/expectations,
  and executable production traces are locked, while metadata-shape unification remains test-infra
  cleanup.
- `KOI-015A/B` cannot occur under the locked rules: a 1x loser is both the next starter and
  the only privilege holder, the starter takes turns 1/3/.../15, and the nonstarter necessarily owns
  turn 16's final Draw. The owner selected Option A: their stable IDs now assert authoritative
  `ROUND_PRIVILEGE_INVALID` rejection rather than impossible scoring outcomes.
- The browser-local Phase 3A runtime deliberately restarts the first round and stores nothing.
  Multi-round continuation/save-resume remains Phase 5, while authenticated remote command transport
  remains Phase 7/8.
- Phase 3A can execute engine Bank/Koi decisions so the round cannot deadlock, but the finished yaku,
  progress, multiplier, and Bank/Koi presentation remains Phase 3B; finished round-result
  presentation remains Phase 3C.
- Hosted CI currently emits a nonblocking maintenance annotation that v4 checkout/setup/artifact
  actions target deprecated Node.js 20 and are being forced onto Node.js 24. The run remains green;
  workflow-action upgrades can be handled as isolated infrastructure maintenance.
- Firebase, persistence, multiplayer, CPU play, onboarding, and final presentation polish remain
  deferred. The primary card artwork itself is approved and deployed with Phase 3A.

## Owner verification and deployment steps

1. No hosting configuration, Firebase project, secret, or migration is required. Pushing `main`
   triggers CI and GitHub Pages.
2. Verify the larger eight-card hand at phone and desktop widths. There should be no visible
   `Player A · play a hand card`, initial-ready message, routine Confirm/Cancel row, or numbered
   empty field placeholders.
3. After deployment, play a hand card and watch the next Draw: one face-down card must leave the
   visible top of the deck, flip only in **Reveal**, pause briefly, then become the only actionable
   Reveal card. Activate it with the keyboard or tap and follow the engine-provided field cue.
4. Open **Options** and verify it contains only themes, deck, fullscreen, restart, and close. Select
   Moonlit Indigo or Warm Ivory, close Options, and reload once to verify the cosmetic preference
   persists without restarting the round.
5. Select a hand card and verify changing the theme preserves the active selection and highlighted
   field target. Play through Yaku/Bank/Koi and confirm unrelated Options
   controls remain locked during critical decisions.
6. Expand **History** to inspect the complete disclosed recap. `Start another local round` remains a
   local practice restart, not February advancement. Additional deck packages remain supported.

The deployed baseline is
[`https://geoduckedup.github.io/KoiKoi4XRedux/`](https://geoduckedup.github.io/KoiKoi4XRedux/).

## Next governed phase

**Phase 6B — Difficulty and explanations:** the approved next subphase adds reasons, confidence, and
match-context strategy. Rollout, determinization, and tuning remain Phase 6C.
