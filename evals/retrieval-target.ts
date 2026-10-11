import { assertMigrationTarget } from "../scripts/migration-target-guard.ts";

export function assertRetrievalPreviewDatabase(
  environment: Record<string, string | undefined>,
): string {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for live retrieval evaluation");
  assertMigrationTarget("preview", databaseUrl);
  let database: string;
  try {
    database = new URL(databaseUrl).pathname.replace(/^\//u, "");
  } catch {
    throw new Error("DATABASE_URL is invalid");
  }
  if (database !== "neondb") throw new Error("Retrieval evaluation requires Preview database neondb");
  return databaseUrl;
}
