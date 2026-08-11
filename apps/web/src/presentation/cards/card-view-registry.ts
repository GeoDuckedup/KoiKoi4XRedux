import { CARD_IDS, type CardId } from "@koikoi4x/engine";
import { Container, Graphics, Sprite, type Texture } from "pixi.js";

import { CARD_ZONES, type BoardLayerName, type CardZone } from "../board/types";
import type { ActiveDeckTextures } from "../deck/card-asset-manager";
import type { CardDisplayPlacement, CardRuntimeInspection, CardViewInspection } from "./types";

export interface CardFrameColorsV1 {
  readonly black: number;
  readonly cream: number;
}

interface CardView {
  readonly cardId: CardId;
  readonly container: Container;
  readonly token: string;
  applyDeck: (textures: ActiveDeckTextures<Texture>) => void;
  applyFrameColors: (colors: CardFrameColorsV1) => void;
  applyPlacement: (placement: CardDisplayPlacement) => void;
  destroy: () => void;
  inspect: () => CardViewInspection;
}

let nextCardViewToken = 1;

function createCardViewToken(): string {
  const token = `card-view-${nextCardViewToken}`;
  nextCardViewToken += 1;
  return token;
}

function createCardView(
  cardId: CardId,
  initialDeck: ActiveDeckTextures<Texture>,
  initialFrameColors: CardFrameColorsV1,
): CardView {
  const container = new Container({ label: `CardView:${cardId}` });
  const token = createCardViewToken();
  const shadow = new Graphics();
  const sprite = new Sprite(initialDeck.faces[cardId]);
  const mask = new Graphics();
  const frame = new Graphics();
  container.addChild(shadow, sprite, mask, frame);
  sprite.mask = mask;

  let deck = initialDeck;
  let placement: CardDisplayPlacement | null = null;
  let renderedWidth = -1;
  let renderedHeight = -1;
  let frameColors = initialFrameColors;
  let renderedFrameColors: CardFrameColorsV1 | null = null;

  const applyTexture = (): void => {
    sprite.texture = placement?.faceUp === false ? deck.back : deck.faces[cardId];
  };

  return {
    cardId,
    container,
    token,
    applyDeck: (textures) => {
      deck = textures;
      applyTexture();
    },
    applyFrameColors: (colors) => {
      frameColors = colors;
    },
    applyPlacement: (nextPlacement) => {
      if (nextPlacement.cardId !== cardId) {
        throw new Error(`CardView ${cardId} cannot accept ${nextPlacement.cardId}.`);
      }
      placement = nextPlacement;
      applyTexture();
      const scaleX = nextPlacement.scaleX ?? 1;
      const scaleY = nextPlacement.scaleY ?? 1;
      container.position.set(
        nextPlacement.bounds.x + (nextPlacement.bounds.width * (1 - scaleX)) / 2,
        nextPlacement.bounds.y + (nextPlacement.bounds.height * (1 - scaleY)) / 2,
      );
      container.scale.set(scaleX, scaleY);
      container.alpha = nextPlacement.alpha ?? 1;
      container.zIndex = nextPlacement.zIndex;
      container.visible = true;

      const width = nextPlacement.bounds.width;
      const height = nextPlacement.bounds.height;
      if (
        width !== renderedWidth ||
        height !== renderedHeight ||
        renderedFrameColors?.black !== frameColors.black ||
        renderedFrameColors?.cream !== frameColors.cream
      ) {
        renderedWidth = width;
        renderedHeight = height;
        renderedFrameColors = frameColors;
        const radius = Math.max(2, width * 0.1);
        const frameWidth = Math.max(1, width * 0.03);
        shadow
          .clear()
          .roundRect(Math.max(1, width * 0.035), Math.max(1, height * 0.025), width, height, radius)
          .fill({ color: frameColors.black, alpha: 0.32 });
        sprite.position.set(0, 0);
        sprite.width = width;
        sprite.height = height;
        mask.clear().roundRect(0, 0, width, height, radius).fill({ color: 0xffffff });
        frame
          .clear()
          .roundRect(0, 0, width, height, radius)
          .stroke({ color: frameColors.cream, alpha: 0.9, width: frameWidth });
      }
    },
    inspect: () => {
      if (!placement) throw new Error(`CardView ${cardId} has no placement.`);
      return Object.freeze({
        cardId,
        token,
        zone: placement.zone,
        slotId: placement.slotId,
        layer: placement.layer,
        faceUp: placement.faceUp,
        textureBinding: placement.faceUp
          ? deck.faceBindings[cardId]
          : `${deck.manifest.packageId}:card-back`,
      });
    },
    destroy: () => {
      container.destroy({ children: true });
    },
  };
}

export interface CardViewRegistry {
  applyDeck: (textures: ActiveDeckTextures<Texture>) => void;
  applyFrameColors: (colors: CardFrameColorsV1) => void;
  applyPlacements: (
    placements: readonly CardDisplayPlacement[],
    cardLayers: ReadonlyMap<BoardLayerName, Container>,
  ) => void;
  destroy: () => void;
  inspect: () => CardRuntimeInspection;
}

export function createCardViewRegistry(
  initialDeck: ActiveDeckTextures<Texture>,
  initialFrameColors: CardFrameColorsV1 = Object.freeze({ black: 0x020805, cream: 0xfff3cf }),
): CardViewRegistry {
  const views = new Map<CardId, CardView>(
    CARD_IDS.map((cardId) => [cardId, createCardView(cardId, initialDeck, initialFrameColors)]),
  );
  let activeDeckId = initialDeck.manifest.packageId;

  return {
    applyDeck: (textures) => {
      for (const view of views.values()) view.applyDeck(textures);
      activeDeckId = textures.manifest.packageId;
    },
    applyFrameColors: (colors) => {
      for (const view of views.values()) view.applyFrameColors(colors);
    },
    applyPlacements: (placements, cardLayers) => {
      const byCardId = new Map<CardId, CardDisplayPlacement>();
      for (const placement of placements) {
        if (byCardId.has(placement.cardId)) {
          throw new Error(`Duplicate CardView placement for ${placement.cardId}.`);
        }
        byCardId.set(placement.cardId, placement);
      }
      if (byCardId.size !== CARD_IDS.length) {
        throw new Error(`CardView registry requires ${CARD_IDS.length} complete placements.`);
      }

      for (const cardId of CARD_IDS) {
        const view = views.get(cardId);
        const placement = byCardId.get(cardId);
        if (!view || !placement) throw new Error(`Missing CardView placement for ${cardId}.`);
        const layer = cardLayers.get(placement.layer);
        if (!layer) throw new Error(`Missing card container for ${placement.layer}.`);
        if (view.container.parent !== layer) layer.addChild(view.container);
        view.applyPlacement(placement);
      }
    },
    inspect: () => {
      const inspectedViews = Object.freeze(
        CARD_IDS.map((cardId) => {
          const view = views.get(cardId);
          if (!view) throw new Error(`Missing CardView ${cardId}.`);
          return view.inspect();
        }),
      );
      const zoneCounts = Object.fromEntries(CARD_ZONES.map((zone) => [zone, 0])) as Record<
        CardZone,
        number
      >;
      for (const view of inspectedViews) zoneCounts[view.zone] += 1;
      return Object.freeze({
        activeDeckId,
        cardViewCount: views.size,
        uniqueCardIdCount: new Set(inspectedViews.map(({ cardId }) => cardId)).size,
        views: inspectedViews,
        zoneCounts: Object.freeze(zoneCounts),
      });
    },
    destroy: () => {
      for (const view of views.values()) view.destroy();
      views.clear();
    },
  };
}
