# Phase 2 — Cấu trúc nội dung mới chưa phụ thuộc CMS

Date checked: 2026-09-24  
Baseline checkpoint: `e7a20e4`  
Implementation branch: `codex/phase-2-solutions-content`  
Implementation commit (local): `9f9a262`  
Status: **Chưa tự động đóng Giai đoạn 2** — title/description và cách xử lý placeholder đã được xác nhận; chờ bằng chứng kiểm thử Preview và chủ dự án quyết định đóng.

## Mục tiêu

Kiểm chứng information architecture, route và UI cho cấu trúc nội dung mới bằng dữ liệu tĩnh hiện có; tạo hợp đồng dữ liệu độc lập với Payload để Giai đoạn 3 có thể thay nguồn dữ liệu mà không sửa lại từng trang.

Không tạo collection, không đổi Payload schema, không sửa `/admin`, `/api/[[...slug]]`, case study hoặc blog hiện có, và không đổi trang chủ.

## Việc đã làm

### Route và information architecture

- Tạo `/about` và `/about/team`.
- Chuyển `/solutions` thành hub có khối “Bạn đang ở tình huống nào?”.
- Tạo bốn route solution:
  - `/solutions/ai-consulting`;
  - `/solutions/software-development`;
  - `/solutions/it-outsourcing`;
  - `/solutions/digital-transformation`.
- Tạo `/tools/roi-calculator` và `/tools/ai-readiness` bằng component tương tác hiện có.
- Tạo `/resources`, năm route `/resources/[slug]` từ dữ liệu hiện có và `/ai-lab`.
- Chuyển toàn bộ link solution từ anchor sang route thật; không còn `/#about` hoặc `/#download` trong source.
- Thêm dropdown Solutions và Tools cho desktop, accordion con cho mobile; footer có nhóm Tài nguyên và các URL mới.
- Bảo toàn URL case study/blog hiện có.

### Hợp đồng dữ liệu cho Giai đoạn 3

Tạo `src/lib/content/types.ts` và `src/lib/content/repository.ts`. Các trang App Router không còn import trực tiếp `src/data`; chúng gọi lớp truy cập dữ liệu:

- `getCompany()`;
- `getSolutions()` / `getSolutionBySlug()`;
- `getCaseStudies()` / `getCaseStudyBySlug()`;
- `getPosts()` / `getPostBySlug()`;
- `getResources()` / `getResourceBySlug()`;
- `getInnovationProjects()`.

`SolutionDomain` độc lập với type Payload và thể hiện template 10 phần:

1. H1 (`title`);
2. khung trả lời nhanh (`quickAnswer`);
3. dấu hiệu cần (`needSignals`);
4. sản phẩm bàn giao (`deliverables`);
5. quy trình (`process`);
6. kết quả (`outcomes`);
7. case study liên quan (`relatedCaseStudySlugs`);
8. phù hợp/chưa phù hợp (`audienceFit`);
9. thời gian/đầu tư (`timelineAndInvestment`);
10. FAQ (`faq`).

Các khối chưa có dữ liệu mang `status: "placeholder"`; lớp repository hiện ánh xạ dữ liệu tĩnh và là điểm duy nhất cần thay bằng adapter Payload ở Giai đoạn 3.

### Metadata và structured data

- Mỗi solution có canonical, Open Graph/Twitter metadata riêng theo route.
- Metadata đã áp đúng phương án chủ dự án chọn ngày 2026-09-24. Title dùng giá trị tuyệt đối để không bị layout gắn lặp brand suffix.
- Mỗi trang solution render một JSON-LD node `Service` riêng với `name`, `description`, `url`, `provider`, `areaServed` và `serviceType`.
- Sitemap lấy dữ liệu qua repository và có đủ route mới.

### Theo dõi technical debt và backlog nội dung

Tạo `docs/OPEN-ITEMS.md` để giữ ba mục đã xác nhận: xoay mật khẩu Neon, thay Neon MCP key account-wide và lỗi SMTP 550. File cũng ghi gate phải import/đối chiếu bản v4 đầy đủ trước Giai đoạn 3.

Tạo riêng `docs/CONTENT-BACKLOG.md` để theo dõi toàn bộ placeholder của solution, case study còn thiếu, team và resource chưa có file thật. Chủ dự án xác nhận giữ placeholder và không dùng các mục này để chặn đóng Giai đoạn 2.

## Bằng chứng kiểm thử

### Kiểm tra source và build

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass, 36 trang được generate/prerender |
| Metadata production render | Pass, title/description của 4 solution khớp lựa chọn; không có suffix lặp |
| `git diff --check` | Pass |
| Payload schema/collection diff từ `e7a20e4` | Không có |
| App Router import trực tiếp `@/data/*` | Không có |

### Route trước/sau

| Nhóm | Trước | Sau | Kiểm tra |
|---|---|---|---|
| About | Chưa có | `/about`, `/about/team` | HTTP 200 |
| Solutions | Một trang dài dùng anchor | Hub + 4 trang chi tiết | 5/5 route HTTP 200 |
| Tools | Chỉ nằm trên trang chủ | 2 route độc lập, giữ component hiện có | 2/2 route HTTP 200 |
| Resources | Chỉ là section chưa có file tải | Hub + 5 trang chi tiết trạng thái “Sắp có” | 6/6 route HTTP 200 |
| AI Lab | Chỉ là section trên trang chủ | `/ai-lab` | HTTP 200 |
| Case study/blog | Các URL public đang chạy | Không đổi URL | Tất cả route sitemap HTTP 200 |

