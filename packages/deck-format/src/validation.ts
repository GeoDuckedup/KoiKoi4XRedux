import { CARD_IDS, isCardId, type CardId } from "@koikoi4x/engine";

import { ART_SPEC_V1 } from "./art-spec.ts";
import {
  DECK_FORMAT_VERSION,
  PILOT_FORMAT_VERSION,
  TRANSFORM_FORMAT_VERSION,
  type AutoTransform,
  type CardTransform,
  type DeckPackageV1,
  type DeckPilotV1,
  type DeckTransformsV1,
  type DeckValidationIssue,
  type ValidationSeverity,
} from "./types.ts";

const packageKeys = new Set([
  "formatVersion",
  "id",
  "version",
  "name",
  "author",
  "license",
  "extends",
  "framePolicy",
  "sourceDefaults",
  "cards",
  "backs",
  "preview",
  "qualityExceptions",
]);
const cardMappingKeys = new Set(["file"]);
const previewKeys = new Set(["thumbnail", "showcase", "featuredCardIds"]);
const exceptionKeys = new Set(["allowBelowReleaseMinimum", "approvedBy", "approvedOn", "reason"]);
const transformFileKeys = new Set(["formatVersion", "packageId", "cards"]);
const autoTransformKeys = new Set(["mode", "fit", "focusX", "focusY"]);
const manualTransformKeys = new Set(["mode", "crop", "zoom", "rotationDeg"]);
const cropKeys = new Set(["x", "y", "width", "height"]);
const pilotKeys = new Set(["formatVersion", "packageId", "cards", "approvalStatus"]);
const pilotCardKeys = new Set(["role", "cardId", "rationale"]);
const pilotRoles = new Set(["dense", "simple", "brightLargeFocal", "plain"]);
const packageIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(
  severity: ValidationSeverity,
  code: string,
  path: string,
  message: string,
): DeckValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: DeckValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(issue("error", "UNKNOWN_FIELD", `${path}.${key}`, `Unsupported field ${key}.`));
    }
  }
}

function isNormalized(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateAssetPath(
  value: unknown,
  path: string,
  requiredRoot: "source" | "preview",
  issues: DeckValidationIssue[],
): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push(issue("error", "ASSET_PATH", path, "Asset path must be a nonempty string."));
    return;
  }
  const unsafe =
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.split("/").some((part) => part === ".." || part === "." || part.length === 0) ||
    /^[a-z][a-z0-9+.-]*:/iu.test(value);
  if (unsafe || !value.startsWith(`${requiredRoot}/`)) {
    issues.push(
      issue(
        "error",
        "UNSAFE_ASSET_PATH",
        path,
        `Asset path must remain under ${requiredRoot}/ and cannot contain traversal, URLs, or backslashes.`,
      ),
    );
    return;
  }
  const extension = value.slice(value.lastIndexOf(".")).toLowerCase();
  if (!ART_SPEC_V1.source.acceptedExtensions.includes(extension as ".png")) {
    issues.push(
      issue("error", "SOURCE_FORMAT", path, `Unsupported source extension ${extension}.`),
    );
  }
}

function validateAutoTransform(
  value: Record<string, unknown>,
  path: string,
  issues: DeckValidationIssue[],
): void {
  rejectUnknownKeys(value, autoTransformKeys, path, issues);
  if (value.mode !== "auto") {
    issues.push(
      issue("error", "TRANSFORM_MODE", `${path}.mode`, "Auto transform mode is required."),
    );
  }
  if (value.fit !== "cover" && value.fit !== "contain") {
    issues.push(issue("error", "FIT", `${path}.fit`, "Fit must be cover or contain."));
  }
  if (!isNormalized(value.focusX)) {
    issues.push(issue("error", "FOCUS", `${path}.focusX`, "focusX must be between 0 and 1."));
  }
  if (!isNormalized(value.focusY)) {
    issues.push(issue("error", "FOCUS", `${path}.focusY`, "focusY must be between 0 and 1."));
  }
}

