import assert from "node:assert/strict";
import test from "node:test";

import { readChatBuildSafeConfig, readChatSecuritySecrets } from "../config.ts";
import { CHAT_CONTACT, mapRateLimitFallback } from "./contact.ts";
import {
  deploymentGatedClientIpResolver,
  deriveIpLimiterKey,
  normalizeTrustedClientIp,
  vercelClientIpResolver,
} from "./ip.ts";
import { CHAT_RATE_LIMIT_SCRIPT, createUpstashRateLimiter } from "./rate-limit.ts";
import { createChatSecurityService } from "./service.ts";
import {
  CHAT_SESSION_TTL_SECONDS,
  createAnonymousSession,
  verifyAnonymousSession,
} from "./session.ts";
import { createTurnstileVerifier } from "./turnstile.ts";
import type {
  DistributedRateLimiter,
  DistributedRateLimitInput,
  DistributedRateLimitResult,
  TurnstileVerificationResult,
} from "./types.ts";

const NOW = Date.UTC(2026, 9, 6, 12, 0, 0);
const SIGNING_SECRET = "session-only-test-secret";
const IP_SECRET = "ip-only-test-secret";
const LIMITS = { perMinute: 6, ipDaily: 50, session: 30, globalDaily: 150 };

test("session is opaque, signed, valid for exactly seven days, and uses hardened cookie flags", () => {
  const created = createAnonymousSession({ secret: SIGNING_SECRET, now: NOW, production: true });
  assert.equal(created.expiresAt - NOW, CHAT_SESSION_TTL_SECONDS * 1000);
  assert.match(created.sessionId, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(created.sessionId.includes("@"), false);
  assert.deepEqual(verifyAnonymousSession(created.token, SIGNING_SECRET, NOW), {
    state: "VALID",
    sessionId: created.sessionId,
    expiresAt: created.expiresAt,
  });
  assert.deepEqual(created.cookie.options, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: CHAT_SESSION_TTL_SECONDS,
    expires: new Date(created.expiresAt),
  });
  assert.equal(createAnonymousSession({ secret: SIGNING_SECRET, now: NOW, production: false }).cookie.options.secure, false);
});

test("session rejects malformed, tampered, expired, and wrong-secret tokens without throwing", () => {
  const created = createAnonymousSession({ secret: SIGNING_SECRET, now: NOW });
  const [version, payload, signature] = created.token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sid: string; exp: number };
  const changedId = Buffer.from(JSON.stringify({ ...decoded, sid: `${decoded.sid}x` })).toString("base64url");
  const changedExpiry = Buffer.from(JSON.stringify({ ...decoded, exp: decoded.exp + 1 })).toString("base64url");
  for (const token of [
    "bad",
    `${version}.${changedId}.${signature}`,
    `${version}.${changedExpiry}.${signature}`,
    `${version}.${payload}.${signature.slice(0, -1)}x`,
  ]) {
    assert.deepEqual(verifyAnonymousSession(token, SIGNING_SECRET, NOW), { state: "INVALID" });
  }
  assert.deepEqual(verifyAnonymousSession(created.token, "wrong-secret", NOW), { state: "INVALID" });
  assert.deepEqual(verifyAnonymousSession(created.token, SIGNING_SECRET, created.expiresAt), { state: "INVALID" });
});

test("security configuration uses locked defaults and dedicated required secrets", () => {
  const config = readChatBuildSafeConfig({});
  assert.equal(config.limits.sessionTtlSeconds, 604_800);
  assert.equal(config.limits.turnstileTimeoutMs, 5_000);
  assert.throws(() => readChatBuildSafeConfig({ CHAT_SESSION_TTL_SECONDS: "1" }));
  assert.throws(() => readChatSecuritySecrets({}));
  assert.deepEqual(
    readChatSecuritySecrets({
      CHAT_SESSION_SIGNING_SECRET: "a",
      CHAT_IP_HMAC_SECRET: "b",
      TURNSTILE_SECRET_KEY: "c",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "d",
    }),
    {
      sessionSigningSecret: "a",
      ipHmacSecret: "b",
      turnstileSecretKey: "c",
      upstashUrl: "https://example.upstash.io",
      upstashToken: "d",
    },
  );
});

