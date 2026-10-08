type QueryResult = { rows: Array<Record<string, unknown>>; rowCount?: number | null };
export interface LeadQueryExecutor { query(sql: string, parameters: unknown[]): Promise<QueryResult>; }

export type PersistedLeadInput = {
  name: string; email?: string; phone?: string; company: string; message?: string; conversationId?: string;
};

export class ChatLeadRepository {
  private readonly executor: LeadQueryExecutor;
  constructor(executor: LeadQueryExecutor) { this.executor = executor; }

  async conversationBelongsToSession(conversationId: string, sessionId: string, now: Date): Promise<boolean> {
    const result = await this.executor.query(
      `SELECT id FROM chat_conversations
       WHERE id = $1 AND session_id = $2 AND status = 'active' AND expires_at > $3 LIMIT 1`,
      [conversationId, sessionId, now],
    );
    return result.rows.length === 1;
  }

  async create(input: PersistedLeadInput): Promise<string> {
    const result = await this.executor.query(
      `INSERT INTO chat_leads (name, email, phone, company, message, conversation_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.name, input.email ?? null, input.phone ?? null, input.company, input.message ?? null, input.conversationId ?? null],
    );
    const id = result.rows[0]?.id;
    if (typeof id !== "string") throw new Error("Lead write did not return an id");
    return id;
  }
}