Sitemap render 30 URL. Script crawl toàn bộ URL trong sitemap và các `href` nội bộ không phát hiện link trả HTTP >= 400.

### Menu desktop/mobile

- Desktop: Solutions dropdown xuất hiện khi focus bàn phím và chứa đủ bốn route; CSS hỗ trợ hover và `focus-within`.
- Mobile 390x844: nút mở/đóng menu hoạt động; submenu Solutions và Tools có `aria-expanded` đúng và hiển thị đủ link con.
- Viewport kiểm thử đã được reset sau khi hoàn tất.

### JSON-LD và Rich Results Test

- HTML production build của từng solution có đúng một node `"@type":"Service"`.
- Google Rich Results Test đã chạy bằng mã render đại diện: `https://search.google.com/test/rich-results/result?id=qyRc3vNxy92b97R_9Rbs6g`.
- Kết quả: Google không phát hiện rich-result item. `Service` không phải loại rich result được công cụ Google hỗ trợ, nên kết quả này không kết luận schema sai; nó chỉ xác nhận không có Google rich-result tương ứng.
- Cần kiểm tra lại URL Preview sau khi branch được push/deploy. Việc push chưa thực hiện vì cần chủ dự án cho phép xuất bản branch lên GitHub remote.

## Nội dung placeholder đã được chấp nhận đưa vào backlog

Áp dụng cho cả bốn solution:

- sản phẩm bàn giao cụ thể;
- đối tượng phù hợp và chưa phù hợp;
- thời gian triển khai và mức đầu tư sơ bộ;
- FAQ.

Placeholder riêng:

- AI Consulting: chưa có case study công khai phù hợp.
- IT Outsourcing: chưa có case study công khai phù hợp.
- `/about/team`: mới có tên Director; thông tin thành viên khác chưa có.
- `/resources/[slug]`: chưa có file tải thật, tất cả đang ở trạng thái “Sắp có”.

Không có số liệu, cam kết hoặc quy trình mới nào được tự viết thêm ngoài dữ liệu nguồn.
Danh sách theo dõi đầy đủ nằm tại `docs/CONTENT-BACKLOG.md`; các mục này không chặn đóng Giai đoạn 2.

## Title/description đã chọn và áp dụng

| Solution | Title | Description |
|---|---|---|
| AI Consulting — phương án 1 | Tư vấn AI cho doanh nghiệp \| Infratek Software | Đánh giá mức độ sẵn sàng, xác định use case và xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu doanh nghiệp. |
| Software Development — phương án 1 + brand suffix | Phát triển phần mềm tích hợp AI cho doanh nghiệp \| Infratek Software | Thiết kế và phát triển web app, nền tảng phần mềm và hệ thống tích hợp AI theo nhu cầu doanh nghiệp. |
| IT Outsourcing — phương án 2 | Dịch vụ IT Outsourcing cho doanh nghiệp \| Infratek | Bổ sung nhân sự kỹ thuật hoặc dedicated team để hỗ trợ phát triển và vận hành sản phẩm phần mềm. |
| Digital Transformation — phương án 1 | Chuyển đổi số và tự động hóa bằng AI cho doanh nghiệp | Số hóa tài liệu, tự động hóa quy trình và xây dựng nền tảng dữ liệu hỗ trợ vận hành doanh nghiệp. |

## Audit lỗi và việc còn tồn tại

1. Nội dung thật cho placeholder vẫn cần hoàn thiện trước khi vận hành thương mại; đã được chấp nhận không chặn Giai đoạn 2 và theo dõi tại `docs/CONTENT-BACKLOG.md`.
2. Rich Results Test không hỗ trợ loại `Service`; không được diễn giải “không phát hiện rich result” thành schema không hợp lệ.
3. Chưa có bằng chứng kiểm thử URL Preview thật tại thời điểm cập nhật này.
4. Các technical debt ngoài phạm vi được giữ tại `docs/OPEN-ITEMS.md`.

## Checklist điều kiện hoàn thành Giai đoạn 2

- [x] Tất cả route mục tiêu tồn tại và xuất hiện trong sitemap.
- [x] Menu mobile/desktop hoạt động.
- [x] Không có link nội bộ hỏng.
- [x] Mỗi solution có metadata và schema `Service` riêng.
- [x] Các trang không import trực tiếp `src/data`; dữ liệu đi qua lớp truy cập chung.
- [x] URL case study/blog hiện có được bảo toàn.
- [x] `typecheck`, `lint`, `build` đạt.
- [x] Chủ dự án chọn title/description cuối cùng cho bốn solution; metadata đã áp và kiểm tra production render.
- [x] Chủ dự án xác nhận giữ placeholder, không chặn Giai đoạn 2; backlog được tách tại `docs/CONTENT-BACKLOG.md`.
- [ ] Push/deploy Preview và kiểm tra lại trên URL công khai.
- [ ] Chủ dự án xác nhận kết quả và quyết định đóng Giai đoạn 2.

Không tự đánh dấu Giai đoạn 2 hoàn tất.
