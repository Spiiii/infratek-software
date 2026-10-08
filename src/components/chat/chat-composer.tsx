"use client";

import type { KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_QUESTION_MAX_LENGTH, canSubmitChat, shouldSubmitFromKeyboard } from "@/lib/chat/ui";

export function ChatComposer({ question, busy, disabled, onQuestionChange, onSubmit }: {
  question: string;
  busy: boolean;
  disabled: boolean;
  onQuestionChange(value: string): void;
  onSubmit(): void;
}) {
  const submitEnabled = canSubmitChat(question, busy || disabled);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shouldSubmitFromKeyboard({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing })) return;
    event.preventDefault();
    if (submitEnabled) onSubmit();
  };

  return (
    <div className="border-t border-border bg-white p-4 sm:p-5">
      <Label htmlFor="chat-question" className="sr-only">Câu hỏi dành cho trợ lý Infratek</Label>
      <Textarea
        id="chat-question" value={question} onChange={(event) => onQuestionChange(event.target.value)}
        onKeyDown={onKeyDown} maxLength={CHAT_QUESTION_MAX_LENGTH} rows={3}
        disabled={busy || disabled}
        placeholder="Nhập câu hỏi về giải pháp, case study hoặc quy trình triển khai..."
        aria-describedby="chat-question-help chat-question-count"
        className="min-h-24 resize-none pr-3"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-between gap-4 text-xs text-text-secondary sm:block">
          <span id="chat-question-help">Enter để gửi · Shift+Enter để xuống dòng</span>
          <span id="chat-question-count" className="sm:ml-3" aria-live="polite">{question.length}/{CHAT_QUESTION_MAX_LENGTH}</span>
        </div>
        <Button type="button" onClick={onSubmit} disabled={!submitEnabled} className="w-full sm:w-auto">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xử lý...</> : <><Send className="h-4 w-4" />Gửi câu hỏi</>}
        </Button>
      </div>
    </div>
  );
}
