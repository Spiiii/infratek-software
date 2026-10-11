import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import type { SourceLabel } from "../retrieval/types.ts";

export type GeminiGenerateContent = (
  parameters: GenerateContentParameters,
) => Promise<GenerateContentResponse>;

export type ChatGenerationInput = {
  systemPrompt: string;
  question: string;
};

export type StructuredGenerationOutput = {
  status: "ANSWER" | "NO_CONTEXT";
  answer: string;
  citations: SourceLabel[];
};

export type ChatGenerationFailure =
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "INVALID_PROVIDER_RESPONSE";

export type ChatGenerationResult =
  | { state: "SUCCESS"; output: StructuredGenerationOutput }
  | { state: "FAILURE"; reason: ChatGenerationFailure };

export interface ChatGenerationAdapter {
  readonly calls: number;
  generate(input: ChatGenerationInput): Promise<ChatGenerationResult>;
}
