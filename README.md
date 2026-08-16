# KoiKoi4x

KoiKoi4x is a greenfield TypeScript rewrite of a two-player Hanafuda strategy game. The repository
has deployed and accepted **Phase 3E: playability corrections**, **Phase 3F-A: simplified table and
larger hand**, the player-facing **Phase 3F-B: unified tap-only interaction** outcome, and **Phase
3F-C: visual interaction cues** with an owner-approved primary deck. **Phase 3F-D: placement and
capture choreography** is deployed and accepted. **Phase 3F-E: utility dock and capture cleanup**
is deployed, live-verified, and accepted. **Phase 3F-F: interaction clarity and card inspection** is
deployed, live-verified, and accepted. **Phase 3F-G: card inspector yaku reference/native gesture
polish** is deployed, live-verified, and accepted. **Phase 3F-H: active-hand start cue** is deployed,
live-verified, and accepted. **Phase 3F-I: Reveal start cue** is deployed, live-verified, and
accepted. **Phase 3F-J: legal destination pulse** is deployed, live-verified, and accepted. The
repository contains the canonical rules
authority, all
48 artwork-independent card records, the complete
deterministic headless match
engine, privacy-safe projections and replay, a versioned deck authoring contract, strict workspace
boundaries, and a responsive Pixi table with 48 persistent canonical CardViews, local atomic deck
switching, deterministic public-event animation, keyboard-accessible authoritative local play,
private pass-the-device handoff, public Yaku progress, authoritative Bank/Koi-Koi decisions, and
accessible turn recap plus a responsive, recipient-safe result screen.

## Prerequisites

- Node.js 24.14.0 (see `.nvmrc`)
- npm 11.9 or newer

## Start locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Press `F` to enter or leave fullscreen; `Esc` exits fullscreen.

## Validate

```sh
npm run check
npm run validate:phase1a
npm run validate:phase1b
npm run validate:phase1c
npm run validate:phase1d
npm run validate:phase1e
npm run validate:phase2a
npm run validate:phase2b
npm run validate:phase2c
npm run validate:phase2d
npm run validate:phase2e
npm run validate:phase3a
npm run validate:phase3b
npm run validate:phase3c
npm run validate:phase3da
npm run validate:phase3db
npm run validate:phase3dc
npm run validate:phase3dd
npm run validate:phase3ea
npm run validate:phase3eb
npm run validate:phase3ec
npm run validate:phase3fa
npm run validate:phase3fc
npm run validate:phase3fd
npm run validate:phase3fe
npm run validate:phase3ff
npm run validate:phase3fg
npm run validate:phase3fh
npm run validate:phase3fi
npm run validate:phase3fj
npm run validate:phase5a
npm run validate:phase5b
npm run validate:phase6a
npm run validate:phase6b
npm run validate:cards
npm run validate:decks
npx playwright install chromium
npm run test:e2e:smoke
```

`npm run generate:deck-artifacts` regenerates the JSON Schemas, SVG Art Guide, and pilot import plan
from the locked Phase 0D constants. Development and release validation accept the complete 48-face
owner-approved primary package plus its back and current semantic-digest-bound approval record.

`npm run generate:technical-runtime-decks` regenerates the two complete Phase 2B browser fixtures,
and `npm run validate:technical-runtime-decks` proves their 100 checked-in manifest/face/back
artifacts are current. `technical-sunrise` and `technical-moonlight` are intentionally obvious
technical placeholders; they validate the runtime and are not approved deck art.

`npm run validate:phase1a` executes the seeded RNG, shuffle/deal, state-invariant, automatic opening
outcome, event-visibility, and DEAL-001–012 fixture suite. The Phase 2A browser smoke produces
responsive table screenshots and serialized layout diagnostics under `output/phase-2a/e2e/`.

`npm run validate:phase1b` executes the pure capture primitive, gameplay command state machine,
legal-action generation, authoritative invariants, and all eight CAP-000 through CAP-DRAW-003
fixtures. Exact two-match hand choices travel atomically with the hand command; exact two-match draw
choices persist as an authoritative pending phase.

`npm run validate:phase1c` executes all 39 locked `YAKU-*` evaluator vectors plus Hand, Draw,
pending-choice, incremental-value, multi-yaku, Player B, and final-draw state-machine integration.
It verifies that all new yaku from one capture phase share one decision context and that Bank/Koi-Koi
execution remains unavailable until Phase 1D.

