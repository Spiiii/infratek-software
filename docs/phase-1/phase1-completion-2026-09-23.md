# Phase 1 — Source stabilization and SEO foundation

Date checked: 2026-09-23  
Baseline checkpoint: `1769a00`  
Implementation branch: `codex/phase-1-seo-foundation`  
Status: **Đã đóng Giai đoạn 1 ngày 2026-09-24 theo xác nhận của chủ dự án**, với ngoại lệ giao email được hoãn xử lý như technical debt bên thứ ba.

## Mục tiêu

Ổn định source hiện tại và hoàn thiện SEO kỹ thuật nền tảng mà không đổi URL public, không thêm route giải pháp mới, không đổi schema Payload, và không thực hiện hạng mục thuộc Giai đoạn 2 trở đi.

Ba bổ sung đã được đưa vào phạm vi:

- gỡ tạm liên kết footer `/#about` và `/#download`, kèm TODO nối lại `/about` và `/resources` ở Giai đoạn 2;
- coi Lighthouse SEO >= 90 trên bốn loại trang là điều kiện đạt/không đạt;
- ghi rõ rate limit in-memory của `/api/contact` chỉ là biện pháp tạm thời và sẽ thay bằng Upstash Redis ở Giai đoạn 5.

## Việc đã làm

### Server/client boundary và source

- Chuyển `/blog` thành Server Component; chỉ `BlogExplorer` (search và category filter) là Client Component.
- Metrics không còn khởi tạo bằng `0`: giá trị cuối cùng được render trực tiếp trong HTML, đọc được khi JavaScript bị tắt.
- Bỏ form newsletter demo, bỏ lead capture giả trong AI Readiness, và chuyển các nút download chưa có tài liệu sang trạng thái `Sắp có`/disabled.
- Gỡ các schema, hook, component UI và tám dependency Radix chắc chắn không còn import.
- Không thay đổi `spike-pages`, `/admin`, Payload catch-all `/api/[[...slug]]`, schema hoặc collection Payload.

### Metadata và structured data

- Thêm helper metadata dùng chung cho canonical, Open Graph, Twitter Card và URL tuyệt đối.
- Giữ nguyên H1, title và description hiện có; không tự chọn lại từ khóa hoặc copy SEO.
- Thêm ảnh OG mặc định PNG 1200x630 tại `/og-image`.
- Thêm JSON-LD `Organization` và `WebSite` ở layout; `Article` và `BreadcrumbList` ở bài blog; `BreadcrumbList` ở case study.
- Chuẩn hóa ngày Article thành ISO 8601 có múi giờ `+07:00`.
- Chuyển GA sang `NEXT_PUBLIC_GA_ID`; khi biến chưa có thì script GA không render.

### Crawl và sitemap

- Giữ đúng một nguồn robots là `src/app/robots.ts`; xóa `public/robots.txt` trùng lặp.
- `/robots.txt` cho crawl public, chặn `/admin/` và `/api/`, đồng thời trỏ tới sitemap.
- Bỏ `lastModified` giả dựa trên thời điểm build khỏi trang tĩnh và case study; chỉ giữ ngày xuất bản thật cho blog.
- Gỡ tạm các link `/#about` và `/#download`; source có TODO Phase 2.

### Contact form

- Frontend gửi về `/api/contact` thay vì Formspree.
- Thêm honeypot `website` và rate limit 5 request/10 phút theo client key.
- API trả `429` và `Retry-After: 600` từ request thứ sáu; honeypot trả success giả mà không gửi email.
- Rate limiter hiện là **in-memory**, chỉ phù hợp biện pháp cơ bản. Trên serverless, các instance không chia sẻ state và có thể bị reset; phải thay bằng Upstash Redis ở Giai đoạn 5.

## Bằng chứng kiểm thử

### Kiểm tra source và build

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass, 21 static/generated routes |
| Payload schema/collection diff | Không có |
| `git diff --check` | Pass sau khi chuẩn hóa EOF |

Build xác nhận các route cũ cùng tồn tại với `/og-image`, `/robots.txt` và `/sitemap.xml`. `/admin`, Payload API và `/api/contact` vẫn là dynamic routes.

### Trước/sau theo route đại diện