function validateTransform(value: unknown, path: string, issues: DeckValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("error", "TRANSFORM", path, "Transform must be an object."));
    return;
  }
  if (value.mode === "auto") {
    validateAutoTransform(value, path, issues);
    return;
  }
  rejectUnknownKeys(value, manualTransformKeys, path, issues);
  if (value.mode !== "manual") {
    issues.push(issue("error", "TRANSFORM_MODE", `${path}.mode`, "Unknown transform mode."));
  }
  if (!isRecord(value.crop)) {
    issues.push(issue("error", "CROP", `${path}.crop`, "Manual transform needs a crop object."));
  } else {
    rejectUnknownKeys(value.crop, cropKeys, `${path}.crop`, issues);
    const { x, y, width, height } = value.crop;
    if (!isNormalized(x) || !isNormalized(y)) {
      issues.push(issue("error", "CROP", `${path}.crop`, "Crop x and y must be normalized."));
    }
    if (
      typeof width !== "number" ||
      !Number.isFinite(width) ||
      width <= 0 ||
      width > 1 ||
      typeof height !== "number" ||
      !Number.isFinite(height) ||
      height <= 0 ||
      height > 1
    ) {
      issues.push(
        issue("error", "CROP", `${path}.crop`, "Crop size must be greater than 0 and at most 1."),
      );
    } else if (
      typeof x === "number" &&
      typeof y === "number" &&
      (x + width > 1 || y + height > 1)
    ) {
      issues.push(
        issue("error", "CROP_BOUNDS", `${path}.crop`, "Crop must remain inside the source."),
      );
    }
  }
  if (typeof value.zoom !== "number" || !Number.isFinite(value.zoom) || value.zoom < 1) {
    issues.push(
      issue("error", "ZOOM", `${path}.zoom`, "Manual zoom must be finite and at least 1."),
    );
  }
  if (typeof value.rotationDeg !== "number" || !Number.isFinite(value.rotationDeg)) {
    issues.push(issue("error", "ROTATION", `${path}.rotationDeg`, "Rotation must be finite."));
  }
}

