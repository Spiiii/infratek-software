import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ChatConversationRepository } from "./conversation/repository.ts";
import { createConversationService } from "./conversation/service.ts";
import { ChatFeedbackRepository } from "./feedback/repository.ts";
import { createFeedbackPostHandler } from "./feedback/route.ts";
import { createFeedbackService } from "./feedback/service.ts";
import { createLeadPostHandler } from "./lead/route.ts";
import { createChatLeadService } from "./lead/service.ts";
import { createAnonymousSession } from "./security/session.ts";
import { deriveIpLimiterKey, vercelClientIpResolver } from "./security/ip.ts";
import { createUpstashLeadRateLimiter, LEAD_RATE_LIMIT_SCRIPT } from "./security/rate-limit.ts";

const secret = "p5.6c-test-secret-with-enough-entropy";
const environment = { CHAT_SESSION_SIGNING_SECRET: secret };
const ipHmacSecret = "p5.6c-ip-hmac-secret";
const conversationId = "11111111-1111-4111-8111-111111111111";

function cookie() {
  return `infratek_chat_session=${createAnonymousSession({ secret }).token}`;
}

test("D-21 persists ANSWER and NO_CONTEXT outcomes while historical messages remain readable", async () => {
  const writes: unknown[][] = [];
  const repository = new ChatConversationRepository({
    async query(_sql, parameters) { writes.push(parameters); return { rows: [{ id: conversationId }], rowCount: 1 }; },
  });
  const service = createConversationService(repository, {});
  await service.create({ sessionId: "session", userMessage: "q", assistantMessage: "a", assistantOutcome: "ANSWER", now: new Date(0) });
  await service.append({ conversationId, userMessage: "q2", assistantMessage: "fallback", assistantOutcome: "NO_CONTEXT", now: new Date(1) });
  assert.equal(String(writes[0]?.[1]).includes('"outcome":"ANSWER"'), true);
  assert.equal(String(writes[1]?.[1]).includes('"outcome":"NO_CONTEXT"'), true);

  const historyRepository = new ChatConversationRepository({
    async query() { return { rows: [{ messages_redacted: [{ role: "assistant", content: "old", createdAt: new Date(0).toISOString() }] }] }; },
  });
  assert.equal((await historyRepository.readRecent(conversationId))[0]?.content, "old");
});

test("D-19A resolves the latest ANSWER index and never selects a newer fallback or historical message", async () => {
  const repository = new ChatFeedbackRepository({
    async query() {
      return { rows: [{ id: conversationId, messages_redacted: [
        { role: "assistant", content: "historical", createdAt: new Date(0).toISOString() },
        { role: "assistant", content: "answer", createdAt: new Date(1).toISOString(), outcome: "ANSWER" },
        { role: "assistant", content: "fallback", createdAt: new Date(2).toISOString(), outcome: "NO_CONTEXT" },
      ] }] };
    },
  });
  assert.deepEqual(await repository.latestEligibleAnswer({ conversationId, sessionId: "session", now: new Date(3) }), {
    conversationId, messageIndex: 1,
  });
});

test("D-19A route rejects invalid votes and foreign-session conversations with sanitized responses", async () => {
  let submitted = 0;
  const handler = createFeedbackPostHandler({
    environment,
    service: { async submit() { submitted += 1; return { state: "NOT_ELIGIBLE" }; } },
  });
  const invalid = await handler(new Request("https://example.test/api/chat/feedback", {
    method: "POST", headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({ conversationId, vote: 0 }),
  }));
  assert.equal(invalid.status, 400);
  const foreign = await handler(new Request("https://example.test/api/chat/feedback", {
    method: "POST", headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({ conversationId, vote: 1 }),
  }));
  assert.equal(foreign.status, 404);
  assert.deepEqual(await foreign.json(), { status: "NOT_ELIGIBLE" });
  assert.equal(submitted, 1);
});

test("D-19A duplicate behavior is deterministic and feedback retention is 90 days", async () => {
  let records = 0;
  const service = createFeedbackService({
    async latestEligibleAnswer() { return { conversationId, messageIndex: 3 }; },
    async record(input) {
      records += 1;
      assert.equal(input.expiresAt.toISOString(), "2027-01-06T00:00:00.000Z");
      return records === 1 ? "RECORDED" : "DUPLICATE";
    },
  }, {});
  const input = { conversationId, sessionId: "session", vote: 1 as const, now: new Date("2026-10-08T00:00:00.000Z") };
  assert.equal((await service.submit(input)).state, "RECORDED");
  assert.equal((await service.submit(input)).state, "DUPLICATE");
});

