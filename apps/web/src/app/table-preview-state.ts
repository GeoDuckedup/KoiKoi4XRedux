import type {
  BoardLayout,
  BoardLayoutDiagnostics,
  BoardSceneInspection,
  BoardViewport,
} from "../presentation/board/types";
import type { CardRuntimeInspection } from "../presentation/cards/types";
import type { AnimationInspectionV1 } from "../presentation/animation/types";
import type { TechnicalAnimationScenarioId } from "../presentation/animation/technical-scenarios";
import type { RuntimeDeckApprovalStatus } from "@koikoi4x/deck-format";
import type { InputInteractionInspectionV1 } from "../presentation/input/types";
import type { TechnicalInputFixtureId } from "../presentation/input/technical-input-fixtures";

export const TABLE_SCREEN_ID = "inputRuntime" as const;
export const TABLE_PRESENTATION_MODE = "technicalInputDemo" as const;
export const COORDINATE_SYSTEM = "origin top-left; +x right; +y down" as const;

export interface TablePreviewSnapshot {
  animation: AnimationInspectionV1 & {
    readonly scenarioId: TechnicalAnimationScenarioId;
    readonly transitCardCount: number;
  };
  boardViewport: BoardViewport;
  canvasCount: number;
  coordinateSystem: typeof COORDINATE_SYSTEM;
  diagnostics: BoardLayoutDiagnostics;
  deck: {
    activeDeckId: string | null;
    approvalStatus: RuntimeDeckApprovalStatus | null;
    availableDeckIds: readonly string[];
    status: "error" | "loading" | "ready";
  };
  fullscreen: boolean;
  input: InputInteractionInspectionV1 & {
    readonly fixtureId: TechnicalInputFixtureId;
    readonly semanticControlCount: number;
    readonly intentExecution: "notExecuted";
  };
  layerOrder: BoardLayout["layerOrder"];
  layout: {
    cardZoneCount: number;
    fieldSlotCount: number;
    mode: BoardLayout["mode"];
    scale: number;
    uiZones: BoardLayout["uiZones"];
    zones: BoardLayout["cardZones"];
  };
  presentationMode: typeof TABLE_PRESENTATION_MODE;
  cards: CardRuntimeInspection;
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
  animation: AnimationInspectionV1;
  boardViewport: BoardViewport;
  canvasCount: number;
  diagnostics: BoardLayoutDiagnostics;
  deck: TablePreviewSnapshot["deck"];
  fullscreen: boolean;
  input: InputInteractionInspectionV1;
  inputFixtureId: TechnicalInputFixtureId;
  semanticControlCount: number;
  layout: BoardLayout;
  ready: boolean;
  scene: BoardSceneInspection & { readonly cards: CardRuntimeInspection };
  simulationTimeMs: number;
  scenarioId: TechnicalAnimationScenarioId;
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
  const cards = Object.freeze({
    ...input.scene.cards,
    views: Object.freeze(input.scene.cards.views.map((view) => Object.freeze({ ...view }))),
    zoneCounts: Object.freeze({ ...input.scene.cards.zoneCounts }),
  });
  return Object.freeze({
    screen: TABLE_SCREEN_ID,
    presentationMode: TABLE_PRESENTATION_MODE,
    ready: input.ready,
    canvasCount: input.canvasCount,
    viewport: Object.freeze({ ...input.viewport }),
    boardViewport: Object.freeze({ ...input.boardViewport }),
    fullscreen: input.fullscreen,
    input: Object.freeze({
      ...input.input,
      selectableCardIds: Object.freeze([...input.input.selectableCardIds]),
      legalTargetCardIds: Object.freeze([...input.input.legalTargetCardIds]),
      decisionChoices: Object.freeze([...input.input.decisionChoices]),
      fixtureId: input.inputFixtureId,
      semanticControlCount: input.semanticControlCount,
      intentExecution: "notExecuted" as const,
    }),
    simulationTimeMs: input.simulationTimeMs,
    animation: Object.freeze({
      ...input.animation,
      activeClip: input.animation.activeClip
        ? Object.freeze({ ...input.animation.activeClip })
        : null,
      scenarioId: input.scenarioId,
      transitCardCount: input.scene.cards.zoneCounts.transit,
    }),
    coordinateSystem: COORDINATE_SYSTEM,
    deck: Object.freeze({
      ...input.deck,
      availableDeckIds: Object.freeze([...input.deck.availableDeckIds]),
    }),
    layerOrder: input.layout.layerOrder,
    scene,
    cards,
    layout: Object.freeze({
      mode: input.layout.mode,
      scale: input.layout.scale,
      cardZoneCount: Object.keys(input.layout.cardZones).length,
      fieldSlotCount: input.layout.slots.field.length,
      zones: input.layout.cardZones,
      uiZones: input.layout.uiZones,
    }),
    diagnostics,
  });
}

export function serializeTablePreviewSnapshot(snapshot: TablePreviewSnapshot): string {
  return JSON.stringify(snapshot);
}
