# Phase 5 — Step 2C Credential Safety Recovery

Ngày: 2026-10-12

Baseline: `31b0f42`

## Kết luận

Credential xuất hiện trong output là **PostgreSQL database-role password** của role `neondb_owner`, được nhúng trong connection URI trả về khi tạo checkpoint branch. Đây **không phải** Neon API key, Vercel token hay Gemini key.

Không credential nào được chép vào báo cáo này. Lượt recovery không gọi Neon CLI/API, không rotate, migrate, DELETE, deploy hoặc push.

## Phạm vi ảnh hưởng

| Đối tượng | Đánh giá |
|---|---|
| Checkpoint `br-bold-cell-b3ttdyzv` | **CONFIRMED affected** — credential được trả cùng connection data của branch này. |
| Preview `br-curly-cake-b3t2pno0` | **POTENTIALLY affected** — checkpoint sinh từ Preview; evidence sanitize không đủ để chứng minh password được tách riêng. |
| Production `br-odd-paper-b3didfwk` | **UNCONFIRMED / treat as potentially affected** — role cùng tên có thể tồn tại trên các branch; không kiểm tra bằng credential đã lộ. |
| Neon control-plane/API | **Not affected by this evidence** — Neon API credential không xuất hiện trong connection URI. |

Neon cung cấp reset-password endpoint theo `project_id + branch_id + role_name`, nên rotation có thể nhắm đúng role trên một branch. Tuy nhiên tài liệu branching cũng cho thấy credential inheritance/isolation phụ thuộc cách branch và protected parent được cấu hình. Production và Preview hiện không được chứng minh là protected tại thời điểm checkpoint được tạo; vì vậy không được tự kết luận blast radius chỉ là checkpoint.

Runtime phụ thuộc có thể gồm:

- checkpoint: hiện không có runtime/Vercel deployment nào được cấu hình dùng branch này;
- Preview: local `DATABASE_URL`, `DATABASE_URL_PREVIEW_UNPOOLED` và Vercel Preview `DATABASE_URL` nếu password thực tế trùng;
- Production: `DATABASE_URL_PRODUCTION_UNPOOLED` và Vercel Production `DATABASE_URL` chỉ cần cập nhật nếu Owner xác nhận credential dùng chung hoặc chọn rotate Production phòng ngừa.

## Credential đã lưu ở đâu

- **Confirmed:** Codex tool-call output/conversation transcript của lệnh tạo branch.
- **Possible:** service-side execution/audit telemetry và terminal-output capture do nền tảng giữ lại.
- **Not written by the command:** repository, `.env.local`, Git index/commit hoặc PowerShell command history. Command line không chứa password và không redirect output vào file.
- Không quét/search theo secret vì hành động đó sẽ tái xử lý hoặc có nguy cơ in credential.

## Rotation/revocation an toàn

Thứ tự ưu tiên, cần Owner thực hiện hoặc phê duyệt riêng:

1. Trong Neon Console, chọn checkpoint branch `br-bold-cell-b3ttdyzv`, role `neondb_owner`, reset password. Không copy password vào chat/log.
2. Nếu checkpoint không còn cần thiết, phương án thu hẹp nhất là tạo restore point thay thế bằng workflow có redaction rồi xóa checkpoint cũ; việc xóa cần approval riêng.
3. Xác minh qua Neon Console liệu role password được branch-isolated. Nếu không chứng minh được, reset `neondb_owner` lần lượt trên Preview và Production trong maintenance windows riêng.
4. Sau mỗi reset, cập nhật đúng nơi tiêu thụ credential bằng secret UI/stdin, không command-line argument:
   - checkpoint: thường không có env consumer;
   - Preview: local migration secret và Vercel Preview database env;
   - Production: chỉ trong maintenance window riêng nếu bị ảnh hưởng.
5. Redeploy/reconnect đúng environment sau khi cập nhật, rồi xác minh old credential bị từ chối bằng công cụ bảo mật do Owner kiểm soát. Không in old/new value.

API reset-password trả password mới trong response, nên không được gọi trực tiếp bằng tool có raw output. Ưu tiên Neon Console hoặc một wrapper chạy cục bộ có sink trực tiếp vào secret store và chỉ in `ROTATED/PRESENT`, tuyệt đối không in response body.

## Phương án tiếp tục migration không lộ secret

1. Owner hoàn tất rotation và cập nhật `.env.local`/secret store thủ công; chỉ xác nhận key `DATABASE_URL_PREVIEW_UNPOOLED` tồn tại.
2. Xác minh target bằng script local chỉ parse nội bộ và in các field không nhạy cảm: endpoint ID, database name, `direct: true`; không in URL, username hoặc password.
3. Xác minh checkpoint bằng một trong hai cách:
   - Neon Console: branch ID/name/parent/state, không mở Connect dialog;
   - REST/SDK wrapper read-only gọi branch metadata, allowlist output chỉ `id`, `name`, `parent_id`, `current_state`. Không dùng branch-create response hoặc connection-string command.
4. Chạy `npm run payload:migrate:status:preview` và `payload:migrate:preview` với URL lấy từ env process. Migration script hiện tự kiểm tra Preview endpoint trước khi spawn Payload.
5. Post-migration verification dùng local `pg` query với credential từ env; output allowlist chỉ database/schema/default/index/counts. Không gọi `neon connection-string` và không echo env.
6. Cleanup vẫn count-only; không gọi retention endpoint và không DELETE trong Step 2C.

## Công cụ/output safety

- An toàn: Neon Console metadata, branch-list/get API qua wrapper allowlist, migration target guard, local `pg` với process env và sanitized SELECT output.
- Không an toàn trong workflow hiện tại: raw `neon branches create --output json`, raw connection-string output, reset-password API response, hoặc bất kỳ lệnh nào trả `connection_uris` / `connection_parameters` trực tiếp vào tool log.
- Checkpoint hiện tại vẫn là reference `br-bold-cell-b3ttdyzv`; không gọi lại CLI để verify trong lượt này.

## Điều kiện mở lại Step 2C

1. Owner xác nhận password checkpoint đã reset hoặc checkpoint cũ đã được thay thế/revoke.
2. Owner xác nhận phạm vi Preview/Production sau kiểm tra branch-role isolation; các environment bị ảnh hưởng đã được cập nhật.
3. Có phương thức metadata allowlist/redaction và `DATABASE_URL_PREVIEW_UNPOOLED` được cung cấp qua env, không qua tool output.
4. Chạy lại từ migration-status pre-check; migration cũ vẫn phải complete và migration lead-retention phải là registry migration duy nhất pending.

## Trạng thái

**RECOVERY PLAN READY — ROTATION/REVOCATION REQUIRES OWNER ACTION OR SEPARATE APPROVAL.**
