# KoiKoi4x Project Manifest

**Purpose:** Navigation and authority map for every substantial coding session.

## Authoritative documents

| Area | Authority |
|---|---|
| Product, UX, architecture, phases | `docs/DESIGN.md` |
| Canonical gameplay rules | `docs/RULES.md` |
| Approved rules/product decision log | `docs/RULES_DECISIONS.md` |
| Locked scenario/test vectors | `docs/TEST_VECTORS.md` |
| Canonical card identity and metadata | `docs/CARD_CATALOG.md` |
| Deck art/package/import workflow | `docs/DECK_ART.md` |
| Intentional differences from legacy | `docs/LEGACY_DIFFERENCES.md` |
| Runtime/package ownership boundaries | `docs/ARCHITECTURE.md` |
| AI coding/delegation workflow | `docs/AI_WORKFLOW.md` |
| Sol-led subagent operational tracking | `docs/SUBAGENT_PLAN.md` |
| Per-phase agent evidence ledgers | `docs/agent-runs/` |
| Current implementation plan | `docs/PLAN.md` |
| Current implementation status | `docs/STATUS.md` |
| Architectural decisions | `docs/adr/` |
| Agent operating instructions | `AGENTS.md` |

## Authority order

When documents conflict:

1. Explicit owner-approved canonical rule/decision.
2. Current `docs/RULES.md` and locked test vectors.
3. Current design document.
4. Accepted ADRs.
5. Current plan/status.
6. Legacy repository behavior only as historical evidence.

Never silently copy legacy behavior when an approved rewrite rule differs.

## Before substantial work

1. Read this manifest.
2. Determine which documents govern the requested change.
3. Read the relevant rules and acceptance criteria.
4. Read current plan/status.
5. Assess whether subagent delegation materially helps.
6. Preserve one clear implementation owner for tightly coupled systems.
7. Validate against governing acceptance criteria before completion.

## Project boundaries

- Greenfield repository.
- New Firebase project.
- No legacy save/import compatibility.
- Canonical card identity is separate from deck artwork.
- Mobile portrait is the primary interaction target.
- Desktop is a first-class responsive layout.
- Pure deterministic engine is independent from rendering/networking.
- CPU and clients may not access forbidden hidden information.
- Online opponent turns replay from semantic events.
