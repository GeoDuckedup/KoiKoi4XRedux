import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

import { chromium } from "playwright";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distributionDirectory = process.env.SMOKE_DIST_DIR
  ? resolve(process.env.SMOKE_DIST_DIR)
  : resolve(repositoryRoot, "apps/web/dist");
const outputDirectory = resolve(repositoryRoot, "output/phase-5a/e2e");
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
const focusedPhase5AResultViewports = [
  { width: 390, height: 844, mode: "portrait" },
  { width: 844, height: 390, mode: "landscape" },
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

async function waitForViewportSettlement(page, { width, height }) {
  await page.waitForFunction(
    (expected) => {
      const state = JSON.parse(window.render_game_to_text());
      return state.viewport.width === expected.width && state.viewport.height === expected.height;
    },
    { width, height },
    { timeout: 30_000 },
  );
  await page.evaluate(
    () =>
      new Promise((resolvePromise) =>
        requestAnimationFrame(() => requestAnimationFrame(resolvePromise)),
      ),
  );
}

function publicOpeningDealSignature(state) {
  return JSON.stringify(
    state.cards.visibleViews
      .filter(({ zone }) => zone === "field" || zone === "playerHand")
      .map(({ cardId, zone, slotId }) => ({ cardId, zone, slotId })),
  );
}

async function actionableSemanticControlCount(page) {
  return page.locator('[data-card-id][data-actionable="true"]').count();
}

async function openOptions(page) {
  if (!(await page.locator("[data-options-dialog]").evaluate((dialog) => dialog.open))) {
    await page.locator("[data-options-trigger]").click();
  }
  await page.locator("[data-options-dialog]").waitFor({ state: "visible" });
}

async function closeOptions(page) {
  if (await page.locator("[data-options-dialog]").evaluate((dialog) => dialog.open)) {
    await page.locator("[data-options-close]").click();
  }
}

async function assertUtilityDialogCycle(page, { trigger, dialog, close, focus = close, label }) {
  const utilities = [
    { trigger: "[data-context-help-trigger]", dialog: "[data-context-help-dialog]" },
    { trigger: "[data-history-trigger]", dialog: "[data-history-dialog]" },
    { trigger: "[data-yaku-guide-trigger]", dialog: "[data-yaku-guide-dialog]" },
    { trigger: "[data-options-trigger]", dialog: "[data-options-dialog]" },
  ];
  const triggerLocator = page.locator(trigger);
  const dialogLocator = page.locator(dialog);
  const before = await readState(page);
  await triggerLocator.click();
  await dialogLocator.waitFor({ state: "visible" });
  assert(
    await dialogLocator.evaluate((element) => element instanceof HTMLDialogElement && element.open),
    `${label} did not enter its modal dialog state.`,
  );
  assert(
    await page.locator(focus).evaluate((element) => document.activeElement === element),
    `${label} did not focus its expected initial control.`,
  );
  for (const other of utilities.filter((utility) => utility.dialog !== dialog)) {
    await page.locator(other.trigger).evaluate((element) => {
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error("Phase 3F-E utility opener is not a button.");
      }
      element.click();
    });
    assert(
      await dialogLocator.evaluate(
        (element) => element instanceof HTMLDialogElement && element.open,
      ),
      `${label} closed when another utility opener was activated.`,
    );
    assert(
      !(await page.locator(other.dialog).evaluate((element) => element.open)),
      `${label} allowed ${other.dialog} to open concurrently.`,
    );
  }
  assert(
    (await page
      .locator(
        "[data-context-help-dialog][open], [data-history-dialog][open], [data-yaku-guide-dialog][open], [data-options-dialog][open]",
      )
      .count()) === 1,
    `${label} did not retain exactly one open utility dialog.`,
  );
  assert(
    !(await page.locator("[data-context-help-dialog]").evaluate((element) => element.open)) ||
      dialog === "[data-context-help-dialog]",
    `${label} opened while contextual help was already visible.`,
  );
  assert(
    !(await page.locator("[data-history-dialog]").evaluate((element) => element.open)) ||
      dialog === "[data-history-dialog]",
    `${label} opened while History was already visible.`,
  );
  assert(
    !(await page.locator("[data-yaku-guide-dialog]").evaluate((element) => element.open)) ||
      dialog === "[data-yaku-guide-dialog]",
    `${label} opened while Yaku Guide was already visible.`,
  );
  assert(
    !(await page.locator("[data-options-dialog]").evaluate((element) => element.open)) ||
      dialog === "[data-options-dialog]",
    `${label} opened while Options was already visible.`,
  );
  const during = await readState(page);
  assert(
    during.localRound.stateVersion === before.localRound.stateVersion &&
      during.localRound.commandCount === before.localRound.commandCount &&
      during.cards.cardViewCount === before.cards.cardViewCount &&
      !JSON.stringify(during).includes("drawPileOrdered") &&
      !JSON.stringify(during).includes("commandId"),
    `${label} changed authority, CardView identity, or public privacy boundaries.`,
  );
  await page.keyboard.press("Escape");
  assert(
    !(await dialogLocator.evaluate(
      (element) => element instanceof HTMLDialogElement && element.open,
    )) && (await triggerLocator.evaluate((element) => document.activeElement === element)),
    `Escape did not close ${label} and restore focus to its trigger.`,
  );
}

async function assertContextHelp(page, screenshotId = "390x844") {
  const before = await readState(page);
  await page.locator("[data-context-help-trigger]").click();
  await page.locator("[data-context-help-dialog]").waitFor({ state: "visible" });
  assert(
    ((await page.locator("[data-context-help-title]").textContent()) ?? "").trim().length > 0 &&
      ((await page.locator("[data-context-help-summary]").textContent()) ?? "").trim().length > 0 &&
      ((await page.locator("[data-context-help-steps] li").count()) ?? 0) > 0,
    "Contextual help did not explain the current public next step.",
  );
  const during = await readState(page);
  assert(
    during.localRound.stateVersion === before.localRound.stateVersion &&
      during.localRound.commandCount === before.localRound.commandCount &&
      during.cards.cardViewCount === before.cards.cardViewCount &&
      !JSON.stringify(during).includes("drawPileOrdered") &&
      !JSON.stringify(during).includes("commandId"),
    "Contextual help changed authority, persistent card identity, or public privacy boundaries.",
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `context-help-${screenshotId}${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("[data-context-help-dialog]").evaluate((dialog) => dialog.open)) &&
      (await page
        .locator("[data-context-help-trigger]")
        .evaluate((trigger) => document.activeElement === trigger)),
    "Escape did not close contextual help and restore focus to its trigger.",
  );
}

async function assertCardInspection(
  page,
  selector,
  label,
  expectedYakuKeys,
  screenshotId = "390x844",
  { assertScroll = false } = {},
) {
  const control = page.locator(selector);
  assert(await control.isVisible(), `${label} inspectable card control is missing.`);
  assert(
    (await control.getAttribute("data-inspectable")) === "true",
    `${label} was not marked as a privacy-safe inspectable card.`,
  );
  const expectedCardId = await control.getAttribute("data-card-id");
  assert(expectedCardId !== null, `${label} inspectable card has no CardId.`);
  await control.scrollIntoViewIfNeeded();
  const bounds = await control.boundingBox();
  assert(bounds !== null, `${label} inspectable card has no browser bounds.`);
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    const card = element?.closest("[data-card-id]");
    return card
      ? { cardId: card.dataset.cardId ?? null, inspectable: card.dataset.inspectable }
      : null;
  }, point);
  assert(
    hit?.cardId === expectedCardId && hit.inspectable === "true",
    `${label} center is not a hittable inspectable card: ${JSON.stringify({ point, hit, expectedCardId })}.`,
  );
  const selectionPolicy = await page.evaluate(() => {
    const control = document.querySelector("[data-card-id]");
    const game = document.querySelector(".game-host");
    const inspector = document.querySelector("[data-card-inspector]");
    const yakuRequirement = document.querySelector(
      "[data-card-inspector-yaku-entries] .yaku-guide__requirement",
    );
    if (!(control instanceof HTMLElement) || !(game instanceof HTMLElement)) {
      throw new Error("Phase 3F-G selection-policy targets are missing.");
    }
    const read = (element) => {
      const style = getComputedStyle(element);
      return {
        userSelect: style.userSelect,
        webkitUserSelect: style.webkitUserSelect,
        webkitTouchCallout: style.webkitTouchCallout,
      };
    };
    return {
      control: read(control),
      game: read(game),
      inspector: inspector instanceof HTMLElement ? read(inspector) : null,
      yakuRequirement: yakuRequirement instanceof HTMLElement ? read(yakuRequirement) : null,
    };
  });
  for (const [surface, policy] of Object.entries({
    card: selectionPolicy.control,
    game: selectionPolicy.game,
  })) {
    assert(
      policy.userSelect === "none" && policy.webkitUserSelect === "none",
      `${label} ${surface} interaction surface does not suppress native text selection: ${JSON.stringify(policy)}.`,
    );
    if (await page.evaluate(() => CSS.supports("-webkit-touch-callout", "none"))) {
      assert(
        policy.webkitTouchCallout === "none",
        `${label} ${surface} interaction surface does not suppress WebKit touch callout: ${JSON.stringify(policy)}.`,
      );
    }
  }
  assert(
    selectionPolicy.inspector?.userSelect !== "none",
    `${label} inspector text selection was disabled outside the game interaction surface.`,
  );
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(510);
  assert(
    !(await page.locator("[data-card-inspector]").evaluate((dialog) => dialog.open)),
    `${label} early pointer release incorrectly opened the inspector.`,
  );
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 12, point.y);
  await page.mouse.up();
  await page.waitForTimeout(510);
  assert(
    !(await page.locator("[data-card-inspector]").evaluate((dialog) => dialog.open)),
    `${label} drag cancellation incorrectly opened the inspector.`,
  );
  const before = await readState(page);
  await page.evaluate(() => {
    const targetWindow = window;
    delete targetWindow.__phase3ffPointerDown;
    document.addEventListener(
      "pointerdown",
      (event) => {
        const card =
          event.target instanceof Element ? event.target.closest("[data-card-id]") : null;
        targetWindow.__phase3ffPointerDown = card?.getAttribute("data-card-id") ?? null;
      },
      { capture: true, once: true },
    );
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForFunction(() => window.__phase3ffPointerDown !== undefined);
  assert(
    (await page.evaluate(() => window.__phase3ffPointerDown)) === expectedCardId,
    `${label} primary pointerdown reached the wrong card control.`,
  );
  await page.waitForTimeout(550);
  await page.locator("[data-card-inspector]").waitFor({ state: "visible" });
  await page.mouse.up();
  assert(
    await page.evaluate(() => window.getSelection()?.toString() === ""),
    `${label} long press left browser-native text selected.`,
  );
  const imageMetrics = await page.locator("[data-card-inspector-image]").evaluate((image) => {
    const box = image.getBoundingClientRect();
    return { ratio: box.width / box.height, alt: image.getAttribute("alt") };
  });
  assert(
    Math.abs(imageMetrics.ratio - 0.625) < 0.03 && (imageMetrics.alt ?? "").length > 0,
    `${label} inspector did not present a regular 5:8 face-up card image.`,
  );
  const during = await readState(page);
  assert(
    during.utilitySurfaces.cardInspectorOpen === true &&
      before.utilitySurfaces.cardInspectorOpen === false &&
      during.utilitySurfaces.cardInspectionCardId !== null,
    `${label} inspector state is not represented as a non-authoritative visible surface.`,
  );
  assert(
    during.localRound.stateVersion === before.localRound.stateVersion &&
      during.localRound.commandCount === before.localRound.commandCount &&
      during.cards.cardViewCount === before.cards.cardViewCount,
    `${label} long press changed authoritative state or persistent CardView identity.`,
  );
  const inspector = page.locator("[data-card-inspector]");
  const yaku = page.locator("[data-card-inspector-yaku]");
  const yakuSummary = page.locator("[data-card-inspector-yaku-summary]");
  assert(
    !(await yaku.evaluate((details) => details.open)),
    `${label} inspector did not open collapsed.`,
  );
  assert(
    (await yakuSummary.textContent())?.trim() ===
      `Yaku this card can contribute to (${expectedYakuKeys.length})`,
    `${label} inspector summary changed or has the wrong static yaku count.`,
  );
  assert(
    (await yakuSummary.getAttribute("aria-expanded")) === "false" &&
      (await yakuSummary.getAttribute("aria-controls")) === "card-inspector-yaku-entries",
    `${label} collapsed yaku summary lacks its explicit ARIA contract.`,
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `card-inspector-collapsed-${label.replaceAll(/[^a-z0-9]+/giu, "-").toLowerCase()}-${screenshotId}${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await yakuSummary.focus();
  await page.keyboard.press("Space");
  assert(
    await yaku.evaluate((details) => details.open),
    `${label} Space did not expand yaku reference.`,
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-card-inspector-yaku-summary]")
        ?.getAttribute("aria-expanded") === "true",
  );
  assert(
    (await yakuSummary.getAttribute("aria-expanded")) === "true",
    `${label} expanded yaku summary did not update aria-expanded.`,
  );
  const yakuEntries = yaku.locator("[data-yaku-guide-key]");
  assert(
    JSON.stringify(
      await yakuEntries.evaluateAll((entries) =>
        entries.map((entry) => entry.dataset.yakuGuideKey),
      ),
    ) === JSON.stringify(expectedYakuKeys),
    `${label} inspector yaku keys are not the exact canonical static order.`,
  );
  assert(
    await yakuEntries.evaluateAll((entries) =>
      entries.every(
        (entry) =>
          entry.querySelectorAll("[data-yaku-guide-card]").length > 0 &&
          (entry.querySelector(".yaku-guide__requirement")?.textContent ?? "").trim().length > 0,
      ),
    ),
    `${label} expanded inspector lacks guide-style cards or requirement prose.`,
  );
  const expandedSelection = await page
    .locator("[data-card-inspector-yaku-entries] .yaku-guide__requirement")
    .evaluateAll((entries) =>
      entries.map((entry) => {
        const style = getComputedStyle(entry);
        return { userSelect: style.userSelect, webkitUserSelect: style.webkitUserSelect };
      }),
    );
  assert(
    expandedSelection.length === expectedYakuKeys.length &&
      expandedSelection.every(
        ({ userSelect, webkitUserSelect }) => userSelect !== "none" && webkitUserSelect !== "none",
      ),
    `${label} expanded reference prose is incorrectly non-selectable: ${JSON.stringify(expandedSelection)}.`,
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `card-inspector-expanded-${label.replaceAll(/[^a-z0-9]+/giu, "-").toLowerCase()}-${screenshotId}${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await page.keyboard.press("Enter");
  assert(
    !(await yaku.evaluate((details) => details.open)),
    `${label} Enter did not collapse yaku reference.`,
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-card-inspector-yaku-summary]")
        ?.getAttribute("aria-expanded") === "false",
  );
  assert(
    (await yakuSummary.getAttribute("aria-expanded")) === "false",
    `${label} collapsed yaku summary did not update aria-expanded.`,
  );
  await page.keyboard.press("Space");
  assert(await yaku.evaluate((details) => details.open), `${label} yaku reference did not reopen.`);
  if (assertScroll) {
    const beforeDocumentScroll = await page.evaluate(() => window.scrollY);
    const scrollEvidence = await inspector.evaluate((dialog) => {
      if (!(dialog instanceof HTMLDialogElement))
        throw new Error("Card inspector is not a dialog.");
      dialog.scrollTop = dialog.scrollHeight;
      const close = dialog.querySelector("[data-card-inspector-close]");
      const dialogBox = dialog.getBoundingClientRect();
      const closeBox = close?.getBoundingClientRect();
      return {
        clientHeight: dialog.clientHeight,
        scrollHeight: dialog.scrollHeight,
        scrollLeft: dialog.scrollLeft,
        scrollTop: dialog.scrollTop,
        scrollWidth: dialog.scrollWidth,
        dialogTop: dialogBox.top,
        closeTop: closeBox?.top ?? null,
      };
    });
    assert(
      scrollEvidence.scrollHeight > scrollEvidence.clientHeight &&
        scrollEvidence.scrollTop === scrollEvidence.scrollHeight - scrollEvidence.clientHeight &&
        scrollEvidence.scrollLeft === 0,
      `${label} expanded inspector did not expose an internal vertical scroll range: ${JSON.stringify(scrollEvidence)}.`,
    );
    assert(
      scrollEvidence.scrollLeft === 0 &&
        scrollEvidence.scrollWidth <=
          (await inspector.evaluate((dialog) => dialog.clientWidth)) + 1 &&
        scrollEvidence.closeTop !== null &&
        scrollEvidence.closeTop >= scrollEvidence.dialogTop - 1,
      `${label} expanded inspector has horizontal overflow or lost sticky Close: ${JSON.stringify(scrollEvidence)}.`,
    );
    await inspector.hover();
    await page.mouse.wheel(0, 400);
    assert(
      (await page.evaluate(() => window.scrollY)) === beforeDocumentScroll,
      `${label} inspector scroll leaked to the page background.`,
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `card-inspector-scroll-bottom-${label.replaceAll(/[^a-z0-9]+/giu, "-").toLowerCase()}-${screenshotId}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("[data-card-inspector]").evaluate((dialog) => dialog.open)) &&
      (await control.evaluate((element) => document.activeElement === element)),
    `${label} inspector did not close with Escape and restore focus.`,
  );
  await control.focus();
  await page.keyboard.press("I");
  await page.locator("[data-card-inspector]").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert(
    !(await page.locator("[data-card-inspector]").evaluate((dialog) => dialog.open)),
    `${label} keyboard inspection did not close cleanly.`,
  );
  await control.click({ button: "right" });
  await page.locator("[data-card-inspector]").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-card-inspector-yaku-summary]")
        ?.getAttribute("aria-expanded") === "false",
  );
  assert(
    !(await yaku.evaluate((details) => details.open)),
    `${label} context-menu inspection did not reset collapsed state.`,
  );
  await page.keyboard.press("Escape");
}

