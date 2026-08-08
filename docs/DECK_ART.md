# KoiKoi4x Deck Art Package Specification

**Specification version:** 1.1  
**Package baseline:** KoiKoi4x design document 1.5  
**Status:** Authoring/import architecture and `ART_SPEC v1` approved. New deck production should use the locked geometry below.

---

# 1. Purpose

KoiKoi4x must support a completely new 48-card visual deck and additional visual deck packages without tying artwork to game rules.

The intended workflow is deliberately friendly to iterative art production:

- create or generate a high-resolution card image;
- assign it to a canonical KoiKoi4x card ID;
- let the importer fit/resize it automatically when possible;
- manually reposition/crop only cards that need intervention;
- rebuild optimized runtime textures non-destructively;
- visually review all 48 cards on a generated contact sheet;
- install/select multiple deck packages without changing engine code.

This specification applies to development/authored deck packages. Public user-uploaded decks are not required for the first release.

---

# 2. Non-negotiable architecture boundary

```text
Canonical rules/card data
        │
        │ CardId
        ▼
Deck package mapping
        │
        │ source art + normalized transforms
        ▼
Importer / derivative builder
        │
        │ generated manifest + runtime textures
        ▼
CardAssetManager / Pixi CardView
```

A canonical `CardId` represents game identity. Artwork packages never redefine:

- month;
- category;
- yaku membership;
- scoring;
- legal captures;
- multiplayer visibility;
- CPU knowledge.

The engine and network protocol must never use artwork filenames as card identity.

---

# 3. Package directory

Recommended development layout:

```text
decks/<deck-id>/
  deck.json
  source/
    <canonical-card-id>.png
    ...
    card-back.png
  transforms.json
  preview/
    thumbnail.png
    showcase.png
  generated/
    manifest.json
    cards/
      <canonical-card-id>.<runtime-format>
    backs/
      default.<runtime-format>
    thumbnails/
    contact-sheet.<runtime-format>
```

Rules:

- `source/` contains the best available original art and is never overwritten by the importer.
- `transforms.json` contains only authoring instructions/overrides.
- `generated/` contains reproducible derivatives and may be deleted/rebuilt.
- a package may use supported source formats such as PNG, JPEG, or WebP; the final accepted list should be locked in the implementation schema.
- file naming by canonical card ID is the preferred fast path, but the Workshop can assign nonconforming source filenames manually.

---

# 4. `deck.json`

Illustrative schema:

```json
{
  "formatVersion": 1,
  "id": "new-primary-deck",
  "name": "New Primary Deck",
  "author": "",
  "extends": null,
  "framePolicy": "game",
  "sourceDefaults": {
    "mode": "auto",
    "fit": "cover",
    "focusX": 0.5,
    "focusY": 0.5
  },
  "cards": {
    "january-crane": { "file": "source/january-crane.png" }
  },
  "backs": {
    "default": "source/card-back.png"
  },
  "preview": {
    "thumbnail": "preview/thumbnail.png",
    "featuredCardIds": [
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain"
    ]
  }
}
```

The real schema must be runtime-validated and versioned.

A standalone package defines all 48 card mappings. An inherited package may define only overrides, but resolution through its parent chain must still produce all 48.

---

# 5. Card identity mapping

## 5.1 Preferred workflow

Source filename stem equals canonical `CardId`:

```text
january-crane.png
march-curtain.webp
august-moon.jpg
```

The importer automatically assigns matching filenames.

## 5.2 Workshop assignment

The Deck Workshop must also allow:

- drag/drop or file selection into a specific canonical card slot;
- reassignment of an existing source image;
- replacement of one card without rebuilding package metadata by hand;
- clear missing/duplicate assignment warnings.

A single source file may not resolve to two required canonical card IDs unless a future explicit alias feature is introduced.

---

# 6. Automatic, manual, and mixed fitting

The mode is per card.

## 6.1 Automatic

The importer fits the source into the approved visible-art frame using package defaults.

Supported concepts should include:

- cover;
- contain where useful for special art;
- focal point;
- safe-area preview;
- source-resolution warnings.

Typical card:

```json
{
  "mode": "auto",
  "focusX": 0.5,
  "focusY": 0.42
}
```

## 6.2 Manual

A manually adjusted card stores a normalized crop/transform, not edited pixels.

Illustrative model:

```json
{
  "mode": "manual",
  "crop": {
    "x": 0.06,
    "y": 0.03,
    "width": 0.88,
    "height": 0.94
  },
  "zoom": 1.04,
  "rotationDeg": 0
}
```

Normalized coordinates make the transform independent from generated output resolution.

## 6.3 Mixed package

Mixed is the expected package workflow:

