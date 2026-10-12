import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cleanupExpiredChatData } from "./cleanup.ts";
import { createRetentionCleanupHandler } from "./handler.ts";

test("cleanup primitive targets only expired rows covered by an approved retention duration", async () => {
  const calls: Array<{ sql: string; parameters: unknown[] }> = [];
  const now = new Date("2026-10-11T00:00:00.000Z");
  const result = await cleanupExpiredChatData({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return { rows: [{ conversations: "2", feedback: "3", unanswered: "4", leads: "5" }] };
    },
  }, now);

  assert.deepEqual(result, { conversations: 2, feedback: 3, unanswered: 4, leads: 5 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.parameters, [now]);
  assert.match(calls[0]?.sql ?? "", /chat_conversations WHERE expires_at <= \$1/u);
  assert.match(calls[0]?.sql ?? "", /chat_feedback WHERE expires_at <= \$1/u);
  assert.match(calls[0]?.sql ?? "", /chat_unanswered WHERE expires_at <= \$1/u);
  assert.match(calls[0]?.sql ?? "", /chat_leads WHERE expires_at <= \$1/u);
});

test("cleanup primitive fails closed on malformed database counts", async () => {
  await assert.rejects(
    cleanupExpiredChatData({
      async query() { return { rows: [{ conversations: -1, feedback: 0, unanswered: 0, leads: 0 }] }; },
    }, new Date(0)),
    /invalid count/u,
  );
});

test("retention endpoint rejects missing or wrong authorization before cleanup", async () => {
  let calls = 0;
  const handler = createRetentionCleanupHandler({
    secret: "test-only-secret",
    cleanup: async () => {
      calls += 1;
      return { conversations: 0, feedback: 0, unanswered: 0, leads: 0 };
    },
  });
  assert.equal((await handler(new Request("https://example.test/internal"))).status, 401);
  assert.equal((await handler(new Request("https://example.test/internal", {
    headers: { authorization: "Bearer wrong" },
  }))).status, 401);
  assert.equal(calls, 0);
});

test("retention endpoint returns exact cleanup counts at the expiry boundary", async () => {
  const boundary = new Date("2026-10-12T00:00:00.000Z");
  let observed: Date | undefined;
  const handler = createRetentionCleanupHandler({
    secret: "test-only-secret",
    now: () => boundary,
    cleanup: async (now) => {
      observed = now;
      return { conversations: 1, feedback: 2, unanswered: 3, leads: 4 };
    },
  });
  const response = await handler(new Request("https://example.test/internal", {
    headers: { authorization: "Bearer test-only-secret" },
  }));
  assert.equal(response.status, 200);
  assert.equal(observed, boundary);
  assert.deepEqual(await response.json(), {
    ok: true, deleted: { conversations: 1, feedback: 2, unanswered: 3, leads: 4 },
  });
});

test("retention endpoint sanitizes cleanup failures", async () => {
  const handler = createRetentionCleanupHandler({
    secret: "test-only-secret",
    cleanup: async () => { throw new Error("database details must not leak"); },
  });
  const response = await handler(new Request("https://example.test/internal", {
    headers: { authorization: "Bearer test-only-secret" },
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "CLEANUP_UNAVAILABLE" });
});

test("lead-retention migration is reversible and pins 180 days with an expiry index", async () => {
  const source = await readFile(
    new URL("../../../migrations/20261012_090000_chat_lead_retention.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /ADD COLUMN "expires_at" timestamptz NOT NULL/u);
  assert.match(source, /interval '180 days'/u);
  assert.match(source, /CREATE INDEX "chat_leads_expires_at_idx"/u);
  assert.match(source, /DROP INDEX IF EXISTS "chat_leads_expires_at_idx"/u);
  assert.match(source, /DROP COLUMN IF EXISTS "expires_at"/u);
});
