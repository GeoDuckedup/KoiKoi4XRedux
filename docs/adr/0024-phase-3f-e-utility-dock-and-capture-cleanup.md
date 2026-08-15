# ADR 0024 — Phase 3F-E utility dock and capture cleanup

**Status:** Locally accepted and validated; deployment pending

## Context

The simplified table needs stable, unobtrusive access to the complete public recap, a rules reference,
and existing table settings. The current capture gallery also makes some card faces read as overly
tall, while routine card/count labels repeat information already communicated by the board.

## Decision

- Place exactly three ordinary utility controls in the bottom-safe row, left to right: **History**,
  **Yaku Guide**, and **Options**.
- Make History and Yaku Guide read-only modal dialog surfaces. They follow the existing Options and
  capture-dialog focus/critical-lock policy, do not mutate game state, and do not restore inline
  recap chrome.
- Yaku Guide documents the closed thirteen-yaku canonical ruleset with short explanations and example
  images. It is a reference, not onboarding, a score calculator, a current-table hint system, or
  authoritative end-of-play evidence.
- Render capture gallery faces at the same 5:8 proportion as table cards with a clearly light frame.
  Gallery data remains the existing public capture projection and active deck face URL source.
- Remove only redundant routine labels: hand count/points suffixes, zero capture counts, and the
  standalone Reveal label. Preserve semantic controls and accessible names.

## Consequences

- The table remains more legible without changing engine/legal-action, projection, score, animation,
  or persistent-CardView authority.
- Dialog focus and accessibility become explicit browser-gate responsibilities, along with exact dock
  order and reference completeness.
- Ordered cards that substantiate an actual scored yaku are not reconstructed here. Phase 5A owns that
  exact public result evidence and its order of formation.

## Local acceptance evidence

- `npm run check` passed format, lint, all workspace typechecks, deck validation, 47 files / 444
  ordinary tests, all 10,002 deterministic generated matches, and the 772-module production build.
- `npm run validate:phase3fe` passed the approved 48/48 release deck, 100 technical artifacts, 6
  focused files / 79 tests, Workshop, the 14-viewport root/Pages density review, and full root/Pages
  production smoke.
- The bundled web-game skill client reached ready state with one canvas and 48 persistent CardViews.
  The 390×844 Guide/capture screenshots and 844×390 dock screenshot were visually inspected.
- Independent Terra review initially reported two medium findings: all-theme light-frame evidence was
  incomplete, and the utility mutual-exclusion guard omitted Options. The repair introduced a clearly
  light card-frame token across all themes, complete one-dialog-at-a-time guards, and corresponding
  browser assertions. Post-repair review reports no blocker, high, or medium finding.
- This evidence is local. Commit/push, hosted CI, Pages deployment, and cache-busted live verification
  remain before deployed/live acceptance.

## Owner verification and deployment steps

1. At phone portrait, landscape, and desktop widths, verify the bottom row reads **History**, **Yaku
   Guide**, **Options** from left to right and remains outside active card play.
2. Open each utility and press Escape. The appropriate trigger should regain focus; opening a utility
   must not change the hand, field, score, or pending decision.
3. Verify Yaku Guide lists all thirteen yaku with a visible example image and concise explanation.
   It should explain rules, not tell the player what currently matches.
4. Capture cards should stay proportioned like normal Hanafuda cards with light borders. Routine hand
   number suffixes, capture zeros, Reveal label, and an inline recap should be absent.
5. Local checks are complete. Commit and push the closure; pushing `main` runs CI and Pages. Verify
   those hosted runs and inspect the cache-busted live page before declaring deployed/live acceptance.

## Next subphase

**Phase 5A full local match formats** owns 3/6/12-round progression, recap/rematch, and ordered
yaku-card evidence in expanded end-of-play details.
