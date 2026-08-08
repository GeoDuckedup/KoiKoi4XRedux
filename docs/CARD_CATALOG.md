# KoiKoi4x Canonical Card Catalog

**Catalog version:** 1.0  
**Locked:** August 8, 2026  
**Authority:** Artwork-independent card identity and metadata

This catalog names every card used by the deterministic engine. [`RULES.md`](./RULES.md) remains the
authority for gameplay behavior; this document is the human-readable counterpart of the validated
catalog in `packages/engine/src/cards/catalog.ts`.

## CardId contract

Every `CardId` is stable lowercase kebab-case in the form
`<english-month>-<stable-subject-or-role>`. IDs describe card identity, never a particular image.

Duplicate-looking Plain cards use stable `-a`, `-b`, or `-c` ordinals. Those ordinals distinguish
physical cards without creating a rule difference. They must not be renamed, swapped, or inferred
from catalog position later.

Legacy short IDs such as `1a` are not canonical. Art packages map their own source files and
transforms to the IDs below; filenames, paths, crops, textures, package IDs, and coordinates are not
card-domain metadata.

## Month catalog

| Month | Flower | Canonical cards |
|---:|---|---|
| 1 — January | Pine | `january-crane`, `january-red-text-scroll`, `january-pine-plain-a`, `january-pine-plain-b` |
| 2 — February | Plum Blossom | `february-bush-warbler`, `february-red-text-scroll`, `february-plum-plain-a`, `february-plum-plain-b` |
| 3 — March | Cherry Blossom | `march-curtain`, `march-red-text-scroll`, `march-cherry-plain-a`, `march-cherry-plain-b` |
| 4 — April | Wisteria | `april-cuckoo`, `april-red-scroll`, `april-wisteria-plain-a`, `april-wisteria-plain-b` |
| 5 — May | Iris | `may-bridge`, `may-red-scroll`, `may-iris-plain-a`, `may-iris-plain-b` |
| 6 — June | Peony | `june-butterfly`, `june-blue-scroll`, `june-peony-plain-a`, `june-peony-plain-b` |
| 7 — July | Bush Clover | `july-boar`, `july-red-scroll`, `july-bush-clover-plain-a`, `july-bush-clover-plain-b` |
| 8 — August | Pampas Grass | `august-moon`, `august-geese`, `august-pampas-plain-a`, `august-pampas-plain-b` |
| 9 — September | Chrysanthemum | `september-sake-cup`, `september-blue-scroll`, `september-chrysanthemum-plain-a`, `september-chrysanthemum-plain-b` |
| 10 — October | Maple | `october-deer`, `october-blue-scroll`, `october-maple-plain-a`, `october-maple-plain-b` |
| 11 — November | Willow | `november-rain`, `november-swallow`, `november-red-scroll`, `november-willow-plain` |
| 12 — December | Paulownia | `december-phoenix`, `december-paulownia-plain-a`, `december-paulownia-plain-b`, `december-paulownia-plain-c` |

## Complete metadata

`redText`, `red`, and `blue` distinguish Scroll subtypes. Fixed-yaku memberships list only named
card-specific sets; category thresholds and Current-Month Set are derived dynamically.