test("D-20A validates email-or-phone before invoking the lead service", async () => {
  let submissions = 0;
  const handler = createLeadPostHandler({
    environment,
    limiter: { async consume() { return { state: "ALLOWED" }; } },
    clientIpResolver: { resolve: () => ({ state: "RESOLVED", normalizedIp: "203.0.113.8" }) },
    ipHmacSecret,
    service: { async submit() { submissions += 1; return { state: "SAVED" }; } },
  });
  const response = await handler(new Request("https://example.test/api/chat/lead", {
    method: "POST", headers: { "content-type": "application/json", cookie: cookie() },
    body: JSON.stringify({ name: "Nguyen Van A", company: "Infratek", email: "", phone: "" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(submissions, 0);
});

function sharedLeadEval() {
  const entries = new Map<string, number[]>();
  const keysSeen: string[] = [];
  return {
    keysSeen,
    async eval(_script: string, keys: string[], args: unknown[]) {
      const key = keys[0] ?? "";
      keysSeen.push(key);
      const now = Number(args[0]);
      const maximum = Number(args[2]);
      const windowMs = Number(args[3]);
      const active = (entries.get(key) ?? []).filter((time) => time > now - windowMs);
      if (active.length >= maximum) { entries.set(key, active); return [0, "LIMITED"]; }
      entries.set(key, [...active, now]);
      return [1, "ALLOWED"];
    },
  };
}

test("lead limiter atomically shares 5-per-10-minute rolling state across instances", async () => {
  const redis = sharedLeadEval();
  const first = createUpstashLeadRateLimiter(redis.eval);
  const second = createUpstashLeadRateLimiter(redis.eval);
  const input = { ipKey: "opaque-ip", sessionId: "opaque-session" };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await (attempt % 2 ? second : first).consume({ ...input, now: attempt })).state, "ALLOWED");
  }
  assert.equal((await second.consume({ ...input, now: 5 })).state, "LIMITED");
  assert.equal((await first.consume({ ...input, now: 600_000 })).state, "ALLOWED");
  assert.equal(redis.keysSeen.every((key) => key.startsWith("chat:lead:rl:") && !key.startsWith("chat:rl:")), true);
  assert.match(LEAD_RATE_LIMIT_SCRIPT, /ZREMRANGEBYSCORE/u);
  assert.match(LEAD_RATE_LIMIT_SCRIPT, /ZCARD/u);
  assert.match(LEAD_RATE_LIMIT_SCRIPT, /ZADD/u);
});

test("lead route uses trusted IP HMAC and fails closed when Upstash is unavailable", async () => {
  let limiterInput: { ipKey: string; sessionId: string } | undefined;
  let submissions = 0;
  const handler = createLeadPostHandler({
    environment,
    limiter: { async consume(input) { limiterInput = input; return { state: "DEPENDENCY_UNAVAILABLE" }; } },
    clientIpResolver: vercelClientIpResolver,
    ipHmacSecret,
    service: { async submit() { submissions += 1; return { state: "SAVED" }; } },
  });
  const response = await handler(new Request("https://example.test/api/chat/lead", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookie(), "x-vercel-forwarded-for": "203.0.113.8" },
    body: JSON.stringify({ name: "Nguyen Van A", company: "Infratek", phone: "0901234567" }),
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "DEPENDENCY_UNAVAILABLE" });
  assert.equal(limiterInput?.ipKey, deriveIpLimiterKey("203.0.113.8", ipHmacSecret));
  assert.equal(JSON.stringify(limiterInput).includes("203.0.113.8"), false);
  assert.equal(submissions, 0);
});

test("lead route preserves signed-session and trusted-IP gates before distributed consume", async () => {
  let consumes = 0;
  const handler = createLeadPostHandler({
    environment,
    limiter: { async consume() { consumes += 1; return { state: "ALLOWED" }; } },
    clientIpResolver: vercelClientIpResolver,
    ipHmacSecret,
    service: { async submit() { return { state: "SAVED" }; } },
  });
  const body = JSON.stringify({ name: "Nguyen Van A", company: "Infratek", phone: "0901234567" });
  const invalidSession = await handler(new Request("https://example.test/api/chat/lead", {
    method: "POST", headers: { "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.8" }, body,
  }));
  assert.equal(invalidSession.status, 403);
  const untrustedIp = await handler(new Request("https://example.test/api/chat/lead", {
    method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.8" }, body,
  }));
  assert.equal(untrustedIp.status, 503);
  assert.equal(consumes, 0);
});

test("D-20A persists before mocked Resend and preserves the lead when notification fails", async () => {
  const events: string[] = [];
  const repository = {
    async conversationBelongsToSession() { return true; },
    async create() { events.push("persist"); return "lead-1"; },
  };
  const service = createChatLeadService(repository, {
    async notify() { events.push("notify"); return "FAILED"; },
  });
  const result = await service.submit({ name: "Nguyen Van A", email: "a@example.com", company: "Infratek", sessionId: "session", conversationId });
  assert.equal(result.state, "SAVED_NOTIFICATION_FAILED");
  assert.deepEqual(events, ["persist", "notify"]);
});

test("D-20A rejects foreign conversation ownership before persistence or notification", async () => {
  let writes = 0;
  let notifications = 0;
  const service = createChatLeadService({
    async conversationBelongsToSession() { return false; },
    async create() { writes += 1; return "lead"; },
  }, { async notify() { notifications += 1; return "SENT"; } });
  const result = await service.submit({ name: "Nguyen Van A", phone: "0901234567", company: "Infratek", sessionId: "foreign", conversationId });
  assert.equal(result.state, "FORBIDDEN");
  assert.equal(writes, 0);
  assert.equal(notifications, 0);
});

test("P5.6-C UI limits feedback to latest eligible answer and preserves explicit lead states", async () => {
  const [shell, feedback, lead] = await Promise.all([
    readFile(new URL("../../components/chat/chat-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/chat/chat-feedback.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/chat/chat-lead-form.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /latestEligibleFeedbackId/u);
  assert.match(shell, /message\.id === latestEligibleFeedbackId/u);
  assert.equal(feedback.includes('"SENDING" | "SAVED" | "ERROR"'), true);
  assert.match(feedback, /Câu trả lời vẫn được giữ nguyên/u);
  assert.match(lead, /Vui lòng nhập email hoặc số điện thoại/u);
  assert.match(lead, /SAVED_NOTIFICATION_FAILED/u);
});