async function assertHandPlayAttention(page, { label, reducedMotion = false, screenshot = false }) {
  const cue = page.locator("[data-hand-play-attention]");
  await page.evaluate(
    () =>
      new Promise((resolvePromise) =>
        requestAnimationFrame(() => requestAnimationFrame(resolvePromise)),
      ),
  );
  const before = await readState(page);
  assert(
    before.localRound.phase === "awaitingHandPlay" &&
      before.input.status === "idle" &&
      before.input.selectedCardId === null &&
      before.input.selectableCardIds.length > 0,
    `${label} did not begin at an idle actionable local Hand step.`,
  );
  assert(await cue.isVisible(), `${label} active-Hand attention perimeter is missing.`);
  const evidence = await cue.evaluate((element) => {
    const overlay = element.closest("[data-card-input-overlay]");
    const canvas = document.querySelector(".game-host canvas");
    if (!(overlay instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Active-Hand attention is not attached to the game input overlay/canvas.");
    }
    const cueBox = element.getBoundingClientRect();
    const overlayBox = overlay.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      ariaHidden: element.getAttribute("aria-hidden"),
      borderTopColor: style.borderTopColor,
      cueBox: { x: cueBox.x, y: cueBox.y, width: cueBox.width, height: cueBox.height },
      canvasBox: {
        x: canvasBox.x,
        y: canvasBox.y,
        width: canvasBox.width,
        height: canvasBox.height,
      },
      overlayBox: {
        x: overlayBox.x,
        y: overlayBox.y,
        width: overlayBox.width,
        height: overlayBox.height,
      },
      pointerEvents: style.pointerEvents,
      styleHeight: element.style.height,
      styleLeft: element.style.left,
      styleTop: element.style.top,
      styleWidth: element.style.width,
    };
  });
  const zone = before.layout.zones.playerHand;
  assert(
    evidence.ariaHidden === "true" && evidence.pointerEvents === "none",
    `${label} attention perimeter is interactive or exposed to assistive technology: ${JSON.stringify(evidence)}.`,
  );
  assert(
    evidence.borderTopColor === "rgb(255, 255, 255)" &&
      !evidence.borderTopColor.includes("233") &&
      (reducedMotion
        ? evidence.animationName === "none"
        : evidence.animationName === "hand-play-attention-pulse" &&
          evidence.animationDuration === "1.2s"),
    `${label} attention perimeter did not retain its white non-gold ${reducedMotion ? "steady" : "pulse"} treatment: ${JSON.stringify(evidence)}.`,
  );
  assert(
    evidence.styleLeft === `${zone.x}px` &&
      evidence.styleTop === `${zone.y}px` &&
      evidence.styleWidth === `${zone.width}px` &&
      evidence.styleHeight === `${zone.height}px` &&
      evidence.cueBox.x >= evidence.canvasBox.x - 1 &&
      evidence.cueBox.y >= evidence.canvasBox.y - 1 &&
      evidence.cueBox.x + evidence.cueBox.width <=
        evidence.canvasBox.x + evidence.canvasBox.width + 1 &&
      evidence.cueBox.y + evidence.cueBox.height <=
        evidence.canvasBox.y + evidence.canvasBox.height + 1,
    `${label} attention perimeter did not synchronize to the canonical Player Hand zone: ${JSON.stringify({ evidence, zone })}.`,
  );
  assert(
    (await page
      .locator(
        "[data-hand-play-attention][data-card-id], [data-hand-play-attention][data-actionable]",
      )
      .count()) === 0,
    `${label} attention perimeter became a semantic card control.`,
  );
  if (screenshot) {
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `hand-start-cue-${label}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }
  return before;
}

async function assertHandPlayAttentionHidden(page, label) {
  const cue = page.locator("[data-hand-play-attention]");
  assert(
    !(await cue.isVisible()),
    `${label} incorrectly retained the active-Hand attention perimeter.`,
  );
}

async function assertRevealPlayAttention(
  page,
  { label, reducedMotion = false, screenshot = false },
) {
  const cue = page.locator("[data-reveal-play-attention]");
  await page.evaluate(
    () =>
      new Promise((resolvePromise) =>
        requestAnimationFrame(() => requestAnimationFrame(resolvePromise)),
      ),
  );
  const before = await readState(page);
  assert(
    before.localRound.phase === "awaitingDrawResolution" &&
      before.input.status === "idle" &&
      before.input.selectedCardId === null &&
      before.input.selectableCardIds.length === 1 &&
      before.input.legalTargetCardIds.length === 0,
    `${label} did not begin at an idle actionable settled Reveal step.`,
  );
  assert(await cue.isVisible(), `${label} Reveal attention perimeter is missing.`);
  const reveal = page.locator('[data-input-role="selectable"]').first();
  const evidence = await cue.evaluate((element) => {
    const overlay = element.closest("[data-card-input-overlay]");
    const canvas = document.querySelector(".game-host canvas");
    if (!(overlay instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Reveal attention is not attached to the game input overlay/canvas.");
    }
    const cueBox = element.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      ariaHidden: element.getAttribute("aria-hidden"),
      borderTopColor: style.borderTopColor,
      cueBox: { x: cueBox.x, y: cueBox.y, width: cueBox.width, height: cueBox.height },
      canvasBox: {
        x: canvasBox.x,
        y: canvasBox.y,
        width: canvasBox.width,
        height: canvasBox.height,
      },
      pointerEvents: style.pointerEvents,
      styleHeight: element.style.height,
      styleLeft: element.style.left,
      styleTop: element.style.top,
      styleWidth: element.style.width,
    };
  });
  const revealBounds = await reveal.evaluate((element) => ({
    height: element.style.height,
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
  }));
  assert(
    evidence.ariaHidden === "true" && evidence.pointerEvents === "none",
    `${label} Reveal attention perimeter is interactive or exposed to assistive technology: ${JSON.stringify(evidence)}.`,
  );
  assert(
    evidence.borderTopColor === "rgb(255, 255, 255)" &&
      (reducedMotion
        ? evidence.animationName === "none"
        : evidence.animationName === "reveal-play-attention-pulse" &&
          evidence.animationDuration === "1.2s"),
    `${label} Reveal attention perimeter did not retain its white ${reducedMotion ? "steady" : "pulse"} treatment: ${JSON.stringify(evidence)}.`,
  );
  assert(
    evidence.styleLeft === revealBounds.left &&
      evidence.styleTop === revealBounds.top &&
      evidence.styleWidth === revealBounds.width &&
      evidence.styleHeight === revealBounds.height &&
      evidence.cueBox.x >= evidence.canvasBox.x - 1 &&
      evidence.cueBox.y >= evidence.canvasBox.y - 1 &&
      evidence.cueBox.x + evidence.cueBox.width <=
        evidence.canvasBox.x + evidence.canvasBox.width + 1 &&
      evidence.cueBox.y + evidence.cueBox.height <=
        evidence.canvasBox.y + evidence.canvasBox.height + 1,
    `${label} Reveal attention perimeter did not synchronize to the actual settled Reveal-card bounds: ${JSON.stringify({ evidence, revealBounds })}.`,
  );
  assert(
    (await page
      .locator(
        "[data-reveal-play-attention][data-card-id], [data-reveal-play-attention][data-actionable]",
      )
      .count()) === 0,
    `${label} Reveal attention perimeter became a semantic card control.`,
  );
  if (screenshot) {
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `reveal-start-cue-${label}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }
  return before;
}

