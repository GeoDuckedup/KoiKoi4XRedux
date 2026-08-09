import { CARD_IDS, isCardId, type CardId } from "@koikoi4x/engine";

import { ART_SPEC_V1 } from "./art-spec.ts";
import type { DeckValidationIssue, ValidationSeverity } from "./types.ts";

export const RUNTIME_DECK_MANIFEST_VERSION = 1 as const;
export const RUNTIME_DECK_APPROVAL_STATUSES = Object.freeze([
  "technical-placeholder",
  "approved",
] as const);
export const RUNTIME_DECK_MEDIA_TYPES = Object.freeze([
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const);

export type RuntimeDeckApprovalStatus = (typeof RUNTIME_DECK_APPROVAL_STATUSES)[number];
export type RuntimeDeckMediaType = (typeof RUNTIME_DECK_MEDIA_TYPES)[number];

export interface RuntimeDeckImageV1 {
  readonly height: typeof ART_SPEC_V1.derivatives.table.height;
  readonly mediaType: RuntimeDeckMediaType;
  readonly path: string;
  readonly sourcePackageId: string;
  readonly width: typeof ART_SPEC_V1.derivatives.table.width;
}

export interface RuntimeDeckManifestV1 {
  readonly approvalStatus: RuntimeDeckApprovalStatus;
  readonly artSpecVersion: typeof ART_SPEC_V1.version;
  readonly author: string;
  readonly cardBack: RuntimeDeckImageV1;
  readonly cardFaces: Readonly<Record<CardId, RuntimeDeckImageV1>>;
  readonly framePolicy: "game";
  readonly inheritanceChain: readonly string[];
  readonly license: string;
  readonly name: string;
  readonly packageId: string;
  readonly packageVersion: string;
  readonly runtimeFormatVersion: typeof RUNTIME_DECK_MANIFEST_VERSION;
}

const manifestKeys = new Set([
  "runtimeFormatVersion",
  "artSpecVersion",
  "packageId",
  "packageVersion",
  "name",
  "author",
  "license",
  "approvalStatus",
  "framePolicy",
  "inheritanceChain",
  "cardFaces",
  "cardBack",
]);
const imageKeys = new Set(["path", "width", "height", "mediaType", "sourcePackageId"]);
const packageIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const runtimeExtensions: Readonly<Record<RuntimeDeckMediaType, readonly string[]>> = Object.freeze({
  "image/png": Object.freeze([".png"]),
  "image/webp": Object.freeze([".webp"]),
  "image/svg+xml": Object.freeze([".svg"]),
});

function issue(
  severity: ValidationSeverity,
  code: string,
  path: string,
  message: string,
): DeckValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every((key) => {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable === true && Object.hasOwn(descriptor, "value");
  });
}

function isDenseDataArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) return false;
  const stringKeys = ownKeys.filter((key): key is string => typeof key === "string");
  if (stringKeys.some((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key))) return false;
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) {
      return false;
    }
  }
  return stringKeys.length === value.length + 1;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: DeckValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(
        issue("error", "UNKNOWN_RUNTIME_FIELD", `${path}.${key}`, `Unsupported field ${key}.`),
      );
    }
  }
}

function validatePackageId(
  value: unknown,
  path: string,
  issues: DeckValidationIssue[],
): value is string {
  if (typeof value !== "string" || !packageIdPattern.test(value)) {
    issues.push(
      issue("error", "RUNTIME_PACKAGE_ID", path, "Package ID must be lowercase kebab-case."),
    );
    return false;
  }
  return true;
}

