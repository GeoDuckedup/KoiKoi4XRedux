import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type {
  DeckPackageV1,
  DeckPilotV1,
  DeckTransformsV1,
  DeckValidationIssue,
} from "../types.ts";
import {
  hasValidationErrors,
  validateDeckPackageDefinition,
  validateDeckPilotDefinition,
  validateDeckTransformsAssociation,
  validateDeckTransformsDefinition,
} from "../validation.ts";
import { validateDeckRegistry } from "../resolver.ts";

export interface LoadedDeckDirectoryV1 {
  readonly directory: string;
  readonly packageDefinition: DeckPackageV1;
  readonly pilot: DeckPilotV1 | null;
  readonly transforms: DeckTransformsV1;
}

export interface LoadedDeckWorkspaceV1 {
  readonly byId: Readonly<Record<string, LoadedDeckDirectoryV1>>;
  readonly issues: readonly DeckValidationIssue[];
  readonly packages: readonly DeckPackageV1[];
  readonly transforms: readonly DeckTransformsV1[];
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function prefixed(
  packageId: string,
  issues: readonly DeckValidationIssue[],
): DeckValidationIssue[] {
  return issues.map((entry) => Object.freeze({ ...entry, path: `${packageId}:${entry.path}` }));
}

export function loadDeckWorkspaceV1(decksRoot: string): LoadedDeckWorkspaceV1 {
  const root = resolve(decksRoot);
  const issues: DeckValidationIssue[] = [];
  const packages: DeckPackageV1[] = [];
  const transforms: DeckTransformsV1[] = [];
  const byId: Record<string, LoadedDeckDirectoryV1> = {};
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "deck.json")))
    .map((entry) => join(root, entry.name));

  for (const directory of directories) {
    const fallbackId = directory.split(/[\\/]/u).at(-1) ?? "unknown-package";
    let packageDefinition: DeckPackageV1;
    try {
      const value = readJson(join(directory, "deck.json"));
      const localIssues = validateDeckPackageDefinition(value);
      issues.push(...prefixed(fallbackId, localIssues));
      if (hasValidationErrors(localIssues)) continue;
      packageDefinition = value as DeckPackageV1;
    } catch (error) {
      issues.push(
        Object.freeze({
          severity: "error",
          code: "DECK_JSON",
          path: fallbackId,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      continue;
    }

    let transformFile: DeckTransformsV1 = Object.freeze({
      formatVersion: 1,
      packageId: packageDefinition.id,
      cards: Object.freeze({}),
    });
    const transformPath = join(directory, "transforms.json");
    if (existsSync(transformPath)) {
      const value = readJson(transformPath);
      const localIssues = [
        ...validateDeckTransformsDefinition(value),
        ...validateDeckTransformsAssociation(packageDefinition, value as DeckTransformsV1),
      ];
      issues.push(...prefixed(packageDefinition.id, localIssues));
      if (!hasValidationErrors(localIssues)) transformFile = value as DeckTransformsV1;
    }

    let pilot: DeckPilotV1 | null = null;
    const pilotPath = join(directory, "pilot.json");
    if (existsSync(pilotPath)) {
      const value = readJson(pilotPath);
      const localIssues = validateDeckPilotDefinition(value);
      issues.push(...prefixed(packageDefinition.id, localIssues));
      if (!hasValidationErrors(localIssues)) pilot = value as DeckPilotV1;
    }

    const loaded = Object.freeze({
      directory,
      packageDefinition,
      pilot,
      transforms: transformFile,
    });
    packages.push(packageDefinition);
    transforms.push(transformFile);
    byId[packageDefinition.id] = loaded;
  }

  const registry = validateDeckRegistry(packages, transforms, { requireComplete: true });
  issues.push(...registry.issues);
  return Object.freeze({
    byId: Object.freeze(byId),
    issues: Object.freeze(issues),
    packages: Object.freeze(packages),
    transforms: Object.freeze(transforms),
  });
}
