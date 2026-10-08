import { CHAT_SESSION_COOKIE_NAME, verifyAnonymousSession } from "./session.ts";

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(item.slice(separator + 1).trim()); } catch { return undefined; }
  }
  return undefined;
}

export function authenticateChatSession(request: Request, environment: Record<string, string | undefined> = process.env, now = Date.now()) {
  const secret = environment.CHAT_SESSION_SIGNING_SECRET?.trim();
  if (!secret) return { state: "UNAVAILABLE" as const };
  const verified = verifyAnonymousSession(readCookie(request, CHAT_SESSION_COOKIE_NAME), secret, now);
  return verified.state === "VALID"
    ? { state: "VALID" as const, sessionId: verified.sessionId }
    : { state: "INVALID" as const };
}
