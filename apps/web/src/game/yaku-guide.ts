import {
  CARD_CATALOG,
  deepFreeze,
  getCardDefinition,
  getMonthDefinition,
  type CardId,
  type MonthNumber,
  type YakuTriggerKey,
} from "@koikoi4x/engine";

export type YakuGuideGroupIdV1 = "bright" | "named" | "seasonal" | "category";

export interface YakuGuideEntryV1 {
  readonly exampleCardIds: readonly CardId[];
  readonly group: YakuGuideGroupIdV1;
  readonly key: YakuTriggerKey;
  readonly note: string;
  readonly points: number;
  readonly requirement: string;
  readonly scheduledMonth: MonthNumber;
  readonly title: string;
}

export interface CardYakuGuideEntryV1 extends YakuGuideEntryV1 {
  readonly contributionCondition?: string;
}

export interface YakuGuideGroupV1 {
  readonly id: YakuGuideGroupIdV1;
  readonly title: string;
}

export const YAKU_GUIDE_GROUPS: readonly YakuGuideGroupV1[] = deepFreeze([
  { id: "bright", title: "Brights" },
  { id: "named", title: "Named sets" },
  { id: "seasonal", title: "Seasonal set" },
  { id: "category", title: "Category totals" },
]);

/**
 * A static public rules reference. It deliberately accepts no observation and
 * never evaluates the live match; the examples only illustrate the canonical
 * threshold for each key.
 */
export const YAKU_GUIDE_ENTRIES: readonly YakuGuideEntryV1[] = deepFreeze([
  {
    key: "fiveBrights",
    title: "Five Brights",
    group: "bright",
    requirement: "Capture all five Bright cards.",
    points: 10,
    note: "The highest Bright tier replaces lower Bright tiers.",
    scheduledMonth: 1,
    exampleCardIds: [
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
      "december-phoenix",
    ],
  },
  {
    key: "fourBrights",
    title: "Four Brights",
    group: "bright",
    requirement: "Capture four Bright cards without the November Rain card.",
    points: 8,
    note: "The highest Bright tier replaces lower Bright tiers.",
    scheduledMonth: 1,
    exampleCardIds: ["january-crane", "march-curtain", "august-moon", "december-phoenix"],
  },
  {
    key: "fourBrightsWithRain",
    title: "Four Brights with Rain",
    group: "bright",
    requirement: "Capture four Bright cards including the November Rain card.",
    points: 7,
    note: "The highest Bright tier replaces lower Bright tiers.",
    scheduledMonth: 1,
    exampleCardIds: ["january-crane", "march-curtain", "august-moon", "november-rain"],
  },
  {
    key: "threeBrights",
    title: "Three Brights",
    group: "bright",
    requirement: "Capture three Bright cards without the November Rain card.",
    points: 5,
    note: "Three Brights with Rain does not qualify.",
    scheduledMonth: 1,
    exampleCardIds: ["january-crane", "march-curtain", "august-moon"],
  },
  {
    key: "blossomViewing",
    title: "Blossom Viewing",
    group: "named",
    requirement: "Capture the March Cherry Curtain and September Sake Cup.",
    points: 5,
    note: "Stacks with other qualifying yaku.",
    scheduledMonth: 1,
    exampleCardIds: ["march-curtain", "september-sake-cup"],
  },
  {
    key: "moonViewing",
    title: "Moon Viewing",
    group: "named",
    requirement: "Capture the August Moon and September Sake Cup.",
    points: 5,
    note: "Stacks with other qualifying yaku.",
    scheduledMonth: 1,
    exampleCardIds: ["august-moon", "september-sake-cup"],
  },
  {
    key: "animalTrio",
    title: "Animal Trio",
    group: "named",
    requirement: "Capture the Butterfly, Boar, and Deer.",
    points: 5,
    note: "Stacks with the Animals category total.",
    scheduledMonth: 1,
    exampleCardIds: ["june-butterfly", "july-boar", "october-deer"],
  },
  {
    key: "redTextScrolls",
    title: "Red Text Scrolls",
    group: "named",
    requirement: "Capture the January, February, and March red text Scrolls.",
    points: 5,
    note: "Stacks with the Scrolls category total.",
    scheduledMonth: 1,
    exampleCardIds: [
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ],
  },
  {
    key: "blueScrolls",
    title: "Blue Scrolls",
    group: "named",
    requirement: "Capture the June, September, and October blue Scrolls.",
    points: 5,
    note: "Stacks with the Scrolls category total.",
    scheduledMonth: 1,
    exampleCardIds: ["june-blue-scroll", "september-blue-scroll", "october-blue-scroll"],
  },
  {
    key: "currentMonthSet",
    title: "Current-Month Set",
    group: "seasonal",
    requirement: "Capture all four cards from the scheduled month.",
    points: 5,
    note: "Cards may be captured across several turns; it stacks with every other yaku.",
    scheduledMonth: 1,
    exampleCardIds: [
      "january-crane",
      "january-red-text-scroll",
      "january-pine-plain-a",
      "january-pine-plain-b",
    ],
  },
  {
    key: "animals",
    title: "Animals",
    group: "category",
    requirement: "Capture five Animal cards.",
    points: 3,
    note: "Gain +1 point for each Animal above five; upgrades do not create another decision.",
    scheduledMonth: 1,
    exampleCardIds: [
      "february-bush-warbler",
      "april-cuckoo",
      "may-bridge",
      "june-butterfly",
      "july-boar",
    ],
  },
  {
    key: "scrolls",
    title: "Scrolls",
    group: "category",
    requirement: "Capture five Scroll cards.",
    points: 1,
    note: "Gain +1 point for each Scroll above five; upgrades do not create another decision.",
    scheduledMonth: 1,
    exampleCardIds: [
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
      "april-red-scroll",
      "may-red-scroll",
    ],
  },
  {
    key: "plainCards",
    title: "Plain Cards",
    group: "category",
    requirement: "Capture ten Plain cards.",
    points: 1,
    note: "Gain +1 point for each Plain above ten; upgrades do not create another decision.",
    scheduledMonth: 1,
    exampleCardIds: [
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
    ],
  },
]);

