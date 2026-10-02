import { readChatBuildSafeConfig } from "../config.ts";
import type { IngestionVersions } from "./types.ts";

const APPROVED_MODEL = "gemini-embedding-2-preview";
const APPROVED_DIMENSION = 768;

export type IngestionRuntimeConfig = {
  apiKey?: string;
  dimension: number;
  versions: IngestionVersions;
};

export function readIngestionRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
  requireLive = false,
): IngestionRuntimeConfig {
  const safe = readChatBuildSafeConfig(environment);
  const model = environment.GEMINI_EMBED_MODEL?.trim() || safe.model.embedding;
  const dimension = Number(environment.GEMINI_EMBED_DIM || safe.model.embeddingDimension);
  const embeddingVersion = environment.EMBED_VERSION?.trim() || safe.versioning.embedding;
  const ingestionVersion = environment.INGESTION_VERSION?.trim() || safe.versioning.ingestion;
  const apiKey = environment.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || undefined;

  if (model !== APPROVED_MODEL) throw new Error(`GEMINI_EMBED_MODEL must be ${APPROVED_MODEL}`);
  if (dimension !== APPROVED_DIMENSION) throw new Error(`GEMINI_EMBED_DIM must be ${APPROVED_DIMENSION}`);
  if (requireLive) {
    for (const [name, value] of [
      ["GOOGLE_GENERATIVE_AI_API_KEY", apiKey],
      ["GEMINI_EMBED_MODEL", environment.GEMINI_EMBED_MODEL],
      ["GEMINI_EMBED_DIM", environment.GEMINI_EMBED_DIM],
      ["EMBED_VERSION", environment.EMBED_VERSION],
      ["INGESTION_VERSION", environment.INGESTION_VERSION],
    ]) {
      if (!value?.trim()) throw new Error(`${name} is required for live ingestion`);
    }
  }

  return {
    apiKey,
    dimension,
    versions: { embeddingModel: model, embeddingVersion, ingestionVersion },
  };
}
