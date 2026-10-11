import type { AnswerDecision, DependencyFallbackReason } from "../decision/types.ts";
import type { ChatGenerationAdapter, ChatGenerationFailure } from "../generation/types.ts";
import {
  mapCitedPublicSources,
  validateGeneratedCitations,
  type CitationInvalidReason,
  type CitedPublicSource,
} from "../grounding/citations.ts";
import { buildGroundingContext, type ContextBuildFailure } from "../grounding/context.ts";
import { buildChatSystemPrompt } from "../prompt.ts";
import type { PreparedRetrievalQuery } from "../retrieval/query.ts";
import { readChatBuildSafeConfig } from "../config.ts";
import {
  validateProtectedOutput,
  type UnsupportedOutputCategory,
} from "../safety/output.ts";

export type GroundedAnswerFallbackReason =
  | DependencyFallbackReason
  | ChatGenerationFailure
  | "INVALID_CONTEXT"
  | "INVALID_GROUNDED_OUTPUT"
  | "INPUT_BUDGET_EXCEEDED"
  | "GENERATION_CALL_BUDGET_EXCEEDED";

// Conservative local estimate: UTF-8 bytes / 3 avoids a provider/token-count request.
export function estimateChatInputTokens(parts: readonly string[]): number {
  return Math.ceil(new TextEncoder().encode(parts.join("\n")).length / 3);
}

export function isChatInputWithinBudget(parts: readonly string[], budget: number): boolean {
  return estimateChatInputTokens(parts) <= budget;
}

export type GroundedAnswerResult =
  | { state: "ANSWER"; answer: string; sources: CitedPublicSource[]; policyVersion: string }
  | { state: "NO_ANSWER"; policyVersion: string }
  | { state: "NO_CONTEXT"; policyVersion: string }
  | { state: "CALIBRATION_REQUIRED"; policyVersion: string }
  | {
      state: "SAFE_FALLBACK";
      reason: "UNSUPPORTED_OUTPUT";
      unsupported: true;
      categories: UnsupportedOutputCategory[];
      policyVersion: string;
    }
  | {
      state: "DEPENDENCY_FALLBACK";
      reason: GroundedAnswerFallbackReason;
      policyVersion: string;
      contextReason?: ContextBuildFailure;
      groundingReason?: CitationInvalidReason;
    };

export async function generateGroundedAnswer(options: {
  decision: AnswerDecision;
  question: PreparedRetrievalQuery;
  generator: ChatGenerationAdapter;
  additionalInputForBudget?: string;
  environment?: Record<string, string | undefined>;
}): Promise<GroundedAnswerResult> {
  const { decision, generator } = options;

  if (decision.state === "NO_CONTEXT") {
    return { state: "NO_CONTEXT", policyVersion: decision.policyVersion };
  }
  if (decision.state === "DEPENDENCY_FALLBACK") {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: decision.reason,
      policyVersion: decision.policyVersion,
    };
  }
  if (decision.state === "CALIBRATION_REQUIRED") {
    return { state: "CALIBRATION_REQUIRED", policyVersion: decision.policyVersion };
  }

  const context = buildGroundingContext(decision.sources);
  if (context.state !== "READY") {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_CONTEXT",
      contextReason: context.reason,
      policyVersion: decision.policyVersion,
    };
  }

  const systemPrompt = buildChatSystemPrompt(context.content);
  const effectiveInput = [
    systemPrompt,
    options.additionalInputForBudget ?? "",
    options.question.value,
  ];
  const inputTokenBudget = readChatBuildSafeConfig(options.environment).limits.inputTokenBudget;
  if (!isChatInputWithinBudget(effectiveInput, inputTokenBudget)) {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INPUT_BUDGET_EXCEEDED",
      policyVersion: decision.policyVersion,
    };
  }

  const callsBefore = generator.calls;
  const generation = await generator.generate({
    systemPrompt,
    question: options.question.value,
  });
  const physicalCalls = generator.calls - callsBefore;
  if (physicalCalls !== 1) {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "GENERATION_CALL_BUDGET_EXCEEDED",
      policyVersion: decision.policyVersion,
    };
  }
  if (generation.state === "FAILURE") {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: generation.reason,
      policyVersion: decision.policyVersion,
    };
  }

  if (generation.output.status === "NO_CONTEXT") {
    return { state: "NO_ANSWER", policyVersion: decision.policyVersion };
  }

  const answer = generation.output.answer.trim();
  const suppliedLabels = new Set(context.labels);
  const requestedLabels = generation.output.citations;
  if (requestedLabels.some((label) => !suppliedLabels.has(label))) {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_GROUNDED_OUTPUT",
      groundingReason: "CITATION_MISMATCH",
      policyVersion: decision.policyVersion,
    };
  }
  if (/\[\s*[sS]\s*\d+\s*\]|\b[sS]\s*\d+\b/u.test(answer)) {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_GROUNDED_OUTPUT",
      groundingReason: "MALFORMED_CITATION",
      policyVersion: decision.policyVersion,
    };
  }

  const renderedAnswer = `${answer} ${requestedLabels.map((label) => `[${label}]`).join(" ")}`.trim();
  const validation = validateGeneratedCitations(renderedAnswer, context.labels);
  if (validation.state === "INVALID") {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_GROUNDED_OUTPUT",
      groundingReason: validation.reason,
      policyVersion: decision.policyVersion,
    };
  }
  if (validation.state === "VALID_NO_ANSWER") {
    return { state: "NO_ANSWER", policyVersion: decision.policyVersion };
  }

  const outputSafety = validateProtectedOutput(
    renderedAnswer,
    context.sources.map(({ source }) => source.content).join("\n"),
  );
  if (outputSafety.state === "SAFE_FALLBACK") {
    return {
      state: "SAFE_FALLBACK",
      reason: "UNSUPPORTED_OUTPUT",
      unsupported: true,
      categories: outputSafety.categories,
      policyVersion: decision.policyVersion,
    };
  }

  return {
    state: "ANSWER",
    answer: renderedAnswer,
    sources: mapCitedPublicSources(context.sources, validation.citedLabels),
    policyVersion: decision.policyVersion,
  };
}
