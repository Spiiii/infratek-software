"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "IDLE" | "SENDING" | "SAVED" | "ERROR";

export function ChatFeedback({ conversationId }: { conversationId: string }) {
  const [state, setState] = useState<State>("IDLE");
  const [selected, setSelected] = useState<1 | -1>();

  const vote = async (value: 1 | -1) => {
    if (state === "SENDING" || state === "SAVED") return;
    setState("SENDING");
    try {
      const response = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ conversationId, vote: value }),
      });
      const body = await response.json() as { status?: string };
      if (!response.ok || !["RECORDED", "ALREADY_RECORDED"].includes(body.status ?? "")) throw new Error("feedback failed");
      setSelected(value);
      setState("SAVED");
    } catch { setState("ERROR"); }
  };

  return (
    <div className="mt-3 border-t border-border pt-3" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">Câu trả lời này hữu ích?</span>
        <Button type="button" size="sm" variant="ghost" aria-label="Hữu ích" disabled={state === "SENDING" || state === "SAVED"} onClick={() => void vote(1)}>
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Không hữu ích" disabled={state === "SENDING" || state === "SAVED"} onClick={() => void vote(-1)}>
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
      {state === "SENDING" && <p className="text-xs text-text-secondary" role="status">Đang gửi phản hồi...</p>}
      {state === "SAVED" && <p className="text-xs text-emerald-700" role="status">Cảm ơn phản hồi của bạn{selected === -1 ? "." : "!"}</p>}
      {state === "ERROR" && <p className="text-xs text-red-600" role="alert">Chưa gửi được phản hồi. Câu trả lời vẫn được giữ nguyên.</p>}
    </div>
  );
}
