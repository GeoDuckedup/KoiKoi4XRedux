import { CARD_IDS } from "@koikoi4x/engine";

import { ART_SPEC_V1 } from "./art-spec.ts";

const imageExtensionPattern = "(?:[pP][nN][gG]|[jJ][pP][eE]?[gG]|[wW][eE][bB][pP])";

function assetPathPattern(root: "source" | "preview"): string {
  return `^${root}/(?!\\.{1,2}(?:/|$))(?!.*\\/\\.{1,2}(?:/|$))(?!.*\\/\\/)(?!.*[\\\\?#])[^/]+(?:/[^/]+)*\\.${imageExtensionPattern}$`;
}

const sourceAssetPathPattern = assetPathPattern("source");
const previewAssetPathPattern = assetPathPattern("preview");
const nonblankStringSchema = Object.freeze({ type: "string", pattern: "\\S" });

const cardMappingSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["file"],
  properties: Object.freeze({
    file: Object.freeze({ type: "string", pattern: sourceAssetPathPattern }),
  }),
});

const autoTransformSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["mode", "fit", "focusX", "focusY"],
  properties: Object.freeze({
    mode: Object.freeze({ const: "auto" }),
    fit: Object.freeze({ enum: ["cover", "contain"] }),
    focusX: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
    focusY: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
  }),
});

const manualTransformSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["mode", "crop", "zoom", "rotationDeg"],
  properties: Object.freeze({
    mode: Object.freeze({ const: "manual" }),
    crop: Object.freeze({
      type: "object",
      additionalProperties: false,
      $comment: "The runtime validator also enforces x + width <= 1 and y + height <= 1.",
      required: ["x", "y", "width", "height"],
      properties: Object.freeze({
        x: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
        y: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
        width: Object.freeze({ type: "number", exclusiveMinimum: 0, maximum: 1 }),
        height: Object.freeze({ type: "number", exclusiveMinimum: 0, maximum: 1 }),
      }),
    }),
    zoom: Object.freeze({ type: "number", minimum: 1 }),
    rotationDeg: Object.freeze({ type: "number" }),
  }),
});

export function deckPackageJsonSchemaV1(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://koikoi4x.local/schemas/deck-package-v1.schema.json",
    title: "KoiKoi4x Deck Package v1",
    type: "object",
    additionalProperties: false,
    required: [
      "formatVersion",
      "id",
      "version",
      "name",
      "author",
      "license",
      "extends",
      "framePolicy",
      "cards",
    ],
    properties: {
      formatVersion: { const: 1 },
      id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$" },
      name: nonblankStringSchema,
      author: nonblankStringSchema,
      license: nonblankStringSchema,
      extends: {
        anyOf: [{ type: "null" }, { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }],
      },
      framePolicy: { const: "game" },
      sourceDefaults: autoTransformSchema,
      cards: {
        type: "object",
        propertyNames: { enum: CARD_IDS },
        additionalProperties: cardMappingSchema,
      },
      backs: {
        type: "object",
        additionalProperties: false,
        properties: {
          default: { type: "string", pattern: sourceAssetPathPattern },
        },
      },
      preview: {
        type: "object",
        additionalProperties: false,
        required: ["featuredCardIds"],
        properties: {
          thumbnail: { type: "string", pattern: previewAssetPathPattern },
          showcase: { type: "string", pattern: previewAssetPathPattern },
          featuredCardIds: { type: "array", uniqueItems: true, items: { enum: CARD_IDS } },
        },
      },
      qualityExceptions: {
        type: "object",
        propertyNames: { enum: CARD_IDS },
        additionalProperties: {
          type: "object",
          additionalProperties: false,
          required: ["allowBelowReleaseMinimum", "approvedBy", "approvedOn", "reason"],
          properties: {
            allowBelowReleaseMinimum: { const: true },
            approvedBy: nonblankStringSchema,
            approvedOn: nonblankStringSchema,
            reason: nonblankStringSchema,
          },
        },
      },
    },
    $defs: {
      artSpecVersion: { const: ART_SPEC_V1.version },
    },
  });
}

export function deckTransformsJsonSchemaV1(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://koikoi4x.local/schemas/deck-transforms-v1.schema.json",
    title: "KoiKoi4x Normalized Deck Transforms v1",
    type: "object",
    additionalProperties: false,
    required: ["formatVersion", "packageId", "cards"],
    properties: {
      formatVersion: { const: 1 },
      packageId: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      cards: {
        type: "object",
        propertyNames: { enum: CARD_IDS },
        additionalProperties: { oneOf: [autoTransformSchema, manualTransformSchema] },
      },
    },
  });
}

export function renderJsonSchema(schema: Readonly<Record<string, unknown>>): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}
