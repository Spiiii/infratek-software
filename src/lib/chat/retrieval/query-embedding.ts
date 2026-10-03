import { readChatBuildSafeConfig, readChatRuntimeSecrets } from "../config.ts";
import {
  createGeminiEmbeddingProvider,
  EmbeddingProviderError,
  EmbeddingResponseError,
} from "../ingestion/embed.ts";
import type { EmbeddingProvider } from "../ingestion/types.ts";
import { INTERACTIVE_EMBEDDING_CONFIG } from "./config.ts";
import type { PreparedRetrievalQuery } from "./query.ts";

export type QueryEmbeddingFailure =
  | "RATE_LIMIT"
  | "PROVIDER_5XX"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "WRONG_DIMENSION";

export class QueryEmbeddingError extends Error {
  readonly kind: QueryEmbeddingFailure;
  readonly status?: number;
  readonly reason?: string;

  constructor(
    kind: QueryEmbeddingFailure,
    status?: number,
    reason?: string,
  ) {
    super("Interactive query embedding failed");
    this.name = "QueryEmbeddingError";
    this.kind = kind;
    this.status = status;
    this.reason = reason;
  }
}

function mapProviderError(error: EmbeddingProviderError): QueryEmbeddingError {
  if (error.status === 429) return new QueryEmbeddingError("RATE_LIMIT", 429, error.reason);
  if (error.status !== undefined && error.status >= 500 && error.status <= 599) {
    return new QueryEmbeddingError("PROVIDER_5XX", error.status, error.reason);
  }
  if (error.cause instanceof EmbeddingResponseError) {
    return new QueryEmbeddingError(
      error.cause.code === "WRONG_DIMENSION" ? "WRONG_DIMENSION" : "INVALID_RESPONSE",
    );
  }
  return new QueryEmbeddingError("PROVIDER_UNAVAILABLE", error.status, error.reason);
}

export function createQueryEmbeddingAdapter(options: {
  provider: EmbeddingProvider;
  dimension: number;
}) {
  return {
    get calls() {
      return options.provider.calls;
    },
    async embed(query: PreparedRetrievalQuery): Promise<number[]> {
      let vector: number[];
      try {
        vector = await options.provider.embed(query.value);
      } catch (error) {
        if (error instanceof EmbeddingProviderError) throw mapProviderError(error);
        throw new QueryEmbeddingError("PROVIDER_UNAVAILABLE");
      }

      if (!Array.isArray(vector)) throw new QueryEmbeddingError("INVALID_RESPONSE");
      if (vector.length !== options.dimension) throw new QueryEmbeddingError("WRONG_DIMENSION");
      if (vector.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
        throw new QueryEmbeddingError("INVALID_RESPONSE");
      }
      return vector;
    },
  };
}

export function createLiveQueryEmbeddingAdapter(
  environment: Record<string, string | undefined> = process.env,
) {
  const config = readChatBuildSafeConfig(environment);
  const secrets = readChatRuntimeSecrets(environment);
  const provider = createGeminiEmbeddingProvider({
    apiKey: secrets.googleGenerativeAiApiKey,
    model: config.model.embedding,
    dimension: config.model.embeddingDimension,
    requestDelayMs: INTERACTIVE_EMBEDDING_CONFIG.requestDelayMs,
    maxRetries: INTERACTIVE_EMBEDDING_CONFIG.maxRetries,
    retryBaseMs: 1,
    retryMaxMs: 1,
  });
  return createQueryEmbeddingAdapter({
    provider,
    dimension: config.model.embeddingDimension,
  });
}
