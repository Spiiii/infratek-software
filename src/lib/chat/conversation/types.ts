import type { UnsupportedOutputCategory } from "../safety/output.ts";

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
  createdAt: string;
};

export type ConversationFlags = {
  unsupported: boolean;
  unsupportedCategories?: UnsupportedOutputCategory[];
};

export type ConversationPersistenceResult =
  | { state: "SAVED"; conversationId: string }
  | { state: "FAILURE"; reason: "PERSISTENCE_UNAVAILABLE" };

export type ConversationHistoryResult =
  | { state: "READY"; messages: ConversationMessage[] }
  | { state: "FAILURE"; reason: "PERSISTENCE_UNAVAILABLE" };
