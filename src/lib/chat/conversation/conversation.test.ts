import assert from "node:assert/strict";
import test from "node:test";

import { prepareMultiTurnRetrieval } from "./multi-turn.ts";
import { ChatConversationRepository, type ConversationQueryExecutor } from "./repository.ts";
import { createConversationService } from "./service.ts";
import type { ConversationMessage } from "./types.ts";

function message(role: "user" | "assistant", content: string, minute: number): ConversationMessage {
  return { role, content, createdAt: new Date(Date.UTC(2026, 9, 6, 10, minute)).toISOString() };
}

test("conversation service redacts PII before create persistence", async () => {
  let parameters: unknown[] = [];
  const executor: ConversationQueryExecutor = {
    query: async (_sql, input) => {
      parameters = input;
      return { rows: [{ id: "conversation-1" }], rowCount: 1 };
    },
  };
  const service = createConversationService(new ChatConversationRepository(executor), {});
  const result = await service.create({
    sessionId: "opaque-session",
    userMessage: "Email user@example.com, gọi 0901 234 567",
    assistantMessage: "Liên hệ help@example.com hoặc 0988 111 222",
    now: new Date(Date.UTC(2026, 9, 6)),
  });
  assert.deepEqual(result, { state: "SAVED", conversationId: "conversation-1" });
  const serialized = JSON.stringify(parameters);
  assert.doesNotMatch(serialized, /user@example\.com|0901 234 567|help@example\.com|0988 111 222/);
  assert.match(serialized, /\[EMAIL\].*\[SDT\]/);
});

test("unsupported provider answer is never persisted and safe flag metadata is stored", async () => {
  let parameters: unknown[] = [];
  const executor: ConversationQueryExecutor = {
    query: async (_sql, input) => {
      parameters = input;
      return { rows: [{ id: "conversation-1" }], rowCount: 1 };
    },
  };
  const service = createConversationService(new ChatConversationRepository(executor), {});
  await service.create({
    sessionId: "s",
    userMessage: "Câu hỏi",
    assistantMessage: "Bí mật provider không được lưu 999%",
    unsupportedCategories: ["UNSUPPORTED_NUMBER"],
  });
  assert.equal(JSON.stringify(parameters).includes("Bí mật provider"), false);
  assert.match(String(parameters[3]), /"unsupported":true/);
  assert.match(String(parameters[3]), /UNSUPPORTED_NUMBER/);
});

test("a supported append cannot erase an existing unsupported review flag", async () => {
  let sql = "";
  const repository = new ChatConversationRepository({
    query: async (statement) => {
      sql = statement;
      return { rows: [], rowCount: 1 };
    },
  });
  await repository.append({
    conversationId: "id",
    messages: [message("user", "safe", 0)],
    sources: [],
    flags: { unsupported: false },
  });
  assert.match(sql, /WHEN \(\$4::jsonb ->> 'unsupported'\)::boolean THEN flags \|\| \$4::jsonb/);
  assert.match(sql, /ELSE flags/);
});

test("history is chronological, sanitized, and capped at six messages", async () => {
  const rows = Array.from({ length: 8 }, (_, index) => message(index % 2 ? "assistant" : "user", `m${index}`, index));
  const repository = new ChatConversationRepository({
    query: async () => ({ rows: [{ messages_redacted: rows }] }),
  });
  assert.deepEqual((await repository.readRecent("id", 6)).map((item) => item.content), ["m2", "m3", "m4", "m5", "m6", "m7"]);
  assert.deepEqual(await new ChatConversationRepository({ query: async () => ({ rows: [] }) }).readRecent("id", 6), []);
  assert.deepEqual((await repository.readRecent("id", 3)).map((item) => item.content), ["m5", "m6", "m7"]);
});

test("conversation persistence errors are sanitized", async () => {
  const service = createConversationService(new ChatConversationRepository({
    query: async () => { throw new Error("postgres://secret SQL detail"); },
  }), {});
  assert.deepEqual(await service.create({ sessionId: "s", userMessage: "hello" }), {
    state: "FAILURE",
    reason: "PERSISTENCE_UNAVAILABLE",
  });
  assert.deepEqual(await service.history("id"), {
    state: "FAILURE",
    reason: "PERSISTENCE_UNAVAILABLE",
  });
});

