"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPublicChatRequest, canSubmitChat, mapPublicChatResponse, shouldAutomaticallyVerify, type ChatUiOutcome } from "@/lib/chat/ui";
import { ChatComposer } from "./chat-composer";
import { ChatMessage, type ChatMessageModel } from "./chat-message";
import { ChatLeadForm } from "./chat-lead-form";
import { TurnstileWidget } from "./turnstile-widget";

const GREETING: ChatMessageModel = {
  id: "greeting",
  role: "assistant",
  text: "Xin chào! Mình là trợ lý beta của Infratek. Doanh nghiệp bạn đang gặp bài toán gì?",
};

type Phase = "IDLE" | "SUBMITTING" | "VERIFYING" | "VERIFICATION_FAILED";

export function ChatShell({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessageModel[]>([GREETING]);
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [pendingQuestion, setPendingQuestion] = useState<string>();
  const [automaticRetries, setAutomaticRetries] = useState(0);
  const [widgetKey, setWidgetKey] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const messageIdRef = useRef(0);

  useEffect(() => () => {
    mountedRef.current = false;
    abortRef.current?.abort();
    if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
  }, []);

  const appendOutcome = useCallback((outcome: ChatUiOutcome) => {
    messageIdRef.current += 1;
    setMessages((current) => [...current, {
      id: `assistant-${messageIdRef.current}`,
      role: "assistant",
      text: outcome.text,
      outcome,
    }]);
  }, []);

  const send = useCallback(async (exactQuestion: string, token?: string, retryCount = 0) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase("SUBMITTING");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(buildPublicChatRequest(exactQuestion, token)),
        signal: controller.signal,
      });
      const outcome = mapPublicChatResponse(await response.json());
      if (!mountedRef.current || controller.signal.aborted) return;

      if (shouldAutomaticallyVerify(outcome.kind, retryCount)) {
        setPendingQuestion(exactQuestion);
        setAutomaticRetries(0);
        setPhase("VERIFYING");
        return;
      }
      if (outcome.kind === "VERIFICATION_REQUIRED") {
        setPendingQuestion(exactQuestion);
        setAutomaticRetries(retryCount);
        setPhase("VERIFICATION_FAILED");
        return;
      }

      appendOutcome(outcome);
      if (outcome.kind === "RATE_LIMITED" && outcome.retryAfterSeconds) {
        setRateLimited(true);
        if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        rateLimitTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setRateLimited(false);
        }, outcome.retryAfterSeconds * 1_000);
      }
      setPendingQuestion(undefined);
      setAutomaticRetries(0);
      setQuestion("");
      setPhase("IDLE");
    } catch {
      if (!mountedRef.current || controller.signal.aborted) return;
      appendOutcome({
        kind: "NETWORK_FAILURE",
        text: "Không thể kết nối tới trợ lý lúc này. Vui lòng thử lại sau.",
        sources: [], showContact: true, canRetry: true,
      });
      setPhase("IDLE");
    } finally {
      if (abortRef.current === controller) abortRef.current = undefined;
      busyRef.current = false;
    }
  }, [appendOutcome]);

  const submit = () => {
    if (!canSubmitChat(question, phase !== "IDLE") || busyRef.current) return;
    const exactQuestion = question.trim();
    messageIdRef.current += 1;
    setMessages((current) => [...current, { id: `user-${messageIdRef.current}`, role: "user", text: exactQuestion }]);
    void send(exactQuestion);
  };

  const onToken = useCallback((token: string) => {
    if (!pendingQuestion || automaticRetries !== 0 || busyRef.current) return;
    setAutomaticRetries(1);
    void send(pendingQuestion, token, 1);
  }, [automaticRetries, pendingQuestion, send]);

  const verificationFailure = useCallback(() => {
    if (!busyRef.current) setPhase("VERIFICATION_FAILED");
  }, []);

  const retryVerification = () => {
    setAutomaticRetries(0);
    setWidgetKey((value) => value + 1);
    setPhase("VERIFYING");
  };

  const busy = phase === "SUBMITTING";
  const latestEligibleFeedbackId = [...messages].reverse().find((message) => message.outcome?.kind === "ANSWER" && message.outcome.conversationId)?.id;
  const latestConversationId = [...messages].reverse().find((message) => message.outcome?.conversationId)?.outcome?.conversationId;

  return (
    <Card className="mx-auto flex min-h-[620px] w-full max-w-4xl flex-col overflow-hidden shadow-elevated">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-glow"><Bot className="h-5 w-5" aria-hidden="true" /></div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-navy">Trợ lý Infratek</h2>
            <p className="text-xs text-text-secondary">Bản beta · Nội dung có nguồn tham khảo</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {latestConversationId ? <Button type="button" size="sm" variant="ghost" onClick={() => setLeadOpen(true)}>Đăng ký tư vấn</Button> : <Button asChild size="sm" variant="ghost"><Link href="/contact">Liên hệ</Link></Button>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Có kiểm soát</span>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto bg-surface-light/60 p-4 sm:p-6" aria-live="polite" aria-busy={busy} aria-label="Nội dung trò chuyện">
        {messages.map((message) => <ChatMessage key={message.id} message={message} feedbackEligible={message.id === latestEligibleFeedbackId} />)}
        {busy && <p className="text-sm text-text-secondary" role="status">Trợ lý đang xử lý câu hỏi...</p>}
      </div>

      {leadOpen && latestConversationId && <ChatLeadForm conversationId={latestConversationId} onClose={() => setLeadOpen(false)} />}

      {(phase === "VERIFYING" || phase === "VERIFICATION_FAILED") && (
        <div className="border-t border-border bg-blue-50/70 px-4 py-4 sm:px-6">
          <p className="mb-3 text-sm font-medium text-navy">{phase === "VERIFYING" ? "Vui lòng xác minh để gửi câu hỏi này." : "Xác minh chưa thành công hoặc đã hết hạn."}</p>
          {phase === "VERIFYING" && <TurnstileWidget key={widgetKey} resetKey={widgetKey} siteKey={turnstileSiteKey} onToken={onToken} onFailure={verificationFailure} />}
          {phase === "VERIFICATION_FAILED" && (
            <div className="flex flex-wrap gap-3">
              <Button type="button" size="sm" variant="secondary" onClick={retryVerification}><RefreshCw className="h-4 w-4" /> Thử xác minh lại</Button>
              <Button asChild type="button" size="sm" variant="ghost"><Link href="/contact">Liên hệ Infratek</Link></Button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border bg-amber-50/70 px-4 py-3 sm:px-6">
        <label className="flex items-start gap-3 text-xs leading-relaxed text-text-secondary">
          <input
            type="checkbox"
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          />
          <span>
            Tôi hiểu câu hỏi và nội dung nguồn liên quan sẽ được gửi tới Gemini API của Google. Với dịch vụ miễn phí,
            Google có thể dùng input/output để cải thiện sản phẩm và người kiểm duyệt có thể xử lý dữ liệu theo{
            " "}<a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">điều khoản Gemini API</a>.
            Tôi sẽ không nhập thông tin cá nhân, bí mật, tài liệu nội bộ hoặc dữ liệu nhạy cảm.
          </span>
        </label>
      </div>

      <ChatComposer question={question} busy={busy} disabled={!privacyAcknowledged || rateLimited || phase === "VERIFYING" || phase === "VERIFICATION_FAILED"} onQuestionChange={setQuestion} onSubmit={submit} />
    </Card>
  );
}
