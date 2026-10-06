import assert from "node:assert/strict";
import test from "node:test";

import { ChatUnansweredRepository, type UnansweredQueryExecutor } from "./repository.ts";
import { createUnansweredService, type UnansweredTrigger } from "./service.ts";

test("only genuine no-answer states trigger unanswered recording", async () => {
  let calls = 0;
  const repository = new ChatUnansweredRepository({
    query: async () => ({ rows: [{ id: `id-${++calls}`, occurrence_count: calls }] }),
  });
  const service = createUnansweredService(repository, {});
  for (const trigger of ["NO_CONTEXT", "NO_ANSWER"] as const) {
    assert.equal((await service.record({ trigger, question: "question" })).state, "RECORDED");
  }
  const excluded: UnansweredTrigger[] = [
    "CALIBRATION_REQUIRED", "DEPENDENCY_FAILURE", "PROVIDER_FAILURE", "SECURITY_FAILURE",
    "RATE_LIMIT_FAILURE", "PERSISTENCE_FAILURE", "INVALID_REQUEST",
  ];
  for (const trigger of excluded) {
    assert.deepEqual(await service.record({ trigger, question: "question" }), { state: "SKIPPED" });
  }
  assert.equal(calls, 2);
});

test("unanswered identity is derived only after PII redaction and whitespace normalization", async () => {
  const observed: unknown[][] = [];
  const executor: UnansweredQueryExecutor = {
    query: async (_sql, parameters) => {
      observed.push(parameters);
      return { rows: [{ id: "id", occurrence_count: observed.length }] };
    },
  };
  const service = createUnansweredService(new ChatUnansweredRepository(executor), {});
  await service.record({ trigger: "NO_CONTEXT", question: "  Gọi 0901 234 567   qua a@example.com  " });
  await service.record({ trigger: "NO_CONTEXT", question: "gọi 0988 111 222 qua B@EXAMPLE.COM" });

  assert.equal(observed[0][0], "gọi [sdt] qua [email]");
  assert.equal(observed[0][1], observed[1][1]);
  const serialized = JSON.stringify(observed);
  assert.doesNotMatch(serialized, /0901 234 567|0988 111 222|a@example\.com|B@EXAMPLE\.COM/);
  assert.doesNotMatch(serialized, /raw_ip|203\.0\.113/);
});

test("unanswered repository uses one atomic conflict upsert and refreshes 90-day expiry", async () => {
  let sql = "";
  let parameters: unknown[] = [];
  const executor: UnansweredQueryExecutor = {
    query: async (statement, input) => {
      sql = statement;
      parameters = input;
      return { rows: [{ id: "same-id", occurrence_count: 2 }] };
    },
  };
  const now = new Date(Date.UTC(2026, 9, 6));
  const result = await createUnansweredService(new ChatUnansweredRepository(executor), {}).record({
    trigger: "NO_ANSWER",
    question: "Không có dữ liệu",
    now,
  });
  assert.deepEqual(result, { state: "RECORDED", id: "same-id", occurrenceCount: 2 });
  assert.match(sql, /ON CONFLICT \(question_hash\) DO UPDATE/);
  assert.match(sql, /occurrence_count = chat_unanswered\.occurrence_count \+ 1/);
  assert.doesNotMatch(sql, /^\s*SELECT/im);
  assert.equal((parameters[4] as Date).getTime() - now.getTime(), 90 * 86_400_000);
});

test("unanswered repository failures are sanitized", async () => {
  const service = createUnansweredService(new ChatUnansweredRepository({
    query: async () => { throw new Error("SQL secret detail"); },
  }), {});
  assert.deepEqual(await service.record({ trigger: "NO_CONTEXT", question: "q" }), {
    state: "FAILURE",
    reason: "PERSISTENCE_UNAVAILABLE",
  });
});
