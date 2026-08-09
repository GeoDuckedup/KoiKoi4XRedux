import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-2a/e2e");
const baseUrl = "http://127.0.0.1:4173";
const requestedBasePath = process.env.SMOKE_BASE_PATH ?? "/";
const smokeBasePath = `/${requestedBasePath.replace(/^\/+|\/+$/g, "")}`.replace(/^\/$/, "/");
const mountedBasePath = smokeBasePath === "/" ? "/" : `${smokeBasePath}/`;
const pageUrl = `${baseUrl}${mountedBasePath}`;
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
  { width: 320, height: 568, mode: "compactPortrait" },
  { width: 360, height: 640, mode: "compactPortrait" },
  { width: 390, height: 844, mode: "portrait" },
  { width: 768, height: 1024, mode: "portrait" },
  { width: 844, height: 390, mode: "landscape" },
  { width: 1366, height: 768, mode: "desktop" },
  { width: 1920, height: 1080, mode: "desktop" },
];
const expectedLayerOrder = [
  "BackgroundLayer",
  "OpponentHandLayer",
  "OpponentCaptureLayer",
  "FieldLayer",
  "DrawPileLayer",
  "RevealLayer",
  "PlayerCaptureLayer",
  "PlayerHandLayer",
  "EffectsLayer",
  "InteractionOverlayLayer",
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
      const pathname = decodeURIComponent(requestUrl.pathname);
      if (mountedBasePath !== "/" && !pathname.startsWith(mountedBasePath)) {
        response.writeHead(404).end("Not found");
        return;
      }
      const mountedPath =
        mountedBasePath === "/" ? pathname : pathname.slice(mountedBasePath.length);
      const relativePath = mountedPath.replace(/^\/+/, "") || "index.html";
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
process.stdout.write(`Static smoke server ready at ${pageUrl}.\n`);

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  });
  const page = await browser.newPage();
  const browserErrors = [];
  const networkErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    networkErrors.push(
      `requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  const textStates = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");

    const result = await page.evaluate(() => {
      const before = JSON.parse(window.render_game_to_text());
      window.advanceTime(250);
      const after = JSON.parse(window.render_game_to_text());
      const canvas = document.querySelector("canvas");
      const heading = document.querySelector("h1");
      const status = document.querySelector("[data-table-status]");
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

    assert(
      result.before.screen === "boardSkeleton",
      "render_game_to_text must identify the Phase 2A table skeleton.",
    );
    assert(result.before.ready === true, "The table state must report ready.");
    assert(result.before.canvasCount === 1, "The table surface must contain exactly one canvas.");
    assert(result.after.simulationTimeMs === 250, "advanceTime must advance exactly 250ms.");
    assert(
      JSON.stringify(result.before.layout) === JSON.stringify(result.after.layout),
      "Advancing deterministic time must not change Phase 2A geometry.",
    );
    assert(result.heading === "KoiKoi4x", "The semantic page heading is missing.");
    assert(
      result.status?.includes("Responsive table ready"),
      "The accessible ready status is missing.",
    );
    assert(
      result.canvasRect && result.canvasRect.width > 0 && result.canvasRect.height > 0,
      "The Pixi canvas has no visible area.",
    );
    assert(
      JSON.stringify(result.before.layerOrder) === JSON.stringify(expectedLayerOrder),
      "The prescribed Pixi layer order changed.",
    );
    assert(
      JSON.stringify(result.before.scene.layers.map(({ label }) => label)) ===
        JSON.stringify(expectedLayerOrder),
      "The actual Pixi scene graph does not match the prescribed layer order.",
    );
    assert(
      JSON.stringify(result.before.scene) === JSON.stringify(result.after.scene),
      "Deterministic time advance replaced a Pixi scene-layer instance.",
    );
    assert(
      result.before.layout.mode === viewport.mode,
      `Expected ${viewport.mode} at ${viewport.width}x${viewport.height}, received ${result.before.layout.mode}.`,
    );
    assert(result.before.layout.cardZoneCount === 14, "All 14 logical card zones must exist.");
    assert(
      result.before.layout.fieldSlotCount === 8,
      "The table must expose eight stable field slots.",
    );
    assert(
      result.before.layout.uiZones.actionBar.height >= 44,
      "The reserved action bar must meet the 44 CSS-pixel target.",
    );
    assert(
      result.before.diagnostics.clippedZones.length === 0 &&
        result.before.diagnostics.invalidZones.length === 0 &&
        result.before.diagnostics.overlapViolations.length === 0,
      `Layout diagnostics failed: ${JSON.stringify(result.before.diagnostics)}`,
    );
    assert(
      Math.abs(result.before.boardViewport.width - result.canvasRect.width) <= 1 &&
        Math.abs(result.before.boardViewport.height - result.canvasRect.height) <= 1,
      "The diagnostic board viewport must match the rendered canvas bounds.",
    );

    textStates.push({ viewport, state: result.after, canvasRect: result.canvasRect });
    await page.screenshot({
      path: resolve(outputDirectory, `table-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    process.stdout.write(`Validated ${viewport.width}x${viewport.height}.\n`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
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

  const sceneBeforeResize = await page.evaluate(
    () => JSON.parse(window.render_game_to_text()).scene,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.layout.mode === "landscape" && state.boardViewport.width >= 800;
  });
  const resizedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    JSON.stringify(sceneBeforeResize) === JSON.stringify(resizedState.scene),
    "Portrait-to-landscape resize replaced a persistent Pixi scene-layer instance.",
  );
  assert(
    resizedState.diagnostics.clippedZones.length === 0 &&
      resizedState.diagnostics.invalidZones.length === 0 &&
      resizedState.diagnostics.overlapViolations.length === 0,
    "Live portrait-to-landscape resize produced an invalid layout.",
  );

  assert(browserErrors.length === 0, `Browser errors:\n${browserErrors.join("\n")}`);
  assert(networkErrors.length === 0, `Network errors:\n${networkErrors.join("\n")}`);
  await writeFile(
    resolve(outputDirectory, "render-game-to-text.json"),
    `${JSON.stringify(textStates, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Responsive table smoke passed for ${viewports.length} viewports at ${mountedBasePath}.\n`,
  );
} finally {
  await browser?.close();
  await stopStaticServer(staticServer);
}