export function validateDeckPackageDefinition(value: unknown): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  if (!isRecord(value)) {
    return [issue("error", "PACKAGE", "$", "Deck package must be an object.")];
  }
  rejectUnknownKeys(value, packageKeys, "$", issues);
  if (value.formatVersion !== DECK_FORMAT_VERSION) {
    issues.push(
      issue(
        "error",
        "FORMAT_VERSION",
        "$.formatVersion",
        "Only deck format version 1 is supported.",
      ),
    );
  }
  if (typeof value.id !== "string" || !packageIdPattern.test(value.id)) {
    issues.push(issue("error", "PACKAGE_ID", "$.id", "Package ID must be lowercase kebab-case."));
  }
  if (typeof value.version !== "string" || !versionPattern.test(value.version)) {
    issues.push(
      issue(
        "error",
        "PACKAGE_VERSION",
        "$.version",
        "Package version must be semantic version syntax.",
      ),
    );
  }
  for (const field of ["name", "author", "license"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      issues.push(issue("error", "PACKAGE_METADATA", `$.${field}`, `${field} must be nonempty.`));
    }
  }
  if (
    value.extends !== null &&
    (typeof value.extends !== "string" || !packageIdPattern.test(value.extends))
  ) {
    issues.push(issue("error", "EXTENDS", "$.extends", "extends must be null or a package ID."));
  }
  if (value.framePolicy !== "game") {
    issues.push(issue("error", "FRAME_POLICY", "$.framePolicy", "v1 frame policy must be game."));
  }
  if (value.sourceDefaults !== undefined) {
    if (isRecord(value.sourceDefaults)) {
      validateAutoTransform(value.sourceDefaults, "$.sourceDefaults", issues);
    } else {
      issues.push(
        issue("error", "SOURCE_DEFAULTS", "$.sourceDefaults", "Source defaults must be an object."),
      );
    }
  }
  if (!isRecord(value.cards)) {
    issues.push(issue("error", "CARDS", "$.cards", "cards must be an object."));
  } else {
    const assignedFiles = new Map<string, string>();
    for (const [cardId, mapping] of Object.entries(value.cards)) {
      if (!isCardId(cardId)) {
        issues.push(
          issue("error", "UNKNOWN_CARD_ID", `$.cards.${cardId}`, "Unknown canonical CardId."),
        );
        continue;
      }
      if (!isRecord(mapping)) {
        issues.push(
          issue("error", "CARD_MAPPING", `$.cards.${cardId}`, "Card mapping must be an object."),
        );
        continue;
      }
      rejectUnknownKeys(mapping, cardMappingKeys, `$.cards.${cardId}`, issues);
      validateAssetPath(mapping.file, `$.cards.${cardId}.file`, "source", issues);
      if (typeof mapping.file === "string") {
        const priorCard = assignedFiles.get(mapping.file);
        if (priorCard !== undefined) {
          issues.push(
            issue(
              "error",
              "DUPLICATE_SOURCE",
              `$.cards.${cardId}.file`,
              `${mapping.file} is already assigned to ${priorCard}.`,
            ),
          );
        }
        assignedFiles.set(mapping.file, cardId);
      }
    }
  }
  if (value.backs !== undefined) {
    if (!isRecord(value.backs)) {
      issues.push(issue("error", "BACKS", "$.backs", "backs must be an object."));
    } else {
      rejectUnknownKeys(value.backs, new Set(["default"]), "$.backs", issues);
      if (value.backs.default !== undefined) {
        validateAssetPath(value.backs.default, "$.backs.default", "source", issues);
      }
    }
  }
  if (value.preview !== undefined) {
    if (!isRecord(value.preview)) {
      issues.push(issue("error", "PREVIEW", "$.preview", "preview must be an object."));
    } else {
      rejectUnknownKeys(value.preview, previewKeys, "$.preview", issues);
      for (const field of ["thumbnail", "showcase"] as const) {
        if (value.preview[field] !== undefined) {
          validateAssetPath(value.preview[field], `$.preview.${field}`, "preview", issues);
        }
      }
      if (!Array.isArray(value.preview.featuredCardIds)) {
        issues.push(
          issue(
            "error",
            "FEATURED_CARD_IDS",
            "$.preview.featuredCardIds",
            "featuredCardIds must be an array.",
          ),
        );
      } else {
        const featured = value.preview.featuredCardIds.filter(
          (item): item is string => typeof item === "string",
        );
        if (
          featured.length !== value.preview.featuredCardIds.length ||
          featured.some((id) => !isCardId(id))
        ) {
          issues.push(
            issue(
              "error",
              "FEATURED_CARD_IDS",
              "$.preview.featuredCardIds",
              "Every featured ID must be canonical.",
            ),
          );
        }
        if (new Set(featured).size !== featured.length) {
          issues.push(
            issue(
              "error",
              "FEATURED_CARD_IDS",
              "$.preview.featuredCardIds",
              "Featured IDs must be unique.",
            ),
          );
        }
      }
    }
  }
  if (value.qualityExceptions !== undefined) {
    if (!isRecord(value.qualityExceptions)) {
      issues.push(
        issue(
          "error",
          "QUALITY_EXCEPTIONS",
          "$.qualityExceptions",
          "Quality exceptions must be an object.",
        ),
      );
    } else {
      for (const [cardId, exception] of Object.entries(value.qualityExceptions)) {
        if (!isCardId(cardId) || !isRecord(exception)) {
          issues.push(
            issue(
              "error",
              "QUALITY_EXCEPTION",
              `$.qualityExceptions.${cardId}`,
              "Exception must target a canonical CardId.",
            ),
          );
          continue;
        }
        rejectUnknownKeys(exception, exceptionKeys, `$.qualityExceptions.${cardId}`, issues);
        if (exception.allowBelowReleaseMinimum !== true) {
          issues.push(
            issue(
              "error",
              "QUALITY_EXCEPTION",
              `$.qualityExceptions.${cardId}`,
              "Exception must explicitly allow below-minimum art.",
            ),
          );
        }
        for (const field of ["approvedBy", "approvedOn", "reason"] as const) {
          if (typeof exception[field] !== "string" || exception[field].trim().length === 0) {
            issues.push(
              issue(
                "error",
                "QUALITY_EXCEPTION",
                `$.qualityExceptions.${cardId}.${field}`,
                `${field} must be nonempty.`,
              ),
            );
          }
        }
      }
    }
  }
  return Object.freeze(issues);
}

export function validateDeckTransformsDefinition(value: unknown): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  if (!isRecord(value)) {
    return [issue("error", "TRANSFORMS", "$", "Transform manifest must be an object.")];
  }
  rejectUnknownKeys(value, transformFileKeys, "$", issues);
  if (value.formatVersion !== TRANSFORM_FORMAT_VERSION) {
    issues.push(
      issue(
        "error",
        "FORMAT_VERSION",
        "$.formatVersion",
        "Only transform format version 1 is supported.",
      ),
    );
  }
  if (typeof value.packageId !== "string" || !packageIdPattern.test(value.packageId)) {
    issues.push(issue("error", "PACKAGE_ID", "$.packageId", "Transform packageId is invalid."));
  }
  if (!isRecord(value.cards)) {
    issues.push(issue("error", "CARDS", "$.cards", "Transform cards must be an object."));
  } else {
    for (const [cardId, transform] of Object.entries(value.cards)) {
      if (!isCardId(cardId)) {
        issues.push(
          issue("error", "UNKNOWN_CARD_ID", `$.cards.${cardId}`, "Unknown transform CardId."),
        );
      }
      validateTransform(transform, `$.cards.${cardId}`, issues);
    }
  }
  return Object.freeze(issues);
}

