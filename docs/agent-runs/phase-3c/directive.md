# Phase 3C Directive — Round-End Presentation

## Status

**Implemented and locally accepted.** Unit, integration, root/Pages browser, and independent-review
evidence is recorded. Hosted deployment and live verification remain pending until the release
revision is pushed.

## Objective

Deliver the dedicated, recipient-safe round-result experience: authoritative scoring breakdown and
animation, a durable round recap, and a clear next-round transition shell.

## Governing authority

1. [PROJECT_MANIFEST.md](../../PROJECT_MANIFEST.md)
2. [RULES.md](../../RULES.md) and approved rules decisions
3. Phase 3C in [DESIGN.md](../../DESIGN.md)
4. Phase 3C boundary in [PLAN.md](../../PLAN.md)
5. Relevant round lifecycle, projection, and Phase 3B boundary ADRs

## Boundaries

- Presentation consumes authoritative round results, observations, public events, and legal actions;
  it does not recalculate scoring, privilege, result reasons, or next-starter rules.
- Maintain recipient privacy: reveal automatic-result evidence only after committed public evidence
  allows it.
- Phase 3C does not add multi-round persistence, match formats, remote transport, or CPU behavior.
- The transition shell displays the authoritative next-round plan, then offers an explicitly named
  local-slice restart. It does not call `advanceRound` or label the restart as the next month.
- Preserve the Phase 3A/3B physical card-motion and no-full-board-rebuild constraints.

## Initial definition of done

The owner can complete a local round without developer controls, see an authoritative result and
score transition with a readable recap, acknowledge the next-round shell, and find all twelve
`PRES-RESULT-*` contracts covered by relevant unit and browser evidence. Hosted and live evidence
are the remaining release steps.
