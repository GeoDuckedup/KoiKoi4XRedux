# Agent-Run Ledger

`docs/agent-runs/` holds concise, durable operational records for substantial multi-agent phases.
It is an evidence ledger, not a transcript archive and not a replacement for
[AI_WORKFLOW.md](../AI_WORKFLOW.md).

Each phase directory contains:

| File | Purpose |
| --- | --- |
| `directive.md` | Scope, governing authority, boundaries, and definition of done. |
| `workstreams.yaml` | Dependency-aware, bounded agent contracts and ownership. |
| `decisions.md` | Sol architecture and integration decisions. |
| `findings.md` | Stable, evidence-backed findings and repair closure. |
| `verification.md` | Commands, results, browser/hosted/live evidence, and maturity. |
| `handoff.md` | Current phase summary, blockers, and next owner action. |

Use stable IDs such as `3C-UX` for workstreams and `F-3C-001` for findings. Update status and
evidence links as work advances. Keep raw private reasoning and full agent conversations out of the
repository.

