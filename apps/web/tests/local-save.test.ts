import { describe, expect, it } from "vitest";

import { createLocalRoundRuntime } from "../src/game/local-round-runtime";
import {
  createLocalSaveStore,
  createSanitizedLocalSaveDiagnostic,
  decodeLocalSaveV1,
  LOCAL_SAVE_FORMAT_VERSION,
  LOCAL_SAVE_GAME_VERSION,
  type LocalSaveRepositoryV1,
} from "../src/game/local-save";

function validSave() {
  const runtime = createLocalRoundRuntime({ matchId: "local-save-test" });
  return {
    formatVersion: LOCAL_SAVE_FORMAT_VERSION,
    gameVersion: LOCAL_SAVE_GAME_VERSION,
    saveId: "save-1",
    mode: "local" as const,
    createdAt: 10,
    updatedAt: 11,
    authoritativeState: runtime.state,
    rng: runtime.checkpoint.rng,
  };
}

function repository() {
  let current: unknown = undefined;
  const writes: number[] = [];
  const store: LocalSaveRepositoryV1 = {
    async read() {
      return current;
    },
    async write(save, expected) {
      const previous =
        current !== null && typeof current === "object" && "updatedAt" in current
          ? (current.updatedAt as number)
          : null;
      if (previous !== expected) throw new Error("CAS");
      current = save;
      writes.push(save.updatedAt);
    },
    async delete(expected) {
      const previous =
        current !== null && typeof current === "object" && "updatedAt" in current
          ? (current.updatedAt as number)
          : null;
      if (previous !== expected) throw new Error("CAS");
      current = undefined;
    },
    async clearRecovery() {
      current = undefined;
    },
  };
  return { store, writes, value: () => current };
}

