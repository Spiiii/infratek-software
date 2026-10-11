import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { z } from "zod";

import { readChatBuildSafeConfig } from "../src/lib/chat/config.ts";
import {
  validateGeneratedCitations,
  type CitationInvalidReason,
} from "../src/lib/chat/grounding/citations.ts";
import { contentHash } from "../src/lib/chat/ingestion/hash.ts";
import type { SelectedSource, SourceLabel } from "../src/lib/chat/retrieval/types.ts";
import type { GroundedAnswerResult } from "../src/lib/chat/service/grounded-answer.ts";
import { validateProtectedOutput } from "../src/lib/chat/safety/output.ts";
import type { ChatEvalDataset } from "./validate-chat-dataset.ts";

export const GENERATION_EVIDENCE_FILENAME = "generation-evidence.json";
export const HYDRATION_EVIDENCE_FILENAME = "hydration-evidence.json";
export const EVAL_ONLY_POLICY_VERSION = "eval-only-recorded-evidence-p5.7-e4-b1";

const identitySchema = z.object({
  docType: z.string().trim().min(1),
  docId: z.string().trim().min(1),
  chunkKey: z.string().trim().min(1),
  url: z.string().trim().min(1),
}).passthrough();

const retrievalArtifactSchema = z.object({
  kind: z.literal("P5.7-E_RETRIEVAL_EVIDENCE"),
  runId: z.string().trim().min(1),
  datasetVersion: z.string().trim().min(1),
  mode: z.literal("LIVE"),
  versions: z.object({
    model: z.string().trim().min(1),
    embedding: z.string().trim().min(1),
    ingestion: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    threshold: z.literal("UN-CALIBRATED"),
  }).strict(),
  cases: z.array(z.object({
    caseId: z.string().trim().min(1),
    expectedDecision: z.enum(["ANSWER", "NO_CONTEXT"]),
    executionStatus: z.literal("SUCCESS"),
    finalTop6: z.array(identitySchema).min(1).max(6),
  }).passthrough()),
}).passthrough();

export type RetrievalArtifact = z.infer<typeof retrievalArtifactSchema>;
export type RecordedCandidate = RetrievalArtifact["cases"][number]["finalTop6"][number];

export type HydratedChunkRow = {
  docType: string;
  docId: string;
  chunkKey: string;
  url: string;
  title: string | null;
  headingPath: string[];
  content: string;
  contentHash: string;
};

const reviewStateSchema = z.enum(["PASS", "FAIL", "NOT_EVALUATED"]);
const semanticSupportSchema = z.enum(["SUPPORTED", "PARTIAL", "UNSUPPORTED", "NOT_EVALUATED"]);
export const groundingReasonSchema = z.enum([
  "MISSING_CITATION",
  "CITATION_MISMATCH",
  "MALFORMED_CITATION",
  "INVALID_OUTPUT",
]);

export const generationReviewRecordSchema = z.object({
  answerCorrectness: reviewStateSchema,
  claims: z.array(z.object({
    claimTextOrSafeReference: z.string().trim().min(1),
    citedSourceLabel: z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]).optional(),
    semanticSupport: semanticSupportSchema,
    citationToClaimGrounding: reviewStateSchema,
    rationale: z.string().trim().min(1),
  }).strict()),
  forbiddenClaims: z.array(z.object({
    claim: z.string().trim().min(1),
    finding: reviewStateSchema,
    rationale: z.string().trim().min(1).optional(),
  }).strict()),
  reviewerRationale: z.string().trim().min(1).optional(),
}).strict();

export type GenerationReviewRecord = z.infer<typeof generationReviewRecordSchema>;

export type GenerationRunnerOptions = {
  runId: string;
  outputDirectory: string;
  repositoryRoot: string;
  live: boolean;
  caseIds: string[];
  maxCases: number;
  maxGenerationCalls?: number;
  timestamp?: string;
};

export type GenerationExecution = {
  result: GroundedAnswerResult;
  physicalCalls: number;
  sanitizedOutput: string | null;
};

