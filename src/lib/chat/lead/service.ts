import type { LeadNotifier } from "../../leads/notification.ts";
import type { ChatLeadRepository, PersistedLeadInput } from "./repository.ts";

export function createChatLeadService(repository: Pick<ChatLeadRepository, "conversationBelongsToSession" | "create">, notifier: LeadNotifier) {
  return {
    async submit(input: PersistedLeadInput & { sessionId: string; now?: Date }) {
      try {
        if (input.conversationId && !await repository.conversationBelongsToSession(input.conversationId, input.sessionId, input.now ?? new Date())) {
          return { state: "FORBIDDEN" as const };
        }
        const leadId = await repository.create(input);
        const notification = await notifier.notify(input);
        return notification === "SENT"
          ? { state: "SAVED" as const, leadId }
          : { state: "SAVED_NOTIFICATION_FAILED" as const, leadId };
      } catch { return { state: "FAILURE" as const }; }
    },
  };
}
