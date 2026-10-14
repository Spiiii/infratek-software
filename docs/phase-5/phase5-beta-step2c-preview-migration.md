# Phase 5 — Step 2C Preview Migration

Ngày bắt đầu: 2026-10-12
Ngày tiếp tục và hoàn tất: 2026-10-13

Baseline: `31b0f42`

## Kết quả

**MIGRATION COMPLETED — CREDENTIAL SAFETY CLOSURE BLOCKED**

Ngày 2026-10-13, migration retention đã được áp dụng đúng một lần lên Neon Preview `phase3-preview/neondb`, trước khi Owner đính chính rằng password chỉ được reset trên checkpoint. Kết quả migration kỹ thuật vẫn hợp lệ, nhưng credential safety chưa đủ điều kiện để đóng Step 2C. Không có Production write, cleanup DELETE, Gemini call, Vercel change, deploy, push hoặc cron activation.

## Pre-check

| Kiểm tra | Kết quả |
|---|---|
| Git branch / HEAD | PASS — `codex/phase-5-chatbot-rag` / `31b0f42` |
| Existing untracked reports | PASS — giữ nguyên, không sửa/xóa |
| Neon project | PASS — `orange-wave-77862035` / `infratek-phase0-spike` |
| Preview branch | PASS — `phase3-preview`, `br-curly-cake-b3t2pno0`, state ready, non-default |
| Preview database | PASS — `neondb` thuộc đúng branch ID |
| Preview endpoint metadata | PASS — `ep-nameless-leaf-b3fc4hoi` thuộc đúng branch ID |
| Production isolation | PASS cho Preview target — Preview và Production có branch/endpoint riêng; Preview guard khớp endpoint được phép |
| Local env connections | PASS — pooled và direct keys tồn tại, process env không shadow; cả hai cùng Preview endpoint/database |
| Direct migration URL | PASS — direct/unpooled endpoint `ep-nameless-leaf-b3fc4hoi`, database `neondb` |
| Credential recovery | BLOCKED — chỉ role `neondb_owner` trên checkpoint `br-bold-cell-b3ttdyzv` đã reset; Preview và Production chưa reset |
| Migration target guard | PASS — test từ chối Production URL khi target là Preview |
| Migration history | PASS có lưu ý — bốn migration thật trong registry đã chạy; migration `20261012_090000_chat_lead_retention` chưa chạy. Có một row lịch sử `dev`, batch `-1`, không thuộc registry hiện tại. |

## Checkpoint

Neon snapshot trực tiếp không khả dụng vì API từ chối snapshot một non-root branch. Thay thế bằng child branch copy-on-write từ chính Preview:

- Name: `phase5-step2c-backup-20261012`
- Branch ID/reference: `br-bold-cell-b3ttdyzv`
- Parent: `br-curly-cake-b3t2pno0` (`phase3-preview`)
- Parent LSN: `0/2DDA430`
- Created: `2026-10-12T10:21:06Z`

Reference trên là restore source khả dụng: có thể kiểm tra branch checkpoint độc lập; nếu cần phục hồi, tạo/preview restore từ checkpoint rồi chỉ finalize/swap sau Owner approval. Không có restore nào được thực hiện trong lượt này.

Ngày 2026-10-13, checkpoint được xác minh lại bằng Neon MCP metadata read-only: branch tồn tại, state `ready`, đúng parent `br-curly-cake-b3t2pno0`; không lấy hoặc in connection URI.

## Lịch sử dừng an toàn ngày 2026-10-12

Lệnh tạo checkpoint của Neon CLI trả kèm connection URI/credential mới trong output JSON. Giá trị không được chép vào báo cáo này. Vì yêu cầu Step 2C cấm in credentials, đây là protection failure và quy trình phải dừng trước database migration.

Không chạy thêm Neon CLI metadata command vì công cụ có thể lặp lại việc trả connection URI. Credential đã xuất hiện trong tool output cần được Owner xử lý/rotate hoặc xác nhận phương án an toàn trước khi tiếp tục.

Đính chính ngày 2026-10-13: password được reset **chỉ trên checkpoint** `br-bold-cell-b3ttdyzv`; Preview `br-curly-cake-b3t2pno0` và Production chưa reset. Pre-check read-only sau đính chính xác nhận cả `DATABASE_URL` và `DATABASE_URL_PREVIEW_UNPOOLED` đang trỏ đúng endpoint Preview và kết nối thành công bằng credential hiện có của Preview. Kết quả này chứng minh đúng target và connectivity, nhưng **không** chứng minh credential Preview chưa từng bị lộ hoặc đã được rotate.

## Migration thực tế ngày 2026-10-13

- `.env.local`: có `DATABASE_URL` và `DATABASE_URL_PREVIEW_UNPOOLED`; process env không shadow.
- Direct URL: endpoint `ep-nameless-leaf-b3fc4hoi`, database `neondb`, direct/unpooled — PASS.
- Pooled URL: pooled endpoint của cùng Preview branch/database — PASS.
- Local read-only connection: PASS; transaction read-only và `current_database() = neondb`.
- Migration target guard: PASS, từ chối Production URL cho Preview target.
- Pre-status: bốn migration registry cũ `Ran: Yes`; chỉ `20261012_090000_chat_lead_retention` `Ran: No`.
- Lần gọi đầu tiên trong non-TTY dừng ở prompt xác nhận trước khi ghi; status ngay sau đó vẫn `Ran: No`.
- Lần thực thi có TTY là lần duy nhất thực sự chạy migration; Payload ghi nhận `Migrated` trong `274ms`.
- Post-status: `20261012_090000_chat_lead_retention`, batch `5`, `Ran: Yes`.
- Automatic retry: không.