async function assertRevealPlayAttentionHidden(page, label) {
  const cue = page.locator("[data-reveal-play-attention]");
  assert(!(await cue.isVisible()), `${label} incorrectly retained the Reveal attention perimeter.`);
}

async function assertNoLegalDestinationAttention(page, label) {
  const container = page.locator("[data-field-destination-attention]");
  assert(
    !(await container.isVisible()) &&
      (await page.locator("[data-legal-destination-attention]").count()) === 0 &&
      (await page.locator("[data-legal-field-placement-copy]").count()) === 0,
    `${label} exposed a legal-destination decoration before destination selection.`,
  );
}

async function assertLegalDestinationAttention(
  page,
  { label, kind, reducedMotion = false, screenshot = false },
) {
  const state = await readState(page);
  assert(
    state.input.selectedCardId !== null &&
      (state.input.status === "confirming" || state.input.status === "targeting"),
    `${label} is not at a selected source awaiting a destination.`,
  );
  const container = page.locator("[data-field-destination-attention]");
  const rings = page.locator("[data-legal-destination-attention]");
  assert(await container.isVisible(), `${label} legal-destination container is missing.`);
  const expectedTargetIds = state.input.legalTargetCardIds;
  const expectedCount = kind === "fieldPlacement" ? 1 : expectedTargetIds.length;
  assert(
    (await rings.count()) === expectedCount,
    `${label} legal-destination cardinality is wrong: ${JSON.stringify({ expectedCount, expectedTargetIds })}.`,
  );
  assert(
    (await page.locator("[data-legal-field-placement-copy]").count()) ===
      (kind === "fieldPlacement" ? 1 : 0),
    `${label} no-match badge cardinality is wrong.`,
  );
  const evidence = await rings.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      const probe = document.createElement("div");
      probe.style.borderTop = "2px solid var(--theme-accent)";
      document.body.append(probe);
      const accent = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return {
        animationDuration: style.animationDuration,
        animationName: style.animationName,
        ariaHidden: element.closest("[aria-hidden]")?.getAttribute("aria-hidden") ?? null,
        borderTopColor: style.borderTopColor,
        cardId: element.getAttribute("data-legal-destination-attention"),
        pointerEvents: style.pointerEvents,
        transform: style.transform,
        accent,
        height: element.style.height,
        left: element.style.left,
        top: element.style.top,
        width: element.style.width,
      };
    }),
  );
  assert(
    evidence.every(
      (ring) =>
        ring.ariaHidden === "true" &&
        ring.pointerEvents === "none" &&
        ring.borderTopColor === ring.accent &&
        ring.transform === "none" &&
        ring.left.endsWith("px") &&
        ring.top.endsWith("px") &&
        ring.width.endsWith("px") &&
        ring.height.endsWith("px") &&
        (reducedMotion
          ? ring.animationName === "none"
          : ring.animationName === "legal-destination-attention-pulse" &&
            ring.animationDuration === "1.2s"),
    ),
    `${label} destination edge lacks the expected theme-gold, inert ${reducedMotion ? "steady" : "pulse"} treatment: ${JSON.stringify(evidence)}.`,
  );
  assert(
    (await page
      .locator(
        "[data-legal-destination-attention][data-card-id], [data-legal-destination-attention][data-actionable], [data-field-destination-attention][data-actionable]",
      )
      .count()) === 0,
    `${label} destination decoration became a semantic control.`,
  );
  if (kind === "fieldPlacement") {
    assert(
      evidence[0]?.cardId === "field-placement" &&
        (await page.locator("[data-legal-field-placement-copy]").textContent())?.trim() ===
          "NO MATCH · PLACE HERE",
      `${label} did not render the exact no-match Field destination language.`,
    );
  } else {
    assert(
      JSON.stringify(evidence.map((ring) => ring.cardId)) === JSON.stringify(expectedTargetIds),
      `${label} destination rings did not map exactly to authoritative legal target IDs.`,
    );
    for (const ring of evidence) {
      const control = page.locator(`[data-input-role="target"][data-card-id="${ring.cardId}"]`);
      assert(
        (await control.count()) === 1,
        `${label} target ${ring.cardId} lost its semantic control.`,
      );
      const [ringBox, controlBox] = await Promise.all([
        page.locator(`[data-legal-destination-attention="${ring.cardId}"]`).boundingBox(),
        control.boundingBox(),
      ]);
      const territory =
        ringBox !== null && controlBox !== null
          ? {
              ringBox,
              controlBox,
              leftOverflow: controlBox.x - ringBox.x,
              topOverflow: controlBox.y - ringBox.y,
              rightOverflow: ringBox.x + ringBox.width - (controlBox.x + controlBox.width),
              bottomOverflow: ringBox.y + ringBox.height - (controlBox.y + controlBox.height),
            }
          : { ringBox, controlBox };
      assert(
        ringBox !== null &&
          controlBox !== null &&
          ringBox.x >= controlBox.x - 1 &&
          ringBox.y >= controlBox.y - 1 &&
          ringBox.x + ringBox.width <= controlBox.x + controlBox.width + 1 &&
          ringBox.y + ringBox.height <= controlBox.y + controlBox.height + 1,
        `${label} target ${ring.cardId} edge escaped its legal semantic target territory: ${JSON.stringify(territory)}.`,
      );
    }
  }
  if (screenshot) {
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `legal-destination-${label}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }
}

async function assertUtilityDock(page, viewport) {
  const utilities = page.locator(".bottom-utilities > button");
  assert(
    JSON.stringify((await utilities.allTextContents()).map((text) => text.trim())) ===
      JSON.stringify(["History", "Yaku Guide", "Options"]),
    `${viewport.width}×${viewport.height} utility dock order changed.`,
  );
  const dockBox = await page.locator(".bottom-utilities").boundingBox();
  const frameBox = await page.locator(".game-frame").boundingBox();
  assert(
    dockBox !== null &&
      frameBox !== null &&
      dockBox.y >= frameBox.y + frameBox.height &&
      dockBox.x >= 0 &&
      dockBox.x + dockBox.width <= viewport.width + 1,
    `Utility dock escaped its bottom-safe area at ${viewport.width}×${viewport.height}: ${JSON.stringify({ dockBox, frameBox })}.`,
  );
}

async function assertYakuGuideContents(page) {
  const names = [
    "Five Brights",
    "Four Brights",
    "Four Brights with Rain",
    "Three Brights",
    "Blossom Viewing",
    "Moon Viewing",
    "Animal Trio",
    "Red Text Scrolls",
    "Blue Scrolls",
    "Current-Month Set",
    "Animals",
    "Scrolls",
    "Plain Cards",
  ];
  assert(
    JSON.stringify(await page.locator("[data-yaku-guide-key] h4").allTextContents()) ===
      JSON.stringify(names),
    "Yaku Guide did not contain the exact canonical thirteen-yaku reference order.",
  );
  const entries = page.locator("[data-yaku-guide-key]");
  assert((await entries.count()) === 13, "Yaku Guide did not render exactly thirteen entries.");
  assert(
    await entries.evaluateAll((items) =>
      items.every(
        (item) =>
          item.querySelectorAll("[data-yaku-guide-card]").length > 0 &&
          (item.querySelector(".yaku-guide__requirement")?.textContent ?? "").trim().length > 0 &&
          (item.querySelector(".yaku-guide__points")?.textContent ?? "").trim().length > 0,
      ),
    ),
    "At least one Yaku Guide entry lacks an example image, requirement, or points explanation.",
  );
  assert(
    /does not analyze the current table/u.test(
      ((await page.locator(".yaku-guide-dialog__intro").textContent()) ?? "").replace(/\s+/gu, " "),
    ),
    "Yaku Guide no longer clearly identifies itself as a reference rather than a live-table evaluator.",
  );
}

async function inspectCardImageFrames(page, selector) {
  return page.locator(selector).evaluateAll((images) =>
    images.map((image) => {
      const style = getComputedStyle(image);
      const colorChannels = style.borderTopColor.match(/[\d.]+/gu)?.map(Number) ?? [];
      const linearChannels = colorChannels.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return {
        borderColor: style.borderTopColor,
        borderWidth: Number.parseFloat(style.borderTopWidth),
        luminance:
          linearChannels.length === 3
            ? linearChannels[0] * 0.2126 + linearChannels[1] * 0.7152 + linearChannels[2] * 0.0722
            : Number.NaN,
      };
    }),
  );
}

function assertClearlyLightFrames(frames, label) {
  assert(frames.length > 0, `${label} has no card-image frames to inspect.`);
  assert(
    frames.every(
      ({ borderWidth, luminance }) =>
        borderWidth >= 2 && Number.isFinite(luminance) && luminance >= 0.8,
    ),
    `${label} does not use a clearly light card frame: ${JSON.stringify(frames)}.`,
  );
}

async function assertYakuGuideLightFrames(page, themeId) {
  await page.locator("[data-yaku-guide-trigger]").click();
  await page.locator("[data-yaku-guide-dialog]").waitFor({ state: "visible" });
  assertClearlyLightFrames(
    await inspectCardImageFrames(page, "[data-yaku-guide-card]"),
    `${themeId} Yaku Guide`,
  );
  await page.keyboard.press("Escape");
  assert(
    await page
      .locator("[data-yaku-guide-trigger]")
      .evaluate((element) => document.activeElement === element),
    `${themeId} Yaku Guide frame inspection did not restore focus.`,
  );
}

async function assertCardInspectorTheme(page, themeId) {
  const control = page.locator('[data-card-id="january-pine-plain-b"][data-inspectable="true"]');
  await control.focus();
  await page.keyboard.press("I");
  await page.locator("[data-card-inspector]").waitFor({ state: "visible" });
  const yaku = page.locator("[data-card-inspector-yaku]");
  const summary = page.locator("[data-card-inspector-yaku-summary]");
  assert(
    !(await yaku.evaluate((details) => details.open)),
    `${themeId} inspector did not reset closed.`,
  );
  await summary.click();
  assert(await yaku.evaluate((details) => details.open), `${themeId} inspector did not expand.`);
  assertClearlyLightFrames(
    await inspectCardImageFrames(page, "[data-card-inspector-yaku-entries] [data-yaku-guide-card]"),
    `${themeId} card inspector`,
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `theme-card-inspector-${themeId}-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert(
    await control.evaluate((element) => document.activeElement === element),
    `${themeId} inspector did not return focus to its invoking card.`,
  );
}

async function configureSecondaryOptions(page, options) {
  await page.emulateMedia({
    reducedMotion: options.animationMode === "normal" ? "no-preference" : "reduce",
  });
}

async function selectTheme(page, themeId) {
  await openOptions(page);
  await page.locator(`[data-theme-option][value="${themeId}"]`).check();
  await page.waitForFunction(
    (expectedThemeId) =>
      JSON.parse(window.render_game_to_text()).theme.activeId === expectedThemeId,
    themeId,
  );
  await closeOptions(page);
}

