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

export type GroundedAnswerFallbackReason =
  | DependencyFallbackReason
  | ChatGenerationFailure
  | "INVALID_CONTEXT"
  | "INVALID_GROUNDED_OUTPUT"
  | "GENERATION_CALL_BUDGET_EXCEEDED";

export type GroundedAnswerResult =
  | { state: "ANSWER"; answer: string; sources: CitedPublicSource[]; policyVersion: string }
  | { state: "NO_ANSWER"; policyVersion: string }
  | { state: "NO_CONTEXT"; policyVersion: string }
  | { state: "CALIBRATION_REQUIRED"; policyVersion: string }
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

  const callsBefore = generator.calls;
  const generation = await generator.generate({
    systemPrompt: buildChatSystemPrompt(context.content),
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

  const validation = validateGeneratedCitations(generation.text, context.labels);
  if (validation.state === "VALID_NO_ANSWER") {
    return { state: "NO_ANSWER", policyVersion: decision.policyVersion };
  }
  if (validation.state === "INVALID") {
    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_GROUNDED_OUTPUT",
      groundingReason: validation.reason,
      policyVersion: decision.policyVersion,
    };
  }

  return {
    state: "ANSWER",
    answer: generation.text,
    sources: mapCitedPublicSources(context.sources, validation.citedLabels),
    policyVersion: decision.policyVersion,
  };
}
