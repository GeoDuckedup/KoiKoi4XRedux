import {
  getCardDefinition,
  getMonthDefinition,
  type PlayerId,
  type PublicGameEventV1,
} from "@koikoi4x/engine";

function playerName(playerId: PlayerId): string {
  return playerId === "player-a" ? "Player A" : "Player B";
}

function cardName(cardId: Parameters<typeof getCardDefinition>[0]): string {
  const card = getCardDefinition(cardId);
  return `${getMonthDefinition(card.month).name} ${card.displayName}`;
}

export function formatTurnRecap(events: readonly PublicGameEventV1[]): string {
  const parts: string[] = [];
  for (const event of events) {
    if (event.type === "handCardPlayed") {
      parts.push(`${playerName(event.actorId)} played ${cardName(event.cardId)}.`);
    } else if (event.type === "cardsCaptured") {
      parts.push(
        `${event.phase === "hand" ? "Hand" : "Draw"} capture: ${event.cardIds.map(cardName).join(" and ")}.`,
      );
    } else if (event.type === "cardPlacedOnField") {
      parts.push(
        event.phase === "hand"
          ? "No hand match; it stayed on the field."
          : "No draw match; it stayed on the field.",
      );
    } else if (event.type === "drawCardRevealed") {
      parts.push(`Drew ${cardName(event.cardId)}.`);
    } else if (event.type === "yakuCompleted") {
      parts.push(`Completed ${event.yaku.name} for ${event.yaku.points} points.`);
    } else if (event.type === "koiKoiCalled") {
      parts.push(
        `${playerName(event.actorId)} called Koi-Koi; the table is now ${event.currentTableMultiplier}×.`,
      );
    } else if (event.type === "turnCompleted") {
      parts.push(
        event.nextPlayerId === null
          ? "Turn complete. End of play reached."
          : `Turn complete. ${playerName(event.nextPlayerId)} is next.`,
      );
    } else if (event.type === "roundResultCommitted") {
      parts.push(`Round complete: ${event.result.reasonCode.replaceAll("_", " ").toLowerCase()}.`);
    }
  }
  return parts.join(" ");
}
