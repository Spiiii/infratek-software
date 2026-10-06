import { createHash } from "node:crypto";

import { readChatBuildSafeConfig } from "../config.ts";
import { normalizeQuestionForHash, redactPii } from "../privacy.ts";
import { ChatUnansweredRepository } from "./repository.ts";

export type UnansweredTrigger =
  | "NO_CONTEXT"
  | "NO_ANSWER"
  | "CALIBRATION_REQUIRED"
  | "DEPENDENCY_FAILURE"
  | "PROVIDER_FAILURE"
  | "SECURITY_FAILURE"
  | "RATE_LIMIT_FAILURE"
  | "PERSISTENCE_FAILURE"
  | "INVALID_REQUEST";

export type UnansweredRecordResult =
  | { state: "RECORDED"; id: string; occurrenceCount: number }
  | { state: "SKIPPED" }
  | { state: "FAILURE"; reason: "PERSISTENCE_UNAVAILABLE" };

const RECORDABLE = new Set<UnansweredTrigger>(["NO_CONTEXT", "NO_ANSWER"]);

export function createUnansweredService(
  repository: ChatUnansweredRepository,
  environment: Record<string, string | undefined> = process.env,
) {
  const retentionDays = readChatBuildSafeConfig(environment).retentionDays.unanswered;

  return {
    async record(input: {
      trigger: UnansweredTrigger;
      question: string;
      now?: Date;
    }): Promise<UnansweredRecordResult> {
      if (!RECORDABLE.has(input.trigger)) return { state: "SKIPPED" };
      const now = input.now ?? new Date();
      const sampleQuestionRedacted = redactPii(input.question).value;
      const normalizedQuestion = normalizeQuestionForHash(sampleQuestionRedacted);
      const questionHash = createHash("sha256").update(normalizedQuestion).digest("hex");

      try {
        const saved = await repository.upsert({
          normalizedQuestion,
          questionHash,
          sampleQuestionRedacted,
          now,
          expiresAt: new Date(now.getTime() + retentionDays * 86_400_000),
        });
        return { state: "RECORDED", ...saved };
      } catch {
        return { state: "FAILURE", reason: "PERSISTENCE_UNAVAILABLE" };
      }
    },
  };
}