async function assertPointerQuietInteractionControl(page, selector, description) {
  const control = page.locator(selector);
  assert(await control.isVisible(), `${description} is missing.`);
  const readChrome = () =>
    control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderWidths: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ],
        boxShadow: style.boxShadow,
        outlineWidth: style.outlineWidth,
        pointerEvents: style.pointerEvents,
      };
    });
  const assertQuiet = (chrome, state) => {
    assert(
      chrome.borderWidths.every((width) => width === "0px") &&
        chrome.backgroundColor === "rgba(0, 0, 0, 0)" &&
        chrome.backgroundImage === "none" &&
        chrome.boxShadow === "none" &&
        chrome.outlineWidth === "0px" &&
        chrome.pointerEvents === "auto",
      `${description} has pointer-visible DOM chrome ${state}: ${JSON.stringify(chrome)}.`,
    );
  };
  assertQuiet(await readChrome(), "at rest");
  await control.hover();
  assertQuiet(await readChrome(), "under pointer hover");
  await control.focus();
  assert(
    await control.evaluate((element) => document.activeElement === element),
    `${description} lost keyboard focus semantics.`,
  );
  assert(
    ((await control.getAttribute("aria-label")) ?? "").trim().length > 0,
    `${description} lost its accessible name.`,
  );
  await control.evaluate((element) => element.blur());
  assert(
    await control.evaluate((element) => document.activeElement !== element),
    `${description} retained focus and would contaminate pointer-state evidence.`,
  );
}

async function resetLocalRoundPage(page, pageUrl, browserErrors, networkErrors) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await waitForApplicationReady(page, browserErrors, networkErrors);
}

async function waitForAcceptedHandIntent(page, previousVersion) {
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
    previousVersion,
    { timeout: 30_000 },
  );
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
  await button.click({ noWaitAfter: true });
  await finishNonVisualGameplayPlan(page);
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

async function chooseYakuDecisionThroughResultBeat(page, choice) {
  const before = await readState(page);
  const selector = choice === "bank" ? "[data-yaku-bank]" : "[data-yaku-koi-koi]";
  await page.evaluate(() => {
    const feedback = document.querySelector("[data-yaku-feedback]");
    const result = document.querySelector("[data-round-result]");
    if (!(feedback instanceof HTMLElement) || !(result instanceof HTMLElement)) {
      throw new Error("Phase 5A feedback/result surfaces are missing.");
    }
    globalThis.__phase3cResultObserver?.disconnect();
    const trace = [];
    const record = () => {
      const state = JSON.parse(globalThis.render_game_to_text());
      trace.push({
        feedbackVisible: !feedback.hidden,
        resultVisible: !result.hidden,
        inputLockReason: state.input.lockReason,
        stateVersion: state.localRound.stateVersion,
      });
    };
    const observer = new MutationObserver(record);
    observer.observe(feedback, { attributeFilter: ["hidden"], attributes: true });
    observer.observe(result, { attributeFilter: ["hidden"], attributes: true });
    globalThis.__phase3cResultTrace = trace;
    globalThis.__phase3cResultObserver = observer;
    record();
  });
  await page.locator(selector).click({ noWaitAfter: true });
  await finishNonVisualGameplayPlan(page);
  await page.waitForFunction(
    (version) =>
      globalThis.__phase3cResultTrace?.some(
        (entry) =>
          entry.stateVersion > version &&
          entry.inputLockReason === "awaitingObservation" &&
          entry.feedbackVisible &&
          !entry.resultVisible,
      ),
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(globalThis.render_game_to_text());
      const result = document.querySelector("[data-round-result]");
      return (
        state.localRound.stateVersion > version &&
        state.input.lockReason !== "awaitingObservation" &&
        result instanceof HTMLElement &&
        !result.hidden
      );
    },
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
  const state = await readState(page);
  const trace = await page.evaluate(() => {
    globalThis.__phase3cResultObserver?.disconnect();
    const entries = globalThis.__phase3cResultTrace ?? [];
    delete globalThis.__phase3cResultObserver;
    delete globalThis.__phase3cResultTrace;
    return entries;
  });
  return { state, trace };
}

async function waitForResultVisualSettlement(page) {
  await page.waitForFunction(() => {
    const result = document.querySelector("[data-round-result]");
    const score = document.querySelector("[data-round-result-score]");
    return (
      result instanceof HTMLElement &&
      !result.hidden &&
      getComputedStyle(result).opacity === "1" &&
      (!(score instanceof HTMLElement) || score.hidden || getComputedStyle(score).opacity === "1")
    );
  });
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

async function finishNonVisualGameplayPlan(page) {
  await page.evaluate(() => window.advanceTime(5_000));
}

async function resolvePendingDrawIfNeeded(page) {
  const pending = await readState(page);
  if (pending.localRound.phase !== "awaitingDrawResolution") return pending;
  const beforeVersion = pending.localRound.stateVersion;
  const reveal = page.locator('[data-input-role="selectable"]');
  assert(
    (await reveal.count()) === 1,
    "A pending Draw must expose exactly one selectable Reveal card.",
  );
  await reveal.click({ noWaitAfter: true });
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(window.render_game_to_text());
      return state.localRound.stateVersion > version || state.input.status !== "idle";
    },
    beforeVersion,
    { timeout: 30_000 },
  );
  const afterReveal = await readState(page);
  if (
    afterReveal.localRound.stateVersion > beforeVersion ||
    afterReveal.input.status === "intentPending"
  ) {
    await finishNonVisualGameplayPlan(page);
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
      beforeVersion,
      { timeout: 30_000 },
    );
    return readState(page);
  }
  await page.waitForFunction(
    () => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.input.status === "targeting" ||
        (state.input.status === "confirming" &&
          (document.querySelectorAll('[data-input-role="target"]').length > 0 ||
            document.querySelector("[data-input-field-placement]")?.checkVisibility()))
      );
    },
    null,
    { timeout: 30_000 },
  );
  const targets = page.locator('[data-input-role="target"]');
  if ((await targets.count()) > 0) {
    await targets.first().click({ noWaitAfter: true });
  } else {
    const placement = page.locator("[data-input-field-placement]");
    assert(await placement.isVisible(), "An unmatched pending Draw must expose the field.");
    await placement.click({ noWaitAfter: true });
  }
  await finishNonVisualGameplayPlan(page);
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
    beforeVersion,
    { timeout: 30_000 },
  );
  return readState(page);
}

async function advanceUntilAnimationClip(page, kind, eventType) {
  for (let step = 0; step < 40; step += 1) {
    const state = await readState(page);
    if (
      state.animation.activeClip?.kind === kind &&
      state.animation.activeClip?.eventType === eventType
    ) {
      if (state.animation.activeClip.progress === 0) {
        await page.evaluate(() => window.advanceTime(1));
        continue;
      }
      return state;
    }
    await page.evaluate(() => window.advanceTime(60));
  }
  throw new Error(`Timed out waiting for ${eventType} ${kind} animation clip.`);
}

async function submitOpeningHandForPhysicalDraw(page) {
  const hand = page.locator('[data-input-role="selectable"][data-card-id="november-red-scroll"]');
  assert(await hand.isVisible(), "The physical Draw trace needs a selectable opening hand card.");
  await hand.click();
  const selected = await readState(page);
  if (selected.input.status === "targeting") {
    const target = page.locator('[data-input-role="target"]').first();
    assert((await target.count()) === 1, "A target-selection hand play exposed no legal target.");
    await target.click();
  } else if (selected.input.status === "confirming") {
    const target = page.locator('[data-input-role="target"]').first();
    if ((await target.count()) === 1) await target.click();
    else await page.locator("[data-input-field-placement]").click();
  }
  await page.waitForTimeout(0);
}

