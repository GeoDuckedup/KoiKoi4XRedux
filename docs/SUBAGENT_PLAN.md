# KoiKoi4x Sol-Led Subagent Plan

**Purpose:** Operational tracking for Sol-led multi-agent delivery. This document supplements, and
does not replace, the governing policy in [AI_WORKFLOW.md](AI_WORKFLOW.md).

## Accountability and routing

Sol is the technical director. Sol owns requirement interpretation, architecture, cross-system
decisions, integration, combined-diff review, final verification, deployment, and the definition of
done. Delegation supplies evidence and bounded changes; it never transfers accountability.

Route work by the difficulty of the decision, rather than its size:

| Role | Default routing | Use for |
| --- | --- | --- |
| Sol | Primary/orchestrator | Ambiguity, architecture, integration, conflicts, difficult bugs, final judgment |
| Terra | Engineering investigator, implementer, or reviewer | Bounded engineering, tracing, tests, UI, performance, and independent review |
| Luna | Bounded worker or validator | Inventories, mechanical checks, coverage maps, and documentation consistency |

If a preferred model is unavailable, retain the semantic role and choose the closest supported
configuration. Record the substitution in the workstream entry.

## Delivery lifecycle

```text
governing documents and acceptance criteria
  → Sol decomposition and dependency graph
  → parallel read-only discovery
  → Sol synthesis and architecture decision
  → bounded, non-overlapping implementation
  → Sol integration and combined-diff inspection
  → independent review
  → repair and regression validation
  → hosted deployment and live verification
```

Parallelize discovery. Serialize edits to the same files, tightly coupled state/event systems, and
integration surfaces. Use an isolated worktree for independent write-heavy work when supported.

## Workstream contract

Each row in `docs/agent-runs/<phase>/workstreams.yaml` is a durable contract. It must include:

- stable workstream ID and concise objective;
- role, model/configuration if material, and `read_only` or `edit` mode;
- read scope and explicit allowed write scope;
- governing documents, constraints, and dependencies;
- acceptance IDs and required validation/evidence;
- status, owner, reviewer, and stopping or escalation criteria;
- links to findings, repairs, tests, screenshots, CI runs, or deployment evidence.

An agent may not expand its write scope without Sol approval. A workstream is not complete merely
because its assigned code compiles: it must provide the requested evidence and handoff.

## Dependency graph

Maintain a small directed acyclic graph in each phase ledger. Dependencies answer both “what must be
decided first?” and “what can run in parallel?” Typical shape:

```text
architecture + rules mapping
        ↓
bounded implementation ──→ integration
                              ↓
                      independent review
                              ↓
                   repair / final validation
```

Do not create a workstream merely to fill a role. Create one only when it has independent, useful
output, a bounded scope, and an objectively inspectable deliverable.

## Finding and repair records

Record findings in `findings.md`, not in unstructured chat alone. Each record uses a stable ID and
contains:

```text
ID: F-<phase>-<number>
Status: open | accepted | repaired | verified | declined
Severity: blocker | high | medium | low | note
Requirement: acceptance ID(s) or governing section
Owner: workstream ID
Evidence: path/line, test, trace, screenshot, or hosted run
Impact: concise player, rules, privacy, or lifecycle consequence
Repair: linked change or decision
Verification: exact test or runtime evidence after repair
```

Record only decisions, observable findings, evidence, repairs, and outcomes. Do not store private
chain-of-thought, raw hidden reasoning, or full conversation transcripts.

## Evidence maturity

Use the following ordered levels in the ledger. A higher level does not erase the need for relevant
lower-level checks.

| Level | Meaning |
| --- | --- |
| `specified` | Governing requirement and acceptance criteria are identified. |
| `implemented` | The intended change exists and Sol has inspected its integration point. |
| `unit` | Focused automated checks cover the behavior. |
| `integration` | Combined systems and regression checks pass. |
| `browser` | Real browser/gameplay behavior is exercised and inspected. |
| `hosted` | CI and deployment workflow complete successfully. |
| `deployed` | The target host serves the release revision. |
| `live` | The deployed experience is independently exercised or inspected. |

Do not describe a result as runtime-validated from static inspection, or as deployed from a successful
local build.

## Communication and handoffs

Agents return a concise structured handoff: changed files, decisions/finding IDs, evidence with exact
commands/results, remaining risks, and any decision required from Sol. Sol updates the ledger after
synthesis, records architecture decisions separately when warranted, and reports user-facing progress
in terms of completed scope, evidence, deployment steps, and the next subphase.

## Conflict resolution and escalation

Sol resolves contradictory findings using governing-document authority, executable evidence, and the
smallest change that preserves architectural boundaries. Escalate to Sol immediately for:

- a rules, privacy, event-semantics, or scoring-authority question;
- overlapping write scope or a dependency not represented in the graph;
- a failing acceptance criterion or regression with no bounded repair;
- a player-experience tradeoff that specifications do not decide; or
- three unsuccessful repair attempts on the same root cause.

Escalate to the owner only when a decision changes approved product behavior, expands scope
materially, or needs new external authority.

## Definition of done

Sol may close a subphase only when the governing acceptance criteria are mapped, implementation is
integrated, the combined diff has been inspected, relevant automated and runtime checks have passed,
material independent review findings are repaired or explicitly accepted, hosted deployment is
verified when the subphase is released, and the ledger contains evidence for the final claim.