export type GenerationCaseEvidence = {
  caseId: string;
  expectedDecision: "ANSWER" | "NO_CONTEXT";
  executionStatus: "DRY_RUN" | "SUCCESS" | "FAILURE";
  sourceArtifactRunId: string;
  contextManifest: Array<{
    label: SourceLabel;
    docType: string;
    docId: string;
    chunkKey: string;
    url: string;
    contentHash?: string;
  }>;
  resultState?: GroundedAnswerResult["state"];
  actualDecision?: "ANSWER" | "NO_CONTEXT";
  sanitizedModelOutput?: string;
  citationValidation?: ReturnType<typeof validateGeneratedCitations>;
  protectedOutput?: ReturnType<typeof validateProtectedOutput>;
  physicalGenerationCalls: number;
  generationLatencyMs?: number;
  errorCategory?: string;
  groundingReason?: CitationInvalidReason;
  review: GenerationReviewRecord;
};

export type GenerationEvidence = {
  kind: "P5.7-E_GENERATION_EVIDENCE";
  runId: string;
  runTimestamp: string;
  datasetVersion: string;
  sourceRetrievalRunIds: string[];
  mode: "DRY_RUN" | "LIVE";
  configuration: {
    maximumCases: number;
    maximumGenerationCalls: number;
    embeddingCalls: 0;
    retrievalCalls: 0;
    queryRewriteCalls: 0;
    automaticProviderRetries: 0;
    policyVersion: typeof EVAL_ONLY_POLICY_VERSION;
  };
  versions: RetrievalArtifact["versions"];
  cases: GenerationCaseEvidence[];
};

export const generationEvidenceSchema = z.object({
  kind: z.literal("P5.7-E_GENERATION_EVIDENCE"),
  runId: z.string().trim().min(1),
  cases: z.array(z.object({
    caseId: z.string().trim().min(1),
    groundingReason: groundingReasonSchema.optional(),
  }).passthrough()),
}).passthrough();

export function parseGenerationEvidence(raw: unknown): GenerationEvidence {
  return generationEvidenceSchema.parse(raw) as GenerationEvidence;
}

export type SourceArtifactIntegrity = {
  runId: string;
  sha256: string;
  bytes: number;
};

export type HydrationEvidence = {
  kind: "P5.7-E_HYDRATION_EVIDENCE";
  runId: string;
  runTimestamp: string;
  datasetVersion: string;
  sourceArtifacts: SourceArtifactIntegrity[];
  target: { project: "infratek-phase0-spike"; branch: "phase3-preview"; database: "neondb" };
  configuration: {
    selectedCases: number;
    expectedChunkReferences: number;
    resolvedChunkReferences: number;
    uniqueExpectedChunks: number;
    embeddingCalls: 0;
    retrievalCalls: 0;
    queryRewriteCalls: 0;
    generationCalls: 0;
    databaseWrites: 0;
  };
  versions: RetrievalArtifact["versions"];
  cases: Array<{
    caseId: string;
    sourceArtifactRunId: string;
    expectedSources: number;
    resolvedSources: number;
    identityValidation: "PASS";
    urlValidation: "PASS";
    contentHashValidation: "PASS";
    contentNonEmpty: "PASS";
    orderValidation: "PASS";
    contextManifest: GenerationCaseEvidence["contextManifest"];
  }>;
  failures: string[];
};

export type SelectedGenerationCase = {
  datasetCase: ChatEvalDataset["cases"][number];
  artifactCase: RetrievalArtifact["cases"][number];
  artifactRunId: string;
};

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

function validateRunId(runId: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/u.test(runId)) {
    throw new Error("Run id must use 3-64 lowercase letters, numbers, dots, underscores, or hyphens");
  }
}

export function assertSafeGenerationOutputDirectory(outputDirectory: string, repositoryRoot: string): string {
  if (!isAbsolute(outputDirectory)) throw new Error("Output directory must be absolute");
  const output = resolve(outputDirectory);
  const repository = resolve(repositoryRoot);
  const relation = relative(repository, output);
  if (relation === "" || (!relation.startsWith("..") && !isAbsolute(relation))) {
    throw new Error("Evidence output must be outside the repository");
  }
  return output;
}

