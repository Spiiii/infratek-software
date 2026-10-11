# Phase 5 — Beta Stabilization

Ngày kiểm tra: 2026-10-11

Branch/HEAD nền: `codex/phase-5-chatbot-rag` / `b0261127c29d29b5f67c36beb3b7070f3974b1d1`

## 1. Kết quả ngắn

Phần kỹ thuật offline đã được ổn định: cấu hình mẫu dùng đúng embedding/index hiện tại, giới hạn beta được hạ qua environment, runner hỗ trợ full-120 có explicit authorization/pacing/partial evidence, privacy acknowledgement đã chặn composer mặc định và retention primitive đã được chuẩn bị nhưng chưa nối vào cron/route. Production vẫn giữ `CALIBRATION_REQUIRED` / `UN-CALIBRATED`.

Chưa được mở public beta. Hai blocker chính là (1) điều kiện dữ liệu của Gemini Free và notice hiện tại chưa đủ cho người dùng thật; (2) chưa có retrieval/evaluation evidence `p5.2`, calibration và Preview acceptance. Retention hiện mới có metadata `expires_at`, chưa có cleanup được kích hoạt.

## 2. Thay đổi source/config

| File | Thay đổi |
|---|---|
| `.env.example` | Đồng bộ `gemini-embedding-2`, dimension `768`, embedding version `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`; thêm token/embedding timeout mẫu; đặt beta cap `global=20`, `IP=10`, `session=15` |
| `src/lib/chat/config.ts` | Sửa build-safe default ingestion từ `p5.1` thành `p5.3-v1` để khớp index hiện tại |
| `src/lib/chat/foundation.test.ts` | Pin và kiểm tra embedding/ingestion version hiện hành |
| `evals/retrieval-runner.ts`, `evals/run-retrieval-eval.ts` | Full-120 chỉ khi có flag riêng; 120 embedding/240 read; pacing ≥1 giây; stop-on-provider-error; ghi artifact tăng dần |
| `evals/generation-runner.ts` | Từ chối artifact mới có trạng thái `STOPPED`/`IN_PROGRESS`; vẫn đọc được historical completed artifact không có marker |
| `/chat` UI | Disclosure Gemini Free + link terms; bắt buộc acknowledgement trước khi composer được bật; bỏ nhãn “An toàn” tuyệt đối |
| `src/lib/chat/retention/cleanup.ts` | Primitive cleanup cho ba bảng có `expires_at`; chưa được nối vào route/script/cron/startup |

Không đổi production decision policy, model/provider, schema, migration, API contract hoặc cloud configuration.

Semantics rate limit hiện tại:

- `CHAT_PER_MINUTE=6`: sliding window 60 giây theo trusted-IP HMAC.
- `CHAT_IP_DAILY_CAP=10` và `CHAT_DAILY_CAP=20`: reset tại cuối ngày UTC.
- `CHAT_SESSION_CAP=15`: theo vòng đời signed session 7 ngày.
- Upstash dùng một atomic Lua `EVAL`, namespace tách biệt, không lưu IP thô và fail closed khi dependency lỗi.
- Lead giữ nguyên 5 lượt/rolling 10 phút; không bị thay đổi âm thầm.

## 3. Privacy và Gemini Free

### Cấu hình và dữ liệu gửi provider

- Chat model: `gemini-3.5-flash-lite`; embedding model: `gemini-embedding-2`; API dùng `@google/genai` với project/key do Owner cấu hình.
- Embedding nhận câu hỏi hiện tại đã redact email/số điện thoại. Với multi-turn, embedding còn nhận tối đa hai lượt hoàn chỉnh gần nhất (user + assistant), cũng được redact lại.
- Generation nhận câu hỏi hiện tại đã redact và system prompt chứa tối đa sáu chunk nguồn công khai theo thứ tự `S1–S6`.
- Lịch sử hội thoại không được gửi trực tiếp vào generation; nó chỉ tham gia retrieval text/token-budget. Retrieval diagnostics, raw IP, session token và secret không được gửi Gemini.
- Redaction hiện chỉ bao phủ email và số di động Việt Nam nhận diện được; nó không chứng minh đã loại bỏ mọi tên người, địa chỉ, mã khách hàng hoặc dữ liệu nhạy cảm dạng tự do.

### Điều khoản hiện hành và notice

