import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { CardId } from "@koikoi4x/engine";
import sharp, { type Metadata, type Sharp } from "sharp";

import { ART_SPEC_V1, type PixelSize } from "../art-spec.ts";
import type { ContactSheetPlanV1 } from "../contact-sheet.ts";
import { createDerivativePlan } from "../transform.ts";
import type { CardTransform, DerivativePlan } from "../types.ts";
import { createPostRotationCoverPlanV1 } from "../workshop.ts";

export interface RasterDerivativeV1 {
  readonly buffer: Buffer;
  readonly plan: DerivativePlan;
}

function orientedSize(metadata: Metadata): PixelSize {
  if (!metadata.width || !metadata.height) {
    throw new Error("Decoded image has no usable dimensions.");
  }
  const swap =
    metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8;
  return Object.freeze({
    width: swap ? metadata.height : metadata.width,
    height: swap ? metadata.width : metadata.height,
  });
}

function escaped(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resizedContent(pipeline: Sharp, plan: DerivativePlan, transform: CardTransform): Sharp {
  const extracted = pipeline.extract({
    left: plan.sourcePixelCrop.x,
    top: plan.sourcePixelCrop.y,
    width: plan.sourcePixelCrop.width,
    height: plan.sourcePixelCrop.height,
  });
  if (transform.mode === "auto" && transform.fit === "contain") {
    const width = Math.max(1, Math.round(plan.output.width * plan.normalizedContentBox.width));
    const height = Math.max(1, Math.round(plan.output.height * plan.normalizedContentBox.height));
    return extracted.resize(width, height, { fit: "fill" });
  }
  const cover = createPostRotationCoverPlanV1(
    { width: plan.sourcePixelCrop.width, height: plan.sourcePixelCrop.height },
    plan.output,
    plan.rotationDeg,
  );
  const rotated =
    cover.rotationDeg === 0
      ? extracted
      : extracted.rotate(cover.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return rotated.resize(cover.output.width, cover.output.height, {
    fit: "cover",
    position: "centre",
  });
}

export async function renderRasterDerivativeV1(
  sourcePath: string,
  output: PixelSize,
  transform: CardTransform,
): Promise<RasterDerivativeV1> {
  const metadata = await sharp(sourcePath, { failOn: "error" }).metadata();
  const source = orientedSize(metadata);
  const plan = createDerivativePlan(source, output, transform);
  const pipeline = sharp(sourcePath, { failOn: "error" }).rotate();
  const content = resizedContent(pipeline, plan, transform);
  let buffer: Buffer;
  if (transform.mode === "auto" && transform.fit === "contain") {
    const image = await content.png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
    const left = Math.round(plan.output.width * plan.normalizedContentBox.x);
    const top = Math.round(plan.output.height * plan.normalizedContentBox.y);
    buffer = await sharp({
      create: {
        width: plan.output.width,
        height: plan.output.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: image, left, top }])
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
  } else {
    buffer = await content.png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  }
  return Object.freeze({ buffer, plan });
}

export async function writeRasterDerivativeV1(
  path: string,
  derivative: RasterDerivativeV1,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, derivative.buffer);
}

function missingCardSvg(cardId: CardId, width: number, height: number): Buffer {
  const label = escaped(
    width < 100
      ? (cardId.split("-")[0]?.slice(0, 3).toUpperCase() ?? "CARD")
      : cardId.replaceAll("-", " ").toUpperCase(),
  );
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#2a302c"/>
  <path d="M16 16L${width - 16} ${height - 16}M${width - 16} 16L16 ${height - 16}" stroke="#d6534d" stroke-width="10" opacity="0.78"/>
  <text x="${width / 2}" y="${height / 2 - 12}" text-anchor="middle" textLength="${width * 0.76}" lengthAdjust="spacingAndGlyphs" fill="#fff3cf" font-family="sans-serif" font-size="${Math.max(12, width * 0.09)}" font-weight="700">MISSING SOURCE</text>
  <text x="${width / 2}" y="${height / 2 + 20}" text-anchor="middle" textLength="${width * 0.82}" lengthAdjust="spacingAndGlyphs" fill="#e9bb5a" font-family="sans-serif" font-size="${Math.max(9, width * 0.055)}">${label}</text>
</svg>`);
}

function labelSvg(plan: ContactSheetPlanV1, incomplete: boolean): Buffer {
  const textColor = plan.kind === "art-review" ? "#23372f" : "#fff3cf";
  const labels = plan.slots
    .map((slot) => {
      const name = escaped(
        plan.kind === "gameplay-390x844"
          ? `${String(slot.month).padStart(2, "0")}-${slot.column + 1}`
          : slot.cardId.replaceAll("-", " ").toUpperCase(),
      );
      const size = plan.kind === "art-review" ? 13 : 7;
      return `<text x="${slot.card.x + slot.card.width / 2}" y="${slot.labelY}" text-anchor="middle" textLength="${slot.card.width - 2}" lengthAdjust="spacingAndGlyphs" fill="${textColor}" font-family="sans-serif" font-size="${size}" font-weight="700">${name}</text>`;
    })
    .join("");
  const watermark = incomplete
    ? `<text x="${plan.width / 2}" y="18" text-anchor="middle" textLength="${plan.width - 24}" lengthAdjust="spacingAndGlyphs" fill="#d6534d" font-family="sans-serif" font-size="12" font-weight="800">INCOMPLETE TECHNICAL REVIEW · NOT APPROVAL READY</text>`
    : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}">${watermark}${labels}</svg>`,
  );
}

export async function renderContactSheetV1(input: {
  readonly faces: Readonly<Partial<Record<CardId, Buffer>>>;
  readonly incomplete: boolean;
  readonly plan: ContactSheetPlanV1;
}): Promise<Buffer> {
  const composites = await Promise.all(
    input.plan.slots.map(async (slot) => {
      const face =
        input.faces[slot.cardId] ??
        missingCardSvg(slot.cardId, input.plan.cardSize.width, input.plan.cardSize.height);
      const resized = await sharp(face)
        .resize(slot.card.width, slot.card.height, { fit: "fill" })
        .composite([
          {
            input: Buffer.from(
              `<svg xmlns="http://www.w3.org/2000/svg" width="${slot.card.width}" height="${slot.card.height}"><rect x="1.5" y="1.5" width="${slot.card.width - 3}" height="${slot.card.height - 3}" rx="${Math.max(3, slot.card.width * 0.08)}" fill="none" stroke="#fff3cf" stroke-width="${Math.max(2, slot.card.width * ART_SPEC_V1.frame.approximateWidthRatio)}"/></svg>`,
            ),
          },
        ])
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toBuffer();
      return { input: resized, left: slot.card.x, top: slot.card.y };
    }),
  );
  return sharp({
    create: {
      width: input.plan.width,
      height: input.plan.height,
      channels: 4,
      background: input.plan.background,
    },
  })
    .composite([...composites, { input: labelSvg(input.plan, input.incomplete), left: 0, top: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
}
