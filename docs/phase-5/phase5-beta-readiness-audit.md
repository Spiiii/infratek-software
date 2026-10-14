# Phase 5 — Beta readiness audit

Ngày audit: 2026-10-11

Branch: `codex/phase-5-chatbot-rag`

HEAD: `b0261127c29d29b5f67c36beb3b7070f3974b1d1`

## Kết luận

**Chưa sẵn sàng mở public beta.** Phần sản phẩm chính đã có: `/chat`, `/api/chat`, RAG hybrid, generation, citation/fallback, session/Turnstile/Upstash, persistence, feedback và lead. Blocker thực sự là production vẫn `CALIBRATION_REQUIRED`, chưa có core eval 100–200 và API smoke 10–20 theo prompt `p5.2`, chưa pin/xác minh Preview runtime, và chưa chốt điều kiện dữ liệu khi dùng Gemini Free cho người dùng thật.

Không cần thêm framework hoặc chuỗi checkpoint E4 mới. Có thể đóng Phase 5 bằng hai đợt: **Beta Stabilization** và **Beta Acceptance**.

## Đã hoàn thành

| Hạng mục | Trạng thái | Evidence chính |
|---|---|---|
| UI `/chat` | PASS implementation | Noindex/nofollow, responsive composer, IME, loading, 8 API states, citation links, Turnstile retry một lần, feedback và lead UI |
| Public API | PASS implementation | `/api/chat`, `/api/chat/feedback`, `/api/chat/lead`; strict request contract, safe response mapping, no internal diagnostics |
| RAG / ingestion | PASS mechanics | 173 published chunks, 14 URL; 0 draft/orphan/duplicate; vector Top 20 + FTS Top 20 + RRF k=60 + Top 6 |
| Retrieval evidence | PARTIAL evidence | 20/20 live retrieval cases PASS trên `p5.1`; 10/11 expected-source case hit final Top 6; chưa phải calibration |
| Gemini generation | PASS implementation | Một non-stream call, timeout, no retry, sanitized provider errors; controlled runtime smoke đã chứng minh adapter hoạt động |
| Citation/grounding/fallback | PASS deterministic | Exact S1–S6, exact sentinel, protected-output checks, fail-closed; prompt đã bump `p5.2` để làm rõ syntax |
| Session / abuse protection | PASS implementation | Signed 7-day session, server-side Turnstile, trusted Vercel IP, Upstash distributed limiter fail-closed, raw IP không persist |
| Data handling | PASS implementation | Email/phone redaction, redacted conversation storage, `chat_unanswered` dedupe/hash/retention metadata, no raw rejected model output |
| Feedback / lead | PASS implementation | Latest eligible answer only; lead database-first + Resend; dedicated distributed 5/10-minute limiter |
| Dataset/evaluator | PASS foundation | 120/120 VERIFIED: 65 ANSWER, 55 NO_CONTEXT; offline evaluator và retrieval/generation evidence runners có version/budget guards |
| Quality baseline | PASS tại B8 | Focused 34/34, generation evaluator 14/14, retrieval runner 6/6, full chat suite 142/142, typecheck PASS |

## Chưa hoàn thành và mức ưu tiên

