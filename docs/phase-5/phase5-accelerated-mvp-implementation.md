# PHASE 5 — ACCELERATED MVP IMPLEMENTATION REPORT

## A. Baseline and Git integrity

- Branch: `codex/phase-5-chatbot-rag`; baseline HEAD: `28dbe3542e885d4dfd1ad79ff345daf0b41acaa9`.
- Existing A.13 tracked/untracked work was preserved. No holdout, historical evidence, retrieval ranking, schema, migration, threshold, provider, Git remote, or deployment operation was changed.
- Production remains fail-closed on `pre-calibration-p5.5-v1` / `CALIBRATION_REQUIRED`.

## B. Files changed

MVP source/config:

- `.env.example`
- `package.json`
- `src/lib/chat/config.ts`
- `src/lib/chat/handoff.ts`
- `src/lib/chat/decision/types.ts`
- `src/lib/chat/decision/preview-mvp-policy.ts`
- `src/lib/chat/conversation/types.ts`
- `src/lib/chat/route/contracts.ts`
- `src/lib/chat/route/orchestrator.ts`
- `src/lib/chat/route/runtime.ts`
- `src/lib/chat/service/grounded-answer.ts`
- `src/lib/chat/ui.ts`
- `src/components/chat/chat-message.tsx`
- `src/components/chat/chat-handoff-card.tsx`

Tests:

- `src/lib/chat/decision/preview-mvp-policy.test.ts`
- `src/lib/chat/route/route.test.ts`
- `src/lib/chat/ui.test.ts`

## C. Preview-only runtime policy

- Policy version: `preview-presales-mvp-p5.3-v1`.
- Activation requires both `CHAT_PREVIEW_MVP_ENABLED=true` and `VERCEL_ENV=preview`; default is OFF. Setting the flag in Production still selects the existing pre-calibration policy.
- Ordinary answers require complete `HYBRID` retrieval, candidates, and max selected-source vector similarity at the unchanged `0.722924077393` threshold. Missing/degraded evidence fails closed.
- Binding price, contract, SLA, guarantee, exact-scope/delivery commitment, and universal measurable-result requests are classified deterministically before retrieval and generation, then routed to `HUMAN_HANDOFF`.
- Candidate v2, FTS, RRF `k=60`, Top6, embedding model, generation prompt, citation validator, injection filter, protected-output validator, and provider failure behavior were not relaxed or replaced.

## D. Human handoff behavior

- Public contact is centralized: Ngô Đức Trọng — Tư vấn giải pháp và quản lý dự án; phone/Zalo `0901 671 671`; email `trong.ngo@infratek.vn`; route `/contact`.
- No Zalo URL is invented. The UI displays Zalo as a number only.
- The handoff message is persisted as a conversation turn and returns a conversation ID, so users may continue chatting. Gemini and retrieval are not invoked for the commercial handoff turn.
- The structured contact card appears only for `HUMAN_HANDOFF`, avoiding duplication on ordinary answers.

## E. Knowledge coverage gaps

Verified historical/current local evidence records 173 chunks / 14 documents: 36 solution chunks, 92 case-study chunks, and 45 post chunks. Published `pages`, FAQ, and `company_facts` have zero indexed chunks.

Minimal content checklist before broader acceptance:

1. Publish and source-review company identity/contact facts, including the approved handoff contact.
2. Publish indexable `/about` and `/contact` page content containing only verified public facts.
3. Publish concise FAQs for service scope, engagement process, supported industries, and the non-binding nature of estimates.
4. Review all solution/case-study claims so historical metrics are clearly scoped to their original case.
5. Under separate Owner authorization, run published-only ingestion, verify snapshot/version/content hashes and draft exclusion, then run a small retrieval/generation smoke. No ingestion was performed here.

## F. Offline test results

| Check | Result |
|---|---|
| Focused Preview policy/route/UI | PASS — 27/27 |
| Generation evaluator | PASS — 19/19 |
| Full chat suite, first run | 168/169; one session expiry/signature timing test failed |
| Failed session test isolated rerun | PASS — 1/1; classified timing/flaky, unrelated to MVP files |
| Typecheck | PASS |
| `git diff --check` | PASS |

Coverage includes mocked grounded generation, deterministic handoff, universal guarantees, ordinary service questions, missing-context/provider fallback, contact contract, gate isolation, multi-turn, citations, injection, and protected-output regressions.

## G. Build/typecheck/lint results

- Next.js production build: PASS; 41 static pages generated and `/api/chat` remained dynamic.
- Typecheck: PASS.
- Scoped ESLint for all MVP files: PASS.
- Full ESLint: FAIL from five errors and three warnings in pre-existing/untracked A.13 evaluation files plus the existing case-study `<img>` warning. No MVP file has a lint finding.

## H. Remaining blockers

- No live Gemini/Neon/runtime validation was authorized; model quality under the Preview policy remains NOT VERIFIED.
- The branch-specific Preview gate is not enabled or deployed in this checkpoint.
- Company facts, pages, and FAQ knowledge coverage remains incomplete until approved content is published and separately ingested.
- Full-suite session test is flaky and should be monitored, but its isolated rerun passed and no session code changed.
- Existing A.13 work remains mixed in the worktree; any future commit must explicitly stage only reviewed MVP files or deliberately create separate checkpoints.

## I. Proposed protected Preview deployment steps

1. Review this diff and create an MVP-only checkpoint, excluding all unrelated A.13 changes/artifacts.
2. Add branch-scoped `CHAT_PREVIEW_MVP_ENABLED=true` only for `codex/phase-5-chatbot-rag`; verify Production has no enabled override.
3. Keep `THRESHOLD_VERSION=UN-CALIBRATED`, Preview Deployment Protection, Neon Preview isolation, Turnstile, Upstash caps, and existing secrets.
4. Deploy only after separate Owner approval.
5. Under separate live-call authorization, run a minimal authenticated Preview smoke: one ordinary grounded question, one commercial handoff, one missing-context case, and verify citations/fallbacks/call accounting.
6. Disable the gate immediately if citation, protected-output, environment-isolation, or persistence checks fail.

## J. Final status

**OFFLINE MVP IMPLEMENTED — READY FOR PREVIEW APPROVAL**

This status does not authorize live provider calls, ingestion, commit, push, deployment, Production activation, or Public Beta.