test("IP limiter key is normalized keyed HMAC and never contains raw IP", () => {
  const ip = normalizeTrustedClientIp(" 203.0.113.8 ");
  assert.equal(ip, "203.0.113.8");
  const first = deriveIpLimiterKey(ip!, IP_SECRET);
  assert.equal(first, deriveIpLimiterKey(ip!, IP_SECRET));
  assert.notEqual(first, deriveIpLimiterKey("203.0.113.9", IP_SECRET));
  assert.notEqual(first, deriveIpLimiterKey(ip!, "different-secret"));
  assert.equal(first.includes(ip!), false);
  assert.equal(normalizeTrustedClientIp("not-an-ip"), null);
});

test("production IP resolver stays deployment-gated and ignores arbitrary forwarding headers", () => {
  const request = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.8", "x-real-ip": "203.0.113.8" },
  });
  assert.deepEqual(deploymentGatedClientIpResolver.resolve(request), {
    state: "DEPLOYMENT_VERIFICATION_REQUIRED",
  });
});

test("verified Vercel resolver accepts exactly one valid IPv4 or IPv6", () => {
  const resolve = (value: string) => vercelClientIpResolver.resolve(new Request("https://example.com", {
    headers: { "x-vercel-forwarded-for": value },
  }));
  assert.deepEqual(resolve("203.0.113.7"), { state: "RESOLVED", normalizedIp: "203.0.113.7" });
  assert.deepEqual(resolve(" 2001:DB8::1 "), { state: "RESOLVED", normalizedIp: "2001:db8::1" });
});

test("verified Vercel resolver rejects missing, empty, malformed, and ambiguous values", () => {
  const values: Array<string | undefined> = [undefined, "", "not-an-ip", "203.0.113.7, 198.51.100.8", "203.0.113.7,invalid"];
  for (const value of values) {
    const headers = value === undefined ? undefined : { "x-vercel-forwarded-for": value };
    assert.deepEqual(
      vercelClientIpResolver.resolve(new Request("https://example.com", { headers })),
      { state: "DEPLOYMENT_VERIFICATION_REQUIRED" },
    );
  }
});

test("verified Vercel resolver ignores spoofable fallback headers", () => {
  const request = new Request("https://example.com", { headers: {
    "x-vercel-forwarded-for": "203.0.113.7",
    "x-forwarded-for": "192.0.2.10",
    "x-real-ip": "198.51.100.20",
  } });
  assert.deepEqual(vercelClientIpResolver.resolve(request), {
    state: "RESOLVED",
    normalizedIp: "203.0.113.7",
  });
});

test("Turnstile adapter makes one request, sends minimum fields, and sanitizes provider outcomes", async () => {
  let calls = 0;
  const bodies: string[] = [];
  const verifier = createTurnstileVerifier({
    secretKey: "turnstile-secret",
    timeoutMs: 5_000,
    fetchImpl: async (_url, init) => {
      calls += 1;
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    },
  });
  assert.deepEqual(await verifier.verify("client-token"), { state: "VERIFIED" });
  assert.equal(calls, 1);
  assert.equal(bodies[0].includes("remoteip"), false);
  assert.equal(bodies[0].includes("client-token"), true);
  assert.deepEqual(await createTurnstileVerifier({
    secretKey: "x",
    timeoutMs: 5_000,
    fetchImpl: async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
  }).verify("bad"), { state: "INVALID" });
  assert.deepEqual(await createTurnstileVerifier({
    secretKey: "x",
    timeoutMs: 5_000,
    fetchImpl: async () => { throw new Error("provider detail"); },
  }).verify("bad"), { state: "UNAVAILABLE" });
});

