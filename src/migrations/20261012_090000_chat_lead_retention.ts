import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "chat_leads"
      ADD COLUMN "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '180 days');

    CREATE INDEX "chat_leads_expires_at_idx"
      ON "chat_leads" ("expires_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "chat_leads_expires_at_idx";
    ALTER TABLE "chat_leads" DROP COLUMN IF EXISTS "expires_at";
  `);
}
