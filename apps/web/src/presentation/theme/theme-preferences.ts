import {
  DEFAULT_PHASE_3D_VISUAL_DIRECTION,
  getPhase3DVisualDirection,
  type Phase3DVisualDirectionId,
  type Phase3DVisualDirectionV1,
} from "./visual-directions";

export const THEME_PREFERENCE_VERSION = 1 as const;
export const THEME_PREFERENCES_DATABASE = "koikoi4x-preferences";
export const THEME_PREFERENCES_STORE = "presentation";
export const THEME_PREFERENCE_KEY = "theme";

export interface ThemePreferenceV1 {
  readonly themeId: Phase3DVisualDirectionId;
  readonly version: typeof THEME_PREFERENCE_VERSION;
}

export interface ThemePreferenceRepositoryV1 {
  read: () => Promise<unknown>;
  write: (preference: ThemePreferenceV1) => Promise<void>;
}

export interface ThemePreferenceStoreV1 {
  current: () => Phase3DVisualDirectionV1;
  hydrate: () => Promise<Phase3DVisualDirectionV1>;
  set: (themeId: string) => Promise<Phase3DVisualDirectionV1>;
  subscribe: (listener: (theme: Phase3DVisualDirectionV1) => void) => () => void;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function decodeThemePreference(value: unknown): ThemePreferenceV1 | null {
  if (!isPlainRecord(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "themeId" || keys[1] !== "version") return null;
  if (value.version !== THEME_PREFERENCE_VERSION || typeof value.themeId !== "string") return null;
  const direction = getPhase3DVisualDirection(value.themeId);
  if (!direction) return null;
  return Object.freeze({ version: THEME_PREFERENCE_VERSION, themeId: direction.id });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      {
        once: true,
      },
    );
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      {
        once: true,
      },
    );
  });
}

function openThemePreferencesDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(THEME_PREFERENCES_DATABASE, THEME_PREFERENCE_VERSION);
    } catch (error: unknown) {
      reject(error);
      return;
    }
    request.addEventListener(
      "upgradeneeded",
      () => {
        if (!request.result.objectStoreNames.contains(THEME_PREFERENCES_STORE)) {
          request.result.createObjectStore(THEME_PREFERENCES_STORE);
        }
      },
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB open failed.")),
      {
        once: true,
      },
    );
    request.addEventListener("blocked", () => reject(new Error("IndexedDB open is blocked.")), {
      once: true,
    });
  });
}

export function createIndexedDbThemePreferenceRepository(): ThemePreferenceRepositoryV1 {
  return Object.freeze({
    async read(): Promise<unknown> {
      const database = await openThemePreferencesDatabase();
      try {
        const transaction = database.transaction(THEME_PREFERENCES_STORE, "readonly");
        const value = await requestResult(
          transaction.objectStore(THEME_PREFERENCES_STORE).get(THEME_PREFERENCE_KEY),
        );
        await transactionComplete(transaction);
        return value;
      } finally {
        database.close();
      }
    },
    async write(preference: ThemePreferenceV1): Promise<void> {
      const database = await openThemePreferencesDatabase();
      try {
        const transaction = database.transaction(THEME_PREFERENCES_STORE, "readwrite");
        transaction.objectStore(THEME_PREFERENCES_STORE).put(preference, THEME_PREFERENCE_KEY);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
  });
}

export function createThemePreferenceStore(
  repository: ThemePreferenceRepositoryV1 = createIndexedDbThemePreferenceRepository(),
): ThemePreferenceStoreV1 {
  let current = DEFAULT_PHASE_3D_VISUAL_DIRECTION;
  const listeners = new Set<(theme: Phase3DVisualDirectionV1) => void>();

  const publish = (): void => {
    for (const listener of listeners) listener(current);
  };
  const apply = (theme: Phase3DVisualDirectionV1): Phase3DVisualDirectionV1 => {
    if (current.id !== theme.id) {
      current = theme;
      publish();
    }
    return current;
  };

  return Object.freeze({
    current: () => current,
    async hydrate(): Promise<Phase3DVisualDirectionV1> {
      try {
        const preference = decodeThemePreference(await repository.read());
        return preference
          ? apply(getPhase3DVisualDirection(preference.themeId) ?? current)
          : current;
      } catch {
        return current;
      }
    },
    async set(themeId: string): Promise<Phase3DVisualDirectionV1> {
      const theme = getPhase3DVisualDirection(themeId);
      if (!theme) return current;
      apply(theme);
      try {
        await repository.write(
          Object.freeze({ version: THEME_PREFERENCE_VERSION, themeId: theme.id }),
        );
      } catch {
        // Private browsing and storage denial retain this session's purely cosmetic selection.
      }
      return current;
    },
    subscribe(listener: (theme: Phase3DVisualDirectionV1) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
