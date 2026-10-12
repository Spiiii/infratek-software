# Phase 5 — Proper-name validator fix

Ngày: 2026-10-12

Baseline: `576dd0e`

Phạm vi: sửa false positive của `UNSUPPORTED_PROPER_NAME`, provider-free.

## Thay đổi

- Giữ nguyên regex phát hiện proper-name candidate trong answer.
- Thay exact membership với tập candidate trích riêng từ context bằng kiểm tra cụm token liền nhau trên toàn bộ trusted Top 6 context.
- Canonicalize hai phía bằng Unicode NFD, bỏ combining marks, lowercase tiếng Việt, `đ → d`, chuẩn hóa dấu câu và khoảng trắng.
- Bắt buộc ranh giới token đầy đủ; không chấp nhận substring hoặc ghép token không liền nhau.
- Không thay đổi citation, grounding, protected number/phone/email/risky-claim, persistence, threshold hay production decision policy.

## Regression results

| Kiểm tra | Kết quả |
|---|---|
| `Core Banking` / `core banking` | PASS |
| `Giai Phap OCR` / `Giải Pháp OCR` | PASS |
| `Document AI` / `Document AI` | PASS |
| `Contoso Limited` vắng khỏi nguồn | FAIL CLOSED — PASS |
| Substring và token không liền nhau | FAIL CLOSED — PASS |
| Citation hợp lệ nhưng tên không có nguồn | FAIL CLOSED — PASS |
| Focused proper-name/output safety | 9/9 PASS |
| Generation evaluator | 19/19 PASS |
| Toàn bộ chat tests | 149/149 PASS |
| TypeScript typecheck | PASS |
| `git diff --check` | PASS |

Các test chat đã bao phủ NO_CONTEXT, protected numbers/contacts/claims, unsupported-output persistence và fail-closed; không có regression.

## Rủi ro còn lại

- Canonicalization chủ ý coi biến thể có dấu/không dấu là cùng cụm. Token-boundary đầy đủ giới hạn nguy cơ match nhầm nhưng không thay thế semantic grounding.
- Lần generation trước không lưu raw rejected output, nên bản sửa xử lý đúng false positive đã tái hiện chứ không chứng minh đó là nguyên nhân duy nhất của output lịch sử.
- Một tên thực sự không có trong context vẫn bị chặn; validator không dùng citation để hợp thức hóa tên vắng nguồn.

## Khả năng chạy lại `chat-eval-lang-006`

Source và tests đã sẵn sàng cho một single-case diagnostic mới. Việc chạy lại cần Owner phê duyệt riêng cho tối đa một Gemini generation call và một Neon Preview read-only hydration batch; checkpoint này không gọi provider hoặc database.

## Safety accounting

- Gemini calls: `0`.
- Neon calls: `0`.
- Retrieval/live diagnostic: không chạy.
- Push/deploy/public beta: không thực hiện.
