import type {
  CardId,
  MonthNumber,
  YakuCategoryCountsV1,
  YakuDisplayName,
  YakuTriggerKey,
} from "@koikoi4x/engine";

export const PHASE_1C_YAKU_FIXTURE_IDS = [
  "YAKU-FIX-BRIGHT-THREE-POS",
  "YAKU-FIX-BRIGHT-THREE-NEG-RAIN",
  "YAKU-FIX-BRIGHT-FOUR-POS",
  "YAKU-FIX-BRIGHT-FOUR-NEG-RAIN",
  "YAKU-FIX-BRIGHT-FOUR-RAIN-POS",
  "YAKU-FIX-BRIGHT-FOUR-RAIN-NEG",
  "YAKU-FIX-BRIGHT-FIVE-POS",
  "YAKU-FIX-BRIGHT-FIVE-NEG",
  "YAKU-FIX-BLOSSOM-POS",
  "YAKU-FIX-BLOSSOM-NEG",
  "YAKU-FIX-MOON-POS",
  "YAKU-FIX-MOON-NEG",
  "YAKU-FIX-ANIMAL-TRIO-POS",
  "YAKU-FIX-ANIMAL-TRIO-NEG",
  "YAKU-FIX-RED-TEXT-POS",
  "YAKU-FIX-RED-TEXT-NEG",
  "YAKU-FIX-BLUE-POS",
  "YAKU-FIX-BLUE-NEG",
  "YAKU-FIX-CURRENT-MONTH-POS",
  "YAKU-FIX-CURRENT-MONTH-NEG",
  "YAKU-BRIGHT-UPGRADE-THREE-TO-FOUR-RAIN",
  "YAKU-BRIGHT-UPGRADE-FOUR-TO-FIVE",
  "YAKU-BRIGHT-INDEPENDENT-STACK-020",
  "YAKU-SAKE-ANIMAL-NOT-PLAIN",
  "YAKU-INCR-ANIMAL-005",
  "YAKU-INCR-ANIMAL-006",
  "YAKU-INCR-ANIMAL-007",
  "YAKU-INCR-SCROLL-005",
  "YAKU-INCR-SCROLL-006",
  "YAKU-INCR-SCROLL-007",
  "YAKU-INCR-PLAIN-010",
  "YAKU-INCR-PLAIN-011",
  "YAKU-INCR-PLAIN-012",
  "YAKU-CURRENT-MONTH-ACCUMULATES",
  "YAKU-CURRENT-MONTH-SWEEP",
  "YAKU-MULTI-NEW-ONE-DECISION",
  "YAKU-INCREMENT-NO-RETRIGGER",
  "YAKU-SCROLL-SEVEN-013",
  "YAKU-SCROLL-NO-RED-BLUE-BONUS",
] as const;

export type Phase1CYakuFixtureId = (typeof PHASE_1C_YAKU_FIXTURE_IDS)[number];

export interface ExpectedYakuFixtureEntry {
  readonly key: YakuTriggerKey;
  readonly name: YakuDisplayName;
  readonly points: number;
}

export interface Phase1CYakuFixture {
  readonly id: Phase1CYakuFixtureId;
  readonly scheduledMonth: MonthNumber;
  readonly capturedCardIds: readonly CardId[];
  readonly seenYakuKeys: readonly YakuTriggerKey[];
  readonly expectedActiveYaku: readonly ExpectedYakuFixtureEntry[];
  readonly expectedCurrentYakuTotal: number;
  readonly expectedNewYakuKeys: readonly YakuTriggerKey[];
  readonly expectedCategoryCounts: YakuCategoryCountsV1;
  readonly absentYakuKeys: readonly YakuTriggerKey[];
}

const NAMES: Readonly<Record<YakuTriggerKey, YakuDisplayName>> = Object.freeze({
  fiveBrights: "Five Brights",
  fourBrights: "Four Brights",
  fourBrightsWithRain: "Four Brights with Rain",
  threeBrights: "Three Brights",
  blossomViewing: "Blossom Viewing",
  moonViewing: "Moon Viewing",
  animalTrio: "Animal Trio",
  redTextScrolls: "Red Text Scrolls",
  blueScrolls: "Blue Scrolls",
  currentMonthSet: "Current-Month Set",
  animals: "Animals",
  scrolls: "Scrolls",
  plainCards: "Plain Cards",
});

function expected(key: YakuTriggerKey, points: number): ExpectedYakuFixtureEntry {
  return { key, name: NAMES[key], points };
}

function counts(
  bright: number,
  animal: number,
  scroll: number,
  plain: number,
): YakuCategoryCountsV1 {
  return { bright, animal, scroll, plain };
}

