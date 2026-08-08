import { Application } from "pixi.js";

import { advanceBootTime, createBootSnapshot, serializeBootSnapshot } from "./app/boot-state";
import { createBootScene, type BootScene } from "./presentation/pixi/create-boot-scene";
import "./style.css";

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The KoiKoi4x application shell is missing ${selector}.`);
  }
  return element;
}

const host = queryRequired<HTMLElement>("[data-game-host]");
const status = queryRequired<HTMLElement>("[data-boot-status]");
const fullscreenButton = queryRequired<HTMLButtonElement>("[data-fullscreen-button]");

let application: Application | undefined;
let bootScene: BootScene | undefined;
let ready = false;
let simulationTimeMs = 0;

function snapshot() {
  return createBootSnapshot({
    ready,
    canvasCount: document.querySelectorAll("canvas").length,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    fullscreen: document.fullscreenElement !== null,
    simulationTimeMs,
  });
}

function redraw(): void {
  if (!application || !bootScene) {
    return;
  }

  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  application.renderer.resize(width, height);
  bootScene.redraw({
    fullscreen: document.fullscreenElement !== null,
    simulationTimeMs,
  });
  application.render();
}

function updateFullscreenLabel(): void {
  const fullscreen = document.fullscreenElement !== null;
  fullscreenButton.textContent = fullscreen ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  redraw();
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
    } else {
      status.textContent = "Fullscreen is unavailable in this browser. The table remains playable.";
    }
  } catch (error: unknown) {
    status.textContent = `Fullscreen could not be changed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

window.__KOIKOI4X_READY__ = false;
window.__KOIKOI4X_SNAPSHOT__ = snapshot;
window.render_game_to_text = () => serializeBootSnapshot(snapshot());
window.advanceTime = (milliseconds: number) => {
  simulationTimeMs = advanceBootTime(simulationTimeMs, milliseconds);
  redraw();
};

fullscreenButton.addEventListener("click", () => {
  void toggleFullscreen();
});

document.addEventListener("fullscreenchange", updateFullscreenLabel);
window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  if (isEditing) {
    return;
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    void toggleFullscreen();
  } else if (event.key === "Escape" && document.fullscreenElement) {
    void document.exitFullscreen();
  }
});

async function start(): Promise<void> {
  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  app.ticker.stop();
  app.canvas.dataset.gameCanvas = "true";
  app.canvas.setAttribute("role", "img");
  app.canvas.setAttribute("aria-label", "Decorative KoiKoi4x Hanafuda table");
  host.replaceChildren(app.canvas);

  application = app;
  bootScene = createBootScene(app);
  const resizeObserver = new ResizeObserver(redraw);
  resizeObserver.observe(host);

  ready = true;
  window.__KOIKOI4X_READY__ = true;
  document.documentElement.dataset.appReady = "true";
  status.textContent = "Rendering surface ready. Gameplay arrives with the headless engine.";
  redraw();
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown initialization error";
  status.textContent = `The rendering surface could not start: ${message}`;
  document.documentElement.dataset.appReady = "error";
  console.error(error);
});
