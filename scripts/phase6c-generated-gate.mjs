import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const benchmarkOnly = process.env.PHASE6C_GENERATED_BENCHMARK === "1";
const seedCount = benchmarkOnly ? 1 : 10;
const shardCount = benchmarkOnly ? 1 : 4;
const matrixCellsPerSeed = 3 * 3 * 3;
const shardTimeoutMs = Number(process.env.PHASE6C_GENERATED_SHARD_TIMEOUT_MS ?? 240_000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function partition(total, count) {
  const baseSize = Math.floor(total / count);
  const remainder = total % count;
  let nextStart = 0;
  return Array.from({ length: count }, (_, index) => {
    const shardSize = baseSize + (index < remainder ? 1 : 0);
    const shard = { start: nextStart, count: shardSize };
    nextStart += shardSize;
    return shard;
  });
}

function runShard(number, seedOffset, seedsInShard) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [
        "./node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "vitest.config.ts",
        "packages/test-fixtures/tests/phase6c-generated-ai.test.ts",
        `--testTimeout=${shardTimeoutMs}`,
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          PHASE6C_GENERATED_SEED_OFFSET: String(seedOffset),
          PHASE6C_GENERATED_SEEDS: String(seedsInShard),
          PHASE6C_GENERATED_SHARD: String(number),
          PHASE6C_GENERATED_SHARDS: String(shardCount),
        },
        stdio: "inherit",
      },
    );
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(
        new Error(`Phase 6C generated shard ${number}/${shardCount} exceeded ${shardTimeoutMs}ms.`),
      );
    }, shardTimeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolvePromise();
      else {
        rejectPromise(
          new Error(
            `Phase 6C generated shard ${number}/${shardCount} failed (code=${code}, signal=${signal}).`,
          ),
        );
      }
    });
  });
}

async function assertCompleteMatrixDirection(shards) {
  const personalityBanks = new Map([
    ["timid", 0],
    ["monk", 0],
    ["gambler", 0],
  ]);
  for (let index = 0; index < shards.length; index += 1) {
    const path = resolve(
      repositoryRoot,
      "output/phase-6c/reports",
      `phase6c-simulation-report-shard-${index + 1}-of-${shards.length}.json`,
    );
    const report = JSON.parse(await readFile(path, "utf8"));
    for (const cell of report.cells) {
      personalityBanks.set(
        cell.personality,
        personalityBanks.get(cell.personality) + cell.bank.count,
      );
    }
  }
  assert(
    personalityBanks.get("gambler") <= personalityBanks.get("monk"),
    `Phase 6C complete-matrix personality direction failed: Gambler Banks ${personalityBanks.get("gambler")}, Monk Banks ${personalityBanks.get("monk")}.`,
  );
}

async function main() {
  assert(Number.isInteger(shardTimeoutMs) && shardTimeoutMs > 0, "Invalid Phase 6C shard timeout.");
  const shards = partition(seedCount, shardCount);
  assert(
    shards.every((shard) => shard.count > 0),
    "Phase 6C generated shards must each contain at least one complete matrix seed.",
  );
  console.log(
    `[phase6c-generated] ${benchmarkOnly ? "benchmarking" : "validating"} ${seedCount * matrixCellsPerSeed} complete matches (${seedCount} full 3-personality × 3-difficulty × 3-format seed matrices) in ${shardCount} sequential host-bounded shard(s); timeout ${shardTimeoutMs}ms per shard.`,
  );
  for (const [index, shard] of shards.entries()) {
    console.log(
      `[phase6c-generated] shard ${index + 1}/${shardCount}: seed offset ${shard.start}, ${shard.count * matrixCellsPerSeed} matches.`,
    );
    await runShard(index + 1, shard.start, shard.count);
  }
  await assertCompleteMatrixDirection(shards);
  console.log(
    `[phase6c-generated] ${benchmarkOnly ? "benchmark" : "initial 270-match matrix"} passed.`,
  );
}

await main();
