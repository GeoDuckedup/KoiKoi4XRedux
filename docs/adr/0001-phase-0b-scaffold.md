# ADR 0001: Phase 0B scaffold choices

**Status:** Accepted  
**Date:** August 8, 2026

## Decision

Use npm workspaces, strict TypeScript 6.0.3, Vite 8, and PixiJS 8 without a component framework.
Keep the headless engine, shared protocol, test fixtures, browser app, and future Firebase functions
in explicit ownership boundaries. Use Vitest for pure checks and a direct Playwright script for the
Phase 0B runtime smoke test.

TypeScript 6.0.3 is the newest stable release inside the current `typescript-eslint` peer range.
GitHub Pages receives its repository-relative base path from CI because the final repository name is
still an approved nonblocking decision. Firebase installation is deferred to its planned phase.

## Consequences

- The lockfile is authoritative and CI uses `npm ci`.
- Engine source compiles without DOM libraries and rejects PixiJS/Firebase/web-app imports.
- The boot surface establishes deterministic browser diagnostics before gameplay exists.
- A later framework or backend choice requires an explicit architecture decision rather than entering
  through the scaffold implicitly.
