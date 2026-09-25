import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const command = process.argv[2];
const targetArg = process.argv.find((argument) => argument.startsWith("--target="));
const target = targetArg?.split("=")[1] ?? "development";
const targetVariables = {
  development: "DATABASE_URL_UNPOOLED",
  preview: "DATABASE_URL_PREVIEW_UNPOOLED",
  production: "DATABASE_URL_PRODUCTION_UNPOOLED",
} as const;

nextEnv.loadEnvConfig(process.cwd());

if (!(target in targetVariables)) {
  throw new Error(`Unknown migration target: ${target}`);
}
const databaseVariable = targetVariables[target as keyof typeof targetVariables];
const directDatabaseUrl = process.env[databaseVariable];

if (!directDatabaseUrl) {
  throw new Error(`${databaseVariable} must be set for ${target} migrations`);
}

if (!command?.startsWith("migrate")) {
  throw new Error("A Payload migration command is required");
}

if (
  target === "production" &&
  command !== "migrate:status" &&
  process.env.CONFIRM_PRODUCTION_MIGRATION !== "production"
) {
  throw new Error(
    "Set CONFIRM_PRODUCTION_MIGRATION=production for a write migration against Production",
  );
}

const payloadBin = fileURLToPath(
  new URL("../node_modules/payload/bin.js", import.meta.url)
);
const result = spawnSync(
  process.execPath,
  [payloadBin, command, ...process.argv.slice(3).filter((argument) => !argument.startsWith("--target="))],
  {
    env: { ...process.env, DATABASE_URL: directDatabaseUrl },
    stdio: "inherit",
  }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
