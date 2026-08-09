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

  it("depends only on the canonical engine package", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies).toEqual({ "@koikoi4x/engine": "0.0.0" });
  });

  it("ASSET-003 keeps Node authoring adapters and platform modules out of the web runtime", () => {
    const webSourcePaths = portableSourceFiles(resolve("apps/web/src"));
    const forbiddenImport =
      /(?:from\s+|import\s*\()\s*["'](?:node:[^"']+|@koikoi4x\/deck-format\/node(?:\/[^"']*)?)["']/u;

    expect(webSourcePaths.length).toBeGreaterThan(0);
    for (const sourcePath of webSourcePaths) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenImport);
    }
  });
});
