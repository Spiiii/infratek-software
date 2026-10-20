import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildPublicChatRequest,
  canSubmitChat,
  mapPublicChatResponse,
  shouldAutomaticallyVerify,
  shouldSubmitFromKeyboard,
  splitGroundedCitations,
  validateChatQuestion,
} from "./ui.ts";
import { APPROVED_SALES_CONTACT } from "./handoff.ts";

const source = {
  label: "S1" as const,
  title: "AI Consulting",
  headingPath: ["Tổng quan"],
  url: "/solutions/ai-consulting",
};

test("chat page metadata is noindex and nofollow", async () => {
  const [page, shell] = await Promise.all([
    readFile(new URL("../../app/(frontend)/chat/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/chat/chat-shell.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/u);
  assert.match(page, /không bảo đảm loại bỏ mọi thông tin cá nhân/u);
  assert.match(shell, /Gemini API của Google/u);
  assert.match(shell, /cải thiện sản phẩm/u);
  assert.match(shell, /người kiểm duyệt/u);
  assert.match(shell, /privacyAcknowledged/u);
  assert.match(shell, /disabled=\{!privacyAcknowledged/u);
});

test("question validation enforces trim, 500 characters, busy state, and keyboard semantics", () => {
  assert.equal(validateChatQuestion("   "), "EMPTY");
  assert.equal(validateChatQuestion("x".repeat(500)), "VALID");
  assert.equal(validateChatQuestion("x".repeat(501)), "TOO_LONG");
  assert.equal(canSubmitChat("question", false), true);
  assert.equal(canSubmitChat("question", true), false);
  assert.equal(shouldSubmitFromKeyboard({ key: "Enter", shiftKey: false, isComposing: false }), true);
  assert.equal(shouldSubmitFromKeyboard({ key: "Enter", shiftKey: true, isComposing: false }), false);
  assert.equal(shouldSubmitFromKeyboard({ key: "Enter", shiftKey: false, isComposing: true }), false);
});

test("D-18 starts without token and retries the exact question once with token", () => {
  const question = "  Infratek có giải pháp gì?  ";
  assert.deepEqual(buildPublicChatRequest(question), { question: "Infratek có giải pháp gì?" });
  assert.deepEqual(buildPublicChatRequest(question, "turnstile-token"), {
    question: "Infratek có giải pháp gì?",
    turnstileToken: "turnstile-token",
  });
  assert.equal(shouldAutomaticallyVerify("VERIFICATION_REQUIRED", 0), true);
  assert.equal(shouldAutomaticallyVerify("VERIFICATION_REQUIRED", 1), false);
  assert.equal(shouldAutomaticallyVerify("ANSWER", 0), false);
});

test("all eight public API states map to deterministic UI outcomes", () => {
  const fixtures = [
    [{ status: "ANSWER", answer: "Có [S1]", sources: [source], conversationId: "opaque" }, "ANSWER"],
    [{ status: "NO_CONTEXT", fallback: "Không có dữ liệu", conversationId: "opaque" }, "NO_CONTEXT"],
    [{ status: "CALIBRATION_REQUIRED" }, "CALIBRATION_REQUIRED"],
    [{ status: "DEPENDENCY_FALLBACK", fallback: "Tạm thời không khả dụng" }, "DEPENDENCY_FALLBACK"],
    [{ status: "INVALID_REQUEST" }, "INVALID_REQUEST"],
    [{ status: "VERIFICATION_REQUIRED" }, "VERIFICATION_REQUIRED"],
    [{ status: "RATE_LIMITED", fallback: "Thử lại sau", retryAfterSeconds: 12 }, "RATE_LIMITED"],
    [{ status: "SAFE_FALLBACK", conversationId: "opaque" }, "SAFE_FALLBACK"],
  ] as const;

  for (const [fixture, expected] of fixtures) assert.equal(mapPublicChatResponse(fixture).kind, expected);
  const limited = mapPublicChatResponse(fixtures[6][0]);
  assert.equal(limited.retryAfterSeconds, 12);
  assert.equal(limited.showContact, true);
});

test("malformed and internal diagnostic payloads become a safe generic UI error", () => {
  const outcome = mapPublicChatResponse({ status: "ANSWER", diagnostics: { secret: "raw" } });
  assert.equal(outcome.kind, "MALFORMED_RESPONSE");
  assert.equal(JSON.stringify(outcome).includes("secret"), false);
  assert.equal(mapPublicChatResponse({
    status: "ANSWER", answer: "unsafe", conversationId: "opaque",
    sources: [{ ...source, url: "javascript:alert(1)" }],
  }).kind, "MALFORMED_RESPONSE");
});

test("citation links resolve only against server-owned source metadata", () => {
  const parts = splitGroundedCitations("Có thông tin [S1], nhưng [S7] không khớp.", [source]);
  const citations = parts.filter((part) => part.type === "citation");
  assert.equal(citations.length, 1);
  assert.equal(citations[0]?.type === "citation" && citations[0].source.url, "/solutions/ai-consulting");
  assert.equal(parts.some((part) => part.type === "text" && part.value.includes("[S7]")), true);
});

test("client source preserves accessibility and stale-request safeguards", async () => {
  const [composer, shell, turnstile] = await Promise.all([
    readFile(new URL("../../components/chat/chat-composer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/chat/chat-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../components/chat/turnstile-widget.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(composer, /aria-describedby/u);
  assert.match(composer, /nativeEvent\.isComposing/u);
  assert.match(shell, /aria-live="polite"/u);
  assert.match(shell, /AbortController/u);
  assert.match(shell, /outcome\.retryAfterSeconds \* 1_000/u);
  assert.match(turnstile, /aria-label="Xác minh người dùng"/u);
});

test("response mapper accepts only the Owner-approved handoff contact", () => {
  const outcome = mapPublicChatResponse({
    status: "HUMAN_HANDOFF",
    message: "Trao đổi trực tiếp.",
    contact: APPROVED_SALES_CONTACT,
    conversationId: "conversation-1",
  });
  assert.equal(outcome.kind, "HUMAN_HANDOFF");
  assert.deepEqual(outcome.handoffContact, APPROVED_SALES_CONTACT);
  assert.equal(outcome.showContact, false);
  assert.equal(mapPublicChatResponse({
    status: "HUMAN_HANDOFF",
    message: "x",
    contact: { ...APPROVED_SALES_CONTACT, zalo: "https://example.com" },
    conversationId: "c",
  }).kind, "MALFORMED_RESPONSE");
});
