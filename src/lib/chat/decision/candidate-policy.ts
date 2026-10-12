import type { RetrievalStatus } from "../retrieval/types.ts";

export const RELEVANCE_CANDIDATE_POLICY_VERSION =
  "retrieval-vector-risk-gate-p5.3-candidate-v1" as const;
export const RELEVANCE_CANDIDATE_VECTOR_THRESHOLD = 0.722924077393;

export type BoundaryRisk =
  | "SUBJECTIVE_SUPERLATIVE"
  | "PERSONALIZED_SUFFICIENCY"
  | "TIME_TO_VALUE_COMMITMENT";

export type RelevanceCandidateInput = {
  question: string;
  status: RetrievalStatus;
  vectorSimilarities: readonly number[];
};

export type RelevanceCandidateDecision = {
  state: "ANSWER" | "NO_CONTEXT" | "DEPENDENCY_FALLBACK";
  reason: "VECTOR_THRESHOLD_MET" | "BELOW_VECTOR_THRESHOLD" | "BOUNDARY_RISK"
    | "NO_CANDIDATES" | "RETRIEVAL_NOT_HYBRID" | "INVALID_VECTOR_EVIDENCE";
  policyVersion: typeof RELEVANCE_CANDIDATE_POLICY_VERSION;
  maxVectorSimilarity?: number;
  boundaryRisk?: BoundaryRisk;
};

function canonicalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/đ/giu, "d")
    .toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}

/** Deterministic and fail-closed: this classifier never calls an LLM. */
export function classifyBoundaryRisk(question: string): BoundaryRisk | undefined {
  const value = canonicalize(question);
  if (/\b(?:thanh cong|tot|hieu qua) nhat\b/u.test(value)) return "SUBJECTIVE_SUPERLATIVE";
  if (
    /\bdu\b.*\b(?:cho|voi)\b.*\b(?:cua toi|toi)\b/u.test(value) ||
    /\bphu hop\b.*\b(?:doanh nghiep|truong hop|nhu cau)\b.*\b(?:cua toi|toi)\b/u.test(value)
  ) return "PERSONALIZED_SUFFICIENCY";
  if (/\bbao lau\b.*\b(?:hieu qua|ket qua|hoan von|roi)\b/u.test(value)) {
    return "TIME_TO_VALUE_COMMITMENT";
  }
  return undefined;
}

/** Offline candidate only. Production remains on PreCalibrationDecisionPolicy. */
export function evaluateRelevanceCandidate(input: RelevanceCandidateInput): RelevanceCandidateDecision {
  const base = { policyVersion: RELEVANCE_CANDIDATE_POLICY_VERSION } as const;
  if (input.status.mode !== "HYBRID") {
    return { ...base, state: "DEPENDENCY_FALLBACK", reason: "RETRIEVAL_NOT_HYBRID" };
  }
  if (input.status.candidateState !== "HAS_CANDIDATES") {
    return { ...base, state: "NO_CONTEXT", reason: "NO_CANDIDATES" };
  }
  const similarities = input.vectorSimilarities.filter(
    (value) => Number.isFinite(value) && value >= -1 && value <= 1,
  );
  if (similarities.length === 0) {
    return { ...base, state: "NO_CONTEXT", reason: "INVALID_VECTOR_EVIDENCE" };
  }
  const maxVectorSimilarity = Math.max(...similarities);
  const boundaryRisk = classifyBoundaryRisk(input.question);
  if (boundaryRisk) {
    return { ...base, state: "NO_CONTEXT", reason: "BOUNDARY_RISK", maxVectorSimilarity, boundaryRisk };
  }
  if (maxVectorSimilarity < RELEVANCE_CANDIDATE_VECTOR_THRESHOLD) {
    return { ...base, state: "NO_CONTEXT", reason: "BELOW_VECTOR_THRESHOLD", maxVectorSimilarity };
  }
  return { ...base, state: "ANSWER", reason: "VECTOR_THRESHOLD_MET", maxVectorSimilarity };
}