function deepFreezeFixture<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreezeFixture(nested);
    Object.freeze(value);
  }
  return value;
}

function fixture(
  id: Phase1CYakuFixtureId,
  capturedCardIds: readonly CardId[],
  expectedActiveYaku: readonly ExpectedYakuFixtureEntry[],
  expectedCurrentYakuTotal: number,
  expectedNewYakuKeys: readonly YakuTriggerKey[],
  expectedCategoryCounts: YakuCategoryCountsV1,
  options: {
    readonly scheduledMonth?: MonthNumber;
    readonly seenYakuKeys?: readonly YakuTriggerKey[];
    readonly absentYakuKeys?: readonly YakuTriggerKey[];
  } = {},
): Phase1CYakuFixture {
  return deepFreezeFixture({
    id,
    scheduledMonth: options.scheduledMonth ?? 1,
    capturedCardIds: [...capturedCardIds],
    seenYakuKeys: [...(options.seenYakuKeys ?? [])],
    expectedActiveYaku: [...expectedActiveYaku],
    expectedCurrentYakuTotal,
    expectedNewYakuKeys: [...expectedNewYakuKeys],
    expectedCategoryCounts,
    absentYakuKeys: [...(options.absentYakuKeys ?? [])],
  });
}

const B3 = ["january-crane", "march-curtain", "august-moon"] as const;
const B3_WITH_RAIN = ["january-crane", "march-curtain", "november-rain"] as const;
const B4_RAIN = [...B3, "november-rain"] as const;
const B4 = [...B3, "december-phoenix"] as const;
const B5 = [...B4, "november-rain"] as const;
const JANUARY_SET = [
  "january-crane",
  "january-red-text-scroll",
  "january-pine-plain-a",
  "january-pine-plain-b",
] as const;
const FEBRUARY_SET = [
  "february-bush-warbler",
  "february-red-text-scroll",
  "february-plum-plain-a",
  "february-plum-plain-b",
] as const;
const ANIMALS_5 = [
  "february-bush-warbler",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
] as const;
const SCROLLS_5 = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "april-red-scroll",
  "may-red-scroll",
] as const;
const PLAINS_10 = [
  "january-pine-plain-a",
  "january-pine-plain-b",
  "february-plum-plain-a",
  "february-plum-plain-b",
  "march-cherry-plain-a",
  "march-cherry-plain-b",
  "april-wisteria-plain-a",
  "april-wisteria-plain-b",
  "may-iris-plain-a",
  "may-iris-plain-b",
] as const;
const RED_TEXT = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
] as const;
const BLUE = ["june-blue-scroll", "september-blue-scroll", "october-blue-scroll"] as const;

