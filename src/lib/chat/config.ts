import { z } from "zod";

export const UNCALIBRATED_THRESHOLD_VERSION = "UN-CALIBRATED" as const;

const positiveInteger = z.coerce.number().int().positive();

const buildSafeSchema = z.object({
  CHAT_MODEL: z.string().trim().min(1).default("gemini-3.5-flash-lite"),
  EMBED_MODEL: z.string().trim().min(1).default("gemini-embedding-2"),
  EMBED_DIMENSION: positiveInteger.max(3072).default(768),
  CHAT_MODEL_VERSION: z.string().trim().min(1).default("gemini-3.5-flash-lite-p5.1"),
  EMBED_VERSION: z.string().trim().min(1).default("gemini-embedding-2-768-p5.3"),
  PROMPT_VERSION: z.string().trim().min(1).default("p5.1"),
  THRESHOLD_VERSION: z.literal(UNCALIBRATED_THRESHOLD_VERSION).default(UNCALIBRATED_THRESHOLD_VERSION),
  INGESTION_VERSION: z.string().trim().min(1).default("p5.1"),
  CHAT_PER_MINUTE: positiveInteger.default(6),
  CHAT_IP_DAILY_CAP: positiveInteger.default(50),
  CHAT_SESSION_CAP: positiveInteger.default(30),
  CHAT_DAILY_CAP: positiveInteger.default(150),
  CHAT_INPUT_MAX_LENGTH: positiveInteger.default(500),
  CHAT_CONTEXT_MESSAGES: positiveInteger.default(6),
  CHAT_OUTPUT_MAX_TOKENS: positiveInteger.default(256),
  CHAT_CONVERSATION_RETENTION_DAYS: positiveInteger.default(30),
  CHAT_UNANSWERED_RETENTION_DAYS: positiveInteger.default(90),
  CHAT_FEEDBACK_RETENTION_DAYS: positiveInteger.default(90),
});

const runtimeSecretsSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().min(1),
});

export type ChatBuildSafeConfig = {
  model: { chat: string; embedding: string; embeddingDimension: number };
  versioning: {
    chatModel: string;
    embedding: string;
    prompt: string;
    threshold: typeof UNCALIBRATED_THRESHOLD_VERSION;
    ingestion: string;
  };
  limits: {
    perMinute: number;
    ipDaily: number;
    session: number;
    daily: number;
    inputMaxLength: number;
    contextMessages: number;
    outputMaxTokens: number;
  };
  retentionDays: { conversations: number; unanswered: number; feedback: number };
};

export type ChatRuntimeSecrets = { googleGenerativeAiApiKey: string };

export function readChatBuildSafeConfig(
  environment: Record<string, string | undefined> = process.env,
): ChatBuildSafeConfig {
  const value = buildSafeSchema.parse(environment);

  return {
    model: {
      chat: value.CHAT_MODEL,
      embedding: value.EMBED_MODEL,
      embeddingDimension: value.EMBED_DIMENSION,
    },
    versioning: {
      chatModel: value.CHAT_MODEL_VERSION,
      embedding: value.EMBED_VERSION,
      prompt: value.PROMPT_VERSION,
      threshold: value.THRESHOLD_VERSION,
      ingestion: value.INGESTION_VERSION,
    },
    limits: {
      perMinute: value.CHAT_PER_MINUTE,
      ipDaily: value.CHAT_IP_DAILY_CAP,
      session: value.CHAT_SESSION_CAP,
      daily: value.CHAT_DAILY_CAP,
      inputMaxLength: value.CHAT_INPUT_MAX_LENGTH,
      contextMessages: value.CHAT_CONTEXT_MESSAGES,
      outputMaxTokens: value.CHAT_OUTPUT_MAX_TOKENS,
    },
    retentionDays: {
      conversations: value.CHAT_CONVERSATION_RETENTION_DAYS,
      unanswered: value.CHAT_UNANSWERED_RETENTION_DAYS,
      feedback: value.CHAT_FEEDBACK_RETENTION_DAYS,
    },
  };
}

// Deliberately lazy: P5.1 builds and tests do not require a provider secret.
export function readChatRuntimeSecrets(
  environment: Record<string, string | undefined> = process.env,
): ChatRuntimeSecrets {
  const value = runtimeSecretsSchema.parse(environment);
  return { googleGenerativeAiApiKey: value.GOOGLE_GENERATIVE_AI_API_KEY };
}
