import {
  getCardDefinition,
  getMonthDefinition,
  type CardCategory,
  type CardId,
  type PlayerId,
  type PlayerObservationV1,
} from "@koikoi4x/engine";

const CATEGORY_ORDER = Object.freeze(["bright", "animal", "scroll", "plain"] as const);

const CATEGORY_LABELS = Object.freeze({
  bright: "Brights",
  animal: "Animals",
  scroll: "Scrolls",
  plain: "Plains",
} satisfies Readonly<Record<CardCategory, string>>);

export type CaptureInspectionOwnerV1 = "opponent" | "player";

export interface CaptureInspectionCardV1 {
  readonly cardId: CardId;
  readonly category: CardCategory;
  readonly label: string;
}

export interface CaptureInspectionGroupV1 {
  readonly cards: readonly CaptureInspectionCardV1[];
  readonly category: CardCategory;
  readonly label: string;
}

export interface CaptureInspectionPresentationV1 {
  readonly groups: readonly CaptureInspectionGroupV1[];
  readonly owner: CaptureInspectionOwnerV1;
  readonly playerId: PlayerId;
  readonly totalCards: number;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "player-a" ? "player-b" : "player-a";
}

export function createCaptureInspectionPresentation(input: {
  readonly observation: PlayerObservationV1;
  readonly owner: CaptureInspectionOwnerV1;
}): CaptureInspectionPresentationV1 {
  const playerId =
    input.owner === "player" ? input.observation.playerId : otherPlayer(input.observation.playerId);
  const player = input.observation.publicState.players.find(({ id }) => id === playerId);
  if (!player) throw new Error(`CAPTURE_INSPECTION_PLAYER_MISSING: ${playerId}`);

  const groups = CATEGORY_ORDER.map((category) => {
    const cards = player.captured
      .filter((cardId) => getCardDefinition(cardId).category === category)
      .map((cardId) => {
        const card = getCardDefinition(cardId);
        return Object.freeze({
          cardId,
          category,
          label: `${getMonthDefinition(card.month).name} · ${card.displayName}`,
        });
      });
    return Object.freeze({
      category,
      label: CATEGORY_LABELS[category],
      cards: Object.freeze(cards),
    });
  });

  return Object.freeze({
    owner: input.owner,
    playerId,
    totalCards: player.captured.length,
    groups: Object.freeze(groups),
  });
}