| Route | Trước | Sau | Kiểm tra thực tế |
|---|---|---|---|
| `/` | metadata nền, GA hard-code, metrics động của `StatisticsSection` khởi tạo bằng 0 | canonical/OG/Twitter; Organization + WebSite; GA từ env; metrics thật trong HTML | HTTP 200, canonical `https://infratek.vn`; hero vẫn giữ `50+ / 30+ / 98%`; khối statistics giữ `50+ / 30+ / 8+ / 25+` |
| `/solutions` | title/description, thừa hưởng metadata trang chủ | metadata riêng, canonical và social metadata | HTTP 200; Lighthouse SEO 100 |
| `/case-studies/ocr-document-intelligence` | title/description, metrics phụ thuộc JS | metadata riêng, BreadcrumbList, metrics trong HTML | HTTP 200; Lighthouse SEO 100 |
| `/blog` | toàn trang là Client Component; newsletter alert demo | page server-rendered; client boundary chỉ cho filter; newsletter ghi rõ đang hoàn thiện | HTTP 200; build static |
| `/blog/enterprise-ai-adoption-roadmap-2025` | OG Article thiếu canonical/image/Twitter; không có Article/Breadcrumb | metadata đầy đủ; Article + BreadcrumbList; ngày có timezone | HTTP 200; Lighthouse SEO 100; Rich Results hợp lệ |
| `/contact` | frontend gửi Formspree | gửi `/api/contact`, honeypot + rate limit | HTTP 200; validation 400; request thứ 6 trả 429; honeypot trả 200 |
| `/robots.txt` | hai nguồn robots | một metadata route | HTTP 200, `text/plain` |
| `/sitemap.xml` | ngày build giả cho trang tĩnh/case | bỏ ngày không đáng tin, giữ ngày blog | HTTP 200, 15 URL, không có `lastmod` ngày build |
| `/og-image` | chưa có ảnh mặc định dùng được | PNG 1200x630 sinh tĩnh | HTTP 200, `image/png` |

### Lighthouse gate

Chạy Lighthouse CLI 13.5.0 với Chrome thật trên production build local ngày 2026-09-23. Cả bốn báo cáo có `runtimeError: null`, không có SEO audit binary thất bại:

| Trang | SEO | Ngưỡng | Kết quả |
|---|---:|---:|---|
| Trang chủ | 100 | >= 90 | Đạt |
| `/solutions` | 100 | >= 90 | Đạt |
| Một case study | 100 | >= 90 | Đạt |
| Một bài blog | 100 | >= 90 | Đạt |

Bằng chứng thô: `lighthouse-home.json`, `lighthouse-solutions.json`, `lighthouse-case-study.json`, `lighthouse-blog-post.json` trong cùng thư mục báo cáo.

Lighthouse trên Windows trả exit code 1 ở bước cuối vì không xóa được Chrome profile tạm (`EPERM`), nhưng bốn JSON đã ghi hoàn chỉnh, điểm là 100 và `runtimeError` đều null. Đây là lỗi cleanup của runner, không phải lỗi audit trang.

### Rich Results Test

Google Rich Results Test được chạy bằng chế độ nhập mã với HTML/JSON-LD render từ bài blog đại diện. Kết quả tại thời điểm kiểm tra:

- phát hiện 4 mục hợp lệ;
- Article: 1 hợp lệ;
- Breadcrumb: 1 hợp lệ;
- Organization: 1 hợp lệ;
- Local Business được suy ra từ Organization có địa chỉ: 1 hợp lệ.

Kết quả tham chiếu: `https://search.google.com/test/rich-results/result?id=GOfNZVmeGxnC_zmcMWabEw`.

Test ban đầu ghi cảnh báo không nghiêm trọng cho ngày chỉ có `YYYY-MM-DD`; source sau đó đã đổi sang ISO 8601 có timezone và HTML local xác nhận `2025-01-15T00:00:00+07:00`. Cảnh báo tùy chọn về author URL/logo chưa được xử lý vì chưa có trang tác giả và logo chuẩn dành cho schema.

Ngày 2026-09-24, test URL được chạy lại trực tiếp trên Preview deployment sau khi tạm tắt Vercel Authentication:

- URL kiểm tra: `https://infratek-software-git-codex-phase-1-seo-foundation-spi6.vercel.app/blog/enterprise-ai-adoption-roadmap-2025`;
- Google phát hiện 4 loại dữ liệu có cấu trúc, mỗi loại có 1 mục hợp lệ: Article, Breadcrumb, Organization và Local Business;
- Article, Organization và Local Business còn cảnh báo không nghiêm trọng cho các trường khuyến nghị;
- Google báo không thể lập chỉ mục URL vì response Preview có `X-Robots-Tag: noindex`. Đây là hành vi dự kiến của môi trường Preview, không phải lỗi structured data.

Kết quả URL thật: `https://search.google.com/test/rich-results/result?id=8YwbfdvSZtRkFaKniJWDVA`.

### Contact API

