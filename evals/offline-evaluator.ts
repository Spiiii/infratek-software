import { z } from "zod";

import { validateGeneratedCitations } from "../src/lib/chat/grounding/citations.ts";
import { validateProtectedOutput } from "../src/lib/chat/safety/output.ts";
import type { SourceLabel } from "../src/lib/chat/retrieval/types.ts";
import type { ChatEvalDataset } from "./validate-chat-dataset.ts";

const sourceLabelSchema = z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]);
const decisionSchema = z.enum(["ANSWER", "NO_CONTEXT"]);
const evidenceStatusSchema = z.enum(["SUPPORTED", "UNSUPPORTED", "NOT_EVALUATED"]);

const selectedSourceSchema = z.object({
  label: sourceLabelSchema,
  docType: z.string().trim().min(1),
  docId: z.string().trim().min(1),
  chunkKey: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  url: z.string().trim().refine((value) => value.startsWith("/") || URL.canParse(value), "Invalid source URL"),
  diagnostics: z.object({
    vectorRank: z.number().int().positive().optional(),
    ftsRank: z.number().int().positive().optional(),
    vectorSimilarity: z.number().finite().optional(),
    ftsScore: z.number().finite().optional(),
    rrfScore: z.number().finite().optional(),
  }).strict().optional(),
}).strict();

const retrievalSchema = z.object({
  mode: z.enum(["HYBRID", "VECTOR_ONLY", "FTS_ONLY", "UNAVAILABLE"]),
  candidateState: z.enum(["HAS_CANDIDATES", "NO_CANDIDATES", "UNKNOWN"]),
  relevanceState: z.enum(["UN_CALIBRATED", "NO_CONTEXT", "ACCEPTED", "UNAVAILABLE"]),
  vectorCandidateCount: z.number().int().nonnegative().optional(),
  ftsCandidateCount: z.number().int().nonnegative().optional(),
  fusedCandidateCount: z.number().int().nonnegative().optional(),
  selectedSourceCount: z.number().int().nonnegative().optional(),
  failures: z.array(z.string().trim().min(1)).default([]),
}).strict();

const versionsSchema = z.object({
  model: z.string().trim().min(1),
  embedding: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  ingestion: z.string().trim().min(1),
  threshold: z.string().trim().min(1),
}).strict();

const recordedCaseSchema = z.object({
  caseId: z.string().trim().min(1),
  actualDecision: decisionSchema.optional(),
  answerText: z.string().optional(),
  retrieval: retrievalSchema.optional(),
  selectedSources: z.array(selectedSourceSchema).default([]),
  citationSupport: z.array(z.object({
    label: sourceLabelSchema,
    status: evidenceStatusSchema,
    reason: z.string().trim().min(1).optional(),
  }).strict()).optional(),
  trustedContext: z.string().optional(),
  latencyMs: z.object({
    retrieval: z.number().nonnegative().optional(),
    generation: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
  }).strict().optional(),
}).strict();

export const recordedEvaluationSchema = z.object({
  datasetVersion: z.string().trim().min(1),
  evaluatedAt: z.string().datetime({ offset: true }),
  versions: versionsSchema,
  cases: z.array(recordedCaseSchema),
}).strict();

export type RecordedEvaluation = z.infer<typeof recordedEvaluationSchema>;
export type EvaluationState = "PASS" | "FAIL" | "NOT_RUN";
export type EvidenceState = "PASS" | "FAIL" | "NOT_EVALUATED";

type EvidenceResult = { state: EvidenceState; reason?: string };

export type EvaluatedCase = {
  caseId: string;
  analyticalGroup: ChatEvalDataset["cases"][number]["group"];
  canonicalCategory: string;
  expectedDecision: "ANSWER" | "NO_CONTEXT";
  actualDecision: "ANSWER" | "NO_CONTEXT" | null;
  decisionOutcome: EvaluationState;
  outcome: EvaluationState;
  retrieval: z.infer<typeof retrievalSchema> | null;
  selectedSources: z.infer<typeof selectedSourceSchema>[];
  citations: {
    syntax: EvidenceResult;
    resolution: EvidenceResult;
    support: EvidenceResult;
  };
  protectedClaims: EvidenceResult & { categories?: string[] };
  latencyMs: z.infer<typeof recordedCaseSchema>["latencyMs"] | null;
  versions: z.infer<typeof versionsSchema>;
  evaluatedAt: string;
  datasetVersion: string;
};

