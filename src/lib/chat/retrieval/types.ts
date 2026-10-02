import type { IndexableDocType } from "../ingestion/types.ts";

export type AvailableRetrievalMode = "HYBRID" | "VECTOR_ONLY" | "FTS_ONLY";
export type RetrievalMode = AvailableRetrievalMode | "UNAVAILABLE";
export type CandidateState = "HAS_CANDIDATES" | "NO_CANDIDATES" | "UNKNOWN";
export type RelevanceState = "UN_CALIBRATED" | "NO_CONTEXT" | "ACCEPTED" | "UNAVAILABLE";

export type RetrievalStatus =
  | { mode: "UNAVAILABLE"; candidateState: "UNKNOWN"; relevanceState: "UNAVAILABLE" }
  | {
      mode: AvailableRetrievalMode;
      candidateState: "NO_CANDIDATES";
      relevanceState: "NO_CONTEXT";
    }
  | {
      mode: AvailableRetrievalMode;
      candidateState: "HAS_CANDIDATES";
      relevanceState: "UN_CALIBRATED" | "ACCEPTED";
    };

export type CandidateIdentity = {
  docType: IndexableDocType;
  docId: string;
  chunkKey: string;
};

export type CandidateMetadata = CandidateIdentity & {
  id: string;
  title: string | null;
  headingPath: string[];
  content: string;
  url: string;
};

export type CandidateDiagnostics = {
  vectorRank?: number;
  ftsRank?: number;
  vectorDistance?: number;
  vectorSimilarity?: number;
  ftsScore?: number;
  rrfScore?: number;
};

export type VectorCandidate = CandidateMetadata & {
  diagnostics: Required<
    Pick<CandidateDiagnostics, "vectorRank" | "vectorDistance" | "vectorSimilarity">
  >;
};

export type FtsCandidate = CandidateMetadata & {
  diagnostics: Required<Pick<CandidateDiagnostics, "ftsRank" | "ftsScore">>;
};

export type FusedCandidate = CandidateMetadata & {
  diagnostics: CandidateDiagnostics & Required<Pick<CandidateDiagnostics, "rrfScore">>;
};

export type SourceLabel = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export type PublicSource = CandidateIdentity & {
  label: SourceLabel;
  title: string | null;
  headingPath: string[];
  content: string;
  url: string;
};

export type SelectedSource = {
  source: PublicSource;
  diagnostics: CandidateDiagnostics;
};

export type RetrievalDiagnostics = {
  vectorCandidateCount: number;
  ftsCandidateCount: number;
  fusedCandidateCount: number;
  selectedSourceCount: number;
  queryEmbeddingCalls: 0 | 1;
  queryRewriteCalls: 0;
  chatModelCalls: 0;
  failures: Array<"EMBEDDING" | "VECTOR" | "FTS" | "DATABASE">;
};

export type RetrievalResult = {
  status: RetrievalStatus;
  sources: SelectedSource[];
  diagnostics: RetrievalDiagnostics;
};
