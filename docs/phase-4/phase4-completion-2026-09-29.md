# Báo cáo Giai đoạn 4 — 2026-09-29

## Mục tiêu

Hoàn thiện nền tảng nội dung case study trên Payload, bổ sung quan hệ case study–solution, structured data, OG image, bộ lọc crawlable và chuẩn bị bảy case mới ở trạng thái draft. Nội dung draft không được xuất hiện trên bề mặt public trước khi chủ dự án duyệt.

## Việc đã làm

- Tạo bảy content package tại `content/case-studies/<slug>/index.yml` cùng thư mục ảnh.
- CRM dùng đúng hai ảnh an toàn: Dashboard Summary và Permissions/RBAC; không đưa 14 ảnh chưa che dữ liệu vào repository hoặc Blob.
- Sáu case minh họa có ba đồ họa SVG/case, ghi rõ không phải screenshot sản phẩm thật.
- Seed giữ cơ chế hash, dry-run và conflict; media bắt buộc có Blob token, không fallback sang local disk.
- Khóa `push: false` cho Postgres adapter vì schema chỉ được quản lý bằng migration. Việc khởi tạo script không thể tự suy diễn rồi sửa/xóa cột do plugin phụ thuộc environment.
- Public repository tiếp tục lọc `_status=published`; trang solution chỉ ghép related case từ danh sách published.
- Thêm filter crawlable `?industry=` và `?solution=`, đưa các tổ hợp có dữ liệu published vào sitemap.
- Thêm `Article` và `BreadcrumbList`; OG image động 1200×630 cho từng case published.
- Thêm kiểm tra chống rò rỉ cho cả bảy slug draft trên trang public, sitemap, solution, REST API và direct route 404.
- Cập nhật `docs/CONTENT-BACKLOG.md` và đánh dấu hai mục bảo mật Neon đã hoàn tất trong `docs/OPEN-ITEMS.md`.

## Trạng thái 11 case

| Case | Slug | Phân loại | Trạng thái dự kiến cuối Giai đoạn 4 | Review |
|---|---|---|---|---|
| Camera AI | `camera-ai-transformation` | illustrative | published | approved |
| OCR | `ocr-document-intelligence` | illustrative | published | approved |
| Interview AI | `interview-ai` | illustrative | published | approved |
| PMS | `pms-project-management` | illustrative | published | approved |
| CRM | `crm-system` | verified | draft | editing |
| DMS | `dms-document-management` | illustrative | draft | editing |
| HRM | `hrm-human-resource-management` | illustrative | draft | editing |
| E-POS | `e-pos-system` | illustrative | draft | editing |
| E-Office | `e-office` | illustrative | draft | editing |
| Microsoft 365 | `microsoft-365-deployment` | illustrative | draft | editing |
| Odoo | `odoo-erp-implementation` | illustrative | draft | editing |

## Ảnh CRM

- Đã kiểm tra và đưa vào package: `crm-dashboard-summary.png`, `crm-permissions-rbac.png`.
- Không đưa các ảnh Leads, Products, Contract, Planning, Claim, QC hoặc Payments chưa che dữ liệu vào source.
- CRM phải tiếp tục là draft cho tới khi chủ dự án cung cấp ảnh redacted và tự duyệt publish.
- Trạng thái: nội dung đã sẵn sàng, đang chờ ảnh redacted trước khi chủ dự án xuất bản.

## Bằng chứng kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; 37 trang, chỉ 4 case published được prerender |
| `npm run verify:phase4:packages` | PASS; 7 draft package, đúng phân loại và số ảnh |
| Draft isolation trên local static build | Direct page của 7 slug không được sinh; API cần kiểm tra lại trên Preview có kết nối DB |
| Seed Neon Preview | Chưa chạy: local không có Blob token; script đã từ chối local-disk fallback |
| Rich Results Test trên Preview | Chưa chạy, chờ Preview deployment |

## Kiểm tra chống rò rỉ

Script `scripts/verify-phase4-draft-isolation.ts` kiểm tra đồng thời:

- `/`, `/case-studies`, `/sitemap.xml`;
- bốn trang solution và quan hệ related case;
- REST API `case-studies` và `solutions` với `depth=3`;
- truy cập ẩn danh trực tiếp cả bảy slug phải trả `404`;
- response không chứa tên, slug hoặc tên ảnh của CRM và sáu case minh họa.

Kết quả cuối trên Preview đang chờ deployment và seed. Đây vẫn là mục mở, chưa được đánh dấu đạt.

## Content backlog

`docs/CONTENT-BACKLOG.md` giữ nguyên backlog solution có sẵn và bổ sung sáu case minh họa. Mỗi case phải được chủ dự án viết lại từ dữ liệu thật, thay asset phù hợp, duyệt và publish thủ công trong `/admin`.

## Audit lỗi và việc còn mở

1. Cần push nhánh để Vercel tạo Preview; thao tác đang chờ ủy quyền rõ cho remote GitHub.
2. Cần mở scope ba biến `DATABASE_URL`, `PAYLOAD_SECRET`, `CONTENT_SOURCE` cho branch Giai đoạn 4; Blob token đã có scope Preview.
3. Cần seed bảy case/media qua môi trường có Blob token và xác minh database.
4. Cần chạy draft-isolation trên Preview thật, kiểm tra 11 URL, filter, quan hệ hai chiều và Rich Results Test.
5. SMTP `550 5.7.1` vẫn deferred theo ngoại lệ Giai đoạn 1, không thuộc phạm vi này.

## Checklist điều kiện hoàn thành Giai đoạn 4

- [ ] Mỗi case có trạng thái và consent flag. Schema và package đã có; chờ seed/xác minh CMS cho 7 case mới.
- [x] Mỗi metric trong package mới có cách đo, nguồn hoặc được ghi rõ là minh họa, kèm mốc thời gian.
- [x] Không có ảnh chứa thông tin nhạy cảm trong content package; CRM chỉ dùng hai ảnh an toàn.
- [x] Không dùng nhãn AI cho case không có thành phần AI thật.
- [x] Microsoft 365 và Odoo chỉ được mô tả là triển khai, không dùng logo hoặc tuyên bố đối tác.
- [x] Có Article/Breadcrumb và OG 1200×630 cho route case study.
- [x] Có URL filter crawlable theo ngành và solution.
- [ ] Quan hệ hai chiều hoạt động trên CMS Preview. Chờ seed và kiểm tra thật.
- [ ] Cả 7 case draft không lộ qua public route/API/sitemap. Script đã có; chờ chạy trên Preview thật.
- [ ] Rich Results Test trên URL Preview thật. Chờ deployment.

Giai đoạn 4 **chưa được tự đánh dấu hoàn tất**. Chủ dự án xác nhận đóng sau khi các mục Preview còn mở có đủ bằng chứng.
