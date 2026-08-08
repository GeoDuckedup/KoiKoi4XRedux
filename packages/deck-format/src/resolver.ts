import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import { canonicalAutoTransform, resolveCardTransform } from "./transform.ts";
import type {
  AutoTransform,
  CardTransform,
  DeckPackageV1,
  DeckPackageValidationSummary,
  DeckRegistryValidationReport,
  DeckResolutionRegistry,
  DeckTransformsV1,
  DeckValidationIssue,
  ResolvedCardArt,
  ResolvedDeckPackage,
  ResolvedDeckPackageDraft,
} from "./types.ts";
import {
  hasValidationErrors,
  validateDeckPackageDefinition,
  validateDeckTransformsDefinition,
} from "./validation.ts";

function freezeIssue(
  severity: "error" | "warning",
  code: string,
  path: string,
  message: string,
): DeckValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function freezePreview(preview: DeckPackageV1["preview"]): DeckPackageV1["preview"] {
  return preview === undefined
    ? undefined
    : Object.freeze({
        ...preview,
        featuredCardIds: Object.freeze([...preview.featuredCardIds]),
      });
}

function buildInheritanceChain(
  packageId: string,
  packages: Readonly<Record<string, DeckPackageV1>>,
): readonly DeckPackageV1[] {
  const chain: DeckPackageV1[] = [];
  const seenAt = new Map<string, number>();
  let currentId: string | null = packageId;

  while (currentId !== null) {
    const cycleIndex = seenAt.get(currentId);
    if (cycleIndex !== undefined) {
      const cycle = [...chain.slice(cycleIndex).map((entry) => entry.id), currentId].join(" -> ");
      throw new Error(`INHERITANCE_CYCLE: ${cycle}`);
    }
    const current: DeckPackageV1 | undefined = packages[currentId];
    if (current === undefined) {
      throw new Error(`MISSING_PARENT: ${currentId}`);
    }
    seenAt.set(currentId, chain.length);
    chain.push(current);
    currentId = current.extends;
  }

  return Object.freeze(chain.reverse());
}

export function resolveDeckPackageDraft(
  packageId: string,
  registry: DeckResolutionRegistry,
): ResolvedDeckPackageDraft {
  const chain = buildInheritanceChain(packageId, registry.packages);
  const target = chain.at(-1);
  if (target === undefined) {
    throw new Error(`MISSING_PACKAGE: ${packageId}`);
  }

  const sourceMappings = new Map<CardId, { file: string; packageId: string }>();
  const transforms = new Map<CardId, { transform: CardTransform; packageId: string }>();
  let sourceDefaults: AutoTransform = canonicalAutoTransform();
  let cardBack: { file: string; packageId: string } | null = null;
  let preview: DeckPackageV1["preview"];

  for (const packageDefinition of chain) {
    if (packageDefinition.sourceDefaults !== undefined) {
      sourceDefaults = Object.freeze({ ...sourceDefaults, ...packageDefinition.sourceDefaults });
    }
    for (const [cardId, mapping] of Object.entries(packageDefinition.cards)) {
      if (mapping !== undefined) {
        sourceMappings.set(cardId as CardId, {
          file: mapping.file,
          packageId: packageDefinition.id,
        });
      }
    }
    const transformFile = registry.transforms[packageDefinition.id];
    if (transformFile !== undefined) {
      for (const [cardId, transform] of Object.entries(transformFile.cards)) {
        if (transform !== undefined) {
          transforms.set(cardId as CardId, { transform, packageId: packageDefinition.id });
        }
      }
    }
    if (packageDefinition.backs?.default !== undefined) {
      cardBack = { file: packageDefinition.backs.default, packageId: packageDefinition.id };
    }
    if (packageDefinition.preview !== undefined) {
      preview = freezePreview({
        ...(preview ?? { featuredCardIds: [] }),
        ...packageDefinition.preview,
      });
    }
  }

  const cardFaces: Partial<Record<CardId, ResolvedCardArt>> = {};
  for (const cardId of CARD_IDS) {
    const source = sourceMappings.get(cardId);
    if (source === undefined) {
      continue;
    }
    const transformOverride = transforms.get(cardId);
    cardFaces[cardId] = Object.freeze({
      cardId,
      file: source.file,
      sourcePackageId: source.packageId,
      transform: resolveCardTransform(sourceDefaults, transformOverride?.transform),
      transformPackageId: transformOverride?.packageId ?? null,
    });
  }

  return Object.freeze({
    formatVersion: 1,
    id: target.id,
    version: target.version,
    name: target.name,
    author: target.author,
    license: target.license,
    framePolicy: "game",
    inheritanceChain: Object.freeze(chain.map((entry) => entry.id)),
    cardFaces: Object.freeze(cardFaces),
    cardBack:
      cardBack === null
        ? null
        : Object.freeze({ file: cardBack.file, sourcePackageId: cardBack.packageId }),
    preview: preview === undefined ? null : (freezePreview(preview) ?? null),
  });
}

export function resolveDeckPackage(
  packageId: string,
  registry: DeckResolutionRegistry,
): ResolvedDeckPackage {
  const draft = resolveDeckPackageDraft(packageId, registry);
  const missing = CARD_IDS.filter((cardId) => draft.cardFaces[cardId] === undefined);
  if (missing.length > 0) {
    throw new Error(`MISSING_CARDS: ${missing.join(", ")}`);
  }
  if (draft.cardBack === null) {
    throw new Error("MISSING_CARD_BACK");
  }
  return draft as ResolvedDeckPackage;
}

