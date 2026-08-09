import { isCardId, type CardId } from "@koikoi4x/engine";

import type { DeckValidationIssue } from "./types.ts";

export const DECK_APPROVAL_FORMAT_VERSION = 1 as const;

export interface DeckApprovalV1 {
  readonly artReviewSha256: string;
  readonly approvedBy: string;
  readonly approvedOn: string;
  readonly boardReview: Readonly<{
    cardIds: readonly CardId[];
    note: string;
    viewport: "390x844";
  }>;
  readonly formatVersion: typeof DECK_APPROVAL_FORMAT_VERSION;
  readonly gameplayReviewSha256: string;
  readonly packageId: string;
  readonly status: "approved";
}

const approvalKeys = new Set([
  "formatVersion",
  "packageId",
  "status",
  "approvedBy",
  "approvedOn",
  "artReviewSha256",
  "gameplayReviewSha256",
  "boardReview",
]);
const boardKeys = new Set(["viewport", "cardIds", "note"]);
const packageIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const digestPattern = /^[a-f0-9]{64}$/u;

function issue(code: string, path: string, message: string): DeckValidationIssue {
  return Object.freeze({ severity: "error", code, path, message });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function exactDataKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: DeckValidationIssue[],
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      issues.push(issue("UNKNOWN_APPROVAL_FIELD", `${path}.${String(key)}`, String(key)));
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
      issues.push(
        issue("APPROVAL_FIELD_SHAPE", `${path}.${key}`, "Expected an enumerable data field."),
      );
    }
  }
}

function isDenseDataArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some(
      (key) => typeof key === "symbol" || (key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key)),
    )
  ) {
    return false;
  }
  return Array.from({ length: value.length }, (_, index) => index).every((index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    return descriptor !== undefined && descriptor.enumerable === true && "value" in descriptor;
  });
}

function isRealIsoDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  );
}

export function validateDeckApprovalV1(
  value: unknown,
  expected?: Readonly<{
    artReviewSha256: string;
    gameplayReviewSha256: string;
    packageId: string;
    pilotCardIds: readonly CardId[];
  }>,
): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  if (!isPlainRecord(value)) return [issue("APPROVAL_RECORD", "$", "Approval must be an object.")];
  exactDataKeys(value, approvalKeys, "$", issues);
  if (value.formatVersion !== DECK_APPROVAL_FORMAT_VERSION) {
    issues.push(issue("APPROVAL_VERSION", "$.formatVersion", "Only approval v1 is accepted."));
  }
  if (typeof value.packageId !== "string" || !packageIdPattern.test(value.packageId)) {
    issues.push(issue("APPROVAL_PACKAGE_ID", "$.packageId", "Invalid package ID."));
  }
  if (value.status !== "approved") {
    issues.push(issue("APPROVAL_STATUS", "$.status", "Status must be approved."));
  }
  if (typeof value.approvedBy !== "string" || value.approvedBy.trim().length === 0) {
    issues.push(issue("APPROVAL_REVIEWER", "$.approvedBy", "Reviewer is required."));
  }
  const approvedOn = value.approvedOn;
  if (typeof approvedOn !== "string" || !isRealIsoDate(approvedOn)) {
    issues.push(issue("APPROVAL_DATE", "$.approvedOn", "Use YYYY-MM-DD."));
  }
  for (const field of ["artReviewSha256", "gameplayReviewSha256"] as const) {
    if (typeof value[field] !== "string" || !digestPattern.test(value[field])) {
      issues.push(issue("APPROVAL_DIGEST", `$.${field}`, "Expected lowercase SHA-256."));
    }
  }
  if (!isPlainRecord(value.boardReview)) {
    issues.push(issue("APPROVAL_BOARD_REVIEW", "$.boardReview", "Board review is required."));
  } else {
    exactDataKeys(value.boardReview, boardKeys, "$.boardReview", issues);
    if (value.boardReview.viewport !== "390x844") {
      issues.push(issue("APPROVAL_VIEWPORT", "$.boardReview.viewport", "Must be 390x844."));
    }
    if (
      !isDenseDataArray(value.boardReview.cardIds) ||
      value.boardReview.cardIds.length !== 4 ||
      value.boardReview.cardIds.some((cardId) => typeof cardId !== "string" || !isCardId(cardId)) ||
      new Set(value.boardReview.cardIds).size !== 4
    ) {
      issues.push(
        issue(
          "APPROVAL_PILOT_CARDS",
          "$.boardReview.cardIds",
          "Board review must name four unique canonical pilot cards.",
        ),
      );
    }
    if (typeof value.boardReview.note !== "string" || value.boardReview.note.trim().length === 0) {
      issues.push(issue("APPROVAL_BOARD_NOTE", "$.boardReview.note", "Review note is required."));
    }
  }
  if (expected !== undefined) {
    if (value.packageId !== expected.packageId) {
      issues.push(issue("APPROVAL_PACKAGE_MISMATCH", "$.packageId", expected.packageId));
    }
    if (value.artReviewSha256 !== expected.artReviewSha256) {
      issues.push(issue("APPROVAL_ART_SHEET_STALE", "$.artReviewSha256", "Digest is stale."));
    }
    if (value.gameplayReviewSha256 !== expected.gameplayReviewSha256) {
      issues.push(
        issue("APPROVAL_GAMEPLAY_SHEET_STALE", "$.gameplayReviewSha256", "Digest is stale."),
      );
    }
    if (isPlainRecord(value.boardReview) && Array.isArray(value.boardReview.cardIds)) {
      const actual = [...value.boardReview.cardIds].sort();
      const expectedCards = [...expected.pilotCardIds].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expectedCards)) {
        issues.push(
          issue("APPROVAL_PILOT_MISMATCH", "$.boardReview.cardIds", "Pilot cards do not match."),
        );
      }
    }
  }
  return Object.freeze(issues);
}