- payload sai: `400`;
- cùng client key, request 1–5 được xử lý và request 6: `429`;
- honeypot có giá trị: `200 {"success":true}` và không gọi Resend;
- frontend gọi đúng `/api/contact`;
- Preview deployment `EG2PizsenMqnjjohpkGNGXNFUrwU` đã được kiểm thử thật ngày 2026-09-24 với các biến môi trường Preview đã cấu hình;
- `POST /api/contact` trả `HTTP 200` và `{"success":true}` cho đúng một request kiểm thử;
- `/og-image` trên cùng Preview trả `HTTP 200`, `Content-Type: image/png`, kích thước response 90.176 byte;
- Resend chấp nhận request nhưng email không được giao: máy chủ nhận trả `SMTP 550 5.7.1 Sender address rejected: service unavailable` đối với envelope sender tại `rsend.infratek.vn`;
- domain gửi `infratek.vn` đã Verified trong Resend, địa chỉ nhận đúng và API key có full access. Chủ dự án xác nhận hoãn xử lý lỗi giao thư vì lỗi xảy ra sau khi ứng dụng đã bàn giao request cho dịch vụ bên thứ ba.

Vercel Authentication chỉ được tắt trong thời gian kiểm thử công khai. Sau khi hoàn tất, bảo vệ đã được bật lại và request không đăng nhập tới `/og-image` trả `HTTP 302` về Vercel SSO.

## Audit lỗi và việc còn tồn tại

1. **Technical debt đã được chấp nhận:** xử lý SMTP `550 5.7.1` trước khi website vận hành thật. Hướng ưu tiên là xác minh subdomain gửi riêng (ví dụ `send.infratek.vn`) và dùng địa chỉ sender thuộc subdomain đó, hoặc yêu cầu nhà cung cấp email cho phép Resend/Amazon SES. Cho đến khi xử lý, API có thể trả thành công khi Resend tiếp nhận nhưng email vẫn bounce bất đồng bộ.
2. Article còn có thể bổ sung author URL khi có trang tác giả thật; Organization có thể bổ sung logo vuông đúng chuẩn khi có asset chính thức. Không dùng URL/logo giả để chỉ xóa warning tùy chọn.
3. Rate limit in-memory không đáng tin hoàn toàn trên serverless; thay bằng Upstash Redis ở Giai đoạn 5.
4. Nội dung metrics/case study hiện vẫn là dữ liệu giả định của website học tập. Phase 1 chỉ đảm bảo render và SEO kỹ thuật, không xác minh tính thật của số liệu; phân loại dữ liệu/case thuộc các giai đoạn sau.

### Làm rõ hai khối số liệu trang chủ

Source tại checkpoint `1769a00` vốn có hai khối khác nhau và Giai đoạn 1 không đổi giá trị:

- Hero: `50+ Dự án AI`, `30+ Doanh nghiệp`, `98% Accuracy`.
- `StatisticsSection`: `50+ Dự án AI hoàn thành`, `30+ Doanh nghiệp tin tưởng`, `8+ Năm kinh nghiệm`, `25+ Chuyên gia AI & Engineering`.

Thay đổi duy nhất là `StatisticsSection` không còn trả HTML ban đầu bằng `0`; bốn giá trị gốc được render trực tiếp. Cách diễn đạt cũ trong báo cáo chỉ liệt kê khối thứ hai nên dễ tạo cảm giác `98%` đã bị thay thế; `98%` thực tế vẫn còn nguyên trong hero.

## Checklist điều kiện hoàn thành Giai đoạn 1

- [x] `build`, `typecheck`, `lint` đạt.
- [x] Các trang chính có metadata và structured data hợp lệ.
- [x] Metrics đọc được khi JavaScript bị tắt.
- [x] Form liên hệ gửi được trên Preview — API trả `HTTP 200` và `{"success":true}`; ngoại lệ bounce từ nhà cung cấp email đã được ghi nhận và hoãn xử lý.
- [x] Không còn CTA giả tuyên bố đã lưu/đăng ký/tải file.
- [x] Lighthouse SEO >= 90 trên trang chủ, `/solutions`, một case study và một bài blog (đều đạt 100).
- [x] Chủ dự án xác nhận kết quả và quyết định đóng Giai đoạn 1 ngày 2026-09-24 với ngoại lệ SMTP nêu trên.

Giai đoạn 1 được đóng theo xác nhận của chủ dự án. Ngoại lệ SMTP không chặn chuyển sang giai đoạn tiếp theo nhưng phải được xử lý và kiểm thử lại trạng thái `Delivered` trước khi website vận hành thật.
