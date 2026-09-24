# Open items

Các mục dưới đây không thuộc phạm vi Giai đoạn 2 và không được xem là đã xử lý.

| Mục | Trạng thái | Gate | Hướng xử lý |
|---|---|---|---|
| Xoay mật khẩu Neon database | Mở | Trước Giai đoạn 4 | Tạo credential mới, cập nhật môi trường, xác minh kết nối rồi thu hồi credential cũ. |
| Thay Neon MCP key account-wide | Mở | Trước Giai đoạn 4 | Dùng key giới hạn theo project và thu hồi key có phạm vi toàn tài khoản. |
| SMTP `550 5.7.1` khi gửi form liên hệ | Deferred | Trước khi vận hành thật | Xác minh subdomain gửi riêng hoặc phối hợp nhà cung cấp email cho phép Resend/Amazon SES; kiểm thử lại đến trạng thái `Delivered`. |

## Ghi chú tài liệu

- Bản `DE_XUAT_PHUONG_AN_NANG_CAP_WEBSITE.md` hiện có trong repository có thể thiếu nội dung so với bản v4 đã review.
- Import và đối chiếu lại bản v4 đầy đủ trước khi bắt đầu Giai đoạn 3.
