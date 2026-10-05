import { readChatBuildSafeConfig, readChatRuntimeSecrets } from "../config.ts";
import type {
  ChatGenerationAdapter,
  ChatGenerationResult,
  GeminiGenerateContent,
} from "./types.ts";

class GenerationTimeoutError extends Error {
  constructor() {
    super("Chat generation timed out");
    this.name = "GenerationTimeoutError";
  }
}

function providerStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as Record<string, unknown>).status;
  return typeof status === "number" ? status : undefined;
}

function failure(error: unknown): ChatGenerationResult {
  if (error instanceof GenerationTimeoutError) {
    return { state: "FAILURE", reason: "PROVIDER_TIMEOUT" };
  }
  const status = providerStatus(error);
  if (status === 429) return { state: "FAILURE", reason: "PROVIDER_RATE_LIMITED" };
  return { state: "FAILURE", reason: "PROVIDER_UNAVAILABLE" };
}

export function createGeminiChatAdapter(options: {
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  generateContent: GeminiGenerateContent;
}): ChatGenerationAdapter {
  if (!options.model.trim()) throw new Error("Chat model is required");
  if (!Number.isInteger(options.maxOutputTokens) || options.maxOutputTokens <= 0) {
    throw new Error("Chat output token limit must be a positive integer");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("Chat generation timeout must be supplied as a positive integer");
  }

  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async generate(input): Promise<ChatGenerationResult> {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      calls += 1;

      try {
        const response = await Promise.race([
          options.generateContent({
            model: options.model,
            contents: input.question,
            config: {
              systemInstruction: input.systemPrompt,
              maxOutputTokens: options.maxOutputTokens,
              abortSignal: controller.signal,
            },
          }),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new GenerationTimeoutError());
            }, options.timeoutMs);
          }),
        ]);
        const text = response.text?.trim();
        return text
          ? { state: "SUCCESS", text }
          : { state: "FAILURE", reason: "INVALID_PROVIDER_RESPONSE" };
      } catch (error) {
        return failure(error);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

export function createLiveGeminiChatAdapter(options: {
  timeoutMs: number;
  environment?: Record<string, string | undefined>;
}): ChatGenerationAdapter {
  const environment = options.environment ?? process.env;
  const config = readChatBuildSafeConfig(environment);
  const secrets = readChatRuntimeSecrets(environment);
  const clientPromise = import("@google/genai").then(
    ({ GoogleGenAI }) => new GoogleGenAI({ apiKey: secrets.googleGenerativeAiApiKey }),
  );

  return createGeminiChatAdapter({
    model: config.model.chat,
    maxOutputTokens: config.limits.outputMaxTokens,
    timeoutMs: options.timeoutMs,
    generateContent: async (parameters) => (await clientPromise).models.generateContent(parameters),
  });
}
