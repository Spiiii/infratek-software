import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertMigrationTarget } from "./migration-target-guard";

const previewUrl =
  "postgresql://user:secret@ep-nameless-leaf-b3fc4hoi.c-4.ap-southeast-1.aws.neon.tech/db?sslmode=require";
const productionUrl =
  "postgresql://user:secret@ep-still-fog-b3h6yj1y.c-4.ap-southeast-1.aws.neon.tech/db?sslmode=require";

assert.doesNotThrow(() => assertMigrationTarget("preview", previewUrl));
assert.doesNotThrow(() => assertMigrationTarget("production", productionUrl));
assert.throws(
  () => assertMigrationTarget("preview", productionUrl),
  /Refusing preview migration/,
);
assert.throws(
  () => assertMigrationTarget("production", previewUrl),
  /Refusing production migration/,
);

// Integration check: the runner must exit before spawning Payload when a
// variable named for Preview actually contains the Production endpoint.
const tsxBin = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const runner = fileURLToPath(new URL("./run-payload-migration.ts", import.meta.url));
const result = spawnSync(process.execPath, [tsxBin, runner, "migrate:status", "--target=preview"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...process.env,
    DATABASE_URL_PREVIEW_UNPOOLED: productionUrl,
  },
});

assert.notEqual(result.status, 0);
assert.match(`${result.stdout}\n${result.stderr}`, /Refusing preview migration/);
console.log("PASS migration target guard rejects Production URL for Preview");

