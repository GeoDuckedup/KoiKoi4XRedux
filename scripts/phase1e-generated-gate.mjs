import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_GENERATED_MATCHES = 10_002;
const DEFAULT_SHARD_SIZE = 750;
const DEFAULT_SHARD_TIMEOUT_MS = 60_000;
const CHILD_TEST_TIMEOUT_MS = 86_400_000;
const FORMATS = [3, 6, 12];
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const vitestEntrypoint = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);
const generatedTestPath = "packages/test-fixtures/tests/phase1e-generated-games.test.ts";

function positiveSafeInteger(name, configured, fallback) {
  if (configured === undefined) return fallback;
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
  return value;
}

function plannedFormatCounts(total) {
  const counts = new Map(FORMATS.map((format) => [format, 0]));
  for (let globalIndex = 0; globalIndex < total; globalIndex += 1) {
    const format = FORMATS[globalIndex % FORMATS.length];
    counts.set(format, (counts.get(format) ?? 0) + 1);
  }
  return counts;
}

function assertPlan(total, shardSize) {
  let covered = 0;
  let expectedStart = 0;
  for (let start = 0; start < total; start += shardSize) {
    const end = Math.min(start + shardSize, total);
    if (start !== expectedStart || end <= start) {
      throw new Error("Generated-match shard plan contains a gap or overlap.");
    }
    covered += end - start;
    expectedStart = end;
  }
  if (covered !== total || expectedStart !== total) {
    throw new Error(`Generated-match shard plan covers ${covered}/${total} seeds.`);
  }

  const formatCounts = plannedFormatCounts(total);
  if (total === DEFAULT_GENERATED_MATCHES) {
    const expected = new Map([
      [3, 3_334],
      [6, 3_334],
      [12, 3_334],
    ]);
    if (JSON.stringify([...formatCounts]) !== JSON.stringify([...expected])) {
      throw new Error(`Unexpected default format schedule: ${JSON.stringify([...formatCounts])}.`);
    }
  }
  return formatCounts;
}

function runShard({ start, end, number, totalShards, total, timeoutMs }) {
  console.log(
    `[phase1e-generated] shard ${number}/${totalShards}: indices ${start}..${end - 1} (${end - start}/${total}; total ${total})`,
  );
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        vitestEntrypoint,
        "run",
        "--config",
        "vitest.config.ts",
        generatedTestPath,
        "--testTimeout=120000",
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          PHASE1E_GENERATED_MATCHES: String(end - start),
          PHASE1E_GENERATED_OFFSET: String(start),
          PHASE1E_GENERATED_CHILD_TEST_TIMEOUT_MS: String(CHILD_TEST_TIMEOUT_MS),
        },
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );
    let settled = false;
    let timedOut = false;
    const settle = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform !== "win32" && child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // Fall through to the direct child signal if the process group already ended.
        }
      }
      child.kill("SIGKILL");
    }, timeoutMs);
    child.once("error", (error) => {
      settle(() => {
        reject(
          new Error(
            `Generated-match shard ${number}/${totalShards} (indices ${start}..${end - 1}) failed to start; error=${error.message}`,
            { cause: error },
          ),
        );
      });
    });
    child.once("close", (code, signal) => {
      settle(() => {
        if (timedOut) {
          reject(
            new Error(
              `Generated-match shard ${number}/${totalShards} (indices ${start}..${end - 1}) timed out after ${timeoutMs}ms; signal=${signal ?? "none"}.`,
            ),
          );
          return;
        }
        if (code !== 0) {
          reject(
            new Error(
              `Generated-match shard ${number}/${totalShards} (indices ${start}..${end - 1}) exited with status ${code ?? "none"}; signal=${signal ?? "none"}.`,
            ),
          );
          return;
        }
        resolve();
      });
    });
  });
}

async function main() {
  if (process.env.PHASE1E_GENERATED_OFFSET !== undefined) {
    throw new Error(
      "PHASE1E_GENERATED_OFFSET is reserved for child shards; run the private shard command for a single slice.",
    );
  }
  const total = positiveSafeInteger(
    "PHASE1E_GENERATED_MATCHES",
    process.env.PHASE1E_GENERATED_MATCHES,
    DEFAULT_GENERATED_MATCHES,
  );
  const shardSize = positiveSafeInteger(
    "PHASE1E_GENERATED_SHARD_SIZE",
    process.env.PHASE1E_GENERATED_SHARD_SIZE,
    DEFAULT_SHARD_SIZE,
  );
  const shardTimeoutMs = positiveSafeInteger(
    "PHASE1E_GENERATED_SHARD_TIMEOUT_MS",
    process.env.PHASE1E_GENERATED_SHARD_TIMEOUT_MS,
    DEFAULT_SHARD_TIMEOUT_MS,
  );
  const totalShards = Math.ceil(total / shardSize);
  const formatCounts = assertPlan(total, shardSize);
  console.log(
    `[phase1e-generated] running ${total} deterministic seeds in ${totalShards} sequential shard(s) with a ${shardTimeoutMs}ms per-shard OS timeout; formats ${JSON.stringify(Object.fromEntries(formatCounts))}.`,
  );
  for (let start = 0, number = 1; start < total; start += shardSize, number += 1) {
    await runShard({
      start,
      end: Math.min(start + shardSize, total),
      number,
      totalShards,
      total,
      timeoutMs: shardTimeoutMs,
    });
  }
  console.log(`[phase1e-generated] passed all ${total} deterministic seeds.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
