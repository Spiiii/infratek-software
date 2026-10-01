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
| Seed Neon Preview | PASS ngày 2026-09-30; 7/7 case tồn tại với `_status=draft`, `reviewState=editing`; CRM `verified`, 6 case còn lại `illustrative` |
| Media seed | PASS qua Vercel Preview có Blob credential; seed idempotent và 4 case cũ có chỉnh sửa CMS được báo conflict rồi bỏ qua |
| Quan hệ CMS | PASS qua Payload REST API `depth=3`: `camera-ai-transformation` resolve tới `digital-transformation` và chiều Solution resolve lại đúng Case Study |
| Direct route draft | PASS qua stable Preview alias trong cửa sổ kiểm thử public tạm thời; cả 7 slug trả HTTP `404` |
| Draft-isolation script trên URL public | PASS; 9 public surfaces, REST API `depth=3`, 7/7 direct route và token nhận diện draft đều được kiểm tra; không phát hiện rò rỉ HTML, sitemap, relationship lồng hoặc media/image |
| Published route sanity | PASS; 4/4 case published trả HTTP `200` |
| Structured data HTTP | PASS; homepage và listing có `Organization` + `WebSite`; detail Camera AI có `Article` + `BreadcrumbList`; JSON-LD parse hợp lệ và không chứa draft |
| Google Rich Results Test | Phát hiện Article, Breadcrumb, Local Business và Organization hợp lệ. Google không crawl/index Preview bình thường; ghi nhận là giới hạn external Preview, không phải lỗi ứng dụng |
| Khôi phục Deployment Protection | PASS; exception chỉ mở tạm để verification rồi được owner xóa. Anonymous probe cuối trả HTTP `302` tới Vercel SSO |

## Kiểm tra chống rò rỉ

Script `scripts/verify-phase4-draft-isolation.ts` kiểm tra đồng thời:

- `/`, `/case-studies`, `/sitemap.xml`;
- bốn trang solution và quan hệ related case;
- REST API `case-studies` và `solutions` với `depth=3`;
- truy cập ẩn danh trực tiếp cả bảy slug phải trả `404`;
- response không chứa tên, slug hoặc tên ảnh của CRM và sáu case minh họa.

Database state và toàn bộ public surface đã được xác minh trên stable Preview alias trong một cửa sổ public tạm thời do owner kiểm soát. Sau khi kiểm tra hoàn tất, owner đã xóa Deployment Protection Exception; anonymous probe cuối xác nhận HTTP `302` tới Vercel SSO.

Các thay đổi diagnostic trước đó trong `scripts/verify-phase4-draft-isolation.ts` (tự nạp `.env.local` và tự gửi `x-vercel-protection-bypass`) được phân loại là **temporary diagnostic** và đã hoàn nguyên. Script dài hạn tiếp tục độc lập với local secret để không vô tình che khuất lỗi Deployment Protection hoặc biến một phép kiểm tra anonymous thành authenticated/bypassed.

## Content backlog

`docs/CONTENT-BACKLOG.md` giữ nguyên backlog solution có sẵn và bổ sung sáu case minh họa. Mỗi case phải được chủ dự án viết lại từ dữ liệu thật, thay asset phù hợp, duyệt và publish thủ công trong `/admin`.

## Audit lỗi và việc còn mở

1. Google không crawl/index stable Preview alias bình thường dù Rich Results Test vẫn phát hiện các structured-data item hợp lệ. Đây là giới hạn external Preview và không chặn đóng Giai đoạn 4.
2. SMTP `550 5.7.1` vẫn deferred theo ngoại lệ Giai đoạn 1, không thuộc phạm vi này.

Biến Preview tạm `PHASE4_SEED_ON_BUILD` đã được xóa khỏi Vercel ngày 2026-09-30 sau khi chủ dự án xác nhận. Tìm lại đúng tên biến trên trang Environment Variables trả về `No Results Found`; mã nguồn từ commit `6d66cf9` cũng không còn build hook phụ thuộc biến này.

## Checklist điều kiện hoàn thành Giai đoạn 4

- [x] Mỗi case có trạng thái và consent flag; đã xác minh 7/7 bản ghi trực tiếp trên Neon Preview.
- [x] Mỗi metric trong package mới có cách đo, nguồn hoặc được ghi rõ là minh họa, kèm mốc thời gian.
- [x] Không có ảnh chứa thông tin nhạy cảm trong content package; CRM chỉ dùng hai ảnh an toàn.
- [x] Không dùng nhãn AI cho case không có thành phần AI thật.
- [x] Microsoft 365 và Odoo chỉ được mô tả là triển khai, không dùng logo hoặc tuyên bố đối tác.
- [x] Có Article/Breadcrumb và OG 1200×630 cho route case study.
- [x] Có URL filter crawlable theo ngành và solution.
- [x] Quan hệ hai chiều hoạt động trên CMS Preview; đã xác minh read-only qua Payload REST API `depth=3`.
- [x] Cả 7 case draft không lộ qua public route/API/sitemap; direct route 7/7 trả 404 và toàn bộ public-surface verification đạt.
- [x] Rich Results Test đã chạy trên URL Preview thật và phát hiện các item hợp lệ; crawl/index external bị giới hạn trên Preview và được ghi nhận riêng.

## Kết luận đóng giai đoạn

Giai đoạn 4 đã có đủ bằng chứng kỹ thuật để **READY TO CLOSE**. Quyền truy cập public tạm thời chỉ được dùng cho verification và đã được gỡ; Deployment Protection đã được xác nhận khôi phục. Việc commit và xác nhận đóng chính thức vẫn chờ owner phê duyệt.

### Quality checks cuối — 2026-10-01

- `npm run typecheck`: PASS.
- `npm run lint`: PASS với 0 error, còn 1 warning `@next/next/no-img-element` tại trang chi tiết case study.
- `npm run verify:phase4:packages`: PASS; 7 draft packages, CRM có 2 ảnh an toàn và 6 case minh họa có 3 đồ họa/case.
- `npm run build`: PASS; sinh 37 trang và chỉ prerender 4 case study published.
- Anonymous protection probe cuối: HTTP `302`, đích Vercel SSO; Deployment Protection restored.
