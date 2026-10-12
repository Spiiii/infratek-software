# Phase 5 — Beta Step 2A Implementation

Ngày: 2026-10-12

Baseline: `9269676`

Branch: `codex/phase-5-chatbot-rag`

## 1. Kết quả triển khai

### Relevance policy candidate

- Thêm policy version `retrieval-vector-risk-gate-p5.3-candidate-v1`.
- Candidate chỉ trả `ANSWER` khi retrieval là `HYBRID`, có candidates, có vector evidence hợp lệ và max vector similarity `>= 0.722924077393`.
- Boundary gate xác định deterministic, không dùng LLM, cho ba nhóm: so sánh tối thượng/chủ quan, đánh giá đủ/phù hợp cho hoàn cảnh riêng và cam kết thời gian đạt hiệu quả.
- RRF chỉ tiếp tục là ranking evidence, không được dùng như confidence.
- Candidate policy không được import vào production route/runtime. Production vẫn dùng `PreCalibrationDecisionPolicy`, `THRESHOLD_VERSION=UN-CALIBRATED` và trả `CALIBRATION_REQUIRED`; security/injection/protected-output validators không thay đổi.

Offline replay artifact `p57-beta-p52-retrieval-120-20261011-a`:

| Điều kiện | Kết quả |
|---|---:|
| Artifact | `COMPLETED` |
| Case | 120/120 unique |
| TP / FP / TN / FN | `55 / 0 / 55 / 10` |

Ba false ANSWER trước đây (`bnd-004`, `bnd-006`, `bnd-010`) được boundary gate chặn. Mười false refusal còn lại giữ nguyên theo hướng bảo thủ: `ans-009`, `ans-014`, `ans-018`, `ans-030`, `ans-035`, `ans-036`, `lang-008`, `bnd-001`, `bnd-007`, `bnd-009`. Đây là replay trên tập calibration hiện tại, chưa phải production approval.

### Retention infrastructure

- Migration mới thêm `chat_leads.expires_at`, default 180 ngày và index `chat_leads_expires_at_idx`; `down` drop index/column. Migration chỉ được đăng ký, **không chạy**.
- Atomic cleanup hiện xóa rows hết hạn theo cùng một mốc thời gian cho conversations 30 ngày, feedback/unanswered 90 ngày và leads 180 ngày, đồng thời trả exact counts.
- Internal endpoint `GET /api/internal/chat-retention` yêu cầu `Authorization: Bearer <CRON_SECRET>`, so sánh constant-time, fail closed `401/503` và không trả chi tiết lỗi.
- Thêm `CRON_SECRET` vào template. `config/vercel-cron.preview.example.json` chỉ là cấu hình mẫu không được Vercel tự nhận; cron Production chưa được kích hoạt.
- Không migration, không `DELETE`, không database/provider/cloud call trong Step 2A.

## 2. Kiểm thử

| Check | Kết quả |
|---|---|
| Dataset validator | PASS — 120/120 VERIFIED, `UN-CALIBRATED` |
| Artifact candidate replay | PASS — `55/0/55/10` |
| Chat tests | PASS — 161/161 |
| Generation evaluator | PASS — 19/19 |
| Typecheck | PASS |
| ESLint | PASS với 1 warning `<img>` tồn tại trước phạm vi Step 2A, 0 error |
| `git diff --check` | PASS; chỉ có cảnh báo line-ending của Git |

Coverage mới gồm cutoff/HYBRID guards, ba boundary risks, production isolation, authorization, expiry boundary `<=`, exact cleanup counts, sanitized failure và migration reversibility/180-day index.

## 3. Migration safety review

- Forward migration chỉ thêm một cột non-null có default 180 ngày và một index; không xóa/cập nhật dữ liệu.
- Existing lead rows nhận expiry tại thời điểm migration; không có cleanup nào tự chạy sau migrate.
- Rollback rõ ràng nhưng làm mất metadata expiry của lead, nên chỉ dùng theo quy trình rollback đã duyệt.
- Trước Preview migration cần backup/branch checkpoint và `migrate:status`; sau migrate cần kiểm tra column/default/index. Production migration chưa được phép.
- Cleanup là thao tác destructive và chỉ được chạy sau migration, trên đúng Preview target, bằng secret server-only đã cấu hình.

## 4. Owner approval còn thiếu

1. Duyệt policy candidate, mức false refusal `10/65` và quyết định thời điểm thay `CALIBRATION_REQUIRED`; Step 2A chưa bật ANSWER.
2. Duyệt chạy migration lead-retention trên Neon `phase3-preview/neondb`; chưa có quyền chạy trên Production.
3. Duyệt cấu hình `CRON_SECRET` và một lần gọi cleanup Preview có kiểm soát; daily cron chỉ được đưa vào `vercel.json` khi Owner cho phép Production activation.
4. Privacy/legal cho Gemini Free, Preview environment audit, generation acceptance và quyết định mở Public Beta vẫn còn nguyên.

## 5. Safety accounting

- Gemini calls: `0`.
- Neon reads/writes: `0/0`.
- Migration/DELETE: `0/0`.
- Prompt, retrieval pipeline và production decision policy: không thay đổi.
- Push/deploy/Public Beta: không thực hiện.

## Trạng thái

**STEP 2A OFFLINE IMPLEMENTATION: PASS — AWAITING OWNER APPROVAL FOR PREVIEW OPERATIONS AND PRODUCTION POLICY.**
