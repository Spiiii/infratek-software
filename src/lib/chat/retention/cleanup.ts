type QueryResult = { rows: Array<Record<string, unknown>> };

export interface RetentionQueryExecutor {
  query(sql: string, parameters: unknown[]): Promise<QueryResult>;
}

export type RetentionCleanupResult = {
  conversations: number;
  feedback: number;
  unanswered: number;
};

function nonNegativeCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Retention cleanup returned an invalid count");
  }
  return parsed;
}

/**
 * Cleanup primitive only. It is intentionally not connected to an HTTP route,
 * script, cron, migration, or application startup path.
 */
export async function cleanupExpiredChatData(
  executor: RetentionQueryExecutor,
  now: Date,
): Promise<RetentionCleanupResult> {
  const result = await executor.query(
    `WITH deleted_feedback AS (
       DELETE FROM chat_feedback WHERE expires_at <= $1 RETURNING 1
     ), deleted_unanswered AS (
       DELETE FROM chat_unanswered WHERE expires_at <= $1 RETURNING 1
     ), deleted_conversations AS (
       DELETE FROM chat_conversations WHERE expires_at <= $1 RETURNING 1
     )
     SELECT
       (SELECT count(*) FROM deleted_conversations) AS conversations,
       (SELECT count(*) FROM deleted_feedback) AS feedback,
       (SELECT count(*) FROM deleted_unanswered) AS unanswered`,
    [now],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Retention cleanup returned no result");
  return {
    conversations: nonNegativeCount(row.conversations),
    feedback: nonNegativeCount(row.feedback),
    unanswered: nonNegativeCount(row.unanswered),
  };
}
