import { readChatBuildSafeConfig } from "../config.ts";
import type { IndexableDocType } from "../ingestion/types.ts";
import { VECTOR_CANDIDATE_LIMIT } from "./config.ts";
import type { VectorCandidate } from "./types.ts";

type QueryResult = { rows: Array<Record<string, unknown>> };
export type RetrievalQueryExecutor = {
  query(sql: string, parameters: unknown[]): Promise<QueryResult>;
};

export type VectorSearchResult = {
  candidates: VectorCandidate[];
  invalidRowCount: number;
};

const DOC_TYPES = new Set<IndexableDocType>([
  "solution",
  "case_study",
  "post",
  "page",
  "faq",
  "company_fact",
]);

function isPublicPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  );
}

function toCandidate(row: Record<string, unknown>): Omit<VectorCandidate, "diagnostics"> | null {
  if (
    typeof row.id !== "string" ||
    typeof row.doc_type !== "string" ||
    !DOC_TYPES.has(row.doc_type as IndexableDocType) ||
    typeof row.doc_id !== "string" ||
    typeof row.chunk_key !== "string" ||
    !(typeof row.title === "string" || row.title === null) ||
    !Array.isArray(row.heading_path) ||
    !row.heading_path.every((value) => typeof value === "string") ||
    typeof row.content !== "string" ||
    !isPublicPath(row.url)
  ) {
    return null;
  }
  return {
    id: row.id,
    docType: row.doc_type as IndexableDocType,
    docId: row.doc_id,
    chunkKey: row.chunk_key,
    title: row.title,
    headingPath: row.heading_path,
    content: row.content,
    url: row.url,
  };
}

function validateVector(vector: number[], dimension: number) {
  if (vector.length !== dimension) throw new Error("Query embedding has the wrong dimension");
  if (vector.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Query embedding contains a non-finite value");
  }
}

export class VectorRetrievalRepository {
  private readonly executor: RetrievalQueryExecutor;
  private readonly environment: Record<string, string | undefined>;

  constructor(
    executor: RetrievalQueryExecutor,
    environment: Record<string, string | undefined> = process.env,
  ) {
    this.executor = executor;
    this.environment = environment;
  }

  async findTopCandidates(queryEmbedding: number[]): Promise<VectorSearchResult> {
    const config = readChatBuildSafeConfig(this.environment);
    validateVector(queryEmbedding, config.model.embeddingDimension);
    const vectorParameter = `[${queryEmbedding.join(",")}]`;
    const result = await this.executor.query(
      `SELECT id, doc_type, doc_id, chunk_key, title, heading_path, content, url,
              embedding <=> $1::vector AS vector_distance,
              1 - (embedding <=> $1::vector) AS vector_similarity
       FROM rag_chunks
       WHERE embedding IS NOT NULL
         AND embedding_model = $2
         AND embedding_version = $3
       ORDER BY embedding <=> $1::vector ASC,
                doc_type ASC, doc_id ASC, chunk_key ASC
       LIMIT $4`,
      [
        vectorParameter,
        config.model.embedding,
        config.versioning.embedding,
        VECTOR_CANDIDATE_LIMIT,
      ],
    );

    let invalidRowCount = 0;
    const mapped = result.rows.flatMap((row) => {
      const candidate = toCandidate(row);
      const distance = Number(row.vector_distance);
      const similarity = Number(row.vector_similarity);
      if (!candidate || !Number.isFinite(distance) || !Number.isFinite(similarity)) {
        invalidRowCount += 1;
        return [];
      }
      return [{ candidate, distance, similarity }];
    });
    mapped.sort(
      (left, right) =>
        left.distance - right.distance ||
        left.candidate.docType.localeCompare(right.candidate.docType) ||
        left.candidate.docId.localeCompare(right.candidate.docId) ||
        left.candidate.chunkKey.localeCompare(right.candidate.chunkKey),
    );

    return {
      candidates: mapped.slice(0, VECTOR_CANDIDATE_LIMIT).map((item, index) => ({
        ...item.candidate,
        diagnostics: {
          vectorRank: index + 1,
          vectorDistance: item.distance,
          vectorSimilarity: item.similarity,
        },
      })),
      invalidRowCount,
    };
  }
}
