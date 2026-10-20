import type { RetrievalResult, SelectedSource } from "../retrieval/types.ts";

export const PRE_CALIBRATION_POLICY_VERSION = "pre-calibration-p5.5-v1" as const;

export type DependencyFallbackReason =
  | "RETRIEVAL_UNAVAILABLE"
  | "INVALID_RETRIEVAL_STATE";

export type AnswerDecision =
  | {
      state: "ANSWER";
      sources: readonly SelectedSource[];
      policyVersion: string;
    }
  | {
      state: "NO_CONTEXT";
      reason: "STRUCTURAL_ZERO";
      policyVersion: string;
    }
  | {
      state: "DEPENDENCY_FALLBACK";
      reason: DependencyFallbackReason;
      policyVersion: string;
    }
  | {
      state: "CALIBRATION_REQUIRED";
      sources: readonly SelectedSource[];
      policyVersion: string;
    }
  | {
      state: "HUMAN_HANDOFF";
      policyVersion: string;
    };

export type PublicChatStatus =
  | "ANSWER"
  | "NO_CONTEXT"
  | "CALIBRATION_REQUIRED"
  | "DEPENDENCY_FALLBACK"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "VERIFICATION_REQUIRED"
  | "SAFE_FALLBACK"
  | "HUMAN_HANDOFF";

export interface RelevanceDecisionPolicy {
  readonly version: string;
  preflight?(context: { question: string }): AnswerDecision | undefined;
  decide(result: RetrievalResult, context?: { question: string }): AnswerDecision;
}
