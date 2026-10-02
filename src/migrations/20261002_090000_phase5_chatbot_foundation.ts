import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS unaccent;

    CREATE OR REPLACE FUNCTION public.f_unaccent(input text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
    AS $function$
      SELECT public.unaccent('public.unaccent'::regdictionary, input)
    $function$;

    CREATE TABLE "rag_chunks" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "doc_type" text NOT NULL,
      "doc_id" text NOT NULL,
      "chunk_key" text NOT NULL,
      "url" text NOT NULL,
      "title" text,
      "heading_path" text[] NOT NULL DEFAULT '{}',
      "content" text NOT NULL,
      "content_plain" text NOT NULL,
      "content_hash" text NOT NULL,
      "search_vector" tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', public.f_unaccent("content_plain"))
      ) STORED,
      "embedding" vector(768),
      "embedding_model" text NOT NULL,
      "embedding_version" text NOT NULL,
      "ingestion_version" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "rag_chunks_doc_type_not_blank" CHECK (btrim("doc_type") <> ''),
      CONSTRAINT "rag_chunks_doc_id_not_blank" CHECK (btrim("doc_id") <> ''),
      CONSTRAINT "rag_chunks_chunk_key_not_blank" CHECK (btrim("chunk_key") <> ''),
      CONSTRAINT "rag_chunks_url_not_blank" CHECK (btrim("url") <> ''),
      CONSTRAINT "rag_chunks_content_hash_not_blank" CHECK (btrim("content_hash") <> ''),
      CONSTRAINT "rag_chunks_identity_unique" UNIQUE ("doc_type", "doc_id", "chunk_key")
    );

    CREATE INDEX "rag_chunks_document_idx"
      ON "rag_chunks" ("doc_type", "doc_id");
    CREATE INDEX "rag_chunks_content_hash_idx"
      ON "rag_chunks" ("content_hash");
    CREATE INDEX "rag_chunks_embedding_hnsw_idx"
      ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops)
      WHERE "embedding" IS NOT NULL;
    CREATE INDEX "rag_chunks_search_vector_gin_idx"
      ON "rag_chunks" USING gin ("search_vector");

    CREATE TABLE "chat_conversations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "session_id" text NOT NULL,
      "messages_redacted" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "flags" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "status" text NOT NULL DEFAULT 'active',
      "chat_model_version" text NOT NULL,
      "prompt_version" text NOT NULL,
      "threshold_version" text NOT NULL DEFAULT 'UN-CALIBRATED',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
      CONSTRAINT "chat_conversations_status_check"
        CHECK ("status" IN ('active', 'completed', 'error')),
      CONSTRAINT "chat_conversations_messages_array_check"
        CHECK (jsonb_typeof("messages_redacted") = 'array'),
      CONSTRAINT "chat_conversations_sources_array_check"
        CHECK (jsonb_typeof("sources") = 'array')
    );

    CREATE INDEX "chat_conversations_session_idx"
      ON "chat_conversations" ("session_id");
    CREATE INDEX "chat_conversations_expires_at_idx"
      ON "chat_conversations" ("expires_at");

    CREATE TABLE "chat_leads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "email" text,
      "phone" text,
      "company" text,
      "message" text,
      "conversation_id" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "chat_leads_conversation_fk"
        FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id")
        ON DELETE SET NULL
    );

    CREATE INDEX "chat_leads_conversation_idx"
      ON "chat_leads" ("conversation_id");

    CREATE TABLE "chat_feedback" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "conversation_id" uuid,
      "message_index" integer,
      "vote" smallint NOT NULL,
      "unsupported" boolean NOT NULL DEFAULT false,
      "unsupported_reason" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
      CONSTRAINT "chat_feedback_conversation_fk"
        FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id")
        ON DELETE SET NULL,
      CONSTRAINT "chat_feedback_vote_check" CHECK ("vote" IN (-1, 1)),
      CONSTRAINT "chat_feedback_message_index_check"
        CHECK ("message_index" IS NULL OR "message_index" >= 0)
    );

    CREATE INDEX "chat_feedback_conversation_idx"
      ON "chat_feedback" ("conversation_id");
    CREATE INDEX "chat_feedback_expires_at_idx"
      ON "chat_feedback" ("expires_at");

    CREATE TABLE "chat_unanswered" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "normalized_question" text NOT NULL,
      "question_hash" text NOT NULL,
      "sample_question_redacted" text NOT NULL,
      "occurrence_count" integer NOT NULL DEFAULT 1,
      "first_seen_at" timestamptz NOT NULL DEFAULT now(),
      "last_seen_at" timestamptz NOT NULL DEFAULT now(),
      "review_status" text NOT NULL DEFAULT 'pending',
      "resolution_type" text,
      "resolved_content_id" text,
      "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
      CONSTRAINT "chat_unanswered_question_hash_unique" UNIQUE ("question_hash"),
      CONSTRAINT "chat_unanswered_occurrence_count_check"
        CHECK ("occurrence_count" >= 1),
      CONSTRAINT "chat_unanswered_review_status_check"
        CHECK ("review_status" IN (
          'pending',
          'reviewed',
          'ignored',
          'converted_to_faq',
          'converted_to_post'
        ))
    );

    CREATE INDEX "chat_unanswered_review_status_idx"
      ON "chat_unanswered" ("review_status");
    CREATE INDEX "chat_unanswered_expires_at_idx"
      ON "chat_unanswered" ("expires_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "chat_feedback";
    DROP TABLE IF EXISTS "chat_leads";
    DROP TABLE IF EXISTS "chat_unanswered";
    DROP TABLE IF EXISTS "chat_conversations";
    DROP TABLE IF EXISTS "rag_chunks";
    DROP FUNCTION IF EXISTS public.f_unaccent(text);
  `);
}
