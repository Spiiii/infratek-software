import assert from "node:assert/strict";
import test from "node:test";
import { createGeminiEmbeddingProvider } from "../ingestion/embed.ts";
import type { EmbeddingProvider, EmbeddingProviderStats } from "../ingestion/types.ts";
import {
  FINAL_SOURCE_LIMIT,
  FTS_CANDIDATE_LIMIT,
  INTERACTIVE_EMBEDDING_CONFIG,
  RETRIEVAL_THRESHOLD,
  RRF_K,
  VECTOR_CANDIDATE_LIMIT,
} from "./config.ts";
import { prepareRetrievalQuery, RetrievalQueryValidationError } from "./query.ts";
import { createQueryEmbeddingAdapter, QueryEmbeddingError } from "./query-embedding.ts";
import { candidateIdentity, fuseAndSelectSources, fuseCandidates } from "./fusion.ts";
import { FtsRetrievalRepository, VectorRetrievalRepository } from "./repository.ts";
import type { FtsCandidate, RetrievalStatus, VectorCandidate } from "./types.ts";

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

const emptyStats = (): EmbeddingProviderStats => ({
  providerRequests: 0,
  successfulEmbeddings: 0,
  responses429: 0,
  responses5xx: 0,
  retryAttempts: 0,
  finalFailures: 0,
});

function fakeProvider(embed: EmbeddingProvider["embed"]): EmbeddingProvider {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    get stats() {
      return { ...emptyStats(), providerRequests: calls };
    },
    async embed(input) {
      calls += 1;
      return embed(input);
    },
  };
}

test("query embedding makes one correctly configured provider request", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const provider = createGeminiEmbeddingProvider({
    apiKey: "test-key",
    model: "gemini-embedding-2",
    dimension: 768,
    requestDelayMs: 0,
    maxRetries: 0,
    retryBaseMs: 1,
    retryMaxMs: 1,
    embedContent: async (request) => {
      requests.push(request);
      return { embeddings: [{ values: Array(768).fill(0.5) }] };
    },
  });
  const adapter = createQueryEmbeddingAdapter({ provider, dimension: 768 });
  const query = prepareRetrievalQuery("Email a@b.vn hỏi về Camera AI", {});
  const vector = await adapter.embed(query);

  assert.equal(adapter.calls, 1);
  assert.equal(vector.length, 768);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, "gemini-embedding-2");
  assert.equal((requests[0].config as { outputDimensionality: number }).outputDimensionality, 768);
  assert.equal(requests[0].contents, "Email [EMAIL] hỏi về Camera AI");
});

test("query embedding rejects wrong dimension and non-finite values", async () => {
  const wrongDimension = createQueryEmbeddingAdapter({
    provider: fakeProvider(async () => [1, 2]),
    dimension: 768,
  });
  await assert.rejects(
    wrongDimension.embed(prepareRetrievalQuery("Camera AI", {})),
    (error) => error instanceof QueryEmbeddingError && error.kind === "WRONG_DIMENSION",
  );

  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const invalidResponse = createQueryEmbeddingAdapter({
      provider: fakeProvider(async () => [invalid, ...Array(767).fill(0)]),
      dimension: 768,
    });
    await assert.rejects(
      invalidResponse.embed(prepareRetrievalQuery("Camera AI", {})),
      (error) => error instanceof QueryEmbeddingError && error.kind === "INVALID_RESPONSE",
    );
  }
});

test("query embedding maps 429 and 5xx without retry", async () => {
  for (const [status, expected] of [
    [429, "RATE_LIMIT"],
    [503, "PROVIDER_5XX"],
  ] as const) {
    const provider = createGeminiEmbeddingProvider({
      apiKey: "test-key",
      model: "gemini-embedding-2",
      dimension: 768,
      requestDelayMs: 0,
      maxRetries: 0,
      retryBaseMs: 1,
      retryMaxMs: 1,
      embedContent: async () => {
        throw Object.assign(
          new Error(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } })),
          { status },
        );
      },
    });
    const adapter = createQueryEmbeddingAdapter({ provider, dimension: 768 });
    await assert.rejects(
      adapter.embed(prepareRetrievalQuery("Camera AI", {})),
      (error) => error instanceof QueryEmbeddingError && error.kind === expected,
    );
    assert.equal(provider.calls, 1);
    assert.equal(provider.stats.retryAttempts, 0);
  }
});

