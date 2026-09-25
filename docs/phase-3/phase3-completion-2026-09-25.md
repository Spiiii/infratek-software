# Phase 3 — Payload, Neon và Blob

Date checked: 2026-09-25  
Baseline checkpoint: `5831618`  
Implementation branch: `codex/phase-3-payload-neon`  
Status: **Chưa tự động đóng Giai đoạn 3** — phần code, schema, migration, seed, workflow và Preview đã đạt; Blob và quyết định xử lý Production còn mở.

## Mục tiêu

Đưa nội dung solution, case study và blog hiện có vào Payload/Neon mà không đổi URL public hay hợp đồng dữ liệu Giai đoạn 2; bổ sung workflow Author/Reviewer, draft preview có bảo vệ, Blob adapter và quy trình migration an toàn.

## Việc đã làm

### Schema và workflow

- Tạo collections `solutions`, `case-studies`, `posts`, `pages`, `technologies`, `authors`, `media`; globals `company-facts`, `faq`.
- `solutions` bám theo `SolutionDomain`; bốn nhóm chưa có nội dung thật tiếp tục mang `status: placeholder` và không bị ép điền nội dung giả.
- `case-studies` có `dataClassification`; bốn case hiện hữu được seed là `illustrative` và frontend hiện nhãn “Tình huống minh họa”.
- Bật Payload drafts và giữ `reviewState` (`editing | in_review | approved`) độc lập với `_status`; không có field tùy biến tên `status`.
- Hook chặn publish khi chưa approved; Author không thể approve, publish hoặc gỡ publish; Reviewer/Admin có thể duyệt và publish.
- Users có role `admin | reviewer | author`, `maxLoginAttempts: 5`, `lockTime: 15 phút`, và `access.unlock` chỉ cho admin.
- `/admin` có `noindex, nofollow`; draft preview chỉ nhận route cho phép và yêu cầu session admin/reviewer.

### Migration, Neon và seed

- Tạo Neon branch cố định `phase3-preview` (`br-curly-cake-b3t2pno0`).
- Migration `20260924_132306_phase3_schema`, batch 2: tạo schema thật và xóa `spike-pages`.
- Seed theo slug, có dry-run, hash nguồn, nhận biết `create/update/unchanged/conflict` và không ghi đè khi nội dung CMS đã lệch hash nguồn.
- Seed đúng phạm vi: 4 solutions, 4 case studies và 6 bài blog; không tạo 7 case study của Giai đoạn 4.
- Dry-run trên Preview: `create=14`, `conflict=0`.
- Seed thật trên Preview: `create=14`, `conflict=0`.
- Chạy lại: `unchanged=14`, `create=0`, `update=0`, `conflict=0`.
- Tách lệnh migration Development/Preview/Production bằng biến URL riêng. Production write bị chặn nếu thiếu `CONFIRM_PRODUCTION_MIGRATION=production`.

### Data adapter và frontend

- Giữ nguyên chữ ký `getSolutions()`, `getSolutionBySlug()`, `getCaseStudies()`, `getCaseStudyBySlug()`, `getPosts()` và `getPostBySlug()`.
- Domain model vẫn độc lập với type Payload sinh ra; mapping chỉ nằm trong repository.
- Khi `CONTENT_SOURCE=payload`, frontend đọc Payload; query public lọc `_status=published` rõ ràng.
- Draft Mode xác thực cookie Payload và chỉ mở cho admin/reviewer; Local API thay mặt user dùng `overrideAccess:false` cùng user thật.
- Khi database không truy cập được, repository dùng dữ liệu tĩnh hiện hữu làm fallback để build không thất bại. Đây là phương án khả dụng khi CMS tạm mất kết nối, không tạo nội dung mới.
- Blob adapter cho `media` được cấu hình qua `BLOB_READ_WRITE_TOKEN`, client upload bật và `altText` bắt buộc.

