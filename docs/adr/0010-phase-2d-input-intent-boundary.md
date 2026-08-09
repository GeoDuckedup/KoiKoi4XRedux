# ADR 0010: Phase 2D input intent and accessibility boundary

**Status:** Accepted

**Date:** August 9, 2026

## Context

Phase 2D needs pointer and keyboard input before the browser owns a real local-match store or an
online command transport. The engine already exposes recipient-scoped `PlayerObservationV1` values
and legal actions. Presentation code must not construct authoritative state, execute rules, invent
capture targets, or manufacture idempotency command IDs.

## Decision

- A pure presentation-owned controller consumes one injected player observation, its legal actions,
  trusted public confirmation hints, confirmation mode, and external presentation locks.
- The controller emits an immutable `InputCommandIntentV1` containing match, actor, expected state
  version, and the selected legal action. It never calls `applyGameplayCommand`, advances RNG, or
  mutates an observation.
- Guided mode requires explicit confirmation for a single legal Hand action. Fast mode emits a
  single legal Hand action immediately. Both modes require explicit selection when multiple legal
  capture targets exist.
- Draw choices and Bank/Koi-Koi choices are rendered only from current legal actions. After one
  intent, input remains locked until a newer observation replaces the source.
- Pixi renders transient selection/focus/target highlights without changing the Phase 2C trusted
  card projection. An absolutely positioned semantic DOM overlay owns pointer and keyboard input,
  roving focus, card labels, selection state, and legal-action descriptions.
- Animation, deck loading, opponent turns, remote replay, disconnection, and round transitions lock
  input and clear stale selection.
- The current browser harness uses explicitly labeled technical input fixtures and reports emitted
  intents only in diagnostics. It is not a real match, a privacy-safe recipient feed, or command
  execution.
- Optional drag input is deferred. Tap/click and keyboard input are complete, and any future drag
  path must resolve to the same legal intent contract.

## Consequences

- Phase 3 can replace the technical fixture with a real observation-to-presentation adapter without
  moving rule authority into Pixi or DOM code.
- Phase 7 can turn an accepted intent into an authenticated, idempotent command envelope and assign
  `commandId`; Phase 2D deliberately cannot.
- Hidden opponent hands and future draw order remain outside the semantic input surface. The fixture
  allocation is development-only and may not be serialized as a player observation.
- Duplicate taps cannot execute twice: one intent locks the controller until a new state version is
  observed.