test("Turnstile timeout is typed and provider is not called for invalid local tokens", async () => {
  let calls = 0;
  const verifier = createTurnstileVerifier({
    secretKey: "x",
    timeoutMs: 1,
    fetchImpl: async (_url, init) => {
      calls += 1;
      await new Promise<void>((_resolve, reject) => init?.signal?.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      }));
      return new Response();
    },
  });
  assert.deepEqual(await verifier.verify("token"), { state: "TIMEOUT" });
  assert.equal(calls, 1);
  assert.deepEqual(await verifier.verify(""), { state: "INVALID" });
  assert.equal(calls, 1);
});

test("Upstash adapter uses one atomic EVAL with all four opaque dimensions", async () => {
  let calls = 0;
  let observedKeys: string[] = [];
  const limiter = createUpstashRateLimiter(async (script, keys) => {
    calls += 1;
    observedKeys = keys;
    assert.equal(script, CHAT_RATE_LIMIT_SCRIPT);
    return [1, "ALLOWED", 0];
  });
  assert.deepEqual(await limiter.consume({
    ipKey: "opaque",
    sessionId: "session",
    sessionExpiresAt: NOW + 604_800_000,
    now: NOW,
    limits: LIMITS,
  }), { state: "ALLOWED" });
  assert.equal(calls, 1);
  assert.deepEqual(observedKeys, [
    "chat:rl:ip-minute:opaque",
    "chat:rl:ip-day:2026-10-06:opaque",
    "chat:rl:session:session",
    "chat:rl:global:2026-10-06",
  ]);
  assert.match(CHAT_RATE_LIMIT_SCRIPT, /ZREMRANGEBYSCORE/);
  assert.match(CHAT_RATE_LIMIT_SCRIPT, /PEXPIREAT/);
});

test("Upstash adapter returns typed limits, safe retry metadata, and fails closed", async () => {
  for (const reason of ["IP_MINUTE_LIMIT", "IP_DAILY_LIMIT", "SESSION_LIMIT", "GLOBAL_DAILY_LIMIT"] as const) {
    const limiter = createUpstashRateLimiter(async () => [0, reason, 12]);
    assert.deepEqual(await limiter.consume({
      ipKey: "opaque", sessionId: "s", sessionExpiresAt: NOW + 100_000, now: NOW, limits: LIMITS,
    }), { state: "LIMITED", reason, retryAfterSeconds: 12 });
  }
  const thrown = createUpstashRateLimiter(async () => { throw new Error("secret provider detail"); });
  const malformed = createUpstashRateLimiter(async () => ({ nope: true }));
  for (const limiter of [thrown, malformed]) {
    assert.deepEqual(await limiter.consume({
      ipKey: "opaque", sessionId: "s", sessionExpiresAt: NOW + 100_000, now: NOW, limits: LIMITS,
    }), { state: "DEPENDENCY_UNAVAILABLE" });
  }
});

class DeterministicLimiter implements DistributedRateLimiter {
  private minute: number[] = [];
  private ipDays = new Map<string, number>();
  private sessions = new Map<string, { count: number; expiresAt: number }>();
  private globalDays = new Map<string, number>();

  async consume(input: DistributedRateLimitInput): Promise<DistributedRateLimitResult> {
    const date = new Date(input.now).toISOString().slice(0, 10);
    this.minute = this.minute.filter((time) => time > input.now - 60_000);
    const ipDay = `${date}:${input.ipKey}`;
    const session = this.sessions.get(input.sessionId);
    const sessionCount = session && session.expiresAt > input.now ? session.count : 0;
    if (this.minute.length >= input.limits.perMinute) return { state: "LIMITED", reason: "IP_MINUTE_LIMIT" };
    if ((this.ipDays.get(ipDay) ?? 0) >= input.limits.ipDaily) return { state: "LIMITED", reason: "IP_DAILY_LIMIT" };
    if (sessionCount >= input.limits.session) return { state: "LIMITED", reason: "SESSION_LIMIT" };
    if ((this.globalDays.get(date) ?? 0) >= input.limits.globalDaily) return { state: "LIMITED", reason: "GLOBAL_DAILY_LIMIT" };
    this.minute.push(input.now);
    this.ipDays.set(ipDay, (this.ipDays.get(ipDay) ?? 0) + 1);
    this.sessions.set(input.sessionId, { count: sessionCount + 1, expiresAt: input.sessionExpiresAt });
    this.globalDays.set(date, (this.globalDays.get(date) ?? 0) + 1);
    return { state: "ALLOWED" };
  }
}

