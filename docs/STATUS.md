# KoiKoi4x Project Status

**Updated:** August 8, 2026

**Overall state:** Greenfield rewrite, Phase 0D implemented

**Runtime state:** Tested responsive PixiJS boot surface; no gameplay runtime yet

## Current result

Phase 0D establishes the deck-authoring contract without coupling artwork to canonical game identity.
The repository now contains a portable, versioned deck-format package; deterministic package
inheritance and normalized transforms; locked `ART_SPEC v1` constants; a complete logical 48-card
primary-deck skeleton; a generated SVG Art Guide; and four immutable technical pilot images.

The checked-in pilot images demonstrate source readability and processing only. They are not finished
art, visual direction, or an approved release deck. Phase 0D changes no browser presentation code, so
the live site correctly continues to show the Phase 0B boot surface.

## Phase 0D foundation now present

- `@koikoi4x/deck-format` with versioned deck, transform, and pilot types plus strict unknown-field
  runtime validation.
- Deterministic root-to-child inheritance with missing-parent/cycle rejection and per-card source and
  transform provenance.
- Canonical auto defaults (`cover`, focus `0.5 / 0.5`) and normalized Manual crop, zoom, and rotation
  projected consistently at multiple resolutions.
- Locked 5:8 art geometry, 1600×2560 preferred master, 1200×1920 warning threshold, 800×1280 release
  floor, 84%×88% safe area, sRGB/PNG preference, game-owned frame, and initial derivatives of
  640×1024 and 160×256.
- JSON Schemas generated under `packages/deck-format/schemas/` from the same contract constants.
- SVG Art Guide generated at `docs/generated/koikoi4x-art-guide-v1.svg` from the locked geometry.
- `decks/new-primary-deck/deck.json` maps all 48 exact canonical CardIds to unique intended source
  paths and supplies a required default card back.
- Four 1600×2560 technical pilot sources: dense `november-rain`, simple `september-sake-cup`, Bright
  `december-phoenix`, and Plain `january-pine-plain-a`.
- Digest-bearing pilot import plan with source dimensions and deterministic table/thumbnail transform
  plans; source files are never overwritten.
- CLI commands for development/release validation and deterministic artifact regeneration.
- Architecture guards prevent the engine from importing deck-format and prevent the portable
  deck-format core from importing Node, browser, PixiJS, or Firebase systems.

## Architecture decisions

- Canonical `CardId` remains owned by `packages/engine`; deck-format depends inward on it and the
  engine cannot depend on deck-format.
- Portable validation/resolution/transform code is separated from Node-only filesystem inspection,
  hashing, artifact generation, and the CLI.
- Inheritance merges root to child. Replacing a source retains the inherited transform unless the
  child explicitly supplies a replacement transform; explicit Auto mode is the reset operation.
- Development validation requires complete logical 48-card resolution but reads only the four pilot
  sources. Release validation requires all 48 sources and explicit Phase 2 pilot approval.
- Generated artifacts are reproducible outputs; immutable masters remain in each deck's `source/`
  directory.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`DECK_ART.md`](./DECK_ART.md), and
[`ADR 0002`](./adr/0002-phase-0d-deck-format.md).

## Validation

- `npm run validate:decks` passed: one package, exactly 48 resolved cards, 47 Auto / 1 Manual, zero
  inherited mappings. It emitted the expected development warning that 44 non-pilot source files
  remain unchecked.
- Phase 0D focused tests passed: 6 files / 26 tests covering Art Spec geometry, schema validation,
  strict unknown fields, missing/duplicate/cyclic package failures, inheritance/provenance, source
  inspection, deterministic Auto transforms, multi-resolution Manual transforms, and architecture
  boundaries, structural corrupt-image rejection, cross-file identity, and release approval gates.
- `npm run lint` passed with zero warnings.
- All five workspace TypeScript checks passed.
- Clean `npm ci` passed from the authoritative lockfile: 156 packages installed.
- `npm run check` passed after review repairs: formatting, zero-warning lint, all five typechecks,
  deck validation, 10 test files / 41 tests, and the 711-module production build.
- The generated SVG Art Guide and all four technical pilot PNGs were rendered and visually inspected
  for valid geometry and explicit placeholder labeling.
- Release validation is expected to fail until the other 44 finished sources and Phase 2 visual
  approval exist; this is a planned gate, not a Phase 0D defect.
- Independent read-only review found no remaining blocker, high, or medium issue after repairs to
  corrupt-image checks, schema/runtime path alignment, cross-file identity, release approval,
  generation preflight, and safe-area typing.
- Hosted CI and Pages evidence will be recorded after the Phase 0D push.

## Known constraints and risks

- There is no playable game yet; the visible runtime remains the boot surface.
- The pilot images are technical placeholders and must not be used as final visual approval.
- Raster derivative generation, both 48-card contact sheets, runtime deck loading/switching,
  CardView, and Deck Workshop are Phase 2 deliverables.
- The required real-board pilot check at 390×844 cannot occur until the Phase 2 board exists.
- Firebase, persistence, multiplayer, CPU play, and finished deck art remain intentionally absent.

## Owner verification and deployment steps

1. No manual asset upload, secret, Firebase setup, database migration, or Pages setting change is
   required.
2. After pulling the Phase 0D commit, run `npm ci`, `npm run validate:decks`, and `npm run check`.
3. Open `docs/generated/koikoi4x-art-guide-v1.svg` to inspect the locked authoring guides. The four
   PNGs in `decks/new-primary-deck/source/` are process placeholders only.
4. The push to `main` automatically runs CI and the existing GitHub Pages workflow. The public page
   should remain the same boot surface because Phase 0D adds no runtime UI.
5. Approve Phase 0D only as a technical authoring foundation; finished artwork and real phone-board
   visual approval are deferred by design.

## Next subphase

**Phase 1A — Deterministic headless state, seeded RNG, and deal foundation:** define the versioned
headless match/round state, deterministic seeded random source, 48-card shuffle/deal setup, invariant
validation, and repeatable fixtures with no rendering dependency. This is the first gameplay-domain
subphase and remains entirely test-driven/headless.