| Mức | Vấn đề | Vì sao chặn / hành động tối thiểu |
|---|---|---|
| **P0** | Điều khoản dữ liệu Gemini Free cho public users chưa được chốt | Tài liệu gốc yêu cầu khi có người dùng thật: bật billing/điều khoản không dùng dữ liệu để cải thiện sản phẩm, hoặc chọn provider phù hợp. Nếu vẫn Free, beta phải giới hạn người được mời, có disclosure/consent rõ và cấm dữ liệu nhạy cảm; chưa đủ cho “public” rộng. |
| **P1** | Production vẫn `CALIBRATION_REQUIRED` / `UN-CALIBRATED` | Chatbot public hiện không thể trả ANSWER. Cần core eval, calibration có version và policy được owner duyệt; không chọn threshold cảm tính. |
| **P1** | Chưa có evidence `p5.2` | Artifact E2/E3-B `p5.1` bị evaluator `p5.2` từ chối đúng guard. Phải tạo artifact mới; không sửa/relabel artifact lịch sử. |
| **P1** | Core eval 100–200 chưa hoàn tất | Dataset đủ 120 nhưng mới có 20 retrieval cases và vài generation cases `p5.1`; chưa có kết quả grounding/refusal/citation/latency đầy đủ cho 120 câu. |
| **P1** | API smoke 10–20 trên Preview chưa chạy | Chưa nghiệm thu route thật với cookie, Turnstile, Upstash, Neon persistence, citation UI, fallback và lỗi provider. |
| **P1** | Preview runtime chưa được xác nhận lại | Audit gần nhất cho thấy branch Phase 5 thiếu/scoped sai DB/API key và version env. Cần pin `p5.2`, embedding/ingestion versions, secrets và xác minh đúng Neon Preview, không dùng Production. |
| **P1** | Public caps chưa khớp v4 | v4 đề xuất `daily=20`, `IP daily=10`, `session=15`; source defaults vẫn `150/50/30`. Có thể sửa bằng Preview/Production env, nhưng phải xác minh trước beta. |
| **P1** | Retention mới có `expires_at`, chưa có cleanup cron | Nếu beta lưu hội thoại/lead thật, cần job xóa theo retention hoặc quyết định rõ không persist trong beta. Không nên công bố retention mà không thực thi. |
| **P1** | Chưa có beta acceptance về Performance/CLS và lead runtime | Điều kiện v4 yêu cầu không giảm đáng kể Lighthouse/CLS; Resend/lead cần ít nhất một Preview smoke, nhưng notification failure vẫn phải giữ lead. |
| **P2** | `company_facts`, pages, FAQ đang 0 | Bot vẫn an toàn bằng NO_CONTEXT, nhưng coverage thông tin công ty/FAQ nghèo; có thể bổ sung sau beta nếu không quảng bá khả năng đó. |
| **P2** | FTS chỉ có candidate 1/20 case đã thử | Vector hiện là recall chính; chưa có evidence đủ để tune FTS. Hoãn cho tới sau baseline 120 câu. |
| **P2** | Streaming | Owner đã defer; non-stream giúp validate toàn bộ output trước khi hiển thị và phù hợp beta. |
| **P2** | Homepage chatbot, advanced reranking/diversity, analytics/Sentry mở rộng | Thuộc Phase 5b/6 hoặc optimization; không chặn `/chat` beta có kiểm soát. |
| **P2** | Session tamper test flaky hiếm gặp | Full suite hiện 142/142; fixture random có thể tạo Base64URL alias. Nên harden test riêng sau, không phải product regression. |

## Blocker thực sự

1. **P0 data terms/privacy decision** cho người dùng thật.
2. **P1 p5.2 evidence + 120-case core eval + versioned threshold calibration**; giữ production `CALIBRATION_REQUIRED` cho tới khi PASS.
3. **P1 Preview runtime + API smoke 10–20** với đúng DB/env/security providers.
4. **P1 low public caps, retention execution và basic performance/lead acceptance** trước khi mở link rộng rãi.

Các mục P2 không cần tạo checkpoint trước beta.

## Prompt p5.2 — đường ngắn nhất để có evidence hợp lệ

- Xác nhận: artifact retrieval `p5.1` **không tương thích** evaluator `p5.2`; dry-run đã fail `Retrieval artifact prompt version mismatch` trước provider/DB call.
- Không bypass guard, không sửa artifact cũ.
- Smoke ngắn nhất: rerun đúng `chat-eval-lang-006` bằng retrieval runner `p5.2`, sau đó generation runner `p5.2` trên artifact mới.
- Ngân sách smoke: **1 Gemini embedding + 1 Gemini generation**; Neon **2 logical read searches** (vector + FTS) và **1 read-only hydration batch**; 0 write, 0 retry.
- Smoke này chỉ xác nhận patch/citation behavior, **không thay thế** core eval hoặc calibration.
- Đường ngắn nhất để đủ beta evidence: chạy retrieval một lần cho toàn bộ 120 case dưới `p5.2`, lưu artifact rồi tái dùng; không lặp embedding khi review/calibration/generation.