`npm run validate:phase2a` runs the pure responsive layout vectors plus root-base and
repository-prefixed browser validation at seven phone, tablet, landscape, and desktop viewports.
It verifies all prescribed Pixi layers and logical zones, deterministic geometry, fullscreen,
resize behavior, Pages asset routing, and zero browser/network errors.

`npm run validate:phase2b` additionally validates the strict complete runtime-manifest contract,
two technical packages, all 48 persistent CardView identities and 5:8 placements, atomic switch
rollback, browser/Node package boundaries, live deck switching, and root plus GitHub Pages asset
delivery. Browser screenshots and serialized diagnostics are written under `output/phase-2b/e2e/`.

`npm run validate:phase2c` adds literal semantic planner/director coverage and root/Pages browser
matrices for Normal, Fast, Instant, and Reduced Motion, exact final-state equality,
accelerate/finish/cancel, mid-flight resize and deck switching, persistent CardViews, fullscreen,
and zero browser/network errors. Artifacts are written under `output/phase-2c/e2e/`.

`npm run validate:phase2d` adds `INPUT-001` through `INPUT-014`, Guided/Fast confirmation,
legal Hand/Draw/Yaku targets, duplicate suppression, semantic card labels, pointer and roving-keyboard
input, presentation locks, and both seven-viewport browser bases. Intents are displayed but never
executed. Artifacts are written under `output/phase-2d/e2e/`.

`npm run validate:phase3a` adds `LOCAL-001` through `LOCAL-008`, the real local
observation-to-command adapter, recipient-safe 48-card projection, legal field overflow, exact
public-event animation boundaries, complete-round deterministic play, full-table private handoff,
and HTML turn recap. Root and Pages browser gates load the approved Primary Deck at seven viewports
and execute a real Player A turn into Player B Ready. Artifacts are written under
`output/phase-3a/e2e/`.

`npm run validate:phase3b` retains the Phase 3A/release/Workshop/root/Pages gates and adds the ten
locked `PRES-*` public-yaku/Bank/Koi contracts. Its production-local seed trace verifies Hand Animals
Bank/Koi choices, Draw continuation, a combined Blue Scrolls + Scrolls decision, public arithmetic,
and recipient-safe text output. Artifacts are written under `output/phase-3b/e2e/`.

`npm run validate:phase3c` adds the twelve locked `PRES-RESULT-*` contracts and a public-only result
model for Bank, End of Play, no-score, automatic evidence, privileged multipliers, next-round plans,
and terminal winner/tie outcomes. Root and Pages traces prove the feedback-to-result ordering, exact
Bank and final-Draw Koi-Koi arithmetic, result focus/input locking, truthful local restart, and
responsive result containment. Artifacts are written under `output/phase-3c/e2e/`.

`npm run validate:phase3da` retains the three approved visual directions as a one-production-build
runtime gallery. It selects each theme through the real Options dialog and captures mobile and
desktop comparison screenshots under `output/phase-3d-a/visual-directions/`.

`npm run validate:phase3db` retains the approved visual-direction, release-deck, Workshop, root,
Pages, and prior gameplay gates. It adds the authoritative no-match, unique-pair, exact-two, and
four-card-sweep interaction previews plus real Guided placement/pair browser traces under
`output/phase-3d-b/e2e/`.

`npm run validate:phase3dc` makes Ink & Parchment the production default and verifies Moonlit
Indigo/Warm Ivory runtime selection, IndexedDB reload persistence, in-place Pixi/CardView repaint,
the accessible compact Options/turn/Yaku/history shell, all prior interaction/result traces, and
both root and Pages builds. Artifacts are written under `output/phase-3d-c/e2e/`.

`npm run validate:phase3dd` retains the complete Phase 3D-C/release/Workshop/root/Pages gate and
adds deterministic 8/9/12/17-card adaptive-field geometry, public field-order preservation,
non-overlapping dense target territories, and separated direct-motion/reflow checks. Its isolated
non-shipping Pixi harness exercises 17 cards plus pointer/keyboard targets across all seven root and
Pages viewports. Representative artifacts are written under `output/phase-3d-d/e2e/`.

`npm run validate:phase3ea` retains that complete gate and removes empty numbered field chrome,
keeps Options in a bottom-safe utility, adds state-preserving public capture galleries, presents
Bank/Koi-Koi without obscuring the table, and keeps secondary result evidence collapsed until
requested. Root and Pages evidence is written under `output/phase-3e-a/e2e/`.

`npm run validate:phase3eb` retains the complete 3E-A gate and validates the authoritative
Draw-resolution pause: each Draw remains pending until the player explicitly resolves the revealed
card through engine-provided legal actions. Artifacts are written under `output/phase-3e-b/e2e/`.

