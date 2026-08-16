import {
  decodeLocalAuthoritativeSnapshotV1,
  deepFreeze,
  RULES_VERSION,
  type AuthoritativeGameStateV1,
  type EngineCheckpointV1,
  type RngSnapshotV1,
} from "@koikoi4x/engine";

export const LOCAL_SAVE_FORMAT_VERSION = 1 as const;
export const LOCAL_SAVE_GAME_VERSION =
  `rules-${RULES_VERSION}/local-save-${LOCAL_SAVE_FORMAT_VERSION}` as const;
export const LOCAL_SAVES_DATABASE = "koikoi4x-local-saves";
export const LOCAL_SAVES_STORE = "active-save";
export const LOCAL_SAVE_KEY = "current";

export interface LocalSaveV1 {
  readonly formatVersion: typeof LOCAL_SAVE_FORMAT_VERSION;
  readonly gameVersion: typeof LOCAL_SAVE_GAME_VERSION;
  readonly saveId: string;
  readonly mode: "local";
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly authoritativeState: AuthoritativeGameStateV1;
  readonly rng: RngSnapshotV1;
}

export interface LocalSaveSnapshotV1 {
  readonly checkpoint: EngineCheckpointV1;
  readonly state: AuthoritativeGameStateV1;
}

export class LocalSaveConflictError extends Error {
  constructor() {
    super("LOCAL_SAVE_CONFLICT: a newer local save already exists.");
  }
}

export interface LocalSaveRepositoryV1 {
  read: () => Promise<unknown>;
  write: (save: LocalSaveV1, expectedPreviousUpdatedAt: number | null) => Promise<void>;
  delete: (expectedPreviousUpdatedAt: number | null) => Promise<void>;
  clearRecovery: () => Promise<void>;
}

export interface LocalSaveStoreV1 {
  current: () => LocalSaveV1 | null;
  hydrate: (save: LocalSaveV1 | null) => void;
  queueSnapshot: (snapshot: LocalSaveSnapshotV1) => Promise<LocalSaveV1>;
  delete: () => Promise<void>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Reads only inert JSON data, so stored accessors never run during recovery. */
function cloneInertJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) decodeFailure("save contains a non-finite number.");
    return value;
  }
  if (Array.isArray(value)) {
    if (
      Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      decodeFailure("save contains an unsupported array.");
    }
    const allowed = new Set([
      "length",
      ...Array.from({ length: value.length }, (_value, index) => String(index)),
    ]);
    for (const key of Object.getOwnPropertyNames(value)) {
      if (!allowed.has(key)) decodeFailure("save contains an unsupported array field.");
    }
    const clone: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        decodeFailure("save contains an accessor.");
      }
      clone.push(cloneInertJson(descriptor.value));
    }
    return clone;
  }
  if (!isPlainRecord(value) || Object.getOwnPropertySymbols(value).length > 0) {
    decodeFailure("save is not plain JSON data.");
  }
  const clone: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      decodeFailure("save contains an accessor.");
    }
    clone[key] = cloneInertJson(descriptor.value);
  }
  return clone;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function decodeFailure(message: string): never {
  throw new Error(`LOCAL_SAVE_INVALID: ${message}`);
}

/** Decodes the exact outer browser record and delegates engine snapshot validation. */
export function decodeLocalSaveV1(value: unknown): LocalSaveV1 {
  const cloned = cloneInertJson(value);
  if (!isPlainRecord(cloned)) decodeFailure("save must be an object.");
  const keys = Object.keys(cloned).sort();
  const expected = [
    "authoritativeState",
    "createdAt",
    "formatVersion",
    "gameVersion",
    "mode",
    "rng",
    "saveId",
    "updatedAt",
  ];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    decodeFailure("save has an unsupported shape.");
  }
  if (cloned.formatVersion !== LOCAL_SAVE_FORMAT_VERSION)
    decodeFailure("format version is unsupported.");
  if (cloned.gameVersion !== LOCAL_SAVE_GAME_VERSION) decodeFailure("game version is unsupported.");
  if (cloned.mode !== "local") decodeFailure("mode is unsupported.");
  if (typeof cloned.saveId !== "string" || cloned.saveId.trim().length === 0) {
    decodeFailure("save ID is invalid.");
  }
  if (
    !isTimestamp(cloned.createdAt) ||
    !isTimestamp(cloned.updatedAt) ||
    cloned.updatedAt < cloned.createdAt
  ) {
    decodeFailure("timestamps are invalid.");
  }
  const stateRecord = cloned.authoritativeState;
  if (!isPlainRecord(stateRecord) || typeof stateRecord.matchId !== "string") {
    decodeFailure("authoritative state is invalid.");
  }
  const snapshot = decodeLocalAuthoritativeSnapshotV1({
    state: cloned.authoritativeState,
    checkpoint: { version: 1, matchId: stateRecord.matchId, rng: cloned.rng },
  });
  return deepFreeze({
    formatVersion: LOCAL_SAVE_FORMAT_VERSION,
    gameVersion: LOCAL_SAVE_GAME_VERSION,
    saveId: cloned.saveId,
    mode: "local",
    createdAt: cloned.createdAt,
    updatedAt: cloned.updatedAt,
    authoritativeState: snapshot.state,
    rng: snapshot.checkpoint.rng,
  });
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
      {
        once: true,
      },
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

function openLocalSavesDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDB.open(LOCAL_SAVES_DATABASE, 1);
    request.addEventListener(
      "upgradeneeded",
      () => {
        if (!request.result.objectStoreNames.contains(LOCAL_SAVES_STORE)) {
          request.result.createObjectStore(LOCAL_SAVES_STORE);
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

export function createIndexedDbLocalSaveRepository(): LocalSaveRepositoryV1 {
  return Object.freeze({
    async read(): Promise<unknown> {
      const database = await openLocalSavesDatabase();
      try {
        const transaction = database.transaction(LOCAL_SAVES_STORE, "readonly");
        const result = await requestResult(
          transaction.objectStore(LOCAL_SAVES_STORE).get(LOCAL_SAVE_KEY),
        );
        await transactionComplete(transaction);
        return result;
      } finally {
        database.close();
      }
    },
    async write(save: LocalSaveV1, expectedPreviousUpdatedAt: number | null): Promise<void> {
      const database = await openLocalSavesDatabase();
      try {
        const transaction = database.transaction(LOCAL_SAVES_STORE, "readwrite");
        const store = transaction.objectStore(LOCAL_SAVES_STORE);
        const previous = await requestResult(store.get(LOCAL_SAVE_KEY));
        const previousUpdatedAt =
          isPlainRecord(previous) && typeof previous.updatedAt === "number"
            ? previous.updatedAt
            : null;
        if (previousUpdatedAt !== expectedPreviousUpdatedAt) {
          transaction.abort();
          throw new LocalSaveConflictError();
        }
        store.put(save, LOCAL_SAVE_KEY);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async delete(expectedPreviousUpdatedAt: number | null): Promise<void> {
      const database = await openLocalSavesDatabase();
      try {
        const transaction = database.transaction(LOCAL_SAVES_STORE, "readwrite");
        const store = transaction.objectStore(LOCAL_SAVES_STORE);
        const previous = await requestResult(store.get(LOCAL_SAVE_KEY));
        const previousUpdatedAt =
          isPlainRecord(previous) && typeof previous.updatedAt === "number"
            ? previous.updatedAt
            : null;
        if (previousUpdatedAt !== expectedPreviousUpdatedAt) {
          transaction.abort();
          throw new LocalSaveConflictError();
        }
        store.delete(LOCAL_SAVE_KEY);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async clearRecovery(): Promise<void> {
      const database = await openLocalSavesDatabase();
      try {
        const transaction = database.transaction(LOCAL_SAVES_STORE, "readwrite");
        transaction.objectStore(LOCAL_SAVES_STORE).delete(LOCAL_SAVE_KEY);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
  });
}

function createSaveId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/** A single-writer, coalescing facade; a stale write is never retried over newer data. */
export function createLocalSaveStore(
  repository: LocalSaveRepositoryV1 = createIndexedDbLocalSaveRepository(),
  now: () => number = () => Date.now(),
): LocalSaveStoreV1 {
  let current: LocalSaveV1 | null = null;
  let queued: LocalSaveSnapshotV1 | null = null;
  let running: Promise<LocalSaveV1> | null = null;
  let lastUpdatedAt = 0;

  const writeNext = async (): Promise<LocalSaveV1> => {
    const snapshot = queued;
    if (snapshot === null) return current ?? Promise.reject(new Error("LOCAL_SAVE_QUEUE_EMPTY"));
    queued = null;
    const createdAt = current?.createdAt ?? Math.max(0, Math.floor(now()));
    const updatedAt = Math.max(createdAt, lastUpdatedAt + 1, Math.floor(now()));
    const next = deepFreeze({
      formatVersion: LOCAL_SAVE_FORMAT_VERSION,
      gameVersion: LOCAL_SAVE_GAME_VERSION,
      saveId: current?.saveId ?? createSaveId(),
      mode: "local" as const,
      createdAt,
      updatedAt,
      authoritativeState: snapshot.state,
      rng: snapshot.checkpoint.rng,
    });
    await repository.write(next, current?.updatedAt ?? null);
    current = next;
    lastUpdatedAt = updatedAt;
    if (queued !== null) return writeNext();
    return next;
  };

  return Object.freeze({
    current: () => current,
    hydrate(save: LocalSaveV1 | null) {
      current = save;
      lastUpdatedAt = save?.updatedAt ?? 0;
    },
    queueSnapshot(snapshot: LocalSaveSnapshotV1) {
      if (
        current !== null &&
        snapshot.state.stateVersion < current.authoritativeState.stateVersion
      ) {
        return Promise.resolve(current);
      }
      queued = snapshot;
      if (running === null) {
        running = writeNext().finally(() => {
          running = null;
        });
      }
      return running;
    },
    async delete() {
      const inFlight = running;
      if (inFlight !== null) await inFlight;
      const expected = current?.updatedAt ?? null;
      queued = null;
      await repository.delete(expected);
      current = null;
      lastUpdatedAt = 0;
    },
  });
}

export function localSaveSnapshot(save: LocalSaveV1): LocalSaveSnapshotV1 {
  return deepFreeze({
    state: save.authoritativeState,
    checkpoint: deepFreeze({ version: 1, matchId: save.authoritativeState.matchId, rng: save.rng }),
  });
}

export function createSanitizedLocalSaveDiagnostic(_error: unknown): string {
  void _error;
  return JSON.stringify({ kind: "local-save-recovery", category: "local-save-invalid" }, null, 2);
}
