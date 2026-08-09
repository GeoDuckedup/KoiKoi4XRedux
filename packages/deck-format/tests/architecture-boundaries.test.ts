import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(import.meta.dirname, "..");
const sourceRoot = join(packageRoot, "src");

function portableSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node" || entry.name === "cli.ts") return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? portableSourceFiles(path) : extname(path) === ".ts" ? [path] : [];
  });
}

describe("deck-format architecture boundary", () => {
  it("keeps the portable format/resolver core free of Node, browser, rendering, and backend imports", () => {
    const forbiddenImport =
      /(?:from\s+|import\s*\()\s*["'](?:node:[^"']+|pixi\.js(?:\/[^"']*)?|firebase(?:\/[^"']*)?|@firebase\/[^"']+|@koikoi4x\/web(?:\/[^"']*)?|apps\/[^"']+)["']/u;
    for (const path of portableSourceFiles(sourceRoot)) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(forbiddenImport);
    }
  });

  it("keeps Sharp confined to the Node authoring adapter dependency boundary", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies).toEqual({
      "@koikoi4x/engine": "0.0.0",
      sharp: "^0.35.3",
    });
    for (const path of portableSourceFiles(sourceRoot)) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/from\s+["']sharp["']/u);
    }
  });

  it("ASSET-003 / ART2E-012 keeps Node authoring adapters out of production web source", () => {
    const webSourcePaths = portableSourceFiles(resolve("apps/web/src"));
    const forbiddenImport =
      /(?:from\s+|import\s*\()\s*["'](?:node:[^"']+|@koikoi4x\/deck-format\/node(?:\/[^"']*)?)["']/u;

    expect(webSourcePaths.length).toBeGreaterThan(0);
    for (const sourcePath of webSourcePaths) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenImport);
    }
  });
});
