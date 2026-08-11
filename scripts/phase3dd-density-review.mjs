import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist-phase3dd");
const outputDirectory = resolve(repositoryRoot, "output/phase-3d-d/e2e");
const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
});
const viewports = Object.freeze([
  { id: "320x568", width: 320, height: 568 },
  { id: "360x640", width: 360, height: 640 },
  { id: "390x844", width: 390, height: 844 },
  { id: "768x1024", width: 768, height: 1024 },
  { id: "844x390", width: 844, height: 390 },
  { id: "1366x768", width: 1366, height: 768 },
  { id: "1920x1080", width: 1920, height: 1080 },
]);
const screenshotViewportIds = new Set(["320x568", "844x390", "1366x768"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlaps(first, second) {
  const epsilon = 0.002;
  return (
    first.x < second.x + second.width - epsilon &&
    first.x + first.width > second.x + epsilon &&
    first.y < second.y + second.height - epsilon &&
    first.y + first.height > second.y + epsilon
  );
}

function buildReview(basePath) {
  execFileSync("npm", ["run", "build:phase3dd-review"], {
    cwd: repositoryRoot,
    env: { ...process.env, VITE_BASE_PATH: basePath },
    stdio: "inherit",
  });
}

async function startStaticServer(basePath) {
  const mount = basePath === "/" ? "/" : `/${basePath.replace(/^\/+|\/+$/gu, "")}/`;
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
      if (mount !== "/" && !pathname.startsWith(mount)) {
        response.writeHead(404).end("Not found");
        return;
      }
      const mountedPath = mount === "/" ? pathname : pathname.slice(mount.length);
      const relativePath = mountedPath.replace(/^\/+/, "") || "field-density-review.html";
      const filePath = resolve(distributionDirectory, relativePath);
      if (!filePath.startsWith(`${distributionDirectory}/`)) {
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
  if (!address || typeof address === "string") throw new Error("Density server has no port.");
  return {
    server,
    url: `http://127.0.0.1:${address.port}${mount}field-density-review.html`,
  };
}

async function stopStaticServer(server) {
  server.closeAllConnections();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
  });
}

async function runBase(browser, basePath, label, artifacts) {
  buildReview(basePath);
  const { server, url } = await startStaticServer(basePath);
  try {
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
      await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, {
        timeout: 60_000,
      });
      const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(state.harness === "phase3dd-non-shipping", `${label} exposed the wrong harness.`);
      assert(state.field.count === 17, `${label} ${viewport.id} did not render 17 cards.`);
      assert(state.field.placements.length === 17, `${label} ${viewport.id} lost a field card.`);
      assert(state.canvasCount === 1, `${label} ${viewport.id} rendered more than one canvas.`);
      assert(state.cardViewCount === 48, `${label} ${viewport.id} recreated CardViews.`);
      assert(state.targets.length === 3, `${label} ${viewport.id} lost dense targets.`);
      assert(
        state.diagnostics.clippedZones.length === 0,
        `${label} ${viewport.id} clipped a zone.`,
      );
      for (const [index, placement] of state.field.placements.entries()) {
        for (const other of state.field.placements.slice(index + 1)) {
          assert(
            !overlaps(placement.bounds, other.bounds),
            `${label} ${viewport.id} overlaps cards.`,
          );
        }
      }
      for (const [index, target] of state.targets.entries()) {
        assert(
          target.bounds.width >= 24,
          `${label} ${viewport.id} target is ${target.bounds.width}px wide, below 24px.`,
        );
        assert(target.bounds.height >= 36, `${label} ${viewport.id} target is shorter than 36px.`);
        assert(
          target.ariaLabel.includes("choose legal capture target"),
          "Target semantics changed.",
        );
        for (const other of state.targets.slice(index + 1)) {
          assert(
            !overlaps(target.bounds, other.bounds),
            `${label} ${viewport.id} overlaps targets.`,
          );
        }
      }
      const firstTarget = page.locator('[data-input-role="target"]').first();
      const firstTargetId = await firstTarget.getAttribute("data-card-id");
      assert(firstTargetId !== null, `${label} ${viewport.id} target has no CardId.`);
      await firstTarget.click();
      const pointerActivated = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(
        pointerActivated.activatedCardId === firstTargetId,
        `${label} ${viewport.id} pointer activated the wrong dense target.`,
      );
      await page.keyboard.press("Escape");
      const cancelled = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(cancelled.activatedCardId === null, `${label} ${viewport.id} Escape did not cancel.`);
      await firstTarget.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      const keyboardActivated = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      assert(
        keyboardActivated.activatedCardId !== null &&
          keyboardActivated.activatedCardId !== firstTargetId,
        `${label} ${viewport.id} keyboard did not activate the next dense target.`,
      );
      assert(errors.length === 0, `${label} ${viewport.id}: ${errors.join(" | ")}`);
      if (screenshotViewportIds.has(viewport.id)) {
        const path = resolve(outputDirectory, `${label}-${viewport.id}-17-cards.png`);
        await page.screenshot({ path, fullPage: true });
        artifacts.push({ label, viewport: viewport.id, path, field: state.field });
      }
      await context.close();
    }
  } finally {
    await stopStaticServer(server);
  }
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
});
const artifacts = [];
try {
  await runBase(browser, "/", "root", artifacts);
  await runBase(browser, "/KoiKoi4XRedux/", "pages", artifacts);
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify({ artifacts, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Phase 3D-D verified 17-card layout and target behavior at ${viewports.length * 2} root/Pages viewports; ${artifacts.length} screenshots written to ${outputDirectory}.\n`,
  );
} finally {
  await browser.close();
}
