# Phase 5 — Step 2D-A Vercel Preview Readiness

Ngày: 2026-10-14
Worktree: `C:\Users\Admin\Desktop\code\infratek-software-phase5`

## 1. Git và Vercel readiness

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Branch local | PASS | `codex/phase-5-chatbot-rag` |
| Local HEAD | PASS | `31b0f42902068e242a6cb154f5fc52b7ff352cba` |
| Working tree | PASS có lưu ý | Có `src/payload-types.ts` modified và các báo cáo untracked tồn tại từ trước; không file nào bị reset/stage/commit. |
| Remote branch | PASS | `origin/codex/phase-5-chatbot-rag` tại `7b3218d6dc9e9f255a947ab23e259e92484675ff`; local đang đi trước remote. |
| Vercel project link trong worktree | NOT VERIFIED | Không có `.vercel/project.json`; không tự link project. |
| Vercel CLI metadata | NOT VERIFIED | `vercel` không được cài/không có trong PATH; không cài thêm và không đổi cloud config. |
| Project/repository mapping | NOT VERIFIED | Project `infratek-software` / team `spi6` là context đã biết, nhưng không có metadata read-only hiện hành để xác nhận repository/production-branch settings. |
| Preview deployment Phase 5 | PRESENT, chưa phải candidate hiện tại | Evidence đã biết: deployment Preview `AaepaBLAG`, commit `7b3218d`, Ready và Payload REST database access PASS. Deployment này khớp remote, nhưng không chứa local HEAD `31b0f42`. |
| Production branch | NOT VERIFIED bằng tooling hiện tại | Owner cung cấp `main`; chưa xác minh lại từ Vercel project settings. |

Rủi ro deploy nhầm Production được giảm bằng branch riêng và yêu cầu Preview-only, nhưng chưa thể đánh dấu PASS vì project/branch settings chưa được đọc trực tiếp. Không được dùng `vercel --prod`, promote deployment hoặc merge `main` trong Step 2D-B.

## 2. Environment variable matrix

Không đọc value. Local `.env.local` không được dùng làm bằng chứng cho Vercel. Do không có Vercel CLI/link hoặc metadata dashboard trong lượt này, mọi trạng thái cloud dưới đây là **NOT VERIFIED**; `MISSING` chỉ được dùng sau khi metadata xác nhận vắng mặt.

