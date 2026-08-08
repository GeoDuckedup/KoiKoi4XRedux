import { Container, Graphics, Text } from "pixi.js";
import type { Application } from "pixi.js";

interface BootSceneFrame {
  fullscreen: boolean;
  simulationTimeMs: number;
}

export interface BootScene {
  destroy: () => void;
  redraw: (frame: BootSceneFrame) => void;
}

const COLORS = {
  cream: 0xfff1c7,
  gold: 0xe8b44f,
  ink: 0x08140f,
  leaf: 0x356b4b,
  moss: 0x183d2e,
  red: 0xd6544d,
  table: 0x10271f,
} as const;

function createCard(width: number, height: number, accent: number): Container {
  const card = new Container();
  const body = new Graphics()
    .roundRect(0, 0, width, height, Math.max(8, width * 0.1))
    .fill({ color: COLORS.cream })
    .stroke({ color: COLORS.ink, width: Math.max(2, width * 0.025) });
  const sun = new Graphics()
    .circle(width * 0.68, height * 0.28, width * 0.14)
    .fill({ color: accent });
  const ground = new Graphics()
    .moveTo(width * 0.12, height * 0.78)
    .bezierCurveTo(
      width * 0.34,
      height * 0.48,
      width * 0.56,
      height * 0.9,
      width * 0.88,
      height * 0.6,
    )
    .lineTo(width * 0.88, height * 0.9)
    .lineTo(width * 0.12, height * 0.9)
    .closePath()
    .fill({ color: COLORS.leaf });

  card.addChild(body, sun, ground);
  return card;
}

export function createBootScene(app: Application): BootScene {
  let root = new Container();
  app.stage.addChild(root);

  const redraw = ({ fullscreen, simulationTimeMs }: BootSceneFrame): void => {
    root.destroy({ children: true });
    root = new Container();
    app.stage.addChild(root);

    const width = app.screen.width;
    const height = app.screen.height;
    const compact = width < 620;
    const shortestSide = Math.min(width, height);

    const backdrop = new Graphics().rect(0, 0, width, height).fill({ color: COLORS.table });
    const innerTable = new Graphics()
      .roundRect(
        width * 0.035,
        height * 0.035,
        width * 0.93,
        height * 0.93,
        Math.max(18, shortestSide * 0.04),
      )
      .fill({ color: COLORS.moss })
      .stroke({ color: COLORS.gold, alpha: 0.28, width: Math.max(1, shortestSide * 0.004) });

    const halo = new Graphics()
      .circle(width * 0.5, height * (compact ? 0.43 : 0.5), shortestSide * 0.32)
      .fill({ color: COLORS.gold, alpha: 0.055 });

    root.addChild(backdrop, innerTable, halo);

    const cardWidth = Math.min(compact ? width * 0.18 : width * 0.1, height * 0.16);
    const cardHeight = cardWidth * 1.6;
    const cardGap = cardWidth * 0.33;
    const cardY = height * (compact ? 0.14 : 0.19);
    const accents = [COLORS.red, COLORS.gold, COLORS.red, COLORS.gold];
    const drift = Math.sin(simulationTimeMs / 500) * Math.min(3, cardWidth * 0.03);

    for (let index = 0; index < 4; index += 1) {
      const card = createCard(cardWidth, cardHeight, accents[index] ?? COLORS.red);
      card.x =
        width * 0.5 +
        (index - 1.5) * (cardWidth + cardGap) -
        cardWidth * 0.5 +
        (index % 2 === 0 ? drift : -drift);
      card.y = cardY + Math.abs(index - 1.5) * cardHeight * 0.045;
      card.rotation = (index - 1.5) * (compact ? 0.055 : 0.04);
      root.addChild(card);
    }

    const title = new Text({
      text: "KOI KOI 4×",
      style: {
        align: "center",
        fill: COLORS.cream,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: Math.max(30, Math.min(compact ? width * 0.115 : width * 0.065, 76)),
        fontWeight: "700",
        letterSpacing: compact ? 3 : 6,
      },
    });
    title.anchor.set(0.5);
    title.position.set(width * 0.5, height * (compact ? 0.59 : 0.63));
    root.addChild(title);

    const rule = new Graphics()
      .roundRect(0, 0, Math.min(width * 0.34, 260), 3, 2)
      .fill({ color: COLORS.red });
    rule.pivot.set(rule.width * 0.5, 0);
    rule.position.set(width * 0.5, title.y + title.height * 0.72);
    root.addChild(rule);

    const subtitle = new Text({
      text: fullscreen ? "FULL TABLE · FOUNDATION READY" : "FOUNDATION READY",
      style: {
        align: "center",
        fill: COLORS.gold,
        fontFamily: "system-ui, sans-serif",
        fontSize: Math.max(11, Math.min(compact ? width * 0.034 : width * 0.016, 18)),
        fontWeight: "600",
        letterSpacing: compact ? 1.5 : 2.5,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width * 0.5, rule.y + Math.max(28, height * 0.05));
    root.addChild(subtitle);

    const cornerRadius = Math.max(2, shortestSide * 0.004);
    const cornerInset = shortestSide * 0.065;
    const corners: ReadonlyArray<readonly [number, number]> = [
      [cornerInset, cornerInset],
      [width - cornerInset, cornerInset],
      [cornerInset, height - cornerInset],
      [width - cornerInset, height - cornerInset],
    ];
    for (const [x, y] of corners) {
      root.addChild(new Graphics().circle(x, y, cornerRadius).fill({ color: COLORS.gold }));
    }
  };

  return {
    redraw,
    destroy: () => {
      root.destroy({ children: true });
    },
  };
}
