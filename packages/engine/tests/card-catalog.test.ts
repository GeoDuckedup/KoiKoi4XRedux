import { describe, expect, it } from "vitest";

import {
  CARD_BY_ID,
  CARD_CATALOG,
  CARD_IDS,
  CARDS_BY_MONTH,
  MONTHS,
  assertValidCardCatalog,
  getCardDefinition,
  isCardId,
  validateCardCatalog,
} from "../src";

describe("canonical card catalog", () => {
  it("passes the complete catalog validator", () => {
    expect(validateCardCatalog()).toEqual([]);
    expect(() => assertValidCardCatalog()).not.toThrow();
  });

  it("locks 48 unique cards, four per canonical month", () => {
    expect(CARD_CATALOG).toHaveLength(48);
    expect(new Set(CARD_IDS).size).toBe(48);
    expect(MONTHS.map(({ number, name, flower }) => ({ number, name, flower }))).toEqual([
      { number: 1, name: "January", flower: "Pine" },
      { number: 2, name: "February", flower: "Plum Blossom" },
      { number: 3, name: "March", flower: "Cherry Blossom" },
      { number: 4, name: "April", flower: "Wisteria" },
      { number: 5, name: "May", flower: "Iris" },
      { number: 6, name: "June", flower: "Peony" },
      { number: 7, name: "July", flower: "Bush Clover" },
      { number: 8, name: "August", flower: "Pampas Grass" },
      { number: 9, name: "September", flower: "Chrysanthemum" },
      { number: 10, name: "October", flower: "Maple" },
      { number: 11, name: "November", flower: "Willow" },
      { number: 12, name: "December", flower: "Paulownia" },
    ]);
    expect(MONTHS.every((month) => CARDS_BY_MONTH[month.number].length === 4)).toBe(true);
  });

  it("locks primary categories, Scroll kinds, and special-card metadata", () => {
    const idsInCategory = (category: "bright" | "animal" | "scroll" | "plain") =>
      CARD_CATALOG.filter((card) => card.category === category).map((card) => card.id);

    expect(idsInCategory("bright")).toEqual([
      "january-crane",
      "march-curtain",
      "august-moon",
      "november-rain",
      "december-phoenix",
    ]);
    expect(idsInCategory("animal")).toEqual([
      "february-bush-warbler",
      "april-cuckoo",
      "may-bridge",
      "june-butterfly",
      "july-boar",
      "august-geese",
      "september-sake-cup",
      "october-deer",
      "november-swallow",
    ]);
    expect(idsInCategory("scroll")).toEqual([
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
      "april-red-scroll",
      "may-red-scroll",
      "june-blue-scroll",
      "july-red-scroll",
      "september-blue-scroll",
      "october-blue-scroll",
      "november-red-scroll",
    ]);
    expect(idsInCategory("plain")).toEqual([
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
      "july-bush-clover-plain-a",
      "july-bush-clover-plain-b",
      "august-pampas-plain-a",
      "august-pampas-plain-b",
      "september-chrysanthemum-plain-a",
      "september-chrysanthemum-plain-b",
      "october-maple-plain-a",
      "october-maple-plain-b",
      "november-willow-plain",
      "december-paulownia-plain-a",
      "december-paulownia-plain-b",
      "december-paulownia-plain-c",
    ]);

    const scrollIdsByKind = (kind: "redText" | "red" | "blue") =>
      CARD_CATALOG.filter((card) => card.category === "scroll" && card.scrollKind === kind).map(
        (card) => card.id,
      );
    expect(scrollIdsByKind("redText")).toEqual([
      "january-red-text-scroll",
      "february-red-text-scroll",
      "march-red-text-scroll",
    ]);
    expect(scrollIdsByKind("red")).toEqual([
      "april-red-scroll",
      "may-red-scroll",
      "july-red-scroll",
      "november-red-scroll",
    ]);
    expect(scrollIdsByKind("blue")).toEqual([
      "june-blue-scroll",
      "september-blue-scroll",
      "october-blue-scroll",
    ]);

    expect(CARD_BY_ID["september-sake-cup"]).toMatchObject({
      month: 9,
      category: "animal",
      flags: ["sakeCup"],
      fixedYakuMemberships: ["blossomViewing", "moonViewing"],
    });
    expect(CARD_BY_ID["november-rain"]).toMatchObject({
      month: 11,
      category: "bright",
      flags: ["rainBright"],
    });
  });

  it("locks every CardId and its complete rules-metadata projection", () => {
    const projection = CARD_CATALOG.map((card) =>
      [
        card.id,
        card.displayName,
        card.month,
        card.category,
        "scrollKind" in card ? card.scrollKind : "-",
        card.flags.join(",") || "-",
        card.fixedYakuMemberships.join(",") || "-",
      ].join("|"),
    );

    expect(projection).toEqual([
      "january-crane|Crane|1|bright|-|-|-",
      "january-red-text-scroll|Red Text Scroll|1|scroll|redText|-|redTextScrolls",
      "january-pine-plain-a|Pine Plain A|1|plain|-|-|-",
      "january-pine-plain-b|Pine Plain B|1|plain|-|-|-",
      "february-bush-warbler|Bush Warbler|2|animal|-|-|-",
      "february-red-text-scroll|Red Text Scroll|2|scroll|redText|-|redTextScrolls",
      "february-plum-plain-a|Plum Plain A|2|plain|-|-|-",
      "february-plum-plain-b|Plum Plain B|2|plain|-|-|-",
      "march-curtain|Cherry Curtain|3|bright|-|-|blossomViewing",
      "march-red-text-scroll|Red Text Scroll|3|scroll|redText|-|redTextScrolls",
      "march-cherry-plain-a|Cherry Plain A|3|plain|-|-|-",
      "march-cherry-plain-b|Cherry Plain B|3|plain|-|-|-",
      "april-cuckoo|Cuckoo|4|animal|-|-|-",
      "april-red-scroll|Red Scroll|4|scroll|red|-|-",
      "april-wisteria-plain-a|Wisteria Plain A|4|plain|-|-|-",
      "april-wisteria-plain-b|Wisteria Plain B|4|plain|-|-|-",
      "may-bridge|Iris Bridge|5|animal|-|-|-",
      "may-red-scroll|Red Scroll|5|scroll|red|-|-",
      "may-iris-plain-a|Iris Plain A|5|plain|-|-|-",
      "may-iris-plain-b|Iris Plain B|5|plain|-|-|-",
      "june-butterfly|Butterfly|6|animal|-|-|animalTrio",
      "june-blue-scroll|Blue Scroll|6|scroll|blue|-|blueScrolls",
      "june-peony-plain-a|Peony Plain A|6|plain|-|-|-",
      "june-peony-plain-b|Peony Plain B|6|plain|-|-|-",
      "july-boar|Boar|7|animal|-|-|animalTrio",
      "july-red-scroll|Red Scroll|7|scroll|red|-|-",
      "july-bush-clover-plain-a|Bush Clover Plain A|7|plain|-|-|-",
      "july-bush-clover-plain-b|Bush Clover Plain B|7|plain|-|-|-",
      "august-moon|Moon|8|bright|-|-|moonViewing",
      "august-geese|Geese|8|animal|-|-|-",
      "august-pampas-plain-a|Pampas Plain A|8|plain|-|-|-",
      "august-pampas-plain-b|Pampas Plain B|8|plain|-|-|-",
      "september-sake-cup|Sake Cup|9|animal|-|sakeCup|blossomViewing,moonViewing",
      "september-blue-scroll|Blue Scroll|9|scroll|blue|-|blueScrolls",
      "september-chrysanthemum-plain-a|Chrysanthemum Plain A|9|plain|-|-|-",
      "september-chrysanthemum-plain-b|Chrysanthemum Plain B|9|plain|-|-|-",
      "october-deer|Deer|10|animal|-|-|animalTrio",
      "october-blue-scroll|Blue Scroll|10|scroll|blue|-|blueScrolls",
      "october-maple-plain-a|Maple Plain A|10|plain|-|-|-",
      "october-maple-plain-b|Maple Plain B|10|plain|-|-|-",
      "november-rain|Rain Bright|11|bright|-|rainBright|-",
      "november-swallow|Swallow|11|animal|-|-|-",
      "november-red-scroll|Red Scroll|11|scroll|red|-|-",
      "november-willow-plain|Willow Plain|11|plain|-|-|-",
      "december-phoenix|Phoenix|12|bright|-|-|-",
      "december-paulownia-plain-a|Paulownia Plain A|12|plain|-|-|-",
      "december-paulownia-plain-b|Paulownia Plain B|12|plain|-|-|-",
      "december-paulownia-plain-c|Paulownia Plain C|12|plain|-|-|-",
    ]);
  });

  it("exposes stable lookups and frozen domain records", () => {
    expect(isCardId("march-curtain")).toBe(true);
    expect(isCardId("3a")).toBe(false);
    expect(getCardDefinition("march-curtain")).toBe(CARD_BY_ID["march-curtain"]);
    expect(Object.isFrozen(CARD_CATALOG)).toBe(true);
    expect(CARD_CATALOG.every((card) => Object.isFrozen(card))).toBe(true);
    expect(CARD_CATALOG.every((card) => Object.isFrozen(card.flags))).toBe(true);
    expect(CARD_CATALOG.every((card) => Object.isFrozen(card.fixedYakuMemberships))).toBe(true);
  });

  it("rejects duplicate IDs and artwork-package fields", () => {
    const duplicateCatalog: unknown[] = [CARD_CATALOG[0], ...CARD_CATALOG.slice(0, -1)];
    expect(validateCardCatalog(duplicateCatalog).map((issue) => issue.code)).toContain(
      "CARD_ID_UNIQUE",
    );

    const catalogWithTexture = CARD_CATALOG.map((card, index) =>
      index === 0 ? { ...card, texture: "january-crane.png" } : card,
    );
    expect(validateCardCatalog(catalogWithTexture).map((issue) => issue.code)).toContain(
      "DOMAIN_FIELDS_ONLY",
    );

    const catalogWithDuplicateFlag = CARD_CATALOG.map((card) =>
      card.id === "september-sake-cup" ? { ...card, flags: ["sakeCup", "sakeCup"] } : card,
    );
    expect(validateCardCatalog(catalogWithDuplicateFlag).map((issue) => issue.code)).toContain(
      "FLAG_DUPLICATE",
    );

    const catalogWithDuplicateMembership = CARD_CATALOG.map((card) =>
      card.id === "march-curtain"
        ? { ...card, fixedYakuMemberships: ["blossomViewing", "blossomViewing"] }
        : card,
    );
    expect(
      validateCardCatalog(catalogWithDuplicateMembership).map((issue) => issue.code),
    ).toContain("YAKU_MEMBERSHIP_DUPLICATE");
  });
});
