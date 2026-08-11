export const PHASE_3D_VISUAL_DIRECTION_IDS = [
  "ink-parchment",
  "moonlit-indigo",
  "warm-ivory",
] as const;

export type Phase3DVisualDirectionId = (typeof PHASE_3D_VISUAL_DIRECTION_IDS)[number];

export interface TableSceneColorsV1 {
  readonly backdrop: number;
  readonly black: number;
  readonly cream: number;
  readonly creamMuted: number;
  readonly gold: number;
  readonly green: number;
  readonly ink: number;
  readonly legal: number;
  readonly multiplier1: number;
  readonly multiplier2: number;
  readonly multiplier3: number;
  readonly multiplier4: number;
  readonly red: number;
  readonly table: number;
  readonly tableDeep: number;
  readonly white: number;
}

export interface Phase3DVisualDirectionV1 {
  readonly id: Phase3DVisualDirectionId;
  readonly name: string;
  readonly summary: string;
  readonly css: Readonly<{
    accent: string;
    accentInk: string;
    border: string;
    escalation: string;
    focus: string;
    legal: string;
    page: string;
    pageGlow: string;
    surface: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
  }>;
  readonly table: TableSceneColorsV1;
}

function freezeDirection(direction: Phase3DVisualDirectionV1): Phase3DVisualDirectionV1 {
  return Object.freeze({
    ...direction,
    css: Object.freeze({ ...direction.css }),
    table: Object.freeze({ ...direction.table }),
  });
}

export const LEGACY_TABLE_SCENE_COLORS: TableSceneColorsV1 = Object.freeze({
  backdrop: 0x061711,
  black: 0x020805,
  cream: 0xfff3cf,
  creamMuted: 0xc7c1a4,
  gold: 0xe9bb5a,
  green: 0x1f5941,
  ink: 0x0a2118,
  legal: 0xe9bb5a,
  multiplier1: 0xc9514b,
  multiplier2: 0xc9514b,
  multiplier3: 0xc9514b,
  multiplier4: 0xc9514b,
  red: 0xc9514b,
  table: 0x123b2c,
  tableDeep: 0x0b2a20,
  white: 0xffffff,
});

export const PHASE_3D_VISUAL_DIRECTIONS: readonly Phase3DVisualDirectionV1[] = Object.freeze([
  freezeDirection({
    id: "ink-parchment",
    name: "Ink, Parchment & Vermilion",
    summary: "Quiet ink-green table, warm paper text, mint legal cues, and reserved tension red.",
    css: {
      accent: "#f1c45b",
      accentInk: "#172016",
      border: "#5f755f",
      escalation: "#b83a42",
      focus: "#ffffff",
      legal: "#8fd1aa",
      page: "#071511",
      pageGlow: "#21382d",
      surface: "#0c2820",
      surfaceRaised: "#163b2d",
      text: "#fff4d6",
      textMuted: "#d8d1b4",
    },
    table: {
      backdrop: 0x071511,
      black: 0x030807,
      cream: 0xfff4d6,
      creamMuted: 0xd8d1b4,
      gold: 0xf1c45b,
      green: 0x2b7654,
      ink: 0x0c2820,
      legal: 0x8fd1aa,
      multiplier1: 0x496456,
      multiplier2: 0xd39c35,
      multiplier3: 0xc95a47,
      multiplier4: 0xa52835,
      red: 0xb83a42,
      table: 0x123b2c,
      tableDeep: 0x0c2820,
      white: 0xffffff,
    },
  }),
  freezeDirection({
    id: "moonlit-indigo",
    name: "Moonlit Indigo & Brass",
    summary: "Cool gallery-like indigo surfaces with brass accents and cyan legal cues.",
    css: {
      accent: "#e5b65a",
      accentInk: "#151a20",
      border: "#61758a",
      escalation: "#b93d52",
      focus: "#ffffff",
      legal: "#76c8cc",
      page: "#080f1b",
      pageGlow: "#1b3048",
      surface: "#0e1b2b",
      surfaceRaised: "#1c3550",
      text: "#fff5d8",
      textMuted: "#d3d0c5",
    },
    table: {
      backdrop: 0x080f1b,
      black: 0x050912,
      cream: 0xfff5d8,
      creamMuted: 0xd3d0c5,
      gold: 0xe5b65a,
      green: 0x28516c,
      ink: 0x0e1b2b,
      legal: 0x76c8cc,
      multiplier1: 0x365269,
      multiplier2: 0xc9993f,
      multiplier3: 0xbd5a55,
      multiplier4: 0x9e2943,
      red: 0xb93d52,
      table: 0x15263a,
      tableDeep: 0x0e1b2b,
      white: 0xffffff,
    },
  }),
  freezeDirection({
    id: "warm-ivory",
    name: "Warm Ivory & Slate Blue",
    summary: "Calm ivory panels, bold brown structure, blue guidance, and restrained orange cues.",
    css: {
      accent: "#a85717",
      accentInk: "#fff8e9",
      border: "#4d3b2b",
      escalation: "#b94738",
      focus: "#1f638f",
      legal: "#2c6d94",
      page: "#ead3a8",
      pageGlow: "#fff7e8",
      surface: "#fff8e9",
      surfaceRaised: "#ecd9b7",
      text: "#2a2118",
      textMuted: "#675b4d",
    },
    table: {
      backdrop: 0xead3a8,
      black: 0x201912,
      cream: 0x2a2118,
      creamMuted: 0x675b4d,
      gold: 0xa85717,
      green: 0xfff0d0,
      ink: 0xfff8e9,
      legal: 0x2c6d94,
      multiplier1: 0xa99a84,
      multiplier2: 0xb76314,
      multiplier3: 0xc45f36,
      multiplier4: 0xa93632,
      red: 0xb94738,
      table: 0xf7ecd7,
      tableDeep: 0xecd9b7,
      white: 0xffffff,
    },
  }),
]);

export function findPhase3DVisualDirection(
  value: string | undefined,
): Phase3DVisualDirectionV1 | null {
  if (value === undefined || value.length === 0) return null;
  const direction = PHASE_3D_VISUAL_DIRECTIONS.find(({ id }) => id === value);
  if (!direction) throw new Error(`Unknown Phase 3D visual direction: ${value}.`);
  return direction;
}

export const ACTIVE_PHASE_3D_VISUAL_DIRECTION = findPhase3DVisualDirection(
  import.meta.env.VITE_VISUAL_DIRECTION,
);

export const ACTIVE_TABLE_SCENE_COLORS =
  ACTIVE_PHASE_3D_VISUAL_DIRECTION?.table ?? LEGACY_TABLE_SCENE_COLORS;
