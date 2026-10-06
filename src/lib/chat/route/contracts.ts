import { z } from "zod";

import type { CitedPublicSource } from "../grounding/citations.ts";

export const publicChatRequestSchema = z.object({
  question: z.string().max(500).transform((value) => value.trim()).pipe(z.string().min(1)),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
}).strict();

export type PublicChatResponse =
  | { status: "ANSWER"; answer: string; sources: CitedPublicSource[]; conversationId: string }
  | { status: "NO_CONTEXT"; fallback: string; conversationId: string }
  | { status: "CALIBRATION_REQUIRED" }
  | { status: "DEPENDENCY_FALLBACK"; fallback: string }
  | { status: "INVALID_REQUEST" }
  | { status: "VERIFICATION_REQUIRED" }
  | { status: "RATE_LIMITED"; retryAfterSeconds?: number; fallback: string }
  | { status: "SAFE_FALLBACK"; conversationId?: string };

export const NO_CONTEXT_FALLBACK =
  "Hiện Infratek chưa có đủ thông tin để trả lời câu hỏi này. Vui lòng liên hệ đội ngũ Infratek để được hỗ trợ.";
export const DEPENDENCY_FALLBACK =
  "Dịch vụ tư vấn tự động đang tạm thời không khả dụng. Vui lòng thử lại sau.";