export const YAKU_GUIDE_NOTES = deepFreeze([
  "Independent yaku stack, even when a card supports more than one of them.",
  "A Yaku decision appears only when a new qualifying yaku is first completed this round. Bank takes the current total; Koi-Koi continues play and raises the table multiplier.",
  "A starting-hand lucky result is an opening rule, not a yaku: four cards of one month or four distinct month pairs scores 6 and ends the round before normal play.",
  "The table begins at 1×. Koi-Koi raises it by one step, up to 4×; a special first-yaku privilege can affect the next round's first eligible decision.",
]);

const FIXED_YAKU_KEYS = new Set<YakuTriggerKey>([
  "blossomViewing",
  "moonViewing",
  "animalTrio",
  "redTextScrolls",
  "blueScrolls",
]);

const BRIGHT_YAKU_KEYS = new Set<YakuTriggerKey>([
  "fiveBrights",
  "fourBrights",
  "fourBrightsWithRain",
  "threeBrights",
]);

function isRainBright(card: { readonly flags: readonly string[] }): boolean {
  return card.flags.includes("rainBright");
}

function isPossibleYakuForCard(cardId: CardId, key: YakuTriggerKey): boolean {
  const card = getCardDefinition(cardId);
  if (key === "currentMonthSet") return true;
  if (key === "animals") return card.category === "animal";
  if (key === "scrolls") return card.category === "scroll";
  if (key === "plainCards") return card.category === "plain";
  if (FIXED_YAKU_KEYS.has(key))
    return card.fixedYakuMemberships.some((membership) => membership === key);
  if (!BRIGHT_YAKU_KEYS.has(key) || card.category !== "bright") return false;
  if (key === "fiveBrights" || key === "fourBrightsWithRain") return true;
  return !isRainBright(card);
}

function qualifyingExampleCardIds(cardId: CardId, entry: YakuGuideEntryV1): readonly CardId[] {
  const card = getCardDefinition(cardId);
  const cardsInCatalogOrder = (predicate: (candidate: (typeof CARD_CATALOG)[number]) => boolean) =>
    CARD_CATALOG.filter(predicate).map(({ id }) => id);
  const withInspectedFirst = (candidates: readonly CardId[], count: number) =>
    [cardId, ...candidates.filter((candidate) => candidate !== cardId)].slice(0, count);

  if (entry.key === "currentMonthSet") {
    return cardsInCatalogOrder((candidate) => candidate.month === card.month);
  }
  if (entry.key === "animals") {
    return withInspectedFirst(
      cardsInCatalogOrder((candidate) => candidate.category === "animal"),
      5,
    );
  }
  if (entry.key === "scrolls") {
    return withInspectedFirst(
      cardsInCatalogOrder((candidate) => candidate.category === "scroll"),
      5,
    );
  }
  if (entry.key === "plainCards") {
    return withInspectedFirst(
      cardsInCatalogOrder((candidate) => candidate.category === "plain"),
      10,
    );
  }
  if (entry.key === "fiveBrights") {
    return cardsInCatalogOrder((candidate) => candidate.category === "bright");
  }
  if (entry.key === "fourBrights") {
    return cardsInCatalogOrder(
      (candidate) => candidate.category === "bright" && !isRainBright(candidate),
    );
  }
  if (entry.key === "fourBrightsWithRain") {
    const rain = cardsInCatalogOrder(isRainBright);
    const nonRainBrights = cardsInCatalogOrder(
      (candidate) => candidate.category === "bright" && !isRainBright(candidate),
    );
    return isRainBright(card)
      ? [...rain, ...nonRainBrights.slice(0, 3)]
      : [...rain, cardId, ...nonRainBrights.filter((candidate) => candidate !== cardId)].slice(
          0,
          4,
        );
  }
  if (entry.key === "threeBrights") {
    return withInspectedFirst(
      cardsInCatalogOrder(
        (candidate) => candidate.category === "bright" && !isRainBright(candidate),
      ),
      3,
    );
  }
  return entry.exampleCardIds;
}

/**
 * Static catalog/rules reference for a single card. It deliberately accepts no
 * observation, captures, score, or current round data, so it cannot claim a
 * yaku is presently achievable or achieved.
 */
export function getYakuGuideEntriesForCard(cardId: CardId): readonly CardYakuGuideEntryV1[] {
  const card = getCardDefinition(cardId);
  const month = getMonthDefinition(card.month);
  return deepFreeze(
    YAKU_GUIDE_ENTRIES.filter((entry) => isPossibleYakuForCard(cardId, entry.key)).map((entry) =>
      Object.freeze({
        ...entry,
        exampleCardIds: Object.freeze(qualifyingExampleCardIds(cardId, entry)),
        scheduledMonth: entry.key === "currentMonthSet" ? card.month : entry.scheduledMonth,
        ...(entry.key === "currentMonthSet"
          ? { contributionCondition: `Contributes when ${month.name} is the scheduled month.` }
          : {}),
      }),
    ),
  );
}
