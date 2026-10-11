# Phase 5 — Structured citation fix

Ngày: 2026-10-12  
Baseline: `6baf353`  
Trạng thái: PASS ở mức implementation và provider-free verification

## Thay đổi source

- Gemini generation dùng `responseMimeType: application/json` và JSON schema tối thiểu gồm `status`, `answer`, `citations`.
- `ANSWER` bắt buộc có nội dung và ít nhất một nhãn duy nhất trong `S1`–`S6`; `NO_CONTEXT` bắt buộc có `answer: ""` và `citations: []`.
- Backend xác minh từng nhãn thuộc đúng hydrated Top 6. Nhãn không tồn tại bị fail closed với `CITATION_MISMATCH`.
- Model không được đặt citation trong `answer`; mọi dạng `[S1]`, `[s1]` hoặc `S1` trong nội dung bị từ chối với `MALFORMED_CITATION`.
- Chỉ sau khi schema và nhãn hợp lệ, backend render citation chuẩn `[S1]`–`[S6]`, rồi tiếp tục chạy citation validator và protected-output validator hiện có.
- Output sai schema, thiếu nguồn, nguồn giả hoặc claim được bảo vệ không có căn cứ đều fallback; câu trả lời không hợp lệ không được persist.
- Production decision policy vẫn là `CALIBRATION_REQUIRED`; threshold vẫn `UN-CALIBRATED`.

## Version

- Prompt/generation contract: `p5.2` → `p5.3`.
- Model, embedding, ingestion và threshold version không đổi.
- Historical retrieval/generation artifacts `p5.2` không bị sửa hoặc relabel.

## Compatibility với retrieval artifact p5.2

Artifact `p5.2` vẫn giữ nguyên để audit lịch sử nhưng không tương thích với generation evaluator `p5.3`: version guard hiện tại chủ động từ chối prompt-version mismatch. Không có bypass hoặc silent acceptance.

Để chạy diagnostic mới cho `chat-eval-lang-006`, cần Owner phê duyệt tạo retrieval evidence `p5.3` hợp lệ (không relabel artifact cũ), sau đó mới phê duyệt riêng tối đa một generation call.

## Focused tests

- `npm run test:chat`: PASS, 146/146.
- `node --test --experimental-strip-types evals/generation-runner.test.ts`: PASS, 14/14.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

Các regression chính đã kiểm tra: OCR tiếng Việt không dấu; valid `ANSWER`; valid `NO_CONTEXT`; thiếu/không tồn tại source label; citation giả trong `answer`; malformed schema; protected claim; prompt injection; persistence fail-closed; version mismatch với artifact `p5.2`.

## Kế hoạch single-case diagnostic cho `chat-eval-lang-006` — chưa chạy

1. Tạo một retrieval artifact mới mang prompt version `p5.3`, đúng Preview target và giữ nguyên retrieval pipeline/version còn lại.
2. Xác minh SHA-256, source manifest/Top 6, version guards và output path ngoài repository.
3. Sau phê duyệt riêng, chạy đúng một generation call cho `chat-eval-lang-006`, không retry, không embedding/retrieval rerun trong lượt generation.
4. Đánh giá structured schema, citation labels, canonical rendering, protected claims, grounding và fail-closed evidence.

## Rủi ro còn lại

- Provider compliance với structured schema chưa được kiểm chứng live trong checkpoint này.
- Structured output loại bỏ lỗi định dạng citation khỏi nội dung tự do, nhưng không tự chứng minh claim được nguồn hỗ trợ; validation và semantic review vẫn bắt buộc.
- Một retrieval run/artifact `p5.3` mới sẽ tiêu thụ provider budget và cần Owner phê duyệt riêng.

## Safety accounting

- Gemini generation/embedding calls: `0/0`.
- Neon reads/writes: `0/0`.
- Live retrieval/generation: không chạy.
- Deploy/push: không thực hiện.
