import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { evaluateRecordedResults, formatHumanReport } from "./offline-evaluator.ts";
import { loadAndValidateChatDataset } from "./validate-chat-dataset.ts";

const dataset = await loadAndValidateChatDataset();
const fixture = JSON.parse(await readFile(new URL("./fixtures/synthetic-recorded-results.json", import.meta.url), "utf8")) as Record<string, unknown>;
const summary = evaluateRecordedResults(dataset, fixture);
const find = (caseId: string) => summary.cases.find((item) => item.caseId === caseId);

test("correct ANSWER is scored PASS with independently evaluated evidence", () => {
  const result = find("chat-eval-ans-001");
  assert.equal(result?.outcome, "PASS");
  assert.equal(result?.citations.syntax.state, "PASS");
  assert.equal(result?.citations.resolution.state, "PASS");
  assert.equal(result?.citations.support.state, "PASS");
  assert.equal(result?.protectedClaims.state, "PASS");
});

test("correct NO_CONTEXT is a correct refusal without fabricating evidence PASS", () => {
  const result = find("chat-eval-mis-001");
  assert.equal(result?.outcome, "PASS");
  assert.equal(result?.citations.syntax.state, "NOT_EVALUATED");
  assert.equal(result?.protectedClaims.state, "NOT_EVALUATED");
  assert.equal(summary.decisionMetrics.correctRefusal >= 1, true);
});

test("false ANSWER on missing context is scored FAIL", () => {
  assert.equal(find("chat-eval-mis-003")?.outcome, "FAIL");
  assert.equal(summary.decisionMetrics.falseAnswer, 1);
});

test("false refusal on an answerable case is scored FAIL", () => {
  assert.equal(find("chat-eval-ans-002")?.outcome, "FAIL");
  assert.equal(summary.decisionMetrics.falseRefusal, 1);
});

test("invalid citations fail syntax and source resolution", () => {
  const result = find("chat-eval-ans-003");
  assert.equal(result?.decisionOutcome, "PASS");
  assert.equal(result?.outcome, "FAIL");
  assert.equal(result?.citations.syntax.state, "FAIL");
  assert.equal(result?.citations.resolution.state, "FAIL");
  assert.equal(result?.citations.support.state, "NOT_EVALUATED");
});

test("unsupported citation support and protected claims are reported independently", () => {
  const result = find("chat-eval-mis-003");
  assert.equal(result?.citations.syntax.state, "PASS");
  assert.equal(result?.citations.support.state, "FAIL");
  assert.equal(result?.protectedClaims.state, "FAIL");
  assert.ok(result?.protectedClaims.categories?.includes("UNSUPPORTED_NUMBER"));
});

test("missing cases and missing evidence remain NOT_RUN or NOT_EVALUATED", () => {
  assert.equal(find("chat-eval-ans-004")?.outcome, "NOT_RUN");
  assert.ok(summary.missingCaseIds.includes("chat-eval-ans-004"));
  assert.ok(summary.incompleteEvidenceCaseIds.includes("chat-eval-ans-003"));
});

test("duplicate and unknown recorded case IDs are rejected", () => {
  const duplicate = structuredClone(fixture) as { cases: unknown[] };
  duplicate.cases.push(structuredClone(duplicate.cases[0]));
  assert.throws(() => evaluateRecordedResults(dataset, duplicate), /Duplicate recorded case id/u);

  const unknown = structuredClone(fixture) as { cases: Array<Record<string, unknown>> };
  unknown.cases[0].caseId = "chat-eval-unknown-999";
  assert.throws(() => evaluateRecordedResults(dataset, unknown), /Unknown case id/u);
});

test("version metadata and dataset version are preserved and validated", () => {
  assert.deepEqual(summary.versions, (fixture as { versions: unknown }).versions);
  assert.equal(summary.datasetVersion, dataset.datasetVersion);
  assert.equal(find("chat-eval-ans-001")?.versions.threshold, "UN-CALIBRATED");

  const mismatch = structuredClone(fixture) as { datasetVersion: string };
  mismatch.datasetVersion = "wrong-version";
  assert.throws(() => evaluateRecordedResults(dataset, mismatch), /Dataset version mismatch/u);
});

test("latency aggregation uses only supplied total measurements", () => {
  assert.deepEqual(summary.latencyMs, {
    measuredCases: 4,
    average: 242.5,
    min: 120,
    max: 400,
    p50: 150,
    p95: 400,
  });
});

test("human report labels PASS, FAIL, NOT_RUN and incomplete evidence", () => {
  const report = formatHumanReport(summary);
  assert.match(report, /3 PASS \/ 3 FAIL \/ 114 NOT_RUN/u);
  assert.match(report, /incomplete evidence/u);
  assert.match(report, /UN_CALIBRATED|UN-CALIBRATED/u);
});
