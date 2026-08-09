export const INSTALLED_DECKS = Object.freeze([
  Object.freeze({
    id: "technical-sunrise",
    name: "Technical Sunrise",
    manifestPath: "decks/technical-sunrise/manifest.v1.json",
  }),
  Object.freeze({
    id: "technical-moonlight",
    name: "Technical Moonlight",
    manifestPath: "decks/technical-moonlight/manifest.v1.json",
  }),
] as const);

export type InstalledDeckId = (typeof INSTALLED_DECKS)[number]["id"];

export function isInstalledDeckId(value: string): value is InstalledDeckId {
  return INSTALLED_DECKS.some(({ id }) => id === value);
}
