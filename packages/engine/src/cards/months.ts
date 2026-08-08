export const MONTHS = Object.freeze([
  Object.freeze({ number: 1, id: "january", name: "January", flower: "Pine" }),
  Object.freeze({ number: 2, id: "february", name: "February", flower: "Plum Blossom" }),
  Object.freeze({ number: 3, id: "march", name: "March", flower: "Cherry Blossom" }),
  Object.freeze({ number: 4, id: "april", name: "April", flower: "Wisteria" }),
  Object.freeze({ number: 5, id: "may", name: "May", flower: "Iris" }),
  Object.freeze({ number: 6, id: "june", name: "June", flower: "Peony" }),
  Object.freeze({ number: 7, id: "july", name: "July", flower: "Bush Clover" }),
  Object.freeze({ number: 8, id: "august", name: "August", flower: "Pampas Grass" }),
  Object.freeze({ number: 9, id: "september", name: "September", flower: "Chrysanthemum" }),
  Object.freeze({ number: 10, id: "october", name: "October", flower: "Maple" }),
  Object.freeze({ number: 11, id: "november", name: "November", flower: "Willow" }),
  Object.freeze({ number: 12, id: "december", name: "December", flower: "Paulownia" }),
] as const);

export type MonthDefinition = (typeof MONTHS)[number];
export type MonthNumber = MonthDefinition["number"];
export type MonthId = MonthDefinition["id"];

export const MONTH_BY_NUMBER = Object.freeze(
  Object.fromEntries(MONTHS.map((month) => [month.number, month])),
) as Readonly<Record<MonthNumber, MonthDefinition>>;

export function getMonthDefinition(month: MonthNumber): MonthDefinition {
  return MONTH_BY_NUMBER[month];
}
