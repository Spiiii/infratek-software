# Phase 5 — Beta Acceptance Gap Review

Ngày review: 2026-10-12

Branch/HEAD: `codex/phase-5-chatbot-rag` / `9269676`

## Quyết định

**NO-GO cho Public Beta tại thời điểm hiện tại.**

Implementation và kiểm thử offline đã đủ rộng, retrieval live 120/120 đã hoàn tất, nhưng production vẫn `CALIBRATION_REQUIRED` / `UN-CALIBRATED`; generation p5.3 chưa có batch đạt yêu cầu và `chat-eval-lang-006` vẫn là **FAIL / SAFE_FALLBACK**. Preview end-to-end 10–20 case, privacy/legal approval cho Gemini Free và Owner approval mở beta cũng chưa có.

## Bảng trạng thái thực tế

| Hạng mục | Unit/offline | Live provider/runtime | Trạng thái Beta |
|---|---|---|---|
| `/chat`, `/api/chat`, feedback, lead | PASS implementation; chat suite hiện tại 152/152 | Chưa có Preview E2E acceptance 10–20 case trên bản hiện hành | Chưa nghiệm thu |
| Session, Turnstile, trusted Vercel IP, Upstash | PASS deterministic; fail-closed, raw IP không persist | D-07 từng được xác minh Preview; toàn luồng hiện hành chưa smoke lại | Cần API smoke |
| Ingestion/RAG hybrid | PASS mechanics: vector + FTS + RRF, Top 6 | Retrieval p5.2 COMPLETED 120/120; 120 embeddings, 240 reads, 0 retry | Evidence đủ để calibration, chưa đủ bật ANSWER |
| Retrieval source coverage | Offline artifact integrity PASS | Expected source: Top 20 65/65; final Top 6 64/65 | Một miss `ans-001`; không tự đồng nghĩa grounding fail/pass |
| Threshold/calibration | Sweep offline hoàn tất | Candidate `0.722924077393`: TP 55, FP 3, TN 52, FN 10 | **BLOCKED** — `INSUFFICIENT_EVIDENCE`, chưa Owner duyệt |
| Generation contract p5.3 | Structured JSON/citation rendering và guards PASS; evaluator 19/19 | Live p5.3 `lang-006`: schema/citation path qua, sau đó SAFE_FALLBACK | **FAIL** cho case này |
| Proper-name validation | Fix PASS; canonical token-boundary; full regressions PASS | Lỗi `UNSUPPORTED_PROPER_NAME` không tái xuất hiện ở rerun | Đã xử lý ở mức evidence hiện có |
| Risky-claim validation | Keyword có/không dấu và boundary PASS; policy exact-evidence giữ nguyên | Rerun `lang-006` fail `UNSUPPORTED_RISKY_CLAIM`; claim cụ thể không được lưu | Chưa giải quyết chất lượng live |
| Citation/grounding | Strict labels, server rendering, protected-output fail-closed PASS | p5.2 smoke: 3 PASS, 1 FAIL, 2 NOT_EVALUATED; p5.3 chỉ một case và case đó FAIL | Chưa đủ acceptance evidence |
| PII/session persistence/fallback | PASS; rejected output không persist; provider/dependency fallback có test | Chưa smoke toàn tuyến Preview hiện hành | Cần API smoke |
| Dataset/evaluator | 120/120 VERIFIED; version/budget/integrity guards PASS | Retrieval đủ 120; generation chưa đủ | Core eval chưa hoàn tất về answer quality |
| Retention | Metadata/cleanup primitive có; conversations 30 ngày, feedback/unanswered 90 ngày; lead đã được Owner chọn 180 ngày | Cleanup cron/route và lead retention chưa được triển khai/xác minh | Chặn nếu công bố retention/persist user thật |
| Privacy Gemini Free | Notice + acknowledgement đã triển khai ở mức source | Chưa có Owner/legal approval; Free tier có thể dùng dữ liệu để cải thiện sản phẩm/human review | **P0 blocker** |
| Performance/CLS và lead notification | Có test chức năng provider-free | Chưa Lighthouse/Preview lead smoke trên bản Beta | Chưa nghiệm thu |

## Blocker thực sự

1. **Privacy/legal cho Gemini Free:** tài liệu gốc yêu cầu đánh giá lại provider/billing trước khi có người dùng thật. Notice và acknowledgement không tự tạo legal approval, không bảo đảm redaction loại hết dữ liệu nhạy cảm.
2. **Production ANSWER vẫn khóa:** không có threshold/policy version được Owner duyệt. Candidate threshold tốt nhất vẫn có 3 false ANSWER boundary và 10 false refusal; không được áp dụng cảm tính.
3. **Generation quality chưa đạt:** `lang-006` vẫn FAIL/SAFE_FALLBACK sau structured citation và proper-name fix. Claim-level grounding của lần này là `NOT_EVALUATED`; không được nâng thành PASS chỉ vì fail-closed an toàn.
4. **Core eval chưa hoàn tất:** 120 retrieval cases đã chạy, nhưng answer correctness, claim support và citations chưa được đánh giá cho các case production policy sẽ cho phép ANSWER.
5. **Preview API smoke chưa chạy:** thiếu tối thiểu 10 case qua route thật với session, Turnstile, Upstash, persistence, citations, dependency fallback và UI mapping.
6. **Beta operations chưa được xác nhận:** Preview env/caps, retention cleanup, lead/Resend smoke, Lighthouse Performance/CLS và rollback chưa có evidence cuối trên build dự kiến mở beta.
7. **Owner chưa phê duyệt mở Public Beta:** đây là gate cuối, không thể suy ra từ test kỹ thuật.

