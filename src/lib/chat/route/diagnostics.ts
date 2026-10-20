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

export type SafeFallbackDiagnosticSink = {
  emit(input: SafeFallbackDiagnosticInput): void;
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
    },
  };
}
