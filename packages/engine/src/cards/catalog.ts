import { MONTHS, type MonthNumber } from "./months";
import type { CardDefinitionInput } from "./types";

function defineCard<const T extends CardDefinitionInput & { readonly month: MonthNumber }>(
  definition: T,
): Readonly<T> {
  return Object.freeze({
    ...definition,
    flags: Object.freeze([...definition.flags]),
    fixedYakuMemberships: Object.freeze([...definition.fixedYakuMemberships]),
  }) as unknown as Readonly<T>;
}

const noFlags = [] as const;
const noFixedYaku = [] as const;

export const CARD_CATALOG = Object.freeze([
  defineCard({
    id: "january-crane",
    displayName: "Crane",
    month: 1,
    category: "bright",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "january-red-text-scroll",
    displayName: "Red Text Scroll",
    month: 1,
    category: "scroll",
    scrollKind: "redText",
    flags: noFlags,
    fixedYakuMemberships: ["redTextScrolls"],
  }),
  defineCard({
    id: "january-pine-plain-a",
    displayName: "Pine Plain A",
    month: 1,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "january-pine-plain-b",
    displayName: "Pine Plain B",
    month: 1,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "february-bush-warbler",
    displayName: "Bush Warbler",
    month: 2,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "february-red-text-scroll",
    displayName: "Red Text Scroll",
    month: 2,
    category: "scroll",
    scrollKind: "redText",
    flags: noFlags,
    fixedYakuMemberships: ["redTextScrolls"],
  }),
  defineCard({
    id: "february-plum-plain-a",
    displayName: "Plum Plain A",
    month: 2,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "february-plum-plain-b",
    displayName: "Plum Plain B",
    month: 2,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "march-curtain",
    displayName: "Cherry Curtain",
    month: 3,
    category: "bright",
    flags: noFlags,
    fixedYakuMemberships: ["blossomViewing"],
  }),
  defineCard({
    id: "march-red-text-scroll",
    displayName: "Red Text Scroll",
    month: 3,
    category: "scroll",
    scrollKind: "redText",
    flags: noFlags,
    fixedYakuMemberships: ["redTextScrolls"],
  }),
  defineCard({
    id: "march-cherry-plain-a",
    displayName: "Cherry Plain A",
    month: 3,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "march-cherry-plain-b",
    displayName: "Cherry Plain B",
    month: 3,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "april-cuckoo",
    displayName: "Cuckoo",
    month: 4,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "april-red-scroll",
    displayName: "Red Scroll",
    month: 4,
    category: "scroll",
    scrollKind: "red",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "april-wisteria-plain-a",
    displayName: "Wisteria Plain A",
    month: 4,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "april-wisteria-plain-b",
    displayName: "Wisteria Plain B",
    month: 4,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "may-bridge",
    displayName: "Iris Bridge",
    month: 5,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "may-red-scroll",
    displayName: "Red Scroll",
    month: 5,
    category: "scroll",
    scrollKind: "red",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "may-iris-plain-a",
    displayName: "Iris Plain A",
    month: 5,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "may-iris-plain-b",
    displayName: "Iris Plain B",
    month: 5,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "june-butterfly",
    displayName: "Butterfly",
    month: 6,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: ["animalTrio"],
  }),
  defineCard({
    id: "june-blue-scroll",
    displayName: "Blue Scroll",
    month: 6,
    category: "scroll",
    scrollKind: "blue",
    flags: noFlags,
    fixedYakuMemberships: ["blueScrolls"],
  }),
  defineCard({
    id: "june-peony-plain-a",
    displayName: "Peony Plain A",
    month: 6,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "june-peony-plain-b",
    displayName: "Peony Plain B",
    month: 6,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "july-boar",
    displayName: "Boar",
    month: 7,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: ["animalTrio"],
  }),
  defineCard({
    id: "july-red-scroll",
    displayName: "Red Scroll",
    month: 7,
    category: "scroll",
    scrollKind: "red",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "july-bush-clover-plain-a",
    displayName: "Bush Clover Plain A",
    month: 7,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "july-bush-clover-plain-b",
    displayName: "Bush Clover Plain B",
    month: 7,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "august-moon",
    displayName: "Moon",
    month: 8,
    category: "bright",
    flags: noFlags,
    fixedYakuMemberships: ["moonViewing"],
  }),
  defineCard({
    id: "august-geese",
    displayName: "Geese",
    month: 8,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "august-pampas-plain-a",
    displayName: "Pampas Plain A",
    month: 8,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "august-pampas-plain-b",
    displayName: "Pampas Plain B",
    month: 8,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "september-sake-cup",
    displayName: "Sake Cup",
    month: 9,
    category: "animal",
    flags: ["sakeCup"],
    fixedYakuMemberships: ["blossomViewing", "moonViewing"],
  }),
  defineCard({
    id: "september-blue-scroll",
    displayName: "Blue Scroll",
    month: 9,
    category: "scroll",
    scrollKind: "blue",
    flags: noFlags,
    fixedYakuMemberships: ["blueScrolls"],
  }),
  defineCard({
    id: "september-chrysanthemum-plain-a",
    displayName: "Chrysanthemum Plain A",
    month: 9,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "september-chrysanthemum-plain-b",
    displayName: "Chrysanthemum Plain B",
    month: 9,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "october-deer",
    displayName: "Deer",
    month: 10,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: ["animalTrio"],
  }),
  defineCard({
    id: "october-blue-scroll",
    displayName: "Blue Scroll",
    month: 10,
    category: "scroll",
    scrollKind: "blue",
    flags: noFlags,
    fixedYakuMemberships: ["blueScrolls"],
  }),
  defineCard({
    id: "october-maple-plain-a",
    displayName: "Maple Plain A",
    month: 10,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "october-maple-plain-b",
    displayName: "Maple Plain B",
    month: 10,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "november-rain",
    displayName: "Rain Bright",
    month: 11,
    category: "bright",
    flags: ["rainBright"],
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "november-swallow",
    displayName: "Swallow",
    month: 11,
    category: "animal",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "november-red-scroll",
    displayName: "Red Scroll",
    month: 11,
    category: "scroll",
    scrollKind: "red",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "november-willow-plain",
    displayName: "Willow Plain",
    month: 11,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),

  defineCard({
    id: "december-phoenix",
    displayName: "Phoenix",
    month: 12,
    category: "bright",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "december-paulownia-plain-a",
    displayName: "Paulownia Plain A",
    month: 12,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "december-paulownia-plain-b",
    displayName: "Paulownia Plain B",
    month: 12,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
  defineCard({
    id: "december-paulownia-plain-c",
    displayName: "Paulownia Plain C",
    month: 12,
    category: "plain",
    flags: noFlags,
    fixedYakuMemberships: noFixedYaku,
  }),
] as const);

export type CardDefinition = (typeof CARD_CATALOG)[number];
export type CardId = CardDefinition["id"];

export const CARD_IDS = Object.freeze(CARD_CATALOG.map((card) => card.id)) as readonly CardId[];

export const CARD_BY_ID = Object.freeze(
  Object.fromEntries(CARD_CATALOG.map((card) => [card.id, card])),
) as Readonly<Record<CardId, CardDefinition>>;

export const CARDS_BY_MONTH = Object.freeze(
  Object.fromEntries(
    MONTHS.map((month) => [
      month.number,
      Object.freeze(CARD_CATALOG.filter((card) => card.month === month.number)),
    ]),
  ),
) as Readonly<Record<MonthNumber, readonly CardDefinition[]>>;

export function isCardId(value: string): value is CardId {
  return Object.hasOwn(CARD_BY_ID, value);
}

export function getCardDefinition(id: CardId): CardDefinition {
  return CARD_BY_ID[id];
}
