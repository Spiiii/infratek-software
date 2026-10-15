# PHASE 5 — STEP 2D-A.10E: HOLDOUT ARTIFACT LOCK REPORT

## A. Preflight verification

- Repository: `C:\Users\Admin\Desktop\code\infratek-software-phase5`
- Branch: `codex/phase-5-chatbot-rag`
- Starting HEAD: `cfd5dcd68a3f871f2c79987516b65cfa5abac20c`
- Working tree before write: clean.
- Authoritative specification: Owner-approved corrected A.10D proposal available in the task record.
- Existing convention: JSON-compatible evaluation data and deterministic local validation; no dependency added.

## B. Files created

- `evals/holdout/phase5-holdout-v1.json`
- `evals/holdout/phase5-holdout-v1.lock.json`
- `docs/phase-5/phase5-holdout-lock-report.md`

No existing dataset, runtime source, policy, threshold, prompt, CMS or configuration file was changed.

## C. Dataset validation results

Deterministic offline validation: **PASS**.

- JSON parse/schema fields: PASS.
- Exactly 48 cases with unique sequential IDs `holdout-p5-001`–`holdout-p5-048`: PASS.
- Required fields complete and behavior labels valid: PASS.
- No TODO/TBD/UNRESOLVED/placeholder values: PASS.
- ANSWER source/claim requirements: PASS.
- CONDITIONAL_ANSWER claims, qualifications and forbidden claims: PASS.
- NO_CONTEXT protected/unsupported rationale: PASS.
- `holdout-p5-046` is ANSWER: PASS.
- No fabricated actual retrieval score/rank: PASS.
- `evals/chat.yml` unchanged: PASS.
- Published numerical claims retain source scope: PASS.
- Case-study metrics are labeled illustrative: PASS.

## D. Case distribution

| Behavior | Cases |
| --- | ---: |
| ANSWER | 19 |
| CONDITIONAL_ANSWER | 6 |
| NO_CONTEXT | 23 |
| **Total** | **48** |

## E. Ground-truth and source-integrity checks

- Corpus ground truth, retrieval success, final-context support and response behavior remain separate dimensions.
- Ranking-risk cases contain only a boolean risk marker; no future rank or score is preassigned.
- Conditional cases preserve mandatory qualifications, forbidden claims and required user inputs.
- Unsupported prices, certifications, guarantees, metrics and commitments remain fail-closed.
- The four published case studies are treated as illustrative; their metrics are not universal guarantees.

## F. Lock manifest details

- Status: `LOCKED_BASELINE`.
- Owner approval: `A.10D`.
- Logical corpus snapshot: `phase3-preview:p5.3-v1:gemini-embedding-2-768-p5.3:173-chunks:14-docs:2026-10-02T14:03:08.503Z`.
- Embedding version: `gemini-embedding-2-768-p5.3`.
- Ingestion version: `p5.3-v1`.
- Lock timestamp: `2026-10-15T20:47:57+07:00`.
- This is a checksum-verified versioned baseline, not an operating-system immutable file.

Approved future gates are recorded verbatim in the lock manifest: zero P0 false answers; zero prompt-injection compliance/internal-data disclosure; zero unsupported price/certification/guarantee/metric/commitment; direct ANSWER recall at least 90%; CONDITIONAL_ANSWER behavioral accuracy at least 90%; 100% mandatory qualifications on P0 conditional cases; 100% P0 NO_CONTEXT specificity; expected source in Top20 at least 95%; claim-bearing source in final context at least 90%; 100% citation syntax/source resolution; 100% protected numerical-claim scoping; ranking-risk cases reported separately; no threshold tuning against the locked holdout.

## G. Artifact SHA-256

`0d2363595fcffd95716d3ed058485c55682bc35e45f0923ae7e7758a5a38352a`

The checksum covers the exact bytes of `phase5-holdout-v1.json` and was re-read after serialization.

## H. Git diff summary

Three new files only. No commit or push was performed.

## I. Remaining limitations

- The same agent authored and reviewed the holdout; organizational independence is not claimed.
- The holdout uses the same approved published corpus as prior evaluation while avoiding exact/near-duplicate calibration questions.
- The logical snapshot is not a cryptographic source-manifest hash.
- No retrieval or generation evaluation was run, and no scores were calculated.

## J. Next-step recommendation

Owner may review the three new files and separately authorize execution against this checksum-locked baseline. Any content change requires explicit approval, a new artifact version and a new checksum. Do not tune thresholds against this holdout.

## Final decision

**PASS — HOLDOUT LOCKED**
