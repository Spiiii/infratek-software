import Link from "next/link";
import { Bot, UserRound } from "lucide-react";

import type { ChatUiOutcome } from "@/lib/chat/ui";
import { splitGroundedCitations } from "@/lib/chat/ui";
import { cn } from "@/lib/utils";
import { ChatSources } from "./chat-sources";
import { ChatFeedback } from "./chat-feedback";

export type ChatMessageModel = {
  id: string;
  role: "assistant" | "user";
  text: string;
  outcome?: ChatUiOutcome;
};

export function ChatMessage({ message, feedbackEligible = false }: { message: ChatMessageModel; feedbackEligible?: boolean }) {
  const assistant = message.role === "assistant";
  const parts = assistant && message.outcome?.kind === "ANSWER"
    ? splitGroundedCitations(message.text, message.outcome.sources)
    : [{ type: "text" as const, value: message.text }];

  return (
    <article className={cn("flex gap-3", !assistant && "flex-row-reverse")}>
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        assistant ? "bg-primary/10 text-primary" : "bg-navy text-white",
      )} aria-hidden="true">
        {assistant ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
      </div>
      <div className={cn(
        "min-w-0 max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%]",
        assistant ? "border border-border bg-white text-navy" : "bg-primary text-white",
      )}>
        <p className="whitespace-pre-wrap break-words">
          {parts.map((part, index) => part.type === "citation" ? (
            <Link
              key={`${part.value}-${index}`}
              href={part.source.url}
              {...(/^https:\/\//u.test(part.source.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`${part.value}: ${part.source.title}`}
            >{part.value}</Link>
          ) : <span key={index}>{part.value}</span>)}
        </p>
        {assistant && message.outcome && <ChatSources sources={message.outcome.sources} />}
        {assistant && feedbackEligible && message.outcome?.kind === "ANSWER" && message.outcome.conversationId && (
          <ChatFeedback conversationId={message.outcome.conversationId} />
        )}
        {assistant && message.outcome?.showContact && (
          <Link href="/contact" className="mt-3 inline-flex rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            Liên hệ đội ngũ Infratek
          </Link>
        )}
      </div>
    </article>
  );
}