| Biến | Yêu cầu | Vercel Preview | Scope mong muốn | Mục đích / blocker |
|---|---|---|---|---|
| `DATABASE_URL` | Bắt buộc | NOT VERIFIED | Preview branch | Pooled Neon `phase3-preview/neondb`; blocker deploy/runtime. |
| `DATABASE_URL_PREVIEW_UNPOOLED` | Không cần ở runtime Vercel | NOT VERIFIED | Local/CI migration riêng | Direct migration URL; không đưa vào build/deploy nếu không chạy migration. |
| `PAYLOAD_SECRET` | Bắt buộc | NOT VERIFIED | Preview | Payload auth/runtime; blocker. |
| `CONTENT_SOURCE` | Bắt buộc cho CMS content | NOT VERIFIED | Preview | Phải là `payload` cho Preview acceptance. |
| `PAYLOAD_PREVIEW_SECRET` | Bắt buộc cho preview workflow | NOT VERIFIED | Preview | Bảo vệ content preview. |
| `INTERNAL_SERVICE_SECRET` | Theo route nội bộ sử dụng | NOT VERIFIED | Preview | Service-to-service auth; xác minh trước API acceptance liên quan. |
| `BLOB_READ_WRITE_TOKEN` | Tùy nội dung media | NOT VERIFIED | Preview | Payload media; defer nếu Step 2D-B không upload. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Bắt buộc cho live chat | NOT VERIFIED | Preview | Generation và query embedding; blocker trước test Gemini. |
| `CHAT_MODEL` | Bắt buộc cấu hình candidate | NOT VERIFIED | Preview | `gemini-3.5-flash-lite`. |
| `CHAT_MODEL_VERSION` | Bắt buộc | NOT VERIFIED | Preview | Version evidence; phải khớp implementation hiện hành. |
| `EMBED_MODEL` | Bắt buộc | NOT VERIFIED | Preview | `gemini-embedding-2`. |
| `EMBED_DIMENSION` | Bắt buộc | NOT VERIFIED | Preview | `768`. |
| `EMBED_VERSION` | Bắt buộc | NOT VERIFIED | Preview | `gemini-embedding-2-768-p5.3`. |
| `PROMPT_VERSION` | Bắt buộc | NOT VERIFIED | Preview | `p5.3`. |
| `THRESHOLD_VERSION` | Bắt buộc | NOT VERIFIED | Preview | Phải giữ `UN-CALIBRATED`; không mở production ANSWER. |
| `INGESTION_VERSION` | Bắt buộc | NOT VERIFIED | Preview | `p5.3-v1`, khớp index. |
| `CHAT_SESSION_SIGNING_SECRET` | Bắt buộc | NOT VERIFIED | Preview-only secret | Signed anonymous session; blocker. |
| `CHAT_IP_HMAC_SECRET` | Bắt buộc | NOT VERIFIED | Preview-only secret | HMAC IP trước Redis; blocker. |
| `TURNSTILE_SECRET_KEY` | Bắt buộc | NOT VERIFIED | Preview-only secret | Server verification; blocker. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bắt buộc | NOT VERIFIED | Preview/public | Widget; hostname phải cho phép Preview domain. |
| `UPSTASH_REDIS_REST_URL` | Bắt buộc | NOT VERIFIED | Preview | Distributed fail-closed rate limit; blocker. |
| `UPSTASH_REDIS_REST_TOKEN` | Bắt buộc | NOT VERIFIED | Preview-only secret | Distributed fail-closed rate limit; blocker. |
| `CHAT_PER_MINUTE` | Bắt buộc policy | NOT VERIFIED | Preview | Candidate cap `6`. |
| `CHAT_IP_DAILY_CAP` | Bắt buộc policy | NOT VERIFIED | Preview | Public-beta cap `10`. |
| `CHAT_SESSION_CAP` | Bắt buộc policy | NOT VERIFIED | Preview | Session cap `15`. |
| `CHAT_DAILY_CAP` | Bắt buộc policy | NOT VERIFIED | Preview | Global cap `20`. |
| `CHAT_INPUT_MAX_LENGTH` | Có default, nên pin | NOT VERIFIED | Preview | Input limit `500`. |
| `CHAT_INPUT_TOKEN_BUDGET` | Có default, nên pin | NOT VERIFIED | Preview | Prompt ceiling `12000`. |
| `EMBED_INTERACTIVE_TIMEOUT_MS` | Có default, nên pin | NOT VERIFIED | Preview | Embedding timeout `15000`. |
| `CHAT_GENERATION_TIMEOUT_MS` | Có default, nên pin | NOT VERIFIED | Preview | Generation timeout `10000`. |
| `CHAT_OUTPUT_MAX_TOKENS` | Có default, nên pin | NOT VERIFIED | Preview | Output cap `256`. |
| `CHAT_SESSION_TTL_SECONDS` | Có invariant | NOT VERIFIED | Preview | `604800`. |
| `TURNSTILE_VERIFY_TIMEOUT_MS` | Có default | NOT VERIFIED | Preview | `5000`. |
| `CHAT_CONTEXT_MESSAGES` | Có default | NOT VERIFIED | Preview | `6`. |
| `CHAT_CONVERSATION_RETENTION_DAYS` | Bắt buộc policy | NOT VERIFIED | Preview | `30`. |
| `CHAT_UNANSWERED_RETENTION_DAYS` | Bắt buộc policy | NOT VERIFIED | Preview | `90`. |
| `CHAT_FEEDBACK_RETENTION_DAYS` | Bắt buộc policy | NOT VERIFIED | Preview | `90`. |
| `CRON_SECRET` | Bắt buộc trước cleanup acceptance | NOT VERIFIED | Preview-only secret | Auth endpoint retention; cron chưa kích hoạt. |
| `RESEND_API_KEY` | Tùy test email/lead | NOT VERIFIED | Preview | Không chặn provider-free tests; cần trước Resend acceptance. |
| `CONTACT_RECIPIENT` | Tùy test email/lead | NOT VERIFIED | Preview | Địa chỉ nhận lead/contact. |
| `NEXT_PUBLIC_SITE_URL` | Bắt buộc cho canonical | NOT VERIFIED | Preview | Nên là Preview URL khi nghiệm thu canonical; tránh trỏ nhầm Production trong evidence. |