## Kế hoạch tối đa hai đợt

### Đợt 1 — Beta Stabilization

**Phạm vi**

1. Chốt P0: billing/data terms hoặc invite-only consent boundary.
2. Pin Preview env đúng branch Phase 5: Neon `phase3-preview`, model/version `p5.2`, embedding `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`, low caps `20/10/15`, secrets/timeout/token budgets.
3. Chạy retrieval core 120 case một lần; lưu artifact ngoài repo.
4. Review/calibrate relevance policy từ evidence, đặt `threshold_version` mới và triển khai policy nhưng chưa mở public.
5. Chạy generation smoke p5.2 đại diện tối đa 6 case từ artifact mới; không retry.
6. Thực thi retention cleanup tối thiểu hoặc tắt persistence cho beta nếu owner chọn hướng đó.

**PASS khi**

- 120/120 retrieval executions có version/evidence đầy đủ, không dùng Production DB.
- Threshold/policy có version, owner duyệt; no-context/injection không được mở ANSWER do topical candidates.
- p5.2 generation smoke không lộ prompt/secret, citation/fallback fail-closed và không còn blocker format lặp lại.
- Preview env/caps/privacy/retention đều có bằng chứng cấu hình.

**Provider budget dự kiến**

- Gemini: **120 embedding + tối đa 6 generation**.
- Neon: khoảng **240 logical read searches** (vector + FTS cho 120 câu) + **1 hydration batch**; **0 writes** cho eval.
- Có thể chia nhiều ngày; lưu artifact để không gọi embedding lại.

### Đợt 2 — Beta Acceptance

**Phạm vi**

1. Chạy core eval 120 câu từ artifact p5.2 đã lưu; generation chỉ theo kế hoạch đánh giá đã duyệt, không rerun retrieval.
2. Chấm ANSWER/NO_CONTEXT, grounding, citations, unsupported claims, injection và latency; owner chốt acceptance thresholds.
3. Deploy Preview và chạy API smoke 10–20 câu qua route thật, gồm session/Turnstile/Upstash, fallback dependency, citation UI và persistence.
4. Smoke feedback, lead database-first/Resend, retention; kiểm tra Lighthouse/CLS trên `/chat`.
5. Chỉ mở controlled beta tại `/chat` khi tất cả PASS; homepage Phase 5b vẫn ngoài phạm vi.

**PASS khi**

- Core eval đủ 120 case, lưu kết quả kèm model/embedding/prompt/threshold versions.
- **0 fabricated answer** ở nhóm missing-context và injection; citation trỏ đúng nội dung; p5.2 không có unresolved systematic citation-format failure.
- API smoke tối thiểu 10 case PASS, gồm dependency fallbacks và rate/security behavior.
- Production policy không còn `CALIBRATION_REQUIRED` chỉ sau owner approval; rollback về khóa calibration vẫn sẵn có.
- Preview/production beta env, low caps, privacy notice, retention, lead và Performance/CLS được xác nhận.

**Provider budget dự kiến**

- Core generation: tối đa **120 calls**; thực tế có thể thấp hơn nếu calibrated policy chặn 55 expected NO_CONTEXT trước Gemini.
- API smoke: **10–20 embeddings + tối đa 10–20 generation calls**.
- Neon: **1–vài read-only hydration batches** cho core evidence; API smoke có 10–20 retrieval flows và các write tối thiểu đã dự kiến cho conversation/unanswered/feedback/lead acceptance.
- Turnstile/Upstash/Resend: chỉ các calls của 10–20 API smoke và một lead/feedback smoke; không load test.

## Quyết định audit

- Phase 5 implementation: **gần hoàn tất**.
- Public beta readiness: **NO-GO hiện tại**.
- Kế hoạch ngắn nhất: **hai đợt trên, không mở thêm E4-B9 hoặc framework mới**.
- Gemini/Neon calls trong audit: **0/0**.
- Source/env/provider/Vercel changes trong audit: **0**.
