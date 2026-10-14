# Phase 5 — Offline risky-claim diagnosis

Ngày: 2026-10-12

Baseline: `dae0190`

Case: `chat-eval-lang-006`

Run: `p57-p53-lang006-rerun-live-20261012-a`

## Kết luận

**Root cause của live run: `INSUFFICIENT_EVIDENCE`.**

Artifact có SHA-256 đúng `1fe37f2c37e72c9de1a5a3d07ee44d70569405ebb5e7ad2deffcdf67e5602b71` và ghi nhận duy nhất `UNSUPPORTED_RISKY_CLAIM`. Rejected answer không được persist, vì vậy không thể xác định câu hoặc từ khóa thực tế đã kích hoạt validator, cũng không thể kết luận model đã hallucinate hay validator đã false-positive trong lần chạy đó.

Synthetic tests tái hiện được một false-positive mang tính thuật toán: risky claim diễn đạt lại cùng ý với context vẫn bị chặn nếu cả câu chuẩn hóa không xuất hiện nguyên văn. Đồng thời, từ khóa tiếng Việt không dấu không được nhận diện, tạo rủi ro false-negative riêng.

## Các rule kích hoạt risky claim

Validator tách answer thành câu theo `.`, `!`, `?` hoặc xuống dòng, bỏ citation rồi lowercase/NFC. Một câu chỉ đi vào nhánh risky khi chứa ít nhất một chuỗi trong danh sách:

`giá`, `chi phí`, `roi`, `lợi nhuận`, `tiết kiệm`, `kết quả`, `triển khai`, `cam kết`, `bảo đảm`, `đảm bảo`, `chắc chắn`.

- Nếu câu có số: mọi risky keyword phải xuất hiện đâu đó trong toàn context và mọi số đã chuẩn hóa phải có trong tập số của context.
- Nếu câu không có số: toàn bộ câu đã chuẩn hóa phải là substring nguyên văn của toàn context đã chuẩn hóa.
- Citation hợp lệ không cấp quyền cho claim; citation bị bỏ trước khi kiểm tra.
- Logic không xác minh quan hệ giữa keyword và số trong cùng đoạn nguồn, và không thực hiện semantic/paraphrase matching.
- Normalization risky claim giữ dấu tiếng Việt; `dam bao` không khớp `đảm bảo`.

## Synthetic test results

| Tình huống | Kết quả | Nhận định |
|---|---|---|
| Mô tả OCR thông thường, không risky keyword | `SUPPORTED` | Đúng kỳ vọng |
| Claim `độ chính xác 96%`, số có trong context | `SUPPORTED` | Number validator có evidence |
| `đảm bảo bảo mật` giống nguyên văn context | `SUPPORTED` | Đúng kỳ vọng |
| `đảm bảo bảo mật` diễn đạt lại từ context cùng ý | `UNSUPPORTED_RISKY_CLAIM` | False-positive tái hiện được ở mức synthetic |
| `kết quả xử lý nhanh hơn` giống nguyên văn context | `SUPPORTED` | Đúng kỳ vọng |
| `cam kết không bao giờ sai`, không có nguồn | `UNSUPPORTED_RISKY_CLAIM` | Claim thực sự không có nguồn, fail-closed đúng |
| `dam bao bao mat` không dấu, context không hỗ trợ | `SUPPORTED` | False-negative tái hiện được do keyword có dấu |
| Citation `[S1]` hợp lệ nhưng claim không có nguồn | `UNSUPPORTED_RISKY_CLAIM` | Fail-closed đúng |

### Phân loại evidence

- **False positive tái hiện được:** câu risky không số được nguồn hỗ trợ về ý nhưng không trùng nguyên văn toàn câu.
- **Claim thực sự không có nguồn:** commitment tuyệt đối và claim có citation nhưng nguồn không chứa nội dung đó đều bị chặn đúng.
- **Chưa đủ evidence:** không biết live answer thuộc nhóm nào vì artifact không lưu rejected output hoặc sanitized risky reason chi tiết.

## Đề xuất

**Giữ nguyên production validator trong hiện tại.** Không có đủ evidence để thay đổi rule an toàn dựa trên live run, còn việc chuyển từ exact sentence sang semantic/paraphrase matching sẽ thay đổi đáng kể protected-claim policy và không còn là sửa nhỏ có thể chứng minh bằng deterministic matcher.

Nếu Owner muốn cải thiện khả năng chẩn đoán ở bước sau, tối đa một thay đổi nhỏ nên được xem xét riêng: persist một enum lý do đã sanitize như `RISKY_KEYWORD_WITH_NUMBER` hoặc `RISKY_SENTENCE_NOT_VERBATIM`, không lưu answer, keyword hay nội dung nguồn. Thay đổi này không nới validation và cho phép phân biệt nhánh lỗi ở lần chạy tương lai; chưa triển khai trong checkpoint này.

## Điều kiện tiếp tục Beta Acceptance

- Không cần thêm provider call để hoàn tất chẩn đoán offline này.
- `chat-eval-lang-006` chưa thể được tính là generation PASS; hiện là fail-closed và semantic grounding `NOT_EVALUATED`.
- Trước Beta Acceptance, Owner cần chọn một trong hai hướng: chấp nhận false-refusal bảo thủ của risky validator cho Beta, hoặc phê duyệt một thay đổi evidence/validator riêng kèm regression tests và diagnostic budget mới.
- Production `CALIBRATION_REQUIRED`, threshold và toàn bộ policy khác giữ nguyên.

## Safety accounting

- Gemini calls: `0`.
- Neon calls: `0`.
- Live diagnostic/retrieval: không chạy.
- Source/validator/prompt/threshold/policy: không thay đổi.
- Push/deploy/public beta: không thực hiện.