function validateImage(
  value: unknown,
  path: string,
  expectedRoot: "backs" | "cards",
  inheritancePackages: ReadonlySet<string> | null,
  issues: DeckValidationIssue[],
): value is RuntimeDeckImageV1 {
  if (!isPlainRecord(value)) {
    issues.push(issue("error", "RUNTIME_IMAGE", path, "Runtime image must be a plain object."));
    return false;
  }
  rejectUnknownKeys(value, imageKeys, path, issues);

  const assetPath = value.path;
  if (typeof assetPath !== "string" || assetPath.length === 0) {
    issues.push(
      issue("error", "RUNTIME_ASSET_PATH", `${path}.path`, "Asset path must be nonempty."),
    );
  } else {
    const unsafe =
      assetPath.startsWith("/") ||
      assetPath.includes("\\") ||
      assetPath.includes("?") ||
      assetPath.includes("#") ||
      assetPath.split("/").some((part) => part.length === 0 || part === "." || part === "..") ||
      /^[a-z][a-z0-9+.-]*:/iu.test(assetPath);
    if (unsafe || !assetPath.startsWith(`${expectedRoot}/`)) {
      issues.push(
        issue(
          "error",
          "UNSAFE_RUNTIME_ASSET_PATH",
          `${path}.path`,
          `Runtime asset must remain under ${expectedRoot}/ and cannot contain a URL, query, fragment, traversal, or backslash.`,
        ),
      );
    }
  }

  if (
    value.width !== ART_SPEC_V1.derivatives.table.width ||
    value.height !== ART_SPEC_V1.derivatives.table.height
  ) {
    issues.push(
      issue(
        "error",
        "RUNTIME_ASSET_GEOMETRY",
        path,
        `Runtime assets must be ${ART_SPEC_V1.derivatives.table.width}×${ART_SPEC_V1.derivatives.table.height}.`,
      ),
    );
  }
  if (!RUNTIME_DECK_MEDIA_TYPES.includes(value.mediaType as RuntimeDeckMediaType)) {
    issues.push(
      issue("error", "RUNTIME_MEDIA_TYPE", `${path}.mediaType`, "Unsupported runtime media type."),
    );
  } else if (typeof assetPath === "string") {
    const allowedExtensions = runtimeExtensions[value.mediaType as RuntimeDeckMediaType];
    if (!allowedExtensions.some((extension) => assetPath.toLowerCase().endsWith(extension))) {
      issues.push(
        issue(
          "error",
          "RUNTIME_MEDIA_EXTENSION",
          `${path}.path`,
          "Runtime asset extension does not match its media type.",
        ),
      );
    }
  }
  const sourcePackageId = value.sourcePackageId;
  if (
    validatePackageId(sourcePackageId, `${path}.sourcePackageId`, issues) &&
    inheritancePackages &&
    !inheritancePackages.has(sourcePackageId)
  ) {
    issues.push(
      issue(
        "error",
        "RUNTIME_SOURCE_PROVENANCE",
        `${path}.sourcePackageId`,
        "Runtime image provenance must name a package in the resolved inheritance chain.",
      ),
    );
  }
  return true;
}

