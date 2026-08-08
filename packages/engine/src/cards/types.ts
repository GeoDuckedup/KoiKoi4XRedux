export const CARD_CATEGORIES = ["bright", "animal", "scroll", "plain"] as const;

export type CardCategory = (typeof CARD_CATEGORIES)[number];

export const SCROLL_KINDS = ["redText", "red", "blue"] as const;

export type ScrollKind = (typeof SCROLL_KINDS)[number];

export const CARD_FLAGS = ["rainBright", "sakeCup"] as const;

export type CardFlag = (typeof CARD_FLAGS)[number];

export const FIXED_YAKU_MEMBERSHIPS = [
  "blossomViewing",
  "moonViewing",
  "animalTrio",
  "redTextScrolls",
  "blueScrolls",
] as const;

export type FixedYakuMembership = (typeof FIXED_YAKU_MEMBERSHIPS)[number];

interface CardDefinitionBase {
  readonly id: string;
  readonly displayName: string;
  readonly month: number;
  readonly flags: readonly CardFlag[];
  readonly fixedYakuMemberships: readonly FixedYakuMembership[];
}

export interface ScrollCardDefinitionInput extends CardDefinitionBase {
  readonly category: "scroll";
  readonly scrollKind: ScrollKind;
}

export interface NonScrollCardDefinitionInput extends CardDefinitionBase {
  readonly category: Exclude<CardCategory, "scroll">;
  readonly scrollKind?: never;
}

export type CardDefinitionInput = ScrollCardDefinitionInput | NonScrollCardDefinitionInput;
