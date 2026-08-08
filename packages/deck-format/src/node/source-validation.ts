import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { inflateSync } from "node:zlib";

import type { CardId } from "@koikoi4x/engine";

import { ART_SPEC_V1, hasCardAspectRatio } from "../art-spec.ts";
import type { DeckPackageV1, DeckValidationIssue, SourceImageMetadata } from "../types.ts";

export interface SourceValidationResult {
  readonly issues: readonly DeckValidationIssue[];
  readonly metadataByCardId: Readonly<Partial<Record<CardId, SourceImageMetadata>>>;
}

function issue(
  severity: "error" | "warning",
  code: string,
  path: string,
  message: string,
): DeckValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngPassSize(
  width: number,
  height: number,
  bitsPerPixel: number,
  startX: number,
  startY: number,
  stepX: number,
  stepY: number,
): { bytes: number; rowStarts: readonly number[] } {
  const passWidth = width <= startX ? 0 : Math.ceil((width - startX) / stepX);
  const passHeight = height <= startY ? 0 : Math.ceil((height - startY) / stepY);
  const rowBytes = Math.ceil((passWidth * bitsPerPixel) / 8);
  const rowSize = rowBytes + 1;
  return {
    bytes: passHeight * rowSize,
    rowStarts: Object.freeze(Array.from({ length: passHeight }, (_, index) => index * rowSize)),
  };
}

function validatePngImageData(
  data: Buffer,
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
  interlace: number,
): boolean {
  const channelCount = new Map([
    [0, 1],
    [2, 3],
    [3, 1],
    [4, 2],
    [6, 4],
  ]).get(colorType);
  const allowedBitDepths: Readonly<Record<number, readonly number[]>> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  if (
    channelCount === undefined ||
    !allowedBitDepths[colorType]?.includes(bitDepth) ||
    (interlace !== 0 && interlace !== 1)
  ) {
    return false;
  }

  let inflated: Buffer;
  try {
    inflated = inflateSync(data);
  } catch {
    return false;
  }
  const passes =
    interlace === 0
      ? [[0, 0, 1, 1] as const]
      : [
          [0, 0, 8, 8] as const,
          [4, 0, 8, 8] as const,
          [0, 4, 4, 8] as const,
          [2, 0, 4, 4] as const,
          [0, 2, 2, 4] as const,
          [1, 0, 2, 2] as const,
          [0, 1, 1, 2] as const,
        ];
  const bitsPerPixel = channelCount * bitDepth;
  let expectedBytes = 0;
  const filterOffsets: number[] = [];
  for (const [startX, startY, stepX, stepY] of passes) {
    const pass = pngPassSize(width, height, bitsPerPixel, startX, startY, stepX, stepY);
    filterOffsets.push(...pass.rowStarts.map((offset) => expectedBytes + offset));
    expectedBytes += pass.bytes;
  }
  return (
    inflated.length === expectedBytes &&
    filterOffsets.every((offset) => (inflated[offset] ?? 5) <= 4)
  );
}

function parsePng(buffer: Buffer): SourceImageMetadata | null {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(signature)) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let sawHeader = false;
  let sawEnd = false;
  const imageData: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) return null;
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCrc) return null;

    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) return null;
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8] ?? 0;
      colorType = buffer[dataStart + 9] ?? -1;
      if (buffer[dataStart + 10] !== 0 || buffer[dataStart + 11] !== 0) return null;
      interlace = buffer[dataStart + 12] ?? -1;
      sawHeader = true;
    } else if (type === "IDAT") {
      imageData.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      if (length !== 0 || chunkEnd !== buffer.length) return null;
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }
  if (
    !sawHeader ||
    !sawEnd ||
    width <= 0 ||
    height <= 0 ||
    imageData.length === 0 ||
    !validatePngImageData(Buffer.concat(imageData), width, height, bitDepth, colorType, interlace)
  ) {
    return null;
  }
  return Object.freeze({
    format: "png",
    width,
    height,
  });
}

function parseJpeg(buffer: Buffer): SourceImageMetadata | null {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[buffer.length - 2] !== 0xff ||
    buffer[buffer.length - 1] !== 0xd9
  ) {
    return null;
  }
  let offset = 2;
  let width = 0;
  let height = 0;
  let sawScan = false;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    if (marker === undefined || marker === 0x00 || marker === 0xd8) return null;
    offset += 1;
    if (marker === 0xd9) {
      return offset === buffer.length && sawScan && width > 0 && height > 0
        ? Object.freeze({ format: "jpeg", width, height })
        : null;
    }
    if (marker >= 0xd0 && marker <= 0xd7) return null;
    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && offset + 7 < buffer.length) {
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
    }
    offset += segmentLength;
    if (marker !== 0xda) continue;

    sawScan = true;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const markerOffset = offset;
      while (buffer[offset] === 0xff) offset += 1;
      const scanMarker = buffer[offset];
      if (scanMarker === undefined) return null;
      if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
        offset += 1;
        continue;
      }
      offset = markerOffset;
      break;
    }
  }
  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer.readUIntLE(offset, 3);
}

