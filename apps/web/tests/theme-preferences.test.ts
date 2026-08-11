import { describe, expect, it } from "vitest";

import {
  createThemePreferenceStore,
  decodeThemePreference,
  THEME_PREFERENCE_VERSION,
  type ThemePreferenceRepositoryV1,
} from "../src/presentation/theme/theme-preferences";

function repository(
  initialValue: unknown,
  options: { readonly failRead?: boolean; readonly failWrite?: boolean } = {},
) {
  const writes: unknown[] = [];
  const value = initialValue;
  const store: ThemePreferenceRepositoryV1 = {
    async read() {
      if (options.failRead) throw new Error("Storage unavailable.");
      return value;
    },
    async write(preference) {
      if (options.failWrite) throw new Error("Storage denied.");
      writes.push(preference);
    },
  };
  return { store, writes };
}

describe("Phase 3D-C theme preferences", () => {
  it("decodes only the exact versioned allowlisted preference shape", () => {
    expect(
      decodeThemePreference({ version: THEME_PREFERENCE_VERSION, themeId: "moonlit-indigo" }),
    ).toEqual({ version: 1, themeId: "moonlit-indigo" });
    expect(decodeThemePreference(null)).toBeNull();
    expect(decodeThemePreference([])).toBeNull();
    expect(decodeThemePreference({ version: 2, themeId: "moonlit-indigo" })).toBeNull();
    expect(decodeThemePreference({ version: 1, themeId: "unknown" })).toBeNull();
    expect(decodeThemePreference({ version: 1, themeId: "ink-parchment", extra: true })).toBeNull();
  });

  it("hydrates a valid local cosmetic choice without exposing arbitrary storage values", async () => {
    const { store } = repository({ version: 1, themeId: "warm-ivory" });
    const preferences = createThemePreferenceStore(store);
    const changes: string[] = [];
    preferences.subscribe((theme) => changes.push(theme.id));

    await expect(preferences.hydrate()).resolves.toMatchObject({ id: "warm-ivory" });
    expect(preferences.current().id).toBe("warm-ivory");
    expect(changes).toEqual(["warm-ivory"]);
  });

  it("keeps Ink or the current in-memory choice when storage is invalid or unavailable", async () => {
    const invalid = createThemePreferenceStore(
      repository({ version: 1, themeId: "unknown" }).store,
    );
    await invalid.hydrate();
    expect(invalid.current().id).toBe("ink-parchment");

    const unavailable = createThemePreferenceStore(repository(null, { failRead: true }).store);
    await unavailable.hydrate();
    expect(unavailable.current().id).toBe("ink-parchment");

    const { store, writes } = repository(null, { failWrite: true });
    const sessionOnly = createThemePreferenceStore(store);
    await sessionOnly.set("moonlit-indigo");
    expect(sessionOnly.current().id).toBe("moonlit-indigo");
    expect(writes).toEqual([]);
  });

  it("persists only known theme IDs and does not change the current theme for invalid input", async () => {
    const { store, writes } = repository(null);
    const preferences = createThemePreferenceStore(store);

    await preferences.set("warm-ivory");
    await preferences.set("not-a-theme");

    expect(preferences.current().id).toBe("warm-ivory");
    expect(writes).toEqual([{ version: 1, themeId: "warm-ivory" }]);
  });
});
