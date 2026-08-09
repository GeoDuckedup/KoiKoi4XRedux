import type {
  BoardLayout,
  BoardLayoutDiagnostics,
  BoardSceneInspection,
  BoardViewport,
} from "../presentation/board/types";

export const TABLE_SCREEN_ID = "boardSkeleton" as const;
export const COORDINATE_SYSTEM = "origin top-left; +x right; +y down" as const;

export interface TablePreviewSnapshot {
  boardViewport: BoardViewport;
  canvasCount: number;
  coordinateSystem: typeof COORDINATE_SYSTEM;
  diagnostics: BoardLayoutDiagnostics;
  fullscreen: boolean;
  layerOrder: BoardLayout["layerOrder"];
  layout: {
    cardZoneCount: number;
    fieldSlotCount: number;
    mode: BoardLayout["mode"];
    scale: number;
    uiZones: BoardLayout["uiZones"];
    zones: BoardLayout["cardZones"];
  };
  placeholderCounts: {
    fieldSlots: 8;
    opponentHand: 8;
    playerHand: 8;
  };
  ready: boolean;
  scene: BoardSceneInspection;
  screen: typeof TABLE_SCREEN_ID;
  simulationTimeMs: number;
  viewport: BoardViewport;
}

export function advancePreviewTime(currentTimeMs: number, deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("advanceTime requires a finite, non-negative number of milliseconds.");
  }

  const nextTimeMs = currentTimeMs + deltaMs;
  if (!Number.isFinite(nextTimeMs) || Math.abs(nextTimeMs) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("advanceTime exceeded the deterministic clock's safe numeric range.");
  }

  return nextTimeMs;
}

export function createTablePreviewSnapshot(input: {
  boardViewport: BoardViewport;
  canvasCount: number;
  diagnostics: BoardLayoutDiagnostics;
  fullscreen: boolean;
  layout: BoardLayout;
  ready: boolean;
  scene: BoardSceneInspection;
  simulationTimeMs: number;
  viewport: BoardViewport;
}): TablePreviewSnapshot {
  const scene = Object.freeze({
    root: Object.freeze({ ...input.scene.root }),
    layers: Object.freeze(input.scene.layers.map((layer) => Object.freeze({ ...layer }))),
  });
  const diagnostics = Object.freeze({
    clippedZones: Object.freeze([...input.diagnostics.clippedZones]),
    invalidZones: Object.freeze([...input.diagnostics.invalidZones]),
    overlapViolations: Object.freeze([...input.diagnostics.overlapViolations]),
  });
  return Object.freeze({
    screen: TABLE_SCREEN_ID,
    ready: input.ready,
    canvasCount: input.canvasCount,
    viewport: Object.freeze({ ...input.viewport }),
    boardViewport: Object.freeze({ ...input.boardViewport }),
    fullscreen: input.fullscreen,
    simulationTimeMs: input.simulationTimeMs,
    coordinateSystem: COORDINATE_SYSTEM,
    layerOrder: input.layout.layerOrder,
    scene,
    layout: Object.freeze({
      mode: input.layout.mode,
      scale: input.layout.scale,
      cardZoneCount: Object.keys(input.layout.cardZones).length,
      fieldSlotCount: input.layout.slots.field.length,
      zones: input.layout.cardZones,
      uiZones: input.layout.uiZones,
    }),
    placeholderCounts: Object.freeze({
      opponentHand: 8,
      fieldSlots: 8,
      playerHand: 8,
    }),
    diagnostics,
  });
}

export function serializeTablePreviewSnapshot(snapshot: TablePreviewSnapshot): string {
  return JSON.stringify(snapshot);
}
