import type { Payload } from "payload";
import type { EmbeddedChunk, ExistingChunk, IndexableDocType } from "./types.ts";

type DatabaseRow = Record<string, unknown>;

export class RagChunkRepository {
  constructor(private readonly payload: Payload) {}

  async listExisting(): Promise<ExistingChunk[]> {
    const result = await this.payload.db.pool.query(`
      SELECT doc_type, doc_id, chunk_key, content_hash,
             embedding_model, embedding_version, ingestion_version
      FROM rag_chunks
    `);
    return (result.rows as DatabaseRow[]).map((row) => ({
      docType: row.doc_type as IndexableDocType,
      docId: String(row.doc_id),
      chunkKey: String(row.chunk_key),
      contentHash: String(row.content_hash),
      embeddingModel: String(row.embedding_model),
      embeddingVersion: String(row.embedding_version),
      ingestionVersion: String(row.ingestion_version),
    }));
  }

  async apply(options: {
    upserts: EmbeddedChunk[];
    deleteStale: ExistingChunk[];
    embeddingModel: string;
    embeddingVersion: string;
    ingestionVersion: string;
    dimension: number;
  }): Promise<void> {
    const client = await this.payload.db.pool.connect();
    try {
      await client.query("BEGIN");
      for (const chunk of options.upserts) {
        if (chunk.embedding.length !== options.dimension || chunk.embedding.some((value) => !Number.isFinite(value))) {
          throw new Error(`Invalid embedding for ${chunk.docType}/${chunk.docId}/${chunk.chunkKey}`);
        }
        await client.query(
          `INSERT INTO rag_chunks (
             doc_type, doc_id, chunk_key, url, title, heading_path,
             content, content_plain, content_hash, embedding,
             embedding_model, embedding_version, ingestion_version
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,$11,$12,$13)
           ON CONFLICT (doc_type, doc_id, chunk_key) DO UPDATE SET
             url=EXCLUDED.url, title=EXCLUDED.title, heading_path=EXCLUDED.heading_path,
             content=EXCLUDED.content, content_plain=EXCLUDED.content_plain,
             content_hash=EXCLUDED.content_hash, embedding=EXCLUDED.embedding,
             embedding_model=EXCLUDED.embedding_model,
             embedding_version=EXCLUDED.embedding_version,
             ingestion_version=EXCLUDED.ingestion_version, updated_at=now()`,
          [
            chunk.docType,
            chunk.docId,
            chunk.chunkKey,
            chunk.url,
            chunk.title,
            chunk.headingPath,
            chunk.content,
            chunk.contentPlain,
            chunk.contentHash,
            `[${chunk.embedding.join(",")}]`,
            options.embeddingModel,
            options.embeddingVersion,
            options.ingestionVersion,
          ],
        );
      }
      for (const chunk of options.deleteStale) {
        await client.query(
          `DELETE FROM rag_chunks WHERE doc_type=$1 AND doc_id=$2 AND chunk_key=$3`,
          [chunk.docType, chunk.docId, chunk.chunkKey],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async removeDocument(docType: IndexableDocType, docId: string): Promise<number> {
    const result = await this.payload.db.pool.query(
      `DELETE FROM rag_chunks WHERE doc_type=$1 AND doc_id=$2`,
      [docType, docId],
    );
    return result.rowCount ?? 0;
  }
}
