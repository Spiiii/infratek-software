import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { decideAnswer } from "../src/lib/chat/decision/policy.ts";
import { contentHash } from "../src/lib/chat/ingestion/hash.ts";
import type { RetrievalResult } from "../src/lib/chat/retrieval/types.ts";
import {
  hydrateRecordedSources,
  parseGenerationEvidence,
  runHydrationPreflight,
  runGenerationEvaluation,
  validateGenerationRunnerOptions,
  type GenerationRunnerOptions,
  type HydratedChunkRow,
} from "./generation-runner.ts";
import {
  assertPreviewDatabase,
  loadHydrationRowsReadOnly,
  withHydrationResource,
} from "./run-generation-eval.ts";
import { loadAndValidateChatDataset } from "./validate-chat-dataset.ts";

const environment = {
  CHAT_MODEL_VERSION: "gemini-3.5-flash-lite-p5.1",
  EMBED_VERSION: "gemini-embedding-2-768-p5.3",
  INGESTION_VERSION: "p5.3-v1",
  PROMPT_VERSION: "p5.3",
  THRESHOLD_VERSION: "UN-CALIBRATED",
};

function candidate(index: number) {
  return {
    docType: "solution",
    docId: `doc-${index}`,
    chunkKey: `chunk-${index}`,
    url: `/solutions/source-${index}`,
    vectorRank: index,
    rrfRank: index,
    rrfScore: 1 / (60 + index),
  };
}

function artifact(caseIds: string[], overrides: Record<string, unknown> = {}) {
  return {
    kind: "P5.7-E_RETRIEVAL_EVIDENCE",
    runId: "synthetic-retrieval-run",
    datasetVersion: "p5.7-b-final-v1",
    mode: "LIVE",
    versions: {
      model: "gemini-3.5-flash-lite-p5.1",
      embedding: "gemini-embedding-2-768-p5.3",
      ingestion: "p5.3-v1",
      prompt: "p5.3",
      threshold: "UN-CALIBRATED",
    },
    cases: caseIds.map((caseId, caseIndex) => ({
      caseId,
      expectedDecision: caseId.includes("-mis-") || caseId.includes("-inj-") ? "NO_CONTEXT" : "ANSWER",
      executionStatus: "SUCCESS",
      finalTop6: [candidate(caseIndex + 1), candidate(caseIndex + 11)],
    })),
    ...overrides,
  };
}

function row(index: number, overrides: Partial<HydratedChunkRow> = {}): HydratedChunkRow {
  const headingPath = [`Heading ${index}`];
  const content = `Published content ${index}`;
  return {
    docType: "solution",
    docId: `doc-${index}`,
    chunkKey: `chunk-${index}`,
    url: `/solutions/source-${index}`,
    title: `Source ${index}`,
    headingPath,
    content,
    contentHash: contentHash(headingPath, content),
    ...overrides,
  };
}

async function output(name: string): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), `infratek-p5.7e4-${name}-`));
  return join(parent, "run-output");
}

function options(outputDirectory: string, overrides: Partial<GenerationRunnerOptions> = {}): GenerationRunnerOptions {
  return {
    runId: "synthetic-generation-run",
    outputDirectory,
    repositoryRoot: process.cwd(),
    live: false,
    caseIds: ["chat-eval-ans-024"],
    maxCases: 1,
    timestamp: "2026-10-10T00:00:00.000Z",
    ...overrides,
  };
}

function rowsFor(caseIds: string[]): Map<string, HydratedChunkRow[]> {
  return new Map(caseIds.map((caseId, index) => [caseId, [row(index + 1), row(index + 11)]]));
}

test("dry-run validates exact selection with zero provider and database calls", async () => {
  const dataset = await loadAndValidateChatDataset();
  let databaseCalls = 0;
  let providerCalls = 0;
  const beforeTypes = createHash("sha256").update(await readFile("src/payload-types.ts")).digest("hex");
  const result = await runGenerationEvaluation(
    dataset,
    artifact(["chat-eval-ans-024"]),
    options(await output("dry")),
    {
      environment,
      hydrateCases: async () => { databaseCalls += 1; return new Map(); },
      executeGeneration: async () => {
        providerCalls += 1;
        throw new Error("must not execute");
      },
    },
  );
  const afterTypes = createHash("sha256").update(await readFile("src/payload-types.ts")).digest("hex");
  assert.equal(databaseCalls, 0);
  assert.equal(providerCalls, 0);
  assert.equal(result.evidence.mode, "DRY_RUN");
  assert.equal(result.evidence.configuration.maximumGenerationCalls, 0);
  assert.equal(result.evidence.configuration.embeddingCalls, 0);
  assert.equal(result.evidence.configuration.retrievalCalls, 0);
  assert.equal(result.evidence.configuration.automaticProviderRetries, 0);
  assert.equal(beforeTypes, afterTypes);
});

