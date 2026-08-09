import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-2d/e2e");
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

async function waitForApplicationReady(page, browserErrors, networkErrors) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, {
      timeout: 30_000,
    });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      appReady: document.documentElement.dataset.appReady ?? null,
      status: document.querySelector("[data-table-status]")?.textContent ?? null,
      canvasCount: document.querySelectorAll("canvas").length,
    }));
    throw new Error(
      `Application readiness failed: ${JSON.stringify({ diagnostic, browserErrors, networkErrors })}`,
      { cause: error },
    );
  }
}

await mkdir(outputDirectory, { recursive: true });
const staticServer = await startStaticServer();
process.stdout.write(`Static smoke server ready at ${pageUrl}.\n`);
const workshopProductionResponse = await fetch(`${pageUrl}workshop.html`);
assert(
  workshopProductionResponse.status === 404,
  "The development-only Deck Workshop must not be present in the production/Pages build.",
);
process.stdout.write("ART2E-012 verified the Workshop is absent from the production build.\n");

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
    await waitForApplicationReady(page, browserErrors, networkErrors);

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
      result.before.screen === "inputRuntime",
      "render_game_to_text must identify the Phase 2D input runtime.",
    );
    assert(
      result.before.presentationMode === "technicalInputDemo",
      "The visible input harness must remain explicitly identified as a technical fixture.",
    );
    assert(result.before.ready === true, "The table state must report ready.");
    assert(result.before.canvasCount === 1, "The table surface must contain exactly one canvas.");
    assert(result.after.simulationTimeMs === 250, "advanceTime must advance exactly 250ms.");
    assert(
      JSON.stringify(result.before.layout) === JSON.stringify(result.after.layout),
      "Advancing idle deterministic time must not change Phase 2C geometry.",
    );
    assert(result.heading === "KoiKoi4x", "The semantic page heading is missing.");
    assert(
      result.status?.includes("Phase 2D technical input ready"),
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
      result.before.deck.status === "ready" &&
        result.before.deck.activeDeckId === "technical-sunrise" &&
        JSON.stringify(result.before.deck.availableDeckIds) ===
          JSON.stringify(["technical-sunrise", "technical-moonlight"]),
      "The initial installed runtime deck catalog is incorrect.",
    );
    assert(
      result.before.cards.cardViewCount === 48 &&
        result.before.cards.uniqueCardIdCount === 48 &&
        result.before.cards.views.length === 48,
      "The persistent CardView registry must contain exactly 48 canonical cards.",
    );
    assert(
      result.before.input.status === "idle" &&
        result.before.input.confirmationMode === "guided" &&
        result.before.input.fixtureId === "handPlay" &&
        result.before.input.semanticControlCount === 8 &&
        result.before.input.intentExecution === "notExecuted",
      "The Phase 2D hand fixture did not expose eight semantic Guided controls.",
    );
    assert(
      new Set(result.before.cards.views.map(({ token }) => token)).size === 48,
      "Every canonical CardView needs a unique persistent token.",
    );
    assert(
      JSON.stringify(
        result.before.cards.views.map(({ cardId, token, zone, slotId, faceUp }) => ({
          cardId,
          token,
          zone,
          slotId,
          faceUp,
        })),
      ) ===
        JSON.stringify(
          result.after.cards.views.map(({ cardId, token, zone, slotId, faceUp }) => ({
            cardId,
            token,
            zone,
            slotId,
            faceUp,
          })),
        ),
      "Idle deterministic time advance replaced or moved a CardView.",
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
  await waitForApplicationReady(page, browserErrors, networkErrors);
  await page.evaluate(() => window.advanceTime(0));
  const animationBaseline = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const baselineTokens = animationBaseline.cards.views.map(({ cardId, token }) => ({
    cardId,
    token,
  }));

  const aprilCuckoo = page.locator('[data-card-id="april-cuckoo"]');
  await aprilCuckoo.click();
  let inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.status === "targeting" &&
      inputState.input.selectedCardId === "april-cuckoo" &&
      JSON.stringify(inputState.input.legalTargetCardIds) ===
        JSON.stringify(["april-red-scroll", "april-wisteria-plain-a"]) &&
      inputState.input.semanticControlCount === 10,
    "Guided pointer selection did not expose the exact legal target set.",
  );
  const semanticButtonMinimums = await page.locator(".card-input-control").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  assert(
    semanticButtonMinimums.every(({ height, width }) => height >= 44 && width >= 44),
    "A semantic card control fell below the 44 CSS-pixel input target.",
  );
  await page.screenshot({
    path: resolve(outputDirectory, "input-guided-targets-390x844.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).layout.mode === "landscape",
  );
  inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.selectedCardId === "april-cuckoo" &&
      inputState.input.legalTargetCardIds.length === 2,
    "Live resize cleared the active input selection or legal targets.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).layout.mode === "portrait",
  );
  await page.selectOption("[data-deck-select]", "technical-moonlight");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.deck.status === "ready" && state.deck.activeDeckId === "technical-moonlight";
  });
  inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.status === "idle" && inputState.input.selectedCardId === null,
    "Deck loading did not clear the stale selection before restoring input.",
  );
  assert(
    JSON.stringify(inputState.cards.views.map(({ cardId, token }) => ({ cardId, token }))) ===
      JSON.stringify(baselineTokens),
    "Deck switching while selected replaced a persistent CardView.",
  );
  await page.selectOption("[data-deck-select]", "technical-sunrise");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.deck.status === "ready" && state.deck.activeDeckId === "technical-sunrise";
  });
  await page.locator('[data-card-id="april-cuckoo"]').click();
  await page.locator('[data-card-id="april-wisteria-plain-a"]').click();
  inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.status === "intentPending" &&
      inputState.input.emittedIntentCount === 1 &&
      inputState.input.semanticControlCount === 0 &&
      inputState.input.intentExecution === "notExecuted",
    "A legal target did not create exactly one non-executed intent and lock duplicate input.",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "idle",
  );

  await page.locator('[data-card-id="march-curtain"]').click();
  assert(
    !(await page.getByRole("button", { name: "Confirm play" }).isDisabled()),
    "Guided single-action selection did not require explicit confirmation.",
  );
  await page.getByRole("button", { name: "Confirm play" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "intentPending",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.selectOption("[data-input-mode]", "fast");
  await page.locator('[data-card-id="may-bridge"]').click();
  inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.status === "intentPending" && inputState.input.emittedIntentCount === 3,
    "Fast mode did not immediately emit the single legal hand action.",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.selectOption("[data-input-mode]", "guided");

  const keyboardStart = page.locator('[data-card-id="march-curtain"]');
  await keyboardStart.focus();
  await page.keyboard.press("ArrowRight");
  const focusedCardId = await page.evaluate(
    () => document.activeElement?.getAttribute("data-card-id") ?? null,
  );
  assert(
    focusedCardId !== null && focusedCardId !== "march-curtain",
    "Roving arrow-key focus did not move to the next legal card control.",
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.input.status === "confirming" || state.input.status === "targeting";
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "idle",
  );

  await page.selectOption("[data-input-fixture]", "drawCapture");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.input.fixtureId === "drawCapture" && state.input.status === "targeting";
  });
  inputState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    inputState.input.semanticControlCount === 2 && inputState.input.cancelAvailable === false,
    "Draw capture did not expose only the two public legal targets.",
  );
  await page.locator('[data-card-id="august-geese"]').click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.selectOption("[data-input-fixture]", "yakuDecision");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "decision",
  );
  assert(
    (await page.getByRole("button", { name: "Bank" }).isVisible()) &&
      (await page.getByRole("button", { name: "Koi-Koi" }).isVisible()),
    "Yaku decision buttons did not expose the legal Bank/Koi-Koi choices.",
  );
  await page.screenshot({
    path: resolve(outputDirectory, "input-yaku-decision-390x844.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Koi-Koi" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.selectOption("[data-input-fixture]", "opponentTurn");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.input.status === "locked" && state.input.lockReason === "opponentTurn";
  });
  assert(
    (await page.locator(".card-input-control").count()) === 0,
    "Opponent-turn projection exposed an interactive private card control.",
  );
  await page.selectOption("[data-input-fixture]", "handPlay");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "idle",
  );

  for (const mode of ["normal", "fast", "instant", "reducedMotion"]) {
    await page.selectOption("[data-animation-scenario]", "pairCapture");
    await page.selectOption("[data-animation-mode]", mode);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state.animation.status === "playing" || state.animation.status === "completed";
    });
    await page.evaluate(() => window.advanceTime(20_000));
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state.animation.queuedPlanCount === 0;
    });
    const settled = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert(settled.animation.mode === mode, `${mode} did not remain the active motion policy.`);
    assert(
      settled.animation.displayFingerprint === settled.animation.targetFingerprint &&
        settled.animation.transitCardCount === 0 &&
        settled.animation.queuedClipCount === 0,
      `${mode} did not settle to the exact target projection.`,
    );
    assert(
      JSON.stringify(settled.cards.views.map(({ cardId, token }) => ({ cardId, token }))) ===
        JSON.stringify(baselineTokens),
      `${mode} replaced a persistent CardView.`,
    );
    assert(
      settled.input.status === "locked" && settled.input.lockReason === "awaitingObservation",
      `${mode} did not keep input locked until a fresh observation fixture was loaded.`,
    );
    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).input.status === "idle",
    );
  }

  await page.selectOption("[data-animation-scenario]", "drawReveal");
  await page.selectOption("[data-animation-mode]", "normal");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.status === "playing",
  );
  assert(
    await page.evaluate(() => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.input.status === "locked" &&
        state.input.lockReason === "animation" &&
        state.input.semanticControlCount === 0
      );
    }),
    "Animation playback did not disable and clear the semantic input surface.",
  );
  await page.evaluate(() => window.advanceTime(130));
  const midDraw = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    midDraw.animation.transitCardCount > 0 && midDraw.animation.activeClip?.kind === "draw",
    "The deterministic draw sample did not enter the transit layer.",
  );
  await page.screenshot({
    path: resolve(outputDirectory, "animation-draw-midflight-390x844.png"),
    fullPage: true,
  });

  const beforeDeckSwitch = midDraw;
  await page.selectOption("[data-deck-select]", "technical-moonlight");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.deck.status === "ready" && state.deck.activeDeckId === "technical-moonlight";
  });
  const afterDeckSwitch = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    JSON.stringify(beforeDeckSwitch.scene) === JSON.stringify(afterDeckSwitch.scene),
    "Deck switching replaced a persistent Pixi scene layer.",
  );
  assert(
    JSON.stringify(
      beforeDeckSwitch.cards.views.map(({ cardId, token, zone, slotId, faceUp }) => ({
        cardId,
        token,
        zone,
        slotId,
        faceUp,
      })),
    ) ===
      JSON.stringify(
        afterDeckSwitch.cards.views.map(({ cardId, token, zone, slotId, faceUp }) => ({
          cardId,
          token,
          zone,
          slotId,
          faceUp,
        })),
      ),
    "Deck switching changed CardView identity or the in-flight presentation frame.",
  );
  assert(
    JSON.stringify(beforeDeckSwitch.cards.views.map(({ textureBinding }) => textureBinding)) !==
      JSON.stringify(afterDeckSwitch.cards.views.map(({ textureBinding }) => textureBinding)),
    "Deck switching did not replace face/back texture bindings.",
  );
  assert(
    beforeDeckSwitch.animation.activeClip?.kind === afterDeckSwitch.animation.activeClip?.kind &&
      beforeDeckSwitch.animation.activeClip?.progress ===
        afterDeckSwitch.animation.activeClip?.progress,
    "Deck switching reset the active animation clip.",
  );
  await page.screenshot({
    path: resolve(outputDirectory, "animation-moonlight-midflight-390x844.png"),
    fullPage: true,
  });

  const runtimeBeforeResize = afterDeckSwitch;
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.layout.mode === "landscape" && state.boardViewport.width >= 800;
  });
  const resizedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    JSON.stringify(runtimeBeforeResize.scene) === JSON.stringify(resizedState.scene),
    "Portrait-to-landscape resize replaced a persistent Pixi scene-layer instance.",
  );
  assert(
    JSON.stringify(
      runtimeBeforeResize.cards.views.map(({ cardId, token }) => ({ cardId, token })),
    ) === JSON.stringify(resizedState.cards.views.map(({ cardId, token }) => ({ cardId, token }))),
    "Portrait-to-landscape resize replaced a persistent CardView instance.",
  );
  assert(
    resizedState.animation.activeClip?.kind === "draw" &&
      resizedState.animation.activeClip.progress ===
        runtimeBeforeResize.animation.activeClip?.progress,
    "Live resize reset the normalized animation progress.",
  );
  assert(
    resizedState.diagnostics.clippedZones.length === 0 &&
      resizedState.diagnostics.invalidZones.length === 0 &&
      resizedState.diagnostics.overlapViolations.length === 0,
    "Live portrait-to-landscape resize produced an invalid layout.",
  );
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.queuedPlanCount === 0,
  );
  const finishedAfterInterruptions = await page.evaluate(() =>
    JSON.parse(window.render_game_to_text()),
  );
  assert(
    finishedAfterInterruptions.animation.status === "finished" &&
      finishedAfterInterruptions.animation.displayFingerprint ===
        finishedAfterInterruptions.animation.targetFingerprint &&
      finishedAfterInterruptions.animation.transitCardCount === 0,
    "Finish after resize/deck interruption did not settle exactly.",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).layout.mode === "portrait",
  );
  await page.selectOption("[data-animation-scenario]", "pairCapture");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.status === "playing",
  );
  await page.evaluate(() => window.advanceTime(250));
  await page.getByRole("button", { name: "Cancel + snap" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.status === "cancelled",
  );
  const cancelled = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(
    cancelled.animation.queuedClipCount === 0 &&
      cancelled.animation.transitCardCount === 0 &&
      cancelled.animation.displayFingerprint === cancelled.animation.targetFingerprint,
    "Cancel-and-snap left stale work or transit cards.",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();

  await page.selectOption("[data-animation-scenario]", "fourCardSweep");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.status === "playing",
  );
  await page.getByRole("button", { name: "Faster" }).click();
  assert(
    (await page.evaluate(() => JSON.parse(window.render_game_to_text()))).animation
      .speedMultiplier === 4,
    "The first Faster action did not accelerate the queue.",
  );
  await page.getByRole("button", { name: "Faster" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).animation.status === "finished",
  );

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
  assert(networkErrors.length === 0, `Network errors:\n${networkErrors.join("\n")}`);
  await writeFile(
    resolve(outputDirectory, "render-game-to-text.json"),
    `${JSON.stringify(textStates, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Animation/CardView runtime smoke passed for ${viewports.length} viewports at ${mountedBasePath}.\n`,
  );
} finally {
  await browser?.close();
  await stopStaticServer(staticServer);
}
