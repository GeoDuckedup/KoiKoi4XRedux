import { getCardDefinition } from "@koikoi4x/engine";

import type { DeckPackageV1, DeckPilotV1, DeckValidationIssue, PilotRole } from "./types.ts";
import { validateDeckPilotDefinition } from "./validation.ts";

const EXPECTED_PILOT_IDS: Readonly<Record<PilotRole, string>> = Object.freeze({
  dense: "november-rain",
  simple: "september-sake-cup",
  brightLargeFocal: "december-phoenix",
  plain: "january-pine-plain-a",
});

export function validatePilotReadiness(
  pilot: DeckPilotV1,
  packageDefinition: DeckPackageV1,
): readonly DeckValidationIssue[] {
  const issues = [...validateDeckPilotDefinition(pilot)];
  if (pilot.packageId !== packageDefinition.id) {
    issues.push(
      Object.freeze({
        severity: "error" as const,
        code: "PILOT_PACKAGE",
        path: "$.packageId",
        message: "Pilot packageId must match deck.json.",
      }),
    );
  }

  for (const assignment of pilot.cards) {
    if (assignment.cardId !== EXPECTED_PILOT_IDS[assignment.role]) {
      issues.push(
        Object.freeze({
          severity: "error" as const,
          code: "PILOT_ROLE_BINDING",
          path: assignment.role,
          message: `${assignment.role} is locked to ${EXPECTED_PILOT_IDS[assignment.role]}.`,
        }),
      );
    }
    if (packageDefinition.cards[assignment.cardId] === undefined) {
      issues.push(
        Object.freeze({
          severity: "error" as const,
          code: "PILOT_SOURCE_MAPPING",
          path: assignment.cardId,
          message: "Pilot card needs a local source mapping.",
        }),
      );
    }
  }

  const bright = pilot.cards.find((entry) => entry.role === "brightLargeFocal");
  if (bright !== undefined && getCardDefinition(bright.cardId).category !== "bright") {
    issues.push(
      Object.freeze({
        severity: "error" as const,
        code: "PILOT_BRIGHT_CATEGORY",
        path: bright.cardId,
        message: "Large-focal pilot card must be a Bright.",
      }),
    );
  }
  const plain = pilot.cards.find((entry) => entry.role === "plain");
  if (plain !== undefined && getCardDefinition(plain.cardId).category !== "plain") {
    issues.push(
      Object.freeze({
        severity: "error" as const,
        code: "PILOT_PLAIN_CATEGORY",
        path: plain.cardId,
        message: "Plain pilot card must be Plain.",
      }),
    );
  }

  return Object.freeze(issues);
}

export function validatePilotReleaseApproval(
  pilot: DeckPilotV1 | null,
): readonly DeckValidationIssue[] {
  if (pilot === null) {
    return Object.freeze([
      Object.freeze({
        severity: "error" as const,
        code: "PILOT_REQUIRED",
        path: "pilot.json",
        message: "Release validation requires an explicit Phase 2 pilot approval manifest.",
      }),
    ]);
  }
  if (pilot.approvalStatus !== "approved") {
    return Object.freeze([
      Object.freeze({
        severity: "error" as const,
        code: "PILOT_NOT_APPROVED",
        path: "$.approvalStatus",
        message: "Release validation requires Phase 2 pilot board approval.",
      }),
    ]);
  }
  return Object.freeze([]);
}

export { EXPECTED_PILOT_IDS };
