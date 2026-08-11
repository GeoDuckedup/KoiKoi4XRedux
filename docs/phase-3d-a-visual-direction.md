# Phase 3D-A — Visual Direction Review

**Status:** direction family owner-approved; production integration pending

**Evidence maturity:** local browser review

**Production default:** unchanged until Phase 3D-C integration

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

These are visual-composition review builds, not playable staging builds. The old toolbar is
deliberately hidden before its replacement interaction cues exist, so completing a full round is
not a Phase 3D-A acceptance goal. Normal production play remains on the accepted Phase 3C shell.

The production Phase 3D options menu will expose A, B, and C as runtime themes. Ink & Parchment is
the default; theme selection changes presentation tokens only and never card identity, legal
actions, rules, or authoritative state. Persistence and the accessible menu control are Phase 3D-C
work rather than a build-time environment switch.

## Interaction and field findings

The audit confirmed that the existing authority boundary is sound: browser input is still derived
from `PlayerObservationV1` and legal actions, and coordinates never decide a capture. The next slice
must preserve that boundary while improving the presentation cues.

- Exact-two matches already support the desired tap-hand-card, highlight-legal-matches,
  tap-target flow.
- Unique matches and three-card sweeps currently enter Guided confirmation without highlighting the
  cards that will be captured. This is a real presentation gap, not a rules gap.
- A no-match play currently uses the generic Confirm button and does not preview a field placement.
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

The gate executes the focused visual-direction, interaction, and layout tests, builds every review
direction, and captures ten real-browser screenshots under
`output/phase-3d-a/visual-directions/`. The required web-game client also captured Direction A at
`output/phase-3d-a/web-game-client/` with an authoritative text snapshot.

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
