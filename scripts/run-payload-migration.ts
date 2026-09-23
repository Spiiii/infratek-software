import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const directDatabaseUrl = process.env.DATABASE_URL_UNPOOLED;
const command = process.argv[2];

if (!directDatabaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED must be set for Payload migrations");
}

if (!command?.startsWith("migrate")) {
  throw new Error("A Payload migration command is required");
}

const payloadBin = fileURLToPath(
  new URL("../node_modules/payload/bin.js", import.meta.url)
);
const result = spawnSync(
  process.execPath,
  [payloadBin, command, ...process.argv.slice(3)],
  {
    env: { ...process.env, DATABASE_URL: directDatabaseUrl },
    stdio: "inherit",
  }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
