/* global document, window */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright";
import { createServer } from "vite";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(repositoryRoot, "output/phase-2e/e2e");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(outputDirectory, { recursive: true });
const server = await createServer({
  root: resolve(repositoryRoot, "apps/web"),
  configFile: resolve(repositoryRoot, "apps/web/vite.workshop.config.ts"),
  configLoader: "runner",
  mode: "workshop",
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
await server.listen();
const localUrl = server.resolvedUrls?.local[0];
if (!localUrl) throw new Error("Workshop dev server did not expose a local URL.");
const pageUrl = new URL("workshop.html", localUrl).href;
process.stdout.write(`Workshop test server ready at ${pageUrl}.\n`);

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");
  const initial = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(initial.screen === "deckWorkshop", "Workshop text state has the wrong screen.");
  assert(initial.slotCount === 48, "Workshop must show all 48 canonical slots.");
  assert(initial.packageCount === 2, "Workshop must expose both authored package definitions.");
  assert(
    JSON.stringify(initial.statusCounts) ===
      JSON.stringify({
        "complete-auto": 47,
        "complete-manual": 1,
        inherited: 0,
        warning: 0,
        missing: 0,
        invalid: 0,
      }),
    `Workshop status counts are not truthful: ${JSON.stringify(initial.statusCounts)}`,
  );
  assert(initial.engineExecution === "notAvailable", "Workshop exposed a gameplay execution seam.");
  assert((await page.locator(".workshop-card").count()) === 48, "Workshop DOM grid is incomplete.");
  assert(
    (await page.locator(".month-group").count()) === 12,
    "Workshop month grouping is incomplete.",
  );
  assert(
    (await page.locator("canvas").count()) === 6,
    "Workshop preview canvas inventory changed.",
  );
  assert(
    (await page.locator("[data-package-select] option").count()) === 2,
    "Workshop package selector does not expose both authored packages.",
  );
  assert(
    !(await page.locator("[data-issue-list]").textContent())?.includes("MISSING_SOURCE"),
    "Complete primary candidate still reports missing sources.",
  );

  await page.screenshot({
    path: resolve(outputDirectory, "workshop-desktop-1440x1000.png"),
    fullPage: true,
  });

  await page.locator('[data-card-id="january-crane"]').click();
  let state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    state.selectedCardId === "january-crane" && state.selectedStatus === "complete-auto",
    "Bulk source selection is not complete.",
  );
  await page.locator('[data-card-id="september-sake-cup"]').click();
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(state.selectedStatus === "complete-auto", "Auto-fitted pilot status is wrong.");
  await page.selectOption("[data-transform-mode]", "manual");
  assert(
    !(await page.locator('[data-nudge="right"]').isDisabled()),
    "Manual nudge controls stayed disabled.",
  );
  await page.locator('[data-nudge="right"]').click();
  await page.selectOption("[data-transform-mode]", "auto");
  await page.locator("[data-focus-y]").evaluate((input) => {
    input.value = "0.36";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert(
    (await page.locator("[data-source-detail]").textContent())?.includes("1600×2560"),
    "Selected source metadata is missing.",
  );
  await page.locator('[data-card-id="november-rain"]').click();
  const beforeDrag = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const frameLocator = page.locator("[data-frame-preview]");
  await frameLocator.scrollIntoViewIfNeeded();
  const frame = await frameLocator.boundingBox();
  if (!frame) throw new Error("Manual frame preview has no drag bounds.");
  await frameLocator.dispatchEvent("pointerdown", {
    pointerId: 1,
    clientX: frame.x + frame.width / 2,
    clientY: frame.y + frame.height / 2,
  });
  await frameLocator.dispatchEvent("pointermove", {
    pointerId: 1,
    clientX: frame.x + frame.width * 0.6,
    clientY: frame.y + frame.height * 0.56,
  });
  await frameLocator.dispatchEvent("pointerup", { pointerId: 1 });
  const afterDrag = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    JSON.stringify(beforeDrag.selectedTransform.crop) !==
      JSON.stringify(afterDrag.selectedTransform.crop),
    "Manual pointer drag did not update normalized crop placement.",
  );
  assert(await page.locator("[data-assign-back]").isVisible(), "Card-back assignment is missing.");

  await page.selectOption("[data-package-select]", "technical-workshop-overlay");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).packageId === "technical-workshop-overlay",
  );
  const inherited = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inherited.statusCounts.inherited === 48 && inherited.statusCounts.missing === 0,
    `Inherited package status is not truthful: ${JSON.stringify(inherited.statusCounts)}`,
  );
  await page.selectOption("[data-package-select]", "new-primary-deck");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).packageId === "new-primary-deck",
  );

  const forbidden = await page.request.get(
    new URL("/__deck-workshop/v1/package?packageId=new-primary-deck", pageUrl).href,
  );
  assert(
    forbidden.status() === 403,
    "Workshop filesystem bridge accepted a request without its session token.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelector("[data-board-preview]")?.dataset.renderedCardCount === "4",
  );
  await page.screenshot({
    path: resolve(outputDirectory, "workshop-mobile-390x844.png"),
    fullPage: true,
  });
  assert(
    await page.locator("[data-board-preview]").isVisible(),
    "The required 390x844 pilot board preview is not visible.",
  );
  assert(
    (await page.locator("[data-board-preview]").getAttribute("width")) === "390" &&
      (await page.locator("[data-board-preview]").getAttribute("height")) === "844",
    "Pilot board preview does not use the locked primary viewport.",
  );
  await page.locator("[data-board-preview]").screenshot({
    path: resolve(outputDirectory, "pilot-board-390x844.png"),
  });

  const finalState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await writeFile(
    resolve(outputDirectory, "render-game-to-text.json"),
    `${JSON.stringify(finalState, null, 2)}\n`,
  );
  assert(errors.length === 0, `Workshop browser errors:\n${errors.join("\n")}`);
  process.stdout.write(
    "ART2E-010 validated Workshop desktop/mobile grid, editor, token, and pilot preview.\n",
  );
} finally {
  await browser?.close();
  await server.close();
}
