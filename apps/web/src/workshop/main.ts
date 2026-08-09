import {
  ART_SPEC_V1,
  canonicalAutoTransform,
  createDerivativePlan,
  createManualTransformFromAuto,
  createPostRotationCoverPlanV1,
  moveManualTransform,
  updateAutoFocus,
  updateManualTransform,
  type CardTransform,
  type DeckPackageV1,
  type DeckTransformsV1,
  type WorkshopGridV1,
} from "@koikoi4x/deck-format";
import type { CardId } from "@koikoi4x/engine";

import { computeBoardLayout } from "../presentation/board/board-layout";
import "./style.css";

declare const __WORKSHOP_TOKEN__: string;

interface Snapshot {
  readonly artGuideSvg: string;
  readonly buildReport: null | {
    readonly approvalReady: boolean;
    readonly cards: readonly unknown[];
    readonly completeRuntimeManifest: boolean;
  };
  readonly cardBack: { readonly exists: boolean; readonly file: string | null };
  readonly grid: WorkshopGridV1;
  readonly issues: readonly {
    readonly code: string;
    readonly message: string;
    readonly path: string;
    readonly severity: "error" | "warning";
  }[];
  readonly packageDefinition: DeckPackageV1;
  readonly pilotCardIds: readonly CardId[];
  readonly transforms: DeckTransformsV1;
}

interface PackageSummary {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

interface BuildReport {
  readonly approvalReady: boolean;
  readonly cards: readonly unknown[];
  readonly completeRuntimeManifest: boolean;
  readonly issues: readonly { readonly code: string; readonly severity: "error" | "warning" }[];
}

let packageId = "new-primary-deck";
const apiRoot = "/__deck-workshop/v1";
const bitmapCache = new Map<string, ImageBitmap>();
let packageSummaries: readonly PackageSummary[] = [];
let snapshot: Snapshot | null = null;
let selectedCardId: CardId = "november-rain";
let transformDraft: CardTransform = canonicalAutoTransform();
let pendingSourceFile: File | null = null;
let pendingBackSourceFile: File | null = null;
let busy = false;
let previewGeneration = 0;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Workshop element ${selector}.`);
  return element;
}

const grid = requiredElement<HTMLElement>("[data-card-grid]");
const summary = requiredElement<HTMLElement>("[data-summary]");
const title = requiredElement<HTMLElement>("[data-selected-title]");
const selectedStatus = requiredElement<HTMLElement>("[data-selected-status]");
const status = requiredElement<HTMLElement>("[data-workshop-status]");
const sourceDetail = requiredElement<HTMLElement>("[data-source-detail]");
const sourceCanvas = requiredElement<HTMLCanvasElement>("[data-source-preview]");
const frameCanvas = requiredElement<HTMLCanvasElement>("[data-frame-preview]");
const inspectionCanvas = requiredElement<HTMLCanvasElement>("[data-inspection-preview]");
const phoneCanvas = requiredElement<HTMLCanvasElement>("[data-phone-preview]");
const backCanvas = requiredElement<HTMLCanvasElement>("[data-back-preview]");
const boardCanvas = requiredElement<HTMLCanvasElement>("[data-board-preview]");
const modeSelect = requiredElement<HTMLSelectElement>("[data-transform-mode]");
const fitSelect = requiredElement<HTMLSelectElement>("[data-fit]");
const focusXInput = requiredElement<HTMLInputElement>("[data-focus-x]");
const focusYInput = requiredElement<HTMLInputElement>("[data-focus-y]");
const zoomInput = requiredElement<HTMLInputElement>("[data-zoom]");
const rotationInput = requiredElement<HTMLInputElement>("[data-rotation]");
const sourceInput = requiredElement<HTMLInputElement>("[data-source-file]");
const assignSourceButton = requiredElement<HTMLButtonElement>("[data-assign-source]");
const backSourceInput = requiredElement<HTMLInputElement>("[data-back-source-file]");
const assignBackButton = requiredElement<HTMLButtonElement>("[data-assign-back]");
const packageSelect = requiredElement<HTMLSelectElement>("[data-package-select]");
const packageTitle = requiredElement<HTMLElement>("[data-package-title]");
const issueList = requiredElement<HTMLUListElement>("[data-issue-list]");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, {
    ...init,
    headers: {
      ...(init?.body === undefined ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
      "x-workshop-token": __WORKSHOP_TOKEN__,
    },
  });
  if (!response.ok) {
    const value = (await response.json()) as { error?: string };
    throw new Error(value.error ?? `Workshop request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

function currentSlot() {
  const value = snapshot?.grid.groups
    .flatMap((group) => group.cards)
    .find((card) => card.cardId === selectedCardId);
  if (!value) throw new Error(`Missing selected slot ${selectedCardId}.`);
  return value;
}

async function sourceBitmap(cardId: CardId | "back"): Promise<ImageBitmap | null> {
  const key = `${packageId}:${cardId}`;
  const cached = bitmapCache.get(key);
  if (cached) return cached;
  try {
    const response = await fetch(
      `${apiRoot}/source?packageId=${encodeURIComponent(packageId)}&cardId=${encodeURIComponent(cardId)}`,
      { headers: { "x-workshop-token": __WORKSHOP_TOKEN__ } },
    );
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob(), {
      imageOrientation: "from-image",
    });
    bitmapCache.set(key, bitmap);
    return bitmap;
  } catch {
    return null;
  }
}

