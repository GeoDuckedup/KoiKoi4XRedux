import { ART_SPEC_V1, safeAreaPixels } from "./art-spec.ts";

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

export function renderArtGuideSvg(): string {
  const canvas = ART_SPEC_V1.source.preferredMaster;
  const safe = safeAreaPixels(canvas);
  const frame = canvas.width * ART_SPEC_V1.frame.approximateWidthRatio;
  const centerX = canvas.width / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title description" data-art-spec-version="${ART_SPEC_V1.version}">
  <title id="title">KoiKoi4x Art Template v1</title>
  <desc id="description">Preferred ${canvas.width} by ${canvas.height} full-bleed source canvas with centered ${ART_SPEC_V1.safeArea.width * 100}% by ${ART_SPEC_V1.safeArea.height * 100}% critical-subject safe area and an informational game-frame overlay.</desc>
  <rect width="${canvas.width}" height="${canvas.height}" fill="#f4eee1"/>
  <path d="M0 0H${canvas.width}V${canvas.height}H0Z" fill="none" stroke="#8b1e2d" stroke-width="12"/>
  <rect x="${number(frame / 2)}" y="${number(frame / 2)}" width="${number(canvas.width - frame)}" height="${number(canvas.height - frame)}" rx="${number(frame)}" fill="none" stroke="#273f37" stroke-width="${number(frame)}" opacity="0.72"/>
  <rect x="${number(safe.x)}" y="${number(safe.y)}" width="${number(safe.width)}" height="${number(safe.height)}" fill="none" stroke="#087e8b" stroke-width="10" stroke-dasharray="30 20"/>
  <line x1="${centerX}" y1="0" x2="${centerX}" y2="${canvas.height}" stroke="#705d56" stroke-width="4" stroke-dasharray="14 18" opacity="0.65"/>
  <line x1="0" y1="${canvas.height / 2}" x2="${canvas.width}" y2="${canvas.height / 2}" stroke="#705d56" stroke-width="4" stroke-dasharray="14 18" opacity="0.65"/>
  <g font-family="system-ui, sans-serif" text-anchor="middle">
    <rect x="180" y="190" width="1240" height="340" rx="42" fill="#fffaf0" opacity="0.94"/>
    <text x="${centerX}" y="280" font-size="64" font-weight="700" fill="#231f20">KoiKoi4x Art Template v1</text>
    <text x="${centerX}" y="360" font-size="42" fill="#4a3f3c">${canvas.width} × ${canvas.height} px · 5:8 portrait · sRGB · full bleed</text>
    <text x="${centerX}" y="440" font-size="34" fill="#8b1e2d">Red outer line: final/full-bleed boundary</text>
    <text x="${centerX}" y="492" font-size="34" fill="#087e8b">Blue dashed line: informational ${ART_SPEC_V1.safeArea.width * 100}% × ${ART_SPEC_V1.safeArea.height * 100}% safe area</text>
    <rect x="220" y="2010" width="1160" height="350" rx="42" fill="#fffaf0" opacity="0.94"/>
    <text x="${centerX}" y="2100" font-size="36" fill="#273f37">Dark overlay: approximate ${ART_SPEC_V1.frame.approximateWidthRatio * 100}% game-owned frame</text>
    <text x="${centerX}" y="2170" font-size="32" fill="#4a3f3c">Safe/frame guides are informational; they are not source crops.</text>
    <text x="${centerX}" y="2230" font-size="32" fill="#4a3f3c">Background art may bleed to the edge. Keep critical subjects inside blue.</text>
    <text x="${centerX}" y="2290" font-size="30" fill="#4a3f3c">The game owns masking, corners, shadows, hitboxes, labels, and interaction effects.</text>
  </g>
</svg>
`;
}