`npm run validate:phase3ec` retains the authoritative Draw-resolution gate and adds privacy-safe
physical choreography: one face-down card leaves the visible deck top, flips in Reveal, pauses, then
becomes the existing keyboard-accessible Reveal action. Root and Pages artifacts are written under
`output/phase-3e-c/e2e/`.

After the repository-wide `npm run check`, `npm run validate:phase3fa` runs one copy each of the
release/technical deck checks, focused shell/input/animation/runtime tests, Workshop, dense-field
review, and root/Pages browser suites. It removes routine phase/confirmation chrome, enlarges the
eight-card player hand using the former canvas action-strip reserve, simplifies Options to essential
table controls, and verifies automatic reduced-motion behavior. Root and Pages artifacts are written
under `output/phase-3f-a/e2e/`.

`npm run validate:phase3fc` is a flattened successor gate: it runs one release/technical-deck,
focused shell/input/animation/runtime, Workshop, density-review, root-browser, and Pages-browser
copy. It verifies that selected sources, legal targets, no-match field destinations, and settled
Reveal sources remain clear but uncluttered; semantic overlays stay keyboard-accessible without
drawing pointer-visible DOM chrome. Root and Pages artifacts are written under
`output/phase-3f-c/e2e/`.

Phase 3F-C is deployed and accepted at commit `4181375`. Hosted CI and Pages passed, and a
cache-busted live check confirmed the approved Primary Deck, one canvas, all 48 unique CardViews,
the expected 8-card hand / 8-card field / 24-card draw allocation, no empty placeholders, and no
layout diagnostics. Phase 5 full local product work is next; additional owner visual notes may still
be handled as bounded polish.

Phase 3F-D local validation is complete: `npm run check` passed format/lint/typecheck/decks, 46
files / 442 tests, all 10,002 generated seeds, and the production build. The final
`npm run validate:phase3fd` pass covered the approved 48/48 release deck, 100 technical artifacts,
focused 5 files / 77 tests, Workshop, the 14-viewport density review, and full root/Pages smoke.
The bundled game client and Root/Pages CHOREO screenshots were inspected. Release commit `108fb05`
passed CI run `31844698117` (`verify`, 9m04s) and Pages run `31844698124` (`build`, 11m33s; deploy,
9s). The cache-busted live URL returned HTTP/2 200 with `x-cache: MISS`, `Last-Modified: Fri, 14 Aug
2026 22:09:56 GMT`, and bundle `assets/index-DjACAdI7.js`. Two live-client iterations were ready with
the approved deck, one canvas, 48/48 CardViews, 8 field / 8 hand / 24 draw, and clean diagnostics;
`output/phase-3f-d/live-ready/shot-1.png` and `state-1.json` were inspected. Next: Phase 3F-E utility
dock/capture cleanup, then Phase 5A full local match formats.

`npm run validate:phase3fe` is the flattened successor gate for the presentation-only utility dock
and capture cleanup. It keeps the current card/rules/animation authority intact, verifies the exact
History / Yaku Guide / Options bottom order, History and reference-dialog focus behavior, all thirteen
canonical Yaku Guide entries with example images, decluttered routine table labels, public capture
gallery 5:8 framing, privacy, and root/Pages responsive traces. The Guide is a static rules reference,
not tutorial/onboarding or a current-table evaluator; Phase 5A retains exact ordered yaku-card
evidence in expanded end-of-play details. Root and Pages artifacts are written under
`output/phase-3f-e/e2e/`.

Phase 3F-E local closure is green. `npm run check` passed format, lint, all workspace typechecks,
deck validation, 47 files / 444 ordinary tests, all 10,002 deterministic generated matches, and the
772-module production build. `npm run validate:phase3fe` passed the approved 48/48 release deck,
100 technical artifacts, 6 focused files / 79 tests, Workshop, the 14-viewport density review, and
root plus repository-prefixed Pages browser suites. The bundled web-game client reached ready state
with one canvas and 48 persistent CardViews; Guide, landscape dock, and capture-gallery screenshots
were inspected. Independent Terra review initially found two medium issues—cross-theme light-frame
proof and complete utility-dialog mutual exclusion—and the repaired implementation received no
remaining blocker, high, or medium finding.