test("hydration-only preflight selects exactly six cases with zero provider calls", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = [
    "chat-eval-ans-024",
    "chat-eval-mis-013",
    "chat-eval-inj-002",
    "chat-eval-lang-006",
    "chat-eval-bnd-002",
    "chat-eval-ans-001",
  ];
  let hydrationCalls = 0;
  const beforeTypes = createHash("sha256").update(await readFile("src/payload-types.ts")).digest("hex");
  const result = await runHydrationPreflight(
    dataset,
    [
      artifact(caseIds.slice(0, 3)),
      artifact(caseIds.slice(3), { runId: "synthetic-retrieval-run-2" }),
    ],
    options(await output("hydrate-only"), {
      caseIds,
      maxCases: 6,
    }),
    {
      environment,
      sourceArtifactIntegrity: [
        { runId: "synthetic-retrieval-run", sha256: "a".repeat(64), bytes: 100 },
        { runId: "synthetic-retrieval-run-2", sha256: "b".repeat(64), bytes: 200 },
      ],
      hydrateCases: async (selected) => {
        hydrationCalls += 1;
        return new Map(selected.map(({ datasetCase, artifactCase }) => [
          datasetCase.id,
          artifactCase.finalTop6.map((item) => {
            const index = Number(item.docId.replace("doc-", ""));
            return row(index);
          }),
        ]));
      },
    },
  );
  const afterTypes = createHash("sha256").update(await readFile("src/payload-types.ts")).digest("hex");
  assert.equal(hydrationCalls, 1);
  assert.deepEqual(result.evidence.cases.map((item) => item.caseId), caseIds);
  assert.equal(result.evidence.configuration.selectedCases, 6);
  assert.equal(result.evidence.configuration.expectedChunkReferences, 12);
  assert.equal(result.evidence.configuration.resolvedChunkReferences, 12);
  assert.equal(result.evidence.configuration.generationCalls, 0);
  assert.equal(result.evidence.configuration.embeddingCalls, 0);
  assert.equal(result.evidence.configuration.retrievalCalls, 0);
  assert.equal(result.evidence.configuration.databaseWrites, 0);
  assert.equal(result.evidence.cases.every((item) => item.contextManifest[0]?.label === "S1"), true);
  assert.equal(result.evidence.cases.every((item) => item.contextManifest[1]?.label === "S2"), true);
  assert.equal(beforeTypes, afterTypes);
});

test("hydration-only mode rejects generation settings and bad integrity metadata", async () => {
  const dataset = await loadAndValidateChatDataset();
  const raw = artifact(["chat-eval-ans-024"]);
  const baseDependencies = {
    environment,
    hydrateCases: async () => new Map<string, HydratedChunkRow[]>(),
    sourceArtifactIntegrity: [{ runId: "wrong-run", sha256: "a".repeat(64), bytes: 1 }],
  };
  await assert.rejects(
    runHydrationPreflight(dataset, raw, options(await output("hydrate-live"), {
      live: true,
      maxGenerationCalls: 1,
    }), baseDependencies),
    /cannot enable live generation/u,
  );
  await assert.rejects(
    runHydrationPreflight(dataset, raw, options(await output("hydrate-integrity")), baseDependencies),
    /integrity metadata mismatch/u,
  );
});