test("query embedding does not log or persist the vector", async () => {
  const logs: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => {
    logs.push(values);
  };
  try {
    const adapter = createQueryEmbeddingAdapter({
      provider: fakeProvider(async () => Array(768).fill(0.25)),
      dimension: 768,
    });
    await adapter.embed(prepareRetrievalQuery("Camera AI", {}));
    assert.deepEqual(logs, []);
  } finally {
    console.log = originalLog;
  }
});

function vectorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "chunk-1",
    doc_type: "solution",
    doc_id: "1",
    chunk_key: "overview",
    title: "AI Consulting",
    heading_path: ["Tổng quan"],
    content: "Nội dung công khai",
    url: "/solutions/ai-consulting",
    vector_distance: 0.2,
    vector_similarity: 0.8,
    ...overrides,
  };
}

test("vector repository validates vectors before querying", async () => {
  let calls = 0;
  const repository = new VectorRetrievalRepository(
    {
      async query() {
        calls += 1;
        return { rows: [] };
      },
    },
    {},
  );
  await assert.rejects(repository.findTopCandidates([1, 2]), /wrong dimension/);
  await assert.rejects(
    repository.findTopCandidates([Number.NaN, ...Array(767).fill(0)]),
    /non-finite/,
  );
  await assert.rejects(
    repository.findTopCandidates([Number.POSITIVE_INFINITY, ...Array(767).fill(0)]),
    /non-finite/,
  );
  assert.equal(calls, 0);
});

test("vector repository uses parameters and maps deterministic Top 20 diagnostics", async () => {
  let capturedSql = "";
  let capturedParameters: unknown[] = [];
  const rows = [
    vectorRow({ id: "b", doc_id: "2", chunk_key: "b", vector_distance: 0.1, vector_similarity: 0.9 }),
    vectorRow({ id: "a", doc_id: "1", chunk_key: "a", vector_distance: 0.1, vector_similarity: 0.9 }),
    ...Array.from({ length: 19 }, (_, index) =>
      vectorRow({
        id: `extra-${index}`,
        doc_id: String(index + 10),
        chunk_key: `extra-${index}`,
        vector_distance: 0.2 + index / 100,
        vector_similarity: 0.8 - index / 100,
      }),
    ),
    vectorRow({ id: "invalid", url: "https://private.example/path", vector_distance: 0.05 }),
  ];
  const repository = new VectorRetrievalRepository(
    {
      async query(sql, parameters) {
        capturedSql = sql;
        capturedParameters = parameters;
        return { rows };
      },
    },
    {},
  );
  const result = await repository.findTopCandidates(Array(768).fill(0.01));

  assert.equal(result.candidates.length, 20);
  assert.equal(result.invalidRowCount, 1);
  assert.equal(result.candidates[0].id, "a");
  assert.equal(result.candidates[0].diagnostics.vectorRank, 1);
  assert.equal(result.candidates[0].diagnostics.vectorDistance, 0.1);
  assert.equal(result.candidates[0].diagnostics.vectorSimilarity, 0.9);
  assert.match(capturedSql, /embedding <=> \$1::vector/);
  assert.match(capturedSql, /embedding_model = \$2/);
  assert.match(capturedSql, /embedding_version = \$3/);
  assert.match(capturedSql, /LIMIT \$4/);
  assert.deepEqual(capturedParameters.slice(1), [
    "gemini-embedding-2",
    "gemini-embedding-2-768-p5.3",
    20,
  ]);
  assert.ok(typeof capturedParameters[0] === "string");
  assert.doesNotMatch(capturedSql, /0\.01/);
});