async function runPhysicalDrawTrace(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await configureSecondaryOptions(page, { animationMode: "normal", inputMode: "guided" });
  await page.evaluate(() => window.advanceTime(0));
  await submitOpeningHandForPhysicalDraw(page);
  await assertHandPlayAttentionHidden(page, "Hand submission / Draw animation");
  await assertRevealPlayAttentionHidden(page, "Hand submission / Draw animation");

  const drawTravel = await advanceUntilAnimationClip(page, "draw", "drawCardRevealed");
  assert(
    drawTravel.animation.transitCardCount === 1,
    `Draw travel did not use one transient CardView: ${JSON.stringify(drawTravel.animation)}.`,
  );
  assert(
    drawTravel.cards.visibleViews.every(({ faceUp }) => faceUp),
    "A face-down Draw card identity entered the recipient-visible text surface.",
  );
  assert(
    (await actionableSemanticControlCount(page)) === 0,
    "Draw input became actionable before the face-down card reached Reveal.",
  );
  await assertRevealPlayAttentionHidden(page, "Draw travel");
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `draw-top-travel-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });

  await advanceUntilAnimationClip(page, "flip", "drawCardRevealed");
  assert(
    (await actionableSemanticControlCount(page)) === 0,
    "Draw input became actionable before the revealed card pause completed.",
  );
  await assertRevealPlayAttentionHidden(page, "Draw flip");
  await page.evaluate(() => window.advanceTime(140));
  const revealPause = await advanceUntilAnimationClip(page, "revealPause", "drawCardRevealed");
  assert(
    revealPause.cards.visibleViews.some(({ zone }) => zone === "reveal"),
    "The revealed card did not become visible in the Reveal zone after the flip.",
  );
  assert(
    (await actionableSemanticControlCount(page)) === 0,
    "Reveal controls appeared before the identify pause completed.",
  );
  await assertRevealPlayAttentionHidden(page, "Draw reveal pause");
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `draw-reveal-pause-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });

  await page.evaluate(() => window.advanceTime(1_000));
  await page.waitForFunction(
    () => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.localRound.phase === "awaitingDrawResolution" &&
        state.animation.status !== "playing" &&
        state.input.status === "idle" &&
        state.input.selectableCardIds.length === 1
      );
    },
    null,
    { timeout: 30_000 },
  );
  const settled = await readState(page);
  await assertHandPlayAttentionHidden(page, "settled Draw Reveal");
  await assertNoLegalDestinationAttention(page, "settled unselected Draw Reveal");
  const settledBeforeOptions = await assertRevealPlayAttention(page, {
    label: "settled-390x844",
    screenshot: true,
  });
  assert(
    settled.cards.visibleViews.filter(({ zone }) => zone === "reveal").length === 1,
    "The settled Draw state did not expose exactly one revealed card.",
  );
  assert(
    settled.animation.activeClip === null && settled.animation.transitCardCount === 0,
    "A Draw resolution manufactured movement before the player tapped Reveal.",
  );
  assert(
    (await page.locator('[data-input-role="target"]').count()) === 0,
    "A settled unselected Reveal exposed field targets before the player tapped it.",
  );
  await openOptions(page);
  await assertRevealPlayAttentionHidden(page, "settled Draw Options dialog");
  const duringOptions = await readState(page);
  assert(
    duringOptions.localRound.stateVersion === settledBeforeOptions.localRound.stateVersion &&
      duringOptions.localRound.commandCount === settledBeforeOptions.localRound.commandCount &&
      duringOptions.cards.cardViewCount === settledBeforeOptions.cards.cardViewCount &&
      JSON.stringify(
        duringOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
      ) ===
        JSON.stringify(
          settledBeforeOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
        ),
    "Options changed settled Reveal authority or persistent CardView identity.",
  );
  await closeOptions(page);
  await assertRevealPlayAttention(page, { label: "settled-options-restored-390x844" });
  for (const themeId of ["ink-parchment", "moonlit-indigo", "warm-ivory"]) {
    await selectTheme(page, themeId);
    await assertRevealPlayAttention(page, {
      label: `settled-theme-${themeId}-390x844`,
      screenshot: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertRevealPlayAttention(page, {
    label: "settled-reduced-motion-390x844",
    reducedMotion: true,
    screenshot: true,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await assertRevealPlayAttention(page, {
    label: "settled-reduced-motion-844x390",
    reducedMotion: true,
    screenshot: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await assertRevealPlayAttention(page, { label: "settled-motion-restored-390x844" });
  await selectTheme(page, "ink-parchment");
  await assertRevealPlayAttention(page, { label: "settled-theme-restored-ink-390x844" });
  const revealControl = page.locator('[data-input-role="selectable"]').first();
  await revealControl.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status !== "idle",
    null,
    { timeout: 30_000 },
  );
  assert(
    (await revealControl.getAttribute("aria-pressed")) === "true",
    "The actionable Reveal card did not retain its selected-source semantics.",
  );
  await assertRevealPlayAttentionHidden(page, "selected Reveal source");
  assert(
    (await page.locator('[data-input-role="target"]').count()) > 0 ||
      (await page.locator("[data-input-field-placement]").isVisible()),
    "Selecting Reveal did not expose existing gold legal target or no-match destination semantics.",
  );
  const selectedTargetCount = await page.locator('[data-input-role="target"]').count();
  await assertLegalDestinationAttention(page, {
    label: "draw-reveal-selected-390x844",
    kind: selectedTargetCount > 0 ? "targets" : "fieldPlacement",
    screenshot: true,
  });
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `draw-reveal-selected-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  const selectedBeforeOptions = await readState(page);
  const selectedFieldPlacementVisible = await page
    .locator("[data-input-field-placement]")
    .isVisible();
  await openOptions(page);
  await assertRevealPlayAttentionHidden(page, "selected Reveal Options dialog");
  await assertNoLegalDestinationAttention(page, "selected Reveal Options dialog");
  const selectedDuringOptions = await readState(page);
  assert(
    selectedDuringOptions.input.status === selectedBeforeOptions.input.status &&
      selectedDuringOptions.input.selectedCardId === selectedBeforeOptions.input.selectedCardId &&
      JSON.stringify(selectedDuringOptions.input.legalTargetCardIds) ===
        JSON.stringify(selectedBeforeOptions.input.legalTargetCardIds) &&
      selectedDuringOptions.localRound.stateVersion ===
        selectedBeforeOptions.localRound.stateVersion &&
      selectedDuringOptions.localRound.commandCount ===
        selectedBeforeOptions.localRound.commandCount &&
      selectedDuringOptions.cards.cardViewCount === selectedBeforeOptions.cards.cardViewCount &&
      JSON.stringify(
        selectedDuringOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
      ) ===
        JSON.stringify(
          selectedBeforeOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
        ) &&
      (await page.locator("[data-input-field-placement]").isVisible()) ===
        selectedFieldPlacementVisible &&
      (await page.locator('[data-input-role="target"]').count()) === selectedTargetCount,
    "Options changed selected Reveal status, targets, field placement, authority, or persistent CardViews.",
  );
  await closeOptions(page);
  await assertRevealPlayAttentionHidden(page, "selected Reveal Options restored");
  await assertLegalDestinationAttention(page, {
    label: "draw-reveal-selected-options-restored-390x844",
    kind: selectedTargetCount > 0 ? "targets" : "fieldPlacement",
  });
  const selectedAfterOptions = await readState(page);
  assert(
    selectedAfterOptions.input.status === selectedBeforeOptions.input.status &&
      selectedAfterOptions.input.selectedCardId === selectedBeforeOptions.input.selectedCardId &&
      JSON.stringify(selectedAfterOptions.input.legalTargetCardIds) ===
        JSON.stringify(selectedBeforeOptions.input.legalTargetCardIds) &&
      selectedAfterOptions.localRound.stateVersion ===
        selectedBeforeOptions.localRound.stateVersion &&
      selectedAfterOptions.localRound.commandCount ===
        selectedBeforeOptions.localRound.commandCount &&
      selectedAfterOptions.cards.cardViewCount === selectedBeforeOptions.cards.cardViewCount &&
      JSON.stringify(
        selectedAfterOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
      ) ===
        JSON.stringify(
          selectedBeforeOptions.cards.visibleViews.map(({ cardId, token }) => [cardId, token]),
        ),
    "Closing Options did not preserve the selected Reveal interaction state.",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).input.status === "idle",
    null,
    { timeout: 30_000 },
  );
  await assertRevealPlayAttention(page, { label: "settled-cancel-restored-390x844" });
  await assertNoLegalDestinationAttention(page, "settled cancelled Draw Reveal");
}

async function playHandCardById(page, cardId) {
  await acceptHandoffIfPending(page);
  await resolvePendingDrawIfNeeded(page);
  await acceptHandoffIfPending(page);
  const before = await readState(page);
  assert(
    before.localRound.phase === "awaitingHandPlay",
    `Expected awaitingHandPlay before ${cardId}, received ${before.localRound.phase}.`,
  );
  const button = page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`);
  assert((await button.count()) === 1, `The locked trace card ${cardId} is not selectable.`);
  await button.click({ noWaitAfter: true });
  await page.waitForFunction(
    (version) => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.localRound.stateVersion > version ||
        state.input.status === "confirming" ||
        state.input.status === "targeting"
      );
    },
    before.localRound.stateVersion,
    { timeout: 30_000 },
  );
  const selected = await readState(page);
  let commandEmitted =
    selected.localRound.stateVersion > before.localRound.stateVersion ||
    selected.input.status === "intentPending";
  if (selected.localRound.stateVersion === before.localRound.stateVersion) {
    const target = page.locator('[data-input-role="target"]').first();
    if ((await target.count()) > 0) await target.click({ noWaitAfter: true });
    else {
      const placement = page.locator("[data-input-field-placement]");
      assert(
        await placement.isVisible(),
        `The locked trace card ${cardId} has no tap destination.`,
      );
      await placement.click({ noWaitAfter: true });
    }
    commandEmitted = true;
  }
  if (commandEmitted) await finishNonVisualGameplayPlan(page);
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

async function playProductionRoundToResult(page, label) {
  for (let step = 0; step < 64; step += 1) {
    let state = await acceptHandoffIfPending(page);
    if (state.localRound.phase === "roundComplete" || state.localRound.phase === "matchComplete") {
      return state;
    }
    if (state.localRound.phase === "awaitingYakuDecision") {
      const bank = page.locator("[data-yaku-bank]");
      const koiKoi = page.locator("[data-yaku-koi-koi]");
      const canBank = (await bank.isVisible()) && (await bank.isEnabled());
      const canKoiKoi = (await koiKoi.isVisible()) && (await koiKoi.isEnabled());
      if (canBank) {
        await chooseYakuDecision(page, "bank");
        await waitForResultVisualSettlement(page);
        return readState(page);
      }
      if (canKoiKoi) {
        await chooseYakuDecision(page, "koiKoi");
        const afterDecision = await readState(page);
        if (afterDecision.result !== null) {
          await waitForResultVisualSettlement(page);
          return afterDecision;
        }
        continue;
      }
      throw new Error(
        `${label} has no enabled authoritative Yaku decision: ${JSON.stringify({ phase: state.localRound.phase, bankVisible: await bank.isVisible(), bankEnabled: await bank.isEnabled(), koiKoiVisible: await koiKoi.isVisible(), koiKoiEnabled: await koiKoi.isEnabled() })}.`,
      );
    }
    if (state.localRound.phase === "awaitingDrawResolution") {
      await resolvePendingDrawIfNeeded(page);
      continue;
    }
    if (state.localRound.phase === "awaitingHandPlay") {
      const cardId = await page
        .locator('[data-input-role="selectable"]')
        .first()
        .getAttribute("data-card-id");
      assert(cardId !== null, `${label} had no production hand card to play.`);
      await playHandCardById(page, cardId);
      continue;
    }
    state = await readState(page);
    throw new Error(`${label} reached an unsupported production phase: ${state.localRound.phase}.`);
  }
  throw new Error(
    `${label} did not reach an authoritative result within the bounded production trace.`,
  );
}

async function playHandCardThroughFeedbackBeat(page, cardId) {
  await acceptHandoffIfPending(page);
  await resolvePendingDrawIfNeeded(page);
  await acceptHandoffIfPending(page);
  const before = await readState(page);
  const button = page.locator(`[data-input-role="selectable"][data-card-id="${cardId}"]`);
  assert((await button.count()) === 1, `The feedback-boundary card ${cardId} is not selectable.`);
  await page.evaluate(() => {
    const feedback = document.querySelector("[data-yaku-feedback]");
    const decision = document.querySelector("[data-yaku-decision]");
    if (!(feedback instanceof HTMLElement) || !(decision instanceof HTMLElement)) {
      throw new Error("Phase 3B feedback surfaces are missing.");
    }
    globalThis.__phase3bFeedbackObserver?.disconnect();
    const trace = [];
    const record = () => {
      const state = JSON.parse(globalThis.render_game_to_text());
      trace.push({
        decisionVisible: !decision.hidden,
        feedbackVisible: !feedback.hidden,
        inputLockReason: state.input.lockReason,
        stateVersion: state.localRound.stateVersion,
      });
    };
    const observer = new MutationObserver(record);
    observer.observe(feedback, { attributeFilter: ["hidden"], attributes: true });
    observer.observe(decision, { attributeFilter: ["hidden"], attributes: true });
    globalThis.__phase3bFeedbackTrace = trace;
    globalThis.__phase3bFeedbackObserver = observer;
    record();
  });
  await button.click();
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.input.status === "confirming" || state.input.status === "targeting";
  });
  const target = page.locator('[data-input-role="target"]').first();
  if ((await target.count()) > 0) await target.click({ noWaitAfter: true });
  else {
    const placement = page.locator("[data-input-field-placement]");
    assert(
      await placement.isVisible(),
      `The feedback-boundary card ${cardId} has no tap destination.`,
    );
    await placement.click({ noWaitAfter: true });
  }
  await finishNonVisualGameplayPlan(page);
  await page.waitForFunction(
    (version) => {
      return globalThis.__phase3bFeedbackTrace?.some(
        (entry) =>
          entry.stateVersion > version &&
          entry.inputLockReason === "awaitingObservation" &&
          entry.feedbackVisible &&
          !entry.decisionVisible,
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
  const state = await readState(page);
  await page.evaluate(() => {
    globalThis.__phase3bFeedbackObserver?.disconnect();
    delete globalThis.__phase3bFeedbackObserver;
    delete globalThis.__phase3bFeedbackTrace;
  });
  return state;
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
const densityReviewResponse = await fetch(`${pageUrl}field-density-review.html`);
assert(
  densityReviewResponse.status === 404,
  "The non-shipping Phase 3D-D density harness entered the production build.",
);
process.stdout.write(`Phase 5A smoke server ready at ${pageUrl}.\n`);

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
      assert(state.screen === "localRound", "Phase 5A must identify the local round screen.");
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
      await assertHandPlayAttention(page, {
        label: `baseline-${viewport.width}x${viewport.height}`,
      });
      assert(
        state.theme.activeId === "ink-parchment" && state.theme.optionsOpen === false,
        `The fresh production shell did not use its default Ink theme: ${JSON.stringify(state.theme)}.`,
      );
      assert(
        (await page.locator("[data-turn-context]").count()) === 0 &&
          !(await page.locator(".turn-recap").isVisible()),
        "The removed turn/status scaffolding remained visible on a fresh round.",
      );
      assert(state.cards.cardViewCount === 48, "The persistent 48-card registry changed.");
      assert(
        state.scene.emptyFieldPlaceholderCount === 0,
        "The table rendered numbered or outlined empty field-card placeholders.",
      );
      const minimumPlayerHandHeights = new Map([
        ["320x568", 108],
        ["390x844", 120],
        ["844x390", 88],
        ["1366x768", 120],
      ]);
      const minimumHandHeight = minimumPlayerHandHeights.get(
        `${viewport.width}x${viewport.height}`,
      );
      if (minimumHandHeight !== undefined) {
        assert(
          state.layout.zones.playerHand.height >= minimumHandHeight,
          `The enlarged player hand regressed at ${viewport.width}×${viewport.height}: ${state.layout.zones.playerHand.height}.`,
        );
      }
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
      if (viewport.width === 844 && viewport.height === 390) {
        for (const selector of ["[data-yaku-progress]"]) {
          assert(await page.locator(selector).isVisible(), `${selector} disappeared in landscape.`);
        }
      }
      const optionsBox = await page.locator("[data-options-trigger]").boundingBox();
      const frameBox = await page.locator(".game-frame").boundingBox();
      assert(
        optionsBox !== null && frameBox !== null && optionsBox.y >= frameBox.y + frameBox.height,
        `Options overlaps the card table at ${viewport.width}×${viewport.height}: ${JSON.stringify({ optionsBox, frameBox })}.`,
      );
      await assertUtilityDock(page, viewport);
      await page.screenshot({
        path: resolve(
          outputDirectory,
          `local-round-${viewport.width}x${viewport.height}${smokeBasePath === "/" ? "" : "-pages"}.png`,
        ),
        fullPage: true,
      });
    }
    process.stdout.write("Phase 5A seven-viewport baseline passed.\n");
  } else {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await waitForApplicationReady(page, browserErrors, networkErrors);
  }

  if (process.env.SMOKE_PHASE5A_ONLY !== "1") {
    await page.setViewportSize({ width: 390, height: 844 });
    const handCueBeforeOptions = await assertHandPlayAttention(page, {
      label: "390x844",
      screenshot: true,
    });
    await assertNoLegalDestinationAttention(page, "idle Hand");
    const handCueSemanticCount = await actionableSemanticControlCount(page);
    await openOptions(page);
    await assertHandPlayAttentionHidden(page, "Options dialog");
    await closeOptions(page);
    const handCueAfterOptions = await assertHandPlayAttention(page, { label: "390x844-restored" });
    assert(
      handCueAfterOptions.localRound.stateVersion ===
        handCueBeforeOptions.localRound.stateVersion &&
        handCueAfterOptions.localRound.commandCount ===
          handCueBeforeOptions.localRound.commandCount &&
        handCueAfterOptions.cards.cardViewCount === handCueBeforeOptions.cards.cardViewCount &&
        (await actionableSemanticControlCount(page)) === handCueSemanticCount,
      "Opening or closing Options changed Hand attention authority or semantic controls.",
    );
    const handSource = page.locator(
      '[data-input-role="selectable"][data-card-id="april-red-scroll"]',
    );
    await handSource.click();
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).input.selectedCardId === "april-red-scroll",
    );
    await assertHandPlayAttentionHidden(page, "selected Hand source");
    const selectedHandCueState = await readState(page);
    assert(
      selectedHandCueState.localRound.stateVersion ===
        handCueBeforeOptions.localRound.stateVersion &&
        selectedHandCueState.localRound.commandCount ===
          handCueBeforeOptions.localRound.commandCount &&
        selectedHandCueState.cards.cardViewCount === handCueBeforeOptions.cards.cardViewCount &&
        (await handSource.getAttribute("aria-pressed")) === "true",
      "Selecting a Hand source changed authority, persistent CardViews, or selected-source semantics before the existing move resolves.",
    );
    await assertLegalDestinationAttention(page, {
      label: "hand-target-selected-390x844",
      kind: selectedHandCueState.input.fieldPlacementAvailable ? "fieldPlacement" : "targets",
      screenshot: true,
    });
    for (const themeId of ["ink-parchment", "moonlit-indigo", "warm-ivory"]) {
      await selectTheme(page, themeId);
      await assertLegalDestinationAttention(page, {
        label: `hand-target-${themeId}-390x844`,
        kind: "targets",
        screenshot: true,
      });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await assertLegalDestinationAttention(page, {
      label: "hand-target-reduced-motion-390x844",
      kind: "targets",
      reducedMotion: true,
      screenshot: true,
    });
    await page.setViewportSize({ width: 844, height: 390 });
    await waitForViewportSettlement(page, { width: 844, height: 390 });
    await assertLegalDestinationAttention(page, {
      label: "hand-target-reduced-motion-844x390",
      kind: "targets",
      reducedMotion: true,
      screenshot: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForViewportSettlement(page, { width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await selectTheme(page, "ink-parchment");
    await assertLegalDestinationAttention(page, {
      label: "hand-target-motion-restored-390x844",
      kind: "targets",
    });
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `hand-start-cue-selected-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state.input.status === "idle" && state.input.selectedCardId === null;
    });
    const handCueAfterCancel = await assertHandPlayAttention(page, { label: "390x844-cancelled" });
    await assertNoLegalDestinationAttention(page, "cancelled Hand source");
    assert(
      handCueAfterCancel.localRound.stateVersion === handCueBeforeOptions.localRound.stateVersion &&
        handCueAfterCancel.localRound.commandCount ===
          handCueBeforeOptions.localRound.commandCount &&
        handCueAfterCancel.cards.cardViewCount === handCueBeforeOptions.cards.cardViewCount,
      "Cancelling a selected Hand source changed authority or persistent CardViews.",
    );
    await assertUtilityDialogCycle(page, {
      trigger: "[data-context-help-trigger]",
      dialog: "[data-context-help-dialog]",
      close: "[data-context-help-close]",
      label: "Contextual help",
    });
    await assertContextHelp(page);
    await assertUtilityDialogCycle(page, {
      trigger: "[data-history-trigger]",
      dialog: "[data-history-dialog]",
      close: "[data-history-close]",
      label: "History",
    });
    await assertUtilityDialogCycle(page, {
      trigger: "[data-yaku-guide-trigger]",
      dialog: "[data-yaku-guide-dialog]",
      close: "[data-yaku-guide-close]",
      label: "Yaku Guide",
    });
    await page.locator("[data-yaku-guide-trigger]").click();
    await page.locator("[data-yaku-guide-dialog]").waitFor({ state: "visible" });
    await assertYakuGuideContents(page);
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `yaku-guide-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await assertUtilityDialogCycle(page, {
      trigger: "[data-options-trigger]",
      dialog: "[data-options-dialog]",
      close: "[data-options-close]",
      focus: '[data-theme-option][value="ink-parchment"]',
      label: "Options",
    });
    for (const themeId of ["ink-parchment", "moonlit-indigo", "warm-ivory"]) {
      await selectTheme(page, themeId);
      await assertHandPlayAttention(page, { label: `theme-${themeId}-390x844`, screenshot: true });
      await assertYakuGuideLightFrames(page, themeId);
      await assertCardInspectorTheme(page, themeId);
    }
    await selectTheme(page, "ink-parchment");
    await page.setViewportSize({ width: 844, height: 390 });
    await assertHandPlayAttention(page, { label: "844x390", screenshot: true });
    await assertUtilityDock(page, { width: 844, height: 390 });
    await assertUtilityDialogCycle(page, {
      trigger: "[data-history-trigger]",
      dialog: "[data-history-dialog]",
      close: "[data-history-close]",
      label: "History landscape",
    });
    await assertUtilityDialogCycle(page, {
      trigger: "[data-yaku-guide-trigger]",
      dialog: "[data-yaku-guide-dialog]",
      close: "[data-yaku-guide-close]",
      label: "Yaku Guide landscape",
    });
    await assertUtilityDialogCycle(page, {
      trigger: "[data-options-trigger]",
      dialog: "[data-options-dialog]",
      close: "[data-options-close]",
      focus: '[data-theme-option][value="ink-parchment"]',
      label: "Options landscape",
    });
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `utility-dock-844x390${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertCardInspection(
      page,
      '[data-card-id="january-pine-plain-b"][data-inspectable="true"]',
      "field-card",
      ["currentMonthSet", "plainCards"],
    );
    await assertCardInspection(
      page,
      '[data-card-id="november-red-scroll"][data-inspectable="true"]',
      "own-hand-card",
      ["currentMonthSet", "scrolls"],
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await assertContextHelp(page, "844x390");
    await assertCardInspection(
      page,
      '[data-card-id="january-pine-plain-b"][data-inspectable="true"]',
      "field-card",
      ["currentMonthSet", "plainCards"],
      "844x390",
    );
    await assertCardInspection(
      page,
      '[data-card-id="december-phoenix"][data-inspectable="true"]',
      "high-entry-field-card",
      ["fiveBrights", "fourBrights", "fourBrightsWithRain", "threeBrights", "currentMonthSet"],
      "844x390",
      { assertScroll: true },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await runPhysicalDrawTrace(page);
    await resetLocalRoundPage(page, pageUrl, browserErrors, networkErrors);
    await configureSecondaryOptions(page, { animationMode: "reducedMotion" });
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).animation.mode === "reducedMotion",
    );
    await assertHandPlayAttention(page, {
      label: "reduced-motion-390x844",
      reducedMotion: true,
      screenshot: true,
    });

    await openOptions(page);
    await assertHandPlayAttentionHidden(page, "reduced-motion Options dialog");
    for (const removedControl of [
      "[data-input-mode]",
      "[data-animation-mode]",
      "[data-animation-accelerate]",
      "[data-animation-finish]",
    ]) {
      assert(
        (await page.locator(removedControl).count()) === 0,
        `${removedControl} remained in the simplified Options dialog.`,
      );
    }
    assert(
      await page.locator('[data-theme-option][value="ink-parchment"]').isChecked(),
      "Options did not identify the selected Ink theme.",
    );
    assert(
      await page
        .locator('[data-theme-option][value="ink-parchment"]')
        .evaluate((option) => document.activeElement === option),
      "Options did not focus the selected theme.",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `options-ink-parchment-mobile${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    assert(
      !(await page.locator("[data-options-dialog]").evaluate((dialog) => dialog.open)) &&
        (await page
          .locator("[data-options-trigger]")
          .evaluate((trigger) => document.activeElement === trigger)),
      "Escape did not close Options and return focus to its trigger.",
    );
    await assertHandPlayAttention(page, {
      label: "reduced-motion-390x844-restored",
      reducedMotion: true,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).animation.mode === "normal",
    );
    await assertHandPlayAttention(page, { label: "motion-restored-390x844" });

    await page
      .locator('[data-input-role="selectable"][data-card-id="november-red-scroll"]')
      .click();
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).input.selectedCardId === "november-red-scroll",
    );
    const beforeThemeSwitch = await readState(page);
    const persistentTokens = beforeThemeSwitch.cards.visibleViews.map(({ cardId, token }) => [
      cardId,
      token,
    ]);
    for (const themeId of ["ink-parchment", "moonlit-indigo", "warm-ivory"]) {
      await selectTheme(page, themeId);
      const themed = await readState(page);
      assert(
        themed.theme.activeId === themeId &&
          themed.theme.optionsOpen === false &&
          themed.canvasCount === 1 &&
          themed.cards.cardViewCount === 48 &&
          themed.deck.activeDeckId === beforeThemeSwitch.deck.activeDeckId &&
          themed.localRound.stateVersion === beforeThemeSwitch.localRound.stateVersion &&
          themed.localRound.commandCount === beforeThemeSwitch.localRound.commandCount &&
          themed.input.selectedCardId === beforeThemeSwitch.input.selectedCardId &&
          JSON.stringify(themed.input.legalTargetCardIds) ===
            JSON.stringify(beforeThemeSwitch.input.legalTargetCardIds) &&
          JSON.stringify(themed.cards.visibleViews.map(({ cardId, token }) => [cardId, token])) ===
            JSON.stringify(persistentTokens),
        `${themeId} changed gameplay state or persistent CardView identity.`,
      );
      assert(
        (await page.locator("[data-input-instruction]").textContent())?.includes(
          "highlighted field",
        ),
        `${themeId} replaced the selected-card accessibility instruction.`,
      );
      await assertPointerQuietInteractionControl(
        page,
        "[data-input-field-placement]",
        `${themeId} no-match field destination`,
      );
      for (const viewport of [
        { id: "mobile", width: 390, height: 844 },
        { id: "desktop", width: 1366, height: 768 },
      ]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(
          (width) => JSON.parse(window.render_game_to_text()).viewport.width === width,
          viewport.width,
        );
        await page.screenshot({
          path: resolve(
            outputDirectory,
            `theme-${themeId}-${viewport.id}${smokeBasePath === "/" ? "" : "-pages"}.png`,
          ),
          fullPage: true,
        });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await selectTheme(page, "moonlit-indigo");
    await page.reload({ waitUntil: "networkidle" });
    await waitForApplicationReady(page, browserErrors, networkErrors);
    const restoredTheme = await readState(page);
    assert(
      restoredTheme.theme.activeId === "moonlit-indigo" &&
        (await page.locator('meta[name="theme-color"]').getAttribute("content")) === "#080f1b",
      "The IndexedDB theme preference did not restore after reload.",
    );
    await selectTheme(page, "ink-parchment");
    await configureSecondaryOptions(page, { animationMode: "reducedMotion" });
    process.stdout.write(
      "Phase 3D-C runtime theme, persistence, and Options focus trace passed.\n",
    );

    await configureSecondaryOptions(page, { animationMode: "normal" });
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).animation.mode === "normal",
    );
    const placementBefore = await readState(page);
    await page
      .locator('[data-input-role="selectable"][data-card-id="november-red-scroll"]')
      .click();
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.input.status === "confirming" &&
        state.input.handResolutionKind === "placeOnField" &&
        state.input.fieldPlacementAvailable === true
      );
    });
    const placementSelected = await readState(page);
    assert(
      placementSelected.localRound.stateVersion === placementBefore.localRound.stateVersion &&
        placementSelected.input.selectedCardId === "november-red-scroll" &&
        placementSelected.input.legalTargetCardIds.length === 0,
      "No-match source selection mutated state or invented a capture target.",
    );
    await assertLegalDestinationAttention(page, {
      label: "hand-no-match-selected-390x844",
      kind: "fieldPlacement",
      screenshot: true,
    });
    const placementControl = page.locator("[data-input-field-placement]");
    assert(await placementControl.isVisible(), "The no-match field destination is missing.");
    assert(
      (await placementControl.getAttribute("aria-label")) === "No match. Place card on the field.",
      "The field destination does not retain its exact no-match accessible wording.",
    );
    await assertPointerQuietInteractionControl(
      page,
      "[data-input-field-placement]",
      "No-match field destination",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `no-match-field-destination-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.evaluate(() => window.advanceTime(0));
    await placementControl.click({ noWaitAfter: true });
    const noMatchTravel = await advanceUntilAnimationClip(page, "travel", "cardPlacedOnField");
    assert(
      noMatchTravel.animation.activeClip?.kind === "travel" &&
        noMatchTravel.animation.activeClip?.eventType === "cardPlacedOnField",
      "No-match placement did not enter its direct field-travel clip.",
    );
    const activeNoMatchTravel = noMatchTravel.animation.activeClip;
    if (!activeNoMatchTravel) throw new Error("No-match travel clip disappeared before evidence.");
    const remainingNoMatchTravelMs = activeNoMatchTravel.durationMs - activeNoMatchTravel.elapsedMs;
    const midTravelAdvanceMs = Math.max(1, Math.floor(remainingNoMatchTravelMs / 2));
    assert(
      midTravelAdvanceMs < remainingNoMatchTravelMs,
      `No-match travel has no safe mid-clip evidence interval: ${JSON.stringify(activeNoMatchTravel)}.`,
    );
    await page.evaluate((durationMs) => window.advanceTime(durationMs), midTravelAdvanceMs);
    const noMatchMidTravel = await readState(page);
    assert(
      noMatchMidTravel.animation.activeClip?.kind === "travel" &&
        noMatchMidTravel.animation.activeClip?.eventType === "cardPlacedOnField",
      "No-match placement settled before its mid-travel evidence frame.",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `no-match-direct-field-travel-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.evaluate(() => window.advanceTime(1_000));
    await waitForAcceptedHandIntent(page, placementBefore.localRound.stateVersion);

    await resetLocalRoundPage(page, pageUrl, browserErrors, networkErrors);
    const pairBefore = await readState(page);
    await page
      .locator('[data-input-role="selectable"][data-card-id="january-pine-plain-a"]')
      .click();
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.input.status === "confirming" &&
        state.input.handResolutionKind === "capturePair" &&
        state.input.legalTargetCardIds.length === 1
      );
    });
    const pairSelected = await readState(page);
    assert(
      pairSelected.localRound.stateVersion === pairBefore.localRound.stateVersion &&
        pairSelected.input.legalTargetCardIds[0] === "january-pine-plain-b",
      "Unique-match source selection did not expose exactly its authoritative match.",
    );
    const pairTarget = page.locator(
      '[data-input-role="target"][data-card-id="january-pine-plain-b"]',
    );
    assert(await pairTarget.isVisible(), "The unique-match target is missing.");
    assert(
      (await pairTarget.getAttribute("aria-label"))?.includes("confirm matching capture"),
      "The unique-match target does not expose capture-confirmation semantics.",
    );
    assert(
      (await page
        .locator('[data-input-role="selectable"][data-card-id="january-pine-plain-a"]')
        .getAttribute("aria-pressed")) === "true",
      "The unique-match hand source did not retain selected-source semantics.",
    );
    await assertPointerQuietInteractionControl(
      page,
      '[data-input-role="target"][data-card-id="january-pine-plain-b"]',
      "Unique-match target",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `source-selected-pair-target-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.evaluate(() => window.advanceTime(0));
    await pairTarget.click({ noWaitAfter: true });
    const pairHold = await advanceUntilAnimationClip(page, "alignment", "captureStarted");
    assert(
      pairHold.animation.activeClip?.kind === "alignment" &&
        pairHold.animation.activeClip?.eventType === "captureStarted",
      "Pair capture did not enter its source-over-target hold.",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `hand-pair-overlap-hold-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.evaluate(() => window.advanceTime(1_000));
    await waitForAcceptedHandIntent(page, pairBefore.localRound.stateVersion);
    process.stdout.write("Phase 3F-C source, target, and no-match field-cue trace passed.\n");

    await resetLocalRoundPage(page, pageUrl, browserErrors, networkErrors);
    await configureSecondaryOptions(page, { animationMode: "reducedMotion" });

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
      (await actionableSemanticControlCount(page)) === 0,
      "Hand-card semantic controls remained active during the decision.",
    );
    assert(
      await page.locator("[data-yaku-decision]").isVisible(),
      "Yaku decision tray is missing.",
    );
    const decisionBox = await page.locator("[data-yaku-decision]").boundingBox();
    const gameBox = await page.locator(".game-frame").boundingBox();
    assert(
      decisionBox !== null && gameBox !== null && decisionBox.y >= gameBox.y + gameBox.height - 1,
      `The Yaku decision surface obscures the table: ${JSON.stringify({ decisionBox, gameBox })}.`,
    );
    for (const selector of [
      "[data-deck-select]",
      "[data-fullscreen-button]",
      "[data-new-round]",
      "[data-options-trigger]",
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
    const captureCount =
      handAnimals.cards.zoneCounts.playerBrights +
      handAnimals.cards.zoneCounts.playerAnimals +
      handAnimals.cards.zoneCounts.playerScrolls +
      handAnimals.cards.zoneCounts.playerPlains;
    const stateBeforeCaptureInspection = handAnimals.localRound.stateVersion;
    await page.locator('[data-capture-inspect="player"]').click();
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).captureInspection.open === true,
    );
    assert(
      (await page.locator("[data-capture-inspector] img").count()) === captureCount &&
        (await page.locator("[data-capture-inspector-title]").textContent())?.includes(
          String(captureCount),
        ),
      "Capture inspection did not show exactly the current player's public captured cards.",
    );
    const captureGalleryFrames = await page
      .locator("[data-capture-inspector] img")
      .evaluateAll((images) =>
        images.map((image) => {
          const bounds = image.getBoundingClientRect();
          const style = getComputedStyle(image);
          return {
            ratio: bounds.width / bounds.height,
            borderWidth: Number.parseFloat(style.borderTopWidth),
            borderColor: style.borderTopColor,
            objectFit: style.objectFit,
          };
        }),
      );
    assert(
      captureGalleryFrames.length === captureCount &&
        captureGalleryFrames.every(
          ({ ratio, borderWidth, borderColor, objectFit }) =>
            Math.abs(ratio - 0.625) < 0.03 &&
            borderWidth >= 2 &&
            borderColor !== "rgba(0, 0, 0, 0)" &&
            objectFit === "contain",
        ),
      `Capture gallery no longer preserves a strong framed 5:8 card treatment: ${JSON.stringify(captureGalleryFrames)}.`,
    );
    assertClearlyLightFrames(
      await inspectCardImageFrames(page, "[data-capture-inspector] img"),
      "Capture gallery",
    );
    const captureInspectionState = await readState(page);
    assert(
      captureInspectionState.localRound.stateVersion === stateBeforeCaptureInspection &&
        captureInspectionState.cards.cardViewCount === 48 &&
        !JSON.stringify(captureInspectionState).includes("drawPileOrdered") &&
        !JSON.stringify(captureInspectionState).includes("commandId"),
      "Capture inspection changed authoritative state, CardView identity, or exposed private data.",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `capture-inspection-koi-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).captureInspection.open === false,
    );
    assert(
      await page.locator("[data-yaku-decision]").isVisible(),
      "Closing capture inspection lost the unresolved Yaku decision.",
    );
    assert(
      await page
        .locator('[data-capture-inspect="player"]')
        .evaluate((element) => document.activeElement === element),
      "Closing capture inspection did not restore focus to its public capture trigger.",
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
    assert(
      afterHandKoi.yaku.tableMultiplier === 2,
      "Koi-Koi did not preserve the public 2× table.",
    );
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

    await playLockedHandSequence(page, PHASE_3B_FINAL_DRAW_SEQUENCE);
    const finalDraw = await resolvePendingDrawIfNeeded(page);
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
      (await page.locator("[data-yaku-decision-summary]").textContent())?.includes(
        "Blue Scrolls",
      ) && (await page.locator("[data-yaku-decision-summary]").textContent())?.includes("Scrolls"),
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
    const finalKoiResult = await chooseYakuDecisionThroughResultBeat(page, "koiKoi");
    await waitForResultVisualSettlement(page);
    assert(
      finalKoiResult.state.localRound.phase === "roundComplete" &&
        finalKoiResult.state.result?.kind === "endOfPlayLastKoiCaller",
      "Final-Draw Koi-Koi did not produce the committed End-of-Play result.",
    );
    assert(
      finalKoiResult.state.result.scorerId === "player-b" &&
        finalKoiResult.state.result.scoring?.basePoints === 11 &&
        finalKoiResult.state.result.scoring?.scoringMultiplier === 3 &&
        finalKoiResult.state.result.scoring?.awardedPoints === 33,
      `Final-Draw result arithmetic changed: ${JSON.stringify(finalKoiResult.state.result)}.`,
    );
    assert(
      await page.locator("[data-round-result]").isVisible(),
      "End-of-Play result modal is not visible.",
    );
    await assertHandPlayAttentionHidden(page, "End-of-Play result");
    assert(
      (await page.locator("[data-round-result-outcome]").textContent())?.includes(
        "last Koi-Koi caller",
      ) &&
        (await page.locator("[data-round-result-arithmetic]").textContent())?.includes(
          "11 points × 3× = 33 points",
        ),
      "End-of-Play result copy omitted the authoritative caller/arithmetic.",
    );
    assert(
      !(await page.locator("[data-round-result-details]").evaluate((details) => details.open)) &&
        !(await page.locator("[data-round-result-transition]").isVisible()) &&
        (await page.locator("[data-round-result-action]").isVisible()),
      "End-of-Play did not open as a concise outcome/points/action summary.",
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `end-of-play-result-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
    process.stdout.write("Phase 5A End-of-Play result passed.\n");
  }

  await page.goto(pageUrl, { waitUntil: "networkidle" });
  await waitForApplicationReady(page, browserErrors, networkErrors);
  await configureSecondaryOptions(page, { animationMode: "reducedMotion" });
  const initialDealSignature = publicOpeningDealSignature(await readState(page));
  const freshHandAnimals = await playLockedHandSequence(page, PHASE_3B_HAND_DECISION_SEQUENCE);
  assert(
    freshHandAnimals.localRound.phase === "awaitingYakuDecision" &&
      freshHandAnimals.yaku?.decision?.phase === "hand" &&
      hasYaku(freshHandAnimals, "animals"),
    "The fresh Bank trace did not reach Hand Animals.",
  );
  const bankResult = await chooseYakuDecisionThroughResultBeat(page, "bank");
  await waitForResultVisualSettlement(page);
  const banked = bankResult.state;
  await assertHandPlayAttentionHidden(page, "Bank result");
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
      bankResult.trace.some((entry) => entry.feedbackVisible && !entry.resultVisible),
    "Bank award feedback did not precede the authoritative result.",
  );
  assert(
    (await page.locator("[data-turn-recaps]").textContent())?.includes("banked 3 × 1× = 3 points"),
    "Bank award recap omitted the authoritative scoring arithmetic.",
  );
  assert(
    banked.result?.kind === "bankedScore" &&
      banked.result.scorerId === "player-b" &&
      banked.result.scoring?.arithmeticLabel === "3 points × 1× = 3 points." &&
      banked.result.matchScoresAfter["player-b"] === 3,
    `Bank result snapshot changed: ${JSON.stringify(banked.result)}.`,
  );
  assert(
    banked.result.action.actionLabel === "Continue to next round" &&
      banked.result.action.plan?.scheduledMonth === 2 &&
      banked.result.action.plan?.starterId === "player-a",
    "The real continuation action or authoritative February plan is missing.",
  );
  assert(
    (await page.locator("[data-round-result-context]").textContent())?.includes("January") &&
      (await page.locator("[data-round-result-transition-copy]").textContent())?.includes(
        "February",
      ),
    "The result modal omitted its month context or next-round plan.",
  );
  assert(
    !(await page.locator("[data-round-result-details]").evaluate((details) => details.open)) &&
      !(await page.locator("[data-round-result-transition]").isVisible()) &&
      (await page.evaluate(() => document.activeElement?.matches("[data-round-result-action]"))) ===
        true,
    "The Bank result exposed secondary scoring/transition details before request.",
  );
  await page.locator("[data-round-result-details] > summary").click();
  assert(
    (await page.locator("[data-round-result-transition]").isVisible()) &&
      (await page.locator("[data-round-result-multipliers]").isVisible()) &&
      (await page.locator("[data-round-result-yaku] .round-result__yaku-row").count()) ===
        banked.result.scoredYaku.length &&
      (await page.locator("[data-round-result-yaku] .round-result__yaku-cards img").count()) ===
        banked.result.scoredYaku.reduce((sum, row) => sum + row.contributingCardIds.length, 0),
    "The result Details disclosure did not reveal authoritative scoring, transition, and exact yaku-card evidence.",
  );
  const expandedGallery = await page
    .locator("[data-round-result-yaku] .round-result__yaku-cards img")
    .evaluateAll((images) =>
      images.map((image) => {
        const bounds = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return {
          ratio: bounds.width / bounds.height,
          borderWidth: Number.parseFloat(style.borderTopWidth),
          borderColor: style.borderTopColor,
          objectFit: style.objectFit,
          alt: image.alt,
          caption: image.parentElement?.querySelector("figcaption")?.textContent?.trim() ?? "",
        };
      }),
    );
  assert(
    expandedGallery.length > 0 &&
      expandedGallery.every(
        ({ ratio, borderWidth, borderColor, objectFit, alt, caption }) =>
          Math.abs(ratio - 0.625) < 0.03 &&
          borderWidth >= 1 &&
          borderColor !== "rgba(0, 0, 0, 0)" &&
          objectFit === "contain" &&
          !/^[a-z]+-[a-z0-9-]+$/u.test(alt) &&
          !/^[a-z]+-[a-z0-9-]+$/u.test(caption),
      ),
    `Expanded scored-Yaku gallery lost its framed 5:8 card treatment: ${JSON.stringify(expandedGallery)}.`,
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `bank-expanded-390x844${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  const expandedContainment = await page.locator("[data-round-result]").evaluate((result) => {
    const card = result.querySelector(".round-result__card");
    if (!(card instanceof HTMLElement)) throw new Error("Expanded result card disappeared.");
    const bounds = result.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    card.scrollTop = 0;
    const header = result.querySelector("[data-round-result-title]");
    const action = result.querySelector("[data-round-result-action]");
    card.scrollTop = card.scrollHeight;
    const detailsReachBottom =
      card.scrollTop >= Math.max(0, card.scrollHeight - card.clientHeight) - 1;
    card.scrollTop = 0;
    return {
      outer: {
        width: bounds.width,
        height: bounds.height,
        overflowY: getComputedStyle(result).overflowY,
      },
      card: {
        x: cardBounds.x,
        y: cardBounds.y,
        width: cardBounds.width,
        height: cardBounds.height,
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight,
        overflowY: getComputedStyle(card).overflowY,
      },
      headerVisible: header instanceof HTMLElement && header.getBoundingClientRect().height > 0,
      actionVisible: action instanceof HTMLElement && action.getBoundingClientRect().height > 0,
      detailsReachBottom,
    };
  });
  assert(
    expandedContainment.outer.width <= 845 &&
      expandedContainment.outer.height <= 391 &&
      expandedContainment.outer.overflowY === "hidden" &&
      expandedContainment.card.x >= -1 &&
      expandedContainment.card.y >= -1 &&
      expandedContainment.card.x + expandedContainment.card.width <= 845 &&
      expandedContainment.card.y + expandedContainment.card.height <= 391 &&
      (expandedContainment.card.overflowY === "auto" ||
        expandedContainment.card.overflowY === "scroll") &&
      expandedContainment.card.scrollHeight >= expandedContainment.card.clientHeight &&
      expandedContainment.headerVisible &&
      expandedContainment.actionVisible &&
      expandedContainment.detailsReachBottom,
    `Expanded result escaped landscape containment: ${JSON.stringify(expandedContainment)}.`,
  );
  await page.screenshot({
    path: resolve(
      outputDirectory,
      `bank-expanded-844x390${smokeBasePath === "/" ? "" : "-pages"}.png`,
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-round-result-details] > summary").click();
  assert(
    (await page.locator("[data-round-result-action]").textContent()) === "Continue to February",
    "The nonfinal result did not offer real local-round advancement.",
  );
  for (const selector of [
    "[data-deck-select]",
    "[data-fullscreen-button]",
    "[data-new-round]",
    "[data-options-trigger]",
  ]) {
    assert(await page.locator(selector).isDisabled(), `${selector} escaped the result modal lock.`);
  }
  assert(
    (await actionableSemanticControlCount(page)) === 0,
    "The committed result did not lock actionable card input.",
  );
  assert(
    (await page.locator("[data-latest-recap]").textContent())?.includes("banked 3 × 1× = 3 points"),
    "The compact shell did not retain the latest authoritative event.",
  );
  assert(
    (await page.locator("[data-turn-recaps]").textContent())?.includes("banked 3 × 1× = 3 points"),
    "The compact History disclosure did not retain the complete ordered recap data.",
  );
  for (const viewport of process.env.SMOKE_PHASE5A_ONLY === "1"
    ? focusedPhase5AResultViewports
    : viewports) {
    await page.setViewportSize(viewport);
    const {
      resultBox,
      cardBox,
      outerOverflowY,
      cardOverflowY,
      cardScrollHeight,
      cardClientHeight,
    } = await page.locator("[data-round-result]").evaluate((result) => {
      const card = result.querySelector(".round-result__card");
      if (!(card instanceof HTMLElement)) throw new Error("The result card disappeared.");
      const resultBounds = result.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      return {
        resultBox: {
          x: resultBounds.x,
          y: resultBounds.y,
          width: resultBounds.width,
          height: resultBounds.height,
        },
        cardBox: {
          x: cardBounds.x,
          y: cardBounds.y,
          width: cardBounds.width,
          height: cardBounds.height,
        },
        outerOverflowY: getComputedStyle(result).overflowY,
        cardOverflowY: getComputedStyle(card).overflowY,
        cardScrollHeight: card.scrollHeight,
        cardClientHeight: card.clientHeight,
      };
    });
    assert(resultBox !== null, `${viewport.width}×${viewport.height} result modal disappeared.`);
    const landscapeCardScroll = viewport.width === 844 && viewport.height === 390;
    assert(
      resultBox.x >= 0 &&
        resultBox.y >= 0 &&
        resultBox.x + resultBox.width <= viewport.width + 1 &&
        (landscapeCardScroll
          ? outerOverflowY === "hidden" &&
            (cardOverflowY === "auto" || cardOverflowY === "scroll") &&
            cardScrollHeight >= cardClientHeight
          : outerOverflowY === "auto" || outerOverflowY === "scroll"),
      `${viewport.width}×${viewport.height} result overlay lost its expected scroll owner: ${JSON.stringify({ resultBox, landscapeCardScroll, outerOverflowY, cardOverflowY, cardScrollHeight, cardClientHeight })}.`,
    );
    assert(
      cardBox.x >= resultBox.x - 3 &&
        cardBox.y >= resultBox.y - 3 &&
        cardBox.x + cardBox.width <= resultBox.x + resultBox.width + 3 &&
        cardBox.y + cardBox.height <= resultBox.y + resultBox.height + 3,
      `${viewport.width}×${viewport.height} result card is clipped: ${JSON.stringify({ resultBox, cardBox })}.`,
    );
    await page.screenshot({
      path: resolve(
        outputDirectory,
        `bank-result-${viewport.width}x${viewport.height}${smokeBasePath === "/" ? "" : "-pages"}.png`,
      ),
      fullPage: true,
    });
  }
  process.stdout.write("Phase 5A Bank result seven-viewport modal passed.\n");
  assert(
    !JSON.stringify(banked).includes("drawPileOrdered") &&
      !JSON.stringify(banked).includes("rng") &&
      !JSON.stringify(banked).includes("checkpoint") &&
      !JSON.stringify(banked).includes("commandId"),
    "The browser text surface leaked server-only state.",
  );
  const recapCountBeforeAdvance = banked.localRound.recapCount;
  await page.locator("[data-round-result-action]").click();
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return (
      state.localRound.phase === "awaitingHandPlay" &&
      state.localRound.roundNumber === 2 &&
      state.localRound.scheduledMonth === 2 &&
      state.result === null
    );
  });
  assert(
    !(await page.locator("[data-round-result]").isVisible()),
    "The real local round advance did not dismiss the result shell.",
  );
  const advanced = await readState(page);
  assert(
    advanced.localRound.recapCount >= recapCountBeforeAdvance &&
      advanced.localRound.matchLength === 3 &&
      (await page.locator("[data-turn-recaps]").textContent())?.includes(
        "banked 3 × 1× = 3 points",
      ),
    `Real Phase 5A advancement lost match recap or format: ${JSON.stringify(advanced.localRound)}.`,
  );
  await acceptHandoffIfPending(page);
  const roundTwo = await playProductionRoundToResult(page, "Round 2");
  assert(
    roundTwo.localRound.roundNumber === 2 && roundTwo.result !== null,
    "Round 2 did not finish.",
  );
  await page.locator("[data-round-result-action]").click();
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.localRound.roundNumber === 3 && state.result === null;
  });
  await acceptHandoffIfPending(page);
  const terminal = await playProductionRoundToResult(page, "Round 3");
  assert(
    terminal.localRound.phase === "matchComplete" &&
      terminal.localRound.roundNumber === 3 &&
      terminal.result?.action.actionLabel === "Start rematch",
    `The real 3-round production trace did not reach a terminal rematch result: ${JSON.stringify(terminal.result)}.`,
  );
  assert(
    (await page.locator("[data-round-result-action]").textContent()) === "Start rematch",
    "The terminal result did not offer a real rematch.",
  );
  await page.locator("[data-round-result-action]").click();
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return (
      state.localRound.phase === "awaitingHandPlay" &&
      state.localRound.roundNumber === 1 &&
      state.localRound.scheduledMonth === 1 &&
      state.localRound.recapCount === 0 &&
      state.localRound.matchLength === 3 &&
      state.result === null
    );
  });
  const rematched = await readState(page);
  assert(
    publicOpeningDealSignature(rematched) !== initialDealSignature &&
      !JSON.stringify(rematched).includes("seed") &&
      !JSON.stringify(rematched).includes("checkpoint"),
    "The real rematch reused the first public deal or leaked server-only seed/checkpoint state.",
  );
  process.stdout.write("Phase 5A real 3-round advance and rematch trace passed.\n");
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("\n")}`);
  assert(networkErrors.length === 0, `Network errors: ${networkErrors.join("\n")}`);
  process.stdout.write(
    "Phase 5A root/Pages yaku, End-of-Play, Bank result, progression, and rematch smoke passed.\n",
  );
} finally {
  if (browser) await browser.close();
  await stopStaticServer(staticServer);
}
