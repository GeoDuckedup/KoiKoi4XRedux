import { ART_SPEC_V1, type NormalizedRectangle, type PixelSize } from "./art-spec.ts";
import type { AutoTransform, CardTransform, DerivativePlan, ManualTransform } from "./types.ts";

const UNIT_RECTANGLE = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundStable(value: number): number {
  return Number(value.toFixed(12));
}

function freezeRectangle(rectangle: NormalizedRectangle): Readonly<NormalizedRectangle> {
  return Object.freeze({
    x: roundStable(rectangle.x),
    y: roundStable(rectangle.y),
    width: roundStable(rectangle.width),
    height: roundStable(rectangle.height),
  });
}

export function canonicalAutoTransform(): AutoTransform {
  return Object.freeze({ ...ART_SPEC_V1.defaultTransform });
}

function coverCrop(
  source: PixelSize,
  focusX: number,
  focusY: number,
  bounds: NormalizedRectangle = UNIT_RECTANGLE,
): Readonly<NormalizedRectangle> {
  const sourceWidth = source.width * bounds.width;
  const sourceHeight = source.height * bounds.height;
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = ART_SPEC_V1.card.aspectRatio;
  let width = bounds.width;
  let height = bounds.height;

  if (sourceAspect > targetAspect) {
    width = bounds.width * (targetAspect / sourceAspect);
  } else if (sourceAspect < targetAspect) {
    height = bounds.height * (sourceAspect / targetAspect);
  }

  const focusWithinBoundsX = bounds.x + bounds.width * focusX;
  const focusWithinBoundsY = bounds.y + bounds.height * focusY;
  const x = clamp(focusWithinBoundsX - width / 2, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(focusWithinBoundsY - height / 2, bounds.y, bounds.y + bounds.height - height);
  return freezeRectangle({ x, y, width, height });
}

function applyManualZoom(crop: NormalizedRectangle, zoom: number): Readonly<NormalizedRectangle> {
  const width = crop.width / zoom;
  const height = crop.height / zoom;
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  return freezeRectangle({
    x: clamp(centerX - width / 2, crop.x, crop.x + crop.width - width),
    y: clamp(centerY - height / 2, crop.y, crop.y + crop.height - height),
    width,
    height,
  });
}

function contentBoxForContain(source: PixelSize): Readonly<NormalizedRectangle> {
  const sourceAspect = source.width / source.height;
  const targetAspect = ART_SPEC_V1.card.aspectRatio;
  if (sourceAspect > targetAspect) {
    const height = targetAspect / sourceAspect;
    return freezeRectangle({ x: 0, y: (1 - height) / 2, width: 1, height });
  }
  const width = sourceAspect / targetAspect;
  return freezeRectangle({ x: (1 - width) / 2, y: 0, width, height: 1 });
}

function pixelCrop(source: PixelSize, crop: NormalizedRectangle) {
  const left = Math.round(crop.x * source.width);
  const top = Math.round(crop.y * source.height);
  const right = Math.round((crop.x + crop.width) * source.width);
  const bottom = Math.round((crop.y + crop.height) * source.height);
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

export function createDerivativePlan(
  source: PixelSize,
  output: PixelSize,
  transform: CardTransform,
): DerivativePlan {
  let normalizedSourceCrop: Readonly<NormalizedRectangle>;
  let normalizedContentBox: Readonly<NormalizedRectangle> = UNIT_RECTANGLE;
  let rotationDeg = 0;

  if (transform.mode === "auto") {
    if (transform.fit === "contain") {
      normalizedSourceCrop = UNIT_RECTANGLE;
      normalizedContentBox = contentBoxForContain(source);
    } else {
      normalizedSourceCrop = coverCrop(source, transform.focusX, transform.focusY);
    }
  } else {
    const aspectCrop = coverCrop(source, 0.5, 0.5, transform.crop);
    normalizedSourceCrop = applyManualZoom(aspectCrop, transform.zoom);
    rotationDeg = transform.rotationDeg;
  }

  return Object.freeze({
    output: Object.freeze({ ...output }),
    normalizedSourceCrop: freezeRectangle(normalizedSourceCrop),
    sourcePixelCrop: pixelCrop(source, normalizedSourceCrop),
    normalizedContentBox: freezeRectangle(normalizedContentBox),
    rotationDeg,
  });
}

export function resolveCardTransform(
  packageDefault: AutoTransform | undefined,
  override: CardTransform | undefined,
): CardTransform {
  if (override !== undefined) {
    return override.mode === "auto"
      ? Object.freeze({ ...override })
      : Object.freeze({
          ...override,
          crop: Object.freeze({ ...override.crop }),
        });
  }
  return Object.freeze({ ...(packageDefault ?? canonicalAutoTransform()) });
}

export function isManualTransform(transform: CardTransform): transform is ManualTransform {
  return transform.mode === "manual";
}