function parseWebp(buffer: Buffer): SourceImageMetadata | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const declaredSize = buffer.readUInt32LE(4) + 8;
  if (declaredSize !== buffer.length) return null;
  let offset = 12;
  let canvas: { width: number; height: number } | null = null;
  let payload: { width: number; height: number } | null = null;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    const paddedEnd = dataEnd + (chunkSize % 2);
    if (dataEnd > buffer.length || paddedEnd > buffer.length) return null;

    if (chunkType === "VP8X") {
      if (chunkSize !== 10) return null;
      canvas = {
        width: readUInt24LE(buffer, dataStart + 4) + 1,
        height: readUInt24LE(buffer, dataStart + 7) + 1,
      };
    } else if (chunkType === "VP8L") {
      if (chunkSize < 6 || buffer[dataStart] !== 0x2f) return null;
      const b1 = buffer.readUInt8(dataStart + 1);
      const b2 = buffer.readUInt8(dataStart + 2);
      const b3 = buffer.readUInt8(dataStart + 3);
      const b4 = buffer.readUInt8(dataStart + 4);
      payload = {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | (b2 >> 6)),
      };
    } else if (chunkType === "VP8 ") {
      if (
        chunkSize < 11 ||
        buffer[dataStart + 3] !== 0x9d ||
        buffer[dataStart + 4] !== 0x01 ||
        buffer[dataStart + 5] !== 0x2a
      ) {
        return null;
      }
      payload = {
        width: buffer.readUInt16LE(dataStart + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataStart + 8) & 0x3fff,
      };
    }
    offset = paddedEnd;
  }
  if (offset !== buffer.length || payload === null) return null;
  if (canvas !== null && (canvas.width !== payload.width || canvas.height !== payload.height)) {
    return null;
  }
  const dimensions = canvas ?? payload;
  return dimensions.width > 0 && dimensions.height > 0
    ? Object.freeze({ format: "webp", ...dimensions })
    : null;
}

export function readSourceImageMetadata(path: string): SourceImageMetadata {
  const buffer = readFileSync(path);
  const extension = extname(path).toLowerCase();
  const metadata =
    extension === ".png"
      ? parsePng(buffer)
      : extension === ".jpg" || extension === ".jpeg"
        ? parseJpeg(buffer)
        : extension === ".webp"
          ? parseWebp(buffer)
          : null;
  if (metadata === null || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error(`Unreadable or corrupt supported image: ${path}`);
  }
  return metadata;
}

export function sourceFileDigest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function resolvedAssetPath(packageDirectory: string, relativePath: string): string {
  const packageRoot = resolve(packageDirectory);
  const assetPath = resolve(packageRoot, relativePath);
  if (assetPath !== packageRoot && !assetPath.startsWith(`${packageRoot}${sep}`)) {
    throw new Error(`Path escapes package root: ${relativePath}`);
  }
  return assetPath;
}

function validateDimensions(
  metadata: SourceImageMetadata,
  cardId: CardId,
  packageDefinition: DeckPackageV1,
  issues: DeckValidationIssue[],
): void {
  const minimum = ART_SPEC_V1.source.releaseMinimum;
  const floor = ART_SPEC_V1.source.recommendedFloor;
  const belowMinimum = metadata.width < minimum.width || metadata.height < minimum.height;
  if (belowMinimum && packageDefinition.qualityExceptions?.[cardId] === undefined) {
    issues.push(
      issue(
        "error",
        "SOURCE_BELOW_RELEASE_MINIMUM",
        cardId,
        `${metadata.width}×${metadata.height} is below ${minimum.width}×${minimum.height}.`,
      ),
    );
  } else if (metadata.width < floor.width || metadata.height < floor.height) {
    issues.push(
      issue(
        "warning",
        "SOURCE_BELOW_RECOMMENDED_FLOOR",
        cardId,
        `${metadata.width}×${metadata.height} is below ${floor.width}×${floor.height}.`,
      ),
    );
  }
  if (!hasCardAspectRatio(metadata, 0.001)) {
    issues.push(
      issue(
        "warning",
        "SOURCE_ASPECT",
        cardId,
        `${metadata.width}×${metadata.height} is not the preferred 5:8 full-bleed ratio.`,
      ),
    );
  }
}

export interface ValidateLocalSourcesOptions {
  readonly cardIds?: ReadonlySet<CardId>;
}

export function validateLocalPackageSources(
  packageDirectory: string,
  packageDefinition: DeckPackageV1,
  options: ValidateLocalSourcesOptions = {},
): SourceValidationResult {
  const issues: DeckValidationIssue[] = [];
  const metadataByCardId: Partial<Record<CardId, SourceImageMetadata>> = {};
  const selectedCardIds = options.cardIds;

  for (const [cardIdValue, mapping] of Object.entries(packageDefinition.cards)) {
    const cardId = cardIdValue as CardId;
    if (mapping === undefined || (selectedCardIds !== undefined && !selectedCardIds.has(cardId))) {
      continue;
    }
    const path = resolvedAssetPath(packageDirectory, mapping.file);
    if (!existsSync(path)) {
      issues.push(issue("error", "MISSING_SOURCE", cardId, `Missing ${mapping.file}.`));
      continue;
    }
    try {
      const metadata = readSourceImageMetadata(path);
      metadataByCardId[cardId] = metadata;
      validateDimensions(metadata, cardId, packageDefinition, issues);
    } catch (error) {
      issues.push(
        issue(
          "error",
          "UNREADABLE_SOURCE",
          cardId,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  const cardBack = packageDefinition.backs?.default;
  if (cardBack !== undefined) {
    const path = resolvedAssetPath(packageDirectory, cardBack);
    if (!existsSync(path)) {
      issues.push(
        issue("error", "MISSING_CARD_BACK_SOURCE", "backs.default", `Missing ${cardBack}.`),
      );
    } else {
      try {
        readSourceImageMetadata(path);
      } catch (error) {
        issues.push(
          issue(
            "error",
            "UNREADABLE_CARD_BACK",
            "backs.default",
            error instanceof Error ? error.message : String(error),
          ),
        );
      }
    }
  }

  return Object.freeze({
    issues: Object.freeze(issues),
    metadataByCardId: Object.freeze(metadataByCardId),
  });
}