## Có thể defer

- Đổi trang chủ sang chatbot (Phase 5b); Beta tiếp tục ở `/chat` và `noindex`.
- Streaming; non-stream hiện an toàn hơn cho validation trước khi hiển thị.
- FTS tuning, reranking/diversity nâng cao và xử lý riêng `ans-001`, miễn policy Beta fail-closed khi relevance không chắc chắn.
- Bổ sung `company_facts`, pages và FAQ để tăng coverage; thiếu dữ liệu phải trả NO_CONTEXT.
- Analytics/Sentry nâng cao, quota alert UI, homepage SEO integration và blog pipeline.
- Semantic acceptance cho paraphrase risky claim; Beta có thể giữ false-refusal bảo thủ nếu Owner chấp nhận rõ ràng.

## Kế hoạch tối thiểu để hoàn tất Phase 5

### 1. Chốt các gate không tốn provider

1. Owner/legal quyết định Gemini Free có được dùng cho controlled public users hay phải chuyển paid/provider khác; duyệt chính xác privacy copy và acknowledgement.
2. Owner duyệt relevance policy có version. Không áp single threshold hiện tại nếu chưa có rule xử lý ba boundary false ANSWER; giữ `CALIBRATION_REQUIRED` cho đến khi policy có acceptance evidence.
3. Hoàn thiện retention tối thiểu: conversations 30 ngày, feedback/unanswered 90 ngày, leads 180 ngày; triển khai entrypoint/cron fail-closed và xác minh không đụng Production ngoài kế hoạch được duyệt.
4. Pin/xác minh Preview env: đúng `phase3-preview/neondb`, prompt p5.3, embedding/ingestion versions, public caps 20/10/15 và đầy đủ security/provider secrets.

### 2. Hoàn tất core evidence với quota thấp nhất

1. Tái sử dụng retrieval artifact p5.2 đã hoàn thành và compatibility guard p5.2 → p5.3; **0 embedding calls, 0 retrieval rerun**.
2. Sau khi policy candidate được Owner duyệt, chạy generation chỉ cho các case policy phân loại ANSWER, tuần tự, không retry; tối đa 65 generation calls nhưng thực tế phải thấp hơn theo policy. Expected NO_CONTEXT được chấm offline, không gọi generation.
3. Bắt buộc gồm `lang-006`, ba boundary false ANSWER, `ans-001`, injection và unsupported-claim controls. `lang-006` chỉ PASS nếu trả lời hợp lệ, citation/claim grounding PASS; SAFE_FALLBACK vẫn là FAIL về answer quality.
4. Chấm confusion matrix cuối, false ANSWER, false refusal, citation resolution, claim-level grounding và latency. Chỉ đổi threshold/version sau Owner approval; không dùng RRF như confidence.

### 3. Preview Beta Acceptance

1. Deploy Preview candidate và chạy API smoke tối thiểu 10 case qua `/api/chat` thật; không tái sử dụng core runner để thay thế route acceptance.
2. Bao phủ ANSWER, NO_CONTEXT, injection, không dấu, boundary, provider/Neon/Upstash fallback, session/Turnstile/rate limit và citation UI. Smoke feedback cùng một lead database-first/Resend.
3. Xác minh retention job, low caps, privacy acknowledgement, noindex, Lighthouse Performance/CLS và rollback.
4. Owner xem evidence, duyệt privacy/legal, threshold/policy và rủi ro false-refusal; sau đó mới bỏ calibration gate trên đúng môi trường Beta và mở `/chat`.

## Ngân sách tối thiểu dự kiến

- Retrieval/embedding: **0** — tái sử dụng artifact đã hoàn thành.
- Core generation: tối đa **số case được policy cho ANSWER**, trần hiện hữu 65; không gọi cho expected NO_CONTEXT và không retry.
- Preview API smoke: tối thiểu 10 retrieval flows; tối đa 10 embeddings và tối đa 10 generation calls, thấp hơn nếu policy từ chối trước model.
- Neon core review: chỉ hydration read-only theo batch; Preview smoke có các write tối thiểu đã định nghĩa cho conversation/unanswered/feedback/lead.

## GO/NO-GO

- Unit/offline implementation: **PASS**.
- Retrieval live execution: **PASS**, calibration approval: **FAIL/CHƯA DUYỆT**.
- Generation live quality: **FAIL/CHƯA ĐỦ EVIDENCE**.
- Preview end-to-end acceptance: **NOT RUN**.
- Privacy/legal approval: **PENDING**.
- Public Beta: **NO-GO**.

Phase 5 chỉ có thể đóng sau khi các blocker bắt buộc trên đạt PASS và Owner phê duyệt rõ ràng. Không cần mở framework/checkpoint mới; ba nhóm việc tuần tự phía trên là đường ngắn nhất dựa trên evidence hiện có.

## Safety accounting

- Gemini/Neon calls trong review: `0/0`.
- Evaluation rerun: không.
- Source/prompt/threshold/policy: không thay đổi.
- Push/deploy/public beta: không thực hiện.
