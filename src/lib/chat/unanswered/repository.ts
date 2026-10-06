export interface UnansweredQueryExecutor {
  query(sql: string, parameters: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export class ChatUnansweredRepository {
  private readonly executor: UnansweredQueryExecutor;

  constructor(executor: UnansweredQueryExecutor) {
    this.executor = executor;
  }

  async upsert(input: {
    normalizedQuestion: string;
    questionHash: string;
    sampleQuestionRedacted: string;
    now: Date;
    expiresAt: Date;
  }): Promise<{ id: string; occurrenceCount: number }> {
    const result = await this.executor.query(
      `INSERT INTO chat_unanswered (
         normalized_question, question_hash, sample_question_redacted,
         occurrence_count, first_seen_at, last_seen_at, expires_at
       ) VALUES ($1, $2, $3, 1, $4, $4, $5)
       ON CONFLICT (question_hash) DO UPDATE SET
         occurrence_count = chat_unanswered.occurrence_count + 1,
         last_seen_at = EXCLUDED.last_seen_at,
         expires_at = EXCLUDED.expires_at
       RETURNING id, occurrence_count`,
      [
        input.normalizedQuestion,
        input.questionHash,
        input.sampleQuestionRedacted,
        input.now,
        input.expiresAt,
      ],
    );
    const row = result.rows[0];
    const count = Number(row?.occurrence_count);
    if (typeof row?.id !== "string" || !Number.isSafeInteger(count) || count < 1) {
      throw new Error("Unanswered upsert returned an invalid result");
    }
    return { id: row.id, occurrenceCount: count };
  }
}
