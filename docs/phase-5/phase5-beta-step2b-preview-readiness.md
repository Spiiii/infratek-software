# Phase 5 — Step 2B Preview Readiness

Ngày: 2026-10-12

Baseline: `31b0f42`

Trạng thái: **READY FOR OWNER-APPROVED PREVIEW OPERATIONS**. Step 2B chỉ lập kế hoạch; chưa đọc secret, gọi cloud, migrate, cleanup, deploy hoặc mở Beta.

## 1. Preview prerequisites

| Gate | Yêu cầu |
|---|---|
| Git | Branch `codex/phase-5-chatbot-rag`, commit được Owner chọn từ `31b0f42` trở đi; tracked tree sạch trước deploy. |
| Neon identity | Project `orange-wave-77862035` / `infratek-phase0-spike`; branch `phase3-preview` (`br-curly-cake-b3t2pno0`); database `neondb`. |
| Endpoint guard | Preview direct endpoint phải map tới `ep-nameless-leaf-b3fc4hoi`; Production endpoint `ep-still-fog-b3h6yj1y` phải bị từ chối. Xác minh mapping bằng Neon branch/endpoint metadata, không chỉ nhìn hostname. |
| Connections | Runtime `DATABASE_URL` dùng pooled Preview URL; migration dùng riêng `DATABASE_URL_PREVIEW_UNPOOLED` direct URL. Không đặt Production URL dưới tên biến Preview. |
| Schema order | Chạy tuần tự 5 migration trong registry; migration mới `20261012_090000_chat_lead_retention` chỉ chạy sau `20261002_090000_phase5_chatbot_foundation`, vì phụ thuộc bảng `chat_leads`. |
| Runtime gate | `THRESHOLD_VERSION=UN-CALIBRATED`; production runtime vẫn `CALIBRATION_REQUIRED`. Candidate policy không được dùng để mở ANSWER trong Step 2B. |
| Protection | Preview Deployment Protection giữ nguyên; chỉ dùng cơ chế truy cập đã được Owner duyệt cho acceptance test. |

Neon branches có connection string riêng và cô lập dữ liệu. Việc migrate phải dùng direct connection; pooled connection chỉ dành cho application traffic. Vercel Cron gọi Production deployment, vì vậy `config/vercel-cron.preview.example.json` tuyệt đối chưa được đổi thành `vercel.json`.

## 2. Migration và cleanup execution plan

### Trước migration — read-only

1. Owner phê duyệt một Preview maintenance window và checkpoint/restore point của `phase3-preview`.
2. Dùng Neon metadata xác nhận project, branch ID, endpoint ID và database; sau đó chạy `npm run payload:migrate:status:preview`. Guard hiện tại kiểm tra endpoint thật trong URL và phải từ chối Production endpoint.
3. Kiểm tra migration registry: bốn migration cũ đã `Ran: Yes`; migration `20261012_090000_chat_lead_retention` đang pending. Nếu trạng thái khác, dừng.
4. Ghi counts trước thay đổi; không log connection string hoặc credentials.

### Migration — cần Owner approval riêng

Chỉ sau các gate trên mới chạy `npm run payload:migrate:preview`. Không set `CONFIRM_PRODUCTION_MIGRATION`; không dùng pooled URL. Step 2B hiện **không chạy lệnh này**.

Verification queries dự kiến, chạy trên `phase3-preview/neondb`:

```sql
SELECT current_database();

SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_leads'
  AND column_name = 'expires_at';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'chat_leads'
  AND indexname = 'chat_leads_expires_at_idx';

SELECT
  (SELECT count(*) FROM chat_conversations WHERE expires_at <= now()) AS conversations,
  (SELECT count(*) FROM chat_feedback WHERE expires_at <= now()) AS feedback,
  (SELECT count(*) FROM chat_unanswered WHERE expires_at <= now()) AS unanswered,
  (SELECT count(*) FROM chat_leads WHERE expires_at <= now()) AS leads;
```

Các câu trên chỉ xác minh schema và đếm rows đủ điều kiện; đây là cleanup dry-run. Không dùng `DELETE ... ROLLBACK` trong pre-check.

### Cleanup và rollback

- Sau migration, gọi endpoint Preview bằng `Authorization: Bearer <CRON_SECRET>` chỉ khi Owner phê duyệt thao tác DELETE; ghi status và exact counts, không ghi secret.
- Chưa kích hoạt daily cron. Vercel Cron chỉ chạy trên Production, nên Preview acceptance dùng một request thủ công có xác thực.
- Nếu migration lỗi trước cleanup: xem migration status; rollback schema bằng migration down chỉ khi trạng thái và transaction cho phép.
- Nếu cleanup đã xóa dữ liệu sai: migration down **không khôi phục rows**. Khôi phục `phase3-preview` từ checkpoint/branch snapshot đã tạo trước thao tác, rồi xác minh lại branch/database/schema.
- Không chạy rollback hay restore tự động; mọi thao tác này cần Owner approval vì thay đổi database.

