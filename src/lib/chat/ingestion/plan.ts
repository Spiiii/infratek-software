import type {
  ExistingChunk,
  IngestionPlan,
  IngestionVersions,
  PreparedChunk,
} from "./types.ts";

const identity = (value: Pick<PreparedChunk | ExistingChunk, "docType" | "docId" | "chunkKey">) =>
  `${value.docType}\u0000${value.docId}\u0000${value.chunkKey}`;

export function planIngestion(
  desired: PreparedChunk[],
  existing: ExistingChunk[],
  versions: IngestionVersions,
): IngestionPlan {
  const existingByIdentity = new Map(existing.map((chunk) => [identity(chunk), chunk]));
  const desiredKeys = new Set<string>();
  const plan: IngestionPlan = { insert: [], update: [], unchanged: [], deleteStale: [] };

  for (const chunk of desired) {
    const key = identity(chunk);
    if (desiredKeys.has(key)) throw new Error(`Duplicate desired chunk identity: ${key}`);
    desiredKeys.add(key);
    const stored = existingByIdentity.get(key);
    if (!stored) {
      plan.insert.push(chunk);
      continue;
    }
    const reusable =
      stored.contentHash === chunk.contentHash &&
      stored.embeddingModel === versions.embeddingModel &&
      stored.embeddingVersion === versions.embeddingVersion &&
      stored.ingestionVersion === versions.ingestionVersion;
    (reusable ? plan.unchanged : plan.update).push(chunk);
  }

  plan.deleteStale = existing.filter((chunk) => !desiredKeys.has(identity(chunk)));
  return plan;
}