Phase 3F-E release commit `f8358d8` passed CI run `31855285354` (`verify`, 01:00:16–01:11:13 UTC)
and Pages run `31855285349` (`build`, 01:00:17–01:13:15; `deploy`, 01:13:19–01:13:27). The
cache-busted live URL returned HTTP/2 200 with a cache MISS, `Last-Modified: Sat, 15 Aug 2026
01:13:23 GMT`, and production assets `index-DMr_DIMH.js` / `index-DwN18UTX.css`. The bundled live
client first recorded expected `ready:false` while textures loaded, then two `ready:true` states with
the approved `new-primary-deck`, one canvas, 48/48 unique CardViews, 8 field cards, 8 hand cards, 24
draw cards, and clean diagnostics. The states and screenshots under `output/phase-3f-e/live-ready/`
were inspected. Phase 5A full local match formats is next.

`npm run validate:phase3ff` is the flattened successor gate for the in-progress Phase 3F-F
presentation/input pass. It will validate the stronger yellow-gold source/target/field-destination
language, optional public-observation phase help, and privacy-safe card inspection without changing
engine, protocol, scoring, replay, or result authority. Ordered exact yaku-card evidence remains
Phase 5A. Root and Pages evidence is written under `output/phase-3f-f/e2e/`. Local validation is
green: 48/48 release deck, 100 technical artifacts, 7 focused
files / 83 tests, Workshop, 14 density viewports, root/Pages smoke, and all-web 143-test/build
validation. `npm run check` also passed 48 files / 448 ordinary tests, all 10,002 deterministic seeds,
and the 774-module build. The inspected bundled-client final state/screenshot under
`output/phase-3f-f/game-client-final/` show one canvas, 48 unique CardViews, 8 hand / 8 field / 24
draw, 8 actionable plus 8 inspect-only semantic controls, closed utility surfaces, and no diagnostics;
CI `31865103301`, Pages `31865103302`, and cache-busted live verification passed; Phase 3F-F is
deployed and accepted.

`npm run validate:phase3fg` is the locally accepted successor gate for the optional collapsed
card-inspector yaku reference, scoped native long-press selection/touch-callout suppression,
all-card static mapping, dialog scrolling, accessibility, privacy, and root/Pages theme evidence.
It remains a reference surface rather than current-table analysis or achieved-yaku results; exact
formation-time yaku evidence remains Phase 5A. It passed 48/48 release deck approval, 100 technical
artifacts, 8 focused files / 87 tests, Workshop, 14 root/Pages density viewports, and full
root/Pages smoke. `npm run check` passed 49 ordinary test files / 452 tests, all 10,002 generated
seeds, release-deck validation, and the 774-module build. Root/Pages collapsed, expanded, and
844×390 scroll-bottom screenshots under `output/phase-3f-g/e2e/` were inspected; the bundled
develop-web-game client completed three 1280×720 iterations with one canvas, 48 unique CardViews,
and no invalid layout. Independent Terra re-review found no blocker, high, or medium issue. Commit
`9fafb2f` passed hosted CI `31868152672` (`verify`, 10m38s) and Pages `31868152577` (build through
06:05:54Z; deploy 06:05:58–06:06:06Z). A cache-busted live request returned HTTP/2 200 MISS with
`Last-Modified: 2026-08-15 06:06:03 GMT`; the live bundled game-client completed two ready
iterations with one canvas, 48 unique CardViews, and no layout diagnostics. Live Playwright semantic
verification focused January Pine Plain B, pressed `I`, opened the locked inspector with collapsed
count 2, then expanded Current-Month Set and Plain Cards with their exact example images and
conditional copy. WebKit/iOS native touch-callout behavior remains a supplemental manual-device
check.

`npm run validate:phase3fh` is the locally accepted flattened successor gate for the active Player
Hand start cue. It retains the 3F-G card-inspector and runtime checks while adding focused cue
lifecycle coverage, Workshop, density review, and root/Pages smoke. The cue is a presentation-only
pulsing white hand-zone affordance at the local player's idle Hand step; selection removes it, gold
remains reserved for selection/targets, and reduced motion uses a steady outline. `npm run check`
passed 50 ordinary test files / 456 tests, all 10,002 generated seeds, deck validation, and the
775-module build. `validate:phase3fh` passed the 48/48 release deck, 100 technical artifacts, 9
focused files / 91 tests, Workshop, 14 root/Pages density viewports, and full root/Pages smoke through
Bank/restart. The independent Terra re-review found no blocker, high, or medium issue. Root/Pages
390×844, selected, 844×390, three-theme, and reduced-motion screenshots under
`output/phase-3f-h/e2e/` were inspected; the bundled web-game client completed three ready 1280×720
iterations with one canvas, 48 unique CardViews, and no layout diagnostics. Commit `55a4032` passed
hosted CI run `31873371558` (`verify`, 08:00:07–08:13:59Z; both `check` and
`validate:phase3fh` passed) and Pages run `31873371515` (`build`, 08:00:08–08:12:34Z; `deploy`,
08:12:39–08:12:49Z). A cache-busted live request returned HTTP/2 200 MISS with `Last-Modified:
2026-08-15 08:12:44 GMT`. Two live bundled-client iterations were ready with the visible whole-Hand
white perimeter, one canvas, 48 stable CardViews, and no layout diagnostics. A physical iPhone/WebKit
check of perceived pulse motion and white-outline contrast remains supplemental. Phase 3F-H is
deployed, live-verified, and accepted. This does not begin Phase 5A result or match-progression work.