export function validateDeckTransformsAssociation(
  packageDefinition: DeckPackageV1,
  transforms: DeckTransformsV1,
): readonly DeckValidationIssue[] {
  if (transforms.packageId === packageDefinition.id) return Object.freeze([]);
  return Object.freeze([
    issue(
      "error",
      "TRANSFORM_PACKAGE",
      "$.packageId",
      `transforms.json targets ${transforms.packageId}, but deck.json defines ${packageDefinition.id}.`,
    ),
  ]);
}

export function validateDeckPilotDefinition(value: unknown): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  if (!isRecord(value)) {
    return [issue("error", "PILOT", "$", "Pilot manifest must be an object.")];
  }
  rejectUnknownKeys(value, pilotKeys, "$", issues);
  if (value.formatVersion !== PILOT_FORMAT_VERSION) {
    issues.push(
      issue(
        "error",
        "FORMAT_VERSION",
        "$.formatVersion",
        "Only pilot format version 1 is supported.",
      ),
    );
  }
  if (typeof value.packageId !== "string" || !packageIdPattern.test(value.packageId)) {
    issues.push(issue("error", "PACKAGE_ID", "$.packageId", "Pilot packageId is invalid."));
  }
  if (!Array.isArray(value.cards)) {
    issues.push(issue("error", "PILOT_CARDS", "$.cards", "Pilot cards must be an array."));
  } else {
    const roles: string[] = [];
    const ids: string[] = [];
    for (const [index, assignment] of value.cards.entries()) {
      const path = `$.cards[${index}]`;
      if (!isRecord(assignment)) {
        issues.push(issue("error", "PILOT_CARD", path, "Pilot assignment must be an object."));
        continue;
      }
      rejectUnknownKeys(assignment, pilotCardKeys, path, issues);
      if (typeof assignment.role !== "string" || !pilotRoles.has(assignment.role)) {
        issues.push(issue("error", "PILOT_ROLE", `${path}.role`, "Unknown pilot role."));
      } else {
        roles.push(assignment.role);
      }
      if (typeof assignment.cardId !== "string" || !isCardId(assignment.cardId)) {
        issues.push(
          issue("error", "PILOT_CARD_ID", `${path}.cardId`, "Pilot CardId must be canonical."),
        );
      } else {
        ids.push(assignment.cardId);
      }
      if (typeof assignment.rationale !== "string" || assignment.rationale.trim().length === 0) {
        issues.push(
          issue(
            "error",
            "PILOT_RATIONALE",
            `${path}.rationale`,
            "Pilot rationale must be nonempty.",
          ),
        );
      }
    }
    if (value.cards.length !== 4 || new Set(roles).size !== 4 || new Set(ids).size !== 4) {
      issues.push(
        issue(
          "error",
          "PILOT_COVERAGE",
          "$.cards",
          "Pilot must contain four distinct cards and all four roles.",
        ),
      );
    }
  }
  if (
    !new Set(["technical-placeholder", "awaiting-finished-art", "approved"]).has(
      String(value.approvalStatus),
    )
  ) {
    issues.push(
      issue("error", "PILOT_STATUS", "$.approvalStatus", "Unknown pilot approval status."),
    );
  }
  return Object.freeze(issues);
}

export function hasValidationErrors(issues: readonly DeckValidationIssue[]): boolean {
  return issues.some((entry) => entry.severity === "error");
}

export function assertDeckPackageV1(value: unknown): asserts value is DeckPackageV1 {
  const issues = validateDeckPackageDefinition(value);
  if (hasValidationErrors(issues)) {
    throw new Error(
      issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n"),
    );
  }
}

export function assertDeckTransformsV1(value: unknown): asserts value is DeckTransformsV1 {
  const issues = validateDeckTransformsDefinition(value);
  if (hasValidationErrors(issues)) {
    throw new Error(
      issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n"),
    );
  }
}

export function assertDeckPilotV1(value: unknown): asserts value is DeckPilotV1 {
  const issues = validateDeckPilotDefinition(value);
  if (hasValidationErrors(issues)) {
    throw new Error(
      issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n"),
    );
  }
}

export function missingCardIds(cardIds: readonly string[]): readonly CardId[] {
  const present = new Set(cardIds);
  return Object.freeze(CARD_IDS.filter((cardId) => !present.has(cardId)));
}

export function validateTransformValue(transform: CardTransform): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  validateTransform(transform, "$", issues);
  return Object.freeze(issues);
}

export function validateAutoTransformValue(
  transform: AutoTransform,
): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  validateAutoTransform(transform as unknown as Record<string, unknown>, "$", issues);
  return Object.freeze(issues);
}