Schema verification read-only:

- `chat_leads.expires_at`: tồn tại, `NOT NULL` — PASS.
- Default: `now() + interval '180 days'` — PASS.
- Index `chat_leads_expires_at_idx` trên `expires_at` — PASS.
- Migration record trong `payload_migrations` — PASS.

## Cleanup count-only dry-run

Chỉ chạy `SELECT count(*) WHERE expires_at <= now()`; không gọi cleanup entrypoint và không DELETE:

| Dataset | Candidate count |
|---|---:|
| Conversations | 0 |
| Feedback | 0 |
| Unanswered | 0 |
| Leads | 0 |

Cleanup DELETE: `0`.

## Vấn đề còn tồn tại

1. Guard source đang pin Production endpoint lịch sử `ep-still-fog-b3h6yj1y`, trong khi metadata hiện tại trả Production endpoint khác. Điều này vẫn fail-closed cho Preview nhưng phải cập nhật riêng trước bất kỳ Production migration nào; không sửa trong Step 2C.
2. Owner cần xác nhận phạm vi credential exposure của Preview/Production đã được xử lý, hoặc phê duyệt phương án rotate phù hợp. Cho tới khi đó không tiếp tục thao tác ghi liên quan Step 2C.
3. Cron retention chưa kích hoạt, đúng phạm vi Step 2C.
4. Public Beta và production ANSWER vẫn chưa mở.

## Safety accounting

- Gemini calls: `0`.
- Production writes: `0`.
- Preview writes: đúng một schema migration đã phê duyệt; cleanup data writes `0`.
- Cleanup DELETE: `0`.
- Vercel changes/deploy: `0/0`.
- Push/cron: `0/0`.
- Credentials printed trong resumed run: `0`.

## Trạng thái

**STEP 2C: MIGRATION VERIFIED, SAFETY CLOSURE BLOCKED — AWAITING OWNER CREDENTIAL DECISION.**

## Final Closure — 2026-10-14

### Git và cấu hình Preview

- Branch: `codex/phase-5-chatbot-rag` — PASS.
- HEAD: `31b0f42902068e242a6cb154f5fc52b7ff352cba` (baseline `31b0f42`) — PASS.
- Working tree: các thay đổi tracked/untracked có sẵn được giữ nguyên; không checkout, reset, stage hoặc commit.
- `.env.local`: có cả `DATABASE_URL` và `DATABASE_URL_PREVIEW_UNPOOLED`.
- `DATABASE_URL`: đúng endpoint pooled Preview `ep-nameless-leaf-b3fc4hoi`, database `neondb`; không trỏ Production — PASS.
- `DATABASE_URL_PREVIEW_UNPOOLED`: đúng endpoint direct/unpooled Preview `ep-nameless-leaf-b3fc4hoi`, database `neondb`; không trỏ Production — PASS.

### Xác minh sau credential rotation

| Kiểm tra | Kết quả |
|---|---|
| Preview pooled connection | **PASS** — transaction `READ ONLY`, database `neondb` |
| Preview direct connection | **PASS** — transaction `READ ONLY`, database `neondb` |
| Database identity qua kết nối hiện tại | **PASS** — đúng Preview `phase3-preview` / `br-curly-cake-b3t2pno0`, không phải Production |
| Migration batch 5 trong lượt closure | **PASS** — `20261012_090000_chat_lead_retention`, `Ran: Yes`, batch `5` |
| Retention schema/index trong lượt closure | **PASS** — `expires_at` `NOT NULL`, default 180 ngày và index đúng |

Owner xác nhận đã rotate password role `neondb_owner` trên checkpoint, Preview và Production. Lượt closure không lặp lại rotation và không kiểm tra credential cũ. Hai URL local vượt target guard, đúng loại pooled/direct và kết nối thành công bằng credential Preview hiện hành. Không ghi connection string, password hoặc lỗi chứa thông tin nhạy cảm.

### Kết luận kỹ thuật

Task A–D đều PASS. Không phát hiện sai target, credential exposure mới hoặc blocker bảo mật mới trong phạm vi Step 2C. Một lượt thử trong sandbox bị chặn ở lớp NETWORK; lượt kiểm tra thực tế được phép ngoài sandbox sau đó PASS, không retry trong script và không có database write.

### Deferred, không phải nguyên nhân blocker hiện tại

- Kiểm chứng Production old password bị từ chối.
- Production migration guard đang pin endpoint lịch sử.
- Vercel Preview environment/deployment.
- Cleanup endpoint acceptance và cron activation.
- Gemini generation/API acceptance, relevance policy, privacy/legal và Public Beta approval.

### Safety accounting

- Database writes/migrations/cleanup DELETE: `0/0/0`.
- Production changes: `0`.
- Gemini calls: `0`.
- Vercel/Neon configuration changes, deploy, push, cron activation: `0`.
- Secret disclosure: `0`.

**STEP 2C: CLOSED.**
