import { chunkDocument } from "./chunk.ts";
import { planIngestion } from "./plan.ts";
import type { RagChunkRepository } from "./repository.ts";
import type {
  EmbeddedChunk,
  EmbeddingProvider,
  IndexableDocument,
  IngestionPlan,
  IngestionVersions,
} from "./types.ts";

export type ReindexSummary = {
  documents: number;
  chunksByType: Record<string, number>;
  insert: number;
  update: number;
  unchanged: number;
  delete: number;
  totalDesired: number;
  embeddingCalls: number;
  embeddingStats?: EmbeddingProvider["stats"];
  dryRun: boolean;
};

export function prepareIngestionPlan(
  documents: IndexableDocument[],
  existing: Awaited<ReturnType<RagChunkRepository["listExisting"]>>,
  versions: IngestionVersions,
): IngestionPlan {
  return planIngestion(documents.flatMap(chunkDocument), existing, versions);
}

export function prepareDocumentIngestionPlan(
  document: IndexableDocument,
  existing: Awaited<ReturnType<RagChunkRepository["listExisting"]>>,
  versions: IngestionVersions,
): IngestionPlan {
  const scoped = existing.filter(
    (chunk) => chunk.docType === document.docType && chunk.docId === document.docId,
  );
  return planIngestion(chunkDocument(document), scoped, versions);
}

const chunkCounts = (documents: IndexableDocument[]) =>
  documents.flatMap(chunkDocument).reduce<Record<string, number>>((counts, chunk) => {
    counts[chunk.docType] = (counts[chunk.docType] ?? 0) + 1;
    return counts;
  }, {});

export async function runReindex(options: {
  documents: IndexableDocument[];
  repository: RagChunkRepository;
  versions: IngestionVersions;
  dimension: number;
  dryRun: boolean;
  provider?: EmbeddingProvider;
}): Promise<ReindexSummary> {
  const existing = await options.repository.listExisting();
  const plan = prepareIngestionPlan(options.documents, existing, options.versions);
  const requiresEmbedding = [...plan.insert, ...plan.update];

  if (options.dryRun) {
    return {
      documents: options.documents.length,
      chunksByType: chunkCounts(options.documents),
      insert: plan.insert.length,
      update: plan.update.length,
      unchanged: plan.unchanged.length,
      delete: plan.deleteStale.length,
      totalDesired: plan.insert.length + plan.update.length + plan.unchanged.length,
      embeddingCalls: 0,
      dryRun: true,
    };
  }
  if (!options.provider) throw new Error("Embedding provider is required for live ingestion");

  // Correctness-first bounded behavior: one request at a time. All embeddings
  // finish before the transaction, so a provider failure preserves old chunks.
  const embedded: EmbeddedChunk[] = [];
  for (const chunk of requiresEmbedding) {
    embedded.push({ ...chunk, embedding: await options.provider.embed(chunk.embeddingInput) });
  }

  await options.repository.apply({
    upserts: embedded,
    deleteStale: plan.deleteStale,
    ...options.versions,
    dimension: options.dimension,
  });

  return {
    documents: options.documents.length,
    chunksByType: chunkCounts(options.documents),
    insert: plan.insert.length,
    update: plan.update.length,
    unchanged: plan.unchanged.length,
    delete: plan.deleteStale.length,
    totalDesired: plan.insert.length + plan.update.length + plan.unchanged.length,
    embeddingCalls: options.provider.calls,
    embeddingStats: options.provider.stats,
    dryRun: false,
  };
}

export async function runDocumentReindex(
  options: Omit<Parameters<typeof runReindex>[0], "documents"> & { document: IndexableDocument },
): Promise<ReindexSummary> {
  const existing = await options.repository.listExisting();
  const plan = prepareDocumentIngestionPlan(options.document, existing, options.versions);
  const requiresEmbedding = [...plan.insert, ...plan.update];
  if (options.dryRun) {
    return {
      documents: 1,
      chunksByType: chunkCounts([options.document]),
      insert: plan.insert.length,
      update: plan.update.length,
      unchanged: plan.unchanged.length,
      delete: plan.deleteStale.length,
      totalDesired: plan.insert.length + plan.update.length + plan.unchanged.length,
      embeddingCalls: 0,
      dryRun: true,
    };
  }
  if (!options.provider) throw new Error("Embedding provider is required for live ingestion");
  const embedded: EmbeddedChunk[] = [];
  for (const chunk of requiresEmbedding) {
    embedded.push({ ...chunk, embedding: await options.provider.embed(chunk.embeddingInput) });
  }
  await options.repository.apply({
    upserts: embedded,
    deleteStale: plan.deleteStale,
    ...options.versions,
    dimension: options.dimension,
  });
  return {
    documents: 1,
    chunksByType: chunkCounts([options.document]),
    insert: plan.insert.length,
    update: plan.update.length,
    unchanged: plan.unchanged.length,
    delete: plan.deleteStale.length,
    totalDesired: plan.insert.length + plan.update.length + plan.unchanged.length,
    embeddingCalls: options.provider.calls,
    embeddingStats: options.provider.stats,
    dryRun: false,
  };
}
