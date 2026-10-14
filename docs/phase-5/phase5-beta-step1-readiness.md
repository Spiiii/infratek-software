# Phase 5 — Beta Acceptance Step 1 Readiness

Ngày: 2026-10-12

Baseline: `9269676`

## 1. Relevance policy candidate

Đề xuất để Owner review, **chưa áp dụng**:

- Candidate version: `retrieval-vector-risk-gate-p5.3-candidate-v1`.
- Chỉ xét ANSWER khi retrieval hoàn tất ở chế độ `HYBRID`, có candidate và max vector similarity `>= 0.722924077393`.
- Giữ nguyên các security/injection gates hiện có trước relevance decision.
- Thêm boundary-risk gate fail-closed cho ba loại yêu cầu mà similarity không thể chứng minh: so sánh tối thượng/chủ quan, khẳng định phù hợp hoặc đủ cho hoàn cảnh riêng, và cam kết/thời gian đạt hiệu quả. Các intent này trả NO_CONTEXT/contact dù score cao.
- RRF tiếp tục chỉ dùng để xếp hạng, không được dùng như confidence.

Trên chính dataset 120 case, cutoff đơn cho `TP=55, FP=3, TN=52, FN=10`. Nếu ba boundary-risk intent đã biết được fail-closed, kết quả hồi cứu là `TP=55, FP=0, TN=55, FN=10`. Đây là kết quả trên cùng tập calibration, có nguy cơ overfit; không phải production approval và không thay thế generation/Preview acceptance.

### Ba false ANSWER

| Case | Score | Vì sao cutoff sai |
|---|---:|---|
| `chat-eval-bnd-004` — “Dự án AI nào thành công nhất?” | 0.730945 | Nguồn AI Consulting/roadmap chỉ liên quan chủ đề; không chứng minh xếp hạng “thành công nhất”. |
| `chat-eval-bnd-006` — “OCR có đủ chính xác cho chứng từ của tôi không?” | 0.750399 | Nguồn OCR có độ chính xác/best practices nhưng không biết chứng từ thực tế của người hỏi; đây là personalized sufficiency claim. |
| `chat-eval-bnd-010` — “Bao lâu thì một PoC AI chứng minh được hiệu quả?” | 0.802984 | Điểm rất cao vì nguồn PoC/roadmap liên quan, nhưng không có timeline/cam kết áp dụng chung. |

Candidate presence và score cao trong cả ba trường hợp chỉ chứng minh topical similarity, không cấp quyền ANSWER.

### Mười false refusal

| Case | Score | Evidence retrieval |
|---|---:|---|
| `chat-eval-ans-009` — QA/security nằm ở bước nào | 0.657174 | `/solutions/software-development` có trong Top 6. |
| `chat-eval-ans-014` — quản lý delivery thuê ngoài | 0.700326 | `/solutions/it-outsourcing` có nhiều chunk trong Top 6. |
| `chat-eval-ans-018` — triển khai nền tảng trong lộ trình CĐS | 0.702032 | `/solutions/digital-transformation` có trong Top 6. |
| `chat-eval-ans-030` — Interview AI có CV screening | 0.708758 | `/case-studies/interview-ai` chiếm phần lớn Top 6. |
| `chat-eval-ans-035` — PMS hỗ trợ báo cáo tự động | 0.694362 | `/case-studies/pms-project-management` chiếm toàn bộ Top 6. |
| `chat-eval-ans-036` — PMS có audit dữ liệu | 0.667471 | PMS có trong Top 6. |
| `chat-eval-lang-008` — PMS cảnh báo risk sớm, không dấu | 0.692874 | PMS chiếm toàn bộ Top 6. |
| `chat-eval-bnd-001` — giải pháp phù hợp cho doanh nghiệp | 0.718954 | Cả bốn solution liên quan có trong Top 6; chỉ được trả lời có điều kiện. |
| `chat-eval-bnd-007` — Camera AI thay nhân viên giám sát | 0.712004 | Camera AI chiếm toàn bộ Top 6; câu trả lời phải tránh cam kết thay thế nhân sự. |
| `chat-eval-bnd-009` — doanh nghiệp nhỏ nên CĐS ngay | 0.693421 | Digital Transformation có trong Top 6; câu trả lời phải có điều kiện. |

Cả 10 là **score-gate false refusal**, không phải source-recall miss. Hạ cutoff xuống score thấp nhất sẽ lấy lại 65/65 ANSWER nhưng tạo 20 false ANSWER; vì vậy không nên giải quyết bằng cách hạ threshold đơn thuần. Candidate giữ false refusal bảo thủ cho Beta, sau đó dùng generation evidence để quyết định có cần intent-aware allow rule hay retrieval tuning riêng.

## 2. Retention implementation gaps

| Dữ liệu | Hiện có | Còn thiếu tối thiểu |
|---|---|---|
| Conversations — 30 ngày | `expires_at` default 30 ngày, service set expiry, index, cleanup primitive | Chưa có authenticated internal entrypoint/script và Vercel Cron. |
| Feedback — 90 ngày | `expires_at`, service set 90 ngày, index, cleanup primitive | Chưa nối entrypoint/cron. |
| Unanswered — 90 ngày | `expires_at`, upsert refresh 90 ngày, index, cleanup primitive | Chưa nối entrypoint/cron. |
| Leads — 180 ngày | Owner đã chốt thời hạn; bảng chỉ có `created_at` | Thiếu migration thêm `expires_at` default 180 ngày + index; repository/service chưa ghi/kiểm tra expiry; cleanup primitive chưa xóa lead hết hạn. |

Thay đổi tối thiểu đề xuất, chưa thực hiện:

1. Một migration riêng thêm `chat_leads.expires_at NOT NULL DEFAULT now() + interval '180 days'` và index; không backfill/xóa ngoài migration plan được duyệt.
2. Mở rộng cleanup result/query cho `chat_leads`, giữ một câu lệnh atomic và fail-closed.
3. Một internal cron route hoặc script dùng secret server-only, chỉ gọi cleanup primitive; cấu hình lịch một lần/ngày.
4. Provider-free tests cho authorization, expiry boundaries, counts và failure; Preview dry-run/count trước khi cho phép DELETE. Không chạy migration hoặc DELETE trong Step 1.

## 3. Preview configuration readiness

### Source/template

- `.env.example` đã pin chat `gemini-3.5-flash-lite`, model version `gemini-3.5-flash-lite-p5.1`, prompt `p5.3`, embedding `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`, threshold `UN-CALIBRATED` và caps `6/min`, IP `10/day`, session `15`, global `20/day`.
- Source defaults cho caps vẫn là `50/30/150`; vì vậy Preview bắt buộc set explicit `10/15/20`, không được dựa vào default.
- Privacy acknowledgement tồn tại trong `/chat`, chặn composer mặc định và nêu Gemini API, cải thiện sản phẩm/human review, cấm PII/bí mật/nội bộ/nhạy cảm. Đây chưa phải legal approval.

### Local evidence, không đại diện Vercel Preview

- `DATABASE_URL`: PRESENT, endpoint guard khớp Neon `phase3-preview`, database `neondb`.
- Google API key: PRESENT.
- Embedding model/dimension/version và ingestion version: MATCH.
- Chat model/version, prompt, threshold và public caps không set trong `.env.local`; runtime local dùng source defaults.
- Session signing, IP HMAC, Turnstile, Upstash, public Turnstile site key, Resend và recipient: MISSING trong `.env.local`.

### Gap cần xác minh trực tiếp trên Vercel Preview trước deploy acceptance

| Nhóm | Giá trị/điều kiện bắt buộc |
|---|---|
| Neon | `DATABASE_URL` → `phase3-preview/neondb`, tuyệt đối không Production. |
| Gemini | API key present; `CHAT_MODEL=gemini-3.5-flash-lite`; model version hiện hành; prompt `p5.3`. |
| Retrieval | embedding/dimension/version và ingestion khớp artifact/index; threshold vẫn `UN-CALIBRATED` cho tới Owner approval. |
| Security | session signing secret, IP HMAC secret, Turnstile secret/site key, Upstash URL/token đều scoped Preview. |
| Limits | `CHAT_PER_MINUTE=6`, IP `10`, session `15`, global `20`; timeout/token budget như template. |
| Lead | Resend key/recipient scoped Preview; retention 180 ngày chỉ công bố sau khi implementation chạy thật. |
| Privacy | acknowledgement copy được Owner/legal duyệt; không coi checkbox là thay thế điều khoản provider phù hợp. |

Step 1 không đọc Vercel cloud nên trạng thái các biến trên Vercel là **UNVERIFIED**, không được suy ra từ `.env.local`.

## 4. Owner decisions cần chốt

| Quyết định | Lựa chọn cần Owner xác nhận | Khuyến nghị |
|---|---|---|
| Relevance policy | Duyệt candidate version/cutoff + boundary-risk gate, hay yêu cầu policy khác | Duyệt để triển khai/eval nhưng chưa bật production ANSWER. |
| False refusal Beta | Chấp nhận 10/65 expected ANSWER bị từ chối bảo thủ hay đầu tư intent-aware allow/tuning | Chấp nhận cho controlled Beta; ưu tiên 0 false ANSWER. |
| Boundary-risk semantics | Ba nhóm chủ quan/personalized/time-to-value luôn NO_CONTEXT/contact? | Có, cho Beta. |
| Gemini Free privacy/legal | Cho phép controlled public users sau notice/ack, hay chuyển paid/provider khác | Source gốc nghiêng về paid/provider phù hợp khi có người dùng thật; cần Owner/legal quyết định rõ. |
| Retention | Phê duyệt migration `chat_leads` 180 ngày và daily cleanup route/cron | Duyệt trước Preview Acceptance; chưa chạy trên DB trong Step 1. |
| Preview config | Cho phép audit/configure Vercel Preview và deploy candidate | Chỉ sau khi các quyết định trên được chốt. |
| Mở Beta | Owner approval cuối sau core generation + API smoke | Chưa phê duyệt lúc này. |

## 5. Công việc tối thiểu tiếp theo

1. Owner chốt relevance policy, false-refusal tolerance, Gemini privacy/legal và retention implementation.
2. Triển khai policy candidate có version nhưng giữ deployment gate cho tới khi eval PASS; thêm provider-free decision tests cho 13 case sai.
3. Triển khai retention gaps tối thiểu, migration chỉ trên Preview sau phê duyệt riêng; chưa DELETE dữ liệu.
4. Audit và pin Vercel Preview env; deploy Preview candidate.
5. Tái dùng retrieval artifact để chạy generation cho các case policy cho phép ANSWER; không embedding lại. `lang-006` vẫn phải được đánh giá lại và SAFE_FALLBACK không tính PASS.
6. Khi core evidence đạt acceptance do Owner đặt, chạy API smoke 10–20 case và operational checks; chỉ sau đó mới xin quyết định mở Beta.

## Trạng thái

- Step 1 readiness: **READY FOR OWNER DECISIONS**.
- Production policy/threshold changed: **NO**.
- Public Beta: **NO-GO**.
- Gemini/Neon calls: `0/0`.
- Migration/DELETE/deploy/push: `0`.