`npm run validate:phase3fi` is the locally accepted flattened successor gate for the Reveal start
cue. It retains the Phase 3F-H release-deck, technical-deck, interaction/runtime, Workshop,
density-review, and root/Pages checks while adding focused settled-Reveal cue coverage. It passed
the 48/48 release deck, 100 technical artifacts, 10 focused files / 101 tests, Workshop, the Phase
3D-D 14 root/Pages density viewports, and full root/Pages smoke through Bank/restart. `npm run check`
passed 51 ordinary test files / 466 tests, all 10,002 generated seeds, deck validation, and the
776-module build. Screenshots under `output/phase-3f-i/e2e/` were inspected: white identifies the
settled Reveal before selection, then gold identifies the source and legal target/destination.
The bundled develop-web-game client completed two 1280×720 iterations against the final root
production build: `state-0`/`state-1` reached the ready authoritative local round with one canvas,
48 unique persistent CardViews, the 8/8/24 Hand/opponent/draw allocation, idle input, and no
diagnostics or clipped/invalid/overlap zones; its screenshot was inspected.
Independent Terra review initially found three medium issues—face-up eligibility, min-height versus
exact bounds, and indirect family/render/selected-Options evidence—all repaired; re-review found no
blocker, high, or medium issue. Commit `a469b4c` passed hosted CI run `31888143328`: `verify`
13:47:14–14:01:33Z, `check` 13:47:58–13:54:09Z, `validate:phase3fi` 13:54:09–14:01:26Z, and artifact
upload succeeded. Pages run `31888143474` passed: build 13:47:15–13:59:41Z, `check`
13:47:54–13:53:43Z, `validate:phase3fi` 13:53:43–13:59:35Z, deploy 13:59:46–13:59:54Z. A
cache-busted live response returned HTTP/2 200 MISS with `Last-Modified: Sat, 15 Aug 2026 13:59:51
GMT` and `assets/index-Vt-DMjm5.js` / `assets/index-DsY0wC-9.css`. An initial two-snapshot live
client trace captured expected texture loading; a longer cache-busted run reached ready in 4/4
snapshots with one canvas, 48 unique CardViews, idle `awaitingHandPlay`, 8/8/24/8 allocation, no
clipped/invalid/overlap diagnostics, and an inspected screenshot. Phase 3F-I is deployed,
live-verified, and accepted. iOS/WebKit perceived-pulse inspection remains supplemental.
The work remains presentation-only: Phase 5A owns ordered exact
achieved-yaku-card evidence in expanded result details.

`npm run validate:phase3fj` is the locally accepted flattened successor gate for the legal-destination
pulse. It retains the Phase 3F-I release-deck, technical-deck, interaction/runtime, Workshop,
density-review, and root/Pages checks while adding focused authoritative target/no-match decoration
coverage. After a selected Hand or Reveal source, legal Field targets pulse yellow-gold; no-match
instead pulses the actual Field and reads `NO MATCH · PLACE HERE`. The selected source remains solid
gold, and idle Hand/Reveal cues remain white. `npm run check` passed 52 ordinary test files / 477
tests, all 10,002 generated seeds, deck validation, and the 777-module build. `validate:phase3fj`
passed the 48/48 release deck, 100 technical artifacts, 11 focused files / 112 tests, Workshop, the
Phase 3D-D 14 root/Pages density viewports, and complete Root/Pages smoke through Bank/restart.
Target, no-match, Draw, Warm Ivory, reduced-landscape, and Pages screenshots under
`output/phase-3f-j/e2e/` were inspected. A first browser-harness attempt wrongly selected Field card
`april-cuckoo` as a Hand source; the real opening Hand source is `april-red-scroll`, whose target is
Field `april-cuckoo`. The follow-up assertion now correctly distinguishes the exact visual CardPlacement
ring from the intentionally partitioned semantic target hit territory. Terra independent review found
no blocker, high, or medium issue. The final bundled client completed three ready iterations with one
canvas, 48 unique CardViews, and no diagnostics. Commit `26828d4` passed CI run `31899208391`
(`verify`, 14m21s) and Pages run `31899208394` (build 12m29s; deploy 10s). The cache-busted live
response was HTTP/2 200 MISS, `Last-Modified: Sat, 15 Aug 2026 17:58:05 GMT`, with
`assets/index-61Vc__HL.js` and `assets/index-CTcqBr2T.css`; live JavaScript contains the exact new
visible and accessible no-match strings. Three live client iterations recorded loading `state-0`, then
ready `state-1`/`state-2`, one canvas, 48 unique CardViews, no clipped/invalid/overlap diagnostics,
and an inspected live screenshot. The hosted workflow emitted the Node 20 deprecation notice only;
it is nonblocking. Phase 3F-J and Phase 5A are deployed, live-verified, and accepted; Phase 5B is
next.