export function validateGenerationRunnerOptions(options: GenerationRunnerOptions): void {
  validateRunId(options.runId);
  assertSafeGenerationOutputDirectory(options.outputDirectory, options.repositoryRoot);
  positiveInteger(options.maxCases, "Maximum case count");
  if (options.caseIds.length === 0) throw new Error("Generation evaluation requires explicit case IDs");
  if (new Set(options.caseIds).size !== options.caseIds.length) throw new Error("Duplicate case id selection");
  if (options.caseIds.length > options.maxCases) throw new Error("Selected cases exceed maximum case count");
  if (options.live) {
    if (options.maxGenerationCalls === undefined) {
      throw new Error("Live mode requires an explicit generation call budget");
    }
    positiveInteger(options.maxGenerationCalls, "Maximum generation call count");
    if (options.caseIds.length > options.maxGenerationCalls) {
      throw new Error("Selected cases exceed the generation call budget");
    }
  } else if (options.maxGenerationCalls !== undefined) {
    positiveInteger(options.maxGenerationCalls, "Maximum generation call count");
  }
}

export function parseAndValidateRetrievalArtifact(
  raw: unknown,
  dataset: ChatEvalDataset,
  environment: Record<string, string | undefined>,
): RetrievalArtifact {
  const artifact = retrievalArtifactSchema.parse(raw);
  const config = readChatBuildSafeConfig(environment);
  if (artifact.datasetVersion !== dataset.datasetVersion) throw new Error("Retrieval artifact dataset version mismatch");
  const expected = {
    model: config.versioning.chatModel,
    embedding: config.versioning.embedding,
    ingestion: config.versioning.ingestion,
    prompt: config.versioning.prompt,
    threshold: config.versioning.threshold,
  };
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (artifact.versions[key] !== expected[key]) throw new Error(`Retrieval artifact ${key} version mismatch`);
  }
  const ids = artifact.cases.map((item) => item.caseId);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate case ID in retrieval artifact");
  return artifact;
}

function parseRetrievalArtifacts(
  raw: unknown | unknown[],
  dataset: ChatEvalDataset,
  environment: Record<string, string | undefined>,
): RetrievalArtifact[] {
  const artifacts = (Array.isArray(raw) ? raw : [raw])
    .map((item) => parseAndValidateRetrievalArtifact(item, dataset, environment));
  if (artifacts.length === 0) throw new Error("At least one retrieval artifact is required");
  const runIds = artifacts.map((item) => item.runId);
  if (new Set(runIds).size !== runIds.length) throw new Error("Duplicate retrieval artifact run ID");
  const caseIds = artifacts.flatMap((artifact) => artifact.cases.map((item) => item.caseId));
  if (new Set(caseIds).size !== caseIds.length) throw new Error("Duplicate case ID across retrieval artifacts");
  return artifacts;
}

function selectCases(
  dataset: ChatEvalDataset,
  artifacts: RetrievalArtifact[],
  options: GenerationRunnerOptions,
): SelectedGenerationCase[] {
  const datasetById = new Map(dataset.cases.map((item) => [item.id, item]));
  const artifactById = new Map(artifacts.flatMap((artifact) =>
    artifact.cases.map((item) => [item.caseId, { artifact, item }] as const)));
  return options.caseIds.map((caseId) => {
    const datasetCase = datasetById.get(caseId);
    if (!datasetCase) throw new Error(`Unknown case id: ${caseId}`);
    const match = artifactById.get(caseId);
    if (!match) throw new Error(`Case missing from retrieval artifact: ${caseId}`);
    if (match.item.expectedDecision !== datasetCase.expectedDecision) {
      throw new Error(`Expected decision mismatch: ${caseId}`);
    }
    return { datasetCase, artifactCase: match.item, artifactRunId: match.artifact.runId };
  });
}

function identity(value: Pick<HydratedChunkRow, "docType" | "docId" | "chunkKey">): string {
  return `${value.docType}\u0000${value.docId}\u0000${value.chunkKey}`;
}