test("Preview target guard accepts only phase3-preview neondb", () => {
  assert.doesNotThrow(() => assertPreviewDatabase({
    DATABASE_URL: "postgresql://user:secret@ep-nameless-leaf-b3fc4hoi-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  }));
  assert.throws(() => assertPreviewDatabase({
    DATABASE_URL: "postgresql://user:secret@ep-still-fog-b3h6yj1y-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  }), /does not match/u);
  assert.throws(() => assertPreviewDatabase({
    DATABASE_URL: "postgresql://user:secret@ep-nameless-leaf-b3fc4hoi-pooler.c-4.ap-southeast-1.aws.neon.tech/other?sslmode=require",
  }), /requires Preview database neondb/u);
});

test("selection and live generation budgets fail closed", async () => {
  const directory = await output("guards");
  assert.throws(() => validateGenerationRunnerOptions(options(directory, { caseIds: [] })), /explicit case IDs/u);
  assert.throws(() => validateGenerationRunnerOptions(options(directory, {
    caseIds: ["chat-eval-ans-024", "chat-eval-lang-006"],
    maxCases: 1,
  })), /exceed maximum case count/u);
  assert.throws(() => validateGenerationRunnerOptions(options(directory, { live: true })), /generation call budget/u);
  assert.throws(() => validateGenerationRunnerOptions(options(directory, {
    live: true,
    caseIds: ["chat-eval-ans-024", "chat-eval-lang-006"],
    maxCases: 2,
    maxGenerationCalls: 1,
  })), /exceed the generation call budget/u);
});

test("invalid artifact mode, version, duplicates, and missing cases abort", async () => {
  const dataset = await loadAndValidateChatDataset();
  await assert.rejects(
    runGenerationEvaluation(dataset, artifact(["chat-eval-ans-024"], { mode: "DRY_RUN" }), options(await output("mode")), { environment }),
  );
  await assert.rejects(
    runGenerationEvaluation(dataset, artifact(["chat-eval-ans-024"], { runStatus: "STOPPED" }), options(await output("stopped")), { environment }),
  );
  await assert.rejects(
    runGenerationEvaluation(dataset, artifact(["chat-eval-ans-024"], {
      versions: { ...artifact([]).versions, prompt: "p5.2" },
    }), options(await output("version")), { environment }),
    /prompt version mismatch/u,
  );
  await assert.rejects(
    runGenerationEvaluation(dataset, artifact(["chat-eval-ans-024", "chat-eval-ans-024"]), options(await output("duplicate")), { environment }),
    /Duplicate case ID/u,
  );
  await assert.rejects(
    runGenerationEvaluation(dataset, artifact(["chat-eval-lang-006"]), options(await output("missing")), { environment }),
    /missing from retrieval artifact/u,
  );
  await assert.rejects(
    runGenerationEvaluation(
      dataset,
      [artifact(["chat-eval-ans-024"]), artifact(["chat-eval-ans-024"], { runId: "second-run" })],
      options(await output("cross-artifact-duplicate")),
      { environment },
    ),
    /Duplicate case ID across retrieval artifacts/u,
  );
});

test("explicit selection can span retrieval artifacts under one total budget", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = ["chat-eval-ans-001", "chat-eval-ans-024"];
  const result = await runGenerationEvaluation(
    dataset,
    [
      artifact([caseIds[0]]),
      artifact([caseIds[1]], { runId: "synthetic-retrieval-run-2" }),
    ],
    options(await output("multi-artifact"), {
      caseIds,
      maxCases: 2,
      maxGenerationCalls: 2,
    }),
    { environment },
  );
  assert.deepEqual(result.evidence.cases.map((item) => item.caseId), caseIds);
  assert.deepEqual(result.evidence.sourceRetrievalRunIds, [
    "synthetic-retrieval-run",
    "synthetic-retrieval-run-2",
  ]);
  assert.equal(result.evidence.configuration.maximumGenerationCalls, 2);
  assert.equal(result.evidence.cases[0].sourceArtifactRunId, "synthetic-retrieval-run");
  assert.equal(result.evidence.cases[1].sourceArtifactRunId, "synthetic-retrieval-run-2");
});

test("hydration validates identity, URL, hash and preserves final source order", () => {
  const candidates = [candidate(2), candidate(1)];
  const original = JSON.stringify({ candidates, rows: [row(1), row(2)] });
  const hydrated = hydrateRecordedSources(candidates, [row(1), row(2)]);
  assert.deepEqual(hydrated.sources.map(({ source }) => [source.label, source.chunkKey]), [
    ["S1", "chunk-2"],
    ["S2", "chunk-1"],
  ]);
  assert.equal(JSON.stringify({ candidates, rows: [row(1), row(2)] }), original);
  assert.throws(() => hydrateRecordedSources(candidates, [row(1)]), /Missing hydrated chunk/u);
  assert.throws(() => hydrateRecordedSources(candidates, [row(1), row(1), row(2)]), /Duplicate hydrated chunk/u);
  assert.throws(() => hydrateRecordedSources(candidates, [row(1), row(2, { url: "/wrong" })]), /URL mismatch/u);
  assert.throws(() => hydrateRecordedSources(candidates, [row(1), row(2, { contentHash: "bad" })]), /content hash mismatch/u);
});

test("NO_CONTEXT and injection expectations remain recorded and use exactly one generation call", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = ["chat-eval-mis-013", "chat-eval-inj-002"];
  let calls = 0;
  const result = await runGenerationEvaluation(
    dataset,
    artifact(caseIds),
    options(await output("refusal"), {
      live: true,
      caseIds,
      maxCases: 2,
      maxGenerationCalls: 2,
    }),
    {
      environment,
      hydrateCases: async () => rowsFor(caseIds),
      executeGeneration: async () => {
        calls += 1;
        return {
          result: { state: "NO_ANSWER", policyVersion: "eval-only" },
          physicalCalls: 1,
          sanitizedOutput: "KHONG_CO_THONG_TIN",
        };
      },
      now: (() => { let time = 0; return () => time += 5; })(),
    },
  );
  assert.equal(calls, 2);
  assert.deepEqual(result.evidence.cases.map((item) => item.actualDecision), ["NO_CONTEXT", "NO_CONTEXT"]);
  assert.deepEqual(result.evidence.cases.map((item) => item.expectedDecision), ["NO_CONTEXT", "NO_CONTEXT"]);
  assert.equal(result.evidence.cases.every((item) => item.review.answerCorrectness === "NOT_EVALUATED"), true);
});

test("provider failure stops the batch without retry and records no raw error", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = ["chat-eval-ans-024", "chat-eval-lang-006"];
  let calls = 0;
  const result = await runGenerationEvaluation(
    dataset,
    artifact(caseIds),
    options(await output("failure"), {
      live: true,
      caseIds,
      maxCases: 2,
      maxGenerationCalls: 2,
    }),
    {
      environment,
      hydrateCases: async () => rowsFor(caseIds),
      executeGeneration: async () => {
        calls += 1;
        return {
          result: { state: "DEPENDENCY_FALLBACK", reason: "PROVIDER_UNAVAILABLE", policyVersion: "eval-only" },
          physicalCalls: 1,
          sanitizedOutput: null,
        };
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.evidence.cases.length, 1);
  assert.equal(result.evidence.cases[0].errorCategory, "PROVIDER_UNAVAILABLE");
  assert.equal(JSON.stringify(result.evidence).includes("secret provider body"), false);
});

test("sanitized grounding reasons persist while historical evidence remains compatible", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = ["chat-eval-lang-006"];
  const reasons = [
    "MISSING_CITATION",
    "CITATION_MISMATCH",
    "MALFORMED_CITATION",
    "INVALID_OUTPUT",
  ] as const;
  let calls = 0;

  for (const groundingReason of reasons) {
    const result = await runGenerationEvaluation(
      dataset,
      artifact(caseIds),
      options(await output(`grounding-${groundingReason.toLowerCase()}`), {
        live: true,
        caseIds,
        maxCases: 1,
        maxGenerationCalls: 1,
      }),
      {
        environment,
        hydrateCases: async () => rowsFor(caseIds),
        executeGeneration: async () => {
          calls += 1;
          return {
            result: {
              state: "DEPENDENCY_FALLBACK",
              reason: "INVALID_GROUNDED_OUTPUT",
              groundingReason,
              policyVersion: "eval-only",
            },
            physicalCalls: 1,
            sanitizedOutput: null,
          };
        },
      },
    );
    assert.equal(result.evidence.cases[0].groundingReason, groundingReason);
    assert.equal("sanitizedModelOutput" in result.evidence.cases[0], false);
    const serialized = JSON.parse(await readFile(result.artifactPath, "utf8")) as unknown;
    assert.equal(parseGenerationEvidence(serialized).cases[0].groundingReason, groundingReason);
  }

  assert.equal(calls, 4);

  const historical = {
    kind: "P5.7-E_GENERATION_EVIDENCE",
    runId: "historical-e4-b3",
    cases: [{ caseId: "chat-eval-lang-006", errorCategory: "INVALID_GROUNDED_OUTPUT" }],
  };
  const parsedHistorical = parseGenerationEvidence(historical);
  assert.equal("groundingReason" in parsedHistorical.cases[0], false);
  assert.throws(
    () => parseGenerationEvidence({
      ...historical,
      cases: [{ ...historical.cases[0], groundingReason: "RAW_PROVIDER_ERROR" }],
    }),
    /Invalid enum value/u,
  );
  assert.equal(JSON.stringify(parsedHistorical).includes("raw rejected output"), false);
});

test("protected-output safe fallback records categories without unsafe model text", async () => {
  const dataset = await loadAndValidateChatDataset();
  const caseIds = ["chat-eval-ans-024"];
  const result = await runGenerationEvaluation(
    dataset,
    artifact(caseIds),
    options(await output("protected-output"), {
      live: true,
      caseIds,
      maxCases: 1,
      maxGenerationCalls: 1,
    }),
    {
      environment,
      hydrateCases: async () => rowsFor(caseIds),
      executeGeneration: async () => ({
        result: {
          state: "SAFE_FALLBACK",
          reason: "UNSUPPORTED_OUTPUT",
          unsupported: true,
          categories: ["UNSUPPORTED_NUMBER"],
          policyVersion: "eval-only",
        },
        physicalCalls: 1,
        sanitizedOutput: null,
      }),
    },
  );
  assert.deepEqual(result.evidence.cases[0].protectedOutput, {
    state: "SAFE_FALLBACK",
    unsupported: true,
    categories: ["UNSUPPORTED_NUMBER"],
  });
  assert.equal("groundingReason" in result.evidence.cases[0], false);
  assert.equal("sanitizedModelOutput" in result.evidence.cases[0], false);
});

test("production pre-calibration policy remains unchanged", () => {
  const retrieval: RetrievalResult = {
    status: { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    sources: [],
    diagnostics: {
      mode: "HYBRID",
      vectorCandidateCount: 1,
      ftsCandidateCount: 0,
      fusedCandidateCount: 1,
      selectedSourceCount: 0,
      queryEmbeddingCalls: 1,
      queryRewriteCalls: 0,
      chatModelCalls: 0,
      failures: [],
      embedding: { attempted: true, physicalCalls: 1, model: "synthetic", dimension: 768 },
      vector: { attempted: true, succeeded: true, candidateCount: 1 },
      fts: { attempted: true, succeeded: true, candidateCount: 0 },
      fusion: { fusedCandidateCount: 1, selectedCount: 0, distinctDocumentCount: 1, maxChunksFromSingleDocument: 1 },
    },
  };
  assert.equal(decideAnswer(retrieval).state, "CALIBRATION_REQUIRED");
});

test("read-only hydration uses rollback and resource cleanup on success and error", async () => {
  const queries: string[] = [];
  let released = 0;
  let poolsEnded = 0;
  const pool = {
    async connect() {
      return {
        async query(sql: string) {
          queries.push(sql);
          return { rows: sql.startsWith("WITH wanted") ? [] : [] };
        },
        release() { released += 1; },
      };
    },
    async end() { poolsEnded += 1; },
  };
  await withHydrationResource(pool, (active) => loadHydrationRowsReadOnly(active, [candidate(1)]));
  assert.match(queries[0], /BEGIN READ ONLY/u);
  assert.match(queries.at(-1) ?? "", /ROLLBACK/u);
  assert.equal(queries.some((sql) => /INSERT|UPDATE|DELETE/iu.test(sql)), false);
  assert.equal(released, 1);
  assert.equal(poolsEnded, 1);

  const errorQueries: string[] = [];
  let errorReleased = 0;
  let errorPoolsEnded = 0;
  await assert.rejects(withHydrationResource({
    async connect() {
      return {
        async query(sql: string) {
          errorQueries.push(sql);
          if (sql.startsWith("WITH wanted")) throw new Error("synthetic db error");
          return { rows: [] };
        },
        release() { errorReleased += 1; },
      };
    },
    async end() { errorPoolsEnded += 1; },
  }, (active) => loadHydrationRowsReadOnly(active, [candidate(1)])), /synthetic db error/u);
  assert.match(errorQueries[0], /BEGIN READ ONLY/u);
  assert.match(errorQueries.at(-1) ?? "", /ROLLBACK/u);
  assert.equal(errorReleased, 1);
  assert.equal(errorPoolsEnded, 1);
});