test("rate contract enforces 6/min and recovers after the sliding window", async () => {
  const limiter = new DeterministicLimiter();
  const input = { ipKey: "ip", sessionId: "s", sessionExpiresAt: NOW + 604_800_000, limits: LIMITS };
  for (let index = 0; index < 6; index += 1) assert.equal((await limiter.consume({ ...input, now: NOW + index })).state, "ALLOWED");
  assert.deepEqual(await limiter.consume({ ...input, now: NOW + 6 }), { state: "LIMITED", reason: "IP_MINUTE_LIMIT" });
  assert.equal((await limiter.consume({ ...input, now: NOW + 60_001 })).state, "ALLOWED");
});

test("rate contract enforces UTC daily, session-lifetime, and global dimensions", async () => {
  const make = (limits: typeof LIMITS) => ({
    ipKey: "ip", sessionId: "s", sessionExpiresAt: NOW + 604_800_000, now: NOW, limits,
  });
  const ipLimiter = new DeterministicLimiter();
  const ipLimits = { ...LIMITS, perMinute: 100, session: 100 };
  for (let index = 0; index < 50; index += 1) assert.equal((await ipLimiter.consume({ ...make(ipLimits), now: NOW + index })).state, "ALLOWED");
  assert.deepEqual(await ipLimiter.consume({ ...make(ipLimits), now: NOW + 51 }), { state: "LIMITED", reason: "IP_DAILY_LIMIT" });
  assert.equal((await ipLimiter.consume({ ...make(ipLimits), now: Date.UTC(2026, 9, 7) })).state, "ALLOWED");

  const sessionLimiter = new DeterministicLimiter();
  for (let index = 0; index < 30; index += 1) assert.equal((await sessionLimiter.consume({ ...make({ ...LIMITS, perMinute: 100, ipDaily: 100 }), now: NOW + index })).state, "ALLOWED");
  assert.deepEqual(await sessionLimiter.consume({ ...make({ ...LIMITS, perMinute: 100, ipDaily: 100 }), now: Date.UTC(2026, 9, 7) }), { state: "LIMITED", reason: "SESSION_LIMIT" });
  assert.equal((await sessionLimiter.consume({ ...make({ ...LIMITS, perMinute: 100, ipDaily: 100 }), sessionExpiresAt: NOW + 2 * 604_800_000, now: NOW + 604_800_001 })).state, "ALLOWED");

  const globalLimiter = new DeterministicLimiter();
  for (let index = 0; index < 150; index += 1) assert.equal((await globalLimiter.consume({ ...make({ perMinute: 200, ipDaily: 200, session: 200, globalDaily: 150 }), now: NOW + index, sessionId: `s${index}` })).state, "ALLOWED");
  assert.deepEqual(await globalLimiter.consume({ ...make({ perMinute: 200, ipDaily: 200, session: 200, globalDaily: 150 }), now: NOW + 151, sessionId: "last" }), { state: "LIMITED", reason: "GLOBAL_DAILY_LIMIT" });
});