`npm run validate:phase5a` is the locally accepted flattened successor gate for full local 3/6/12 match
formats. It retains the Phase 3F-J release-deck, technical-deck, interaction/runtime, Workshop,
density-review, and Root/Pages production checks, then adds focused engine/protocol/fixture/web
coverage for trigger-time ordinary-Yaku evidence, public replay/projection validation, real match
advancement, concise-first result details, and rematch. Root and Pages artifacts are written under
`output/phase-5a/e2e/`. Focused target-browser Root and repository-prefixed Pages traces are accepted:
they reach a real Bank/result, expanded yaku gallery, short-landscape card-owned scrolling, real
three-round advancement/final restriction, and a distinct-deal rematch without state injection. Full
`npm run check` passed 52 files / 489 ordinary tests, all 10,002 deterministic seeds (3/6/12 = 3,334
each), deck validation, and the 778-module build. The final single `npm run validate:phase5a` passed
the 48/48 release deck, 100 technical artifacts, 17 files / 243 focused tests, Workshop, 14-viewport
density review, and full Root/Pages smoke through the retained interaction suites plus End-of-Play,
concise/expanded Bank, responsive scrolling, real three-round progression/final restriction, and a
distinct-deal rematch. Compact and expanded portrait/landscape artifacts were inspected; independent
Terra re-review found no blocker, high, or medium issue.

Phase 5A deployment record: implementation commit `945c2a3` passed CI run `31909040672` (`verify`,
19m40s) and Pages run `31909040671` (`build`, 17m34s; deploy, 10s); both `npm run check` and
`validate:phase5a` passed. The only annotation was the nonblocking Node 20 GitHub Actions deprecation.
A cache-busted live request returned HTTP/2 200 MISS with `Last-Modified: Sat, 15 Aug 2026 21:35:36
GMT` and `assets/index-DQO4OPuh.js`, which contains `See winning yaku & score`, `Start rematch`,
`completedYakuFormations`, and `ordinaryYaku`. After assets loaded, the live browser was `ready:true`
with one canvas, 48/48 unique CardViews, draw/reveal/player-Hand/opponent-Hand/field counts of
24/0/8/8/8, match length 3, idle `awaitingHandPlay`, no locks, and no clipped/invalid/overlap
diagnostics. [`shot-2.png`](output/phase-5a/live-ready/shot-2.png) was inspected and no error artifact
was produced. Phase 5A is deployed, live-verified, and accepted.

`npm run validate:phase5b` is locally complete and accepted for the strict private local IndexedDB
checkpoint boundary. It covers post-settlement autosave, exact decode and RNG provenance, Continue
plus recipient-safe Ready resume, corrupt Download/Delete/Start New recovery, decision,
round-complete, match-complete/rematch restoration, IndexedDB open denial and optimistic write
conflict, and Root/Pages accessibility/privacy evidence. `npm run check` passed 54 files / 513
ordinary tests, all 10,002 generated seeds (3/6/12 = 3,334 each), the 48/48 deck, and the
781-module production build. The final uninterrupted `npm run validate:phase5b` exited 0: 48/48
release deck, 100 technical artifacts, 17 files / 247 Phase 5A focused tests, Workshop, 14
Phase-3D-D Root/Pages viewports, full retained Root/Pages smoke through 3F/3B/End-of-Play/Bank/real
three-round rematch, 3 persistence files / 38 focused tests, and dedicated Root plus Pages
persistence smoke. The latter wrote 18 artifacts (nine per base) under `output/phase-5b/e2e/`.
Independent Terra review found no blocker, high, or medium issue. One transient density-harness
readiness timeout passed both an isolated rerun and the uninterrupted gate; the Pages click-readiness
harness repair retained all product assertions.

