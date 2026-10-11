# Phase 5 — Safe retrieval evidence reuse

Ngày: 2026-10-12  
Baseline: `a5e8036`  
Kết quả: **REUSE: READY**

## Bằng chứng tương thích

- Artifact nguồn: `p57-beta-p52-retrieval-120-20261011-a/retrieval-evidence.json`.
- SHA-256 xác minh: `d47d365f0369c9defc51a2d290db7d3b3c11e81ebb89bf462c73c380d80a6db7`.
- Trạng thái `COMPLETED`, mode `LIVE`, đủ `120/120` case ID duy nhất.
- Source versions giữ nguyên: model `gemini-3.5-flash-lite-p5.1`, embedding `gemini-embedding-2-768-p5.3`, ingestion `p5.3-v1`, threshold `UN-CALIBRATED`, prompt `p5.2`.
- Diff `6baf353..a5e8036` không thay đổi query construction, embedding adapter/model/dimension, ingestion, vector search, FTS, RRF `k=60`, Top 6, source identity/URL/hash hoặc hydration. Thay đổi chỉ thuộc generation prompt/structured response contract và tests/version declaration.

## Compatibility rule

- Chỉ generation evaluator hỗ trợ opt-in `--allow-p52-retrieval-for-p53-generation`.
- Chỉ đúng cặp source prompt `p5.2` → generation prompt `p5.3` được phép; mọi mismatch model/embedding/ingestion/threshold/dataset khác vẫn bị từ chối.
- Opt-in bắt buộc cung cấp `--expected-retrieval-sha256`; thiếu, sai định dạng hoặc không khớp artifact đều fail closed.
- Generation evidence ghi riêng `sourceRetrievalVersions` (`p5.2`) và generation `versions` (`p5.3`); artifact lịch sử không bị sửa, copy hoặc relabel.
- Identity, URL, content hash, source ordering và hydrated Top 6 guards giữ nguyên.
- Production runtime/decision policy không thay đổi; `CALIBRATION_REQUIRED` và `UN-CALIBRATED` giữ nguyên.

## Kiểm thử

- Focused generation evaluator: `19/19 PASS`.
- Typecheck: `PASS`.
- `git diff --check`: `PASS`.
- Dry-run trên artifact thật: `PASS`, 1 case, 0 generation, 0 embedding, 0 Neon.

Đã kiểm tra: opt-in đúng cặp; mặc định vẫn reject; mismatch khác reject; artifact incomplete/STOPPED reject; SHA tampered reject; hydration identity/hash không thể bypass.

## Lệnh single-case diagnostic — chưa chạy

```powershell
npm run eval:chat:generation -- `
  --run-id p57-p53-lang006-diagnostic-20261012 `
  --live `
  --retrieval-artifact "C:\Users\Admin\AppData\Local\Temp\infratek-p5.7e\p57-beta-p52-retrieval-120-20261011-a\retrieval-evidence.json" `
  --expected-retrieval-sha256 d47d365f0369c9defc51a2d290db7d3b3c11e81ebb89bf462c73c380d80a6db7 `
  --allow-p52-retrieval-for-p53-generation `
  --case-id chat-eval-lang-006 `
  --max-cases 1 `
  --max-generation-calls 1 `
  --output-dir "C:\Users\Admin\AppData\Local\Temp\infratek-p5.7e-generation-p57-p53-lang006-diagnostic-20261012"
```

Ngân sách tối đa khi Owner phê duyệt chạy lệnh: 1 Gemini generation call, 1 Neon Preview read-only hydration batch, 0 embedding, 0 retrieval rerun, 0 write, 0 retry.

## Rủi ro còn lại

- Nếu nội dung Preview hiện tại khác content hash đã index, hydration sẽ dừng; không tự thay nguồn.
- Structured output p5.3 chưa được kiểm chứng bằng live generation trong lượt này.
- Reuse chứng minh tính ổn định của retrieval evidence, không thay thế semantic review câu trả lời generation.

Provider calls trong lượt này: `0`. Neon reads/writes: `0/0`. Push/deploy: không thực hiện.