Theo [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms), Unpaid Services có thể dùng nội dung gửi lên và response để cải thiện sản phẩm; human reviewers có thể đọc/xử lý input và output; Google yêu cầu không gửi thông tin nhạy cảm, bí mật hoặc cá nhân. [Trang pricing chính thức](https://ai.google.dev/gemini-api/docs/pricing) cũng phân biệt Free Tier “used to improve our products: Yes” và Paid Tier “No”.

`/chat` nay nêu rõ dữ liệu được gửi tới Gemini API của Google, khả năng dùng input/output để cải thiện sản phẩm và human review, đồng thời yêu cầu acknowledgement trước khi gửi. Notice cũng nói rõ redaction không bảo đảm loại bỏ mọi PII/dữ liệu nhạy cảm.

**PRIVACY_BLOCKER:** CÒN CHỜ OWNER/LEGAL DUYỆT COPY VÀ CƠ CHẾ ACKNOWLEDGEMENT. Thay đổi kỹ thuật không tự chứng minh tuân thủ pháp lý và không biến Gemini Free thành dịch vụ không dùng dữ liệu. Không bật billing.

## 4. Preview environment readiness

Không gọi Vercel nên không khẳng định Preview đã cấu hình. Local `.env.local` chỉ được kiểm tra presence, không in secret: có `DATABASE_URL`, Google API key, `GEMINI_EMBED_MODEL=gemini-embedding-2`, dimension `768`, embedding version `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`. Các biến chat/security/Preview còn lại không có trong local file này; điều đó không chứng minh Vercel Preview thiếu.

Owner cần đối chiếu scope **Preview**:

| Nhóm | Biến/giá trị yêu cầu |
|---|---|
| Database | `DATABASE_URL` → Neon `phase3-preview/neondb`, không phải Production |
| Gemini | `GOOGLE_GENERATIVE_AI_API_KEY`; `CHAT_MODEL=gemini-3.5-flash-lite`; `EMBED_MODEL`/`GEMINI_EMBED_MODEL=gemini-embedding-2`; dimension `768` |
| Versions | `CHAT_MODEL_VERSION=gemini-3.5-flash-lite-p5.1`; `PROMPT_VERSION=p5.2`; `EMBED_VERSION=gemini-embedding-2-768-p5.3`; `INGESTION_VERSION=p5.3-v1`; `THRESHOLD_VERSION=UN-CALIBRATED` |
| Limits | `CHAT_PER_MINUTE=6`; global `20`; IP `10`; session `15`; input length `500`; input budget `12000`; embedding timeout `15000ms`; generation timeout `10000ms`; output `256` tokens |
| Security | session signing secret, IP HMAC secret, Turnstile secret/site key, Upstash URL/token |
| Product | Resend key/recipient cho lead; `CONTENT_SOURCE`; Payload/Preview secrets theo deployment hiện có |

## 5. Retention

| Dữ liệu | Metadata hiện có | Cleanup thực thi |
|---|---:|---:|
| Conversations | `expires_at`, mặc định 30 ngày | Chưa |
| Feedback | `expires_at`, mặc định 90 ngày | Chưa |
| Unanswered | `expires_at`, refresh 90 ngày khi dedupe/upsert | Chưa |
| Leads | Không có `expires_at`; tài liệu chưa chốt thời hạn | Chưa thể tự chọn |

Đã chuẩn bị một cleanup primitive parameterized cho đúng ba bảng có `expires_at`; nó không có entrypoint và chưa thể tự chạy. Không tạo cron/endpoint, không chạy `DELETE`. Sau khi Owner duyệt mới nối primitive vào route nội bộ fail-closed + `CRON_SECRET` + Vercel Cron hằng ngày. Đề xuất để Owner chọn cho leads: **90 ngày** (nhất quán feedback/unanswered), **180 ngày** (sales follow-up dài hơn), hoặc **không tự xóa** cho đến khi có quy trình CRM; chưa phương án nào được áp dụng. Cho tới khi job được deploy và có evidence, retention vẫn là **chưa thực thi**.

## 6. Retrieval evidence `p5.2` — kế hoạch và ngân sách

Dataset validator: `120/120 VERIFIED`, gồm 45 answerable, 30 missing-context, 20 injection/unsupported, 15 language variants, 10 boundary; policy vẫn `UN-CALIBRATED`.

Dry-run provider-free hiện dùng được:

```powershell
npm run eval:chat:retrieval -- --run-id p57-beta-p52-dry --max-cases 120 --output-dir "$env:TEMP\infratek-p5.7e\p57-beta-p52-dry"
```

Ngân sách dự kiến cho live full dataset: tối đa **120 Gemini embedding calls**, khoảng **240 logical Neon read searches** (vector + FTS), **0 generation**, **0 DB writes**, **0 automatic retries**. Artifact phải ở ngoài repository và mang prompt `p5.2`, embedding/index versions nêu trên.

Lệnh live hợp lệ bên dưới **CHƯA CHẠY**. Nó lấy đúng 120 ID đã validate, yêu cầu explicit authorization, pacing 1000ms, cap 120 embedding/240 logical reads và output ngoài repo:

```powershell
$dataset = Get-Content .\evals\chat.yml -Raw | ConvertFrom-Json
$caseArgs = foreach ($case in $dataset.cases) { '--case-id'; $case.id }
npm run eval:chat:retrieval -- --live --authorize-full-dataset --run-id p57-beta-p52-retrieval-120 --max-cases 120 --max-embedding-calls 120 --max-logical-read-searches 240 --request-delay-ms 1000 --output-dir "$env:TEMP\infratek-p5.7e\p57-beta-p52-retrieval-120" @caseArgs
```

Runner không retry. Khi embedding báo quota/provider failure hoặc execution lỗi, nó ghi `STOPPED`, giữ các case đã hoàn thành và dừng; generation guard không nhận artifact chưa `COMPLETED`. Historical `p5.1` không bị sửa/relabel.

## 7. Calibration

Phương pháp sau khi có artifact 120 case:

1. Đóng băng dataset/model/embedding/prompt/ingestion versions và raw retrieval diagnostics.
2. Đánh giá riêng expected `ANSWER`/`NO_CONTEXT`, expected-source hit, semantic support, injection/unsupported claims, accented/unaccented và boundary; candidate presence không đồng nghĩa ANSWER.
3. Sweep các candidate threshold quan sát được trên evidence, không dùng RRF như confidence và không chọn số cảm tính.
4. Ưu tiên giảm false ANSWER ở missing-context/attack; báo confusion matrix và kết quả theo bốn category chuẩn.
5. Xác nhận citation/grounding chỉ ở generation evidence; unknown evidence là `NOT_EVALUATED`, không phải PASS.
6. Ghi threshold/version mới và chỉ đổi production policy sau Owner approval + Preview smoke.

## 8. Generation smoke `p5.2` — kế hoạch và ngân sách

Exact cases: `chat-eval-ans-024`, `chat-eval-mis-013`, `chat-eval-inj-002`, `chat-eval-lang-006`, `chat-eval-bnd-002`, `chat-eval-ans-001`.

Sau khi có retrieval artifact `p5.2`, lệnh dự kiến:

```powershell
npm run eval:chat:generation -- --live --run-id p57-beta-p52-generation-6 --retrieval-artifact "$env:TEMP\infratek-p5.7e\p57-beta-p52-retrieval-120\retrieval-evidence.json" --case-id chat-eval-ans-024 --case-id chat-eval-mis-013 --case-id chat-eval-inj-002 --case-id chat-eval-lang-006 --case-id chat-eval-bnd-002 --case-id chat-eval-ans-001 --max-cases 6 --max-generation-calls 6 --output-dir "$env:TEMP\infratek-p5.7e\p57-beta-p52-generation-6"
```

Budget: tối đa **6 Gemini generation calls**, **1 Neon Preview read-only hydration batch**, **0 embeddings**, **0 retrieval rerun**, **0 writes**, **0 retries**. Historical artifact `p5.1` bị version guard từ chối đúng thiết kế và không được sửa/relabel.

## 9. Kiểm thử offline

- Dataset validator: PASS, 120/120 VERIFIED.
- Retrieval runner + Preview target guard focused: PASS, 8/8.
- Generation artifact guard focused: PASS, 14/14.
- Config/privacy/retention focused: PASS, 19/19.
- Typecheck: PASS; `git diff --check`: PASS.
- Gemini calls: 0; Neon calls: 0; cloud configuration/deploy: 0.

## 10. Blocker chuyển sang Beta Acceptance

| Priority | Blocker |
|---|---|
| P0 | `PRIVACY_BLOCKER`: Owner/legal chưa phê duyệt disclosure/consent và điều kiện dùng Gemini Free cho user data |
| P1 | Full-120 runner đã sẵn sàng offline nhưng chưa được Owner phê duyệt/chạy; chưa có retrieval evidence `p5.2` |
| P1 | Chưa calibration/versioned threshold; production phải tiếp tục `CALIBRATION_REQUIRED` |
| P1 | Preview env/Neon branch/Turnstile/Upstash/Resend chưa được xác minh trên deployment thật |
| P1 | Retention primitive chưa được phê duyệt kích hoạt/deploy; lead retention chưa được Owner chọn |
| P1 | Chưa generation smoke 6 case `p5.2` và API smoke 10–20 request trên Preview |
| P2 | FTS tuning, analytics, quota alert, streaming, reranking, CMS/dashboard và UI nâng cao được defer |

---

`BETA STABILIZATION: PARTIAL`

`PUBLIC BETA: NO-GO`

`GEMINI CALLS: 0`

`NEON CALLS: 0`

`DEPLOY: NO`
