import { mapRateLimitFallback } from "./contact.ts";
import { deriveIpLimiterKey } from "./ip.ts";
import { createAnonymousSession, verifyAnonymousSession } from "./session.ts";
import type {
  ChatSecurityResult,
  ClientIpResolution,
  DistributedRateLimiter,
  TurnstileVerifier,
} from "./types.ts";

export interface ChatSecurityServiceInput {
  sessionToken?: string | null;
  turnstileToken?: string | null;
  clientIp: ClientIpResolution;
  now?: number;
  production?: boolean;
}

export function createChatSecurityService(dependencies: {
  sessionSigningSecret: string;
  ipHmacSecret: string;
  verifier: TurnstileVerifier;
  limiter: DistributedRateLimiter;
  limits: { perMinute: number; ipDaily: number; session: number; globalDaily: number };
}) {
  return {
    async authorize(input: ChatSecurityServiceInput): Promise<ChatSecurityResult> {
      if (input.clientIp.state !== "RESOLVED") return { state: "DEPLOYMENT_VERIFICATION_REQUIRED" };
      const now = input.now ?? Date.now();
      const existing = verifyAnonymousSession(input.sessionToken, dependencies.sessionSigningSecret, now);
      let identity: { sessionId: string; expiresAt: number };
      let setCookie;

      if (existing.state === "VALID") {
        identity = existing;
      } else {
        if (!input.turnstileToken) {
          return { state: "VERIFICATION_REQUIRED", reason: "MISSING_TOKEN" };
        }
        const verification = await dependencies.verifier.verify(input.turnstileToken);
        if (verification.state !== "VERIFIED") {
          return { state: "VERIFICATION_REQUIRED", reason: verification.state };
        }
        const created = createAnonymousSession({
          secret: dependencies.sessionSigningSecret,
          now,
          production: input.production,
        });
        identity = created;
        setCookie = created.cookie;
      }

      const ipKey = deriveIpLimiterKey(input.clientIp.normalizedIp, dependencies.ipHmacSecret);
      const limited = await dependencies.limiter.consume({
        ipKey,
        sessionId: identity.sessionId,
        sessionExpiresAt: identity.expiresAt,
        now,
        limits: dependencies.limits,
      });
      if (limited.state === "DEPENDENCY_UNAVAILABLE") {
        return {
          state: "DEPENDENCY_UNAVAILABLE",
          fallback: mapRateLimitFallback(limited),
          ...(setCookie ? { setCookie } : {}),
        };
      }
      if (limited.state === "LIMITED") {
        return {
          state: "RATE_LIMITED",
          reason: limited.reason,
          ...(limited.retryAfterSeconds ? { retryAfterSeconds: limited.retryAfterSeconds } : {}),
          fallback: mapRateLimitFallback(limited),
          ...(setCookie ? { setCookie } : {}),
        };
      }
      return { state: "PASS", sessionId: identity.sessionId, ...(setCookie ? { setCookie } : {}) };
    },
  };
}
