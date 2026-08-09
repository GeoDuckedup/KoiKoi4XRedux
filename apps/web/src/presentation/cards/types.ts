import type { CardId } from "@koikoi4x/engine";

import type { BoardLayerName, BoardRect, CardZone } from "../board/types";

export interface CardPresentationState {
  readonly cardId: CardId;
  readonly faceUp: boolean;
  readonly interactive: boolean;
  readonly selected: boolean;
  readonly slotId: string;
  readonly slotIndex: number;
  readonly zIndex: number;
  readonly zone: CardZone;
}

export interface CardPlacement extends CardPresentationState {
  readonly bounds: BoardRect;
  readonly layer: BoardLayerName;
}

export interface CardDisplayPlacement extends CardPlacement {
  readonly alpha?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
}

export interface CardViewInspection {
  readonly cardId: CardId;
  readonly faceUp: boolean;
  readonly layer: BoardLayerName;
  readonly slotId: string;
  readonly textureBinding: string;
  readonly token: string;
  readonly zone: CardZone;
}

export interface CardRuntimeInspection {
  readonly activeDeckId: string;
  readonly cardViewCount: number;
  readonly uniqueCardIdCount: number;
  readonly views: readonly CardViewInspection[];
  readonly zoneCounts: Readonly<Record<CardZone, number>>;
}