test("FTS repository passes only the prepared query as a SQL parameter", async () => {
  let capturedSql = "";
  let capturedParameters: unknown[] = [];
  const repository = new FtsRetrievalRepository({
    async query(sql, parameters) {
      capturedSql = sql;
      capturedParameters = parameters;
      return { rows: [] };
    },
  });
  const prepared = prepareRetrievalQuery("Email a@b.vn hỏi về doanh nghiệp", {});
  const result = await repository.findTopCandidates(prepared);

  assert.deepEqual(result, { candidates: [], invalidRowCount: 0 });
  assert.deepEqual(capturedParameters, ["Email [EMAIL] hỏi về doanh nghiệp", 20]);
  assert.match(capturedSql, /plainto_tsquery\('simple', public\.f_unaccent\(\$1\)\)/);
  assert.match(capturedSql, /search_vector @@ query\.value/);
  assert.match(capturedSql, /LIMIT \$2/);
  assert.doesNotMatch(capturedSql, /Email|doanh nghiệp/);
});

test("FTS repository maps deterministic Top 20 diagnostics and filters malformed rows", async () => {
  const rows = [
    vectorRow({ id: "b", doc_id: "2", chunk_key: "b", fts_score: 0.9 }),
    vectorRow({ id: "a", doc_id: "1", chunk_key: "a", fts_score: 0.9 }),
    ...Array.from({ length: 19 }, (_, index) =>
      vectorRow({
        id: `fts-${index}`,
        doc_id: String(index + 10),
        chunk_key: `fts-${index}`,
        fts_score: 0.8 - index / 100,
      }),
    ),
    vectorRow({ id: "invalid", url: "//private.example/path", fts_score: 1 }),
  ];
  const repository = new FtsRetrievalRepository({
    async query() {
      return { rows };
    },
  });
  const result = await repository.findTopCandidates(prepareRetrievalQuery("Camera AI", {}));

  assert.equal(result.candidates.length, 20);
  assert.equal(result.invalidRowCount, 1);
  assert.equal(result.candidates[0].id, "a");
  assert.deepEqual(result.candidates[0].diagnostics, { ftsRank: 1, ftsScore: 0.9 });
  assert.deepEqual(Object.keys(result.candidates[0].diagnostics), ["ftsRank", "ftsScore"]);
  assert.equal("vectorRank" in result.candidates[0].diagnostics, false);
  assert.equal("rrfScore" in result.candidates[0].diagnostics, false);
});

function candidateMetadata(id: string, docId = id, chunkKey = "overview") {
  return {
    id,
    docType: "solution" as const,
    docId,
    chunkKey,
    title: id,
    headingPath: ["Tổng quan"],
    content: `Nội dung ${id}`,
    url: `/solutions/${id}`,
  };
}

function vectorCandidate(
  id: string,
  rank: number,
  distance = 0.2,
  docId = id,
  chunkKey = "overview",
): VectorCandidate {
  return {
    ...candidateMetadata(id, docId, chunkKey),
    diagnostics: { vectorRank: rank, vectorDistance: distance, vectorSimilarity: 1 - distance },
  };
}

function ftsCandidate(
  id: string,
  rank: number,
  score = 0.5,
  docId = id,
  chunkKey = "overview",
): FtsCandidate {
  return {
    ...candidateMetadata(id, docId, chunkKey),
    diagnostics: { ftsRank: rank, ftsScore: score },
  };
}

test("RRF applies k=60 without similarity or FTS-score weighting", () => {
  const fused = fuseCandidates(
    [vectorCandidate("a", 1, 0.99), vectorCandidate("b", 2, 0.01)],
    [ftsCandidate("a", 3, 0.01), ftsCandidate("c", 1, 999)],
  );
  const byId = new Map(fused.map((candidate) => [candidate.id, candidate]));

  assert.equal(byId.get("a")?.diagnostics.rrfScore, 1 / 61 + 1 / 63);
  assert.equal(byId.get("b")?.diagnostics.rrfScore, 1 / 62);
  assert.equal(byId.get("c")?.diagnostics.rrfScore, 1 / 61);
  assert.equal(fused[0].id, "a");
  assert.deepEqual(byId.get("a")?.diagnostics, {
    vectorRank: 1,
    vectorDistance: 0.99,
    vectorSimilarity: 0.010000000000000009,
    ftsRank: 3,
    ftsScore: 0.01,
    rrfScore: 1 / 61 + 1 / 63,
  });
  assert.equal("ftsRank" in byId.get("b")!.diagnostics, false);
  assert.equal("vectorRank" in byId.get("c")!.diagnostics, false);
});

