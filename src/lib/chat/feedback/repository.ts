import { parseConversationMessages } from "../conversation/repository.ts";

type QueryResult = { rows: Array<Record<string, unknown>>; rowCount?: number | null };
export interface FeedbackQueryExecutor { query(sql: string, parameters: unknown[]): Promise<QueryResult>; }
export type EligibleAnswer = { conversationId: string; messageIndex: number };

export class ChatFeedbackRepository {
  private readonly executor: FeedbackQueryExecutor;
  constructor(executor: FeedbackQueryExecutor) { this.executor = executor; }

  async latestEligibleAnswer(input: { conversationId: string; sessionId: string; now: Date }): Promise<EligibleAnswer | undefined> {
    const result = await this.executor.query(
      `SELECT id, messages_redacted FROM chat_conversations
       WHERE id = $1 AND session_id = $2 AND status = 'active' AND expires_at > $3 LIMIT 1`,
      [input.conversationId, input.sessionId, input.now],
    );
    const row = result.rows[0];
    if (typeof row?.id !== "string") return undefined;
    const messages = parseConversationMessages(row.messages_redacted);
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant" && message.outcome === "ANSWER") {
        return { conversationId: row.id, messageIndex: index };
      }
    }
    return undefined;
  }

  async record(input: EligibleAnswer & { vote: 1 | -1; expiresAt: Date }): Promise<"RECORDED" | "DUPLICATE"> {
    const existing = await this.executor.query(
      `SELECT id FROM chat_feedback WHERE conversation_id = $1 AND message_index = $2
       ORDER BY created_at ASC, id ASC LIMIT 1`,
      [input.conversationId, input.messageIndex],
    );
    if (existing.rows.length > 0) return "DUPLICATE";
    await this.executor.query(
      `INSERT INTO chat_feedback (conversation_id, message_index, vote, expires_at) VALUES ($1, $2, $3, $4)`,
      [input.conversationId, input.messageIndex, input.vote, input.expiresAt],
    );
    return "RECORDED";
  }
}
