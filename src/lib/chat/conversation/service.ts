import { readChatBuildSafeConfig } from "../config.ts";
import { redactPii } from "../privacy.ts";
import type { CitedPublicSource } from "../grounding/citations.ts";
import type { UnsupportedOutputCategory } from "../safety/output.ts";
import { ChatConversationRepository } from "./repository.ts";
import type {
  ActiveConversationResult,
  ConversationFlags,
  ConversationHistoryResult,
  ConversationMessage,
  ConversationPersistenceResult,
  ConversationRole,
} from "./types.ts";

function safeMessage(role: ConversationRole, rawContent: string, createdAt: Date): ConversationMessage {
  return { role, content: redactPii(rawContent).value, createdAt: createdAt.toISOString() };
}

function flags(categories: readonly UnsupportedOutputCategory[]): ConversationFlags {
  return categories.length > 0
    ? { unsupported: true, unsupportedCategories: [...categories] }
    : { unsupported: false };
}

export function createConversationService(
  repository: ChatConversationRepository,
  environment: Record<string, string | undefined> = process.env,
) {
  const config = readChatBuildSafeConfig(environment);

  return {
    async findActive(sessionId: string, now = new Date()): Promise<ActiveConversationResult> {
      try {
        const conversationId = await repository.findActiveBySession(sessionId, now);
        return conversationId
          ? { state: "FOUND", conversationId }
          : { state: "NOT_FOUND" };
      } catch {
        return { state: "FAILURE", reason: "PERSISTENCE_UNAVAILABLE" };
      }
    },

    async create(input: {
      sessionId: string;
      userMessage: string;
      assistantMessage?: string;
      sources?: CitedPublicSource[];
      unsupportedCategories?: readonly UnsupportedOutputCategory[];
      now?: Date;
    }): Promise<ConversationPersistenceResult> {
      const now = input.now ?? new Date();
      const unsupported = input.unsupportedCategories ?? [];
      const messages = [safeMessage("user", input.userMessage, now)];
      if (input.assistantMessage !== undefined && unsupported.length === 0) {
        messages.push(safeMessage("assistant", input.assistantMessage, now));
      }
      try {
        const conversationId = await repository.create({
          sessionId: input.sessionId,
          messages,
          sources: input.sources ?? [],
          flags: flags(unsupported),
          chatModelVersion: config.versioning.chatModel,
          promptVersion: config.versioning.prompt,
          thresholdVersion: config.versioning.threshold,
          expiresAt: new Date(now.getTime() + config.retentionDays.conversations * 86_400_000),
        });
        return { state: "SAVED", conversationId };
      } catch {
        return { state: "FAILURE", reason: "PERSISTENCE_UNAVAILABLE" };
      }
    },

    async append(input: {
      conversationId: string;
      userMessage: string;
      assistantMessage?: string;
      sources?: CitedPublicSource[];
      unsupportedCategories?: readonly UnsupportedOutputCategory[];
      now?: Date;
    }): Promise<ConversationPersistenceResult> {
      const now = input.now ?? new Date();
      const unsupported = input.unsupportedCategories ?? [];
      const messages = [safeMessage("user", input.userMessage, now)];
      if (input.assistantMessage !== undefined && unsupported.length === 0) {
        messages.push(safeMessage("assistant", input.assistantMessage, now));
      }
      try {
        await repository.append({
          conversationId: input.conversationId,
          messages,
          sources: input.sources ?? [],
          flags: flags(unsupported),
        });
        return { state: "SAVED", conversationId: input.conversationId };
      } catch {
        return { state: "FAILURE", reason: "PERSISTENCE_UNAVAILABLE" };
      }
    },

    async history(conversationId: string): Promise<ConversationHistoryResult> {
      try {
        const messages = await repository.readRecent(
          conversationId,
          Math.min(6, config.limits.contextMessages),
        );
        return { state: "READY", messages };
      } catch {
        return { state: "FAILURE", reason: "PERSISTENCE_UNAVAILABLE" };
      }
    },
  };
}
