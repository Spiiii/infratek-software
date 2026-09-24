# Phase 2 — Cấu trúc nội dung mới chưa phụ thuộc CMS

Date checked: 2026-09-24  
Baseline checkpoint: `e7a20e4`  
Implementation branch: `codex/phase-2-solutions-content`  
Implementation commit (local): `9f9a262`  
Status: **Chưa tự động đóng Giai đoạn 2** — chờ chủ dự án chọn title/description, xác nhận nội dung placeholder và quyết định push/deploy Preview.

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
- Metadata hiện tạm dùng đúng tên và mô tả đang có trong source, không xem là lựa chọn SEO cuối cùng.
- Mỗi trang solution render một JSON-LD node `Service` riêng với `name`, `description`, `url`, `provider`, `areaServed` và `serviceType`.
- Sitemap lấy dữ liệu qua repository và có đủ route mới.

### Theo dõi technical debt

Tạo `docs/OPEN-ITEMS.md` để giữ ba mục đã xác nhận: xoay mật khẩu Neon, thay Neon MCP key account-wide và lỗi SMTP 550. File cũng ghi gate phải import/đối chiếu bản v4 đầy đủ trước Giai đoạn 3.

## Bằng chứng kiểm thử

### Kiểm tra source và build

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass, 36 trang được generate/prerender |
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

## Nội dung placeholder cần chủ dự án viết

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

## Phương án title/description cần chủ dự án chọn

Các phương án dưới đây chỉ là đề xuất, chưa được áp vào metadata cuối cùng.

### AI Consulting

1. **Tư vấn AI cho doanh nghiệp | Infratek Software**  
   Mô tả: Đánh giá mức độ sẵn sàng, xác định use case và xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu doanh nghiệp.
2. **Dịch vụ AI Consulting và lộ trình triển khai AI**  
   Mô tả: Tư vấn chiến lược AI từ đánh giá dữ liệu, lựa chọn use case đến xây dựng roadmap và khung đo lường hiệu quả.
3. **Chiến lược ứng dụng AI thực tiễn cho doanh nghiệp**  
   Mô tả: Khám phá cách Infratek hỗ trợ doanh nghiệp đánh giá hiện trạng, ưu tiên cơ hội AI và chuẩn bị kế hoạch triển khai.

### Software Development

1. **Phát triển phần mềm tích hợp AI cho doanh nghiệp**  
   Mô tả: Thiết kế và phát triển web app, nền tảng phần mềm và hệ thống tích hợp AI theo nhu cầu doanh nghiệp.
2. **Dịch vụ Software Development AI-Native | Infratek**  
   Mô tả: Xây dựng hệ thống từ kiến trúc, backend, frontend đến tích hợp AI, triển khai và hỗ trợ vận hành.
3. **Xây dựng phần mềm doanh nghiệp và giải pháp AI**  
   Mô tả: Dịch vụ phát triển phần mềm tùy chỉnh kết hợp năng lực full-stack, AI engineering và DevOps.

### IT Outsourcing

1. **IT Outsourcing và đội ngũ kỹ thuật theo nhu cầu**  
   Mô tả: Mở rộng năng lực kỹ thuật với đội ngũ AI, full-stack và DevOps phù hợp với nhu cầu dự án.
2. **Dịch vụ IT Outsourcing cho doanh nghiệp | Infratek**  
   Mô tả: Bổ sung nhân sự kỹ thuật hoặc dedicated team để hỗ trợ phát triển và vận hành sản phẩm phần mềm.
3. **Mở rộng đội ngũ phát triển phần mềm linh hoạt**  
   Mô tả: Tiếp cận đội ngũ kỹ thuật theo mô hình phù hợp với năng lực nội bộ và phạm vi dự án của doanh nghiệp.

### Digital Transformation

1. **Chuyển đổi số và tự động hóa bằng AI cho doanh nghiệp**  
   Mô tả: Số hóa tài liệu, tự động hóa quy trình và xây dựng nền tảng dữ liệu hỗ trợ vận hành doanh nghiệp.
2. **Giải pháp Digital Transformation AI-First | Infratek**  
   Mô tả: Tiếp cận chuyển đổi số từ đánh giá hiện trạng đến cải tiến quy trình, nền tảng dữ liệu và ứng dụng AI.
3. **Giải pháp chuyển đổi số lấy AI làm trung tâm**  
   Mô tả: Kết hợp tự động hóa, Document AI và hệ thống dữ liệu để hỗ trợ tối ưu hoạt động doanh nghiệp.

## Audit lỗi và việc còn tồn tại

1. Chờ chủ dự án chọn một title/description cho từng solution; metadata hiện tại chỉ là fallback trung lập từ dữ liệu cũ.
2. Chờ nội dung thật cho các placeholder nêu trên.
3. Rich Results Test không hỗ trợ loại `Service`; không được diễn giải “không phát hiện rich result” thành schema không hợp lệ.
4. Chưa có Preview deployment vì branch chưa được phép push lên GitHub remote trong lượt thực hiện này.
5. Các technical debt ngoài phạm vi được giữ tại `docs/OPEN-ITEMS.md`.

## Checklist điều kiện hoàn thành Giai đoạn 2

- [x] Tất cả route mục tiêu tồn tại và xuất hiện trong sitemap.
- [x] Menu mobile/desktop hoạt động.
- [x] Không có link nội bộ hỏng.
- [x] Mỗi solution có metadata và schema `Service` riêng.
- [x] Các trang không import trực tiếp `src/data`; dữ liệu đi qua lớp truy cập chung.
- [x] URL case study/blog hiện có được bảo toàn.
- [x] `typecheck`, `lint`, `build` đạt.
- [ ] Chủ dự án chọn title/description cuối cùng cho bốn solution.
- [ ] Chủ dự án xác nhận cách xử lý nội dung placeholder.
- [ ] Push/deploy Preview và kiểm tra lại trên URL công khai.
- [ ] Chủ dự án xác nhận kết quả và quyết định đóng Giai đoạn 2.

Không tự đánh dấu Giai đoạn 2 hoàn tất.
