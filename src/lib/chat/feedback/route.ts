import { z } from "zod";
import { authenticateChatSession } from "../security/request-session.ts";

const requestSchema = z.object({ conversationId: z.string().uuid(), vote: z.union([z.literal(1), z.literal(-1)]) }).strict();
type FeedbackService = { submit(input: { conversationId: string; sessionId: string; vote: 1 | -1 }): Promise<{ state: "RECORDED" | "DUPLICATE" | "NOT_ELIGIBLE" | "FAILURE" }> };
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export function createFeedbackPostHandler(input: { service: FeedbackService; environment?: Record<string, string | undefined> }) {
  return async function POST(request: Request) {
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return json({ status: "INVALID_REQUEST" }, 400);
    let raw: unknown;
    try { raw = await request.json(); } catch { return json({ status: "INVALID_REQUEST" }, 400); }
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return json({ status: "INVALID_REQUEST" }, 400);
    const session = authenticateChatSession(request, input.environment);
    if (session.state === "UNAVAILABLE") return json({ status: "DEPENDENCY_UNAVAILABLE" }, 503);
    if (session.state !== "VALID") return json({ status: "FORBIDDEN" }, 403);
    const result = await input.service.submit({ ...parsed.data, sessionId: session.sessionId });
    if (result.state === "RECORDED") return json({ status: "RECORDED" }, 201);
    if (result.state === "DUPLICATE") return json({ status: "ALREADY_RECORDED" }, 200);
    if (result.state === "NOT_ELIGIBLE") return json({ status: "NOT_ELIGIBLE" }, 404);
    return json({ status: "DEPENDENCY_UNAVAILABLE" }, 503);
  };
}
