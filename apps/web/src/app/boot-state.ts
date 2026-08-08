export const BOOT_SCREEN_ID = "boot" as const;
export const COORDINATE_SYSTEM = "origin top-left; +x right; +y down" as const;

export interface BootViewport {
  height: number;
  width: number;
}

export interface BootSnapshot {
  canvasCount: number;
  coordinateSystem: typeof COORDINATE_SYSTEM;
  fullscreen: boolean;
  ready: boolean;
  screen: typeof BOOT_SCREEN_ID;
  simulationTimeMs: number;
  viewport: BootViewport;
}

export function advanceBootTime(currentTimeMs: number, deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("advanceTime requires a finite, non-negative number of milliseconds.");
  }

  const nextTimeMs = currentTimeMs + deltaMs;
  if (!Number.isFinite(nextTimeMs) || Math.abs(nextTimeMs) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("advanceTime exceeded the deterministic clock's safe numeric range.");
  }

  return nextTimeMs;
}

export function createBootSnapshot(input: {
  canvasCount: number;
  fullscreen: boolean;
  ready: boolean;
  simulationTimeMs: number;
  viewport: BootViewport;
}): BootSnapshot {
  return {
    screen: BOOT_SCREEN_ID,
    ready: input.ready,
    canvasCount: input.canvasCount,
    viewport: input.viewport,
    fullscreen: input.fullscreen,
    simulationTimeMs: input.simulationTimeMs,
    coordinateSystem: COORDINATE_SYSTEM,
  };
}

export function serializeBootSnapshot(snapshot: BootSnapshot): string {
  return JSON.stringify(snapshot);
}
