import assert from "node:assert/strict";
import test from "node:test";
import type { CaseStudy, Faq, Solution } from "../../../payload-types.ts";
import { chunkDocument } from "./chunk.ts";
import { contentHash } from "./hash.ts";
import { planIngestion } from "./plan.ts";
import { prepareDocumentIngestionPlan } from "./reindex.ts";
import { documentsFromSnapshot, type SourceSnapshot } from "./sources.ts";
import type { ExistingChunk, IndexableDocument, IngestionVersions } from "./types.ts";

const versions: IngestionVersions = {
  embeddingModel: "gemini-embedding-2-preview",
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