test("contact fallback is deterministic and uses the single company source", () => {
  assert.deepEqual(mapRateLimitFallback({ state: "LIMITED", reason: "IP_MINUTE_LIMIT" }), { kind: "RETRY_LATER" });
  for (const reason of ["IP_DAILY_LIMIT", "SESSION_LIMIT", "GLOBAL_DAILY_LIMIT"] as const) {
    assert.deepEqual(mapRateLimitFallback({ state: "LIMITED", reason }), { kind: "CONTACT_FALLBACK", contact: CHAT_CONTACT });
  }
  assert.deepEqual(mapRateLimitFallback({ state: "DEPENDENCY_UNAVAILABLE" }), {
    kind: "SERVICE_FALLBACK_WITH_CONTACT", contact: CHAT_CONTACT,
  });
  assert.deepEqual(CHAT_CONTACT, { phone: "0901 671 671", email: "trong.ngo@infratek.vn" });
});

function serviceFixture(input?: {
  verification?: TurnstileVerificationResult;
  limiterResult?: DistributedRateLimitResult;
}) {
  let verificationCalls = 0;
  let limiterCalls = 0;
  const service = createChatSecurityService({
    sessionSigningSecret: SIGNING_SECRET,
    ipHmacSecret: IP_SECRET,
    verifier: { verify: async () => { verificationCalls += 1; return input?.verification ?? { state: "VERIFIED" }; } },
    limiter: { consume: async () => { limiterCalls += 1; return input?.limiterResult ?? { state: "ALLOWED" }; } },
    limits: LIMITS,
  });
  return { service, calls: () => ({ verificationCalls, limiterCalls }) };
}

test("orchestration deployment gate and Turnstile failures stop before limiter", async () => {
  const gated = serviceFixture();
  assert.deepEqual(await gated.service.authorize({ clientIp: { state: "DEPLOYMENT_VERIFICATION_REQUIRED" } }), { state: "DEPLOYMENT_VERIFICATION_REQUIRED" });
  assert.deepEqual(gated.calls(), { verificationCalls: 0, limiterCalls: 0 });

  const missing = serviceFixture();
  assert.deepEqual(await missing.service.authorize({ clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" } }), { state: "VERIFICATION_REQUIRED", reason: "MISSING_TOKEN" });
  assert.deepEqual(missing.calls(), { verificationCalls: 0, limiterCalls: 0 });

  for (const state of ["INVALID", "TIMEOUT", "UNAVAILABLE"] as const) {
    const fixture = serviceFixture({ verification: { state } });
    assert.deepEqual(await fixture.service.authorize({ turnstileToken: "token", clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" } }), { state: "VERIFICATION_REQUIRED", reason: state });
    assert.deepEqual(fixture.calls(), { verificationCalls: 1, limiterCalls: 0 });
  }
});

test("orchestration creates a signed session after Turnstile and skips it for a valid session", async () => {
  const first = serviceFixture();
  const result = await first.service.authorize({ turnstileToken: "token", clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" }, now: NOW, production: true });
  assert.equal(result.state, "PASS");
  assert.equal(first.calls().verificationCalls, 1);
  assert.ok(result.state === "PASS" && result.setCookie);

  const next = serviceFixture();
  const reused = await next.service.authorize({ sessionToken: result.state === "PASS" ? result.setCookie?.value : null, clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" }, now: NOW + 1 });
  assert.equal(reused.state, "PASS");
  assert.deepEqual(next.calls(), { verificationCalls: 0, limiterCalls: 1 });
});

test("orchestration limiter failure is fail-closed with sanitized server-owned fallback", async () => {
  const limited = serviceFixture({ limiterResult: { state: "LIMITED", reason: "SESSION_LIMIT", retryAfterSeconds: 99 } });
  const result = await limited.service.authorize({ turnstileToken: "token", clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" }, now: NOW });
  assert.equal(result.state, "RATE_LIMITED");
  assert.equal(JSON.stringify(result).includes("203.0.113.8"), false);
  assert.equal(JSON.stringify(result).includes(IP_SECRET), false);

  const unavailable = serviceFixture({ limiterResult: { state: "DEPENDENCY_UNAVAILABLE" } });
  assert.equal((await unavailable.service.authorize({ turnstileToken: "token", clientIp: { state: "RESOLVED", normalizedIp: "203.0.113.8" }, now: NOW })).state, "DEPENDENCY_UNAVAILABLE");
});
