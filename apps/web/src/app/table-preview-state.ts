import type { PlayerId, PublicPhaseV1 } from "@koikoi4x/engine";
import type { RuntimeDeckApprovalStatus } from "@koikoi4x/deck-format";

import type { AnimationInspectionV1 } from "../presentation/animation/types";
import type {
  BoardLayout,
  BoardLayoutDiagnostics,
  BoardSceneInspection,
  BoardViewport,
} from "../presentation/board/types";
import type { CardRuntimeInspection } from "../presentation/cards/types";
import type { InputInteractionInspectionV1 } from "../presentation/input/types";

export const TABLE_SCREEN_ID = "localRound" as const;
export const TABLE_PRESENTATION_MODE = "authoritativeLocalRound" as const;
export const COORDINATE_SYSTEM = "origin top-left; +x right; +y down" as const;

export interface LocalRoundSnapshotV1 {
  readonly activePlayerId: PlayerId | null;
  readonly commandCount: number;
  readonly handoffPending: boolean;
  readonly latestRecap: string | null;
  readonly phase: PublicPhaseV1["kind"];
  readonly recapCount: number;
  readonly roundNumber: number;
  readonly scheduledMonth: number;
  readonly stateVersion: number;
  readonly viewerId: PlayerId;
}

export interface TablePreviewSnapshot {
  readonly animation: AnimationInspectionV1 & { readonly transitCardCount: number };
  readonly boardViewport: BoardViewport;
  readonly canvasCount: number;
  readonly cards: Omit<CardRuntimeInspection, "views"> & {
    readonly visibleViews: readonly CardRuntimeInspection["views"][number][];
  };
  readonly coordinateSystem: typeof COORDINATE_SYSTEM;
  readonly deck: {
    readonly activeDeckId: string | null;
    readonly approvalStatus: RuntimeDeckApprovalStatus | null;
    readonly availableDeckIds: readonly string[];
    readonly status: "error" | "loading" | "ready";
  };
  readonly diagnostics: BoardLayoutDiagnostics;
  readonly fullscreen: boolean;
  readonly input: InputInteractionInspectionV1 & {
    readonly intentExecution: "executedLocally";
    readonly semanticControlCount: number;
  };
  readonly layerOrder: BoardLayout["layerOrder"];
  readonly layout: {
    readonly cardZoneCount: number;
    readonly fieldSlotCount: number;
    readonly mode: BoardLayout["mode"];
    readonly scale: number;
    readonly uiZones: BoardLayout["uiZones"];
    readonly zones: BoardLayout["cardZones"];
  };
  readonly localRound: LocalRoundSnapshotV1;
  readonly presentationMode: typeof TABLE_PRESENTATION_MODE;
  readonly ready: boolean;
  readonly scene: BoardSceneInspection;
  readonly screen: typeof TABLE_SCREEN_ID;
  readonly simulationTimeMs: number;
  readonly viewport: BoardViewport;
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
  readonly animation: AnimationInspectionV1;
  readonly boardViewport: BoardViewport;
  readonly canvasCount: number;
  readonly deck: TablePreviewSnapshot["deck"];
  readonly diagnostics: BoardLayoutDiagnostics;
  readonly fullscreen: boolean;
  readonly input: InputInteractionInspectionV1;
  readonly layout: BoardLayout;
  readonly localRound: LocalRoundSnapshotV1;
  readonly ready: boolean;
  readonly scene: BoardSceneInspection & { readonly cards: CardRuntimeInspection };
  readonly semanticControlCount: number;
  readonly simulationTimeMs: number;
  readonly viewport: BoardViewport;
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
  const visibleViews = input.scene.cards.views
    .filter(({ faceUp }) => faceUp)
    .map((view) => Object.freeze({ ...view }));
  const cards = Object.freeze({
    activeDeckId: input.scene.cards.activeDeckId,
    cardViewCount: input.scene.cards.cardViewCount,
    uniqueCardIdCount: input.scene.cards.uniqueCardIdCount,
    visibleViews: Object.freeze(visibleViews),
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
      semanticControlCount: input.semanticControlCount,
      intentExecution: "executedLocally" as const,
    }),
    localRound: Object.freeze({ ...input.localRound }),
    simulationTimeMs: input.simulationTimeMs,
    animation: Object.freeze({
      ...input.animation,
      activeClip: input.animation.activeClip
        ? Object.freeze({ ...input.animation.activeClip })
        : null,
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
