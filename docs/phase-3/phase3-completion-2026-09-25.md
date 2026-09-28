# Phase 3 — Payload, Neon và Blob

Date checked: 2026-09-28
Baseline checkpoint: `5831618`  
Implementation branch: `codex/phase-3-payload-neon`  
Status: **Chờ chủ dự án xác nhận đóng Giai đoạn 3** — toàn bộ điều kiện kỹ thuật đã đạt; phương án giữ nguyên schema Production đã được chủ dự án chấp thuận.

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
- Tạo migration `20260925_133726_add_media_blob_fields`, batch 3, bổ sung `media.prefix` và `media._objectkey` mà Blob adapter yêu cầu; migration chỉ chạy trên Neon `phase3-preview`.
- Ảnh Dashboard CRM chỉ tồn tại dưới dạng Media kỹ thuật; không tạo case study CRM hay nội dung Giai đoạn 4.

## Bằng chứng kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` với `CONTENT_SOURCE=static` | Pass, 37 trang |
| `npm run build` với `CONTENT_SOURCE=payload` + Neon Preview | Pass, các slug solution/case/blog lấy từ CMS |
| Build với `CONTENT_SOURCE=payload` + DB `127.0.0.1:1` | Pass; log xác nhận static fallback |
| Migration status Preview | Initial batch 1: Yes; Phase 3 batch 2: Yes; Blob fields batch 3: Yes |
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
| Media thiếu `altText` | Upload qua Payload Admin bị từ chối với `The following field is invalid: Alt Text` |
| Blob upload thật | Payload Media ID `1`, `1.png`, 110265 bytes, 1748×788, `image/png`; alt text đúng nội dung được duyệt |
| Blob URL trực tiếp | `https://0krlas00jkd6rp2e.public.blob.vercel-storage.com/infratek-media/2a66c6da-bce7-4714-8c8d-fa8e8d2dfb55/1.png`: HTTP 200, `Content-Type: image/png`, hiển thị 1748×788 |
| Production migration guard | Write bị chặn khi thiếu xác nhận riêng |
| Production content source | `CONTENT_SOURCE` không tồn tại trong Production scope; code dùng static |
| Production bootstrap admin | Payload login pass; role là `admin` |
| Preview-vs-Production URL guard | Pass; Production endpoint dưới biến Preview bị chặn trước Payload CLI |
| Vercel Preview | Ready tại `https://infratek-software-if0o9vthf-spi6.vercel.app` sau khi nạp biến Blob |
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

### Xác minh an toàn Production sau sự cố

- Vercel Environment Variables ngày 2026-09-25 cho thấy `CONTENT_SOURCE` chỉ áp dụng cho `Preview` và riêng branch `codex/phase-3-payload-neon`. Production không có biến này. Hàm `shouldUsePayload()` chỉ trả true khi giá trị bằng chính xác `payload`; vì vậy deployment Production hiện tiếp tục dùng nguồn static.
- `https://www.infratek.vn/admin` hiện trả trang 404 của source Production cũ, nên chưa có giao diện Payload để đăng nhập trực tiếp. Không diễn giải kiểm tra này thành UI admin đã đạt.
- Thay vào đó, `npm run verify:production-admin` đã dùng Payload auth với đúng Production DB và tài khoản bootstrap Giai đoạn 0. Kết quả: `login=passed`, email `trong.ngo@infratek.vn`, `role=admin`. Không cần migration backfill role.
- Nguyên nhân guard xác nhận Production không chặn sự cố: tại thời điểm lệnh nhầm chạy, runner Giai đoạn 0 chưa có target hoặc guard và luôn thay `DATABASE_URL` bằng `DATABASE_URL_UNPOOLED` từ `.env.local`. Guard `CONFIRM_PRODUCTION_MIGRATION` chỉ được thêm sau khi phát hiện sự cố; phiên bản đầu của guard này cũng chỉ chạy khi lệnh mang `--target=production`, nên không thể nhận biết một URL Production bị đặt dưới tên biến hoặc ý định Preview.
- Runner hiện kiểm tra endpoint Neon thực trong connection string trước khi spawn Payload: Preview chỉ chấp nhận `ep-nameless-leaf-b3fc4hoi`, Production chỉ chấp nhận `ep-still-fog-b3h6yj1y`. Việc đổi tên biến không vượt qua được kiểm tra.
- `npm run verify:phase3:migration-guard` kiểm tra cả validator và runner integration. Khi `DATABASE_URL_PREVIEW_UNPOOLED` cố ý chứa URL Production, runner thoát khác 0 với `Refusing preview migration` trước khi Payload CLI được spawn.

## Audit lỗi và việc còn tồn tại

1. `BLOB_READ_WRITE_TOKEN` đã được tạo và giới hạn ở Preview. Blob store `infratek-phase3-preview` là Public, vùng SIN1; ảnh thật đã được upload thành công qua Payload Media.
2. Lần thử thiếu `altText` bị Payload từ chối bản ghi đúng thiết kế. Vì client upload diễn ra trước validation record, thử nghiệm này để lại một Blob ảnh trùng không gắn với Media record tại object key `96347f61-4d40-4e69-bccf-43f4a83b2684`. Không tự xóa vì xóa dữ liệu cloud cần xác nhận riêng.
3. Production đã nhận schema Phase 3 sớm như mô tả trên; chủ dự án đã chọn phương án 1: giữ nguyên schema Production và không cutover `CONTENT_SOURCE` cho tới quyết định riêng.
4. Cảnh báo `pg` về semantics tương lai của `sslmode=require` không chặn hiện tại; connection đang mã hóa TLS, cần rà lại khi nâng major `pg-connection-string`/`pg`.
5. `npm audit` báo 7 mục (1 low, 6 moderate). Không tự nâng version ngoài phạm vi vì Next/Payload đang pin theo spike.
6. Ba technical debt cũ vẫn nằm trong `docs/OPEN-ITEMS.md`; không thay đổi trong giai đoạn này.

## Checklist điều kiện hoàn thành Giai đoạn 3

- [x] Có thể tạo, duyệt, xuất bản và gỡ xuất bản một case study.
- [x] Frontend chỉ hiển thị nội dung published.
- [x] Ảnh tồn tại trên Blob và có alt text; upload thiếu alt bị validation từ chối.
- [x] `reviewState` và `_status` hoạt động độc lập đúng như thiết kế; không có field nào tên `status` trong collection bật drafts.
- [x] Local API operation thay mặt người dùng đặt `overrideAccess:false` và truyền user thật; chỉ script nội bộ mới override quyền.
- [x] Có test xác nhận Author và Reviewer không thể unlock tài khoản admin.
- [x] Deploy Preview tách biến branch, đọc đúng Neon Preview, Blob token chỉ ở scope Preview; chủ dự án đã chọn giữ schema Production và Production tiếp tục dùng nội dung static.
- [x] `/admin` có authentication, `maxLoginAttempts`/`lockTime`, `access.unlock` override, quyền tối thiểu theo vai trò và `noindex`.
- [x] Đã thử build khi database không truy cập được; static fallback giúp build hoàn tất.
- [ ] Chủ dự án xác nhận kết quả và quyết định đóng Giai đoạn 3.

Không tự đánh dấu Giai đoạn 3 hoàn tất.