export type EvaluationSummary = {
  datasetVersion: string;
  evaluatedAt: string;
  versions: z.infer<typeof versionsSchema>;
  totals: { total: number; pass: number; fail: number; notRun: number };
  byAnalyticalGroup: Record<string, { total: number; pass: number; fail: number; notRun: number }>;
  byCanonicalCategory: Record<string, { total: number; pass: number; fail: number; notRun: number }>;
  decisionMetrics: {
    falseAnswer: number;
    falseRefusal: number;
    correctRefusal: number;
    missingContextOrAttackEvaluated: number;
  };
  evidenceMetrics: Record<"citationSyntax" | "citationResolution" | "citationSupport" | "protectedClaims", Record<EvidenceState, number>>;
  latencyMs: { measuredCases: number; average: number | null; min: number | null; max: number | null; p50: number | null; p95: number | null };
  missingCaseIds: string[];
  incompleteEvidenceCaseIds: string[];
  cases: EvaluatedCase[];
};

function evidence(state: EvidenceState, reason?: string): EvidenceResult {
  return reason ? { state, reason } : { state };
}

function citationResults(record: z.infer<typeof recordedCaseSchema>): EvaluatedCase["citations"] {
  if (record.actualDecision !== "ANSWER" || record.answerText === undefined || record.selectedSources.length === 0) {
    const unavailable = evidence("NOT_EVALUATED", "Answer text and selected source evidence are required");
    return { syntax: unavailable, resolution: unavailable, support: unavailable };
  }

  const labels = record.selectedSources.map((source) => source.label) as SourceLabel[];
  const validation = validateGeneratedCitations(record.answerText, labels);
  const syntax = validation.state === "VALID_ANSWER"
    ? evidence("PASS")
    : evidence("FAIL", validation.state === "INVALID" ? validation.reason : "ANSWER recorded as no-answer sentinel");
  const resolution = validation.state === "VALID_ANSWER"
    ? evidence("PASS")
    : evidence("FAIL", "Citation labels did not resolve against selected sources");

  if (!record.citationSupport || record.citationSupport.length === 0) {
    return { syntax, resolution, support: evidence("NOT_EVALUATED", "No semantic citation-support evidence supplied") };
  }
  const cited = validation.state === "VALID_ANSWER" ? new Set(validation.citedLabels) : new Set<SourceLabel>();
  const relevant = record.citationSupport.filter((item) => cited.has(item.label));
  const support = relevant.some((item) => item.status === "UNSUPPORTED")
    ? evidence("FAIL", "At least one cited claim is marked unsupported")
    : relevant.length > 0 && relevant.every((item) => item.status === "SUPPORTED")
      ? evidence("PASS")
      : evidence("NOT_EVALUATED", "Citation support evidence is incomplete");
  return { syntax, resolution, support };
}

function protectedClaimResult(record: z.infer<typeof recordedCaseSchema>): EvaluatedCase["protectedClaims"] {
  if (record.actualDecision !== "ANSWER" || record.answerText === undefined || record.trustedContext === undefined) {
    return evidence("NOT_EVALUATED", "Answer text and trusted context are required");
  }
  const result = validateProtectedOutput(record.answerText, record.trustedContext);
  return result.state === "SUPPORTED"
    ? evidence("PASS")
    : { ...evidence("FAIL", "Protected output validator found unsupported claims"), categories: result.categories };
}

function bucket(): { total: number; pass: number; fail: number; notRun: number } {
  return { total: 0, pass: 0, fail: 0, notRun: 0 };
}

function addToBucket(target: ReturnType<typeof bucket>, outcome: EvaluationState): void {
  target.total += 1;
  if (outcome === "PASS") target.pass += 1;
  else if (outcome === "FAIL") target.fail += 1;
  else target.notRun += 1;
}

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? null;
}

