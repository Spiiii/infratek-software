import type { RetrievalResult } from "../retrieval/types.ts";
import type { AnswerDecision, RelevanceDecisionPolicy } from "./types.ts";
import { preCalibrationDecisionPolicy } from "./policy.ts";

export const PREVIEW_MVP_POLICY_VERSION = "preview-presales-mvp-p5.3-v1" as const;
export const PREVIEW_MVP_VECTOR_THRESHOLD = 0.722924077393;

function canonicalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/đ/giu, "d")
    .toLowerCase().replace(/[^a-z0-9%]+/gu, " ").trim().replace(/\s+/gu, " ");
}

export function requiresHumanHandoff(question: string): boolean {
  const value = canonicalize(question);
  const commercialCommitment = /\b(?:bao gia|gia chinh xac|gia co dinh|chi phi cu the|hop dong|dieu khoan hop dong|sla|service level|pham vi du an chinh xac|exact project scope|delivery commitment|cam ket giao hang|cam ket tien do|contract|binding price|fixed price|exact price|quote)\b/u.test(value);
  const guarantee = /\b(?:cam ket|bao dam|dam bao|chac chan|guarantee|guaranteed|warranty)\b/u.test(value);
  const universalSubject = /\b(?:moi|tat ca|toan bo)\s+(?:khach hang|du an|trien khai|doanh nghiep)|\b(?:all|every)\s+(?:customer|customers|client|clients|deployment|deployments|project|projects)\b/u.test(value);
  const measurableOutcome = /\b\d+(?:[.,]\d+)?\s*(?:%|percent|phan tram|ms|giay|phut|gio|ngay|tuan|thang|nam)\b/u.test(value) ||
    /\b(?:uptime|accuracy|do chinh xac|roi|hoan von|hieu suat|performance|deadline|timeline|ket qua)\b/u.test(value);
  return commercialCommitment || guarantee || (universalSubject && measurableOutcome);
}

export class PreviewMvpDecisionPolicy implements RelevanceDecisionPolicy {
  readonly version = PREVIEW_MVP_POLICY_VERSION;

  preflight(context: { question: string }): AnswerDecision | undefined {
    return requiresHumanHandoff(context.question)
      ? { state: "HUMAN_HANDOFF", policyVersion: this.version }
      : undefined;
  }

  decide(result: RetrievalResult, context?: { question: string }): AnswerDecision {
    if (!context?.question) {
      return { state: "DEPENDENCY_FALLBACK", reason: "INVALID_RETRIEVAL_STATE", policyVersion: this.version };
    }
    const preflight = this.preflight(context);
    if (preflight) return preflight;
    if (result.status.mode === "UNAVAILABLE") {
      return { state: "DEPENDENCY_FALLBACK", reason: "RETRIEVAL_UNAVAILABLE", policyVersion: this.version };
    }
    if (result.status.mode !== "HYBRID") {
      return { state: "DEPENDENCY_FALLBACK", reason: "INVALID_RETRIEVAL_STATE", policyVersion: this.version };
    }
    if (result.status.candidateState !== "HAS_CANDIDATES" || result.sources.length === 0) {
      return { state: "NO_CONTEXT", reason: "STRUCTURAL_ZERO", policyVersion: this.version };
    }
    const similarities = result.sources.map((item) => item.diagnostics.vectorSimilarity)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (similarities.length === 0 || Math.max(...similarities) < PREVIEW_MVP_VECTOR_THRESHOLD) {
      return { state: "NO_CONTEXT", reason: "STRUCTURAL_ZERO", policyVersion: this.version };
    }
    return { state: "ANSWER", sources: result.sources, policyVersion: this.version };
  }
}

export const previewMvpDecisionPolicy = new PreviewMvpDecisionPolicy();

export function selectRuntimeDecisionPolicy(input: {
  previewMvpEnabled: boolean;
  vercelEnvironment?: string;
}): RelevanceDecisionPolicy {
  return input.previewMvpEnabled && input.vercelEnvironment === "preview"
    ? previewMvpDecisionPolicy
    : preCalibrationDecisionPolicy;
}
