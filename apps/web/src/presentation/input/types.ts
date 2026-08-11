import type {
  CardId,
  HandPlayResolutionPreviewV1,
  PlayerId,
  PlayerObservationV1,
} from "@koikoi4x/engine";

import type { BoardRect } from "../board/types";

export const INPUT_CONFIRMATION_MODES = Object.freeze(["guided", "fast"] as const);
export type InputConfirmationMode = (typeof INPUT_CONFIRMATION_MODES)[number];

export const INPUT_LOCK_REASONS = Object.freeze([
  "animation",
  "awaitingObservation",
  "deckLoading",
  "disconnected",
  "opponentTurn",
  "remoteReplay",
  "roundTransition",
] as const);
export type InputLockReason = (typeof INPUT_LOCK_REASONS)[number];

export type InputIntentActionV1 =
  | {
      readonly type: "playHandCard";
      readonly cardId: CardId;
      readonly targetFieldCardId?: CardId;
    }
  | {
      readonly type: "chooseDrawCapture";
      readonly targetFieldCardId: CardId;
    }
  | {
      readonly type: "chooseYakuDecision";
      readonly choice: "bank" | "koiKoi";
    };

export interface InputCommandIntentV1 {
  readonly formatVersion: 1;
  readonly matchId: string;
  readonly expectedStateVersion: number;
  readonly actorId: PlayerId;
  readonly action: InputIntentActionV1;
}

export interface InteractionSourceV1 {
  readonly observation: PlayerObservationV1;
}

export type InputInteractionStatus =
  "idle" | "confirming" | "targeting" | "decision" | "locked" | "intentPending";

export interface InputInteractionInspectionV1 {
  readonly status: InputInteractionStatus;
  readonly confirmationMode: InputConfirmationMode;
  readonly lockReason: InputLockReason | null;
  readonly selectedCardId: CardId | null;
  readonly selectableCardIds: readonly CardId[];
  readonly legalTargetCardIds: readonly CardId[];
  readonly handResolutionKind: HandPlayResolutionPreviewV1["kind"] | null;
  readonly fieldPlacementAvailable: boolean;
  readonly decisionChoices: readonly ("bank" | "koiKoi")[];
  readonly confirmAvailable: boolean;
  readonly cancelAvailable: boolean;
  readonly focusedCardId: CardId | null;
  readonly matchId: string;
  readonly observationStateVersion: number;
  readonly lastIntentType: InputIntentActionV1["type"] | null;
  readonly emittedIntentCount: number;
}

export interface InteractionControllerV1 {
  activateCard: (cardId: CardId) => boolean;
  cancel: () => boolean;
  chooseYakuDecision: (choice: "bank" | "koiKoi") => boolean;
  confirm: () => boolean;
  inspect: () => InputInteractionInspectionV1;
  replaceSource: (source: InteractionSourceV1) => void;
  setConfirmationMode: (mode: InputConfirmationMode) => void;
  setExternalLock: (reason: InputLockReason | null) => void;
  setFocusedCardId: (cardId: CardId | null) => void;
}

export interface InteractionVisualStateV1 {
  readonly selectedCardId: CardId | null;
  readonly selectableCardIds: readonly CardId[];
  readonly legalTargetCardIds: readonly CardId[];
  readonly handResolutionKind: HandPlayResolutionPreviewV1["kind"] | null;
  readonly fieldPlacementAvailable: boolean;
  readonly focusedCardId: CardId | null;
  readonly locked: boolean;
}

export interface CardHitAreaV1 {
  readonly cardId: CardId;
  readonly bounds: BoardRect;
  readonly role: "selectable" | "target";
}

export interface SemanticCardControlV1 extends CardHitAreaV1 {
  readonly actionLabel: string;
  readonly ariaLabel: string;
  readonly category: string;
  readonly focused: boolean;
  readonly monthName: string;
  readonly selected: boolean;
}