Tổng trạng thái Vercel Preview: **READY 0 / MISSING 0 / NOT VERIFIED 41**.

## 3. Preview database isolation

- Local Step 2C đã xác minh pooled và direct đều trỏ endpoint `ep-nameless-leaf-b3fc4hoi`, database `neondb`, và kết nối read-only PASS.
- Runtime Payload đọc duy nhất `DATABASE_URL`; Vercel Preview phải dùng pooled URL.
- Migration wrapper dùng `DATABASE_URL_PREVIEW_UNPOOLED` riêng và guard endpoint trước khi spawn Payload. Build script chỉ là `next build`; không có migration trong `build`, `install` hoặc cron active.
- Migration direct URL không cần tồn tại trong Vercel runtime.
- Runtime identity của deployment `AaepaBLAG` đã có Payload REST database access PASS, nhưng exact Neon endpoint identity không được chứng minh chỉ từ Ready/REST access.

Kết luận database isolation: **NOT VERIFIED ở Vercel runtime**. Local configuration: PASS; cloud env target: cần metadata/diagnostic authenticated riêng ở Step 2D-B.

## 4. Build và runtime readiness

| Hạng mục | Trạng thái | Nhận xét |
|---|---|---|
| Next.js / Payload pins | PASS | Next `16.3.5`, Payload packages `3.90.1`, React `19.2.7`; exact Payload versions đồng bộ. |
| Build command | PASS | `npm run build` → `next build`; không tự migrate/seed/reindex. |
| `/chat` | PASS source | UI có privacy acknowledgement bắt buộc trước submit và cảnh báo Gemini Free/human review. |
| `POST /api/chat` | PASS source | Node runtime, fail-closed 503; session, Turnstile, Upstash, retrieval/generation dependencies được nối. |
| `POST /api/chat/feedback` | PASS source | Route tồn tại; ghi Preview DB khi test thật. |
| `POST /api/chat/lead` | PASS source | Signed-session ownership, distributed lead limiter, DB-first và Resend notifier. |
| `GET /api/internal/chat-retention` | PASS source | Bearer `CRON_SECRET`; không active cron vì chỉ có example config. Gọi route sẽ DELETE nên ngoài phạm vi Step 2D-A. |
| Public-beta gate | PASS một phần | `THRESHOLD_VERSION` chỉ chấp nhận `UN-CALIBRATED`; decision policy vẫn trả `CALIBRATION_REQUIRED`. Không có feature flag riêng để ẩn `/chat`; route sẽ public trên Preview nếu deployment protection cho phép. |
| Client IP | PASS source / cần Preview test | Chỉ tin `x-vercel-forwarded-for`; D-07 cần xác minh trên deployment thật. |
| Cookie | PASS source | `HttpOnly`, `Secure` khi `NODE_ENV=production`, `SameSite=Lax`, path `/`, TTL 7 ngày. Không cần CORS cho same-origin UI/API. |
| Turnstile hostname | NOT VERIFIED | Site key phải cho phép hostname Preview alias; cloud setting chưa kiểm tra. |
| Static quality/build hiện tại | NOT VERIFIED | Không chạy build trong audit; local HEAD chưa deploy và working tree không clean. |
| Health endpoints | NOT VERIFIED / absent | Không tìm thấy liveness/readiness route riêng; dùng page/Payload/API safe probes trong Step 2D-B, không tạo route mới ở đây. |

