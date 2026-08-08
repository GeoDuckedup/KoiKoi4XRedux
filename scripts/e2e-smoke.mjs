import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-0b/e2e");
const baseUrl = "http://127.0.0.1:4173";
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", baseUrl);
      const relativePath =
        decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
      const filePath = resolve(distributionDirectory, relativePath);
      const allowedPrefix = `${distributionDirectory}/`;

      if (
        filePath !== resolve(distributionDirectory, "index.html") &&
        !filePath.startsWith(allowedPrefix)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const body = await readFile(filePath);
      const contentType = contentTypes[extname(filePath)] ?? "application/octet-stream";
      response.writeHead(200, { "Content-Type": contentType });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(4173, "127.0.0.1", resolvePromise);
  });
  return server;
}

async function stopStaticServer(server) {
  server.closeAllConnections();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise();
      }
    });
  });
}

await mkdir(outputDirectory, { recursive: true });
const staticServer = await startStaticServer();
process.stdout.write(`Static smoke server ready at ${baseUrl}.\n`);

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  const textStates = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");

    const result = await page.evaluate(() => {
      const before = JSON.parse(window.render_game_to_text());
      window.advanceTime(250);
      const after = JSON.parse(window.render_game_to_text());
      const canvas = document.querySelector("canvas");
      const heading = document.querySelector("h1");
      const status = document.querySelector("[data-boot-status]");
      const canvasRect = canvas?.getBoundingClientRect();

      return {
        after,
        before,
        canvasRect: canvasRect
          ? { height: Math.round(canvasRect.height), width: Math.round(canvasRect.width) }
          : null,
        heading: heading?.textContent,
        status: status?.textContent,
      };
    });

    assert(result.before.screen === "boot", "render_game_to_text must identify the boot screen.");
    assert(result.before.ready === true, "The boot state must report ready.");
    assert(result.before.canvasCount === 1, "The boot surface must contain exactly one canvas.");
    assert(result.after.simulationTimeMs === 250, "advanceTime must advance exactly 250ms.");
    assert(result.heading === "KoiKoi4x", "The semantic page heading is missing.");
    assert(
      result.status?.includes("Rendering surface ready"),
      "The accessible ready status is missing.",
    );
    assert(
      result.canvasRect && result.canvasRect.width > 0 && result.canvasRect.height > 0,
      "The Pixi canvas has no visible area.",
    );

    textStates.push({ viewport, state: result.after, canvasRect: result.canvasRect });
    await page.screenshot({
      path: resolve(outputDirectory, `boot-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    process.stdout.write(`Validated ${viewport.width}x${viewport.height}.\n`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");
  assert(await page.evaluate(() => document.fullscreenEnabled), "Fullscreen API is unavailable.");

  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await page.waitForFunction(() => document.fullscreenElement !== null);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.fullscreenElement === null);

  await page.keyboard.press("f");
  await page.waitForFunction(() => document.fullscreenElement !== null);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.fullscreenElement === null);

  assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join("\n")}`);
  await writeFile(
    resolve(outputDirectory, "render-game-to-text.json"),
    `${JSON.stringify(textStates, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(`Smoke test passed for ${viewports.length} viewports.\n`);
} finally {
  await browser?.close();
  await stopStaticServer(staticServer);
}