- package defaults apply automatically to most cards;
- only cards that look wrong receive manual overrides;
- changing output resolution does not require redoing those overrides.

The validator should report counts, e.g. `43 auto / 5 manual`.

---

# 7. Approved `ART_SPEC v1`

The following physical art specification is canonical for the first KoiKoi4x release. Deck packages may change artwork and cosmetic styling, but they may not change card geometry.

## 7.1 Geometry

- **Outer card aspect ratio:** `5:8` portrait.
- **Source visible-art aspect ratio:** `5:8` portrait, full bleed.
- **Preferred source/master dimensions:** `1600 × 2560 px` or larger at the same aspect ratio.
- **Recommended-quality floor:** `1200 × 1920 px`.
- **Release minimum:** `800 × 1280 px`.
- Sources below `1200 × 1920` generate a quality warning.
- Sources below `800 × 1280` are release-blocking by default unless an explicit owner-approved exception is documented for that card.
- Larger masters are allowed and should remain unmodified in `source/`.

No deck package may override the 5:8 physical card ratio, hitbox geometry, corner geometry, or logical card size in v1.

## 7.2 Full-bleed source policy

Source face art should extend through the complete 5:8 source rectangle. Do not bake a required physical border, corner radius, selection state, month label, category label, or gameplay UI into the source image.

Background textures, foliage, sky, patterns, and other noncritical art may extend off the final visible edge. The importer may crop excess source material according to Auto or Manual transform metadata.

## 7.3 Critical-subject safe area

The authoring guide must show a centered safe area equal to:

- **84% of card width**; and
- **88% of card height**.

Equivalent margins are approximately:

- `8%` on the left and right; and
- `6%` on the top and bottom.

Important faces, animals, symbolic objects, primary flowers, readable markings, and other composition-critical elements should normally remain inside this safe area. Background and decorative content may extend through the bleed.

The safe area is an authoring aid, not a mandatory crop. The Workshop may warn when a focal point or manually defined critical subject approaches the safe-area boundary, but it must never silently alter the art.

## 7.4 Color and alpha

- **Authoring color space:** sRGB.
- **Preferred source format:** PNG.
- JPEG and WebP may be accepted by the importer when valid.
- Alpha/transparency may be supported for intentional artwork, but normal face art should not depend on transparency to create the physical card boundary; the game owns the mask/frame.
- The importer must normalize orientation metadata and reject unreadable/corrupt inputs.

## 7.5 Default automatic fit

The package default is:

```json
{
  "mode": "auto",
  "fit": "cover",
  "focusX": 0.5,
  "focusY": 0.5
}
```

`cover + normalized focal point` is the canonical automatic fitting model. The system must be deterministic and predictable. AI/object-detection cropping is not required for v1.

A focal point may be adjusted without switching to full Manual mode when the source needs simple recentering.

## 7.6 Runtime derivatives

Initial derivative targets are:

- **table/full card texture:** `640 × 1024 px`;
- **thumbnail:** `160 × 256 px`;
- **contact-sheet/gameplay preview derivatives:** generated from the same normalized transform pipeline.

An optional `1280 × 2048 px` inspection derivative may be added only if measurement on real card-inspection UI shows that the `640 × 1024` derivative is visibly insufficient. Do not generate the larger derivative by default without that evidence.

Runtime file format remains an implementation measurement decision: compare browser decode support, quality, package size, and load behavior using real finished card art before locking WebP/AVIF or another production format.

The preferred master is never replaced by a runtime derivative.

## 7.7 Game-controlled frame geometry

For v1:

- the game owns the outer 5:8 card silhouette;
- the game owns corner rounding/masking;
- the game owns the physical hitbox;
- the game owns shadow/elevation;
- the game owns selection, legal-target, disabled, hover/focus, and multiplier-related interaction effects;
- the game owns beginner/accessibility overlays;
- deck packages may not alter physical frame geometry.

Use an initial visual frame/border thickness of approximately **3% of card width** as the design starting point. This value may be tuned during the phone-board visual prototype without changing the outer 5:8 geometry or source-art transform contract.

A future cosmetic frame-skin feature may allow a deck to change frame color/texture/material while preserving the exact same geometry. Package-specific card ratios, hitboxes, or corner geometry are out of scope for v1.

## 7.8 Art template

Phase 0D must generate or define a reusable **KoiKoi4x Art Template** based on this specification. The template must show:

- `1600 × 2560` preferred source canvas;
- full-bleed boundary;
- exact 5:8 final card boundary;
- 84% × 88% critical-subject safe area;
- approximate game-frame overlay;
- labels explaining which guides are informational versus cropped/masked.

The Deck Workshop should provide **Export Art Guide** so the guide is generated from the actual locked configuration rather than maintained as an unrelated manual graphic.

