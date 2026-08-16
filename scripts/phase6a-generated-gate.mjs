import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const totalTrials = 360;
const shardCount = 4;
const shardSize = totalTrials / shardCount;
const shardTimeoutMs = 120_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runShard(number, offset) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [
        "./node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "vitest.config.ts",
        "packages/test-fixtures/tests/phase6a-generated-ai.test.ts",
        "--testTimeout=120000",
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          PHASE6A_GENERATED_OFFSET: String(offset),
          PHASE6A_GENERATED_TRIALS: String(shardSize),
        },
        stdio: "inherit",
      },
    );
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(
        new Error(`Phase 6A generated shard ${number}/${shardCount} exceeded ${shardTimeoutMs}ms.`),
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
            `Phase 6A generated shard ${number}/${shardCount} failed (code=${code}, signal=${signal}).`,
          ),
        );
      }
    });
  });
}

async function main() {
  assert(
    Number.isInteger(shardSize),
    "Phase 6A generated trials must divide evenly by shard count.",
  );
  console.log(
    `[phase6a-generated] ${totalTrials} complete deterministic trials in ${shardCount} sequential shards of ${shardSize}; bounded to preserve the hosted 60-minute gate.`,
  );
  for (let number = 1; number <= shardCount; number += 1) {
    await runShard(number, (number - 1) * shardSize);
  }
  console.log("[phase6a-generated] passed all deterministic trials.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
