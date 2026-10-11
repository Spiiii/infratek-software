import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FINAL_SOURCE_LIMIT, FTS_CANDIDATE_LIMIT, RRF_K, VECTOR_CANDIDATE_LIMIT } from "../src/lib/chat/retrieval/config.ts";
import type { FtsCandidate, RetrievalResult, VectorCandidate } from "../src/lib/chat/retrieval/types.ts";
import { runRetrievalEvaluation, validateRetrievalRunnerOptions } from "./retrieval-runner.ts";
import { loadAndValidateChatDataset } from "./validate-chat-dataset.ts";

const environment = {
  EMBED_MODEL: "gemini-embedding-2",
  EMBED_DIMENSION: "768",
  EMBED_VERSION: "gemini-embedding-2-768-p5.3",
  INGESTION_VERSION: "p5.3-v1",
  PROMPT_VERSION: "p5.2",
  THRESHOLD_VERSION: "UN-CALIBRATED",
};

async function output(name: string) {
  return mkdtemp(join(tmpdir(), `infratek-p5.7e-${name}-`));
}

function options(outputDirectory: string, overrides = {}) {
  return {
    runId: "synthetic-test-run",
    outputDirectory,
    repositoryRoot: process.cwd(),
    live: false,
    caseIds: [] as string[],
    maxCases: 2,
    timestamp: "2026-10-09T00:00:00.000Z",
    ...overrides,
  };
}

function vector(rank: number): VectorCandidate {
  return {
    id: `v-${rank}`,
    docType: "solution",
    docId: "ai-consulting",
    chunkKey: `chunk-${rank}`,
    title: "Synthetic source",
    headingPath: [],
    content: "Synthetic test content",
    url: "/solutions/ai-consulting",
    diagnostics: { vectorRank: rank, vectorDistance: rank / 10, vectorSimilarity: 1 - rank / 10 },
  };
}

function fts(rank: number): FtsCandidate {
  return {
    id: `f-${rank}`,
    docType: "solution",
    docId: "ai-consulting",
    chunkKey: `chunk-${rank}`,
    title: "Synthetic source",
    headingPath: [],
    content: "Synthetic test content",
    url: "/solutions/ai-consulting",
    diagnostics: { ftsRank: rank, ftsScore: 1 / rank },
  };
}

function result(calls: 0 | 1 = 1): RetrievalResult {
  return {
    status: { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    sources: [],
    diagnostics: {
      mode: "HYBRID",
      vectorCandidateCount: 1,
      ftsCandidateCount: 1,
      fusedCandidateCount: 1,
      selectedSourceCount: 1,
      queryEmbeddingCalls: calls,
      queryRewriteCalls: 0,
      chatModelCalls: 0,
      failures: [],
      embedding: { attempted: true, physicalCalls: calls, model: "gemini-embedding-2", dimension: 768 },
      vector: { attempted: true, succeeded: true, candidateCount: 1 },
      fts: { attempted: true, succeeded: true, candidateCount: 1 },
      fusion: { fusedCandidateCount: 1, selectedCount: 1, distinctDocumentCount: 1, maxChunksFromSingleDocument: 1 },
    },
  };
}

test("dry-run validates and selects cases with zero provider/database calls", async () => {
  const dataset = await loadAndValidateChatDataset();
  let calls = 0;
  const run = await runRetrievalEvaluation(dataset, options(await output("dry"), {
    caseIds: [dataset.cases[1].id, dataset.cases[3].id],
    maxCases: 1,
  }), { environment, synthetic: true, executeCase: async () => { calls += 1; throw new Error("must not run"); } });
  assert.equal(calls, 0);
  assert.equal(run.evidence.mode, "DRY_RUN");
  assert.deepEqual(run.evidence.cases.map((item) => item.caseId), [dataset.cases[1].id]);
  assert.equal(run.evidence.cases[0].embedding.calls, 0);
});

test("live mode requires explicit IDs, case limit, and embedding budget", async () => {
  const directory = await output("guard");
  assert.throws(() => validateRetrievalRunnerOptions(options(directory, { live: true })), /explicit case IDs/u);
  assert.throws(() => validateRetrievalRunnerOptions(options(directory, { live: true, caseIds: ["chat-eval-ans-001"] })), /embedding call budget/u);
  assert.throws(() => validateRetrievalRunnerOptions(options(directory, { live: true, caseIds: ["chat-eval-ans-001"], maxCases: 2, maxEmbeddingCalls: 1 })), /cannot exceed/u);
  assert.throws(() => validateRetrievalRunnerOptions(options(directory, { live: true, caseIds: Array.from({ length: 120 }, (_, index) => `case-${index}`), maxCases: 120, maxEmbeddingCalls: 120 })), /full 120-case/u);
});

test("live synthetic execution records diagnostics and enforces one call per case", async () => {
  const dataset = await loadAndValidateChatDataset();
  let calls = 0;
  const run = await runRetrievalEvaluation(dataset, options(await output("live"), {
    live: true,
    caseIds: [dataset.cases[0].id, dataset.cases[1].id],
    maxCases: 2,
    maxEmbeddingCalls: 2,
  }), {
    environment,
    synthetic: true,
    now: (() => { let time = 0; return () => time += 5; })(),
    executeCase: async () => {
      calls += 1;
      return { result: result(), vectorCandidates: [vector(1)], ftsCandidates: [fts(1)] };
    },
  });
  assert.equal(calls, 2);
  assert.equal(run.evidence.configuration.automaticProviderRetries, 0);
  assert.equal(run.evidence.configuration.queryRewriteCalls, 0);
  assert.equal(run.evidence.configuration.generationCalls, 0);
  assert.equal(run.evidence.configuration.rrfK, 60);
  assert.equal(run.evidence.cases[0].rrf.rankings[0].rrfRank, 1);
  assert.equal(run.evidence.cases[0].latencyMs, 5);
  assert.equal(run.evidence.cases[0].versions.ingestion, "p5.3-v1");
  const serialized = JSON.parse(await readFile(run.artifactPath, "utf8")) as { synthetic: boolean };
  assert.equal(serialized.synthetic, true);
});

test("provider failure is sanitized and is not retried", async () => {
  const dataset = await loadAndValidateChatDataset();
  let attempts = 0;
  const run = await runRetrievalEvaluation(dataset, options(await output("failure"), {
    live: true,
    caseIds: [dataset.cases[0].id],
    maxCases: 1,
    maxEmbeddingCalls: 1,
  }), { environment, synthetic: true, executeCase: async () => { attempts += 1; throw new Error("secret provider body"); } });
  assert.equal(attempts, 1);
  assert.equal(run.evidence.cases[0].errorCategory, "RETRIEVAL_FAILURE");
  assert.equal(JSON.stringify(run.evidence).includes("secret provider body"), false);
});

test("artifacts must be outside the repository and filenames are deterministic", async () => {
  const dataset = await loadAndValidateChatDataset();
  await assert.rejects(
    runRetrievalEvaluation(dataset, options(join(process.cwd(), "artifacts")), { environment }),
    /outside the repository/u,
  );
  const run = await runRetrievalEvaluation(dataset, options(await output("safe")), { environment, synthetic: true });
  assert.equal(run.artifactPath.endsWith("retrieval-evidence.json"), true);
});

test("runner configuration reuses the canonical retrieval constants", () => {
  assert.equal(VECTOR_CANDIDATE_LIMIT, 20);
  assert.equal(FTS_CANDIDATE_LIMIT, 20);
  assert.equal(RRF_K, 60);
  assert.equal(FINAL_SOURCE_LIMIT, 6);
});