## 7.9 Four-card pilot gate

Before the new primary deck is treated as ready for 48-card bulk visual approval, create and test at least four representative finished source cards:

1. one visually dense composition;
2. one visually simple composition;
3. one Bright with a large focal subject;
4. one Plain card representative of the lower-value collection.

Process all four through the real importer and preview them:

- at full inspection size;
- in the Workshop's portrait-phone card-size preview; and
- in the `390 × 844` primary mobile board layout as soon as the Phase 2 board skeleton can display real cards.

If the four-card pilot exposes readability or geometry problems, revise `ART_SPEC` before producing or approving the remainder of the primary set. Once the pilot is approved, the 5:8 geometry should be considered locked for v1.

---

# 8. Game-controlled card frame

The approved v1 frame policy is `game`.

- source artwork supplies full-bleed illustration/content;
- the game supplies outer frame/border geometry;
- the game supplies corner rounding/masking;
- the game supplies selection glow, legal-target effects, shadow/elevation, disabled state, and interaction feedback;
- beginner/accessibility labels remain game overlays;
- source artwork should not bake in required month/category UI labels;
- deck packages cannot override physical frame geometry in v1.

This guarantees consistent interactions and lets one art set be used at different display sizes.

A versioned `framePolicy` field may remain in the schema for forward compatibility, but the only shipping v1 physical-frame policy is game-controlled geometry.

---

# 9. Inheritance

An optional `extends` field supports partial variants:

```json
{
  "formatVersion": 1,
  "id": "new-primary-winter",
  "extends": "new-primary-deck",
  "cards": {
    "december-phoenix": { "file": "source/december-phoenix.png" }
  }
}
```

Requirements:

- inheritance chains are deterministic;
- cycles are rejected;
- a child can replace card art, transforms, card back, or package preview metadata according to explicit merge rules;
- canonical game metadata cannot be overridden by a visual package;
- the validator reports the resolved source/package provenance of each card;
- release validation checks the fully resolved 48-card package.

---

# 10. Card backs

Each resolved package has at least one default card back.

The opponent hand uses only the local player's selected package/back. Multiplayer does not synchronize the opponent's cosmetic choice.

Future additional back variants may be supported as local cosmetic preferences without changing the deck face package or game state.

---

# 11. Runtime derivatives

The importer/builder should be able to generate:

- `640 × 1024` normalized table/full card face textures;
- `160 × 256` thumbnails;
- art-review contact sheet;
- gameplay-size contact sheet;
- card-back derivative(s);
- package preview derivative(s);
- optional `1280 × 2048` inspection textures only if measured UI quality requires them;
- optional atlas/bundle output if profiling shows it is beneficial;
- a generated resolved runtime manifest.

The exact compressed runtime image format remains measurement-driven. Output geometry is defined by `ART_SPEC v1` and must be generated from immutable masters plus normalized transform metadata.

---

# 12. Deck Workshop

The development-only Workshop is a required authoring surface.

## 12.1 Grid

Show 48 canonical card slots grouped January through December, each with status such as:

- complete-auto;
- complete-manual;
- inherited;
- warning;
- missing;
- invalid.

## 12.2 Card editor

Selecting a slot should provide:

- original source preview;
- exact game-frame preview;
- portrait-phone-size preview;
- larger inspection preview;
- Auto/Manual mode;
- fit strategy;
- drag-to-reposition;
- zoom;
- focal point;
- optional rotation;
- reset-to-default;
- reset-to-parent/inherited art where applicable;
- save transform override.

## 12.3 Package actions

- validate package;
- auto-assign canonical filenames;
- rebuild selected card;
- rebuild full package;
- generate both art-review and gameplay-size contact sheets;
- export the current Art Guide/template;
- open generated output location in development where supported;
- show errors/warnings with affected card IDs.

The Workshop must call the same transform/import library used by automated builds. It must not implement a visually similar but mathematically different crop algorithm.

---

# 13. Contact sheets and visual approval

Every candidate release deck must generate **two** review artifacts containing all 48 processed card faces in canonical month order.

## 13.1 Art-review contact sheet

Use a comfortably large card size so reviewers can judge:

- composition;
- crop and focal placement;
- assignment accuracy;
- safe-area use;
- color/brightness consistency;
- illustration consistency;
- obvious source-quality defects.

## 13.2 Gameplay-size contact sheet

Render each card at approximately the size it commonly occupies in the primary `390 × 844` portrait-phone board layout. This sheet is specifically intended to expose:

- artwork that becomes unreadable when small;
- focal subjects that disappear at gameplay size;
- excessive fine detail;
- visually indistinguishable cards;
- frame/art interactions that consume too much usable image area.

