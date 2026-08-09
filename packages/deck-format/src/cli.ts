#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { validatePilotReadiness, validatePilotReleaseApproval } from "./pilot.ts";
import { validateDeckRegistry } from "./resolver.ts";
import type { DeckPackageV1, DeckPilotV1, DeckTransformsV1, DeckValidationIssue } from "./types.ts";
import {
  hasValidationErrors,
  validateDeckPackageDefinition,
  validateDeckPilotDefinition,
  validateDeckTransformsAssociation,
  validateDeckTransformsDefinition,
} from "./validation.ts";
import { generateLockedDeckArtifacts, pilotCardIdSet } from "./node/artifacts.ts";
import { buildDeckPackageV1 } from "./node/package-builder.ts";
import { seedTechnicalPilotSources } from "./node/pilot-placeholders.ts";
import { validateLocalPackageSources } from "./node/source-validation.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function prefixedIssues(
  packageId: string,
  issues: readonly DeckValidationIssue[],
): DeckValidationIssue[] {
  return issues.map((entry) => Object.freeze({ ...entry, path: `${packageId}:${entry.path}` }));
}

function loadPackageDirectory(directory: string): {
  packageDefinition: DeckPackageV1 | null;
  transforms: DeckTransformsV1 | null;
  pilot: DeckPilotV1 | null;
  issues: DeckValidationIssue[];
} {
  const fallbackId = basename(directory);
  const issues: DeckValidationIssue[] = [];
  let packageDefinition: DeckPackageV1 | null = null;
  let transforms: DeckTransformsV1 | null = null;
  let pilot: DeckPilotV1 | null = null;

  try {
    const value = loadJson(join(directory, "deck.json"));
    const packageIssues = validateDeckPackageDefinition(value);
    issues.push(...prefixedIssues(fallbackId, packageIssues));
    if (!hasValidationErrors(packageIssues)) packageDefinition = value as DeckPackageV1;
  } catch (error) {
    issues.push({
      severity: "error",
      code: "DECK_JSON",
      path: fallbackId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const transformsPath = join(directory, "transforms.json");
  if (existsSync(transformsPath)) {
    try {
      const value = loadJson(transformsPath);
      const transformIssues = validateDeckTransformsDefinition(value);
      issues.push(...prefixedIssues(fallbackId, transformIssues));
      if (!hasValidationErrors(transformIssues)) transforms = value as DeckTransformsV1;
    } catch (error) {
      issues.push({
        severity: "error",
        code: "TRANSFORMS_JSON",
        path: fallbackId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const pilotPath = join(directory, "pilot.json");
  if (existsSync(pilotPath)) {
    try {
      const value = loadJson(pilotPath);
      const pilotIssues = validateDeckPilotDefinition(value);
      issues.push(...prefixedIssues(fallbackId, pilotIssues));
      if (!hasValidationErrors(pilotIssues)) pilot = value as DeckPilotV1;
    } catch (error) {
      issues.push({
        severity: "error",
        code: "PILOT_JSON",
        path: fallbackId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (packageDefinition !== null && transforms !== null) {
    issues.push(
      ...prefixedIssues(
        fallbackId,
        validateDeckTransformsAssociation(packageDefinition, transforms),
      ),
    );
  }

  return { packageDefinition, transforms, pilot, issues };
}

function printReport(
  issues: readonly DeckValidationIssue[],
  summaries: readonly Record<string, unknown>[],
  json: boolean,
): void {
  if (json) {
    process.stdout.write(`${JSON.stringify({ summaries, issues }, null, 2)}\n`);
    return;
  }
  for (const summary of summaries) {
    process.stdout.write(
      `✓ ${String(summary.packageId)}: ${String(summary.resolvedCardCount)} cards, ${String(summary.autoTransformCount)} auto / ${String(summary.manualTransformCount)} manual, ${String(summary.inheritedCardCount)} inherited\n`,
    );
  }
  for (const entry of issues) {
    process.stdout.write(
      `${entry.severity === "error" ? "ERROR" : "WARN"} ${entry.code} ${entry.path}: ${entry.message}\n`,
    );
  }
}

function validateCommand(args: readonly string[]): number {
  const release = args.includes("--release");
  const json = args.includes("--json");
  const rootArgument = args.find((argument) => !argument.startsWith("--"));
  const decksRoot = resolve(repositoryRoot, rootArgument ?? "decks");
  const directories = readdirSync(decksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(decksRoot, entry.name, "deck.json")))
    .map((entry) => join(decksRoot, entry.name));

  const packages: DeckPackageV1[] = [];
  const transforms: DeckTransformsV1[] = [];
  const loadedById = new Map<
    string,
    { directory: string; packageDefinition: DeckPackageV1; pilot: DeckPilotV1 | null }
  >();
  const issues: DeckValidationIssue[] = [];

  for (const directory of directories) {
    const loaded = loadPackageDirectory(directory);
    issues.push(...loaded.issues);
    if (loaded.packageDefinition === null) continue;
    packages.push(loaded.packageDefinition);
    loadedById.set(loaded.packageDefinition.id, {
      directory,
      packageDefinition: loaded.packageDefinition,
      pilot: loaded.pilot,
    });
    if (loaded.transforms !== null) transforms.push(loaded.transforms);
    else transforms.push({ formatVersion: 1, packageId: loaded.packageDefinition.id, cards: {} });
  }

  const registryReport = validateDeckRegistry(packages, transforms, { requireComplete: true });
  issues.push(...registryReport.issues);

  for (const [packageId, loaded] of loadedById) {
    const mappedSourcesComplete = Object.values(loaded.packageDefinition.cards).every(
      (mapping) => mapping !== undefined && existsSync(resolve(loaded.directory, mapping.file)),
    );
    const usePilotSourceScope = !release && loaded.pilot !== null && !mappedSourcesComplete;
    const selectedCardIds =
      usePilotSourceScope && loaded.pilot !== null ? pilotCardIdSet(loaded.pilot) : undefined;
    const sourceResult = validateLocalPackageSources(
      loaded.directory,
      loaded.packageDefinition,
      selectedCardIds === undefined ? {} : { cardIds: selectedCardIds },
    );
    issues.push(...prefixedIssues(packageId, sourceResult.issues));
    if (loaded.pilot !== null) {
      issues.push(
        ...prefixedIssues(
          packageId,
          validatePilotReadiness(loaded.pilot, loaded.packageDefinition),
        ),
      );
      if (usePilotSourceScope) {
        const unchecked =
          Object.keys(loaded.packageDefinition.cards).length - loaded.pilot.cards.length;
        if (unchecked > 0) {
          issues.push({
            severity: "warning",
            code: "DEVELOPMENT_SOURCE_SCOPE",
            path: packageId,
            message: `${unchecked} non-pilot source files remain unchecked until release validation.`,
          });
        }
      }
    }
    if (release) {
      issues.push(...prefixedIssues(packageId, validatePilotReleaseApproval(loaded.pilot)));
    }
  }

  printReport(
    issues,
    registryReport.summaries as unknown as readonly Record<string, unknown>[],
    json,
  );
  return hasValidationErrors(issues) ? 1 : 0;
}

function requireLockedInputs(packageDirectory: string) {
  const loaded = loadPackageDirectory(packageDirectory);
  if (
    loaded.packageDefinition === null ||
    loaded.transforms === null ||
    loaded.pilot === null ||
    hasValidationErrors(loaded.issues)
  ) {
    throw new Error("Deck package, transforms, and pilot must be valid before generation.");
  }
  const valid = loaded as {
    packageDefinition: DeckPackageV1;
    transforms: DeckTransformsV1;
    pilot: DeckPilotV1;
  };
  const readinessIssues = [
    ...validateDeckRegistry([valid.packageDefinition], [valid.transforms], {
      requireComplete: true,
    }).issues,
    ...validatePilotReadiness(valid.pilot, valid.packageDefinition),
    ...validateLocalPackageSources(packageDirectory, valid.packageDefinition, {
      cardIds: pilotCardIdSet(valid.pilot),
    }).issues,
  ];
  if (hasValidationErrors(readinessIssues)) {
    const details = readinessIssues
      .filter((entry) => entry.severity === "error")
      .map((entry) => `${entry.code} ${entry.path}: ${entry.message}`)
      .join("\n");
    throw new Error(`Deck artifact inputs failed the Phase 0D gate:\n${details}`);
  }
  return valid;
}

async function main(): Promise<number> {
  const [command = "validate", ...args] = process.argv.slice(2);
  if (command === "validate") return validateCommand(args);

  const packageArgument = args.find((argument) => !argument.startsWith("--"));
  const packageDirectory = resolve(repositoryRoot, packageArgument ?? "decks/new-primary-deck");
  if (command === "seed-pilot") {
    for (const path of seedTechnicalPilotSources(packageDirectory))
      process.stdout.write(`created ${path}\n`);
    return 0;
  }
  if (command === "generate") {
    const loaded = requireLockedInputs(packageDirectory);
    const paths = generateLockedDeckArtifacts(
      repositoryRoot,
      packageDirectory,
      loaded.packageDefinition,
      loaded.transforms,
      loaded.pilot,
    );
    for (const path of Object.values(paths)) process.stdout.write(`generated ${path}\n`);
    return 0;
  }
  if (command === "build") {
    const loaded = loadPackageDirectory(packageDirectory);
    if (loaded.packageDefinition === null) {
      throw new Error(`Cannot build invalid package at ${packageDirectory}.`);
    }
    const report = await buildDeckPackageV1({
      decksRoot: resolve(packageDirectory, ".."),
      packageId: loaded.packageDefinition.id,
      release: args.includes("--release"),
    });
    process.stdout.write(
      `${report.packageId}: built ${report.cards.length}/48 faces; runtime manifest ${report.completeRuntimeManifest ? "complete" : "withheld"}; approval ${report.approvalReady ? "ready" : "pending"}.\n`,
    );
    for (const entry of report.issues) {
      process.stdout.write(
        `${entry.severity === "error" ? "ERROR" : "WARN"} ${entry.code} ${entry.path}: ${entry.message}\n`,
      );
    }
    return args.includes("--release") && report.issues.some((entry) => entry.severity === "error")
      ? 1
      : 0;
  }
  process.stderr.write(
    "Usage: cli.ts validate [decks] [--release] [--json] | generate [deck] | build [deck] [--release] | seed-pilot [deck]\n",
  );
  return 2;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 2;
}
