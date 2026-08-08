# KoiKoi4x Implementation Plan

**Plan version:** 1.0  
**Updated:** August 8, 2026  
**Current gate:** Phase 0B owner review

This file tracks the currently approved implementation sequence. [`DESIGN.md`](./DESIGN.md) contains the complete product plan; this file is the concise handoff for the next coding session.

## Phase protocol

- Complete one approved subphase at a time.
- Read [`PROJECT_MANIFEST.md`](./PROJECT_MANIFEST.md) and the governing specifications before substantial work.
- Preserve one clear implementation owner for rules, state, event semantics, hidden information, multiplayer authority, and other tightly coupled systems.
- Parallelize independent investigation when useful; serialize coupled integration.
- Validate against the subphase acceptance gate before recommending the next subphase.
- End every subphase report with scope, files, decisions, exact validation results, limitations, user verification/deployment steps, and the next recommended subphase.
- Never describe static inspection, compilation, or documentation review as runtime gameplay validation.

## Phase 0 — Rule lock and foundation

### Phase 0A — Canonical rules decision log

Status: **completed and owner-approved**.

Deliverables:

- concise canonical rules and terminology;
- approved decision log;
- exact spec-level test vectors and decision coverage matrix;
- intentional differences from legacy behavior;
- repository authority and AI workflow documents;
- durable phase plan, status, and progress records.

Gate:

- R-001 through R-014 are represented without unresolved engine decisions;
- every special rule maps to named fixture coverage;
- owner confirms the transcription faithfully reflects approved rules.

### Phase 0B — New repository scaffold

Status: **implemented; awaiting owner review**.

Deliver:

- initialize the repository and workspace/package structure;
- strict TypeScript configuration;
- Vite web app with PixiJS boot screen;
- Vitest, Playwright, ESLint, Prettier, and locked dependency installation;
- GitHub Actions for typecheck, lint, format check, tests, build, and smoke E2E;
- boundary checks preventing engine imports from browser/Pixi/Firebase systems;
- root README and the initial `.codex/agents/` specialist definitions;
- `window.render_game_to_text`, deterministic `window.advanceTime(ms)`, and fullscreen behavior on the boot surface so the web-game test loop exists from the scaffold onward.

Gate:

- clean install, typecheck, lint, format check, unit test, production build, and Playwright smoke test pass;
- generated screenshot and text state are inspected;
- no legacy runtime code is copied.

Result:

- `npm ci` and the complete format/lint/typecheck/unit/build chain pass;
- Playwright smoke coverage passes at all five baseline viewports, including fullscreen and browser
  error checks;
- the bundled web-game client passes and its canvas/text artifacts were inspected;
- the Pages repository-base build was verified;
- independent acceptance review found no remaining implementation blocker after status records were
  updated.

### Phase 0C — Canonical card catalog

Status: **next after Phase 0B approval**.

Deliver descriptive stable CardIds, all 48 card records, metadata/yaku flags, catalog validation, and CardId-bound versions of the Phase 0A vectors.

Gate: exactly 48 unique cards, four per month, correct Sake Cup/Rain flags, and no artwork fields in domain types.

### Phase 0D — Deck package and art specification foundation

Deliver versioned package/transform schemas, inheritance, validation, `ART_SPEC v1` constants, immutable-source workflow, primary-deck skeleton, generated Art Guide, and dense/simple/Bright/Plain pilot inputs.

Gate: resolved 48-card coverage, deterministic normalized transforms, validation failures for missing/duplicate/cyclic packages, and pilot readiness.

## Later phases

1. **Phase 1 — Headless engine:** deterministic state/RNG/deal, capture phases, yaku triggers, round/match rules, projections, visibility, and replay.
2. **Phase 2 — Rendering foundation:** responsive Pixi table, persistent cards, deck-package runtime, AnimationDirector, input, and Deck Workshop.
3. **Phase 3 — One-round vertical slice:** complete playable local round and presentation.
4. **Phase 4 — Onboarding:** tutorial director, Learn in 60 Seconds, contextual help, and rulebook.
5. **Phase 5 — Full local product:** 3/6/12-round formats, persistence, and pass-and-play.
6. **Phase 6 — CPU opponents:** observation-only heuristic/difficulty/personality and deterministic rollout tuning.
7. **Phase 7 — Firebase backend:** new project/emulators, authoritative service, projections, and turn publication.
8. **Phase 8 — Online client:** invite/current-games flow, confirmed commands, opponent-turn replay, and transitions.
9. **Phase 9 — Production polish:** content, accessibility, performance, telemetry/reliability, and release.

No later phase may bypass the acceptance gate of the preceding phase.
