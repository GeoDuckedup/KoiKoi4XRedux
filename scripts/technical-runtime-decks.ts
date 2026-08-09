import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  ART_SPEC_V1,
  decodeRuntimeDeckManifestV1,
  type RuntimeDeckManifestV1,
} from "@koikoi4x/deck-format";
import { CARD_CATALOG, type CardCategory, type CardDefinition } from "@koikoi4x/engine";

interface TechnicalPalette {
  accent: string;
  background: string;
  category: Readonly<Record<CardCategory, string>>;
  id: "technical-moonlight" | "technical-sunrise";
  inheritanceChain: readonly string[];
  ink: string;
  muted: string;
  name: string;
  paper: string;
}

interface GeneratedArtifact {
  readonly content: string;
  readonly relativePath: string;
}

const outputRoot = resolve(import.meta.dirname, "../apps/web/public/decks");
const palettes = Object.freeze([
  Object.freeze({
    id: "technical-sunrise",
    name: "Technical Sunrise",
    inheritanceChain: Object.freeze(["technical-sunrise"]),
    background: "#fff2cf",
    paper: "#fffaf0",
    ink: "#173b2c",
    muted: "#6c765e",
    accent: "#d6534d",
    category: Object.freeze({
      bright: "#e3aa35",
      animal: "#438f68",
      scroll: "#c64d55",
      plain: "#6b9a72",
    }),
  }),
  Object.freeze({
    id: "technical-moonlight",
    name: "Technical Moonlight",
    inheritanceChain: Object.freeze(["technical-sunrise", "technical-moonlight"]),
    background: "#172645",
    paper: "#eef4ff",
    ink: "#101a32",
    muted: "#9aabd0",
    accent: "#77c6d8",
    category: Object.freeze({
      bright: "#f0c760",
      animal: "#71b6a1",
      scroll: "#ad83cd",
      plain: "#668dbb",
    }),
  }),
] as const satisfies readonly TechnicalPalette[]);

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderFaceSvg(card: CardDefinition, palette: TechnicalPalette, index: number): string {
  const width = ART_SPEC_V1.derivatives.table.width;
  const height = ART_SPEC_V1.derivatives.table.height;
  const month = String(card.month).padStart(2, "0");
  const category = card.category.toUpperCase();
  const displayName = escapeXml(card.displayName.toUpperCase());
  const rotation = (index % 4) * 14 - 21;
  const motifX = 150 + ((index * 83) % 340);
  const motifY = 300 + ((index * 137) % 360);
  const categoryColor = palette.category[card.category];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Technical ${escapeXml(palette.name)} texture for ${displayName}">
  <rect width="640" height="1024" fill="${palette.paper}"/>
  <rect x="26" y="26" width="588" height="972" rx="44" fill="${palette.background}" stroke="${palette.ink}" stroke-width="14"/>
  <circle cx="${motifX}" cy="${motifY}" r="190" fill="${categoryColor}" opacity="0.28"/>
  <g transform="translate(${motifX} ${motifY}) rotate(${rotation})" fill="none" stroke="${categoryColor}" stroke-width="28" stroke-linecap="round">
    <path d="M-165 0H165M0-165V165M-118-118L118 118M118-118L-118 118" opacity="0.72"/>
    <circle r="80" fill="${palette.accent}" stroke="${palette.paper}" stroke-width="16"/>
  </g>
  <text x="64" y="150" fill="${palette.ink}" font-family="system-ui,sans-serif" font-size="112" font-weight="800">${month}</text>
  <text x="576" y="112" text-anchor="end" fill="${categoryColor}" font-family="system-ui,sans-serif" font-size="38" font-weight="800" letter-spacing="4">${category}</text>
  <rect x="64" y="790" width="512" height="130" rx="28" fill="${palette.ink}" opacity="0.94"/>
  <text x="320" y="850" text-anchor="middle" fill="${palette.paper}" font-family="system-ui,sans-serif" font-size="30" font-weight="800" letter-spacing="2">${displayName}</text>
  <text x="320" y="892" text-anchor="middle" fill="${palette.muted}" font-family="system-ui,sans-serif" font-size="21" font-weight="700" letter-spacing="3">TECHNICAL RUNTIME ART</text>
</svg>
`;
}

function renderBackSvg(palette: TechnicalPalette): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1024" viewBox="0 0 640 1024" role="img" aria-label="${escapeXml(palette.name)} technical card back">
  <rect width="640" height="1024" fill="${palette.paper}"/>
  <rect x="26" y="26" width="588" height="972" rx="44" fill="${palette.ink}" stroke="${palette.accent}" stroke-width="18"/>
  <rect x="62" y="62" width="516" height="900" rx="30" fill="none" stroke="${palette.paper}" stroke-width="8" opacity="0.8"/>
  <g transform="translate(320 500)" fill="none" stroke="${palette.accent}" stroke-width="24" opacity="0.88">
    <circle r="180"/>
    <circle r="108"/>
    <path d="M-220 0H220M0-220V220M-156-156L156 156M156-156L-156 156"/>
  </g>
  <circle cx="320" cy="500" r="50" fill="${palette.accent}"/>
  <text x="320" y="790" text-anchor="middle" fill="${palette.paper}" font-family="system-ui,sans-serif" font-size="34" font-weight="800" letter-spacing="5">${escapeXml(palette.name.toUpperCase())}</text>
  <text x="320" y="840" text-anchor="middle" fill="${palette.muted}" font-family="system-ui,sans-serif" font-size="22" font-weight="700" letter-spacing="3">TECHNICAL PLACEHOLDER</text>
</svg>
`;
}

