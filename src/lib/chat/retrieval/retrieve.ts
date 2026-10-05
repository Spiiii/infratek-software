import { readChatBuildSafeConfig } from "../config.ts";
import { fuseAndSelectSources } from "./fusion.ts";
import { prepareRetrievalQuery, type PreparedRetrievalQuery } from "./query.ts";
import { QueryEmbeddingError, type QueryEmbeddingFailure } from "./query-embedding.ts";
import type { FtsSearchResult, VectorSearchResult } from "./repository.ts";
import type {
  RetrievalDiagnostics,
  RetrievalFailureCategory,
  RetrievalMode,
  RetrievalResult,
  RetrievalStatus,
} from "./types.ts";

export type RetrievalDependencies = {
  queryEmbedding: {
    readonly calls: number;
    embed(query: PreparedRetrievalQuery): Promise<number[]>;
  };
  vectorRepository: {
    findTopCandidates(queryEmbedding: number[]): Promise<VectorSearchResult>;
  };
  ftsRepository: {
    findTopCandidates(query: PreparedRetrievalQuery): Promise<FtsSearchResult>;
  };
};

type BranchOutcome<T> =
  | { succeeded: true; value: T }
  | { succeeded: false; failure: RetrievalFailureCategory };

function databaseFailure<T>(): BranchOutcome<T> {
  return { succeeded: false, failure: "DATABASE" };
}

function embeddingFailure(error: unknown): QueryEmbeddingFailure {
  return error instanceof QueryEmbeddingError ? error.kind : "PROVIDER_UNAVAILABLE";
}

function status(mode: RetrievalMode, candidateCount: number): RetrievalStatus {
  if (mode === "UNAVAILABLE") {
    return { mode, candidateState: "UNKNOWN", relevanceState: "UNAVAILABLE" };
  }
  if (candidateCount > 0) {
    return { mode, candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" };
  }
  if (mode === "HYBRID") {
    return { mode, candidateState: "NO_CANDIDATES", relevanceState: "NO_CONTEXT" };
  }
  return { mode, candidateState: "NO_CANDIDATES", relevanceState: "UN_CALIBRATED" };
}

export async function retrieve(
  rawQuestion: unknown,
  dependencies: RetrievalDependencies,
  environment: Record<string, string | undefined> = process.env,
): Promise<RetrievalResult> {
  const prepared = prepareRetrievalQuery(rawQuestion, environment);
  const config = readChatBuildSafeConfig(environment);
  const callsBefore = dependencies.queryEmbedding.calls;

  const ftsPromise: Promise<BranchOutcome<FtsSearchResult>> = dependencies.ftsRepository
    .findTopCandidates(prepared)
    .then((value) => ({ succeeded: true as const, value }))
    .catch(() => databaseFailure<FtsSearchResult>());

  let embeddingFailureCategory: QueryEmbeddingFailure | undefined;
  let vectorAttempted = false;
  const vectorPromise: Promise<BranchOutcome<VectorSearchResult>> = dependencies.queryEmbedding
    .embed(prepared)
    .then(async (queryEmbedding) => {
      vectorAttempted = true;
      try {
        return {
          succeeded: true as const,
          value: await dependencies.vectorRepository.findTopCandidates(queryEmbedding),
        };
      } catch {
        return databaseFailure<VectorSearchResult>();
      }
    })
    .catch((error) => {
      embeddingFailureCategory = embeddingFailure(error);
      return { succeeded: false as const, failure: embeddingFailureCategory };
    });

  const [ftsOutcome, vectorOutcome] = await Promise.all([ftsPromise, vectorPromise]);
  const physicalCalls = dependencies.queryEmbedding.calls - callsBefore;
  if (physicalCalls < 0 || physicalCalls > 1) {
    throw new Error("Interactive embedding call budget exceeded");
  }

  const vectorCandidates = vectorOutcome.succeeded ? vectorOutcome.value.candidates : [];
  const ftsCandidates = ftsOutcome.succeeded ? ftsOutcome.value.candidates : [];
  const mode: RetrievalMode =
    vectorOutcome.succeeded && ftsOutcome.succeeded
      ? "HYBRID"
      : vectorOutcome.succeeded
        ? "VECTOR_ONLY"
        : ftsOutcome.succeeded
          ? "FTS_ONLY"
          : "UNAVAILABLE";
  const fusion = fuseAndSelectSources(vectorCandidates, ftsCandidates);
  const failures: RetrievalDiagnostics["failures"] = [];
  if (embeddingFailureCategory) failures.push("EMBEDDING");
  if (!vectorOutcome.succeeded && vectorAttempted) failures.push("VECTOR", "DATABASE");
  if (!ftsOutcome.succeeded) failures.push("FTS", "DATABASE");

  return {
    status: status(mode, fusion.selectedSources.length),
    sources: fusion.selectedSources,
    diagnostics: {
      mode,
      vectorCandidateCount: vectorCandidates.length,
      ftsCandidateCount: ftsCandidates.length,
      fusedCandidateCount: fusion.fusedCandidates.length,
      selectedSourceCount: fusion.selectedSources.length,
      queryEmbeddingCalls: physicalCalls as 0 | 1,
      queryRewriteCalls: 0,
      chatModelCalls: 0,
      failures,
      embedding: {
        attempted: true,
        physicalCalls: physicalCalls as 0 | 1,
        model: config.model.embedding,
        dimension: config.model.embeddingDimension,
        ...(embeddingFailureCategory ? { failure: embeddingFailureCategory } : {}),
      },
      vector: {
        attempted: vectorAttempted,
        succeeded: vectorOutcome.succeeded,
        candidateCount: vectorCandidates.length,
        ...(!vectorOutcome.succeeded ? { failure: vectorOutcome.failure } : {}),
      },
      fts: {
        attempted: true,
        succeeded: ftsOutcome.succeeded,
        candidateCount: ftsCandidates.length,
        ...(!ftsOutcome.succeeded ? { failure: ftsOutcome.failure } : {}),
      },
      fusion: {
        fusedCandidateCount: fusion.fusedCandidates.length,
        selectedCount: fusion.selectedSources.length,
        distinctDocumentCount: fusion.concentration.distinctDocumentCount,
        maxChunksFromSingleDocument: fusion.concentration.maxChunksFromSingleDocument,
      },
    },
  };
}
