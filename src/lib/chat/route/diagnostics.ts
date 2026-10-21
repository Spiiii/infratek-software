import type { UnsupportedOutputCategory } from "../safety/output.ts";

const RULE_BY_CATEGORY: Record<UnsupportedOutputCategory, string> = {
  UNSUPPORTED_NUMBER: "protected_output.unsupported_number",
  UNSUPPORTED_PHONE: "protected_output.unsupported_phone",
  UNSUPPORTED_EMAIL: "protected_output.unsupported_email",
  UNSUPPORTED_PROPER_NAME: "protected_output.unsupported_proper_name",
  UNSUPPORTED_RISKY_CLAIM: "protected_output.unsupported_risky_claim",
};

export type SafeFallbackDiagnosticInput = {
  correlationId: string;
  failureStage: "PROTECTED_OUTPUT_VALIDATION";
  unsupportedCategories: readonly UnsupportedOutputCategory[];
};

export type DependencyFailureStage =
  | "SECURITY"
  | "CONVERSATION"
  | "QUERY_PREPARATION"
  | "RETRIEVAL"
  | "GROUNDING_CONTEXT"
  | "GENERATION"
  | "CITATION_VALIDATION"
  | "PERSISTENCE"
  | "RUNTIME";

export type DependencyFailureReasonCode =
  | "DEPLOYMENT_VERIFICATION_FAILURE"
  | "SECURITY_DEPENDENCY_UNAVAILABLE"
  | "CONVERSATION_LOOKUP_FAILURE"
  | "CONVERSATION_HISTORY_FAILURE"
  | "QUERY_PREPARATION_FAILURE"
  | "RETRIEVAL_EXECUTION_FAILURE"
  | "RETRIEVAL_UNAVAILABLE"
  | "RETRIEVAL_STATE_INVALID"
  | "CONTEXT_INVALID"
  | "INPUT_BUDGET_EXCEEDED"
  | "GENERATION_CALL_BUDGET_EXCEEDED"
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_PROVIDER_FAILURE"
  | "GEMINI_TIMEOUT"
  | "GEMINI_INVALID_RESPONSE"
  | "CITATION_INVALID"
  | "PERSISTENCE_FAILURE"
  | "UNEXPECTED_RUNTIME_FAILURE";

export type DependencyFallbackDiagnosticInput = {
  correlationId: string;
  failureStage: DependencyFailureStage;
  sanitizedReasonCode: DependencyFailureReasonCode;
};

export type SafeFallbackDiagnosticSink = {
  emit(input: SafeFallbackDiagnosticInput): void;
  emitDependencyFallback(input: DependencyFallbackDiagnosticInput): void;
};

export function createPreviewSafeFallbackDiagnosticSink(
  environment: Record<string, string | undefined>,
  write: (value: string) => void = console.warn,
  now: () => Date = () => new Date(),
): SafeFallbackDiagnosticSink | undefined {
  if (
    environment.VERCEL_ENV !== "preview" ||
    environment.CHAT_PREVIEW_MVP_ENABLED !== "true"
  ) {
    return undefined;
  }

  const rawVersion = environment.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const deploymentVersion = /^[a-f0-9]{7,40}$/u.test(rawVersion) ? rawVersion : "UNAVAILABLE";

  return {
    emit(input) {
      try {
        write(JSON.stringify({
          event: "CHAT_SAFE_FALLBACK_DIAGNOSTIC",
          requestCorrelationId: input.correlationId,
          failureStage: input.failureStage,
          validatorRuleIdentifiers: input.unsupportedCategories.map(
            (category) => RULE_BY_CATEGORY[category],
          ),
          unsupportedCategories: [...input.unsupportedCategories],
          deploymentVersion,
          timestamp: now().toISOString(),
        }));
      } catch {
        // Preview diagnostics must never alter public chatbot behavior.
      }
    },
    emitDependencyFallback(input) {
      try {
        write(JSON.stringify({
          event: "CHAT_DEPENDENCY_FALLBACK_DIAGNOSTIC",
          requestCorrelationId: input.correlationId,
          failureStage: input.failureStage,
          sanitizedReasonCode: input.sanitizedReasonCode,
          httpStatus: 503,
          deploymentVersion,
          timestamp: now().toISOString(),
        }));
      } catch {
        // Preview diagnostics must never alter public chatbot behavior.
      }
    },
  };
}

export function emitUnexpectedRuntimeDiagnostic(
  environment: Record<string, string | undefined>,
  correlationId: string,
  write?: (value: string) => void,
  now?: () => Date,
): void {
  createPreviewSafeFallbackDiagnosticSink(environment, write, now)?.emitDependencyFallback({
    correlationId,
    failureStage: "RUNTIME",
    sanitizedReasonCode: "UNEXPECTED_RUNTIME_FAILURE",
  });
}
