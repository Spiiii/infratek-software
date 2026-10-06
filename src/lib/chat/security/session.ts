import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { SessionCookieContract } from "./types.ts";

export const CHAT_SESSION_COOKIE_NAME = "infratek_chat_session";
export const CHAT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_VERSION = "v1";

interface SessionPayload {
  sid: string;
  exp: number;
}

export type SessionVerification =
  | { state: "VALID"; sessionId: string; expiresAt: number }
  | { state: "INVALID" };

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createAnonymousSession(input: {
  secret: string;
  now?: number;
  production?: boolean;
}): {
  sessionId: string;
  expiresAt: number;
  token: string;
  cookie: SessionCookieContract;
} {
  const now = input.now ?? Date.now();
  const sessionId = randomBytes(32).toString("base64url");
  const expiresAt = now + CHAT_SESSION_TTL_SECONDS * 1000;
  const encodedPayload = Buffer.from(
    JSON.stringify({ sid: sessionId, exp: expiresAt } satisfies SessionPayload),
  ).toString("base64url");
  const signedPart = `${TOKEN_VERSION}.${encodedPayload}`;
  const token = `${signedPart}.${sign(signedPart, input.secret).toString("base64url")}`;

  return {
    sessionId,
    expiresAt,
    token,
    cookie: {
      name: CHAT_SESSION_COOKIE_NAME,
      value: token,
      options: {
        httpOnly: true,
        secure: input.production ?? process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: CHAT_SESSION_TTL_SECONDS,
        expires: new Date(expiresAt),
      },
    },
  };
}

export function verifyAnonymousSession(
  token: string | null | undefined,
  secret: string,
  now = Date.now(),
): SessionVerification {
  if (!token) return { state: "INVALID" };

  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { state: "INVALID" };

    const signedPart = `${parts[0]}.${parts[1]}`;
    const suppliedSignature = Buffer.from(parts[2], "base64url");
    const expectedSignature = sign(signedPart, secret);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return { state: "INVALID" };
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (
      typeof payload.sid !== "string" ||
      payload.sid.length < 32 ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= now
    ) {
      return { state: "INVALID" };
    }

    return { state: "VALID", sessionId: payload.sid, expiresAt: payload.exp };
  } catch {
    return { state: "INVALID" };
  }
}