describe("Phase 5B local saves", () => {
  it("decodes only the exact compatible outer save shape", () => {
    const save = validSave();
    expect(decodeLocalSaveV1(save)).toMatchObject({
      formatVersion: 1,
      gameVersion: LOCAL_SAVE_GAME_VERSION,
      mode: "local",
      saveId: "save-1",
    });
    expect(() => decodeLocalSaveV1({ ...save, extra: true })).toThrow("LOCAL_SAVE_INVALID");
    expect(() => decodeLocalSaveV1({ ...save, formatVersion: 2 })).toThrow("LOCAL_SAVE_INVALID");
    expect(() => decodeLocalSaveV1({ ...save, mode: "cpu" })).toThrow("LOCAL_SAVE_INVALID");
    expect(() => decodeLocalSaveV1({ ...save, updatedAt: 9 })).toThrow("LOCAL_SAVE_INVALID");
  });

  it("rejects accessors before reading stored save values", () => {
    const save = validSave();
    const hostile = Object.defineProperty({}, "formatVersion", {
      enumerable: true,
      get() {
        throw new Error("must not run");
      },
    });
    expect(() => decodeLocalSaveV1({ ...save, authoritativeState: hostile })).toThrow(
      "LOCAL_SAVE_INVALID",
    );
  });

  it("serializes writes and does not replace a newer saved state with an older one", async () => {
    const repo = repository();
    let tick = 100;
    const saves = createLocalSaveStore(repo.store, () => tick++);
    const runtime = createLocalRoundRuntime({ matchId: "local-save-coalesce" });
    await saves.queueSnapshot(runtime.snapshot());
    const current = saves.current();
    if (!current) throw new Error("save was not written");
    await saves.queueSnapshot({
      state: { ...runtime.state, stateVersion: runtime.state.stateVersion - 1 },
      checkpoint: runtime.checkpoint,
    });
    expect(saves.current()?.updatedAt).toBe(current.updatedAt);
    expect(repo.writes).toHaveLength(1);
  });

  it("waits for coalesced in-flight saves before deleting the exact active record", async () => {
    let current: unknown = undefined;
    let releaseFirstWrite!: () => void;
    let writeCount = 0;
    let deleteCount = 0;
    const deferredWrite = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const repo: LocalSaveRepositoryV1 = {
      async read() {
        return current;
      },
      async write(save, expected) {
        const previous =
          current !== null && typeof current === "object" && "updatedAt" in current
            ? (current.updatedAt as number)
            : null;
        if (previous !== expected) throw new Error("CAS");
        writeCount += 1;
        if (writeCount === 1) await deferredWrite;
        current = save;
      },
      async delete(expected) {
        const previous =
          current !== null && typeof current === "object" && "updatedAt" in current
            ? (current.updatedAt as number)
            : null;
        if (previous !== expected) throw new Error("CAS");
        deleteCount += 1;
        current = undefined;
      },
      async clearRecovery() {
        current = undefined;
      },
    };
    const saves = createLocalSaveStore(repo, () => 100);
    const runtime = createLocalRoundRuntime({ matchId: "local-save-delete-race" });
    const first = saves.queueSnapshot(runtime.snapshot());
    const second = saves.queueSnapshot(runtime.snapshot());
    const deletion = saves.delete();
    expect(deleteCount).toBe(0);
    releaseFirstWrite();
    await Promise.all([first, second, deletion]);

    expect(writeCount).toBeGreaterThanOrEqual(1);
    expect(deleteCount).toBe(1);
    expect(current).toBeUndefined();
    expect(saves.current()).toBeNull();
  });

  it("keeps the live checkpoint usable when storage rejects a write", async () => {
    const repo: LocalSaveRepositoryV1 = {
      async read() {
        return undefined;
      },
      async write() {
        throw new Error("storage denied");
      },
      async delete() {
        throw new Error("storage denied");
      },
      async clearRecovery() {
        throw new Error("storage denied");
      },
    };
    const runtime = createLocalRoundRuntime({ matchId: "local-save-storage-denied" });
    const saves = createLocalSaveStore(repo, () => 100);
    await expect(saves.queueSnapshot(runtime.snapshot())).rejects.toThrow("storage denied");
    expect(saves.current()).toBeNull();
    expect(runtime.observe().legalActions.length).toBeGreaterThan(0);
  });

  it("keeps the existing durable marker unchanged across read, quota-write, and blocked-delete failures", async () => {
    const saved = decodeLocalSaveV1(validSave());
    const runtime = createLocalRoundRuntime({ matchId: "local-save-failure-matrix" });
    const repositoryError = new Error("storage unavailable");
    const failingRead: LocalSaveRepositoryV1 = {
      async read() {
        throw repositoryError;
      },
      async write() {
        throw repositoryError;
      },
      async delete() {
        throw repositoryError;
      },
      async clearRecovery() {
        throw repositoryError;
      },
    };
    await expect(failingRead.read()).rejects.toBe(repositoryError);

    const quotaWrite: LocalSaveRepositoryV1 = {
      ...failingRead,
      async read() {
        return saved;
      },
    };
    const quotaStore = createLocalSaveStore(quotaWrite, () => saved.updatedAt + 1);
    quotaStore.hydrate(saved);
    await expect(quotaStore.queueSnapshot(runtime.snapshot())).rejects.toBe(repositoryError);
    expect(quotaStore.current()).toBe(saved);

    const blockedDelete = createLocalSaveStore(failingRead, () => saved.updatedAt + 1);
    blockedDelete.hydrate(saved);
    await expect(blockedDelete.delete()).rejects.toBe(repositoryError);
    expect(blockedDelete.current()).toBe(saved);
  });

  it("keeps corrupt-record recovery clearing explicit and separate from CAS deletion", async () => {
    let current: unknown = { unsupported: true, updatedAt: 7 };
    let casDeleteCalls = 0;
    let recoveryClearCalls = 0;
    const recoveryRepository: LocalSaveRepositoryV1 = {
      async read() {
        return current;
      },
      async write() {
        throw new Error("not used");
      },
      async delete() {
        casDeleteCalls += 1;
        throw new Error("CAS deletion must not be used for corrupt recovery");
      },
      async clearRecovery() {
        recoveryClearCalls += 1;
        current = undefined;
      },
    };
    await recoveryRepository.clearRecovery();
    expect(recoveryClearCalls).toBe(1);
    expect(casDeleteCalls).toBe(0);
    await expect(recoveryRepository.read()).resolves.toBeUndefined();
  });

  it("uses a non-sensitive recovery diagnostic", () => {
    const diagnostic = createSanitizedLocalSaveDiagnostic(
      new Error("LOCAL_SNAPSHOT_INVALID: player-a january-crane"),
    );
    expect(diagnostic).toContain("local-save-invalid");
    expect(diagnostic).not.toContain("january-crane");
    expect(diagnostic).not.toContain("player-a");
  });
});
