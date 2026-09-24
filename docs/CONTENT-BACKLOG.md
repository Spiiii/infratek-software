# Content backlog

Danh sách nội dung đang dùng placeholder hoặc chưa có dữ liệu nguồn. Đây là backlog nội dung, tách biệt với technical debt trong `docs/OPEN-ITEMS.md`.

## Bốn trang giải pháp

Áp dụng cho:

- `/solutions/ai-consulting`;
- `/solutions/software-development`;
- `/solutions/it-outsourcing`;
- `/solutions/digital-transformation`.

| Nội dung cần viết | Trạng thái hiện tại | Gate đề xuất |
|---|---|---|
| Sản phẩm bàn giao cụ thể | Placeholder “Đang cập nhật — liên hệ để biết thêm chi tiết.” | Thiết kế field tương ứng trong Giai đoạn 3; hoàn thiện trước khi vận hành thật. |
| Đối tượng phù hợp và chưa phù hợp | Placeholder “Đang cập nhật — liên hệ để biết thêm chi tiết.” | Thiết kế field tương ứng trong Giai đoạn 3; hoàn thiện trước khi vận hành thật. |
| Thời gian triển khai và mức đầu tư sơ bộ | Placeholder “Đang cập nhật — liên hệ để biết thêm chi tiết.” | Thiết kế field tương ứng trong Giai đoạn 3; không công bố số liệu khi chưa được duyệt. |
| FAQ | Placeholder “Đang cập nhật — liên hệ để biết thêm chi tiết.” | Thiết kế field tương ứng trong Giai đoạn 3; hoàn thiện trước khi vận hành thật. |

## Case study liên quan

| Trang | Nội dung còn thiếu | Trạng thái |
|---|---|---|
| AI Consulting | Chưa có case study công khai phù hợp để chứng minh giải pháp. | Giữ thông báo hiện tại; bổ sung khi có dữ liệu đã xác minh. |
| IT Outsourcing | Chưa có case study công khai phù hợp để chứng minh giải pháp. | Giữ thông báo hiện tại; bổ sung khi có dữ liệu đã xác minh. |

Không gán case study hiện có cho hai giải pháp trên nếu chưa có bằng chứng nội dung phù hợp.

## About và Team

| Trang | Nội dung còn thiếu | Trạng thái |
|---|---|---|
| `/about/team` | Thông tin thành viên ngoài Director hiện có trong source. | Giữ placeholder; cần tên, vai trò và nội dung được chủ dự án duyệt. |

## Resources

Các route dưới đây mới có metadata mô tả, chưa có file tải thật:

- `/resources/company-profile`;
- `/resources/service-brochure`;
- `/resources/ai-whitepaper`;
- `/resources/ocr-guide`;
- `/resources/ai-checklist`.

Giữ trạng thái “Sắp có” và không bật CTA tải xuống cho đến khi có asset thật, quyền sử dụng rõ ràng và thông tin dung lượng được xác minh.

## Quy tắc chuyển sang Payload ở Giai đoạn 3

- Tạo field tương ứng với các khối placeholder trong `SolutionDomain`.
- Không biến placeholder thành nội dung đã xác minh khi migrate dữ liệu.
- Nội dung mới cần được chủ dự án duyệt trước khi publish.
- Không dùng AI tự sinh số liệu, cam kết, khách hàng, thời gian hoặc mức đầu tư để lấp backlog.
