export interface PixelSize {
  readonly width: number;
  readonly height: number;
}

export interface NormalizedRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PixelRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const ART_SPEC_V1 = Object.freeze({
  version: 1,
  colorSpace: "sRGB",
  card: Object.freeze({
    widthUnits: 5,
    heightUnits: 8,
    aspectRatio: 5 / 8,
    orientation: "portrait",
    sourcePolicy: "fullBleed",
  }),
  source: Object.freeze({
    preferredMaster: Object.freeze({ width: 1600, height: 2560 }),
    recommendedFloor: Object.freeze({ width: 1200, height: 1920 }),
    releaseMinimum: Object.freeze({ width: 800, height: 1280 }),
    preferredFormat: "png",
    acceptedExtensions: Object.freeze([".png", ".jpg", ".jpeg", ".webp"] as const),
    alphaAllowed: true,
  }),
  safeArea: Object.freeze({
    x: 0.08,
    y: 0.06,
    width: 0.84,
    height: 0.88,
  }),
  frame: Object.freeze({
    policy: "game",
    approximateWidthRatio: 0.03,
    geometryPackageOverrideAllowed: false,
  }),
  defaultTransform: Object.freeze({
    mode: "auto",
    fit: "cover",
    focusX: 0.5,
    focusY: 0.5,
  }),
  derivatives: Object.freeze({
    table: Object.freeze({ width: 640, height: 1024 }),
    thumbnail: Object.freeze({ width: 160, height: 256 }),
    optionalInspection: Object.freeze({ width: 1280, height: 2048, generateByDefault: false }),
    runtimeFormat: "measurementRequired",
  }),
} as const);

export type ArtSpecV1 = typeof ART_SPEC_V1;

export function safeAreaPixels(
  size: PixelSize = ART_SPEC_V1.source.preferredMaster,
): Readonly<PixelRectangle> {
  return Object.freeze({
    x: size.width * ART_SPEC_V1.safeArea.x,
    y: size.height * ART_SPEC_V1.safeArea.y,
    width: size.width * ART_SPEC_V1.safeArea.width,
    height: size.height * ART_SPEC_V1.safeArea.height,
  });
}

export function hasCardAspectRatio(size: PixelSize, tolerance = 1e-9): boolean {
  return Math.abs(size.width / size.height - ART_SPEC_V1.card.aspectRatio) <= tolerance;
}
