import type { RetrievalResult, RetrievalStatus } from "../retrieval/types.ts";
import {
  PRE_CALIBRATION_POLICY_VERSION,
  type AnswerDecision,
  type RelevanceDecisionPolicy,
} from "./types.ts";

function isStructuralZero(status: RetrievalStatus): boolean {
  return (
    status.mode === "HYBRID" &&
    status.candidateState === "NO_CANDIDATES" &&
    status.relevanceState === "NO_CONTEXT"
  );
}

function isUnavailable(status: RetrievalStatus): boolean {
  return (
    status.mode === "UNAVAILABLE" &&
    status.candidateState === "UNKNOWN" &&
    status.relevanceState === "UNAVAILABLE"
  );
}

function isCandidateDecision(status: RetrievalStatus): boolean {
  if (status.mode === "UNAVAILABLE") return false;

  if (status.candidateState === "HAS_CANDIDATES") {
    return status.relevanceState === "UN_CALIBRATED" || status.relevanceState === "ACCEPTED";
  }

  return (
    (status.mode === "FTS_ONLY" || status.mode === "VECTOR_ONLY") &&
    status.candidateState === "NO_CANDIDATES" &&
    status.relevanceState === "UN_CALIBRATED"
  );
}

export class PreCalibrationDecisionPolicy implements RelevanceDecisionPolicy {
  readonly version = PRE_CALIBRATION_POLICY_VERSION;

  decide(result: RetrievalResult): AnswerDecision {
    if (isStructuralZero(result.status)) {
      return {
        state: "NO_CONTEXT",
        reason: "STRUCTURAL_ZERO",
        policyVersion: this.version,
      };
    }

    if (isUnavailable(result.status)) {
      return {
        state: "DEPENDENCY_FALLBACK",
        reason: "RETRIEVAL_UNAVAILABLE",
        policyVersion: this.version,
      };
    }

    if (isCandidateDecision(result.status)) {
      return {
        state: "CALIBRATION_REQUIRED",
        sources: result.sources,
        policyVersion: this.version,
      };
    }

    return {
      state: "DEPENDENCY_FALLBACK",
      reason: "INVALID_RETRIEVAL_STATE",
      policyVersion: this.version,
    };
  }
}

export const preCalibrationDecisionPolicy = new PreCalibrationDecisionPolicy();

export function decideAnswer(result: RetrievalResult): AnswerDecision {
  return preCalibrationDecisionPolicy.decide(result);
}