export const PHASE_1C_YAKU_FIXTURES: readonly Phase1CYakuFixture[] = deepFreezeFixture([
  fixture(
    "YAKU-FIX-BRIGHT-THREE-POS",
    B3,
    [expected("threeBrights", 5)],
    5,
    ["threeBrights"],
    counts(3, 0, 0, 0),
  ),
  fixture("YAKU-FIX-BRIGHT-THREE-NEG-RAIN", B3_WITH_RAIN, [], 0, [], counts(3, 0, 0, 0), {
    absentYakuKeys: ["threeBrights"],
  }),
  fixture(
    "YAKU-FIX-BRIGHT-FOUR-POS",
    B4,
    [expected("fourBrights", 8)],
    8,
    ["fourBrights"],
    counts(4, 0, 0, 0),
  ),
  fixture(
    "YAKU-FIX-BRIGHT-FOUR-NEG-RAIN",
    B4_RAIN,
    [expected("fourBrightsWithRain", 7)],
    7,
    ["fourBrightsWithRain"],
    counts(4, 0, 0, 0),
    { absentYakuKeys: ["fourBrights"] },
  ),
  fixture(
    "YAKU-FIX-BRIGHT-FOUR-RAIN-POS",
    B4_RAIN,
    [expected("fourBrightsWithRain", 7)],
    7,
    ["fourBrightsWithRain"],
    counts(4, 0, 0, 0),
  ),
  fixture(
    "YAKU-FIX-BRIGHT-FOUR-RAIN-NEG",
    B4,
    [expected("fourBrights", 8)],
    8,
    ["fourBrights"],
    counts(4, 0, 0, 0),
    { absentYakuKeys: ["fourBrightsWithRain"] },
  ),
  fixture(
    "YAKU-FIX-BRIGHT-FIVE-POS",
    B5,
    [expected("fiveBrights", 10)],
    10,
    ["fiveBrights"],
    counts(5, 0, 0, 0),
  ),
  fixture(
    "YAKU-FIX-BRIGHT-FIVE-NEG",
    B4,
    [expected("fourBrights", 8)],
    8,
    ["fourBrights"],
    counts(4, 0, 0, 0),
    { absentYakuKeys: ["fiveBrights"] },
  ),
  fixture(
    "YAKU-FIX-BLOSSOM-POS",
    ["march-curtain", "september-sake-cup"],
    [expected("blossomViewing", 5)],
    5,
    ["blossomViewing"],
    counts(1, 1, 0, 0),
  ),
  fixture("YAKU-FIX-BLOSSOM-NEG", ["march-curtain"], [], 0, [], counts(1, 0, 0, 0), {
    absentYakuKeys: ["blossomViewing"],
  }),
  fixture(
    "YAKU-FIX-MOON-POS",
    ["august-moon", "september-sake-cup"],
    [expected("moonViewing", 5)],
    5,
    ["moonViewing"],
    counts(1, 1, 0, 0),
  ),
  fixture("YAKU-FIX-MOON-NEG", ["august-moon"], [], 0, [], counts(1, 0, 0, 0), {
    absentYakuKeys: ["moonViewing"],
  }),
  fixture(
    "YAKU-FIX-ANIMAL-TRIO-POS",
    ["june-butterfly", "july-boar", "october-deer"],
    [expected("animalTrio", 5)],
    5,
    ["animalTrio"],
    counts(0, 3, 0, 0),
  ),
  fixture(
    "YAKU-FIX-ANIMAL-TRIO-NEG",
    ["june-butterfly", "july-boar"],
    [],
    0,
    [],
    counts(0, 2, 0, 0),
    { absentYakuKeys: ["animalTrio"] },
  ),
  fixture(
    "YAKU-FIX-RED-TEXT-POS",
    RED_TEXT,
    [expected("redTextScrolls", 5)],
    5,
    ["redTextScrolls"],
    counts(0, 0, 3, 0),
  ),
  fixture(
    "YAKU-FIX-RED-TEXT-NEG",
    ["january-red-text-scroll", "february-red-text-scroll", "april-red-scroll"],
    [],
    0,
    [],
    counts(0, 0, 3, 0),
    { absentYakuKeys: ["redTextScrolls"] },
  ),
  fixture(
    "YAKU-FIX-BLUE-POS",
    BLUE,
    [expected("blueScrolls", 5)],
    5,
    ["blueScrolls"],
    counts(0, 0, 3, 0),
  ),
  fixture(
    "YAKU-FIX-BLUE-NEG",
    ["june-blue-scroll", "september-blue-scroll"],
    [],
    0,
    [],
    counts(0, 0, 2, 0),
    { absentYakuKeys: ["blueScrolls"] },
  ),
  fixture(
    "YAKU-FIX-CURRENT-MONTH-POS",
    JANUARY_SET,
    [expected("currentMonthSet", 5)],
    5,
    ["currentMonthSet"],
    counts(1, 0, 1, 2),
  ),
  fixture("YAKU-FIX-CURRENT-MONTH-NEG", FEBRUARY_SET, [], 0, [], counts(0, 1, 1, 2), {
    absentYakuKeys: ["currentMonthSet"],
  }),
  fixture(
    "YAKU-BRIGHT-UPGRADE-THREE-TO-FOUR-RAIN",
    B4_RAIN,
    [expected("fourBrightsWithRain", 7)],
    7,
    ["fourBrightsWithRain"],
    counts(4, 0, 0, 0),
    { seenYakuKeys: ["threeBrights"] },
  ),
  fixture(
    "YAKU-BRIGHT-UPGRADE-FOUR-TO-FIVE",
    B5,
    [expected("fiveBrights", 10)],
    10,
    ["fiveBrights"],
    counts(5, 0, 0, 0),
    { seenYakuKeys: ["threeBrights", "fourBrights"] },
  ),
  fixture(
    "YAKU-BRIGHT-INDEPENDENT-STACK-020",
    [...B5, "september-sake-cup"],
    [expected("fiveBrights", 10), expected("blossomViewing", 5), expected("moonViewing", 5)],
    20,
    ["fiveBrights", "blossomViewing", "moonViewing"],
    counts(5, 1, 0, 0),
  ),
  fixture(
    "YAKU-SAKE-ANIMAL-NOT-PLAIN",
    ["march-curtain", "august-moon", "september-sake-cup"],
    [expected("blossomViewing", 5), expected("moonViewing", 5)],
    10,
    ["blossomViewing", "moonViewing"],
    counts(2, 1, 0, 0),
  ),
  fixture(
    "YAKU-INCR-ANIMAL-005",
    ANIMALS_5,
    [expected("animals", 3)],
    3,
    ["animals"],
    counts(0, 5, 0, 0),
  ),
  fixture(
    "YAKU-INCR-ANIMAL-006",
    [...ANIMALS_5, "september-sake-cup"],
    [expected("animals", 4)],
    4,
    [],
    counts(0, 6, 0, 0),
    { seenYakuKeys: ["animals"] },
  ),
  fixture(
    "YAKU-INCR-ANIMAL-007",
    [...ANIMALS_5, "september-sake-cup", "august-geese"],
    [expected("animals", 5)],
    5,
    [],
    counts(0, 7, 0, 0),
    { seenYakuKeys: ["animals"] },
  ),
  fixture(
    "YAKU-INCR-SCROLL-005",
    SCROLLS_5,
    [expected("redTextScrolls", 5), expected("scrolls", 1)],
    6,
    ["scrolls"],
    counts(0, 0, 5, 0),
    { seenYakuKeys: ["redTextScrolls"] },
  ),
  fixture(
    "YAKU-INCR-SCROLL-006",
    [...SCROLLS_5, "june-blue-scroll"],
    [expected("redTextScrolls", 5), expected("scrolls", 2)],
    7,
    [],
    counts(0, 0, 6, 0),
    { seenYakuKeys: ["redTextScrolls", "scrolls"] },
  ),
  fixture(
    "YAKU-INCR-SCROLL-007",
    [...SCROLLS_5, "june-blue-scroll", "july-red-scroll"],
    [expected("redTextScrolls", 5), expected("scrolls", 3)],
    8,
    [],
    counts(0, 0, 7, 0),
    { seenYakuKeys: ["redTextScrolls", "scrolls"] },
  ),
  fixture(
    "YAKU-INCR-PLAIN-010",
    PLAINS_10,
    [expected("plainCards", 1)],
    1,
    ["plainCards"],
    counts(0, 0, 0, 10),
  ),
  fixture(
    "YAKU-INCR-PLAIN-011",
    [...PLAINS_10, "june-peony-plain-a"],
    [expected("plainCards", 2)],
    2,
    [],
    counts(0, 0, 0, 11),
    { seenYakuKeys: ["plainCards"] },
  ),
  fixture(
    "YAKU-INCR-PLAIN-012",
    [...PLAINS_10, "june-peony-plain-a", "june-peony-plain-b"],
    [expected("plainCards", 3)],
    3,
    [],
    counts(0, 0, 0, 12),
    { seenYakuKeys: ["plainCards"] },
  ),
  fixture(
    "YAKU-CURRENT-MONTH-ACCUMULATES",
    JANUARY_SET,
    [expected("currentMonthSet", 5)],
    5,
    ["currentMonthSet"],
    counts(1, 0, 1, 2),
  ),
  fixture(
    "YAKU-CURRENT-MONTH-SWEEP",
    JANUARY_SET,
    [expected("currentMonthSet", 5)],
    5,
    ["currentMonthSet"],
    counts(1, 0, 1, 2),
  ),
  fixture(
    "YAKU-MULTI-NEW-ONE-DECISION",
    ["march-curtain", "august-moon", "september-sake-cup", "september-blue-scroll"],
    [expected("blossomViewing", 5), expected("moonViewing", 5)],
    10,
    ["blossomViewing", "moonViewing"],
    counts(2, 1, 1, 0),
  ),
  fixture(
    "YAKU-INCREMENT-NO-RETRIGGER",
    [...ANIMALS_5, "september-sake-cup"],
    [expected("animals", 4)],
    4,
    [],
    counts(0, 6, 0, 0),
    { seenYakuKeys: ["animals"] },
  ),
  fixture(
    "YAKU-SCROLL-SEVEN-013",
    [...RED_TEXT, ...BLUE, "april-red-scroll"],
    [expected("redTextScrolls", 5), expected("blueScrolls", 5), expected("scrolls", 3)],
    13,
    ["redTextScrolls", "blueScrolls", "scrolls"],
    counts(0, 0, 7, 0),
  ),
  fixture(
    "YAKU-SCROLL-NO-RED-BLUE-BONUS",
    [...RED_TEXT, ...BLUE],
    [expected("redTextScrolls", 5), expected("blueScrolls", 5), expected("scrolls", 2)],
    12,
    ["redTextScrolls", "blueScrolls", "scrolls"],
    counts(0, 0, 6, 0),
  ),
]);
