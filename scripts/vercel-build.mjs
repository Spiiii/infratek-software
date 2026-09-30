import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (process.env.PHASE4_SEED_ON_BUILD === "confirmed") {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "codex/phase-4-case-studies") {
    throw new Error("Refusing Phase 4 seed outside the dedicated Preview branch.");
  }
  run("npm", ["run", "payload:seed", "--", "--allow-conflicts"]);
}

run("npm", ["exec", "next", "build"]);
