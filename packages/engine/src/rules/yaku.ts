import { CARD_IDS, getCardDefinition, isCardId, type CardId } from "../cards/catalog";
import { MONTHS, type MonthNumber } from "../cards/months";
import { deepFreeze } from "../state/freeze";
import {
  YAKU_TRIGGER_KEYS,
  type ActiveYakuV1,
  type YakuDisplayName,
  type YakuTriggerKey,
} from "../state/types";

export interface YakuCategoryCountsV1 {
  readonly bright: number;
  readonly animal: number;
  readonly scroll: number;
  readonly plain: number;
}

export interface YakuEvaluationV1 {
  readonly activeYaku: readonly ActiveYakuV1[];
  readonly currentYakuTotal: number;
  readonly newYaku: readonly ActiveYakuV1[];
  readonly categoryCounts: YakuCategoryCountsV1;
}

const YAKU_NAMES: Readonly<Record<YakuTriggerKey, YakuDisplayName>> = Object.freeze({
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

const BRIGHT_YAKU_KEYS = Object.freeze([
  "fiveBrights",
  "fourBrights",
  "fourBrightsWithRain",
  "threeBrights",
] as const satisfies readonly YakuTriggerKey[]);

const FIXED_YAKU_CARD_IDS: Readonly<Partial<Record<YakuTriggerKey, readonly CardId[]>>> =
  Object.freeze({
    blossomViewing: ["march-curtain", "september-sake-cup"],
    moonViewing: ["august-moon", "september-sake-cup"],
    animalTrio: ["june-butterfly", "july-boar", "october-deer"],
    redTextScrolls: [
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ],
    blueScrolls: ["june-blue-scroll", "september-blue-scroll", "october-blue-scroll"],
  });

export function isYakuTriggerKey(value: string): value is YakuTriggerKey {
  return (YAKU_TRIGGER_KEYS as readonly string[]).includes(value);
}

export function isCanonicalActiveYaku(entry: ActiveYakuV1): boolean {
  if (!isYakuTriggerKey(entry.key) || entry.name !== YAKU_NAMES[entry.key]) return false;
  if (!Number.isSafeInteger(entry.points)) return false;
  if (entry.key === "fiveBrights") return entry.points === 10;
  if (entry.key === "fourBrights") return entry.points === 8;
  if (entry.key === "fourBrightsWithRain") return entry.points === 7;
  if (
    entry.key === "threeBrights" ||
    entry.key === "blossomViewing" ||
    entry.key === "moonViewing" ||
    entry.key === "animalTrio" ||
    entry.key === "redTextScrolls" ||
    entry.key === "blueScrolls" ||
    entry.key === "currentMonthSet"
  ) {
    return entry.points === 5;
  }
  return entry.key === "animals" ? entry.points >= 3 : entry.points >= 1;
}

function yaku(key: YakuTriggerKey, points: number): ActiveYakuV1 {
  return Object.freeze({ key, name: YAKU_NAMES[key], points });
}

function hasEvery(captured: ReadonlySet<CardId>, required: readonly CardId[]): boolean {
  return required.every((cardId) => captured.has(cardId));
}

/**
 * Returns the exact cards that substantiate a currently active yaku. The
 * result is always in CARD_IDS order, never capture order, so it is stable
 * across replay and presentation.
 */
export function deriveYakuContributingCardIds(
  key: YakuTriggerKey,
  capturedCardIds: readonly CardId[],
  scheduledMonth: MonthNumber,
): readonly CardId[] {
  validateInputs(capturedCardIds, scheduledMonth, []);
  const captured = new Set(capturedCardIds);
  const fixed = FIXED_YAKU_CARD_IDS[key];
  if (fixed !== undefined) return deepFreeze(CARD_IDS.filter((cardId) => fixed.includes(cardId)));
  if (key === "currentMonthSet") {
    return deepFreeze(
      CARD_IDS.filter(
        (cardId) => captured.has(cardId) && getCardDefinition(cardId).month === scheduledMonth,
      ),
    );
  }
  if ((BRIGHT_YAKU_KEYS as readonly YakuTriggerKey[]).includes(key)) {
    return deepFreeze(
      CARD_IDS.filter(
        (cardId) => captured.has(cardId) && getCardDefinition(cardId).category === "bright",
      ),
    );
  }
  const category = key === "animals" ? "animal" : key === "scrolls" ? "scroll" : "plain";
  return deepFreeze(
    CARD_IDS.filter(
      (cardId) => captured.has(cardId) && getCardDefinition(cardId).category === category,
    ),
  );
}

function validateInputs(
  capturedCardIds: readonly CardId[],
  scheduledMonth: MonthNumber,
  seenYakuKeys: readonly YakuTriggerKey[],
): void {
  if (!(MONTHS.map((month) => month.number) as readonly number[]).includes(scheduledMonth)) {
    throw new Error("YAKU_MONTH_INVALID: scheduled month must be 1 through 12.");
  }
  if (!capturedCardIds.every((cardId) => isCardId(cardId))) {
    throw new Error("YAKU_CAPTURE_INVALID: captures must contain canonical CardIds.");
  }
  if (new Set(capturedCardIds).size !== capturedCardIds.length) {
    throw new Error("YAKU_CAPTURE_INVALID: captures cannot contain duplicates.");
  }
  if (
    !seenYakuKeys.every((key) => isYakuTriggerKey(key)) ||
    new Set(seenYakuKeys).size !== seenYakuKeys.length
  ) {
    throw new Error("YAKU_SEEN_KEYS_INVALID: seen trigger keys must be canonical and unique.");
  }
}

export function evaluateYaku(
  capturedCardIds: readonly CardId[],
  scheduledMonth: MonthNumber,
  seenYakuKeys: readonly YakuTriggerKey[] = [],
): YakuEvaluationV1 {
  validateInputs(capturedCardIds, scheduledMonth, seenYakuKeys);
  const captured = new Set(capturedCardIds);
  const definitions = capturedCardIds.map(getCardDefinition);
  const categoryCounts: YakuCategoryCountsV1 = Object.freeze({
    bright: definitions.filter((card) => card.category === "bright").length,
    animal: definitions.filter((card) => card.category === "animal").length,
    scroll: definitions.filter((card) => card.category === "scroll").length,
    plain: definitions.filter((card) => card.category === "plain").length,
  });
  const activeYaku: ActiveYakuV1[] = [];
  const hasRain = captured.has("november-rain");

  if (categoryCounts.bright === 5) activeYaku.push(yaku("fiveBrights", 10));
  else if (categoryCounts.bright === 4 && hasRain) activeYaku.push(yaku("fourBrightsWithRain", 7));
  else if (categoryCounts.bright === 4) activeYaku.push(yaku("fourBrights", 8));
  else if (categoryCounts.bright === 3 && !hasRain) activeYaku.push(yaku("threeBrights", 5));

  if (hasEvery(captured, ["march-curtain", "september-sake-cup"]))
    activeYaku.push(yaku("blossomViewing", 5));
  if (hasEvery(captured, ["august-moon", "september-sake-cup"]))
    activeYaku.push(yaku("moonViewing", 5));
  if (hasEvery(captured, ["june-butterfly", "july-boar", "october-deer"]))
    activeYaku.push(yaku("animalTrio", 5));
  if (
    hasEvery(captured, [
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ])
  )
    activeYaku.push(yaku("redTextScrolls", 5));
  if (hasEvery(captured, ["june-blue-scroll", "september-blue-scroll", "october-blue-scroll"]))
    activeYaku.push(yaku("blueScrolls", 5));
  if (definitions.filter((card) => card.month === scheduledMonth).length === 4)
    activeYaku.push(yaku("currentMonthSet", 5));

  if (categoryCounts.animal >= 5) activeYaku.push(yaku("animals", 3 + categoryCounts.animal - 5));
  if (categoryCounts.scroll >= 5) activeYaku.push(yaku("scrolls", 1 + categoryCounts.scroll - 5));
  if (categoryCounts.plain >= 10)
    activeYaku.push(yaku("plainCards", 1 + categoryCounts.plain - 10));

  const frozenActive = deepFreeze(activeYaku);
  const seen = new Set(seenYakuKeys);
  const newYaku = deepFreeze(frozenActive.filter((entry) => !seen.has(entry.key)));
  return deepFreeze({
    activeYaku: frozenActive,
    currentYakuTotal: frozenActive.reduce((sum, entry) => sum + entry.points, 0),
    newYaku,
    categoryCounts,
  });
}

/**
 * Verifies that a persisted contributor snapshot alone proves the recorded
 * trigger. No seen-history is supplied, so points remain formation-time facts.
 */
export function isCanonicalYakuContributionSnapshot(
  yaku: ActiveYakuV1,
  contributingCardIds: readonly CardId[],
  scheduledMonth: MonthNumber,
): boolean {
  if (!isCanonicalActiveYaku(yaku)) return false;
  try {
    const evaluation = evaluateYaku(contributingCardIds, scheduledMonth);
    return (
      evaluation.newYaku.some((entry) => JSON.stringify(entry) === JSON.stringify(yaku)) &&
      JSON.stringify(
        deriveYakuContributingCardIds(yaku.key, contributingCardIds, scheduledMonth),
      ) === JSON.stringify(contributingCardIds)
    );
  } catch {
    return false;
  }
}

export function hasValidYakuSeenHistory(
  capturedCardIds: readonly CardId[],
  scheduledMonth: MonthNumber,
  seenYakuKeys: readonly YakuTriggerKey[],
): boolean {
  validateInputs(capturedCardIds, scheduledMonth, seenYakuKeys);
  const evaluation = evaluateYaku(capturedCardIds, scheduledMonth, seenYakuKeys);
  const activeKeys = new Set(evaluation.activeYaku.map((entry) => entry.key));
  const brightSeen = new Set(
    seenYakuKeys.filter((key) => (BRIGHT_YAKU_KEYS as readonly YakuTriggerKey[]).includes(key)),
  );
  const nonBrightSeenValid = seenYakuKeys.every(
    (key) => (BRIGHT_YAKU_KEYS as readonly YakuTriggerKey[]).includes(key) || activeKeys.has(key),
  );
  if (!nonBrightSeenValid) return false;

  const capturedBrightIds = capturedCardIds.filter(
    (cardId) => getCardDefinition(cardId).category === "bright",
  );
  const brightCount = capturedBrightIds.length;
  const hasRain = capturedBrightIds.includes("november-rain");
  const allowedBrightHistory = new Set<YakuTriggerKey>();
  if (brightCount === 3 && !hasRain) allowedBrightHistory.add("threeBrights");
  if (brightCount === 4 && !hasRain) {
    allowedBrightHistory.add("threeBrights");
    allowedBrightHistory.add("fourBrights");
  }
  if (brightCount === 4 && hasRain) {
    allowedBrightHistory.add("threeBrights");
    allowedBrightHistory.add("fourBrightsWithRain");
  }
  if (brightCount === 5) {
    for (const key of BRIGHT_YAKU_KEYS) allowedBrightHistory.add(key);
  }
  if ([...brightSeen].some((key) => !allowedBrightHistory.has(key))) return false;
  if (brightSeen.has("fourBrights") && !brightSeen.has("threeBrights")) return false;
  if (brightSeen.has("fourBrights") && brightSeen.has("fourBrightsWithRain")) return false;
  if (
    brightSeen.has("fiveBrights") &&
    brightSeen.has("fourBrights") === brightSeen.has("fourBrightsWithRain")
  )
    return false;
  return true;
}
