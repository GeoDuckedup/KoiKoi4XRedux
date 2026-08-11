import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-3d-a/visual-directions");
const directions = Object.freeze([
  Object.freeze({ id: "ink-parchment", label: "Ink & Parchment" }),
  Object.freeze({ id: "moonlit-indigo", label: "Moonlit Indigo" }),
  Object.freeze({ id: "warm-ivory", label: "Warm Ivory" }),
]);
const viewports = Object.freeze([
  Object.freeze({ id: "mobile", width: 390, height: 844 }),
  Object.freeze({ id: "desktop", width: 1366, height: 768 }),
]);
const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildApplication() {
  const environment = { ...process.env, VITE_BASE_PATH: "/" };
  delete environment.VITE_VISUAL_DIRECTION;
  execFileSync("npm", ["run", "build", "--workspace", "@koikoi4x/web"], {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
  });
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relativePath =
        decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
      const filePath = resolve(distributionDirectory, relativePath);
      if (
        filePath !== resolve(distributionDirectory, "index.html") &&
        !filePath.startsWith(`${distributionDirectory}/`)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Visual-review server has no port.");
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function stopStaticServer(server) {
  server.closeAllConnections();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
  });
}

async function waitForApplication(page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.appReady === "true",
    undefined,
    { timeout: 60_000 },
  );
}

async function chooseTheme(page, directionId) {
  await page.locator("[data-options-trigger]").click();
  await page.locator(`[data-theme-option][value="${directionId}"]`).check();
  await page.waitForFunction(
    (expected) => JSON.parse(window.render_game_to_text()).theme.activeId === expected,
    directionId,
  );
  await page.locator("[data-options-close]").click();
}

async function selectFirstAvailableCard(page) {
  const cardId = await page
    .locator('[data-input-role="selectable"][data-card-id]')
    .first()
    .getAttribute("data-card-id");
  if (!cardId) throw new Error("The production seed did not expose a selectable hand card.");
  await page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`).click();
  return JSON.parse(await page.evaluate(() => window.render_game_to_text())).input;
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
buildApplication();
const { server, url } = await startStaticServer();
let browser;
const artifacts = [];

try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  });
  for (const direction of directions) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        deviceScaleFactor: 1,
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("requestfailed", (request) => {
        errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
      });
      await page.goto(url, { waitUntil: "networkidle" });
      await waitForApplication(page);
      const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(initial.theme.activeId === "ink-parchment", "Fresh profile did not default to Ink.");
      await chooseTheme(page, direction.id);
      const selected = await selectFirstAvailableCard(page);
      const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(state.theme.activeId === direction.id, `${direction.id} was not applied at runtime.`);
      assert(state.cards.cardViewCount === 48, `${direction.id} recreated the CardView registry.`);
      assert(state.diagnostics.clippedZones.length === 0, `${direction.id} clipped a board zone.`);
      assert(selected.selectedCardId !== null, `${direction.id} did not retain selection.`);
      assert(errors.length === 0, `${direction.id} browser errors: ${errors.join(" | ")}`);
      const path = resolve(outputDirectory, `${direction.id}-${viewport.id}-selected.png`);
      await page.screenshot({ path, fullPage: true });
      artifacts.push({ direction: direction.id, viewport: viewport.id, state: "selected", path });
      await context.close();
    }
  }
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify({ directions, artifacts, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Phase 3D runtime visual review generated ${artifacts.length} screenshots from one production build in ${outputDirectory}.\n`,
  );
} finally {
  await browser?.close();
  await stopStaticServer(server);
}
