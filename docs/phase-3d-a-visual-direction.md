# Phase 3D-A — Visual Direction Review

**Status:** direction family owner-approved and integrated by Phase 3D-C

**Evidence maturity:** local browser review

**Production default:** Ink & Parchment

Phase 3D-A answers one question before the interaction and dense-field work begins: what visual
hierarchy and palette should the playable table use? It deliberately does not rewrite game rules,
input authority, card layout, or the deployed default.

## Review directions

| ID  | Direction       | Character                                                                                            | Assessment                                                                                                 |
| --- | --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A   | Ink & Parchment | Deep ink-green table, warm parchment text, restrained vermilion escalation, pale green legal targets | **Recommended default.** Best separation from the approved dark card art and the calmest mobile hierarchy. |
| B   | Moonlit Indigo  | Cool navy table, brass accents, cyan legal targets                                                   | Approved alternate. Modern, cool, and high-contrast.                                                       |
| C   | Warm Ivory      | Cream table and panels, bold brown outlines, orange selection, and slate-blue guidance               | Approved direction inspired by the original game's calming, bold, simple palette—not its organization.     |

All three review builds collapse the always-visible advanced toolbar, reduce Yaku progress to one
compact line per player, retain only the latest recap item, reserve red for escalation/selection,
and render the ordinary `1×` multiplier as neutral rather than dangerous.

Phase 3D-C now exposes A, B, and C as runtime themes in the production Options dialog. Ink &
Parchment is the default; theme selection changes presentation tokens only and never card identity,
legal actions, rules, or authoritative state. The compact production shell replaces the old
build-time review-only hiding behavior.

## Interaction and field findings

The audit confirmed that the existing authority boundary is sound: browser input is still derived
from `PlayerObservationV1` and legal actions, and coordinates never decide a capture. The next slice
must preserve that boundary while improving the presentation cues.

- Exact-two matches already support the desired tap-hand-card, highlight-legal-matches,
  tap-target flow.
- Phase 3D-B resolved the identified unique-match, sweep, and no-match presentation gaps with
  engine-owned public resolution previews and direct Guided field/card activation.
- Field overflow currently fans cards diagonally above the eight base slots. Phase 3D will replace
  that with an adaptive grid that shrinks cards while keeping every field card individually legible
  and selectable.
- The current rules imply a high-confidence playable-field bound of 17 cards. Layout acceptance
  will therefore cover 8, 9, 12, and 17 cards across supported phone, landscape, tablet, and desktop
  sizes rather than relying on an eight-card assumption.

## Evidence

Run:

```sh
npm run validate:phase3da
```

The gate executes focused visual-direction, interaction, and layout tests, builds production once,
selects every theme through the real Options dialog, and captures six selected-state mobile/desktop
screenshots under `output/phase-3d-a/visual-directions/`.

## Next slices

1. **Phase 3D-B — Interaction cues:** select a hand card, highlight every rule-authoritative match,
   tap a legal target when choice exists, and show truthful unique/sweep/no-match previews.
2. **Phase 3D-C — Decluttered production shell:** apply Ink & Parchment by default, add the
   accessible three-theme options control, move secondary controls into that menu, and keep critical
   turn/Yaku/result information near the table.
3. **Phase 3D-D — Adaptive dense field:** replace overflow fanning with deterministic shrink-to-fit
   grids through 17 cards, then harden animation, pointer, keyboard, and accessibility behavior.

Phase 4 onboarding follows these table-clarity slices so its guidance teaches the final interaction
model instead of a temporary one. Alternate themes, decorative texture, sound, and final production
effects remain Phase 9 polish.
