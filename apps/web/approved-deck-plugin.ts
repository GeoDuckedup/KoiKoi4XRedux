import { cp, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { Plugin, ResolvedConfig } from "vite";

const DECK_ID = "new-primary-deck";
const URL_PREFIX = `/decks/${DECK_ID}/`;
const CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
});

function runtimeDirectory(): string {
  return resolve(import.meta.dirname, "../../decks/new-primary-deck/generated/runtime");
}

async function assertApprovedRuntimeDeck(directory: string): Promise<void> {
  const manifest = JSON.parse(
    await readFile(resolve(directory, "manifest.v1.json"), "utf8"),
  ) as Record<string, unknown>;
  const faceCount =
    typeof manifest["cardFaces"] === "object" && manifest["cardFaces"] !== null
      ? Object.keys(manifest["cardFaces"]).length
      : 0;
  if (
    manifest["runtimeFormatVersion"] !== 1 ||
    manifest["packageId"] !== DECK_ID ||
    manifest["approvalStatus"] !== "approved" ||
    faceCount !== 48 ||
    typeof manifest["cardBack"] !== "object" ||
    manifest["cardBack"] === null
  ) {
    throw new Error(
      `APPROVED_DECK_REQUIRED: expected approved, complete ${DECK_ID} runtime manifest.`,
    );
  }
}

function requestAssetPath(requestUrl: string): string | null {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const markerIndex = pathname.indexOf(URL_PREFIX);
  if (markerIndex < 0) return null;
  const relativePath = pathname.slice(markerIndex + URL_PREFIX.length);
  if (
    relativePath.length === 0 ||
    relativePath.includes("\\") ||
    relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    return null;
  }
  return relativePath;
}

export function approvedRuntimeDeckPlugin(): Plugin {
  let config: ResolvedConfig | null = null;
  const sourceDirectory = runtimeDirectory();
  return {
    name: "koikoi4x-approved-runtime-deck",
    configResolved(resolved) {
      config = resolved;
    },
    async buildStart() {
      await assertApprovedRuntimeDeck(sourceDirectory);
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const relativePath = requestAssetPath(request.url ?? "");
        if (relativePath === null) {
          next();
          return;
        }
        const filePath = resolve(sourceDirectory, relativePath);
        if (!filePath.startsWith(`${sourceDirectory}${sep}`)) {
          response.writeHead(403).end("Forbidden");
          return;
        }
        try {
          const body = await readFile(filePath);
          response.writeHead(200, {
            "Cache-Control": "no-cache",
            "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
          });
          response.end(request.method === "HEAD" ? undefined : body);
        } catch {
          next();
        }
      });
    },
    async closeBundle() {
      if (!config || config.command !== "build") return;
      const destination = resolve(config.root, config.build.outDir, "decks", DECK_ID);
      await cp(sourceDirectory, destination, { recursive: true, force: true });
    },
  };
}