The exact CSS-equivalent preview size may evolve with the responsive board layout, but the sheet must use the same card geometry and transform pipeline as the real game.

## 13.3 Approval gate

A deck is not considered visually approved until:

1. the art-review contact sheet has been reviewed;
2. the gameplay-size contact sheet has been reviewed;
3. the validator has no release-blocking errors; and
4. representative cards have been checked in the real portrait board.

---

# 14. Validation severity

## Release-blocking errors

- missing resolved canonical card;
- duplicate canonical assignment;
- corrupt/unreadable source required by resolution;
- source below `800 × 1280` release minimum without an approved exception;
- invalid transform values;
- inheritance cycle;
- missing card back;
- package ID/version/schema failure;
- generated runtime manifest cannot resolve all 48 cards.

## Warnings

- source below `1200 × 1920` recommended-quality floor but at or above `800 × 1280`;
- focal subject approaches safe-area limit;
- large source with excessive generated size/cost;
- optional preview asset missing;
- package uses unusually many manual overrides.

Warnings should not silently alter artwork.

---

# 15. Multiple deck packages and runtime switching

Installed packages are local presentation choices.

Switching packages:

```text
CardView(cardId = august-moon)
     ↓
old package texture removed
     ↓
new package texture resolved for august-moon
```

No engine state changes.

No save migration.

No network command changes.

No replay changes.

Two online players may see entirely different visual decks while the authoritative match references the same canonical IDs.

---

# 16. Beginner/accessibility overlays

Card artwork must not be the only source for card interpretation.

The presentation layer can independently add:

- month name/number;
- flower name;
- category label;
- selected state;
- legal target state;
- yaku relevance/progress;
- card name and accessible description.

This is especially important because the new art set may deliberately reinterpret traditional imagery.

---

# 17. Required tests

At minimum:

- schema accepts a valid complete package;
- missing canonical ID fails;
- duplicate canonical mapping fails;
- parent inheritance resolves to complete 48-card coverage;
- inheritance cycle fails;
- auto transform produces deterministic metadata/output for identical input;
- saved manual normalized transform reproduces the same composition at two generated resolutions;
- replacing one source file rebuilds only the intended card logically;
- card-back requirement enforced;
- generated manifest resolves every canonical ID;
- runtime switch between two packages leaves engine state byte-for-byte/structurally unchanged;
- multiplayer/public event payloads do not contain deck package IDs or texture filenames unless purely local telemetry explicitly records a cosmetic choice.

---

# 18. Phase placement

## Phase 0C

Lock canonical card IDs independent from art.

## Phase 0D

Lock package schema, transform schema, inheritance, validator, and `ART_SPEC v1`. Produce/export the 5:8 Art Guide and prepare the four-card pilot. The spec may be used for art production immediately, but final bulk-deck visual approval waits for the four-card pilot's real `390 × 844` board check in Phase 2.

Phase 0D implementation paths:

- portable contract and resolver: `packages/deck-format/src/`;
- versioned JSON Schemas: `packages/deck-format/schemas/`;
- generated Art Guide: `docs/generated/koikoi4x-art-guide-v1.svg`;
- complete logical skeleton and immutable technical pilots: `decks/new-primary-deck/`;
- validation: `npm run validate:decks`;
- deterministic regeneration: `npm run generate:deck-artifacts`.

The four checked-in pilot images are explicitly technical process placeholders, not approved visual
direction or finished card art. They prove input readability, geometry, hashing, transform planning,
and immutable-source handling. The real board, Workshop, contact-sheet, and visual-approval checks
remain Phase 2 gates.

## Phase 2B

Implement runtime resolved-package loading and CardView texture resolution.

## Phase 2E

Implement Deck Workshop/importer UI, dual contact sheets, Art Guide export, and demonstrate at least two packages. Validate the four-card pilot in the 390 × 844 board layout.

This deliberately places art tooling before the one-round vertical slice is treated as visually mature, so production of the new deck can proceed alongside rendering work rather than becoming a late manual conversion task.

---

# 19. Initial author workflow

```text
1. Create one source card at high resolution.
2. Name it with the canonical CardId or assign it in Workshop.
3. Import using Auto.
4. Inspect phone-size and full-size preview.
5. If Auto is correct, leave it untouched.
6. If not, switch only that card to Manual.
7. Drag/zoom/focus until correct and save normalized transform.
8. Repeat while creating cards.
9. Periodically generate both 48-card contact sheets.
10. Run validator.
11. Fix only warnings/errors worth addressing.
12. Build runtime package.
13. Select the package in game and verify several dense-board/capture layouts.
```

The desired outcome is that producing a second visual deck later is an art/content workflow, not a new rendering project.