export function hydrateRecordedSources(
  candidates: RecordedCandidate[],
  rows: HydratedChunkRow[],
): { sources: SelectedSource[]; manifest: GenerationCaseEvidence["contextManifest"] } {
  const requested = candidates.map(identity);
  if (new Set(requested).size !== requested.length) throw new Error("Duplicate chunk identity in final top 6");
  const byIdentity = new Map<string, HydratedChunkRow>();
  for (const row of rows) {
    const key = identity(row);
    if (byIdentity.has(key)) throw new Error("Duplicate hydrated chunk identity");
    byIdentity.set(key, row);
  }
  const labels: SourceLabel[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
  const sources = candidates.map((candidate, index): SelectedSource => {
    const row = byIdentity.get(identity(candidate));
    if (!row) throw new Error(`Missing hydrated chunk: ${candidate.docType}/${candidate.docId}/${candidate.chunkKey}`);
    if (row.url !== candidate.url) throw new Error(`Hydrated chunk URL mismatch: ${candidate.chunkKey}`);
    if (!row.content.trim() || !row.contentHash.trim()) throw new Error(`Hydrated chunk content is incomplete: ${candidate.chunkKey}`);
    if (contentHash(row.headingPath, row.content) !== row.contentHash) {
      throw new Error(`Hydrated chunk content hash mismatch: ${candidate.chunkKey}`);
    }
    const label = labels[index];
    if (!label) throw new Error("Final source limit exceeded");
    return {
      source: {
        label,
        docType: row.docType as SelectedSource["source"]["docType"],
        docId: row.docId,
        chunkKey: row.chunkKey,
        title: row.title,
        headingPath: [...row.headingPath],
        content: row.content,
        url: row.url,
      },
      diagnostics: {
        vectorRank: typeof candidate.vectorRank === "number" ? candidate.vectorRank : undefined,
        vectorDistance: typeof candidate.vectorDistance === "number" ? candidate.vectorDistance : undefined,
        vectorSimilarity: typeof candidate.vectorSimilarity === "number" ? candidate.vectorSimilarity : undefined,
        ftsRank: typeof candidate.ftsRank === "number" ? candidate.ftsRank : undefined,
        ftsScore: typeof candidate.ftsScore === "number" ? candidate.ftsScore : undefined,
        rrfScore: typeof candidate.rrfScore === "number" ? candidate.rrfScore : 0,
      },
    };
  });
  if (byIdentity.size !== new Set(requested).size) throw new Error("Hydration returned unexpected chunks");
  return {
    sources,
    manifest: sources.map(({ source }, index) => ({
      label: source.label,
      docType: source.docType,
      docId: source.docId,
      chunkKey: source.chunkKey,
      url: source.url,
      contentHash: rows.find((row) => identity(row) === requested[index])?.contentHash,
    })),
  };
}

function emptyReview(item: ChatEvalDataset["cases"][number]): GenerationReviewRecord {
  return {
    answerCorrectness: "NOT_EVALUATED",
    claims: [],
    forbiddenClaims: item.forbiddenClaims.map((claim) => ({ claim, finding: "NOT_EVALUATED" })),
  };
}

function actualDecision(result: GroundedAnswerResult): "ANSWER" | "NO_CONTEXT" | undefined {
  if (result.state === "ANSWER") return "ANSWER";
  if (result.state === "NO_ANSWER" || result.state === "NO_CONTEXT") return "NO_CONTEXT";
  return undefined;
}

function resultError(result: GroundedAnswerResult): string | undefined {
  if (result.state === "DEPENDENCY_FALLBACK" || result.state === "SAFE_FALLBACK") return result.reason;
  if (result.state === "CALIBRATION_REQUIRED") return "UNEXPECTED_CALIBRATION_REQUIRED";
  return undefined;
}

function sanitizedGroundingReason(result: GroundedAnswerResult): CitationInvalidReason | undefined {
  return result.state === "DEPENDENCY_FALLBACK" && result.reason === "INVALID_GROUNDED_OUTPUT"
    ? result.groundingReason
    : undefined;
}

export async function runGenerationEvaluation(
  dataset: ChatEvalDataset,
  rawArtifacts: unknown | unknown[],
  options: GenerationRunnerOptions,
  dependencies: {
    environment?: Record<string, string | undefined>;
    hydrateCases?: (selected: SelectedGenerationCase[]) => Promise<Map<string, HydratedChunkRow[]>>;
    executeGeneration?: (
      item: ChatEvalDataset["cases"][number],
      sources: SelectedSource[],
    ) => Promise<GenerationExecution>;
    now?: () => number;
  } = {},
): Promise<{ evidence: GenerationEvidence; artifactPath: string }> {
  validateGenerationRunnerOptions(options);
  const environment = dependencies.environment ?? process.env;
  const artifacts = parseRetrievalArtifacts(rawArtifacts, dataset, environment);
  const selected = selectCases(dataset, artifacts, options);
  const outputDirectory = assertSafeGenerationOutputDirectory(options.outputDirectory, options.repositoryRoot);
  const generationBudget = options.maxGenerationCalls ?? 0;
  const cases: GenerationCaseEvidence[] = [];
  let physicalCalls = 0;

  if (!options.live) {
    for (const { datasetCase, artifactCase, artifactRunId } of selected) {
      cases.push({
        caseId: datasetCase.id,
        expectedDecision: datasetCase.expectedDecision,
        executionStatus: "DRY_RUN",
        sourceArtifactRunId: artifactRunId,
        contextManifest: artifactCase.finalTop6.map((candidate, index) => ({
          label: `S${index + 1}` as SourceLabel,
          docType: candidate.docType,
          docId: candidate.docId,
          chunkKey: candidate.chunkKey,
          url: candidate.url,
        })),
        physicalGenerationCalls: 0,
        review: emptyReview(datasetCase),
      });
    }
  } else {
    if (!dependencies.hydrateCases || !dependencies.executeGeneration) {
      throw new Error("Live mode requires hydration and generation dependencies");
    }
    const hydrated = await dependencies.hydrateCases(selected);
    for (const { datasetCase, artifactCase, artifactRunId } of selected) {
      if (physicalCalls >= generationBudget) throw new Error("Generation call budget exhausted");
      const rows = hydrated.get(datasetCase.id);
      if (!rows) throw new Error(`Hydration result missing case: ${datasetCase.id}`);
      const context = hydrateRecordedSources(artifactCase.finalTop6, rows);
      const started = dependencies.now?.() ?? performance.now();
      const execution = await dependencies.executeGeneration(datasetCase, context.sources);
      const latencyMs = (dependencies.now?.() ?? performance.now()) - started;
      physicalCalls += execution.physicalCalls;
      if (execution.physicalCalls !== 1 || physicalCalls > generationBudget) {
        throw new Error("Generation call budget exceeded");
      }
      const decision = actualDecision(execution.result);
      const output = execution.sanitizedOutput?.trim() || undefined;
      const labels = context.sources.map(({ source }) => source.label);
      const citationValidation = output
        ? validateGeneratedCitations(output, labels)
        : undefined;
      const trustedContext = context.sources.map(({ source }) => source.content).join("\n");
      const protectedOutput = output && decision === "ANSWER"
        ? validateProtectedOutput(output, trustedContext)
        : execution.result.state === "SAFE_FALLBACK"
          ? {
              state: "SAFE_FALLBACK" as const,
              unsupported: true as const,
              categories: execution.result.categories,
            }
          : undefined;
      const errorCategory = resultError(execution.result);
      const groundingReason = sanitizedGroundingReason(execution.result);
      cases.push({
        caseId: datasetCase.id,
        expectedDecision: datasetCase.expectedDecision,
        executionStatus: errorCategory ? "FAILURE" : "SUCCESS",
        sourceArtifactRunId: artifactRunId,
        contextManifest: context.manifest,
        resultState: execution.result.state,
        ...(decision ? { actualDecision: decision } : {}),
        ...(output ? { sanitizedModelOutput: output } : {}),
        ...(citationValidation ? { citationValidation } : {}),
        ...(protectedOutput ? { protectedOutput } : {}),
        physicalGenerationCalls: execution.physicalCalls,
        generationLatencyMs: latencyMs,
        ...(errorCategory ? { errorCategory } : {}),
        ...(groundingReason ? { groundingReason } : {}),
        review: emptyReview(datasetCase),
      });
      if (errorCategory) break;
    }
  }

  const evidence: GenerationEvidence = {
    kind: "P5.7-E_GENERATION_EVIDENCE",
    runId: options.runId,
    runTimestamp: options.timestamp ?? new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    sourceRetrievalRunIds: artifacts.map((artifact) => artifact.runId),
    mode: options.live ? "LIVE" : "DRY_RUN",
    configuration: {
      maximumCases: options.maxCases,
      maximumGenerationCalls: generationBudget,
      embeddingCalls: 0,
      retrievalCalls: 0,
      queryRewriteCalls: 0,
      automaticProviderRetries: 0,
      policyVersion: EVAL_ONLY_POLICY_VERSION,
    },
    versions: artifacts[0]!.versions,
    cases,
  };
  parseGenerationEvidence(evidence);
  await mkdir(outputDirectory, { recursive: false });
  const artifactPath = resolve(outputDirectory, GENERATION_EVIDENCE_FILENAME);
  await writeFile(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { evidence, artifactPath };
}

export async function runHydrationPreflight(
  dataset: ChatEvalDataset,
  rawArtifacts: unknown | unknown[],
  options: GenerationRunnerOptions,
  dependencies: {
    environment?: Record<string, string | undefined>;
    hydrateCases: (selected: SelectedGenerationCase[]) => Promise<Map<string, HydratedChunkRow[]>>;
    sourceArtifactIntegrity: SourceArtifactIntegrity[];
  },
): Promise<{ evidence: HydrationEvidence; artifactPath: string }> {
  if (options.live) throw new Error("Hydration-only preflight cannot enable live generation");
  if (options.maxGenerationCalls !== undefined) {
    throw new Error("Hydration-only preflight cannot accept a generation call budget");
  }
  validateGenerationRunnerOptions(options);
  const environment = dependencies.environment ?? process.env;
  const artifacts = parseRetrievalArtifacts(rawArtifacts, dataset, environment);
  const selected = selectCases(dataset, artifacts, options);
  const artifactRunIds = artifacts.map((artifact) => artifact.runId);
  if (
    dependencies.sourceArtifactIntegrity.length !== artifactRunIds.length ||
    dependencies.sourceArtifactIntegrity.some((item, index) => item.runId !== artifactRunIds[index])
  ) {
    throw new Error("Source artifact integrity metadata mismatch");
  }
  const outputDirectory = assertSafeGenerationOutputDirectory(options.outputDirectory, options.repositoryRoot);
  const hydrated = await dependencies.hydrateCases(selected);
  const cases: HydrationEvidence["cases"] = [];
  let expectedChunkReferences = 0;
  let resolvedChunkReferences = 0;
  const uniqueExpectedChunks = new Set<string>();

  for (const { datasetCase, artifactCase, artifactRunId } of selected) {
    const rows = hydrated.get(datasetCase.id);
    if (!rows) throw new Error(`Hydration result missing case: ${datasetCase.id}`);
    expectedChunkReferences += artifactCase.finalTop6.length;
    for (const candidate of artifactCase.finalTop6) uniqueExpectedChunks.add(identity(candidate));
    const context = hydrateRecordedSources(artifactCase.finalTop6, rows);
    resolvedChunkReferences += context.sources.length;
    cases.push({
      caseId: datasetCase.id,
      sourceArtifactRunId: artifactRunId,
      expectedSources: artifactCase.finalTop6.length,
      resolvedSources: context.sources.length,
      identityValidation: "PASS",
      urlValidation: "PASS",
      contentHashValidation: "PASS",
      contentNonEmpty: "PASS",
      orderValidation: "PASS",
      contextManifest: context.manifest,
    });
  }

  const evidence: HydrationEvidence = {
    kind: "P5.7-E_HYDRATION_EVIDENCE",
    runId: options.runId,
    runTimestamp: options.timestamp ?? new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    sourceArtifacts: dependencies.sourceArtifactIntegrity,
    target: { project: "infratek-phase0-spike", branch: "phase3-preview", database: "neondb" },
    configuration: {
      selectedCases: selected.length,
      expectedChunkReferences,
      resolvedChunkReferences,
      uniqueExpectedChunks: uniqueExpectedChunks.size,
      embeddingCalls: 0,
      retrievalCalls: 0,
      queryRewriteCalls: 0,
      generationCalls: 0,
      databaseWrites: 0,
    },
    versions: artifacts[0]!.versions,
    cases,
    failures: [],
  };
  await mkdir(outputDirectory, { recursive: false });
  const artifactPath = resolve(outputDirectory, HYDRATION_EVIDENCE_FILENAME);
  await writeFile(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { evidence, artifactPath };
}