function clearCanvas(canvas: HTMLCanvasElement, message: string): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#1c2d26";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff3cf";
  context.font = `${Math.max(8, canvas.width * 0.07)}px sans-serif`;
  context.textAlign = "center";
  context.fillText(message, canvas.width / 2, canvas.height / 2);
}

function drawOriginal(canvas: HTMLCanvasElement, bitmap: ImageBitmap): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#18241f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(
    bitmap,
    (canvas.width - width) / 2,
    (canvas.height - height) / 2,
    width,
    height,
  );
}

function drawTransformed(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  transform: CardTransform,
  frame = true,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const output = { width: canvas.width, height: canvas.height };
  const plan = createDerivativePlan(
    { width: bitmap.width, height: bitmap.height },
    output,
    transform,
  );
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#18241f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const crop = plan.sourcePixelCrop;
  if (transform.mode === "auto" && transform.fit === "contain") {
    const box = plan.normalizedContentBox;
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      box.x * canvas.width,
      box.y * canvas.height,
      box.width * canvas.width,
      box.height * canvas.height,
    );
  } else {
    const cover = createPostRotationCoverPlanV1(
      { width: crop.width, height: crop.height },
      output,
      plan.rotationDeg,
    );
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((cover.rotationDeg * Math.PI) / 180);
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      -(crop.width * cover.scale) / 2,
      -(crop.height * cover.scale) / 2,
      crop.width * cover.scale,
      crop.height * cover.scale,
    );
    context.restore();
  }
  if (!frame) return;
  const frameWidth = Math.max(2, canvas.width * ART_SPEC_V1.frame.approximateWidthRatio);
  context.strokeStyle = "#fff3cf";
  context.lineWidth = frameWidth;
  context.strokeRect(
    frameWidth / 2,
    frameWidth / 2,
    canvas.width - frameWidth,
    canvas.height - frameWidth,
  );
  context.strokeStyle = "rgba(233,187,90,.7)";
  context.setLineDash([6, 4]);
  context.lineWidth = Math.max(1, frameWidth * 0.45);
  context.strokeRect(
    canvas.width * ART_SPEC_V1.safeArea.x,
    canvas.height * ART_SPEC_V1.safeArea.y,
    canvas.width * ART_SPEC_V1.safeArea.width,
    canvas.height * ART_SPEC_V1.safeArea.height,
  );
  context.setLineDash([]);
}