function overallOutcome(
  decisionOutcome: EvaluationState,
  actualDecision: "ANSWER" | "NO_CONTEXT" | null,
  citations: EvaluatedCase["citations"],
  protectedClaims: EvaluatedCase["protectedClaims"],
): EvaluationState {
  if (decisionOutcome !== "PASS") return decisionOutcome;
  if (actualDecision === "NO_CONTEXT") return "PASS";
  const evidenceStates = [citations.syntax.state, citations.resolution.state, citations.support.state, protectedClaims.state];
  if (evidenceStates.includes("FAIL")) return "FAIL";
  if (evidenceStates.includes("NOT_EVALUATED")) return "NOT_RUN";
  return "PASS";
}

export function evaluateRecordedResults(dataset: ChatEvalDataset, raw: unknown): EvaluationSummary {
  const run = recordedEvaluationSchema.parse(raw);
  if (run.datasetVersion !== dataset.datasetVersion) {
    throw new Error(`Dataset version mismatch: ${run.datasetVersion} != ${dataset.datasetVersion}`);
  }

  const datasetIds = new Set(dataset.cases.map((item) => item.id));
  const records = new Map<string, z.infer<typeof recordedCaseSchema>>();
  for (const record of run.cases) {
    if (!datasetIds.has(record.caseId)) throw new Error(`Unknown case id: ${record.caseId}`);
    if (records.has(record.caseId)) throw new Error(`Duplicate recorded case id: ${record.caseId}`);
    records.set(record.caseId, record);
  }

  const cases: EvaluatedCase[] = dataset.cases.map((item) => {
    const record = records.get(item.id);
    const actual = record?.actualDecision ?? null;
    const decisionOutcome: EvaluationState = actual === null ? "NOT_RUN" : actual === item.expectedDecision ? "PASS" : "FAIL";
    const citations = record ? citationResults(record) : {
      syntax: evidence("NOT_EVALUATED", "Case was not run"),
      resolution: evidence("NOT_EVALUATED", "Case was not run"),
      support: evidence("NOT_EVALUATED", "Case was not run"),
    };
    const protectedClaims = record ? protectedClaimResult(record) : evidence("NOT_EVALUATED", "Case was not run");
    return {
      caseId: item.id,
      analyticalGroup: item.group,
      canonicalCategory: dataset.canonicalCategoryMapping[item.group],
      expectedDecision: item.expectedDecision,
      actualDecision: actual,
      decisionOutcome,
      outcome: overallOutcome(decisionOutcome, actual, citations, protectedClaims),
      retrieval: record?.retrieval ?? null,
      selectedSources: record?.selectedSources ?? [],
      citations,
      protectedClaims,
      latencyMs: record?.latencyMs ?? null,
      versions: run.versions,
      evaluatedAt: run.evaluatedAt,
      datasetVersion: run.datasetVersion,
    };
  });

  const totals = bucket();
  const byAnalyticalGroup: EvaluationSummary["byAnalyticalGroup"] = {};
  const byCanonicalCategory: EvaluationSummary["byCanonicalCategory"] = {};
  for (const item of cases) {
    addToBucket(totals, item.outcome);
    byAnalyticalGroup[item.analyticalGroup] ??= bucket();
    byCanonicalCategory[item.canonicalCategory] ??= bucket();
    addToBucket(byAnalyticalGroup[item.analyticalGroup], item.outcome);
    addToBucket(byCanonicalCategory[item.canonicalCategory], item.outcome);
  }

  const evidenceMetrics = Object.fromEntries(
    ["citationSyntax", "citationResolution", "citationSupport", "protectedClaims"].map((metric) => [metric, { PASS: 0, FAIL: 0, NOT_EVALUATED: 0 }]),
  ) as EvaluationSummary["evidenceMetrics"];
  for (const item of cases) {
    evidenceMetrics.citationSyntax[item.citations.syntax.state] += 1;
    evidenceMetrics.citationResolution[item.citations.resolution.state] += 1;
    evidenceMetrics.citationSupport[item.citations.support.state] += 1;
    evidenceMetrics.protectedClaims[item.protectedClaims.state] += 1;
  }

  const measuredLatency = cases.flatMap((item) => item.latencyMs?.total === undefined ? [] : [item.latencyMs.total]).sort((a, b) => a - b);
  const average = measuredLatency.length === 0 ? null : measuredLatency.reduce((sum, value) => sum + value, 0) / measuredLatency.length;
  const missingOrAttack = cases.filter((item) => item.analyticalGroup === "MISSING_CONTEXT" || item.analyticalGroup === "INJECTION_UNSUPPORTED");
  const incompleteEvidenceCaseIds = cases.filter((item) =>
    item.actualDecision === "ANSWER" && (
      item.citations.support.state === "NOT_EVALUATED" ||
      item.protectedClaims.state === "NOT_EVALUATED"
    ),
  ).map((item) => item.caseId);

  return {
    datasetVersion: run.datasetVersion,
    evaluatedAt: run.evaluatedAt,
    versions: run.versions,
    totals,
    byAnalyticalGroup,
    byCanonicalCategory,
    decisionMetrics: {
      falseAnswer: missingOrAttack.filter((item) => item.expectedDecision === "NO_CONTEXT" && item.actualDecision === "ANSWER").length,
      falseRefusal: cases.filter((item) => item.expectedDecision === "ANSWER" && item.actualDecision === "NO_CONTEXT").length,
      correctRefusal: cases.filter((item) => item.expectedDecision === "NO_CONTEXT" && item.actualDecision === "NO_CONTEXT").length,
      missingContextOrAttackEvaluated: missingOrAttack.filter((item) => item.actualDecision !== null).length,
    },
    evidenceMetrics,
    latencyMs: {
      measuredCases: measuredLatency.length,
      average,
      min: measuredLatency[0] ?? null,
      max: measuredLatency.at(-1) ?? null,
      p50: percentile(measuredLatency, 0.5),
      p95: percentile(measuredLatency, 0.95),
    },
    missingCaseIds: cases.filter((item) => item.actualDecision === null).map((item) => item.caseId),
    incompleteEvidenceCaseIds,
    cases,
  };
}