function manifestFor(palette: TechnicalPalette): RuntimeDeckManifestV1 {
  return decodeRuntimeDeckManifestV1({
    runtimeFormatVersion: 1,
    artSpecVersion: ART_SPEC_V1.version,
    packageId: palette.id,
    packageVersion: "1.0.0",
    name: palette.name,
    author: "KoiKoi4x Project",
    license: "Generated technical placeholders for runtime validation; not approved final artwork",
    approvalStatus: "technical-placeholder",
    framePolicy: "game",
    inheritanceChain: palette.inheritanceChain,
    cardFaces: Object.fromEntries(
      CARD_CATALOG.map((card) => [
        card.id,
        {
          path: `cards/${card.id}.svg`,
          width: ART_SPEC_V1.derivatives.table.width,
          height: ART_SPEC_V1.derivatives.table.height,
          mediaType: "image/svg+xml",
          sourcePackageId: palette.id,
        },
      ]),
    ),
    cardBack: {
      path: "backs/default.svg",
      width: ART_SPEC_V1.derivatives.table.width,
      height: ART_SPEC_V1.derivatives.table.height,
      mediaType: "image/svg+xml",
      sourcePackageId: palette.id,
    },
  });
}

export function buildTechnicalRuntimeDeckArtifacts(): readonly GeneratedArtifact[] {
  const artifacts: GeneratedArtifact[] = [];
  for (const palette of palettes) {
    const manifest = manifestFor(palette);
    artifacts.push({
      relativePath: `${palette.id}/manifest.v1.json`,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    });
    for (const [index, card] of CARD_CATALOG.entries()) {
      artifacts.push({
        relativePath: `${palette.id}/cards/${card.id}.svg`,
        content: renderFaceSvg(card, palette, index),
      });
    }
    artifacts.push({
      relativePath: `${palette.id}/backs/default.svg`,
      content: renderBackSvg(palette),
    });
  }
  return Object.freeze(artifacts.map((artifact) => Object.freeze(artifact)));
}

async function writeArtifacts(artifacts: readonly GeneratedArtifact[]): Promise<void> {
  for (const artifact of artifacts) {
    const path = resolve(outputRoot, artifact.relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, artifact.content, "utf8");
  }
}

async function validateArtifacts(artifacts: readonly GeneratedArtifact[]): Promise<void> {
  const mismatches: string[] = [];
  for (const artifact of artifacts) {
    const path = resolve(outputRoot, artifact.relativePath);
    let actual: string;
    try {
      actual = await readFile(path, "utf8");
    } catch {
      mismatches.push(`${artifact.relativePath}: missing`);
      continue;
    }
    if (actual !== artifact.content) mismatches.push(`${artifact.relativePath}: stale`);
  }
  if (mismatches.length > 0) {
    throw new Error(`Technical runtime deck artifacts are not current:\n${mismatches.join("\n")}`);
  }
}

const artifacts = buildTechnicalRuntimeDeckArtifacts();
if (process.argv.includes("--check")) {
  await validateArtifacts(artifacts);
  process.stdout.write(
    `Validated ${artifacts.length} generated technical runtime deck artifacts.\n`,
  );
} else {
  await writeArtifacts(artifacts);
  process.stdout.write(`Generated ${artifacts.length} technical runtime deck artifacts.\n`);
}
