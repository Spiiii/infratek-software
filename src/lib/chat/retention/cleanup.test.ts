import assert from "node:assert/strict";
import test from "node:test";

import { cleanupExpiredChatData } from "./cleanup.ts";

test("cleanup primitive targets only expired rows covered by an approved retention duration", async () => {
  const calls: Array<{ sql: string; parameters: unknown[] }> = [];
  const now = new Date("2026-10-11T00:00:00.000Z");
  const result = await cleanupExpiredChatData({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return { rows: [{ conversations: "2", feedback: "3", unanswered: "4" }] };
    },
  }, now);

  assert.deepEqual(result, { conversations: 2, feedback: 3, unanswered: 4 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.parameters, [now]);
  assert.match(calls[0]?.sql ?? "", /chat_conversations WHERE expires_at <= \$1/u);
  assert.match(calls[0]?.sql ?? "", /chat_feedback WHERE expires_at <= \$1/u);
  assert.match(calls[0]?.sql ?? "", /chat_unanswered WHERE expires_at <= \$1/u);
  assert.doesNotMatch(calls[0]?.sql ?? "", /chat_leads/u);
});

test("cleanup primitive fails closed on malformed database counts", async () => {
  await assert.rejects(
    cleanupExpiredChatData({
      async query() { return { rows: [{ conversations: -1, feedback: 0, unanswered: 0 }] }; },
    }, new Date(0)),
    /invalid count/u,
  );
});