## Bằng chứng kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` với `CONTENT_SOURCE=static` | Pass, 37 trang |
| `npm run build` với `CONTENT_SOURCE=payload` + Neon Preview | Pass, các slug solution/case/blog lấy từ CMS |
| Build với `CONTENT_SOURCE=payload` + DB `127.0.0.1:1` | Pass; log xác nhận static fallback |
| Migration status Preview | Initial batch 1: Yes; Phase 3 batch 2: Yes |
| Seed dry-run | 14 create, 0 conflict |
| Seed thật lần đầu | 14 create, 0 conflict |
| Seed lần hai | 14 unchanged |
| Frontend dùng Payload Preview | `/solutions`, solution detail, case detail, blog detail: HTTP 200; `/api/case-studies`: HTTP 200 |
| Author tạo draft | Pass |
| Author approve/publish | Bị từ chối đúng thiết kế |
| Reviewer approve/publish/unpublish | Pass |
| Public query sau publish/unpublish | Thấy bản published; không thấy draft |
| Author unlock admin | Bị từ chối |
| Reviewer unlock admin | Bị từ chối |
| Media thiếu `altText` | Bị validation từ chối |
| Production migration guard | Write bị chặn khi thiếu xác nhận riêng |
| Vercel Preview | Ready tại `https://infratek-software-p8oc2p3e3-spi6.vercel.app` |
| Preview environment isolation | `DATABASE_URL`, `CONTENT_SOURCE` và `PAYLOAD_SECRET` giới hạn riêng cho branch `codex/phase-3-payload-neon` |
| Preview route thật | Solution, case study và blog detail render HTTP 200 từ Payload; case hiện nhãn “Tình huống minh họa” |
| Preview `/admin` | Payload chuyển về `/admin/login`; truy cập ngoài phiên Vercel trả 302 SSO, `X-Robots-Tag: noindex` |

Script kiểm thử workflow tạo dữ liệu tạm bằng Local API với `overrideAccess:false`, sau đó dọn case và ba user test bằng system override.

## Sự cố migration Production cần quyết định

Runner Giai đoạn 0 luôn ưu tiên `DATABASE_URL_UNPOOLED` trong `.env.local`. Trong lúc kiểm thử Phase 3, lệnh dự kiến nhắm Preview đã dùng direct URL Production và migration Phase 3 được ghi vào Production sớm hơn kế hoạch. Kiểm tra ngày 2026-09-25 xác nhận:

- Preview: migration Phase 3 `Ran: Yes`;
- Production: migration Phase 3 `Ran: Yes`;
- seed 14 nội dung chỉ chạy trên Preview, không chạy trên Production.

Runner đã được sửa để lỗi này không lặp lại. Chưa tự chạy `migrate:down` hay PITR trên Production vì đây là thao tác phá hủy schema mới và cần chủ dự án chọn một trong hai hướng:

1. giữ migration schema sớm trên Production, seed/deploy ở checkpoint phát hành Phase 3; hoặc
2. khôi phục Production về thời điểm trước migration, rồi chạy lại ở checkpoint phát hành.

## Audit lỗi và việc còn tồn tại

1. Chưa có `BLOB_READ_WRITE_TOKEN`, nên mới xác nhận adapter và validation alt text; chưa thể tải một ảnh thật lên Vercel Blob và kiểm tra URL Blob.
2. Vercel Preview đã dùng Neon `phase3-preview`, `CONTENT_SOURCE=payload`, `PAYLOAD_SECRET` riêng và Vercel Authentication; còn thiếu Blob token.
3. Production đã nhận schema Phase 3 sớm như mô tả trên; cần quyết định giữ hay khôi phục trước khi đóng giai đoạn.
4. Cảnh báo `pg` về semantics tương lai của `sslmode=require` không chặn hiện tại; connection đang mã hóa TLS, cần rà lại khi nâng major `pg-connection-string`/`pg`.
5. `npm audit` báo 7 mục (1 low, 6 moderate). Không tự nâng version ngoài phạm vi vì Next/Payload đang pin theo spike.
6. Ba technical debt cũ vẫn nằm trong `docs/OPEN-ITEMS.md`; không thay đổi trong giai đoạn này.

## Checklist điều kiện hoàn thành Giai đoạn 3

- [x] Có thể tạo, duyệt, xuất bản và gỡ xuất bản một case study.
- [x] Frontend chỉ hiển thị nội dung published.
- [ ] Ảnh tồn tại trên Blob và có alt text. Alt validation đã đạt; upload Blob thật chờ token.
- [x] `reviewState` và `_status` hoạt động độc lập đúng như thiết kế; không có field nào tên `status` trong collection bật drafts.
- [x] Local API operation thay mặt người dùng đặt `overrideAccess:false` và truyền user thật; chỉ script nội bộ mới override quyền.
- [x] Có test xác nhận Author và Reviewer không thể unlock tài khoản admin.
- [ ] Deploy Preview hiện đã tách biến branch và đọc đúng Neon Preview, nhưng điều kiện tổng thể chưa thể đánh dấu đạt vì Production đã nhận migration sớm trước lúc deploy và cần quyết định xử lý.
- [x] `/admin` có authentication, `maxLoginAttempts`/`lockTime`, `access.unlock` override, quyền tối thiểu theo vai trò và `noindex`.
- [x] Đã thử build khi database không truy cập được; static fallback giúp build hoàn tất.
- [ ] Chủ dự án xác nhận kết quả và quyết định đóng Giai đoạn 3.

Không tự đánh dấu Giai đoạn 3 hoàn tất.
