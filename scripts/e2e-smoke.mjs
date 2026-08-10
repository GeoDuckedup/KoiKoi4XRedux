import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-3a/e2e");
const requestedBasePath = process.env.SMOKE_BASE_PATH ?? "/";
const smokeBasePath = `/${requestedBasePath.replace(/^\/+|\/+$/gu, "")}`.replace(/^\/$/u, "/");
const mountedBasePath = smokeBasePath === "/" ? "/" : `${smokeBasePath}/`;
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
  if (!condition) throw new Error(message);
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
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
      response.writeHead(200, {
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
  if (!address || typeof address === "string") throw new Error("Static server has no TCP address.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopStaticServer(server) {
  server.closeAllConnections();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
  });
}

async function waitForApplicationReady(page, browserErrors, networkErrors) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, {
      timeout: 60_000,
    });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      appReady: document.documentElement.dataset.appReady ?? null,
      status: document.querySelector("[data-table-status]")?.textContent ?? null,
    }));
    throw new Error(
      `Application readiness failed: ${JSON.stringify({ diagnostic, browserErrors, networkErrors })}`,
      { cause: error },
    );
  }
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function submitCurrentAction(page) {
  const before = await readState(page);
  if (before.localRound.phase === "awaitingYakuDecision") {
    const bank = page.locator("[data-input-bank]");
    if (await bank.isVisible()) await bank.click();
    else await page.locator("[data-input-koi-koi]").click();
  } else if (before.input.status === "targeting") {
    await page.locator('[data-input-role="target"]').first().click();
  } else {
    await page.locator('[data-input-role="selectable"]').first().click();
    const selected = await readState(page);
    if (selected.input.status === "confirming") {
      await page.locator("[data-input-confirm]").click();
    } else if (selected.input.status === "targeting") {
      await page.locator('[data-input-role="target"]').first().click();
    }
  }
  try {
    await page.waitForFunction(
      (version) => {
        const state = JSON.parse(window.render_game_to_text());
        return (
          state.localRound.stateVersion > version &&
          state.animation.status !== "playing" &&
          state.input.status !== "intentPending"
        );
      },
      before.localRound.stateVersion,
      { timeout: 30_000 },
    );
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      state: JSON.parse(window.render_game_to_text()),
      status: document.querySelector("[data-table-status]")?.textContent ?? null,
    }));
    throw new Error(`Local action did not settle: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
}

await mkdir(outputDirectory, { recursive: true });
const { server: staticServer, baseUrl } = await startStaticServer();
const pageUrl = `${baseUrl}${mountedBasePath}`;
process.stdout.write(`Phase 3A smoke server ready at ${pageUrl}.\n`);

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
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    networkErrors.push(
      `requestfailed: ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      networkErrors.push(`response: ${response.status()} ${response.url()}`);
  });

  for (const [viewportIndex, viewport] of viewports.entries()) {
    await page.setViewportSize(viewport);
    if (viewportIndex === 0) {
      await page.goto(pageUrl, { waitUntil: "networkidle" });
      await waitForApplicationReady(page, browserErrors, networkErrors);
    } else {
      await page.waitForFunction(
        (expectedMode) => JSON.parse(window.render_game_to_text()).layout.mode === expectedMode,
        viewport.mode,
      );
    }
    const state = await readState(page);
    assert(state.screen === "localRound", "Phase 3A must identify the local round screen.");
    assert(
      state.presentationMode === "authoritativeLocalRound",
      "The technical fixture must be replaced by an authoritative local round.",
    );
    assert(
      state.deck.activeDeckId === "new-primary-deck",
      "The approved primary deck is not active.",
    );
    assert(state.deck.approvalStatus === "approved", "The runtime deck is not owner-approved.");
    assert(state.localRound.phase === "awaitingHandPlay", "The opening round is not playable.");
    assert(
      state.localRound.viewerId === "player-a",
      "Player A must receive the opening observation.",
    );
    assert(
      state.input.selectableCardIds.length === 8,
      "The opening hand is not fully interactive.",
    );
    assert(state.cards.cardViewCount === 48, "The persistent 48-card registry changed.");
    assert(
      state.cards.visibleViews.every(({ faceUp }) => faceUp),
      "Text projection exposed a face-down card identity.",
    );
    assert(
      state.layout.mode === viewport.mode,
      `${viewport.width}×${viewport.height} layout mode changed: expected ${viewport.mode}, received ${state.layout.mode}.`,
    );
    assert(
      JSON.stringify(state.layerOrder) === JSON.stringify(expectedLayerOrder),
      "The prescribed layer order changed.",
    );
    assert(state.diagnostics.clippedZones.length === 0, "A supported viewport clips a board zone.");
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `local-round-${viewport.width}x${viewport.height}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await waitForApplicationReady(page, browserErrors, networkErrors);
  await page.locator("[data-animation-mode]").selectOption("normal");
  for (let step = 0; step < 4; step += 1) {
    const state = await readState(page);
    if (state.localRound.handoffPending || state.localRound.phase === "roundComplete") break;
    await submitCurrentAction(page);
  }
  const handoffState = await readState(page);
  assert(handoffState.localRound.handoffPending, "A completed turn did not enter private handoff.");
  assert(await page.locator("[data-handoff]").isVisible(), "The private handoff cover is missing.");
  assert(handoffState.localRound.recapCount === 2, "The completed turn did not append one recap.");
  assert(
    handoffState.localRound.latestRecap.includes("Player A played"),
    "The recap omitted the hand play.",
  );
  assert(handoffState.localRound.latestRecap.includes("Drew"), "The recap omitted the draw.");
  assert(
    handoffState.localRound.latestRecap.includes("Turn complete"),
    "The recap omitted handoff.",
  );
  await page.screenshot({
    path: resolve(outputDirectory, `handoff-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`),
    fullPage: true,
  });

  await page.locator("[data-handoff-ready]").click();
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).localRound.handoffPending,
  );
  const playerB = await readState(page);
  assert(
    playerB.localRound.viewerId === "player-b",
    "Handoff did not switch to Player B's observation.",
  );
  assert(playerB.localRound.activePlayerId === "player-b", "Player B did not become active.");
  assert(
    playerB.input.selectableCardIds.length === 8,
    "Player B's hand is not playable after handoff.",
  );
  assert(
    !JSON.stringify(playerB).includes("drawPileOrdered") &&
      !JSON.stringify(playerB).includes("rng"),
    "The browser text surface leaked server-only state.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `player-b-ready-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });

  await page.locator("[data-new-round]").click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).localRound.commandCount === 0,
  );
  const reset = await readState(page);
  assert(reset.localRound.viewerId === "player-a", "New round did not restore Player A.");
  assert(
    reset.localRound.stateVersion === 1,
    "New round did not restore the initial state version.",
  );
  assert(reset.deck.activeDeckId === "new-primary-deck", "New round changed the selected deck.");
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("\n")}`);
  assert(networkErrors.length === 0, `Network errors: ${networkErrors.join("\n")}`);
  process.stdout.write(
    "Phase 3A root/Pages viewport, local turn, recap, and handoff smoke passed.\n",
  );
} finally {
  if (browser) await browser.close();
  await stopStaticServer(staticServer);
}
