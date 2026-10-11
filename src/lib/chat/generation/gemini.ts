import { readChatBuildSafeConfig, readChatRuntimeSecrets } from "../config.ts";
import { z } from "zod";
import type {
  ChatGenerationAdapter,
  ChatGenerationResult,
  GeminiGenerateContent,
} from "./types.ts";

export const CHAT_GENERATION_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "answer", "citations"],
  properties: {
    status: { type: "string", enum: ["ANSWER", "NO_CONTEXT"] },
    answer: { type: "string" },
    citations: {
      type: "array",
      items: { type: "string", enum: ["S1", "S2", "S3", "S4", "S5", "S6"] },
      maxItems: 6,
    },
  },
} as const;

const structuredOutputSchema = z.object({
  status: z.enum(["ANSWER", "NO_CONTEXT"]),
  answer: z.string(),
  citations: z.array(z.enum(["S1", "S2", "S3", "S4", "S5", "S6"])).max(6),
}).strict().superRefine((value, context) => {
  if (value.status === "ANSWER") {
    if (!value.answer.trim()) {
      context.addIssue({ code: "custom", message: "ANSWER requires content", path: ["answer"] });
    }
    if (value.citations.length === 0) {
      context.addIssue({ code: "custom", message: "ANSWER requires citations", path: ["citations"] });
    }
    if (new Set(value.citations).size !== value.citations.length) {
      context.addIssue({ code: "custom", message: "Citations must be unique", path: ["citations"] });
    }
  } else if (value.answer !== "" || value.citations.length !== 0) {
    context.addIssue({ code: "custom", message: "NO_CONTEXT requires an empty answer and citations" });
  }
});

function parseStructuredOutput(text: string | undefined): ChatGenerationResult {
  if (!text?.trim()) return { state: "FAILURE", reason: "INVALID_PROVIDER_RESPONSE" };
  try {
    const parsed = structuredOutputSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? { state: "SUCCESS", output: parsed.data }
      : { state: "FAILURE", reason: "INVALID_PROVIDER_RESPONSE" };
  } catch {
    return { state: "FAILURE", reason: "INVALID_PROVIDER_RESPONSE" };
  }
}

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
              responseMimeType: "application/json",
              responseJsonSchema: CHAT_GENERATION_RESPONSE_SCHEMA,
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
        return parseStructuredOutput(response.text);
      } catch (error) {
        return failure(error);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

export function createLiveGeminiChatAdapter(
  environment: Record<string, string | undefined> = process.env,
): ChatGenerationAdapter {
  const config = readChatBuildSafeConfig(environment);
  const secrets = readChatRuntimeSecrets(environment);
  const clientPromise = import("@google/genai").then(
    ({ GoogleGenAI }) => new GoogleGenAI({ apiKey: secrets.googleGenerativeAiApiKey }),
  );

  return createGeminiChatAdapter({
    model: config.model.chat,
    maxOutputTokens: config.limits.outputMaxTokens,
    timeoutMs: config.limits.generationTimeoutMs,
    generateContent: async (parameters) => (await clientPromise).models.generateContent(parameters),
  });
}
