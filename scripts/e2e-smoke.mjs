import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-3b/e2e");
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

async function chooseYakuDecision(page, choice) {
  const before = await readState(page);
  assert(
    before.localRound.phase === "awaitingYakuDecision",
    `Expected a Yaku decision, received ${before.localRound.phase}.`,
  );
  const yakuSelector = choice === "bank" ? "[data-yaku-bank]" : "[data-yaku-koi-koi]";
  const fallbackSelector = choice === "bank" ? "[data-input-bank]" : "[data-input-koi-koi]";
  const button = (await page.locator(yakuSelector).isVisible())
    ? page.locator(yakuSelector)
    : page.locator(fallbackSelector);
  await button.click();
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.localRound.stateVersion > version &&
        state.animation.status !== "playing" &&
        state.input.status !== "intentPending" &&
        state.input.lockReason !== "awaitingObservation"
      );
    },
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
}

async function acceptHandoffIfPending(page) {
  const state = await readState(page);
  if (!state.localRound.handoffPending) return state;
  await page.locator("[data-handoff-ready]").click();
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).localRound.handoffPending,
    null,
    { timeout: 30_000 },
  );
  return readState(page);
}

async function playHandCardById(page, cardId) {
  await acceptHandoffIfPending(page);
  const before = await readState(page);
  assert(
    before.localRound.phase === "awaitingHandPlay",
    `Expected awaitingHandPlay before ${cardId}, received ${before.localRound.phase}.`,
  );
  const button = page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`);
  assert((await button.count()) === 1, `The locked trace card ${cardId} is not selectable.`);
  await button.click();
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.localRound.stateVersion > version &&
        state.animation.status !== "playing" &&
        state.input.status !== "intentPending" &&
        state.input.lockReason !== "awaitingObservation"
      );
    },
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
}

async function playLockedHandSequence(page, cardIds) {
  for (const cardId of cardIds) await playHandCardById(page, cardId);
  return readState(page);
}

async function playHandCardThroughFeedbackBeat(page, cardId) {
  await acceptHandoffIfPending(page);
  const before = await readState(page);
  const button = page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`);
  assert((await button.count()) === 1, `The feedback-boundary card ${cardId} is not selectable.`);
  await button.click();
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(window.render_game_to_text());
      const feedback = document.querySelector("[data-yaku-feedback]");
      const decision = document.querySelector("[data-yaku-decision]");
      return (
        state.localRound.stateVersion > version &&
        state.input.lockReason === "awaitingObservation" &&
        feedback instanceof HTMLElement &&
        !feedback.hidden &&
        decision instanceof HTMLElement &&
        decision.hidden
      );
    },
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.lockReason !== "awaitingObservation",
    null,
    { timeout: 30_000 },
  );
  return readState(page);
}

function hasYaku(state, key) {
  return state.yaku?.decision?.newYaku?.some((entry) => entry.key === key) ?? false;
}

const PHASE_3B_HAND_DECISION_SEQUENCE = Object.freeze([
  "november-red-scroll",
  "july-bush-clover-plain-b",
  "july-red-scroll",
  "march-curtain",
  "may-red-scroll",
  "may-bridge",
  "january-pine-plain-a",
  "april-wisteria-plain-b",
  "april-wisteria-plain-a",
  "july-boar",
  "april-red-scroll",
  "october-maple-plain-b",
]);

const PHASE_3B_FINAL_DRAW_SEQUENCE = Object.freeze([
  "february-bush-warbler",
  "september-chrysanthemum-plain-a",
  "september-blue-scroll",
  "june-blue-scroll",
]);

