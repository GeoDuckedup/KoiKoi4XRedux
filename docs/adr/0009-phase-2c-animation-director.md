# ADR 0009: Phase 2C semantic animation and interruption boundary

**Status:** Accepted

**Date:** August 9, 2026

## Decision

Keep animation wholly presentation-owned. A pure event planner accepts only projected public
semantic events plus a trusted recipient-safe presentation projection before and after every event.
Events choose the animation language and ordering; projections choose card identities, zones,
faces, and the exact final board. The planner never infers capture rules, legality, yaku, hidden
cards, or commands from Pixi coordinates.

Use one deterministic FIFO `AnimationDirector`. It owns display and target projections separately,
advances only through an injected millisecond delta, and has no Pixi ticker, timer, clock, random
source, engine transition, or gameplay command. The browser may drive it with `requestAnimationFrame`;
`window.advanceTime(ms)` disables that driver and advances the same director manually for exact
tests. Every plan starts at the current queued target, preventing batches from interleaving.

Provide four policies over the same clip plan: Normal, Fast, Instant, and Reduced Motion. Fast uses
fixed shorter durations. Instant preserves semantic settlement without travel or waits. Reduced
Motion caps clips at 100 milliseconds and uses short fades/emphasis at the destination instead of
large travel. Every mode must settle to the byte-equivalent target projection.

The first accelerate request raises the active playback rate; a second deliberate request finishes
the queue. `finishImmediately()` settles every queued target in FIFO order. `cancelAndSnapTo()`
clears all queued work and synchronously applies an explicit trusted projection. Cancellation,
finish, and destruction resolve pending playback without allowing a stale frame to write later.

CardViews remain the Phase 2B persistent objects. A moving view is temporarily rendered in
`EffectsLayer` as `transit`, then reparents to the target layer at settlement. Flip travel keeps the
drawn card back visible until the dedicated midpoint flip. Card geometry is cached when unchanged.
A live resize recomputes the in-flight source/target geometry at the same normalized progress;
switching decks replaces only current face/back textures and leaves queue/progress/identity intact.

Install a labeled technical animation harness with Hand-to-Field, Pair Capture, Draw/Reveal,
Four-Card Sweep, and Koi-Koi feedback scenarios. It exercises semantic public-event shapes and
complete frozen projections, but it is not an engine match, replay record, privacy-safe player
observation, or gameplay input source. Its concrete opponent-hand and draw identities remain local
technical fixture data. A future projection adapter must use opaque backs/counts for identities the
recipient is not allowed to know.

## Consequences

- Confirmed authoritative/projected state is never mutated by animation.
- Rendering cannot create gameplay outcomes by moving sprites.
- Network replay, local play, skip, reduced motion, resize, and deck selection share one settlement
  contract.
- Queue diagnostics expose only plan/clip status, counts, modes, progress, and projection
  fingerprints; they do not expose engine state, raw commands, RNG, texture URLs, or future order.
- Phase 2D can add selection/target/keyboard input without moving command authority into the
  renderer.
