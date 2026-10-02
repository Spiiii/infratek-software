import type { EmbeddingProvider, EmbeddingProviderStats } from "./types.ts";

type EmbedContentResponse = { embeddings?: Array<{ values?: number[] }> };
type EmbedContent = (params: {
  model: string;
  contents: string;
  config: { outputDimensionality: number; httpOptions?: { fetch?: typeof fetch } };
}) => Promise<EmbedContentResponse>;

type RetryMetadata = { status?: number; reason?: string; retryDelayMs?: number };
const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function durationToMilliseconds(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.ceil(Number(match[1]) * 1_000) : undefined;
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export function inspectEmbeddingError(
  error: unknown,
  responseRetryDelayMs?: number,
): RetryMetadata {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const metadata: RetryMetadata = {
    status: typeof record.status === "number" ? record.status : undefined,
    retryDelayMs: responseRetryDelayMs,
  };
  if (typeof record.message !== "string") return metadata;
  try {
    const parsed = JSON.parse(record.message) as {
      error?: { status?: string; details?: Array<Record<string, unknown>> };
    };
    metadata.reason = parsed.error?.status;
    const retryInfo = parsed.error?.details?.find(
      (detail) => typeof detail["@type"] === "string" && detail["@type"].endsWith("RetryInfo"),
    );
    metadata.retryDelayMs ??= durationToMilliseconds(retryInfo?.retryDelay);
  } catch {
    // Some SDK/network errors are not JSON. Status still determines retryability.
  }
  return metadata;
}

export class EmbeddingProviderError extends Error {
  readonly providerRequests: number;
  readonly status?: number;
  readonly reason?: string;
  readonly retryDelayMs?: number;

  constructor(error: unknown, metadata: RetryMetadata, providerRequests: number) {
    super("Embedding provider request failed", { cause: error });
    this.name = "EmbeddingProviderError";
    this.providerRequests = providerRequests;
    this.status = metadata.status;
    this.reason = metadata.reason;
    this.retryDelayMs = metadata.retryDelayMs;
  }
}

export function createGeminiEmbeddingProvider(options: {
  apiKey: string;
  model: string;
  dimension: number;
  requestDelayMs: number;
  maxRetries: number;
  retryBaseMs: number;
  retryMaxMs: number;
  embedContent?: EmbedContent;
  sleep?: (milliseconds: number) => Promise<void>;
}): EmbeddingProvider {
  if (!options.apiKey.trim()) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");
  let callCount = 0;
  let hasAttemptedRequest = false;
  const stats: EmbeddingProviderStats = {
    providerRequests: 0,
    successfulEmbeddings: 0,
    responses429: 0,
    responses5xx: 0,
    retryAttempts: 0,
    finalFailures: 0,
  };
  const wait = options.sleep ?? sleep;
  const clientPromise = options.embedContent
    ? Promise.resolve(options.embedContent)
    : import("@google/genai").then(({ GoogleGenAI }) => {
        const client = new GoogleGenAI({ apiKey: options.apiKey });
        return client.models.embedContent.bind(client.models) as EmbedContent;
      });

  return {
    get calls() {
      return callCount;
    },
    get stats() {
      return { ...stats };
    },
    async embed(input) {
      const embedContent = await clientPromise;
      let delayBeforeAttempt = hasAttemptedRequest ? options.requestDelayMs : 0;

      for (let retry = 0; ; retry += 1) {
        if (delayBeforeAttempt > 0) await wait(delayBeforeAttempt);
        let responseRetryDelayMs: number | undefined;
        const fetchWithRetryMetadata: typeof fetch = async (request, init) => {
          const response = await fetch(request, init);
          const retryAfterMs = response.headers.get("retry-after-ms");
          const parsedRetryAfterMs = retryAfterMs === null ? undefined : Number(retryAfterMs);
          responseRetryDelayMs =
            Number.isFinite(parsedRetryAfterMs) && parsedRetryAfterMs! >= 0
              ? parsedRetryAfterMs
              : parseRetryAfter(response.headers.get("retry-after"));
          return response;
        };

        callCount += 1;
        stats.providerRequests += 1;
        hasAttemptedRequest = true;
        try {
          const response = await embedContent({
            model: options.model,
            contents: input,
            config: {
              outputDimensionality: options.dimension,
              ...(options.embedContent ? {} : { httpOptions: { fetch: fetchWithRetryMetadata } }),
            },
          });
          const values = response.embeddings?.[0]?.values;
          if (!values || values.length !== options.dimension) {
            throw new Error("Embedding provider returned an unexpected dimension");
          }
          stats.successfulEmbeddings += 1;
          return values;
        } catch (error) {
          const metadata = inspectEmbeddingError(error, responseRetryDelayMs);
          if (metadata.status === 429) stats.responses429 += 1;
          if (metadata.status !== undefined && metadata.status >= 500 && metadata.status <= 599) {
            stats.responses5xx += 1;
          }
          const retryable =
            metadata.status === 429 ||
            (metadata.status !== undefined && metadata.status >= 500 && metadata.status <= 599);
          if (!retryable || retry >= options.maxRetries) {
            stats.finalFailures += 1;
            throw new EmbeddingProviderError(error, metadata, callCount);
          }
          stats.retryAttempts += 1;
          const exponentialBackoff = Math.min(
            options.retryBaseMs * 2 ** retry,
            options.retryMaxMs,
          );
          delayBeforeAttempt = Math.min(
            Math.max(metadata.retryDelayMs ?? exponentialBackoff, options.requestDelayMs),
            options.retryMaxMs,
          );
        }
      }
    },
  };
}