export function validateRuntimeDeckManifestV1(value: unknown): readonly DeckValidationIssue[] {
  const issues: DeckValidationIssue[] = [];
  if (!isPlainRecord(value)) {
    return [
      issue("error", "RUNTIME_MANIFEST", "$", "Runtime deck manifest must be a plain object."),
    ];
  }
  rejectUnknownKeys(value, manifestKeys, "$", issues);

  if (value.runtimeFormatVersion !== RUNTIME_DECK_MANIFEST_VERSION) {
    issues.push(
      issue(
        "error",
        "RUNTIME_FORMAT_VERSION",
        "$.runtimeFormatVersion",
        "Only runtime deck manifest version 1 is supported.",
      ),
    );
  }
  if (value.artSpecVersion !== ART_SPEC_V1.version) {
    issues.push(
      issue(
        "error",
        "RUNTIME_ART_SPEC_VERSION",
        "$.artSpecVersion",
        "Runtime deck must target ART_SPEC v1.",
      ),
    );
  }
  const packageIdValid = validatePackageId(value.packageId, "$.packageId", issues);
  if (typeof value.packageVersion !== "string" || !versionPattern.test(value.packageVersion)) {
    issues.push(
      issue(
        "error",
        "RUNTIME_PACKAGE_VERSION",
        "$.packageVersion",
        "Package version must use semantic version syntax.",
      ),
    );
  }
  for (const field of ["name", "author", "license"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      issues.push(
        issue("error", "RUNTIME_PACKAGE_METADATA", `$.${field}`, `${field} must be nonempty.`),
      );
    }
  }
  if (!RUNTIME_DECK_APPROVAL_STATUSES.includes(value.approvalStatus as RuntimeDeckApprovalStatus)) {
    issues.push(
      issue(
        "error",
        "RUNTIME_APPROVAL_STATUS",
        "$.approvalStatus",
        "Unknown runtime approval status.",
      ),
    );
  }
  if (value.framePolicy !== ART_SPEC_V1.frame.policy) {
    issues.push(
      issue(
        "error",
        "RUNTIME_FRAME_POLICY",
        "$.framePolicy",
        "Runtime frame policy must remain game-controlled.",
      ),
    );
  }

  let inheritancePackages: ReadonlySet<string> | null = null;
  if (!isDenseDataArray(value.inheritanceChain) || value.inheritanceChain.length === 0) {
    issues.push(
      issue(
        "error",
        "RUNTIME_INHERITANCE",
        "$.inheritanceChain",
        "Inheritance chain must be a nonempty array.",
      ),
    );
  } else {
    const chain = value.inheritanceChain;
    const seen = new Set<string>();
    for (const [index, entry] of chain.entries()) {
      if (validatePackageId(entry, `$.inheritanceChain[${index}]`, issues)) {
        if (seen.has(entry)) {
          issues.push(
            issue(
              "error",
              "RUNTIME_INHERITANCE_CYCLE",
              `$.inheritanceChain[${index}]`,
              "Inheritance chain cannot repeat a package ID.",
            ),
          );
        }
        seen.add(entry);
      }
    }
    if (packageIdValid && chain.at(-1) !== value.packageId) {
      issues.push(
        issue(
          "error",
          "RUNTIME_INHERITANCE_TARGET",
          "$.inheritanceChain",
          "Inheritance chain must end with the runtime package ID.",
        ),
      );
    }
    inheritancePackages = seen;
  }

  if (!isPlainRecord(value.cardFaces)) {
    issues.push(
      issue("error", "RUNTIME_CARD_FACES", "$.cardFaces", "cardFaces must be a complete object."),
    );
  } else {
    const paths = new Set<string>();
    for (const key of Object.keys(value.cardFaces)) {
      if (!isCardId(key)) {
        issues.push(
          issue(
            "error",
            "UNKNOWN_RUNTIME_CARD_ID",
            `$.cardFaces.${key}`,
            "Unknown canonical CardId.",
          ),
        );
      }
    }
    for (const cardId of CARD_IDS) {
      const image = value.cardFaces[cardId];
      if (image === undefined) {
        issues.push(
          issue(
            "error",
            "MISSING_RUNTIME_CARD",
            `$.cardFaces.${cardId}`,
            "Runtime deck is missing a canonical card face.",
          ),
        );
        continue;
      }
      validateImage(image, `$.cardFaces.${cardId}`, "cards", inheritancePackages, issues);
      if (isPlainRecord(image) && typeof image.path === "string") {
        if (paths.has(image.path)) {
          issues.push(
            issue(
              "error",
              "DUPLICATE_RUNTIME_ASSET",
              `$.cardFaces.${cardId}.path`,
              "Every canonical card must resolve to its own runtime face asset.",
            ),
          );
        }
        paths.add(image.path);
      }
    }
  }
  validateImage(value.cardBack, "$.cardBack", "backs", inheritancePackages, issues);
  return Object.freeze(issues);
}

export function decodeRuntimeDeckManifestV1(value: unknown): RuntimeDeckManifestV1 {
  const issues = validateRuntimeDeckManifestV1(value);
  if (issues.some((entry) => entry.severity === "error")) {
    throw new Error(
      issues.map((entry) => `${entry.code} ${entry.path}: ${entry.message}`).join("\n"),
    );
  }
  const manifest = value as RuntimeDeckManifestV1;
  const cardFaces = Object.fromEntries(
    CARD_IDS.map((cardId) => [cardId, Object.freeze({ ...manifest.cardFaces[cardId] })]),
  ) as Record<CardId, RuntimeDeckImageV1>;
  return Object.freeze({
    ...manifest,
    inheritanceChain: Object.freeze([...manifest.inheritanceChain]),
    cardFaces: Object.freeze(cardFaces),
    cardBack: Object.freeze({ ...manifest.cardBack }),
  });
}
