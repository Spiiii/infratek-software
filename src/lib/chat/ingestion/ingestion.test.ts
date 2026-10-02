import assert from "node:assert/strict";
import test from "node:test";
import type { CaseStudy, Faq, Solution } from "../../../payload-types.ts";
import { chunkDocument } from "./chunk.ts";
import { createGeminiEmbeddingProvider, inspectEmbeddingError, parseRetryAfter } from "./embed.ts";
import { contentHash } from "./hash.ts";
import { planIngestion } from "./plan.ts";
import { prepareDocumentIngestionPlan } from "./reindex.ts";
import { readIngestionRuntimeConfig } from "./runtime-config.ts";
import { documentsFromSnapshot, type SourceSnapshot } from "./sources.ts";
import type { ExistingChunk, IndexableDocument, IngestionVersions } from "./types.ts";

const versions: IngestionVersions = {
  embeddingModel: "gemini-embedding-2",
  embeddingVersion: "embedding-v1",
  ingestionVersion: "ingestion-v1",
};

const solution = (status: "draft" | "published", id = 1) =>
  ({
    id,
    _status: status,
    slug: `solution-${id}`,
    title: `Solution ${id}`,
    shortTitle: `S${id}`,
    description: "Mô tả",
    seoTitle: "SEO",
    seoDescription: "SEO",
    icon: "icon",
    color: "blue",
    quickAnswer: "Trả lời nhanh",
    needSignals: ["Nhu cầu"],
    deliverables: { status: "verified", items: ["Bàn giao"] },
    process: [{ step: 1, title: "Khảo sát", description: "Khảo sát hiện trạng" }],
    outcomes: ["Kết quả"],
    audienceFit: { status: "placeholder" },
    timelineAndInvestment: { status: "placeholder" },
    faq: { status: "placeholder" },
    reviewState: status === "published" ? "approved" : "editing",
    updatedAt: "2026-10-02T00:00:00.000Z",
    createdAt: "2026-10-02T00:00:00.000Z",
  }) as unknown as Solution;

const emptySnapshot = (): SourceSnapshot => ({
  solutions: [],
  caseStudies: [],
  posts: [],
  pages: [],
  faq: null,
  companyFacts: null,
});

const document: IndexableDocument = {
  docType: "post",
  docId: "1",
  slug: "sample",
  url: "/blog/sample",
  title: "Bài mẫu",
  sections: [{ headingPath: ["Tổng quan"], content: "Nội dung ổn định" }],
};

test("published documents are accepted and drafts are rejected", () => {
  const snapshot = emptySnapshot();
  snapshot.solutions = [solution("published", 1), solution("draft", 2)];
  const documents = documentsFromSnapshot(snapshot);
  assert.deepEqual(documents.map((item) => item.slug), ["solution-1"]);
});

test("chunk identity and content hash are deterministic", () => {
  assert.deepEqual(chunkDocument(document), chunkDocument(structuredClone(document)));
  assert.equal(contentHash(["Tổng quan"], "Nội dung"), contentHash(["Tổng quan"], "Nội dung"));
});

test("same content and versions are unchanged", () => {
  const chunk = chunkDocument(document)[0];
  const existing: ExistingChunk = {
    docType: chunk.docType,
    docId: chunk.docId,
    chunkKey: chunk.chunkKey,
    contentHash: chunk.contentHash,
    embeddingModel: versions.embeddingModel,
    embeddingVersion: versions.embeddingVersion,
    ingestionVersion: versions.ingestionVersion,
  };
  const plan = planIngestion([chunk], [existing], versions);
  assert.equal(plan.unchanged.length, 1);
  assert.equal(plan.update.length, 0);
});

test("changed content or model version requires update", () => {
  const chunk = chunkDocument(document)[0];
  const existing: ExistingChunk = {
    docType: chunk.docType,
    docId: chunk.docId,
    chunkKey: chunk.chunkKey,
    contentHash: "old-hash",
    embeddingModel: versions.embeddingModel,
    embeddingVersion: versions.embeddingVersion,
    ingestionVersion: versions.ingestionVersion,
  };
  assert.equal(planIngestion([chunk], [existing], versions).update.length, 1);
  existing.contentHash = chunk.contentHash;
  existing.embeddingVersion = "old-model-version";
  assert.equal(planIngestion([chunk], [existing], versions).update.length, 1);
});

test("missing desired identity becomes a stale delete candidate", () => {
  const existing: ExistingChunk = {
    docType: "post",
    docId: "deleted",
    chunkKey: "overview",
    contentHash: "hash",
    embeddingModel: versions.embeddingModel,
    embeddingVersion: versions.embeddingVersion,
    ingestionVersion: versions.ingestionVersion,
  };
  assert.deepEqual(planIngestion([], [existing], versions).deleteStale, [existing]);
});

