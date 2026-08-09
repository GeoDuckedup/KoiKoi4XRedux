import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { resolve } from "node:path";

import { isCardId, type CardId } from "@koikoi4x/engine";
import type { Plugin } from "vite";

import {
  assignWorkshopSourceV1,
  autoAssignWorkshopSourcesV1,
  inspectWorkshopPackageV1,
  listWorkshopPackagesV1,
  rebuildWorkshopPackageV1,
  resolveWorkshopGeneratedPathV1,
  resolveWorkshopSourcePathV1,
  saveWorkshopTransformV1,
  sourceMediaType,
} from "@koikoi4x/deck-format/node";

export interface WorkshopPluginConfiguration {
  readonly plugin: Plugin;
  readonly token: string;
}

const API_ROOT = "/__deck-workshop/v1";

async function jsonBody(request: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    length += buffer.length;
    if (length > 48 * 1024 * 1024) throw new Error("Workshop request is too large.");
    chunks.push(buffer);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Workshop request must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}

function sendJson(response: ServerResponse, value: unknown, status = 200): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(`${JSON.stringify(value)}\n`);
}

export function createWorkshopVitePlugin(): WorkshopPluginConfiguration {
  const token = randomUUID();
  const decksRoot = resolve(import.meta.dirname, "../../decks");
  const plugin: Plugin = {
    name: "koikoi4x-deck-workshop",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (!url.pathname.startsWith(API_ROOT)) {
          next();
          return;
        }
        if (request.headers["x-workshop-token"] !== token) {
          sendJson(response, { error: "Workshop token rejected." }, 403);
          return;
        }
        try {
          const packageId = url.searchParams.get("packageId") ?? "new-primary-deck";
          if (url.pathname === `${API_ROOT}/packages` && request.method === "GET") {
            sendJson(response, listWorkshopPackagesV1(decksRoot));
            return;
          }
          if (url.pathname === `${API_ROOT}/package` && request.method === "GET") {
            sendJson(response, inspectWorkshopPackageV1(decksRoot, packageId));
            return;
          }
          if (url.pathname === `${API_ROOT}/source` && request.method === "GET") {
            const rawCardId = url.searchParams.get("cardId");
            const cardId =
              rawCardId === "back" ? "back" : rawCardId && isCardId(rawCardId) ? rawCardId : null;
            if (cardId === null) throw new Error("A canonical cardId or back is required.");
            const path = resolveWorkshopSourcePathV1(decksRoot, packageId, cardId);
            response.statusCode = 200;
            response.setHeader("content-type", sourceMediaType(path));
            response.setHeader("cache-control", "no-store");
            response.end(await readFile(path));
            return;
          }
          if (url.pathname === `${API_ROOT}/generated` && request.method === "GET") {
            const kind = url.searchParams.get("kind");
            if (kind !== "art-review" && kind !== "gameplay-390x844") {
              throw new Error("Unknown contact-sheet kind.");
            }
            const path = resolveWorkshopGeneratedPathV1(decksRoot, packageId, kind);
            response.statusCode = 200;
            response.setHeader("content-type", "image/png");
            response.setHeader("cache-control", "no-store");
            response.end(await readFile(path));
            return;
          }
          if (request.method !== "POST") throw new Error("Unsupported Workshop request.");
          const body = await jsonBody(request);
          const bodyPackageId = requiredString(body.packageId, "packageId");
          if (url.pathname === `${API_ROOT}/transform`) {
            const cardId = requiredString(body.cardId, "cardId");
            if (!isCardId(cardId)) throw new Error("Unknown canonical CardId.");
            const transform = body.transform === null ? null : (body.transform as never);
            sendJson(
              response,
              await saveWorkshopTransformV1({
                cardId,
                decksRoot,
                packageId: bodyPackageId,
                transform,
              }),
            );
            return;
          }
          if (url.pathname === `${API_ROOT}/auto-assign`) {
            sendJson(response, await autoAssignWorkshopSourcesV1(decksRoot, bodyPackageId));
            return;
          }
          if (url.pathname === `${API_ROOT}/assign-source`) {
            const rawCardId = requiredString(body.cardId, "cardId");
            const cardId = rawCardId === "back" ? "back" : rawCardId;
            if (cardId !== "back" && !isCardId(cardId)) {
              throw new Error("Unknown canonical CardId.");
            }
            const mediaType = requiredString(body.mediaType, "mediaType");
            if (
              mediaType !== "image/png" &&
              mediaType !== "image/jpeg" &&
              mediaType !== "image/webp"
            ) {
              throw new Error("Only PNG, JPEG, and WebP source files are accepted.");
            }
            sendJson(
              response,
              await assignWorkshopSourceV1({
                base64: requiredString(body.base64, "base64"),
                cardId,
                decksRoot,
                mediaType,
                packageId: bodyPackageId,
              }),
            );
            return;
          }
          if (url.pathname === `${API_ROOT}/rebuild`) {
            const selected =
              body.cardId === undefined
                ? undefined
                : new Set<CardId>([
                    (() => {
                      const cardId = requiredString(body.cardId, "cardId");
                      if (!isCardId(cardId)) throw new Error("Unknown canonical CardId.");
                      return cardId;
                    })(),
                  ]);
            sendJson(response, await rebuildWorkshopPackageV1(decksRoot, bodyPackageId, selected));
            return;
          }
          throw new Error("Unknown Workshop endpoint.");
        } catch (error) {
          sendJson(
            response,
            { error: error instanceof Error ? error.message : String(error) },
            400,
          );
        }
      });
    },
  };
  return Object.freeze({ plugin, token });
}