async function drawBoardPreview(generation: number): Promise<void> {
  const context = boardCanvas.getContext("2d");
  if (!context || !snapshot) return;
  const next = document.createElement("canvas");
  next.width = boardCanvas.width;
  next.height = boardCanvas.height;
  const nextContext = next.getContext("2d");
  if (!nextContext) return;
  nextContext.fillStyle = "#0b2a20";
  nextContext.fillRect(0, 0, next.width, next.height);
  const layout = computeBoardLayout({ width: 390, height: 844 });
  nextContext.fillStyle = "rgba(255,243,207,.06)";
  nextContext.fillRect(
    layout.cardZones.field.x,
    layout.cardZones.field.y,
    layout.cardZones.field.width,
    layout.cardZones.field.height,
  );
  nextContext.fillStyle = "#e9bb5a";
  nextContext.font = "700 13px sans-serif";
  nextContext.fillText("PILOT APPROVED", 18, layout.cardZones.field.y + 18);
  nextContext.fillText("FULL DECK APPROVED", 18, layout.cardZones.field.y + 34);
  let renderedCardCount = 0;
  for (const [index, cardId] of snapshot.pilotCardIds.entries()) {
    const cardSlot = snapshot.grid.groups
      .flatMap((group) => group.cards)
      .find((entry) => entry.cardId === cardId);
    const fieldSlot = layout.slots.field[index];
    if (!cardSlot || !fieldSlot) continue;
    const bitmap = await sourceBitmap(cardId);
    if (!bitmap) continue;
    const temporary = document.createElement("canvas");
    temporary.width = Math.round(fieldSlot.width);
    temporary.height = Math.round(fieldSlot.height);
    drawTransformed(
      temporary,
      bitmap,
      cardSlot.cardId === selectedCardId ? transformDraft : cardSlot.transform,
    );
    nextContext.drawImage(temporary, fieldSlot.x, fieldSlot.y, fieldSlot.width, fieldSlot.height);
    renderedCardCount += 1;
  }
  if (generation !== previewGeneration) return;
  context.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  context.drawImage(next, 0, 0);
  boardCanvas.dataset.renderedCardCount = String(renderedCardCount);
}

async function drawPreviews(): Promise<void> {
  const generation = ++previewGeneration;
  boardCanvas.dataset.renderedCardCount = "0";
  const slot = currentSlot();
  const bitmap = slot.source?.exists ? await sourceBitmap(selectedCardId) : null;
  if (generation !== previewGeneration) return;
  if (!bitmap) {
    clearCanvas(sourceCanvas, "MISSING SOURCE");
    clearCanvas(frameCanvas, "MISSING SOURCE");
    clearCanvas(inspectionCanvas, "MISSING SOURCE");
    clearCanvas(phoneCanvas, "MISSING");
  } else {
    drawOriginal(sourceCanvas, bitmap);
    drawTransformed(frameCanvas, bitmap, transformDraft);
    drawTransformed(inspectionCanvas, bitmap, transformDraft);
    drawTransformed(phoneCanvas, bitmap, transformDraft);
  }
  const back = await sourceBitmap("back");
  if (generation !== previewGeneration) return;
  if (back) drawTransformed(backCanvas, back, canonicalAutoTransform());
  else clearCanvas(backCanvas, "MISSING BACK");
  await drawBoardPreview(generation);
}

function syncEditor(): void {
  modeSelect.value = transformDraft.mode;
  const auto = transformDraft.mode === "auto";
  fitSelect.disabled = !auto;
  focusXInput.disabled = !auto;
  focusYInput.disabled = !auto;
  zoomInput.disabled = auto;
  rotationInput.disabled = auto;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-nudge]")) {
    button.disabled = auto;
  }
  if (transformDraft.mode === "auto") {
    fitSelect.value = transformDraft.fit;
    focusXInput.value = String(transformDraft.focusX);
    focusYInput.value = String(transformDraft.focusY);
    zoomInput.value = "1";
    rotationInput.value = "0";
  } else {
    fitSelect.value = "cover";
    focusXInput.value = "0.5";
    focusYInput.value = "0.5";
    zoomInput.value = String(transformDraft.zoom);
    rotationInput.value = String(transformDraft.rotationDeg);
  }
}

function renderGrid(): void {
  if (!snapshot) return;
  grid.replaceChildren();
  for (const group of snapshot.grid.groups) {
    const section = document.createElement("section");
    section.className = "month-group";
    const heading = document.createElement("h3");
    heading.textContent = `${String(group.month).padStart(2, "0")} · ${group.name} — ${group.flower}`;
    section.append(heading);
    const cards = document.createElement("div");
    cards.className = "month-cards";
    for (const slot of group.cards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `workshop-card workshop-card--${slot.status}`;
      button.dataset.cardId = slot.cardId;
      button.setAttribute("aria-pressed", String(slot.cardId === selectedCardId));
      button.innerHTML = `<span>${slot.displayName}</span><small>${slot.category} · ${slot.status}</small>`;
      button.addEventListener("click", () => {
        selectedCardId = slot.cardId;
        transformDraft = slot.transform;
        pendingSourceFile = null;
        sourceInput.value = "";
        assignSourceButton.disabled = true;
        render();
      });
      cards.append(button);
    }
    section.append(cards);
    grid.append(section);
  }
}

function renderPackageSelector(): void {
  packageSelect.replaceChildren(
    ...packageSummaries.map((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `${entry.name} · ${entry.version}`;
      return option;
    }),
  );
  packageSelect.value = packageId;
}

