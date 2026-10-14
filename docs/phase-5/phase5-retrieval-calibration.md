# Phase 5 — Retrieval calibration p5.2

**Ngày:** 11/10/2026

**Baseline:** `6baf353`

**Kết luận:** `INSUFFICIENT_EVIDENCE` để mở production `ANSWER`; production tiếp tục `CALIBRATION_REQUIRED` / `UN-CALIBRATED`.

## Artifact và phương pháp

- Artifact `p57-beta-p52-retrieval-120-20261011-a` có SHA-256 `d47d365f0369c9defc51a2d290db7d3b3c11e81ebb89bf462c73c380d80a6db7`: **PASS**.
- `COMPLETED`, 120/120 case duy nhất, 120 embedding calls, 240 logical reads, 0 generation, 0 retry; schema và version guard: **PASS**.
- Version: embedding `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`, prompt `p5.2`, threshold `UN-CALIBRATED`.
- Dùng evaluator offline hiện có cho decision scoring. Sweep chỉ dùng **maximum vector similarity** quan sát được trên mỗi query; RRF chỉ dùng để xếp hạng và không được coi là confidence.

## Kết quả retrieval

Dataset có 65 expected `ANSWER` và 55 expected `NO_CONTEXT`. Expected source xuất hiện trong vector/RRF Top 20 ở **65/65**, và final Top 6 ở **64/65**.

| Category chuẩn | Expected ANSWER | Expected NO_CONTEXT | Ghi chú |
|---|---:|---:|---|
| SITE_ANSWER | 45 | 0 | Final Top 6 hit 44/45 |
| NO_SITE_ANSWER | 0 | 30 | Candidate presence không cho phép ANSWER |
| ATTACK_OR_OFF_TOPIC | 0 | 20 | Candidate presence không vô hiệu hóa refusal/injection policy |
| LANGUAGE_VARIANT | 15 | 0 | Final Top 6 hit 15/15 |
| REVIEW_OVERLAY | 5 | 5 | Hai lớp chồng lấn mạnh, cần policy riêng hoặc review |

## Threshold sweep

| Cách chọn | Vector similarity threshold | TP | FP | TN | FN | Nhận xét |
|---|---:|---:|---:|---:|---:|---|
| Balanced accuracy cao nhất | `0.722924077393` | 55 | 3 | 52 | 10 | Balanced accuracy 89.58%; recall ANSWER 84.62% |
| F1 cao nhất | `0.698910912840` | 60 | 8 | 47 | 5 | Tăng recall nhưng false ANSWER tăng lên 8 |
| Không false ANSWER trong sample | `0.802984344249` | 6 | 0 | 55 | 59 | Không có giá trị sử dụng thực tế: từ chối 90.77% ANSWER |

Tại candidate balanced `0.722924077393`, confusion theo category:

| Category | TP | FP | TN | FN |
|---|---:|---:|---:|---:|
| SITE_ANSWER | 39 | 0 | 0 | 6 |
| NO_SITE_ANSWER | 0 | 0 | 30 | 0 |
| ATTACK_OR_OFF_TOPIC | 0 | 0 | 20 | 0 |
| LANGUAGE_VARIANT | 14 | 0 | 0 | 1 |
| REVIEW_OVERLAY | 2 | 3 | 2 | 3 |

Ba false ANSWER đều thuộc boundary: `chat-eval-bnd-004`, `chat-eval-bnd-006`, `chat-eval-bnd-010`. Mười false NO_CONTEXT gồm 6 ANSWERABLE, 1 LANGUAGE_VARIANT và 3 boundary. Evaluator hiện có chỉ định nghĩa `falseAnswer` cho missing-context/attack, nên báo cáo này bổ sung 3 boundary false positives vào confusion matrix đầy đủ thay vì che khuất chúng.

## Candidate cho Owner review

- Candidate threshold: maximum vector similarity `>= 0.722924077393`.
- Candidate version: `retrieval-vector-sim-p5.2-candidate-v1`.
- Đây chỉ là điểm sweep có balanced accuracy cao nhất, **không phải production approval**. Nó vẫn tạo 3/55 false ANSWER và không có semantic claim/citation evidence cho toàn bộ 120 case. Không có single threshold nào vừa đạt 0 false ANSWER vừa giữ recall hữu ích.
- Vì vậy trạng thái calibration là **`INSUFFICIENT_EVIDENCE`**; không đổi config, policy hoặc threshold version production.

## `chat-eval-ans-001`

- Top vector similarity `0.7668281426080784`, nên candidate threshold sẽ phân loại `ANSWER`.
- `/solutions/ai-consulting` nằm ở vector/RRF ranks 9, 17 và 20; FTS trả 0 candidate.
- Khi FTS rỗng, RRF giữ nguyên trật tự vector. Final Top 6 bị chiếm bởi các chunk của `/blog/enterprise-ai-adoption-roadmap-2025` và `/blog/digital-transformation-ai-first`, nên expected source rơi khỏi Top 6.
- Đây là expected-source miss do ranking/top-k concentration, không chứng minh các blog chunk đủ semantic support. Không thay đổi top-k, FTS hay fusion trong checkpoint này.

## Rủi ro và bước tiếp theo

- Retrieval-only evidence không đánh giá answer correctness, citation-to-claim grounding hoặc protected claims; evaluator đánh dấu các ANSWER thiếu evidence này là `NOT_RUN`, không phải PASS.
- Boundary queries chồng lấn score với ANSWER; một cutoff vector duy nhất chưa đủ an toàn.
- FTS có candidate ở 3/120 case, nhưng tuning nằm ngoài phạm vi.
- **GO** cho generation smoke p5.2 có kiểm soát, dùng lại artifact và final Top 6, không embedding lại. **NO-GO** cho mở production ANSWER hoặc áp candidate threshold trước Owner review và generation/grounding evidence.

## Node runner exit

Runner đã ghi artifact và in summary `COMPLETED`, nhưng process không tự thoát sau hơn 45 giây và phải nhận `Ctrl+C`; artifact đã hoàn chỉnh trước thao tác này. `withManagedRetrievalExecutor()` đã gọi `payload.destroy()` trong `finally`, và focused mocks chỉ chứng minh cleanup callback được gọi—không xác định được handle thật còn mở từ Payload/Postgres hay Google SDK.

Provider-free lifecycle mocks PASS **5/5** (success/error đều gọi cleanup đúng một lần, evidence có trước cleanup, executor vẫn lazy). Tuy nhiên test/import thật của `payload.config.ts` không hoàn tất trong cửa sổ diagnostic 60 giây và phải dừng; điều này chỉ chứng minh bootstrap thật không được bao phủ bởi mocks, chưa chứng minh handle nào gây post-run hang.

Root cause hiện **UNKNOWN**. Không có live rerun được phép để chụp active handles sau `COMPLETED`, nên không đủ bằng chứng cho một sửa đổi nhỏ an toàn; không sửa code lifecycle trong checkpoint này.
