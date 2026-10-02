import { readChatBuildSafeConfig } from "../config.ts";
import type { IngestionVersions } from "./types.ts";

const APPROVED_MODEL = "gemini-embedding-2";
const APPROVED_DIMENSION = 768;

export type IngestionRuntimeConfig = {
  apiKey?: string;
  dimension: number;
  requestDelayMs: number;
  maxRetries: number;
  retryBaseMs: number;
  retryMaxMs: number;
  versions: IngestionVersions;
};

function readInteger(
  environment: Record<string, string | undefined>,
  name: string,
  fallback: number,
  minimum: number,
): number {
  const raw = environment[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return value;
}

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
  const requestDelayMs = readInteger(environment, "EMBED_REQUEST_DELAY_MS", 1_000, 0);
  const maxRetries = readInteger(environment, "EMBED_MAX_RETRIES", 3, 0);
  const retryBaseMs = readInteger(environment, "EMBED_RETRY_BASE_MS", 5_000, 1);
  const retryMaxMs = readInteger(environment, "EMBED_RETRY_MAX_MS", 60_000, 1);

  if (model !== APPROVED_MODEL) throw new Error(`GEMINI_EMBED_MODEL must be ${APPROVED_MODEL}`);
  if (dimension !== APPROVED_DIMENSION) throw new Error(`GEMINI_EMBED_DIM must be ${APPROVED_DIMENSION}`);
  if (retryMaxMs < retryBaseMs) {
    throw new Error("EMBED_RETRY_MAX_MS must be >= EMBED_RETRY_BASE_MS");
  }
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
    requestDelayMs,
    maxRetries,
    retryBaseMs,
    retryMaxMs,
    versions: { embeddingModel: model, embeddingVersion, ingestionVersion },
  };
}
