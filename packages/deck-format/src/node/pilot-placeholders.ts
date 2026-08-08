import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ART_SPEC_V1 } from "../art-spec.ts";

type Rgba = readonly [number, number, number, number];

const WIDTH = ART_SPEC_V1.source.preferredMaster.width;
const HEIGHT = ART_SPEC_V1.source.preferredMaster.height;

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

function chunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function setPixel(pixels: Buffer, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fillGradient(pixels: Buffer, top: Rgba, bottom: Rgba): void {
  for (let y = 0; y < HEIGHT; y += 1) {
    const progress = y / (HEIGHT - 1);
    const color = [
      Math.round(top[0] + (bottom[0] - top[0]) * progress),
      Math.round(top[1] + (bottom[1] - top[1]) * progress),
      Math.round(top[2] + (bottom[2] - top[2]) * progress),
      255,
    ] as const;
    for (let x = 0; x < WIDTH; x += 1) setPixel(pixels, x, y, color);
  }
}

function rectangle(
  pixels: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgba,
): void {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) setPixel(pixels, px, py, color);
  }
}

function circle(
  pixels: Buffer,
  centerX: number,
  centerY: number,
  radius: number,
  color: Rgba,
): void {
  const radiusSquared = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) setPixel(pixels, x, y, color);
    }
  }
}

function line(
  pixels: Buffer,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  thickness: number,
  color: Rgba,
): void {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(startX + ((endX - startX) * step) / steps);
    const y = Math.round(startY + ((endY - startY) * step) / steps);
    circle(pixels, x, y, thickness, color);
  }
}

function drawRain(pixels: Buffer): void {
  fillGradient(pixels, [35, 54, 79, 255], [12, 25, 45, 255]);
  for (let index = -8; index < 28; index += 1) {
    line(pixels, index * 95, 0, index * 95 - 420, HEIGHT, 5, [126, 178, 201, 180]);
  }
  circle(pixels, 860, 1120, 420, [145, 39, 52, 255]);
  rectangle(pixels, 450, 1110, 820, 80, [92, 20, 34, 255]);
  line(pixels, 850, 1130, 720, 2080, 24, [231, 220, 185, 255]);
  for (let index = 0; index < 18; index += 1) {
    circle(
      pixels,
      180 + ((index * 257) % 1250),
      260 + ((index * 389) % 1900),
      34,
      [217, 230, 223, 210],
    );
  }
}

function drawSakeCup(pixels: Buffer): void {
  fillGradient(pixels, [206, 176, 105, 255], [151, 92, 64, 255]);
  circle(pixels, 800, 820, 300, [247, 235, 196, 255]);
  circle(pixels, 800, 820, 220, [166, 48, 48, 255]);
  rectangle(pixels, 510, 800, 580, 680, [243, 229, 195, 255]);
  rectangle(pixels, 600, 1450, 400, 100, [91, 48, 43, 255]);
  for (let petal = 0; petal < 12; petal += 1) {
    const angle = (Math.PI * 2 * petal) / 12;
    circle(
      pixels,
      Math.round(800 + Math.cos(angle) * 520),
      Math.round(1900 + Math.sin(angle) * 260),
      72,
      [232, 194, 62, 255],
    );
  }
  circle(pixels, 800, 1900, 115, [92, 74, 35, 255]);
}

function drawPhoenix(pixels: Buffer): void {
  fillGradient(pixels, [39, 26, 70, 255], [112, 28, 52, 255]);
  circle(pixels, 800, 920, 350, [240, 183, 45, 255]);
  circle(pixels, 800, 920, 230, [245, 92, 50, 255]);
  for (let feather = 0; feather < 9; feather += 1) {
    const x = 220 + feather * 145;
    line(
      pixels,
      800,
      1120,
      x,
      2180,
      42,
      feather % 2 === 0 ? [246, 171, 38, 255] : [207, 55, 58, 255],
    );
  }
  line(pixels, 800, 580, 800, 1550, 65, [250, 211, 92, 255]);
  line(pixels, 800, 1050, 260, 1350, 58, [242, 149, 40, 255]);
  line(pixels, 800, 1050, 1340, 1350, 58, [242, 149, 40, 255]);
}

function drawPine(pixels: Buffer): void {
  fillGradient(pixels, [228, 219, 185, 255], [180, 151, 103, 255]);
  line(pixels, 760, 2500, 680, 350, 48, [76, 54, 37, 255]);
  const clusters = [
    [680, 620],
    [520, 950],
    [810, 1180],
    [470, 1510],
    [830, 1810],
  ] as const;
  for (const [x, y] of clusters) {
    for (let needle = 0; needle < 20; needle += 1) {
      const angle = (Math.PI * 2 * needle) / 20;
      line(
        pixels,
        x,
        y,
        Math.round(x + Math.cos(angle) * 330),
        Math.round(y + Math.sin(angle) * 190),
        9,
        [35, 93, 62, 255],
      );
    }
  }
}

function drawBack(pixels: Buffer): void {
  fillGradient(pixels, [47, 74, 66, 255], [21, 42, 38, 255]);
  for (let y = 0; y < HEIGHT; y += 160) {
    for (let x = 0; x < WIDTH; x += 160) {
      if ((x / 160 + y / 160) % 2 === 0) {
        circle(pixels, x + 80, y + 80, 52, [177, 48, 62, 255]);
      }
    }
  }
  rectangle(pixels, 110, 110, WIDTH - 220, 24, [222, 191, 112, 255]);
  rectangle(pixels, 110, HEIGHT - 134, WIDTH - 220, 24, [222, 191, 112, 255]);
  rectangle(pixels, 110, 110, 24, HEIGHT - 220, [222, 191, 112, 255]);
  rectangle(pixels, WIDTH - 134, 110, 24, HEIGHT - 220, [222, 191, 112, 255]);
}

function encodePng(pixels: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(HEIGHT * (WIDTH * 4 + 1));
  for (let y = 0; y < HEIGHT; y += 1) {
    const targetOffset = y * (WIDTH * 4 + 1);
    scanlines[targetOffset] = 0;
    pixels.copy(scanlines, targetOffset + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk(
      "tEXt",
      Buffer.from("Description\0Technical Phase 0D pipeline placeholder; not final artwork."),
    ),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function placeholder(kind: "rain" | "sake" | "phoenix" | "pine" | "back"): Buffer {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
  if (kind === "rain") drawRain(pixels);
  else if (kind === "sake") drawSakeCup(pixels);
  else if (kind === "phoenix") drawPhoenix(pixels);
  else if (kind === "pine") drawPine(pixels);
  else drawBack(pixels);
  return encodePng(pixels);
}

export function seedTechnicalPilotSources(packageDirectory: string): readonly string[] {
  const sourceDirectory = join(packageDirectory, "source");
  mkdirSync(sourceDirectory, { recursive: true });
  const entries = [
    ["november-rain.png", "rain"],
    ["september-sake-cup.png", "sake"],
    ["december-phoenix.png", "phoenix"],
    ["january-pine-plain-a.png", "pine"],
    ["card-back.png", "back"],
  ] as const;
  const created: string[] = [];
  for (const [filename, kind] of entries) {
    const path = join(sourceDirectory, filename);
    if (existsSync(path)) {
      throw new Error(`Refusing to overwrite immutable pilot source: ${path}`);
    }
    writeFileSync(path, placeholder(kind));
    created.push(path);
  }
  return Object.freeze(created);
}