function registryFromCollections(
  packages: readonly DeckPackageV1[],
  transforms: readonly DeckTransformsV1[],
  issues: DeckValidationIssue[],
): DeckResolutionRegistry {
  const packageRegistry: Record<string, DeckPackageV1> = {};
  const transformRegistry: Record<string, DeckTransformsV1> = {};
  for (const packageDefinition of packages) {
    if (packageRegistry[packageDefinition.id] !== undefined) {
      issues.push(
        freezeIssue(
          "error",
          "DUPLICATE_PACKAGE_ID",
          packageDefinition.id,
          `Duplicate package ID ${packageDefinition.id}.`,
        ),
      );
    } else {
      packageRegistry[packageDefinition.id] = packageDefinition;
    }
  }
  for (const transformFile of transforms) {
    if (transformRegistry[transformFile.packageId] !== undefined) {
      issues.push(
        freezeIssue(
          "error",
          "DUPLICATE_TRANSFORMS",
          transformFile.packageId,
          `Duplicate transforms for ${transformFile.packageId}.`,
        ),
      );
    } else {
      transformRegistry[transformFile.packageId] = transformFile;
    }
    if (packageRegistry[transformFile.packageId] === undefined) {
      issues.push(
        freezeIssue(
          "error",
          "ORPHAN_TRANSFORMS",
          transformFile.packageId,
          "Transform manifest has no matching package.",
        ),
      );
    }
  }
  return Object.freeze({
    packages: Object.freeze(packageRegistry),
    transforms: Object.freeze(transformRegistry),
  });
}

export interface ValidateDeckRegistryOptions {
  readonly requireComplete?: boolean;
}

export function validateDeckRegistry(
  packages: readonly DeckPackageV1[],
  transforms: readonly DeckTransformsV1[],
  options: ValidateDeckRegistryOptions = {},
): DeckRegistryValidationReport {
  const issues: DeckValidationIssue[] = [];
  const summaries: DeckPackageValidationSummary[] = [];
  const resolvedPackages: Record<string, ResolvedDeckPackageDraft> = {};
  const requireComplete = options.requireComplete ?? true;

  for (const packageDefinition of packages) {
    issues.push(
      ...validateDeckPackageDefinition(packageDefinition).map((entry) =>
        Object.freeze({ ...entry, path: `${packageDefinition.id}:${entry.path}` }),
      ),
    );
  }
  for (const transformFile of transforms) {
    issues.push(
      ...validateDeckTransformsDefinition(transformFile).map((entry) =>
        Object.freeze({ ...entry, path: `${transformFile.packageId}:${entry.path}` }),
      ),
    );
  }
  if (hasValidationErrors(issues)) {
    return Object.freeze({
      issues: Object.freeze(issues),
      summaries: Object.freeze(summaries),
      resolvedPackages: Object.freeze(resolvedPackages),
    });
  }

  const registry = registryFromCollections(packages, transforms, issues);
  for (const packageDefinition of packages) {
    let resolved: ResolvedDeckPackageDraft;
    try {
      resolved = resolveDeckPackageDraft(packageDefinition.id, registry);
      resolvedPackages[packageDefinition.id] = resolved;
    } catch (error) {
      issues.push(
        freezeIssue(
          "error",
          error instanceof Error && error.message.startsWith("INHERITANCE_CYCLE")
            ? "INHERITANCE_CYCLE"
            : "INHERITANCE",
          packageDefinition.id,
          error instanceof Error ? error.message : String(error),
        ),
      );
      continue;
    }

    const resolvedCardIds = Object.keys(resolved.cardFaces) as CardId[];
    const missing = CARD_IDS.filter((cardId) => resolved.cardFaces[cardId] === undefined);
    if (missing.length > 0) {
      issues.push(
        freezeIssue(
          requireComplete ? "error" : "warning",
          "MISSING_CARD_COVERAGE",
          packageDefinition.id,
          `Resolved package is missing ${missing.length} cards: ${missing.join(", ")}.`,
        ),
      );
    }
    if (resolved.cardBack === null) {
      issues.push(
        freezeIssue(
          "error",
          "MISSING_CARD_BACK",
          packageDefinition.id,
          "Resolved package needs a default card back.",
        ),
      );
    }
    const fileOwners = new Map<string, CardId>();
    for (const cardId of resolvedCardIds) {
      const art = resolved.cardFaces[cardId];
      if (art === undefined) continue;
      const key = `${art.sourcePackageId}:${art.file}`;
      const prior = fileOwners.get(key);
      if (prior !== undefined) {
        issues.push(
          freezeIssue(
            "error",
            "DUPLICATE_RESOLVED_SOURCE",
            `${packageDefinition.id}:${cardId}`,
            `${art.file} also resolves to ${prior}.`,
          ),
        );
      }
      fileOwners.set(key, cardId);
    }

    summaries.push(
      Object.freeze({
        packageId: packageDefinition.id,
        resolvedCardCount: resolvedCardIds.length,
        inheritedCardCount: resolvedCardIds.filter(
          (cardId) => resolved.cardFaces[cardId]?.sourcePackageId !== packageDefinition.id,
        ).length,
        autoTransformCount: resolvedCardIds.filter(
          (cardId) => resolved.cardFaces[cardId]?.transform.mode === "auto",
        ).length,
        manualTransformCount: resolvedCardIds.filter(
          (cardId) => resolved.cardFaces[cardId]?.transform.mode === "manual",
        ).length,
        inheritanceChain: resolved.inheritanceChain,
      }),
    );
  }

  return Object.freeze({
    issues: Object.freeze(issues),
    summaries: Object.freeze(summaries),
    resolvedPackages: Object.freeze(resolvedPackages),
  });
}