test("document reindex scopes stale deletion to that document", () => {
  const current = chunkDocument(document)[0];
  const other: ExistingChunk = {
    docType: "post",
    docId: "other-document",
    chunkKey: "overview",
    contentHash: "hash",
    embeddingModel: versions.embeddingModel,
    embeddingVersion: versions.embeddingVersion,
    ingestionVersion: versions.ingestionVersion,
  };
  const staleInDocument: ExistingChunk = { ...other, docId: document.docId, chunkKey: "removed" };
  const plan = prepareDocumentIngestionPlan(document, [other, staleInDocument], versions);
  assert.deepEqual(plan.deleteStale, [staleInDocument]);
  assert.equal(plan.insert[0].chunkKey, current.chunkKey);
});

test("each FAQ item becomes an independent semantic chunk", () => {
  const snapshot = emptySnapshot();
  snapshot.faq = {
    id: 1,
    items: [
      { question: "Câu hỏi một?", answer: "Trả lời một" },
      { question: "Câu hỏi hai?", answer: "Trả lời hai" },
    ],
  } as Faq;
  const faq = documentsFromSnapshot(snapshot)[0];
  assert.equal(chunkDocument(faq).length, 2);
});

test("case-study metric is preserved as its own chunk", () => {
  const snapshot = emptySnapshot();
  snapshot.caseStudies = [
    {
      id: 1,
      _status: "published",
      title: "Case",
      slug: "case",
      industry: "Công nghệ",
      year: "2026",
      clientName: "Ẩn danh",
      clientDisplay: "anonymized",
      dataClassification: "verified",
      tldr: "Tóm tắt",
      challenge: "Thách thức",
      solution: "Giải pháp",
      metrics: [{ value: 98, unit: "%", label: "Độ chính xác" }],
      reviewState: "approved",
      updatedAt: "2026-10-02T00:00:00.000Z",
      createdAt: "2026-10-02T00:00:00.000Z",
    } as CaseStudy,
  ];
  const chunks = chunkDocument(documentsFromSnapshot(snapshot)[0]);
  assert.ok(chunks.some((chunk) => chunk.headingPath.join("/") === "Chỉ số/Độ chính xác"));
});

test("empty FAQ and company facts are skipped safely", () => {
  const snapshot = emptySnapshot();
  snapshot.faq = { id: 1, items: [] } as Faq;
  assert.deepEqual(documentsFromSnapshot(snapshot), []);
});

test("ingestion runtime config uses configurable pacing and retry defaults", () => {
  const config = readIngestionRuntimeConfig({
    GEMINI_EMBED_MODEL: "gemini-embedding-2",
    GEMINI_EMBED_DIM: "768",
  });
  assert.equal(config.requestDelayMs, 1_000);
  assert.equal(config.maxRetries, 3);
  assert.equal(config.retryBaseMs, 5_000);
  assert.equal(config.retryMaxMs, 60_000);
});

test("retry metadata parses provider RetryInfo and Retry-After", () => {
  const error = Object.assign(
    new Error(
      JSON.stringify({
        error: {
          status: "RESOURCE_EXHAUSTED",
          details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "7s" }],
        },
      }),
    ),
    { status: 429 },
  );
  assert.deepEqual(inspectEmbeddingError(error), {
    status: 429,
    reason: "RESOURCE_EXHAUSTED",
    retryDelayMs: 7_000,
  });
  assert.equal(parseRetryAfter("12"), 12_000);
});

test("embedding provider paces sequential calls and prefers provider retry delay", async () => {
  const delays: number[] = [];
  let attempts = 0;
  const provider = createGeminiEmbeddingProvider({
    apiKey: "test-key",
    model: "gemini-embedding-2",
    dimension: 768,
    requestDelayMs: 1_000,
    maxRetries: 3,
    retryBaseMs: 5_000,
    retryMaxMs: 60_000,
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
    embedContent: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(
          new Error(
            JSON.stringify({
              error: {
                status: "RESOURCE_EXHAUSTED",
                details: [
                  { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "7s" },
                ],
              },
            }),
          ),
          { status: 429 },
        );
      }
      return { embeddings: [{ values: Array(768).fill(0.25) }] };
    },
  });

  await provider.embed("first");
  await provider.embed("second");
  assert.equal(provider.calls, 3);
  assert.deepEqual(delays, [7_000, 1_000]);
  assert.deepEqual(provider.stats, {
    providerRequests: 3,
    successfulEmbeddings: 2,
    responses429: 1,
    responses5xx: 0,
    retryAttempts: 1,
    finalFailures: 0,
  });
});