| CardId | Display name | Month | Category | Scroll kind | Flags | Fixed-yaku memberships |
|---|---|---:|---|---|---|---|
| `january-crane` | Crane | 1 | Bright | — | — | — |
| `january-red-text-scroll` | Red Text Scroll | 1 | Scroll | `redText` | — | `redTextScrolls` |
| `january-pine-plain-a` | Pine Plain A | 1 | Plain | — | — | — |
| `january-pine-plain-b` | Pine Plain B | 1 | Plain | — | — | — |
| `february-bush-warbler` | Bush Warbler | 2 | Animal | — | — | — |
| `february-red-text-scroll` | Red Text Scroll | 2 | Scroll | `redText` | — | `redTextScrolls` |
| `february-plum-plain-a` | Plum Plain A | 2 | Plain | — | — | — |
| `february-plum-plain-b` | Plum Plain B | 2 | Plain | — | — | — |
| `march-curtain` | Cherry Curtain | 3 | Bright | — | — | `blossomViewing` |
| `march-red-text-scroll` | Red Text Scroll | 3 | Scroll | `redText` | — | `redTextScrolls` |
| `march-cherry-plain-a` | Cherry Plain A | 3 | Plain | — | — | — |
| `march-cherry-plain-b` | Cherry Plain B | 3 | Plain | — | — | — |
| `april-cuckoo` | Cuckoo | 4 | Animal | — | — | — |
| `april-red-scroll` | Red Scroll | 4 | Scroll | `red` | — | — |
| `april-wisteria-plain-a` | Wisteria Plain A | 4 | Plain | — | — | — |
| `april-wisteria-plain-b` | Wisteria Plain B | 4 | Plain | — | — | — |
| `may-bridge` | Iris Bridge | 5 | Animal | — | — | — |
| `may-red-scroll` | Red Scroll | 5 | Scroll | `red` | — | — |
| `may-iris-plain-a` | Iris Plain A | 5 | Plain | — | — | — |
| `may-iris-plain-b` | Iris Plain B | 5 | Plain | — | — | — |
| `june-butterfly` | Butterfly | 6 | Animal | — | — | `animalTrio` |
| `june-blue-scroll` | Blue Scroll | 6 | Scroll | `blue` | — | `blueScrolls` |
| `june-peony-plain-a` | Peony Plain A | 6 | Plain | — | — | — |
| `june-peony-plain-b` | Peony Plain B | 6 | Plain | — | — | — |
| `july-boar` | Boar | 7 | Animal | — | — | `animalTrio` |
| `july-red-scroll` | Red Scroll | 7 | Scroll | `red` | — | — |
| `july-bush-clover-plain-a` | Bush Clover Plain A | 7 | Plain | — | — | — |
| `july-bush-clover-plain-b` | Bush Clover Plain B | 7 | Plain | — | — | — |
| `august-moon` | Moon | 8 | Bright | — | — | `moonViewing` |
| `august-geese` | Geese | 8 | Animal | — | — | — |
| `august-pampas-plain-a` | Pampas Plain A | 8 | Plain | — | — | — |
| `august-pampas-plain-b` | Pampas Plain B | 8 | Plain | — | — | — |
| `september-sake-cup` | Sake Cup | 9 | Animal | — | `sakeCup` | `blossomViewing`, `moonViewing` |
| `september-blue-scroll` | Blue Scroll | 9 | Scroll | `blue` | — | `blueScrolls` |
| `september-chrysanthemum-plain-a` | Chrysanthemum Plain A | 9 | Plain | — | — | — |
| `september-chrysanthemum-plain-b` | Chrysanthemum Plain B | 9 | Plain | — | — | — |
| `october-deer` | Deer | 10 | Animal | — | — | `animalTrio` |
| `october-blue-scroll` | Blue Scroll | 10 | Scroll | `blue` | — | `blueScrolls` |
| `october-maple-plain-a` | Maple Plain A | 10 | Plain | — | — | — |
| `october-maple-plain-b` | Maple Plain B | 10 | Plain | — | — | — |
| `november-rain` | Rain Bright | 11 | Bright | — | `rainBright` | — |
| `november-swallow` | Swallow | 11 | Animal | — | — | — |
| `november-red-scroll` | Red Scroll | 11 | Scroll | `red` | — | — |
| `november-willow-plain` | Willow Plain | 11 | Plain | — | — | — |
| `december-phoenix` | Phoenix | 12 | Bright | — | — | — |
| `december-paulownia-plain-a` | Paulownia Plain A | 12 | Plain | — | — | — |
| `december-paulownia-plain-b` | Paulownia Plain B | 12 | Plain | — | — | — |
| `december-paulownia-plain-c` | Paulownia Plain C | 12 | Plain | — | — | — |

## Locked invariants

- Exactly 48 unique IDs and four cards per month.
- Exactly 5 Brights, 9 Animals, 10 Scrolls, and 24 Plains.
- Exactly 3 Red Text, 4 ordinary Red, and 3 Blue Scrolls.
- `september-sake-cup` is the only `sakeCup` card and is Animal only.
- `november-rain` is the only `rainBright` card and is Bright.
- Named fixed-yaku memberships match [`RULES.md`](./RULES.md) exactly.
- Catalog and records are frozen; catalog order remains month 1 through 12.
- Only domain metadata keys are accepted by the catalog validator.

Run `npm run validate:cards` to validate the catalog and Phase 0A CardId bindings.
