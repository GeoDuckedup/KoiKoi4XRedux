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
      /(?:from\s+|import\s*\()\s*["'](?:pixi\.js(?:\/[^"']*)?|firebase(?:\/[^"']*)?|@firebase\/[^"']+|@koikoi4x\/(?:web|deck-format|protocol)(?:\/[^"']*)?|apps\/[^"']+)["']/u;

    for (const sourcePath of collectTypeScriptFiles(engineSourceRoot)) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenModule);
    }
  });

  it("does not use ambient randomness, clocks, or timers", () => {
    const forbiddenNondeterminism =
      /\b(?:Math\.random|Date\.now|performance\.now|crypto\.(?:getRandomValues|randomUUID)|new\s+Date|setTimeout|setInterval|setImmediate|requestAnimationFrame)\s*\(/u;
    for (const sourcePath of collectTypeScriptFiles(engineSourceRoot)) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenNondeterminism);
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

  it("keeps artwork and deck-package fields out of card-domain types", () => {
    const forbiddenCardField =
      /(?:^|\n)\s*(?:readonly\s+)?[A-Za-z_$][\w$]*(?:asset|atlas|coordinate|crop|file|focus|frame|image|package|path|source|sprite|texture|transform|url)[\w$]*\??\s*:/iu;
    const cardsRoot = join(engineSourceRoot, "cards");

    for (const sourcePath of collectTypeScriptFiles(cardsRoot)) {
      expect(readFileSync(sourcePath, "utf8"), sourcePath).not.toMatch(forbiddenCardField);
    }
  });
});