## 3. Vercel Preview environment checklist

Chỉ kiểm tra tên biến, scope và consistency; không xuất value.

| Nhóm | Preview configuration bắt buộc |
|---|---|
| Database | `DATABASE_URL` → pooled endpoint của `phase3-preview/neondb`; không Production. Migration direct URL không cần nằm trong Vercel runtime. |
| Payload/content | `PAYLOAD_SECRET`, `PAYLOAD_PREVIEW_SECRET`, `CONTENT_SOURCE=payload`, Blob token Preview nếu media được dùng. |
| Gemini | API key present; `CHAT_MODEL=gemini-3.5-flash-lite`; `CHAT_MODEL_VERSION=gemini-3.5-flash-lite-p5.1`; `PROMPT_VERSION=p5.3`. Không gọi provider trong Step 2B. |
| Retrieval | `EMBED_MODEL/GEMINI_EMBED_MODEL=gemini-embedding-2`; dimension `768`; `EMBED_VERSION=gemini-embedding-2-768-p5.3`; `INGESTION_VERSION=p5.3-v1`; `THRESHOLD_VERSION=UN-CALIBRATED`. |
| Public caps | `CHAT_PER_MINUTE=6`, IP daily `10`, session `15`, global daily `20`; không dùng source defaults cao hơn. |
| Security | Session signing secret, IP HMAC secret, Turnstile secret + public site key, Upstash URL/token đều present và scoped Preview. |
| Retention | `CRON_SECRET` riêng, đủ mạnh, Preview scope cho manual acceptance; không thêm active cron config. Retention durations vẫn là conversations 30, feedback/unanswered 90, leads 180 ngày. |
| Lead/contact | Resend key và recipient Preview nếu acceptance bao gồm lead notification; database-first behavior giữ nguyên. |
| Protection | Vercel Authentication/Deployment Protection và automation exception theo quy trình acceptance; không để exception mở sau test. |

## 4. Preview–Production isolation checks

1. Đối chiếu Vercel environment scope: mọi database/provider/security secret của candidate thuộc Preview; không sửa Production values.
2. Đối chiếu Neon metadata: `phase3-preview` branch ID và endpoint phải khác `production`; `current_database()` phải là `neondb`.
3. Migration chỉ dùng script `--target=preview`; guard phải PASS cho Preview endpoint và FAIL khi đưa Production endpoint vào biến Preview.
4. Preview deploy chỉ từ branch candidate; không promote, alias Production hoặc merge trong Step 2B.
5. Production `CONTENT_SOURCE` và `CALIBRATION_REQUIRED` không thay đổi. Candidate policy chưa được nối runtime ở cả hai môi trường.
6. Không cài cron: theo Vercel, cron định nghĩa trong `vercel.json` gọi Production URL và gửi `CRON_SECRET` qua Authorization header; file example hiện không được Vercel kích hoạt.

## 5. Thứ tự triển khai Preview candidate

1. Owner duyệt migration Preview, checkpoint/restore plan và quyền manual cleanup.
2. Xác minh Neon metadata + migration target guard + migration status.
3. Tạo checkpoint; chạy migration Preview bằng direct URL; chạy verification queries.
4. Thiết lập/audit Vercel Preview env checklist, giữ `UN-CALIBRATED` và low caps.
5. Push/deploy candidate sau phê duyệt riêng; xác minh Preview deployment dùng đúng branch/commit và pooled Preview DB.
6. Chạy health/schema/API acceptance không provider trước; sau đó mới xin ngân sách live Gemini/API smoke riêng.
7. Nếu được duyệt, đếm cleanup candidates rồi gọi cleanup Preview đúng một lần; cron vẫn inactive.
8. Đóng mọi protection exception, lưu evidence và trình Owner quyết định Beta Acceptance. Không tự mở Public Beta.

## 6. Owner approvals cần có

- Tạo checkpoint và chạy migration trên `phase3-preview`.
- Chạy authenticated cleanup DELETE một lần trên Preview hoặc hoãn nếu counts bằng 0.
- Thiết lập/chỉnh Vercel Preview env và deploy commit candidate.
- Ngân sách Gemini/API smoke sau khi provider-free acceptance PASS.
- Privacy/legal Gemini Free, relevance policy activation và quyết định mở Beta vẫn là các gate riêng; Step 2B không cấp các quyền này.

## Bước tiếp theo ngắn nhất

Owner phê duyệt **chỉ migration Preview + checkpoint**. Sau đó thực hiện metadata pre-check, `migrate:status:preview`, checkpoint, migration và bốn verification queries; dừng báo cáo trước khi deploy hoặc cleanup.

## Safety accounting

- Gemini/Neon/Vercel calls: `0/0/0`.
- Migration/DELETE/cron/deploy/push: `0/0/0/0/0`.
- Secrets read or printed: `NO`.
- Production ANSWER/Public Beta: `DISABLED`.
