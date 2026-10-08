import { readChatBuildSafeConfig } from "../config.ts";
import type { ChatFeedbackRepository } from "./repository.ts";

export function createFeedbackService(repository: Pick<ChatFeedbackRepository, "latestEligibleAnswer" | "record">, environment: Record<string, string | undefined> = process.env) {
  const retentionDays = readChatBuildSafeConfig(environment).retentionDays.feedback;
  return {
    async submit(input: { conversationId: string; sessionId: string; vote: 1 | -1; now?: Date }) {
      const now = input.now ?? new Date();
      try {
        const answer = await repository.latestEligibleAnswer({ conversationId: input.conversationId, sessionId: input.sessionId, now });
        if (!answer) return { state: "NOT_ELIGIBLE" as const };
        const state = await repository.record({
          ...answer, vote: input.vote,
          expiresAt: new Date(now.getTime() + retentionDays * 86_400_000),
        });
        return { state } as { state: "RECORDED" | "DUPLICATE" };
      } catch { return { state: "FAILURE" as const }; }
    },
  };
}