Phase 5B deployed in implementation commit `e10edba` and workflow-budget commit `b8ac977`. CI
`31917983898` was canceled solely by the inherited 30-minute job cap after `check` passed; the two
workflow timeout budgets were raised to 60 minutes without changing tests. Replacement CI
`31919222493` passed: verify 01:17:17–01:51:51 UTC (34m34s), check 01:17:52–01:23:20, validation
01:23:20–01:51:48, and artifact upload. Pages `31919222489` passed: build 01:17:37–01:52:44 UTC
(35m07s), validation 01:23:58–01:52:36, and deploy 01:52:48–01:52:56 (8s). A cache-busted live
HTTP/2 request returned 200 MISS, `Last-Modified: Sun, 16 Aug 2026 01:52:53 GMT`, with
`index-CSmLy86o.js` / `index-DRn1Xu7z.css` and the expected persistence markers. Three fresh live
browser iterations were `ready:true` with one canvas, 48 unique CardViews, 24/8/8/8 zones, idle
unlocked input with 16 semantic controls, approved `new-primary-deck`, and available idle persistence
with a saved round/month 1 checkpoint; the clean `shot-2` was visually inspected. Phase 5B is
deployed, live-verified, and accepted. Phase 6A is deployed, live-verified, and accepted. Phase 6B
is deployed, live-verified, and accepted. Next governed phase: Phase 6C.

Phase 6A is locally complete and accepted. It adds a deterministic session-only player-A human versus
player-B CPU mode for the existing 3/6/12 formats. The CPU receives only a
`PlayerObservationV1` and selects an already-issued legal action through one of three personalities;
the game continues to animate ordinary public events and never renders the CPU hand. Difficulty,
explanations, match-context adaptation, deterministic rollouts, online play, and CPU persistence are
not part of this subphase. Focused production Root and Pages CPU smoke both pass: every personality
uses a real human action followed by a normal public CPU event/animation sequence, with CPU privacy,
the `opponentTurn` lock, 1 canvas/48 CardViews, session-only persistence, and portrait/landscape
artifacts. `npm run check` passed format/lint/all workspace typechecks/decks, 58 files / 532 ordinary
tests, 10,002 deterministic seeds (3/6/12 = 3,334 each), and the 783-module production build.
`npm run validate:phase6a` passed unchanged: release deck 48/48, 100 technical artifacts, inherited
focused/runtime/Workshop/density/Root/Pages/persistence coverage, the two Phase 6A files / 16 tests,
360 complete AI trials in four 90-trial shards with zero illegal/no-action outcomes and directional
Bank/Koi metrics, and the dedicated Root/Pages CPU suites. All 26 Phase 6A PNGs and the bundled
client's one-canvas/48-CardView/no-diagnostics evidence were inspected; independent Terra final review
reported B0/H0. Implementation commit `9be2a78d1b26081dd174f55a825c9499057798b4` passed hosted CI
`31923716009`: verify 03:13:04Z–03:48:58Z (35m54s), check 03:13:47–03:19:22 (5m35s),
`validate:phase6a` 03:19:22–03:48:53 (29m31s), and artifact upload. Pages `31923716038` passed:
build 03:13:04–03:36:26 (23m22s), check 4m03s, validation 18m32s, and deploy 03:36:32–03:36:42
(Deploy 03:36:34–03:36:40). A cache-busted live HTTP/2 request returned 200 MISS with
`Last-Modified: 03:36:37Z` and `index-CsVf0PRK.js`; live HTML exposed the exact CPU selectors and
session-only/resume markers. Live browser verification selected Gambler, started a real CPU match,
played A's no-match Hand then Draw capture, observed `The Gambler is choosing a card`, locked
utilities, A face-up/B back-only hands, no console diagnostics, and an inspected screenshot. Phase 6A
is deployed, live-verified, and accepted. Phase 6B local acceptance is recorded below; rollout work
remains reserved for Phase 6C.

Phase 6B is deployed, live-verified, and accepted. It adds deterministic Easy, Standard (default), and Hard
heuristic settings across Timid, Monk, and Gambler, the six canonical public reason tokens, numeric
`[0,1]` confidence with UI bands, and public score/multiplier/round context. An explanation appears
only after its CPU action settles, remains private through every CPU-thinking substep, and is derived
from player-A-safe public information plus the now-public action/events; it is not hidden reasoning.
CPU matches remain session-only and Phase 6B adds no RNG, determinization, rollouts, online play, or
CPU saves.

