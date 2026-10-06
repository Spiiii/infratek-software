export type TurnstileVerificationResult =
  | { state: "VERIFIED" }
  | { state: "INVALID" }
  | { state: "TIMEOUT" }
  | { state: "UNAVAILABLE" };

export interface TurnstileVerifier {
  verify(token: string): Promise<TurnstileVerificationResult>;
}

export type ClientIpResolution =
  | { state: "RESOLVED"; normalizedIp: string }
  | { state: "DEPLOYMENT_VERIFICATION_REQUIRED" };

export interface ClientIpResolver {
  resolve(request: Request): ClientIpResolution;
}

export type RateLimitReason =
  | "IP_MINUTE_LIMIT"
  | "IP_DAILY_LIMIT"
  | "SESSION_LIMIT"
  | "GLOBAL_DAILY_LIMIT";

export type DistributedRateLimitResult =
  | { state: "ALLOWED" }
  | { state: "LIMITED"; reason: RateLimitReason; retryAfterSeconds?: number }
  | { state: "DEPENDENCY_UNAVAILABLE" };

export interface DistributedRateLimitInput {
  ipKey: string;
  sessionId: string;
  sessionExpiresAt: number;
  now: number;
  limits: {
    perMinute: number;
    ipDaily: number;
    session: number;
    globalDaily: number;
  };
}

export interface DistributedRateLimiter {
  consume(input: DistributedRateLimitInput): Promise<DistributedRateLimitResult>;
}

export type ContactFallbackKind =
  | "RETRY_LATER"
  | "CONTACT_FALLBACK"
  | "SERVICE_FALLBACK_WITH_CONTACT";

export interface ContactFallbackMetadata {
  kind: ContactFallbackKind;
  contact?: { phone: string; email: string };
}

export interface SessionCookieContract {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
    expires: Date;
  };
}

export type ChatSecurityResult =
  | { state: "PASS"; sessionId: string; setCookie?: SessionCookieContract }
  | { state: "DEPLOYMENT_VERIFICATION_REQUIRED" }
  | {
      state: "VERIFICATION_REQUIRED";
      reason: "MISSING_TOKEN" | "INVALID" | "TIMEOUT" | "UNAVAILABLE";
    }
  | {
      state: "RATE_LIMITED";
      reason: RateLimitReason;
      retryAfterSeconds?: number;
      fallback: ContactFallbackMetadata;
      setCookie?: SessionCookieContract;
    }
  | {
      state: "DEPENDENCY_UNAVAILABLE";
      fallback: ContactFallbackMetadata;
      setCookie?: SessionCookieContract;
    };