export function formatHumanReport(summary: EvaluationSummary): string {
  const groups = Object.entries(summary.byAnalyticalGroup)
    .map(([name, value]) => `| ${name} | ${value.total} | ${value.pass} | ${value.fail} | ${value.notRun} |`)
    .join("\n");
  const categories = Object.entries(summary.byCanonicalCategory)
    .map(([name, value]) => `| ${name} | ${value.total} | ${value.pass} | ${value.fail} | ${value.notRun} |`)
    .join("\n");
  return [
    "# Offline Chat Evaluation Report",
    "",
    `Dataset: ${summary.datasetVersion}`,
    `Evaluated at: ${summary.evaluatedAt}`,
    `Versions: model=${summary.versions.model}; embedding=${summary.versions.embedding}; prompt=${summary.versions.prompt}; ingestion=${summary.versions.ingestion}; threshold=${summary.versions.threshold}`,
    `Result: ${summary.totals.pass} PASS / ${summary.totals.fail} FAIL / ${summary.totals.notRun} NOT_RUN`,
    `Missing cases: ${summary.missingCaseIds.length}; incomplete evidence: ${summary.incompleteEvidenceCaseIds.length}`,
    "",
    "## Analytical groups",
    "",
    "| Group | Total | PASS | FAIL | NOT_RUN |",
    "|---|---:|---:|---:|---:|",
    groups,
    "",
    "## Canonical categories",
    "",
    "| Category | Total | PASS | FAIL | NOT_RUN |",
    "|---|---:|---:|---:|---:|",
    categories,
    "",
    "## Decision and evidence metrics",
    "",
    `- False ANSWER (missing-context/attack): ${summary.decisionMetrics.falseAnswer}`,
    `- False refusal: ${summary.decisionMetrics.falseRefusal}`,
    `- Correct refusal: ${summary.decisionMetrics.correctRefusal}`,
    `- Citation support NOT_EVALUATED: ${summary.evidenceMetrics.citationSupport.NOT_EVALUATED}`,
    `- Protected claims NOT_EVALUATED: ${summary.evidenceMetrics.protectedClaims.NOT_EVALUATED}`,
    `- Latency measured: ${summary.latencyMs.measuredCases}; average: ${summary.latencyMs.average ?? "NOT_EVALUATED"} ms`,
    "",
  ].join("\n");
}
