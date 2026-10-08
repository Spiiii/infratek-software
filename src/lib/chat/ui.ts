import type { CitedPublicSource } from "./grounding/citations.ts";
import type { PublicChatResponse } from "./route/contracts.ts";

export const CHAT_QUESTION_MAX_LENGTH = 500;

export type ChatUiOutcome = {
  kind: PublicChatResponse["status"] | "MALFORMED_RESPONSE" | "NETWORK_FAILURE";
  text: string;
  sources: CitedPublicSource[];
  conversationId?: string;
  showContact: boolean;
  canRetry: boolean;
  retryAfterSeconds?: number;
};

const STATUS = new Set<PublicChatResponse["status"]>([
  "ANSWER", "NO_CONTEXT", "CALIBRATION_REQUIRED", "DEPENDENCY_FALLBACK",
  "INVALID_REQUEST", "VERIFICATION_REQUIRED", "RATE_LIMITED", "SAFE_FALLBACK",
]);

export function validateChatQuestion(value: string): "VALID" | "EMPTY" | "TOO_LONG" {
  const trimmed = value.trim();
  if (!trimmed) return "EMPTY";
  return value.length <= CHAT_QUESTION_MAX_LENGTH ? "VALID" : "TOO_LONG";
}

export function buildPublicChatRequest(question: string, turnstileToken?: string) {
  return {
    question: question.trim(),
    ...(turnstileToken ? { turnstileToken } : {}),
  };
}

export function shouldSubmitFromKeyboard(input: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}): boolean {
  return input.key === "Enter" && !input.shiftKey && !input.isComposing;
}

export function canSubmitChat(question: string, busy: boolean): boolean {
  return !busy && validateChatQuestion(question) === "VALID";
}

export function shouldAutomaticallyVerify(status: string, automaticRetries: number): boolean {
  return status === "VERIFICATION_REQUIRED" && automaticRetries === 0;
}

export function mapPublicChatResponse(value: unknown): ChatUiOutcome {
  if (!value || typeof value !== "object") return malformed();
  const response = value as Record<string, unknown>;
  if (typeof response.status !== "string" || !STATUS.has(response.status as PublicChatResponse["status"])) {
    return malformed();
  }

  switch (response.status) {
    case "ANSWER":
      if (
        typeof response.answer !== "string" ||
        !Array.isArray(response.sources) ||
        !response.sources.every(isPublicSource)
      ) return malformed();
      return {
        kind: "ANSWER",
        text: response.answer,
        sources: response.sources as CitedPublicSource[],
        conversationId: typeof response.conversationId === "string" ? response.conversationId : undefined,
        showContact: false,
        canRetry: false,
      };
    case "NO_CONTEXT":
      return fallbackOutcome("NO_CONTEXT", response.fallback, response.conversationId, true, false);
    case "CALIBRATION_REQUIRED":
      return {
        kind: "CALIBRATION_REQUIRED",
        text: "Trợ lý đang được hiệu chỉnh để trả lời chính xác hơn. Bạn có thể liên hệ trực tiếp với Infratek trong thời gian này.",
        sources: [], showContact: true, canRetry: false,
      };
    case "DEPENDENCY_FALLBACK":
      return fallbackOutcome("DEPENDENCY_FALLBACK", response.fallback, undefined, true, true);
    case "INVALID_REQUEST":
      return {
        kind: "INVALID_REQUEST", text: "Câu hỏi chưa hợp lệ. Vui lòng kiểm tra và thử lại.",
        sources: [], showContact: false, canRetry: false,
      };
    case "VERIFICATION_REQUIRED":
      return {
        kind: "VERIFICATION_REQUIRED", text: "Vui lòng xác minh để tiếp tục gửi câu hỏi.",
        sources: [], showContact: false, canRetry: true,
      };
    case "RATE_LIMITED":
      return {
        kind: "RATE_LIMITED",
        text: typeof response.fallback === "string" ? response.fallback : "Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau.",
        sources: [], showContact: true, canRetry: false,
        retryAfterSeconds: typeof response.retryAfterSeconds === "number" && response.retryAfterSeconds > 0
          ? response.retryAfterSeconds : undefined,
      };
    case "SAFE_FALLBACK":
      return {
        kind: "SAFE_FALLBACK",
        text: "Mình chưa thể hiển thị câu trả lời này một cách an toàn. Vui lòng liên hệ Infratek để được hỗ trợ.",
        sources: [],
        conversationId: typeof response.conversationId === "string" ? response.conversationId : undefined,
        showContact: true, canRetry: false,
      };
  }
  return malformed();
}

function isPublicSource(value: unknown): value is CitedPublicSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.label === "string" && /^S[1-6]$/u.test(source.label) &&
    typeof source.title === "string" &&
    Array.isArray(source.headingPath) && source.headingPath.every((part) => typeof part === "string") &&
    typeof source.url === "string" && (/^\/(?!\/)/u.test(source.url) || /^https:\/\//u.test(source.url))
  );
}

function fallbackOutcome(
  kind: "NO_CONTEXT" | "DEPENDENCY_FALLBACK",
  fallback: unknown,
  conversationId: unknown,
  showContact: boolean,
  canRetry: boolean,
): ChatUiOutcome {
  if (typeof fallback !== "string") return malformed();
  return {
    kind, text: fallback, sources: [], showContact, canRetry,
    conversationId: typeof conversationId === "string" ? conversationId : undefined,
  };
}

function malformed(): ChatUiOutcome {
  return {
    kind: "MALFORMED_RESPONSE",
    text: "Phản hồi từ dịch vụ không hợp lệ. Vui lòng thử lại sau.",
    sources: [], showContact: true, canRetry: true,
  };
}

export type CitationPart =
  | { type: "text"; value: string }
  | { type: "citation"; value: string; source: CitedPublicSource };

export function splitGroundedCitations(text: string, sources: readonly CitedPublicSource[]): CitationPart[] {
  const byLabel = new Map(sources.map((source) => [source.label, source]));
  const parts: CitationPart[] = [];
  let offset = 0;
  for (const match of text.matchAll(/\[S\d+\]/gu)) {
    const index = match.index ?? 0;
    if (index > offset) parts.push({ type: "text", value: text.slice(offset, index) });
    const marker = match[0];
    const source = byLabel.get(marker.slice(1, -1) as CitedPublicSource["label"]);
    parts.push(source
      ? { type: "citation", value: marker, source }
      : { type: "text", value: marker });
    offset = index + marker.length;
  }
  if (offset < text.length) parts.push({ type: "text", value: text.slice(offset) });
  return parts;
}
