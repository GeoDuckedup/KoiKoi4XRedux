import type { CardId } from "@koikoi4x/engine";

/**
 * Independent literal bindings for the Phase 0A vector specification.
 * Phase 1 will use these sets in runnable given/when/then fixtures.
 */
export const ALL_BRIGHT_IDS = [
  "january-crane",
  "march-curtain",
  "august-moon",
  "november-rain",
  "december-phoenix",
] as const satisfies readonly CardId[];

export const NON_RAIN_BRIGHT_IDS = [
  "january-crane",
  "march-curtain",
  "august-moon",
  "december-phoenix",
] as const satisfies readonly CardId[];

export const RAIN_BRIGHT_ID = "november-rain" as const satisfies CardId;
export const SAKE_CUP_ID = "september-sake-cup" as const satisfies CardId;

export const BLOSSOM_VIEWING_IDS = [
  "march-curtain",
  "september-sake-cup",
] as const satisfies readonly CardId[];

export const MOON_VIEWING_IDS = [
  "august-moon",
  "september-sake-cup",
] as const satisfies readonly CardId[];

export const ANIMAL_TRIO_IDS = [
  "june-butterfly",
  "july-boar",
  "october-deer",
] as const satisfies readonly CardId[];

export const RED_TEXT_SCROLL_IDS = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
] as const satisfies readonly CardId[];

export const BLUE_SCROLL_IDS = [
  "june-blue-scroll",
  "september-blue-scroll",
  "october-blue-scroll",
] as const satisfies readonly CardId[];

export const REGULAR_RED_SCROLL_IDS = [
  "april-red-scroll",
  "may-red-scroll",
  "july-red-scroll",
  "november-red-scroll",
] as const satisfies readonly CardId[];

export const ANIMAL_THRESHOLD_SEQUENCE_IDS = [
  "february-bush-warbler",
  "april-cuckoo",
  "may-bridge",
  "june-butterfly",
  "july-boar",
  "september-sake-cup",
  "october-deer",
] as const satisfies readonly CardId[];

export const SCROLL_THRESHOLD_SEQUENCE_IDS = [
  "january-red-text-scroll",
  "february-red-text-scroll",
  "march-red-text-scroll",
  "april-red-scroll",
  "may-red-scroll",
  "june-blue-scroll",
  "july-red-scroll",
] as const satisfies readonly CardId[];

export const PLAIN_THRESHOLD_SEQUENCE_IDS = [
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
  "june-peony-plain-a",
  "june-peony-plain-b",
] as const satisfies readonly CardId[];

export const SCROLL_SEVEN_013_IDS = [
  ...RED_TEXT_SCROLL_IDS,
  ...BLUE_SCROLL_IDS,
  "april-red-scroll",
] as const satisfies readonly CardId[];

export const SCHEDULED_MONTH_SET_IDS = [
  "january-crane",
  "january-red-text-scroll",
  "january-pine-plain-a",
  "january-pine-plain-b",
] as const satisfies readonly CardId[];

export const NONSCHEDULED_MONTH_SET_IDS = [
  "february-bush-warbler",
  "february-red-text-scroll",
  "february-plum-plain-a",
  "february-plum-plain-b",
] as const satisfies readonly CardId[];

export const PHASE_0A_CARD_BINDINGS = Object.freeze({
  allBrights: ALL_BRIGHT_IDS,
  nonRainBrights: NON_RAIN_BRIGHT_IDS,
  rainBright: RAIN_BRIGHT_ID,
  sakeCup: SAKE_CUP_ID,
  blossomViewing: BLOSSOM_VIEWING_IDS,
  moonViewing: MOON_VIEWING_IDS,
  animalTrio: ANIMAL_TRIO_IDS,
  redTextScrolls: RED_TEXT_SCROLL_IDS,
  blueScrolls: BLUE_SCROLL_IDS,
  regularRedScrolls: REGULAR_RED_SCROLL_IDS,
  animalThresholdSequence: ANIMAL_THRESHOLD_SEQUENCE_IDS,
  scrollThresholdSequence: SCROLL_THRESHOLD_SEQUENCE_IDS,
  plainThresholdSequence: PLAIN_THRESHOLD_SEQUENCE_IDS,
  scrollSeven013: SCROLL_SEVEN_013_IDS,
  scheduledMonthSet: SCHEDULED_MONTH_SET_IDS,
  nonscheduledMonthSet: NONSCHEDULED_MONTH_SET_IDS,
});
