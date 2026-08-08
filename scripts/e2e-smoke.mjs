import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(repositoryRoot, "output/phase-0b/e2e");
const baseUrl = "http://127.0.0.1:4173";
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

async function waitForServer(process) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`Vite preview exited before becoming ready (exit ${process.exitCode}).`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The preview server is still starting.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw new Error("Timed out waiting for the Vite preview server.");
}

async function stopServer(process) {
  if (process.exitCode !== null) {
    return;
  }

  process.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => process.once("exit", resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000)),
  ]);
}

await mkdir(outputDirectory, { recursive: true });

const preview = spawn(
  "npm",
  [
    "run",
    "preview",
    "--workspace",
    "@koikoi4x/web",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  {
    cwd: repositoryRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
preview.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
preview.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

let browser;
try {
  await waitForServer(preview);
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
} catch (error) {
  process.stderr.write(`${serverOutput}\n`);
  throw error;
} finally {
  await browser?.close();
  await stopServer(preview);
}