Dependency có thể làm runtime FAIL: thiếu/sai `DATABASE_URL`, Payload secret, Google key, Upstash URL/token, Turnstile keys hoặc session/IP secrets. Blob và Resend chỉ chặn luồng tương ứng. Build có thể PASS với nhiều default, nên build success không chứng minh runtime readiness.

## 5. Blocker thực sự

1. Vercel Preview env metadata cho branch Phase 5 chưa được xác minh: 41 biến đều `NOT VERIFIED`.
2. Candidate local `31b0f42` chưa có trên remote/deployment đang biết (`7b3218d`); không thể nghiệm thu code hiện tại trên Preview.
3. Exact Vercel runtime DB endpoint chưa được chứng minh là Neon Preview, dù local isolation và Payload REST access cũ đã PASS.
4. Turnstile hostname/site-key và trusted Vercel client-IP behavior chưa được xác minh trên deployment thật.
5. Build/typecheck của chính candidate deployment chưa có evidence hiện hành.

## 6. Có thể defer

- Blob upload nếu Step 2D-B không kiểm thử media.
- Resend delivery nếu tách lead persistence khỏi email acceptance; phải ghi rõ notification chưa nghiệm thu.
- Cleanup DELETE và cron activation.
- Production old-password rejection và Production migration-guard endpoint lịch sử.
- Gemini live generation cho tới khi provider-free Preview checks PASS.
- Public Beta, relevance activation và Production changes.

## 7. Kế hoạch tối thiểu Step 2D-B

| Nhóm | Số test tối thiểu | Tác động |
|---|---:|---|
| Deployment identity + env metadata | 1 audit | Không Gemini, không DB write. Xác minh project/team/branch/commit và chỉ presence/scope của env. |
| Safe HTTP/runtime probes | 4 | `GET /chat`, Payload REST read, unauthenticated retention phải `401`, malformed/unsupported API request không được ghi DB. |
| Database isolation | 1 authenticated internal diagnostic hoặc deployment metadata proof | Read-only; chỉ trả endpoint ID/database/pooled, không secret. Cần Owner duyệt nếu phải thêm diagnostic. |
| Turnstile/IP/session | 3 | Một request đầu yêu cầu verification, một Turnstile flow hợp lệ, một session reuse; có thể tạo conversation/session record tùy flow. |
| Chat provider | 1 case trước | Tối đa 1 embedding + 1 generation call; chỉ sau provider-free gates. Giữ `CALIBRATION_REQUIRED` có thể khiến generation bằng 0 theo policy hiện tại. |
| Feedback | 1 | Ghi Preview DB; chỉ dùng conversation đủ điều kiện. |
| Lead | 1 | Ghi Preview DB; Resend tối đa 1 call nếu Owner duyệt riêng. |
| Retention | 0 trong vòng đầu | Chỉ kiểm tra `401`; không gọi authenticated cleanup/DELETE. |

Phân loại:

- **Không Gemini, không DB write:** deployment/env audit, `/chat`, Payload read, retention unauthorized, malformed API guards.
- **Có Preview DB write:** session/conversation path, feedback, lead.
- **Có Gemini quota:** tối đa một controlled chat case sau các gate; embedding/generation tùy decision path.
- **Có Resend:** một lead notification nếu được duyệt riêng.
- **Có cleanup/DELETE:** không đề xuất trong Step 2D-B ban đầu.

## 8. Kết luận

**BLOCKED — chưa READY FOR STEP 2D-B.**

Điều kiện tối thiểu để gỡ blocker:

1. Owner cho phép đưa đúng candidate lên remote và tạo Preview deployment mới, không Production.
2. Xác minh read-only presence/scope của env matrix trên branch `codex/phase-5-chatbot-rag`; bổ sung biến thiếu bằng thao tác Owner/Vercel riêng.
3. Preview deployment phải Ready tại đúng commit candidate và build checks PASS.
4. Chứng minh runtime dùng pooled Neon `phase3-preview/neondb`, rồi mới duyệt provider-free API acceptance.

Safety: Production changes `0`; database writes `0`; Gemini/Resend calls `0/0`; deploy/push/commit `0/0/0`; cron/Public Beta không kích hoạt.