test("RRF defensively deduplicates each retriever using the best-ranked diagnostics", () => {
  const result = fuseCandidates(
    [vectorCandidate("a-worse", 4, 0.1, "same"), vectorCandidate("a-best", 1, 0.3, "same")],
    [ftsCandidate("f-worse", 5, 0.9, "same"), ftsCandidate("f-best", 2, 0.2, "same")],
  );

  assert.equal(result.length, 1);
  assert.equal(candidateIdentity(result[0]), "solution\u0000same\u0000overview");
  assert.equal(result[0].id, "a-best");
  assert.deepEqual(result[0].diagnostics, {
    vectorRank: 1,
    vectorDistance: 0.3,
    vectorSimilarity: 0.7,
    ftsRank: 2,
    ftsScore: 0.2,
    rrfScore: 1 / 61 + 1 / 62,
  });
});

test("RRF ordering follows rank, distance presence/value, FTS score, and identity", () => {
  const vectors = [
    vectorCandidate("distance-b", 2, 0.4),
    vectorCandidate("distance-a", 2, 0.2),
    vectorCandidate("identity-b", 3, 0.3),
    vectorCandidate("identity-a", 3, 0.3),
  ];
  const fullText = [
    ftsCandidate("fts-high", 2, 0.8),
    ftsCandidate("fts-low", 2, 0.2),
  ];
  const first = fuseCandidates(vectors, fullText).map((candidate) => candidate.id);
  const second = fuseCandidates([...vectors], [...fullText]).map((candidate) => candidate.id);

  assert.deepEqual(first, [
    "distance-a",
    "distance-b",
    "fts-high",
    "fts-low",
    "identity-a",
    "identity-b",
  ]);
  assert.deepEqual(second, first);
});

test("selection returns zero, fewer than six, exactly six, and caps at six with S labels", () => {
  assert.deepEqual(fuseAndSelectSources([], []).selectedSources, []);
  assert.equal(fuseAndSelectSources([vectorCandidate("one", 1)], []).selectedSources.length, 1);

  const six = Array.from({ length: 6 }, (_, index) => vectorCandidate(`v${index}`, index + 1));
  assert.deepEqual(
    fuseAndSelectSources(six, []).selectedSources.map((source) => source.source.label),
    ["S1", "S2", "S3", "S4", "S5", "S6"],
  );
  const seven = [...six, vectorCandidate("v6", 7)];
  assert.equal(fuseAndSelectSources(seven, []).selectedSources.length, 6);
});

test("concentration diagnostics do not impose a diversity cap or change ordering", () => {
  const vectors = [
    vectorCandidate("a1", 1, 0.1, "document-a", "one"),
    vectorCandidate("a2", 2, 0.2, "document-a", "two"),
    vectorCandidate("a3", 3, 0.3, "document-a", "three"),
    vectorCandidate("b1", 4, 0.4, "document-b", "one"),
  ];
  const result = fuseAndSelectSources(vectors, []);

  assert.deepEqual(result.selectedSources.map((source) => source.source.chunkKey), [
    "one",
    "two",
    "three",
    "one",
  ]);
  assert.deepEqual(result.concentration, {
    selectedCount: 4,
    distinctDocumentCount: 2,
    maxChunksFromSingleDocument: 3,
    documentConcentration: 0.75,
  });
  assert.deepEqual(RETRIEVAL_THRESHOLD, { state: "UN-CALIBRATED" });
});
