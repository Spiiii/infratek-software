import assert from "node:assert/strict";
import test from "node:test";
import {
  FINAL_SOURCE_LIMIT,
  FTS_CANDIDATE_LIMIT,
  INTERACTIVE_EMBEDDING_CONFIG,
  RETRIEVAL_THRESHOLD,
  RRF_K,
  VECTOR_CANDIDATE_LIMIT,
} from "./config.ts";
import { prepareRetrievalQuery, RetrievalQueryValidationError } from "./query.ts";
import type { RetrievalStatus } from "./types.ts";

function assertValidationCode(input: unknown, code: RetrievalQueryValidationError["code"]) {
  assert.throws(
    () => prepareRetrievalQuery(input, {}),
    (error) => error instanceof RetrievalQueryValidationError && error.code === code,
  );
}

test("retrieval ranking config is fixed without a relevance threshold", () => {
  assert.equal(VECTOR_CANDIDATE_LIMIT, 20);
  assert.equal(FTS_CANDIDATE_LIMIT, 20);
  assert.equal(FINAL_SOURCE_LIMIT, 6);
  assert.equal(RRF_K, 60);
  assert.deepEqual(RETRIEVAL_THRESHOLD, { state: "UN-CALIBRATED" });
});

test("interactive embedding is separate from paced ingestion", () => {
  assert.deepEqual(INTERACTIVE_EMBEDDING_CONFIG, {
    requestDelayMs: 0,
    maxRetries: 0,
    maxPhysicalCallsPerQuestion: 1,
    queryRewriteCalls: 0,
    chatModelCalls: 0,
  });
});

test("prepares a valid Vietnamese query deterministically", () => {
  assert.deepEqual(prepareRetrievalQuery("  Tư vấn   AI\ncho doanh nghiệp  ", {}), {
    value: "Tư vấn AI cho doanh nghiệp",
    containsPii: false,
    redactions: { emails: 0, phones: 0 },
    inputLength: 32,
  });
});

test("normalizes decomposed Unicode to NFC", () => {
  assert.equal(prepareRetrievalQuery("Tu\u031b va\u0302\u0301n AI", {}).value, "Tư vấn AI");
});

test("rejects invalid, empty, whitespace-only, and over-limit input", () => {
  assertValidationCode(null, "INVALID_TYPE");
  assertValidationCode("", "EMPTY");
  assertValidationCode(" \n\t ", "EMPTY");
  assertValidationCode("a".repeat(501), "TOO_LONG");
});

test("redacts email and Vietnamese phone before future retrieval", () => {
  const prepared = prepareRetrievalQuery(
    "Liên hệ Test.User+crm@infratek.vn hoặc +84 901 234 567 để tư vấn",
    {},
  );
  assert.equal(prepared.value, "Liên hệ [EMAIL] hoặc [SDT] để tư vấn");
  assert.equal(prepared.containsPii, true);
  assert.deepEqual(prepared.redactions, { emails: 1, phones: 1 });
});

test("status model represents health, candidates, and relevance independently", () => {
  const statuses: RetrievalStatus[] = [
    { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    { mode: "FTS_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    { mode: "VECTOR_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    { mode: "HYBRID", candidateState: "NO_CANDIDATES", relevanceState: "NO_CONTEXT" },
    { mode: "UNAVAILABLE", candidateState: "UNKNOWN", relevanceState: "UNAVAILABLE" },
  ];

  assert.notDeepEqual(statuses[3], statuses[4]);
  assert.equal(statuses[1].relevanceState, "UN_CALIBRATED");
  assert.equal(statuses[2].relevanceState, "UN_CALIBRATED");
});
