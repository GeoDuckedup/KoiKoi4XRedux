import { CARD_CATALOG } from "./catalog";
import { MONTHS } from "./months";
import {
  CARD_CATEGORIES,
  CARD_FLAGS,
  FIXED_YAKU_MEMBERSHIPS,
  SCROLL_KINDS,
  type CardCategory,
  type CardFlag,
  type FixedYakuMembership,
  type ScrollKind,
} from "./types";

export interface CardCatalogValidationIssue {
  readonly code: string;
  readonly message: string;
}

const allowedKeys = new Set([
  "id",
  "displayName",
  "month",
  "category",
  "scrollKind",
  "flags",
  "fixedYakuMemberships",
]);

const expectedCategoryCounts: Readonly<Record<CardCategory, number>> = {
  bright: 5,
  animal: 9,
  scroll: 10,
  plain: 24,
};

const expectedScrollKindCounts: Readonly<Record<ScrollKind, number>> = {
  redText: 3,
  red: 4,
  blue: 3,
};

const expectedFlagIds: Readonly<Record<CardFlag, readonly string[]>> = {
  rainBright: ["november-rain"],
  sakeCup: ["september-sake-cup"],
};

const expectedMembershipIds: Readonly<Record<FixedYakuMembership, readonly string[]>> = {
  blossomViewing: ["march-curtain", "september-sake-cup"],
  moonViewing: ["august-moon", "september-sake-cup"],
  animalTrio: ["june-butterfly", "july-boar", "october-deer"],
  redTextScrolls: ["january-red-text-scroll", "february-red-text-scroll", "march-red-text-scroll"],
  blueScrolls: ["june-blue-scroll", "september-blue-scroll", "october-blue-scroll"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortedStrings(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameStringSet(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify(sortedStrings(actual)) === JSON.stringify(sortedStrings(expected));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

export function validateCardCatalog(
  catalog: readonly unknown[] = CARD_CATALOG,
): readonly CardCatalogValidationIssue[] {
  const issues: CardCatalogValidationIssue[] = [];
  const records = catalog.filter(isRecord);

  if (catalog.length !== 48) {
    issues.push({ code: "CARD_COUNT", message: `Expected 48 cards; received ${catalog.length}.` });
  }

  if (records.length !== catalog.length) {
    issues.push({ code: "CARD_SHAPE", message: "Every catalog entry must be an object." });
  }

  for (const [index, record] of records.entries()) {
    const extraKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
    if (extraKeys.length > 0) {
      issues.push({
        code: "DOMAIN_FIELDS_ONLY",
        message: `Card at index ${index} contains unsupported fields: ${extraKeys.join(", ")}.`,
      });
    }

    if (typeof record.id !== "string" || !/^[a-z]+(?:-[a-z]+)*$/u.test(record.id)) {
      issues.push({
        code: "CARD_ID_FORMAT",
        message: `Card at index ${index} has an invalid CardId.`,
      });
    }
    if (typeof record.displayName !== "string" || record.displayName.length === 0) {
      issues.push({
        code: "DISPLAY_NAME",
        message: `Card at index ${index} needs a display name.`,
      });
    }
    if (!MONTHS.some((month) => month.number === record.month)) {
      issues.push({ code: "MONTH", message: `Card ${String(record.id)} has an invalid month.` });
    }
    if (!CARD_CATEGORIES.some((category) => category === record.category)) {
      issues.push({
        code: "CATEGORY",
        message: `Card ${String(record.id)} has an invalid category.`,
      });
    }

    const flags = stringArray(record.flags);
    if (
      !Array.isArray(record.flags) ||
      flags.length !== record.flags.length ||
      flags.some((flag) => !CARD_FLAGS.includes(flag as CardFlag))
    ) {
      issues.push({ code: "FLAGS", message: `Card ${String(record.id)} has invalid flags.` });
    }
    if (new Set(flags).size !== flags.length) {
      issues.push({ code: "FLAG_DUPLICATE", message: `Card ${String(record.id)} repeats a flag.` });
    }

    const memberships = stringArray(record.fixedYakuMemberships);
    if (
      !Array.isArray(record.fixedYakuMemberships) ||
      memberships.length !== record.fixedYakuMemberships.length ||
      memberships.some(
        (membership) => !FIXED_YAKU_MEMBERSHIPS.includes(membership as FixedYakuMembership),
      )
    ) {
      issues.push({
        code: "YAKU_MEMBERSHIP",
        message: `Card ${String(record.id)} has invalid fixed-yaku memberships.`,
      });
    }
    if (new Set(memberships).size !== memberships.length) {
      issues.push({
        code: "YAKU_MEMBERSHIP_DUPLICATE",
        message: `Card ${String(record.id)} repeats a fixed-yaku membership.`,
      });
    }

    if (record.category === "scroll") {
      if (!SCROLL_KINDS.some((kind) => kind === record.scrollKind)) {
        issues.push({
          code: "SCROLL_KIND",
          message: `Scroll ${String(record.id)} needs a valid scroll kind.`,
        });
      }
    } else if ("scrollKind" in record) {
      issues.push({
        code: "SCROLL_KIND",
        message: `Non-Scroll ${String(record.id)} cannot have a scroll kind.`,
      });
    }
  }

  const ids = records.flatMap((record) => (typeof record.id === "string" ? [record.id] : []));
  if (new Set(ids).size !== ids.length) {
    issues.push({ code: "CARD_ID_UNIQUE", message: "Every CardId must be unique." });
  }

  for (const month of MONTHS) {
    const monthCards = records.filter((record) => record.month === month.number);
    if (monthCards.length !== 4) {
      issues.push({
        code: "MONTH_CARD_COUNT",
        message: `${month.name} must contain four cards; received ${monthCards.length}.`,
      });
    }
    for (const record of monthCards) {
      if (typeof record.id === "string" && !record.id.startsWith(`${month.id}-`)) {
        issues.push({
          code: "CARD_ID_MONTH",
          message: `${record.id} must begin with its canonical month prefix ${month.id}-.`,
        });
      }
    }
  }

  for (const category of CARD_CATEGORIES) {
    const count = records.filter((record) => record.category === category).length;
    if (count !== expectedCategoryCounts[category]) {
      issues.push({
        code: "CATEGORY_COUNT",
        message: `Expected ${expectedCategoryCounts[category]} ${category} cards; received ${count}.`,
      });
    }
  }

  for (const kind of SCROLL_KINDS) {
    const count = records.filter((record) => record.scrollKind === kind).length;
    if (count !== expectedScrollKindCounts[kind]) {
      issues.push({
        code: "SCROLL_KIND_COUNT",
        message: `Expected ${expectedScrollKindCounts[kind]} ${kind} Scrolls; received ${count}.`,
      });
    }
  }

  for (const flag of CARD_FLAGS) {
    const actualIds = records
      .filter((record) => stringArray(record.flags).includes(flag))
      .flatMap((record) => (typeof record.id === "string" ? [record.id] : []));
    if (!sameStringSet(actualIds, expectedFlagIds[flag])) {
      issues.push({ code: "FLAG_BINDING", message: `${flag} is bound to the wrong CardId set.` });
    }
  }

  for (const membership of FIXED_YAKU_MEMBERSHIPS) {
    const actualIds = records
      .filter((record) => stringArray(record.fixedYakuMemberships).includes(membership))
      .flatMap((record) => (typeof record.id === "string" ? [record.id] : []));
    if (!sameStringSet(actualIds, expectedMembershipIds[membership])) {
      issues.push({
        code: "YAKU_BINDING",
        message: `${membership} is bound to the wrong CardId set.`,
      });
    }
  }

  const sakeCup = records.find((record) => record.id === "september-sake-cup");
  if (sakeCup?.category !== "animal") {
    issues.push({ code: "SAKE_CUP_CATEGORY", message: "The Sake Cup must be Animal only." });
  }
  const rainBright = records.find((record) => record.id === "november-rain");
  if (rainBright?.category !== "bright") {
    issues.push({ code: "RAIN_BRIGHT_CATEGORY", message: "The Rain Bright must be a Bright." });
  }

  const observedMonthOrder = records.map((record) => record.month);
  if (
    observedMonthOrder.some(
      (month, index) => index > 0 && Number(month) < Number(observedMonthOrder[index - 1]),
    )
  ) {
    issues.push({ code: "CATALOG_ORDER", message: "Catalog cards must remain ordered by month." });
  }

  return Object.freeze(issues);
}

export function assertValidCardCatalog(catalog: readonly unknown[] = CARD_CATALOG): void {
  const issues = validateCardCatalog(catalog);
  if (issues.length > 0) {
    throw new Error(
      `Invalid card catalog:\n${issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")}`,
    );
  }
}