function renderIssues(): void {
  if (!snapshot) return;
  const ordered = [...snapshot.issues].sort((left, right) => {
    const leftSelected = left.path.includes(selectedCardId) ? 0 : 1;
    const rightSelected = right.path.includes(selectedCardId) ? 0 : 1;
    return leftSelected - rightSelected || left.path.localeCompare(right.path);
  });
  const visible = ordered.slice(0, 24);
  if (visible.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No package diagnostics.";
    issueList.replaceChildren(item);
    return;
  }
  issueList.replaceChildren(
    ...visible.map((entry) => {
      const item = document.createElement("li");
      item.dataset.severity = entry.severity;
      item.textContent = `${entry.code} · ${entry.path} — ${entry.message}`;
      return item;
    }),
  );
  if (ordered.length > visible.length) {
    const item = document.createElement("li");
    item.textContent = `${ordered.length - visible.length} more diagnostics; select affected cards or run the CLI for the full report.`;
    issueList.append(item);
  }
}

function render(): void {
  if (!snapshot) return;
  const slot = currentSlot();
  packageTitle.textContent = snapshot.packageDefinition.name;
  packageSelect.value = packageId;
  title.textContent = `${String(slot.month).padStart(2, "0")} · ${slot.displayName}`;
  selectedStatus.textContent = slot.status;
  selectedStatus.dataset.status = slot.status;
  sourceDetail.textContent = slot.source?.exists
    ? `${slot.source.file} · ${slot.source.metadata?.width ?? "?"}×${slot.source.metadata?.height ?? "?"} · ${slot.transform.mode}`
    : `${slot.file ?? "No mapping"} · source missing`;
  const counts = snapshot.grid.statusCounts;
  summary.textContent = `${counts["complete-auto"]} auto · ${counts["complete-manual"]} manual · ${counts.inherited} inherited · ${counts.warning} warning · ${counts.missing} missing · ${counts.invalid} invalid`;
  renderGrid();
  renderIssues();
  syncEditor();
  void drawPreviews();
}

async function refreshSnapshot(message?: string): Promise<void> {
  snapshot = await api<Snapshot>(`/package?packageId=${encodeURIComponent(packageId)}`);
  const slot = snapshot.grid.groups
    .flatMap((group) => group.cards)
    .find((entry) => entry.cardId === selectedCardId);
  transformDraft = slot?.transform ?? canonicalAutoTransform();
  status.textContent =
    message ??
    "Local Workshop ready. Changes affect authoring files only; no game state is executed.";
  render();
}

