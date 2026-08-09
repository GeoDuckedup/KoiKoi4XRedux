import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { CARD_IDS, type CardId } from "@koikoi4x/engine";

import { renderArtGuideSvg } from "../art-guide.ts";
import { ART_SPEC_V1 } from "../art-spec.ts";
import {
  deckPackageJsonSchemaV1,
  deckTransformsJsonSchemaV1,
  renderJsonSchema,
} from "../json-schemas.ts";
import { createDerivativePlan, resolveCardTransform } from "../transform.ts";
import type { DeckPackageV1, DeckPilotV1, DeckTransformsV1 } from "../types.ts";
import {
  readSourceImageMetadata,
  sourceFileDigest,
  validateLocalPackageSources,
} from "./source-validation.ts";

export const DECK_ARTIFACT_BUILDER_VERSION = 1 as const;

export interface GeneratedArtifactPaths {
  readonly deckSchema: string;
  readonly transformSchema: string;
  readonly artGuide: string;
  readonly pilotImportPlan: string;
}

export function buildPilotImportPlan(
  packageDirectory: string,
  packageDefinition: DeckPackageV1,
  transforms: DeckTransformsV1,
  pilot: DeckPilotV1,
): Readonly<Record<string, unknown>> {
  const sourceValidation = validateLocalPackageSources(packageDirectory, packageDefinition);
  const completeRuntimeManifest =
    CARD_IDS.every((cardId) => sourceValidation.metadataByCardId[cardId] !== undefined) &&
    !sourceValidation.issues.some((entry) => entry.severity === "error");
  const cards = pilot.cards.map((assignment) => {
    const mapping = packageDefinition.cards[assignment.cardId];
    if (mapping === undefined) {
      throw new Error(`Pilot source mapping missing for ${assignment.cardId}.`);
    }
    const sourcePath = resolve(packageDirectory, mapping.file);
    const source = readSourceImageMetadata(sourcePath);
    const transform = resolveCardTransform(
      packageDefinition.sourceDefaults,
      transforms.cards[assignment.cardId],
    );
    return Object.freeze({
      role: assignment.role,
      cardId: assignment.cardId,
      source: Object.freeze({
        file: mapping.file,
        sha256: sourceFileDigest(sourcePath),
        width: source.width,
        height: source.height,
        format: source.format,
      }),
      transform,
      derivatives: Object.freeze({
        table: createDerivativePlan(source, ART_SPEC_V1.derivatives.table, transform),
        thumbnail: createDerivativePlan(source, ART_SPEC_V1.derivatives.thumbnail, transform),
      }),
    });
  });

  return Object.freeze({
    formatVersion: 1,
    builderVersion: DECK_ARTIFACT_BUILDER_VERSION,
    artSpecVersion: ART_SPEC_V1.version,
    packageId: packageDefinition.id,
    packageVersion: packageDefinition.version,
    pilotApprovalStatus: pilot.approvalStatus,
    completeRuntimeManifest,
    note: "Deterministic pilot source/transform plan; full-deck visual approval remains a separate gate.",
    cards: Object.freeze(cards),
  });
}

export function generateLockedDeckArtifacts(
  repositoryRoot: string,
  packageDirectory: string,
  packageDefinition: DeckPackageV1,
  transforms: DeckTransformsV1,
  pilot: DeckPilotV1,
): GeneratedArtifactPaths {
  const schemaDirectory = join(repositoryRoot, "packages/deck-format/schemas");
  const docsGeneratedDirectory = join(repositoryRoot, "docs/generated");
  const deckGeneratedDirectory = join(packageDirectory, "generated");
  mkdirSync(schemaDirectory, { recursive: true });
  mkdirSync(docsGeneratedDirectory, { recursive: true });
  mkdirSync(deckGeneratedDirectory, { recursive: true });

  const paths = Object.freeze({
    deckSchema: join(schemaDirectory, "deck-package-v1.schema.json"),
    transformSchema: join(schemaDirectory, "deck-transforms-v1.schema.json"),
    artGuide: join(docsGeneratedDirectory, "koikoi4x-art-guide-v1.svg"),
    pilotImportPlan: join(deckGeneratedDirectory, "pilot-import-plan.v1.json"),
  });
  writeFileSync(paths.deckSchema, renderJsonSchema(deckPackageJsonSchemaV1()));
  writeFileSync(paths.transformSchema, renderJsonSchema(deckTransformsJsonSchemaV1()));
  writeFileSync(paths.artGuide, renderArtGuideSvg());
  writeFileSync(
    paths.pilotImportPlan,
    `${JSON.stringify(buildPilotImportPlan(packageDirectory, packageDefinition, transforms, pilot), null, 2)}\n`,
  );
  return paths;
}

export function pilotCardIdSet(pilot: DeckPilotV1): ReadonlySet<CardId> {
  return new Set(pilot.cards.map((entry) => entry.cardId));
}
