import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const engineRoot = join(repositoryRoot, "packages/engine");
const engineSourceRoot = join(engineRoot, "src");

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? collectTypeScriptFiles(path)
      : extname(path) === ".ts"
        ? [path]
        : [];
  });
}

describe("headless engine architecture boundary", () => {
  it("does not import browser, rendering, Firebase, or web-app modules", () => {
    const forbiddenModule =
      /(?:from\s+|import\s*\()\s*["'](?:pixi\.js(?:\/[^"']*)?|firebase(?:\/[^"']*)?|@firebase\/[^"']+|@koikoi4x\/web(?:\/[^"']*)?|apps\/[^"']+)["']/u;

    for (const sourcePath of collectTypeScriptFiles(engineSourceRoot)) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenModule);
    }
  });

  it("does not add DOM libraries or forbidden runtime dependencies", () => {
    const tsconfig = readFileSync(join(engineRoot, "tsconfig.json"), "utf8");
    const packageManifest = JSON.parse(readFileSync(join(engineRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(tsconfig).not.toMatch(/\bDOM(?:\.Iterable)?\b/u);
    expect(Object.keys(packageManifest.dependencies ?? {})).not.toEqual(
      expect.arrayContaining(["pixi.js", "firebase"]),
    );
  });
});