async function action(label: string, callback: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  document.documentElement.dataset.workshopBusy = "true";
  status.textContent = `${label}…`;
  try {
    await callback();
  } catch (error) {
    status.textContent = `${label} failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    busy = false;
    document.documentElement.dataset.workshopBusy = "false";
  }
}

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function encodedSource(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

packageSelect.addEventListener("change", () => {
  const nextPackageId = packageSelect.value;
  if (!packageSummaries.some((entry) => entry.id === nextPackageId)) return;
  void action("Switching authoring package", async () => {
    for (const bitmap of bitmapCache.values()) bitmap.close();
    bitmapCache.clear();
    packageId = nextPackageId;
    snapshot = await api<Snapshot>(`/package?packageId=${encodeURIComponent(packageId)}`);
    selectedCardId = snapshot.pilotCardIds[0] ?? "january-crane";
    pendingSourceFile = null;
    pendingBackSourceFile = null;
    sourceInput.value = "";
    backSourceInput.value = "";
    assignSourceButton.disabled = true;
    assignBackButton.disabled = true;
    transformDraft = currentSlot().transform;
    status.textContent = `Authoring ${snapshot.packageDefinition.name}; inherited sources remain owned by their source package.`;
    render();
  });
});

modeSelect.addEventListener("change", () => {
  const slot = currentSlot();
  if (modeSelect.value === "auto") {
    transformDraft = snapshot?.packageDefinition.sourceDefaults ?? canonicalAutoTransform();
  } else if (slot.source?.metadata) {
    const auto = transformDraft.mode === "auto" ? transformDraft : canonicalAutoTransform();
    transformDraft = createManualTransformFromAuto(slot.source.metadata, auto);
  }
  syncEditor();
  void drawPreviews();
});
fitSelect.addEventListener("change", () => {
  if (transformDraft.mode !== "auto") return;
  transformDraft = Object.freeze({
    ...transformDraft,
    fit: fitSelect.value === "contain" ? "contain" : "cover",
  });
  void drawPreviews();
});
for (const [input, axis] of [
  [focusXInput, "x"],
  [focusYInput, "y"],
] as const) {
  input.addEventListener("input", () => {
    if (transformDraft.mode !== "auto") return;
    transformDraft = updateAutoFocus(
      transformDraft,
      axis === "x" ? Number(input.value) : transformDraft.focusX,
      axis === "y" ? Number(input.value) : transformDraft.focusY,
    );
    void drawPreviews();
  });
}
zoomInput.addEventListener("input", () => {
  if (transformDraft.mode !== "manual") return;
  transformDraft = updateManualTransform(transformDraft, { zoom: Number(zoomInput.value) });
  void drawPreviews();
});
rotationInput.addEventListener("input", () => {
  if (transformDraft.mode !== "manual") return;
  transformDraft = updateManualTransform(transformDraft, {
    rotationDeg: Number(rotationInput.value),
  });
  void drawPreviews();
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-nudge]")) {
  button.addEventListener("click", () => {
    if (transformDraft.mode !== "manual") return;
    const direction = button.dataset.nudge;
    transformDraft = moveManualTransform(
      transformDraft,
      direction === "left" ? -0.01 : direction === "right" ? 0.01 : 0,
      direction === "up" ? -0.01 : direction === "down" ? 0.01 : 0,
    );
    void drawPreviews();
  });
}

let dragPoint: Readonly<{ x: number; y: number }> | null = null;
frameCanvas.addEventListener("pointerdown", (event) => {
  if (transformDraft.mode !== "manual") return;
  dragPoint = Object.freeze({ x: event.clientX, y: event.clientY });
  frameCanvas.setPointerCapture(event.pointerId);
});
frameCanvas.addEventListener("pointermove", (event) => {
  if (transformDraft.mode !== "manual" || dragPoint === null) return;
  const rectangle = frameCanvas.getBoundingClientRect();
  transformDraft = moveManualTransform(
    transformDraft,
    (-(event.clientX - dragPoint.x) / rectangle.width) * transformDraft.crop.width,
    (-(event.clientY - dragPoint.y) / rectangle.height) * transformDraft.crop.height,
  );
  dragPoint = Object.freeze({ x: event.clientX, y: event.clientY });
  void drawPreviews();
});
for (const eventName of ["pointerup", "pointercancel"] as const) {
  frameCanvas.addEventListener(eventName, () => {
    dragPoint = null;
  });
}

requiredElement<HTMLFormElement>("[data-transform-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  void action("Saving transform", async () => {
    snapshot = await api<Snapshot>("/transform", {
      method: "POST",
      body: JSON.stringify({ packageId, cardId: selectedCardId, transform: transformDraft }),
    });
    await refreshSnapshot("Transform override saved with normalized coordinates.");
  });
});
requiredElement<HTMLButtonElement>("[data-reset-transform]").addEventListener("click", () => {
  void action("Resetting transform", async () => {
    await api<Snapshot>("/transform", {
      method: "POST",
      body: JSON.stringify({ packageId, cardId: selectedCardId, transform: null }),
    });
    await refreshSnapshot("Transform reset to the resolved package default.");
  });
});
sourceInput.addEventListener("change", () => {
  pendingSourceFile = sourceInput.files?.[0] ?? null;
  assignSourceButton.disabled = pendingSourceFile === null;
});
assignSourceButton.addEventListener("click", () => {
  const file = pendingSourceFile;
  if (!file) return;
  void action("Assigning immutable source", async () => {
    await api<Snapshot>("/assign-source", {
      method: "POST",
      body: JSON.stringify({
        packageId,
        cardId: selectedCardId,
        mediaType: file.type,
        base64: await encodedSource(file),
      }),
    });
    bitmapCache.get(`${packageId}:${selectedCardId}`)?.close();
    bitmapCache.delete(`${packageId}:${selectedCardId}`);
    pendingSourceFile = null;
    sourceInput.value = "";
    assignSourceButton.disabled = true;
    await refreshSnapshot(
      "Source assigned to a new digest-named file; prior source was not overwritten.",
    );
  });
});
backSourceInput.addEventListener("change", () => {
  pendingBackSourceFile = backSourceInput.files?.[0] ?? null;
  assignBackButton.disabled = pendingBackSourceFile === null;
});
assignBackButton.addEventListener("click", () => {
  const file = pendingBackSourceFile;
  if (!file) return;
  void action("Assigning immutable card back", async () => {
    await api<Snapshot>("/assign-source", {
      method: "POST",
      body: JSON.stringify({
        packageId,
        cardId: "back",
        mediaType: file.type,
        base64: await encodedSource(file),
      }),
    });
    bitmapCache.get(`${packageId}:back`)?.close();
    bitmapCache.delete(`${packageId}:back`);
    pendingBackSourceFile = null;
    backSourceInput.value = "";
    assignBackButton.disabled = true;
    await refreshSnapshot(
      "Card back assigned to a new digest-named file; prior source was not overwritten.",
    );
  });
});
requiredElement<HTMLButtonElement>("[data-auto-assign]").addEventListener("click", () => {
  void action("Auto-assigning canonical filenames", async () => {
    await api<Snapshot>("/auto-assign", { method: "POST", body: JSON.stringify({ packageId }) });
    await refreshSnapshot("Canonical filenames were matched without manual JSON editing.");
  });
});
for (const [selector, selected] of [
  ["[data-build-selected]", true],
  ["[data-build-all]", false],
] as const) {
  requiredElement<HTMLButtonElement>(selector).addEventListener("click", () => {
    void action(selected ? "Rebuilding selected card" : "Rebuilding package", async () => {
      const report = await api<BuildReport>("/rebuild", {
        method: "POST",
        body: JSON.stringify({ packageId, ...(selected ? { cardId: selectedCardId } : {}) }),
      });
      await refreshSnapshot(
        `Built ${report.cards.length}/48 source faces. Runtime manifest ${report.completeRuntimeManifest ? "generated" : "withheld"}; visual approval ${report.approvalReady ? "ready" : "pending"}.`,
      );
    });
  });
}
requiredElement<HTMLButtonElement>("[data-art-guide]").addEventListener("click", () => {
  if (snapshot)
    download(
      "koikoi4x-art-guide-v1.svg",
      new Blob([snapshot.artGuideSvg], { type: "image/svg+xml" }),
    );
});

async function downloadGenerated(kind: "art-review" | "gameplay-390x844"): Promise<void> {
  const response = await fetch(
    `${apiRoot}/generated?packageId=${encodeURIComponent(packageId)}&kind=${encodeURIComponent(kind)}`,
    { headers: { "x-workshop-token": __WORKSHOP_TOKEN__ } },
  );
  if (!response.ok) throw new Error("Generate the contact sheets before downloading them.");
  download(`${packageId}-${kind}.png`, await response.blob());
}
requiredElement<HTMLButtonElement>("[data-download-art]").addEventListener("click", () => {
  void action("Downloading art-review sheet", () => downloadGenerated("art-review"));
});
requiredElement<HTMLButtonElement>("[data-download-gameplay]").addEventListener("click", () => {
  void action("Downloading gameplay-size sheet", () => downloadGenerated("gameplay-390x844"));
});

window.render_game_to_text = () => {
  const slot = snapshot ? currentSlot() : null;
  return JSON.stringify({
    screen: "deckWorkshop",
    ready: snapshot !== null,
    packageId,
    slotCount: snapshot?.grid.groups.flatMap((group) => group.cards).length ?? 0,
    statusCounts: snapshot?.grid.statusCounts ?? null,
    selectedCardId,
    selectedStatus: slot?.status ?? null,
    selectedTransform: transformDraft,
    packageCount: packageSummaries.length,
    pilotCardIds: snapshot?.pilotCardIds ?? [],
    completeRuntimeManifest: snapshot?.buildReport?.completeRuntimeManifest ?? false,
    approvalReady: snapshot?.buildReport?.approvalReady ?? false,
    engineExecution: "notAvailable",
  });
};
window.advanceTime = () => undefined;

void api<readonly PackageSummary[]>("/packages")
  .then(async (packages) => {
    packageSummaries = packages;
    if (!packageSummaries.some((entry) => entry.id === packageId)) {
      packageId = packageSummaries[0]?.id ?? packageId;
    }
    renderPackageSelector();
    await refreshSnapshot();
  })
  .then(() => {
    document.documentElement.dataset.appReady = "true";
  })
  .catch((error: unknown) => {
    status.textContent = `Workshop failed to load: ${error instanceof Error ? error.message : String(error)}`;
    document.documentElement.dataset.appReady = "error";
    console.error(error);
  });
