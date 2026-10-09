import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { loadAndValidateChatDataset, validateChatDataset, VERIFIED_SOURCE_REFS } from "./validate-chat-dataset.ts";

test("P5.7-B dataset has exactly 120 valid cases and remains UN-CALIBRATED", async () => {
  const dataset = await loadAndValidateChatDataset();
  assert.equal(dataset.cases.length, 120);
  assert.equal(dataset.policyState, "UN-CALIBRATED");
  assert.deepEqual(dataset.canonicalCategoryMapping, {
    ANSWERABLE: "SITE_ANSWER",
    MISSING_CONTEXT: "NO_SITE_ANSWER",
    INJECTION_UNSUPPORTED: "ATTACK_OR_OFF_TOPIC",
    LANGUAGE_VARIANT: "LANGUAGE_VARIANT",
    AMBIGUOUS_BOUNDARY: "REVIEW_OVERLAY",
  });
  assert.deepEqual(
    Object.fromEntries(["ANSWERABLE", "MISSING_CONTEXT", "INJECTION_UNSUPPORTED", "LANGUAGE_VARIANT", "AMBIGUOUS_BOUNDARY"].map((group) => [group, dataset.cases.filter((item) => item.group === group).length])),
    { ANSWERABLE: 45, MISSING_CONTEXT: 30, INJECTION_UNSUPPORTED: 20, LANGUAGE_VARIANT: 15, AMBIGUOUS_BOUNDARY: 10 },
  );
});

test("all source references resolve to the documented published inventory", async () => {
  const dataset = await loadAndValidateChatDataset();
  const used = new Set(dataset.cases.flatMap((item) => item.sourceRefs));
  assert.equal([...used].every((sourceRef) => VERIFIED_SOURCE_REFS.has(sourceRef)), true);
  assert.equal(used.size, 14);
});

test("finalized dataset uses only owner-approved outcomes and has no pending review", async () => {
  const dataset = await loadAndValidateChatDataset();
  assert.deepEqual([...new Set(dataset.cases.map((item) => item.expectedDecision))].sort(), ["ANSWER", "NO_CONTEXT"]);
  assert.equal(dataset.cases.every((item) => item.reviewerStatus === "VERIFIED"), true);
  assert.deepEqual(
    dataset.cases.filter((item) => item.group === "AMBIGUOUS_BOUNDARY").map(({ id, expectedDecision }) => [id, expectedDecision]),
    [
      ["chat-eval-bnd-001", "ANSWER"],
      ["chat-eval-bnd-002", "ANSWER"],
      ["chat-eval-bnd-003", "NO_CONTEXT"],
      ["chat-eval-bnd-004", "NO_CONTEXT"],
      ["chat-eval-bnd-005", "NO_CONTEXT"],
      ["chat-eval-bnd-006", "NO_CONTEXT"],
      ["chat-eval-bnd-007", "ANSWER"],
      ["chat-eval-bnd-008", "ANSWER"],
      ["chat-eval-bnd-009", "ANSWER"],
      ["chat-eval-bnd-010", "NO_CONTEXT"],
    ],
  );
});

test("canonical section 6.7 examples are covered by controlled replacements", async () => {
  const dataset = await loadAndValidateChatDataset();
  const expectedQuestions = new Map([
    ["chat-eval-ans-001", "Quy trình triển khai AI gồm mấy bước?"],
    ["chat-eval-ans-024", "Camera AI đạt độ chính xác bao nhiêu?"],
    ["chat-eval-ans-043", "Infratek có những giải pháp nào?"],
    ["chat-eval-mis-001", "Giá một dự án OCR là bao nhiêu?"],
    ["chat-eval-lang-005", "camera AI nha may"],
    ["chat-eval-lang-006", "giai phap OCR cho ngan hang"],
  ]);
  for (const [id, question] of expectedQuestions) {
    const item = dataset.cases.find((candidate) => candidate.id === id);
    assert.equal(item?.question, question);
    assert.ok(item?.reviewerNote);
  }
});

test("validator rejects duplicate questions and unknown source references", async () => {
  const raw = JSON.parse(await readFile(new URL("./chat.yml", import.meta.url), "utf8")) as { cases: Array<Record<string, unknown>> };
  const duplicate = structuredClone(raw);
  duplicate.cases[1].question = duplicate.cases[0].question;
  assert.throws(() => validateChatDataset(duplicate), /Duplicate question/u);
  const unknown = structuredClone(raw);
  unknown.cases[0].sourceRefs = ["/solutions/not-published"];
  assert.throws(() => validateChatDataset(unknown), /Unknown source reference/u);
});