test("active conversation lookup is session-owned, active, unexpired, and deterministic", async () => {
  let sql = "";
  let parameters: unknown[] = [];
  const now = new Date(Date.UTC(2026, 9, 6));
  const repository = new ChatConversationRepository({
    query: async (statement, values) => {
      sql = statement;
      parameters = values;
      return { rows: [{ id: "conversation-active" }] };
    },
  });
  assert.equal(await repository.findActiveBySession("server-session", now), "conversation-active");
  assert.deepEqual(parameters, ["server-session", now]);
  assert.match(sql, /session_id = \$1/);
  assert.match(sql, /status = 'active'/);
  assert.match(sql, /expires_at > \$2/);
  assert.match(sql, /ORDER BY created_at DESC, id DESC/);
  assert.equal(
    await new ChatConversationRepository({ query: async () => ({ rows: [] }) })
      .findActiveBySession("server-session", now),
    undefined,
  );
});

test("multi-turn preparation keeps current question primary and uses no more than two completed turns", () => {
  const history = [
    message("user", "u1", 0), message("assistant", "a1", 1),
    message("user", "u2", 2), message("assistant", "a2", 3),
    message("user", "u3", 4), message("assistant", "a3", 5),
  ];
  const result = prepareMultiTurnRetrieval("Câu hỏi hiện tại", history, { CHAT_INPUT_MAX_LENGTH: "500" });
  assert.equal(result.priorTurnsUsed, 2);
  assert.equal(result.historyMessagesConsidered, 6);
  assert.equal(result.queryRewriteCalls, 0);
  assert.match(result.retrievalText, /^Câu hỏi hiện tại: Câu hỏi hiện tại/);
  assert.doesNotMatch(result.retrievalText, /u1|a1/);
  assert.ok(
    result.retrievalText.indexOf("u2") < result.retrievalText.indexOf("a2") &&
    result.retrievalText.indexOf("a2") < result.retrievalText.indexOf("u3") &&
    result.retrievalText.indexOf("u3") < result.retrievalText.indexOf("a3"),
  );
});

test("multi-turn preparation handles current-only, one turn, excess history, and incomplete turns deterministically", () => {
  const currentOnly = prepareMultiTurnRetrieval("Hiện tại", [], {});
  assert.equal(currentOnly.retrievalText, "Hiện tại");
  assert.equal(currentOnly.priorTurnsUsed, 0);

  const one = [message("user", "u", 0), message("assistant", "a", 1)];
  assert.equal(prepareMultiTurnRetrieval("q", one, {}).priorTurnsUsed, 1);

  const malformed = [
    message("assistant", "orphan", 0),
    message("user", "complete-user", 1),
    message("assistant", "complete-assistant", 2),
    message("user", "incomplete", 3),
  ];
  const first = prepareMultiTurnRetrieval("q", malformed, {});
  const second = prepareMultiTurnRetrieval("q", malformed, {});
  assert.deepEqual(first, second);
  assert.equal(first.priorTurnsUsed, 1);
  assert.doesNotMatch(first.retrievalText, /orphan|incomplete/);
});

test("multi-turn preparation never exceeds configured input budget and prioritizes current question", () => {
  const history = [message("user", "u".repeat(200), 0), message("assistant", "a".repeat(200), 1)];
  const result = prepareMultiTurnRetrieval("primary", history, { CHAT_INPUT_MAX_LENGTH: "50" });
  assert.equal(result.retrievalText, "primary");
  assert.equal(result.priorTurnsUsed, 0);
});

test("multi-turn preparation redacts history again before retrieval composition", () => {
  const history = [
    message("user", "Email raw@example.com", 0),
    message("assistant", "Gọi 0901 234 567", 1),
  ];
  const result = prepareMultiTurnRetrieval("q", history, {});
  assert.doesNotMatch(result.retrievalText, /raw@example\.com|0901 234 567/);
  assert.match(result.retrievalText, /\[EMAIL\][\s\S]*\[SDT\]/);
});
