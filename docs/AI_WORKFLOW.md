# KoiKoi4x AI Coding Workflow

**Workflow baseline:** August 8, 2026  
**Purpose:** Permanent operating policy for Codex-assisted engineering in the KoiKoi4x repository.

## 1. Governing principle

Use multi-agent decomposition when it improves useful parallelism, context efficiency, verification, or quality. The objective is not maximum agent count.

The primary agent is always accountable for the final implementation.

## 2. Semantic agent roles

### Primary / Orchestrator

Owns requirement interpretation, governing-document selection, architecture, cross-system decisions, implementation ownership for tightly coupled systems, reconciliation of delegated findings, combined diff review, final validation, and definition of done.

**Routing baseline:** `gpt-5.6-sol`, generally High reasoning.

Use stronger reasoning only when breadth or ambiguity materially justifies it.

### Engineering Investigator / Reviewer

Use for bounded work requiring engineering judgment:

- gameplay/state/event execution tracing;
- bug and regression investigation;
- architectural implications;
- controls/physics/AI interactions;
- UI/rendering/presentation review;
- performance-sensitive analysis;
- meaningful test design;
- privacy/security review;
- independent post-implementation review.

**Routing baseline:** `gpt-5.6-terra`, generally Medium or High reasoning.

### Bounded Worker / Validator

Use for narrow, explicit, repeatable, high-volume, or mechanical work:

- repository/file mapping;
- searches and inventories;
- locating constants/configuration/call sites;
- asset/reference audits;
- edge-case enumeration;
- coverage inventories;
- documentation consistency checks;
- analyzing build/test/lint/typecheck results;
- repetitive edits with clear ownership boundaries.

**Routing baseline:** `gpt-5.6-luna`, generally Low or Medium reasoning.

## 3. Model-routing durability

Model names are a dated operating baseline, not a permanent dependency.

If a preferred model is unavailable, retired, or superseded:

1. preserve the semantic role;
2. select the closest available configuration;
3. continue useful delegation;
4. briefly report the routing limitation in the subphase result.

Do not confuse model variants with reasoning effort.

## 4. Delegation decision

Before substantial work, determine whether the task benefits from subagents.

Good reasons include independent system investigations, meaningful regression surface, separable review/testing, large repository scans, asset/data inventory, or independent verification.

Poor reasons include tiny tasks, tightly coupled work that cannot be split cleanly, setup cost exceeding benefit, or several agents needing to edit the same core files.

## 5. Default concurrency rule

> **Parallelize discovery; serialize integration.**

Parallel read-only investigation is preferred.

Avoid concurrent agents editing the same files or tightly coupled systems. For genuinely independent write-heavy tasks, use isolated worktrees when supported.

## 6. Required subagent contract

Every delegated task must specify:

- **Objective:** exact question or output.
- **Scope:** relevant systems/files.
- **Mode:** read-only or edit.
- **Constraints:** rules/architecture that cannot change.
- **Evidence:** tests, traces, references, runtime observations, or other proof required.
- **Return:** exact result format expected.

Example:

```text
Objective:
Find every engine path that can produce multiple new yaku during one phase.

Scope:
packages/engine/src/rules/
packages/engine/src/events/
packages/engine/tests/

Mode:
READ ONLY.

Constraints:
Preserve the canonical one-Yaku-Decision-per-phase rule.

Evidence:
Identify functions and fixture IDs.

Return:
1. relevant paths
2. current behavior
3. missing tests
4. contradictions
```

## 7. Game-development decomposition menu

For substantial features/fixes, consider only the roles that matter:

- gameplay/system behavior;
- rules/state/event architecture;
- codebase/dependency mapping;
- controls/physics/AI;
- rendering/UI/UX/player feedback;
- assets/data/content;
- persistence/telemetry/platform;
- multiplayer/privacy/security;
- performance;
- automated tests/regressions;
- runtime/build/playtesting.

Do not instantiate every role automatically.

## 8. Required execution loop

```text
understand
→ read PROJECT_MANIFEST and governing specs
→ decompose
→ parallel investigate where useful
→ primary implementation owner integrates
→ inspect combined diff
→ test/build/lint/typecheck
→ run/playtest when possible
→ independent review when warranted
→ repair
→ final verification
→ update STATUS/PLAN/ADRs as required
```

## 9. Verification requirements

The primary agent must inspect the combined diff, verify architectural consistency, run relevant automated checks, perform runtime/gameplay validation when possible, repair failures, check adjacent regressions, and verify the original acceptance criteria.

For large changes, use an independent reviewer after integration.

## 10. Reporting

Every substantial subphase report must include:

- scope completed;
- files changed;
- architectural decisions;
- delegation used and contracts;
- tests/checks and exact results;
- runtime/playtest evidence when available;
- independent review result when used;
- known limitations;
- exact user verification steps;
- recommended next subphase.

Never claim runtime validation when only static inspection occurred.

## 11. KoiKoi4x ownership guidance

Keep primary ownership with the orchestrator for:

- canonical rules changes;
- core state machine;
- event semantics;
- hidden-information boundaries;
- multiplayer authority;
- cross-system architectural changes.

Terra is especially appropriate for:

- tracing implications of proposed rules changes;
- reviewing opponent-turn replay and privacy;
- examining Pixi event sequencing;
- regression review of engine changes;
- performance review.

Luna is especially appropriate for:

- 48-card asset inventories;
- manifest/package validation;
- call-site maps;
- test-vector coverage checks;
- expected-file and CardId verification;
- build/lint/typecheck output validation;
- documentation consistency.

## 12. Strongest orchestration modes

Do not require maximum orchestration for normal subphases.

Use the strongest orchestration/reasoning modes only for unusually broad audits, major architectural transitions, or tasks that genuinely divide into several meaningful parallel components.
