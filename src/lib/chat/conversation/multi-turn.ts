import { readChatBuildSafeConfig } from "../config.ts";
import { redactPii } from "../privacy.ts";
import { prepareRetrievalQuery, type PreparedRetrievalQuery } from "../retrieval/query.ts";
import type { ConversationMessage } from "./types.ts";

export type MultiTurnRetrievalPreparation = {
  currentQuestion: PreparedRetrievalQuery;
  retrievalText: string;
  priorTurnsUsed: number;
  historyMessagesConsidered: number;
  queryRewriteCalls: 0;
};

type CompletedTurn = { user: ConversationMessage; assistant: ConversationMessage };

function completedTurns(messages: readonly ConversationMessage[]): CompletedTurn[] {
  const turns: CompletedTurn[] = [];
  let pendingUser: ConversationMessage | undefined;
  for (const message of messages.slice(-6)) {
    if (message.role === "user") {
      pendingUser = message;
    } else if (pendingUser) {
      turns.push({ user: pendingUser, assistant: message });
      pendingUser = undefined;
    }
  }
  return turns.slice(-2);
}

export function prepareMultiTurnRetrieval(
  currentQuestion: unknown,
  history: readonly ConversationMessage[],
  environment: Record<string, string | undefined> = process.env,
): MultiTurnRetrievalPreparation {
  const current = prepareRetrievalQuery(currentQuestion, environment);
  const maximumLength = readChatBuildSafeConfig(environment).limits.inputMaxLength;
  const turns = completedTurns(history);
  const selected: CompletedTurn[] = [];

  for (const turn of [...turns].reverse()) {
    const candidate = [turn, ...selected];
    const context = candidate
      .map((item) => `Người dùng: ${redactPii(item.user.content).value}\nTrợ lý: ${redactPii(item.assistant.content).value}`)
      .join("\n");
    const composed = `Câu hỏi hiện tại: ${current.value}\nNgữ cảnh lượt trước:\n${context}`;
    if (composed.length <= maximumLength) selected.unshift(turn);
  }

  const retrievalText = selected.length === 0
    ? current.value
    : `Câu hỏi hiện tại: ${current.value}\nNgữ cảnh lượt trước:\n${selected
        .map((turn) => `Người dùng: ${redactPii(turn.user.content).value}\nTrợ lý: ${redactPii(turn.assistant.content).value}`)
        .join("\n")}`;

  return {
    currentQuestion: current,
    retrievalText,
    priorTurnsUsed: selected.length,
    historyMessagesConsidered: Math.min(6, history.length),
    queryRewriteCalls: 0,
  };
}
