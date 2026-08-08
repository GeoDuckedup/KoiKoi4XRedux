# AGENTS.md

Read `docs/PROJECT_MANIFEST.md` before substantial work.

For substantial implementation, follow `docs/AI_WORKFLOW.md`.

Core rules:

- The primary agent owns architecture, integration, and final verification.
- Use subagents proactively when they improve useful parallelism, context efficiency, review, or validation.
- Prefer parallel read-only investigation; serialize edits to tightly coupled systems.
- Give each subagent a bounded contract: objective, scope, read/edit permission, constraints, required evidence, and required return.
- Do not create agents merely to increase agent count.
- Use semantic roles first. Current routing baseline: Sol for primary/demanding ownership, Terra for engineering investigation/review, Luna for bounded/mechanical validation.
- If a preferred model is unavailable, use the closest supported configuration and continue.
- Run relevant tests/build/lint/typecheck and runtime/gameplay validation when possible.
- Never claim runtime validation from static inspection alone.
- For large changes, use an independent post-integration review when it materially improves confidence.