await mkdir(outputDirectory, { recursive: true });
const { server: staticServer, baseUrl } = await startStaticServer();
const pageUrl = `${baseUrl}${mountedBasePath}`;
process.stdout.write(`Phase 3B smoke server ready at ${pageUrl}.\n`);

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

  if (process.env.SMOKE_SKIP_BASELINE !== "1") {
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
      assert(state.screen === "localRound", "Phase 3B must identify the local round screen.");
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
      assert(
        state.diagnostics.clippedZones.length === 0,
        `A supported viewport clips a board zone: ${JSON.stringify({ viewport, diagnostics: state.diagnostics })}`,
      );
      await page.screenshot({
        path: resolve(
          outputDirectory,
          `local-round-${viewport.width}x${viewport.height}${smokeBasePath === "/" ? "" : "-pages"}.png`,
        ),
        fullPage: true,
      });
    }
    process.stdout.write("Phase 3B seven-viewport baseline passed.\n");
  } else {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await waitForApplicationReady(page, browserErrors, networkErrors);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-animation-mode]").selectOption("instant");
  await page.locator("[data-input-mode]").selectOption("fast");

  await playLockedHandSequence(page, PHASE_3B_HAND_DECISION_SEQUENCE.slice(0, -1));
  const lastHandDecisionCard = PHASE_3B_HAND_DECISION_SEQUENCE.at(-1);
  assert(lastHandDecisionCard, "The locked Hand decision sequence is empty.");
  const handAnimals = await playHandCardThroughFeedbackBeat(page, lastHandDecisionCard);
  assert(
    handAnimals.localRound.phase === "awaitingYakuDecision" &&
      handAnimals.yaku?.decision?.phase === "hand" &&
      hasYaku(handAnimals, "animals"),
    "The locked Hand Animals decision did not appear.",
  );
  assert(handAnimals.yaku.decision.currentYakuTotal === 3, "Hand Animals did not total 3.");
  assert(handAnimals.yaku.decision.bank?.awardedPoints === 3, "Hand Bank was not 3 at 1×.");
  assert(
    handAnimals.yaku.decision.koiKoi?.resultingTableMultiplier === 2,
    "Hand Koi-Koi did not raise 1× to 2×.",
  );
  assert(handAnimals.input.status === "decision", "Card input was not locked for the decision.");
  assert(
    handAnimals.input.semanticControlCount === 0,
    "Hand-card semantic controls remained active during the decision.",
  );
  assert(
    await page.locator("[data-yaku-decision]").isVisible(),
    "Yaku decision dialog is missing.",
  );
  for (const selector of [
    "[data-deck-select]",
    "[data-fullscreen-button]",
    "[data-input-mode]",
    "[data-animation-mode]",
    "[data-new-round]",
  ]) {
    assert(
      await page.locator(selector).isDisabled(),
      `${selector} escaped the modal decision lock.`,
    );
  }
  assert(
    (await page.locator("[data-yaku-bank]").textContent())?.includes("3 points"),
    "Hand Bank button omitted its authoritative 3-point award.",
  );
  assert(
    (await page.locator("[data-yaku-koi-koi]").textContent())?.includes("2×"),
    "Hand Koi-Koi button omitted the 2× consequence.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `hand-animals-decision-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  process.stdout.write("Phase 3B Hand Animals decision passed.\n");

  await chooseYakuDecision(page, "koiKoi");
  const afterHandKoi = await readState(page);
  assert(afterHandKoi.yaku.tableMultiplier === 2, "Koi-Koi did not preserve the public 2× table.");
  assert(
    afterHandKoi.yaku.feedback?.chosenDecision?.choice === "koiKoi" &&
      afterHandKoi.yaku.feedback?.koiKoi?.currentTableMultiplier === 2,
    "Koi-Koi feedback omitted its authoritative continuation event.",
  );
  assert(
    afterHandKoi.localRound.latestRecap?.includes("Drew"),
    "Hand Koi-Koi did not resume Draw before its handoff boundary.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `hand-koi-draw-resumed-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  process.stdout.write("Phase 3B Hand Koi-Koi Draw continuation passed.\n");

  const finalDraw = await playLockedHandSequence(page, PHASE_3B_FINAL_DRAW_SEQUENCE);
  assert(
    finalDraw.localRound.phase === "awaitingYakuDecision" &&
      finalDraw.yaku?.decision?.phase === "draw" &&
      hasYaku(finalDraw, "blueScrolls") &&
      hasYaku(finalDraw, "scrolls"),
    "The locked combined final-Draw decision did not appear.",
  );
  assert(finalDraw.yaku.tableMultiplier === 2, "Final Draw decision was not at 2×.");
  assert(finalDraw.yaku.decision.currentYakuTotal === 11, "Final Draw total was not 11.");
  assert(finalDraw.yaku.decision.bank?.awardedPoints === 22, "Final Draw Bank was not 22.");
  assert(
    finalDraw.yaku.decision.koiKoi?.resultingTableMultiplier === 3,
    "Final Draw Koi-Koi did not raise 2× to 3×.",
  );
  assert(
    (await page.locator("[data-yaku-decision-summary]").textContent())?.includes("Blue Scrolls") &&
      (await page.locator("[data-yaku-decision-summary]").textContent())?.includes("Scrolls"),
    "Combined final-Draw yaku are not presented together.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `final-draw-combined-decision-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  process.stdout.write("Phase 3B final-Draw combined decision passed.\n");

  assert(
    await page.locator("[data-new-round]").isDisabled(),
    "New Round can discard an unresolved final-Draw decision.",
  );
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await waitForApplicationReady(page, browserErrors, networkErrors);
  await page.locator("[data-animation-mode]").selectOption("instant");
  await page.locator("[data-input-mode]").selectOption("fast");
  const freshHandAnimals = await playLockedHandSequence(page, PHASE_3B_HAND_DECISION_SEQUENCE);
  assert(
    freshHandAnimals.localRound.phase === "awaitingYakuDecision" &&
      freshHandAnimals.yaku?.decision?.phase === "hand" &&
      hasYaku(freshHandAnimals, "animals"),
    "The fresh Bank trace did not reach Hand Animals.",
  );
  await chooseYakuDecision(page, "bank");
  const banked = await readState(page);
  assert(banked.localRound.phase === "roundComplete", "Hand Bank did not complete the round.");
  assert(
    !banked.localRound.latestRecap?.includes("Drew"),
    "Hand Bank incorrectly revealed a Draw card.",
  );
  assert(
    banked.yaku.feedback?.chosenDecision?.choice === "bank",
    "Bank award feedback omitted the authoritative Bank choice.",
  );
  assert(
    banked.yaku.feedback?.bankAward?.awardedPoints === 3 &&
      (await page.locator("[data-yaku-feedback-message]").textContent())?.includes(
        "Player B banked 3 points",
      ),
    "Bank award feedback omitted the authoritative awarded points.",
  );
  assert(
    (await page.locator("[data-turn-recaps]").textContent())?.includes("banked 3 × 1× = 3 points"),
    "Bank award recap omitted the authoritative scoring arithmetic.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `hand-bank-award-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  process.stdout.write("Phase 3B Hand Bank award passed.\n");
  assert(
    !JSON.stringify(banked).includes("drawPileOrdered") &&
      !JSON.stringify(banked).includes("rng") &&
      !JSON.stringify(banked).includes("checkpoint") &&
      !JSON.stringify(banked).includes("commandId"),
    "The browser text surface leaked server-only state.",
  );
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("\n")}`);
  assert(networkErrors.length === 0, `Network errors: ${networkErrors.join("\n")}`);
  process.stdout.write(
    "Phase 3B root/Pages viewport, yaku decision, Koi-Koi continuation, and Bank smoke passed.\n",
  );
} finally {
  if (browser) await browser.close();
  await stopStaticServer(staticServer);
}
