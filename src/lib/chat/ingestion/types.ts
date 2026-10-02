export type IndexableDocType =
  | "solution"
  | "case_study"
  | "post"
  | "page"
  | "faq"
  | "company_fact";

export type IndexableSection = {
  headingPath: string[];
  content: string;
};

export type IndexableDocument = {
  docType: IndexableDocType;
  docId: string;
  slug: string;
  url: string;
  title: string;
  sections: IndexableSection[];
  updatedAt?: string;
};

export type PreparedChunk = {
  docType: IndexableDocType;
  docId: string;
  chunkKey: string;
  url: string;
  title: string;
  headingPath: string[];
  content: string;
  contentPlain: string;
  contentHash: string;
  embeddingInput: string;
};

export type ExistingChunk = {
  docType: IndexableDocType;
  docId: string;
  chunkKey: string;
  contentHash: string;
  embeddingModel: string;
  embeddingVersion: string;
  ingestionVersion: string;
};

export type IngestionVersions = {
  embeddingModel: string;
  embeddingVersion: string;
  ingestionVersion: string;
};

export type IngestionPlan = {
  insert: PreparedChunk[];
  update: PreparedChunk[];
  unchanged: PreparedChunk[];
  deleteStale: ExistingChunk[];
};

export type EmbeddedChunk = PreparedChunk & { embedding: number[] };

export interface EmbeddingProvider {
  readonly calls: number;
  readonly stats: EmbeddingProviderStats;
  embed(input: string): Promise<number[]>;
}

export type EmbeddingProviderStats = {
  providerRequests: number;
  successfulEmbeddings: number;
  responses429: number;
  responses5xx: number;
  retryAttempts: number;
  finalFailures: number;
};
