import type { ConversationFlags, ConversationMessage } from "./types.ts";
import type { CitedPublicSource } from "../grounding/citations.ts";

type QueryResult = { rows: Array<Record<string, unknown>>; rowCount?: number | null };
export interface ConversationQueryExecutor {
  query(sql: string, parameters: unknown[]): Promise<QueryResult>;
}

function isMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    (item.role === "user" || item.role === "assistant") &&
    typeof item.content === "string" &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt))
  );
}

function parseMessages(value: unknown): ConversationMessage[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed.filter(isMessage) : [];
}

export class ChatConversationRepository {
  private readonly executor: ConversationQueryExecutor;

  constructor(executor: ConversationQueryExecutor) {
    this.executor = executor;
  }

  async findActiveBySession(sessionId: string, now: Date): Promise<string | undefined> {
    const result = await this.executor.query(
      `SELECT id
       FROM chat_conversations
       WHERE session_id = $1
         AND status = 'active'
         AND expires_at > $2
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [sessionId, now],
    );
    const id = result.rows[0]?.id;
    return typeof id === "string" ? id : undefined;
  }

  async create(input: {
    sessionId: string;
    messages: ConversationMessage[];
    sources: CitedPublicSource[];
    flags: ConversationFlags;
    chatModelVersion: string;
    promptVersion: string;
    thresholdVersion: string;
    expiresAt: Date;
  }): Promise<string> {
    const result = await this.executor.query(
      `INSERT INTO chat_conversations (
         session_id, messages_redacted, sources, flags,
         chat_model_version, prompt_version, threshold_version, expires_at
       ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.sessionId,
        JSON.stringify(input.messages),
        JSON.stringify(input.sources),
        JSON.stringify(input.flags),
        input.chatModelVersion,
        input.promptVersion,
        input.thresholdVersion,
        input.expiresAt,
      ],
    );
    const id = result.rows[0]?.id;
    if (typeof id !== "string") throw new Error("Conversation write did not return an id");
    return id;
  }

  async append(input: {
    conversationId: string;
    messages: ConversationMessage[];
    sources: CitedPublicSource[];
    flags: ConversationFlags;
  }): Promise<void> {
    const result = await this.executor.query(
      `UPDATE chat_conversations
       SET messages_redacted = messages_redacted || $2::jsonb,
           sources = $3::jsonb,
           flags = CASE
             WHEN ($4::jsonb ->> 'unsupported')::boolean THEN flags || $4::jsonb
             ELSE flags
           END
       WHERE id = $1`,
      [
        input.conversationId,
        JSON.stringify(input.messages),
        JSON.stringify(input.sources),
        JSON.stringify(input.flags),
      ],
    );
    if (result.rowCount !== 1) throw new Error("Conversation write target was not found");
  }

  async readRecent(conversationId: string, maximumMessages = 6): Promise<ConversationMessage[]> {
    const result = await this.executor.query(
      `SELECT messages_redacted
       FROM chat_conversations
       WHERE id = $1
       LIMIT 1`,
      [conversationId],
    );
    const messages = parseMessages(result.rows[0]?.messages_redacted);
    return messages.slice(-Math.min(6, Math.max(0, maximumMessages)));
  }
}
