import nextEnv from "@next/env";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { assertMigrationTarget } from "./migration-target-guard.ts";
import { createGeminiEmbeddingProvider } from "../src/lib/chat/ingestion/embed.ts";
import { RagChunkRepository } from "../src/lib/chat/ingestion/repository.ts";
import { runReindex } from "../src/lib/chat/ingestion/reindex.ts";
import { readIngestionRuntimeConfig } from "../src/lib/chat/ingestion/runtime-config.ts";
import { readPublishedDocuments } from "../src/lib/chat/ingestion/sources.ts";

nextEnv.loadEnvConfig(process.cwd());
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
assertMigrationTarget("preview", databaseUrl);

const runtime = readIngestionRuntimeConfig(process.env, !dryRun);
const payload = await getPayload({ config });

try {
  const documents = await readPublishedDocuments(payload);
  const repository = new RagChunkRepository(payload);
  const provider = dryRun
    ? undefined
    : createGeminiEmbeddingProvider({
        apiKey: runtime.apiKey!,
        model: runtime.versions.embeddingModel,
        dimension: runtime.dimension,
      });
  const summary = await runReindex({
    documents,
    repository,
    versions: runtime.versions,
    dimension: runtime.dimension,
    dryRun,
    provider,
  });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await payload.db.destroy?.();
}
