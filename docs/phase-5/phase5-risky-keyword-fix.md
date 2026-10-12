# Phase 5 — Minimal risky keyword fix

Ngày: 2026-10-12

Baseline: `dae0190`

## Thay đổi

- Canonicalize answer, context và risky keywords bằng Unicode NFD, lowercase, bỏ dấu tiếng Việt và `đ → d`.
- Nhận diện keyword theo cụm token đầy đủ; substring bên trong một token không kích hoạt nhầm.
- Giữ nguyên danh sách risky keywords và cơ chế evidence hiện có: claim có số vẫn kiểm tra keyword/số trong context; claim không số vẫn yêu cầu toàn câu canonical xuất hiện liền nhau trong context.
- Không thêm semantic/paraphrase matching. False-refusal bảo thủ cho paraphrase không trùng nguyên văn vẫn giữ nguyên.
- Không thay đổi citation, grounding, protected numbers/names/contacts, persistence, prompt, retrieval, threshold hoặc production decision policy.

## Regression results

| Kiểm tra | Kết quả |
|---|---|
| `đảm bảo` và `dam bao` | PASS |
| `cam kết` và `cam ket` | PASS |
| Keyword có dấu/không dấu, claim không nguồn | FAIL CLOSED — PASS |
| Keyword chỉ là substring của token khác | Không kích hoạt — PASS |
| Citation hợp lệ nhưng claim không nguồn | FAIL CLOSED — PASS |
| Protected numbers/proper names/contacts | PASS |
| Persistence và unsupported-output fail-closed | PASS |
| Toàn bộ chat tests | 152/152 PASS |
| Generation evaluator | 19/19 PASS |
| TypeScript typecheck | PASS |
| `git diff --check` | PASS |

## Rủi ro còn lại

- Validator vẫn cố ý bảo thủ: risky claim không số phải khớp toàn câu canonical trong context; paraphrase cùng ý vẫn có thể bị từ chối.
- Canonicalization có dấu/không dấu chỉ sửa nhận diện lexical, không chứng minh semantic grounding.
- Cần Owner phê duyệt provider budget riêng nếu muốn chạy lại `chat-eval-lang-006`; checkpoint này không chạy live diagnostic.

## Safety accounting

- Gemini/Neon calls: `0/0`.
- Live diagnostic/retrieval: không chạy.
- Push/deploy/public beta: không thực hiện.
