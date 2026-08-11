import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-3d-a/visual-directions");
const directions = Object.freeze([
  Object.freeze({ id: "ink-parchment", label: "A · Ink, Parchment & Vermilion" }),
  Object.freeze({ id: "moonlit-indigo", label: "B · Moonlit Indigo & Brass" }),
  Object.freeze({ id: "warm-ivory", label: "C · Warm Ivory & Slate Blue" }),
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

function buildApplication(directionId) {
  const environment = { ...process.env, VITE_BASE_PATH: "/" };
  if (directionId) environment.VITE_VISUAL_DIRECTION = directionId;
  else delete environment.VITE_VISUAL_DIRECTION;
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
      const allowedPrefix = `${distributionDirectory}/`;
      if (
        filePath !== resolve(distributionDirectory, "index.html") &&
        !filePath.startsWith(allowedPrefix)
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

async function waitForApplication(page, expectedDirection) {
  await page.waitForFunction(
    (direction) =>
      document.documentElement.dataset.appReady === "true" &&
      document.documentElement.dataset.visualDirection === direction,
    expectedDirection,
    { timeout: 60_000 },
  );
}

async function selectFirstAvailableCard(page) {
  const cardIds = await page
    .locator('[data-input-role="selectable"][data-card-id]')
    .evaluateAll((buttons) => buttons.map((button) => button.dataset.cardId).filter(Boolean));
  const cardId = cardIds[0];
  if (!cardId) throw new Error("The visual-review seed did not expose a selectable hand card.");
  await page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`).click();
  return page.evaluate(() => JSON.parse(window.render_game_to_text()).input);
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
const { server, url } = await startStaticServer();
let browser;
const artifacts = [];

try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  });
  for (const direction of directions) {
    buildApplication(direction.id);
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
      await waitForApplication(page, direction.id);
      const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
      assert(state.ready === true, `${direction.id}/${viewport.id} did not become ready.`);
      assert(
        state.diagnostics.clippedZones.length === 0,
        `${direction.id}/${viewport.id} clipped a zone.`,
      );
      assert(
        state.diagnostics.invalidZones.length === 0,
        `${direction.id}/${viewport.id} invalidated a zone.`,
      );

      const initialPath = resolve(outputDirectory, `${direction.id}-${viewport.id}-initial.png`);
      await page.screenshot({ path: initialPath });
      artifacts.push({
        direction: direction.id,
        state: "initial",
        viewport: viewport.id,
        path: initialPath,
      });

      if (viewport.id === "mobile") {
        const selected = await selectFirstAvailableCard(page);
        assert(selected.selectedCardId !== null, `${direction.id} did not retain selection.`);
        const selectedPath = resolve(
          outputDirectory,
          `${direction.id}-${viewport.id}-selected.png`,
        );
        await page.screenshot({ path: selectedPath });
        artifacts.push({
          direction: direction.id,
          legalTargetCardIds: selected.legalTargetCardIds,
          selectedCardId: selected.selectedCardId,
          state: "selected",
          viewport: viewport.id,
          path: selectedPath,
        });
      }

      assert(
        errors.length === 0,
        `${direction.id}/${viewport.id} browser errors: ${errors.join(" | ")}`,
      );
      await context.close();
    }
  }

  buildApplication();
  const defaultContext = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: 390, height: 844 },
  });
  const defaultPage = await defaultContext.newPage();
  const defaultErrors = [];
  defaultPage.on("console", (message) => {
    if (message.type() === "error") defaultErrors.push(`console: ${message.text()}`);
  });
  defaultPage.on("pageerror", (error) => defaultErrors.push(`pageerror: ${error.message}`));
  defaultPage.on("requestfailed", (request) => {
    defaultErrors.push(
      `requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  await defaultPage.goto(url, { waitUntil: "networkidle" });
  await defaultPage.waitForFunction(
    () =>
      document.documentElement.dataset.appReady === "true" &&
      document.documentElement.dataset.visualDirection === undefined,
    undefined,
    { timeout: 60_000 },
  );
  const defaultState = await defaultPage.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(defaultState.ready === true, "The production-default build did not become ready.");
  assert(
    defaultState.diagnostics.clippedZones.length === 0,
    "The production-default build clipped a zone.",
  );
  assert(
    defaultState.diagnostics.invalidZones.length === 0,
    "The production-default build invalidated a zone.",
  );
  assert(
    defaultErrors.length === 0,
    `The production-default build emitted browser errors: ${defaultErrors.join(" | ")}`,
  );
  const defaultPath = resolve(outputDirectory, "production-default-mobile.png");
  await defaultPage.screenshot({ path: defaultPath });
  artifacts.push({
    direction: "production-default",
    state: "unchanged-reference",
    viewport: "mobile",
    path: defaultPath,
  });
  await defaultContext.close();

  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify({ directions, artifacts, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Phase 3D-A visual review generated ${artifacts.length} screenshots in ${outputDirectory}.\n`,
  );
} finally {
  await browser?.close();
  await stopStaticServer(server);
}
