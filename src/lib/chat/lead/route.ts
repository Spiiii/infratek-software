import { chatLeadSchema } from "../../validations.ts";
import { authenticateChatSession } from "../security/request-session.ts";

type LeadService = { submit(input: {
  name: string; email?: string; phone?: string; company: string; message?: string; conversationId?: string; sessionId: string;
}): Promise<{ state: "SAVED" | "SAVED_NOTIFICATION_FAILED" | "FORBIDDEN" | "FAILURE" }> };
export interface LeadRateLimiter { consume(sessionId: string, now?: number): boolean; }

export function createMemoryLeadRateLimiter(maximum = 5, windowMs = 600_000): LeadRateLimiter {
  const entries = new Map<string, number[]>();
  return { consume(sessionId, now = Date.now()) {
    const active = (entries.get(sessionId) ?? []).filter((time) => time > now - windowMs);
    if (active.length >= maximum) { entries.set(sessionId, active); return false; }
    entries.set(sessionId, [...active, now]);
    return true;
  } };
}

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export function createLeadPostHandler(input: {
  service: LeadService; limiter: LeadRateLimiter; environment?: Record<string, string | undefined>;
}) {
  return async function POST(request: Request) {
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return json({ status: "INVALID_REQUEST" }, 400);
    let raw: unknown;
    try { raw = await request.json(); } catch { return json({ status: "INVALID_REQUEST" }, 400); }
    const parsed = chatLeadSchema.safeParse(raw);
    if (!parsed.success) return json({ status: "INVALID_REQUEST" }, 400);
    if (parsed.data.website) return json({ status: "ACCEPTED" }, 202);
    const session = authenticateChatSession(request, input.environment);
    if (session.state === "UNAVAILABLE") return json({ status: "DEPENDENCY_UNAVAILABLE" }, 503);
    if (session.state !== "VALID") return json({ status: "FORBIDDEN" }, 403);
    if (!input.limiter.consume(session.sessionId)) return json({ status: "RATE_LIMITED" }, 429);
    const { website: _website, ...lead } = parsed.data;
    void _website;
    const result = await input.service.submit({
      ...lead,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      message: lead.message || undefined,
      sessionId: session.sessionId,
    });
    if (result.state === "SAVED") return json({ status: "SAVED" }, 201);
    if (result.state === "SAVED_NOTIFICATION_FAILED") return json({ status: "SAVED_NOTIFICATION_FAILED" }, 202);
    if (result.state === "FORBIDDEN") return json({ status: "FORBIDDEN" }, 403);
    return json({ status: "DEPENDENCY_UNAVAILABLE" }, 503);
  };
}
