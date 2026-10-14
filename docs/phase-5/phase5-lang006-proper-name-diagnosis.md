# Phase 5 — Chẩn đoán `UNSUPPORTED_PROPER_NAME`

Ngày kiểm tra: 2026-10-12<br>
Case: `chat-eval-lang-006`<br>
Baseline: `576dd0e`
Provider/Neon calls: `0 / 0`

## Kết luận

**Phân loại: `INSUFFICIENT_EVIDENCE`.**

Artifact có SHA-256 đúng `f29e87b154e177fec1c5edda0db6791ac1ccdd3aaed82065ac9e8b585af20bb2` và ghi nhận generation p5.3 đã fail-closed với duy nhất category `UNSUPPORTED_PROPER_NAME`. Tuy nhiên evidence cố ý không lưu raw rejected output, câu trả lời đã bị từ chối, danh sách citation đã chọn, hoặc tên riêng cụ thể. Vì vậy không thể kết luận tên nào bị chặn, tên đó là hallucination hay tên đã có trong nguồn.

`UNSUPPORTED_PROPER_NAME` chứng minh rằng output tạm thời đã chứa ít nhất một chuỗi khớp regex tên riêng và chuỗi chuẩn hóa đó không có trong tập tên riêng được regex trích xuất từ trusted context. Nó không chứng minh chuỗi đó vắng mặt về mặt ngữ nghĩa hoặc vắng mặt dưới biến thể chữ hoa/dấu khác.

## Bằng chứng artifact

- Run: `p57-p53-lang006-diagnostic-20261012`.
- Retrieval source: run p5.2 đã được cho phép tương thích rõ ràng với generation prompt p5.3.
- Trạng thái: `FAILURE` / `SAFE_FALLBACK`; error category `UNSUPPORTED_OUTPUT`.
- Protected-output category: chỉ `UNSUPPORTED_PROPER_NAME`.
- Physical generation calls: `1`; latency khoảng `1742.9 ms`.
- Top 6 vẫn có manifest URL/hash hợp lệ, gồm case OCR và bài blog OCR; artifact không lưu nội dung chunk.
- `sanitizedModelOutput`, `citationValidation`, `groundingReason` và `actualDecision` đều không có. Đây là hành vi bảo mật mong đợi, không phải evidence thất lạc cần khôi phục.

## Validator đang quyết định như thế nào

Validator không kiểm tra tên riêng theo citation được model chọn. Nó:

1. Dùng regex yêu cầu ít nhất hai token liên tiếp bắt đầu bằng chữ hoa (hoặc token số) để trích tên riêng độc lập từ toàn bộ answer và toàn bộ Top 6 context.
2. Chuẩn hóa NFC, chuyển chữ thường, bỏ citation/dấu câu và co khoảng trắng.
3. So sánh **exact set membership** giữa các cụm do regex trích xuất; bất kỳ cụm trong answer không có trong tập context sẽ fail-closed.

Hệ quả: context có chứa cùng chữ nhưng viết thường vẫn không được đưa vào tập tên riêng; NFC/lowercase cũng không đồng nhất chữ có dấu với không dấu. Citation hợp lệ không thay đổi phép so sánh này.

## Kiểm tra đặc thù OCR tiếng Việt không dấu

Kiểm tra provider-free với validator hiện tại cho kết quả:

| Answer / context tổng quát | Kết quả |
|---|---|
| `Core Banking` / `core banking` | `SAFE_FALLBACK: UNSUPPORTED_PROPER_NAME` |
| `Giai Phap OCR` / `Giải Pháp OCR` | `SAFE_FALLBACK: UNSUPPORTED_PROPER_NAME` |
| `Document AI` / `Document AI` | `SUPPORTED` |
| `Contoso Limited` / không có tên này | `SAFE_FALLBACK: UNSUPPORTED_PROPER_NAME` |

Như vậy cơ chế hiện tại **có rủi ro false positive đã tái hiện được** do chữ hoa/thường và dấu tiếng Việt. Nhưng không có raw output nên chưa thể chứng minh chính một trong hai cơ chế này đã gây lỗi của lần chạy `lang-006`; model hallucination vẫn là khả năng chưa loại trừ.

## Một phương án sửa tối thiểu đề xuất

Giữ regex nhận diện candidate và hành vi fail-closed, nhưng thay việc so candidate với “tập tên riêng do regex trích từ context” bằng phép kiểm tra **cụm token đầy đủ** trong trusted context đã canonicalize hai phía giống nhau: lowercase, bỏ dấu tiếng Việt (`đ` → `d`), chuẩn hóa dấu câu/khoảng trắng, và bắt buộc ranh giới token chính xác.

Phương án này không tự thêm citation, không bỏ protected-output validation và không cho qua tên vắng khỏi nguồn; nó chỉ coi biến thể viết hoa/có dấu-không dấu của cùng một cụm là cùng evidence. Chưa áp dụng trong checkpoint này.

## Focused regression tests cần bổ sung

- Cùng cụm tên trong context nhưng khác chữ hoa/thường phải được chấp nhận.
- Cùng cụm tiếng Việt có dấu/không dấu phải được chấp nhận.
- Tên thật sự không xuất hiện (`Contoso Limited`) vẫn phải fail-closed.
- Không cho phép substring hoặc ghép token gần giống vượt qua ranh giới cụm.
- Tên được hỗ trợ chính xác như `Document AI` vẫn pass.
- Citation hợp lệ không thể làm tên không được nguồn hỗ trợ trở thành hợp lệ.
- `NO_CONTEXT`, protected number/contact/risky-claim và persistence fail-closed không đổi.

## Có cần thêm provider call không?

**Không cần** để hoàn tất chẩn đoán hiện tại hoặc chứng minh rủi ro validator. Chỉ cần một provider call riêng sau khi Owner phê duyệt và triển khai bản sửa nếu muốn xác nhận hành vi end-to-end của `chat-eval-lang-006`; lần gọi đó không thuộc phạm vi công việc này.