`npm run check` passed 59 files / 539 ordinary tests, 10,002 seeded matches, the 48/48 release deck,
and the 783-module production build. The uninterrupted final `npm run validate:phase6b` exited 0:
17 inherited focused files / 247 tests, Workshop, 14 density viewports, full retained Root/Pages
Phase 5A, 3 persistence files / 38 tests plus dedicated Root/Pages, 2 Phase 6A focused files / 22
tests, 360 generated trials, Phase 6A Root/Pages, 3 Phase 6B focused files / 25 tests, 1,080 generated
trials, and Phase 6B Root/Pages. All 26 Phase 6B PNGs were visually inspected, including compact
portrait/landscape explanation banners and privacy artifacts. Independent review was B0/H0. The sole
late-suite navigation flake was repaired narrowly by waiting for navigation commit while retaining the
application-ready assertion, then revalidated. Implementation commit
`2a84ce143db29f9172590419f9b9492a22dbe643` passed hosted CI `31958387075`: verify
16:21:54–16:59:41Z (37m47s), check 16:22:38–16:28:14Z (5m36s), `validate:phase6b`
16:28:14–16:59:38Z (31m24s), and artifact upload 16:59:38–16:59:39Z; the only notice was Node 20
action deprecation. Pages `31958387069` passed: build 16:21:54–16:52:24Z (30m30s), check
16:22:32–16:27:50Z (5m18s), validation 16:27:50–16:52:18Z (24m28s), deploy job
16:52:29–16:52:39Z, and Deploy 16:52:31–16:52:37Z. A cache-busted live HTTP/2 request returned 200
MISS with `Last-Modified: 16:52:34Z`, `index-WMa9jsmo.js`, `index-D3Qe8KIR.css`, and the exact
difficulty/reason markers. Live Playwright observed Standard by default, then selected CPU Hard/Monk,
started a real 3-round match, played a human no-match Hand and Draw, and observed CPU settlement with
`{mode:cpu,cpuDifficulty:hard,cpuPersonality:monk,cpuDecision:{reason:denyVisibleThreat,confidence:measured},cpuTurnState:idle}`
and `Claims a visible threat · Measured`; console errors were zero and
`output/playwright/phase6b-live-monk-hard-390x844.png` was inspected. Phase 6B is deployed,
live-verified, and accepted; Phase 6C is next.

`npm run dev:workshop` starts the local-only 48-card Deck Workshop. `npm run build:deck` renders all
available sources into deterministic table/thumbnail derivatives plus the two required 48-slot
contact sheets. `npm run validate:phase2e` runs the technical Workshop/importer/production-exclusion
gate. `npm run validate:phase2e:release` verifies all 48 finished faces, the back, approved pilot,
and the exact digest-bound owner approval record. It now passes for `new-primary-deck` v1.0.0. The
Workshop and its write bridge remain absent from production/Pages.

## Workspace map

- `apps/web` — Vite/Pixi browser presentation.
- `packages/engine` — pure deterministic card, RNG, setup, turn, capture, and state domain.
- `packages/deck-format` — portable deck/Workshop/approval contracts plus the explicit Node raster-authoring CLI.
- `packages/protocol` — versioned shared contracts.
- `packages/test-fixtures` — deterministic fixture ownership.
- `functions` — reserved for the Phase 7 authoritative Firebase service.
- `docs` — product, rules, architecture, phase, and workflow authority.

Read `AGENTS.md` and `docs/PROJECT_MANIFEST.md` before implementation work. Architecture ownership is
summarized in `docs/ARCHITECTURE.md`.

## Deploy

The repository is hosted at
[`GeoDuckedup/KoiKoi4XRedux`](https://github.com/GeoDuckedup/KoiKoi4XRedux) and includes a GitHub
Pages workflow. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The
workflow derives the correct Vite base path from the repository name and deploys `apps/web/dist` only
after checks pass.

No Firebase project, credentials, database migration, or production domain is needed for this
subphase. The live page plays one authoritative browser-local round with the approved Primary Deck,
tap-only ordinary Hand/Draw interaction, public-event animation, private Player A/Player B handoff,
and an accessible recap. New round restarts the deterministic first-round slice; multi-round
persistence is deferred. The Deck Workshop remains local-only. Ink & Parchment is the default;
Moonlit Indigo and Warm Ivory are runtime-selectable in Options and persist locally. Additional
independent or inherited deck packages can be added without changing engine rules.
