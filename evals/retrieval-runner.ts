import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { readChatBuildSafeConfig } from "../src/lib/chat/config.ts";
import { RRF_K } from "../src/lib/chat/retrieval/config.ts";
import { fuseCandidates } from "../src/lib/chat/retrieval/fusion.ts";
import type { FtsCandidate, RetrievalResult, VectorCandidate } from "../src/lib/chat/retrieval/types.ts";
import type { ChatEvalDataset } from "./validate-chat-dataset.ts";

export const RETRIEVAL_EVIDENCE_FILENAME = "retrieval-evidence.json";
export const FULL_DATASET_CASES = 120;
export const FULL_DATASET_MAX_LOGICAL_READS = 240;
export const FULL_DATASET_MIN_DELAY_MS = 1_000;

export type RetrievalRunnerOptions = {
  runId: string;
  outputDirectory: string;
  repositoryRoot: string;
  live: boolean;
  caseIds: string[];
  maxCases: number;
  maxEmbeddingCalls?: number;
  maxLogicalReadSearches?: number;
  requestDelayMs: number;
  fullDatasetAuthorized: boolean;
  timestamp?: string;
};

export type CandidateEvidence = {
  docType: string;
  docId: string;
  chunkKey: string;
  url: string;
  vectorRank?: number;
  vectorDistance?: number;
  vectorSimilarity?: number;
  ftsRank?: number;
  ftsScore?: number;
  rrfRank?: number;
  rrfScore?: number;
};

export type RetrievalCaseExecution = {
  result: RetrievalResult;
  vectorCandidates: VectorCandidate[];
  ftsCandidates: FtsCandidate[];
  logicalReadSearches: number;
};

export type RetrievalCaseExecutor = (
  item: ChatEvalDataset["cases"][number],
) => Promise<RetrievalCaseExecution>;

export type RetrievalEvidenceCase = {
  caseId: string;
  expectedDecision: "ANSWER" | "NO_CONTEXT";
  queryIdentity: string;
  executionStatus: "DRY_RUN" | "SUCCESS" | "FAILURE";
  retrievalStatus?: RetrievalResult["status"];
  embedding: { model: string; version: string; dimension: number; calls: 0 | 1 };
  versions: { ingestion: string; prompt: string; threshold: string };
  vectorTop20: CandidateEvidence[];
  ftsTop20: CandidateEvidence[];
  rrf: { k: 60; rankings: CandidateEvidence[] };
  finalTop6: CandidateEvidence[];
  diagnostics?: RetrievalResult["diagnostics"];
  latencyMs?: number;
  logicalReadSearches: number;
  errorCategory?: "RETRIEVAL_FAILURE";
};

export type RetrievalEvidence = {
  kind: "P5.7-E_RETRIEVAL_EVIDENCE";
  runId: string;
  runTimestamp: string;
  datasetVersion: string;
  synthetic: boolean;
  mode: "DRY_RUN" | "LIVE";
  runStatus: "IN_PROGRESS" | "COMPLETED" | "STOPPED";
  stopReason?: "PROVIDER_RATE_LIMITED" | "PROVIDER_FAILURE" | "RETRIEVAL_FAILURE";
  configuration: {
    vectorLimit: 20;
    ftsLimit: 20;
    rrfK: 60;
    finalLimit: 6;
    maximumCases: number;
    maximumEmbeddingCalls: number;
    maximumLogicalReadSearches: number;
    requestDelayMs: number;
    fullDatasetAuthorized: boolean;
    queryRewriteCalls: 0;
    generationCalls: 0;
    automaticProviderRetries: 0;
  };
  versions: {
    model: string;
    embedding: string;
    ingestion: string;
    prompt: string;
    threshold: string;
  };
  cases: RetrievalEvidenceCase[];
};

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

export function assertSafeOutputDirectory(outputDirectory: string, repositoryRoot: string): string {
  if (!isAbsolute(outputDirectory)) throw new Error("Output directory must be absolute");
  const output = resolve(outputDirectory);
  const repository = resolve(repositoryRoot);
  const relation = relative(repository, output);
  if (relation === "" || (!relation.startsWith("..") && !isAbsolute(relation))) {
    throw new Error("Evidence output must be outside the repository");
  }
  return output;
}

function validateRunId(runId: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/u.test(runId)) {
    throw new Error("Run id must use 3-64 lowercase letters, numbers, dots, underscores, or hyphens");
  }
  return runId;
}

function selectCases(dataset: ChatEvalDataset, options: RetrievalRunnerOptions) {
  const byId = new Map(dataset.cases.map((item) => [item.id, item]));
  const requested = options.caseIds.length === 0
    ? dataset.cases
    : options.caseIds.map((id) => {
        const item = byId.get(id);
        if (!item) throw new Error(`Unknown case id: ${id}`);
        return item;
      });
  if (new Set(requested.map((item) => item.id)).size !== requested.length) {
    throw new Error("Duplicate case id selection");
  }
  return requested.slice(0, positiveInteger(options.maxCases, "Maximum case count"));
}

export function validateRetrievalRunnerOptions(options: RetrievalRunnerOptions): void {
  validateRunId(options.runId);
  assertSafeOutputDirectory(options.outputDirectory, options.repositoryRoot);
  positiveInteger(options.maxCases, "Maximum case count");
  if (!options.live) {
    if (options.maxEmbeddingCalls !== undefined) {
      positiveInteger(options.maxEmbeddingCalls, "Maximum embedding call count");
    }
    return;
  }
  if (options.caseIds.length === 0) throw new Error("Live mode requires explicit case IDs");
  if (options.maxEmbeddingCalls === undefined) {
    throw new Error("Live mode requires an explicit embedding call budget");
  }
  positiveInteger(options.maxEmbeddingCalls, "Maximum embedding call count");
  if (options.maxCases > options.maxEmbeddingCalls) {
    throw new Error("Maximum case count cannot exceed the embedding call budget");
  }
  const uniqueIds = new Set(options.caseIds);
  const fullDatasetRequested =
    options.maxCases === FULL_DATASET_CASES || options.caseIds.length === FULL_DATASET_CASES;
  if (!fullDatasetRequested && options.fullDatasetAuthorized) {
    throw new Error("Full-dataset authorization is valid only for an exact 120-case run");
  }
  if (fullDatasetRequested) {
    if (!options.fullDatasetAuthorized) {
      throw new Error("A full 120-case live run requires explicit authorization");
    }
    if (
      options.maxCases !== FULL_DATASET_CASES ||
      options.caseIds.length !== FULL_DATASET_CASES ||
      uniqueIds.size !== FULL_DATASET_CASES ||
      options.maxEmbeddingCalls !== FULL_DATASET_CASES
    ) {
      throw new Error("Full-dataset authorization requires exactly 120 unique IDs and a 120-call budget");
    }
    if (options.maxLogicalReadSearches !== FULL_DATASET_MAX_LOGICAL_READS) {
      throw new Error("Full-dataset authorization requires a 240-search read budget");
    }
    if (options.requestDelayMs < FULL_DATASET_MIN_DELAY_MS) {
      throw new Error("Full-dataset authorization requires at least 1000ms pacing");
    }
  }
}

function queryIdentity(question: string): string {
  return `sha256:${createHash("sha256").update(question.normalize("NFC")).digest("hex")}`;
}

function candidateEvidence(candidate: VectorCandidate | FtsCandidate): CandidateEvidence {
  return {
    docType: candidate.docType,
    docId: candidate.docId,
    chunkKey: candidate.chunkKey,
    url: candidate.url,
    ...candidate.diagnostics,
  };
}

function fusedEvidence(
  vectorCandidates: VectorCandidate[],
  ftsCandidates: FtsCandidate[],
): CandidateEvidence[] {
  return fuseCandidates(vectorCandidates, ftsCandidates).map((candidate, index) => ({
    docType: candidate.docType,
    docId: candidate.docId,
    chunkKey: candidate.chunkKey,
    url: candidate.url,
    ...candidate.diagnostics,
    rrfRank: index + 1,
  }));
}

function baseCase(
  item: ChatEvalDataset["cases"][number],
  environment: Record<string, string | undefined>,
): Omit<RetrievalEvidenceCase, "executionStatus" | "vectorTop20" | "ftsTop20" | "rrf" | "finalTop6" | "logicalReadSearches"> {
  const config = readChatBuildSafeConfig(environment);
  return {
    caseId: item.id,
    expectedDecision: item.expectedDecision,
    queryIdentity: queryIdentity(item.question),
    embedding: {
      model: config.model.embedding,
      version: config.versioning.embedding,
      dimension: config.model.embeddingDimension,
      calls: 0,
    },
    versions: {
      ingestion: config.versioning.ingestion,
      prompt: config.versioning.prompt,
      threshold: config.versioning.threshold,
    },
  };
}

export async function runRetrievalEvaluation(
  dataset: ChatEvalDataset,
  options: RetrievalRunnerOptions,
  dependencies: {
    environment?: Record<string, string | undefined>;
    executeCase?: RetrievalCaseExecutor;
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<void>;
    synthetic?: boolean;
  } = {},
): Promise<{ evidence: RetrievalEvidence; artifactPath: string }> {
  validateRetrievalRunnerOptions(options);
  const outputDirectory = assertSafeOutputDirectory(options.outputDirectory, options.repositoryRoot);
  const selected = selectCases(dataset, options);
  if (options.fullDatasetAuthorized) {
    const selectedIds = new Set(selected.map((item) => item.id));
    if (
      dataset.cases.length !== FULL_DATASET_CASES ||
      selected.length !== FULL_DATASET_CASES ||
      dataset.cases.some((item) => !selectedIds.has(item.id))
    ) {
      throw new Error("Authorized full-dataset selection must match the validated 120-case dataset");
    }
  }
  const environment = dependencies.environment ?? process.env;
  const config = readChatBuildSafeConfig(environment);
  const embeddingBudget = options.live ? options.maxEmbeddingCalls ?? 0 : 0;
  const logicalReadBudget = options.maxLogicalReadSearches ?? options.maxCases * 2;
  const cases: RetrievalEvidenceCase[] = [];
  let embeddingCalls = 0;
  let logicalReadSearches = 0;
  let stopReason: RetrievalEvidence["stopReason"];
  const wait = dependencies.sleep ?? ((milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  await mkdir(outputDirectory, { recursive: true });
  const artifactPath = resolve(outputDirectory, RETRIEVAL_EVIDENCE_FILENAME);
  const createEvidence = (runStatus: RetrievalEvidence["runStatus"]): RetrievalEvidence => ({
    kind: "P5.7-E_RETRIEVAL_EVIDENCE",
    runId: options.runId,
    runTimestamp: options.timestamp ?? new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    synthetic: dependencies.synthetic ?? false,
    mode: options.live ? "LIVE" : "DRY_RUN",
    runStatus,
    ...(stopReason ? { stopReason } : {}),
    configuration: {
      vectorLimit: 20,
      ftsLimit: 20,
      rrfK: RRF_K,
      finalLimit: 6,
      maximumCases: options.maxCases,
      maximumEmbeddingCalls: embeddingBudget,
      maximumLogicalReadSearches: logicalReadBudget,
      requestDelayMs: options.requestDelayMs,
      fullDatasetAuthorized: options.fullDatasetAuthorized,
      queryRewriteCalls: 0,
      generationCalls: 0,
      automaticProviderRetries: 0,
    },
    versions: {
      model: config.versioning.chatModel,
      embedding: config.versioning.embedding,
      ingestion: config.versioning.ingestion,
      prompt: config.versioning.prompt,
      threshold: config.versioning.threshold,
    },
    cases,
  });
  const persist = (runStatus: RetrievalEvidence["runStatus"], exclusive = false) => writeFile(
    artifactPath,
    `${JSON.stringify(createEvidence(runStatus), null, 2)}\n`,
    { encoding: "utf8", flag: exclusive ? "wx" : "w" },
  );
  await persist("IN_PROGRESS", true);

  for (const [index, item] of selected.entries()) {
    const base = baseCase(item, environment);
    if (!options.live) {
      cases.push({
        ...base,
        executionStatus: "DRY_RUN",
        vectorTop20: [],
        ftsTop20: [],
        rrf: { k: RRF_K, rankings: [] },
        finalTop6: [],
        logicalReadSearches: 0,
      });
      await persist("IN_PROGRESS");
      continue;
    }
    if (index > 0 && options.requestDelayMs > 0) await wait(options.requestDelayMs);
    if (!dependencies.executeCase) throw new Error("Live mode requires a retrieval executor");
    if (embeddingCalls >= embeddingBudget) throw new Error("Embedding call budget exhausted");
    const started = dependencies.now?.() ?? performance.now();
    try {
      const execution = await dependencies.executeCase(item);
      const physicalCalls = execution.result.diagnostics.queryEmbeddingCalls;
      if (!Number.isInteger(execution.logicalReadSearches) || execution.logicalReadSearches < 0 || execution.logicalReadSearches > 2) {
        throw new Error("Logical read search budget exceeded for one case");
      }
      logicalReadSearches += execution.logicalReadSearches;
      if (logicalReadSearches > logicalReadBudget) throw new Error("Logical read search budget exceeded");
      embeddingCalls += physicalCalls;
      if (physicalCalls > 1 || embeddingCalls > embeddingBudget) {
        throw new Error("Embedding call budget exceeded");
      }
      const rankings = fusedEvidence(execution.vectorCandidates, execution.ftsCandidates);
      cases.push({
        ...base,
        executionStatus: execution.result.status.mode === "UNAVAILABLE" || execution.result.diagnostics.embedding.failure
          ? "FAILURE"
          : "SUCCESS",
        retrievalStatus: execution.result.status,
        embedding: { ...base.embedding, calls: physicalCalls },
        vectorTop20: execution.vectorCandidates.slice(0, 20).map(candidateEvidence),
        ftsTop20: execution.ftsCandidates.slice(0, 20).map(candidateEvidence),
        rrf: { k: RRF_K, rankings },
        finalTop6: rankings.slice(0, 6),
        diagnostics: execution.result.diagnostics,
        latencyMs: (dependencies.now?.() ?? performance.now()) - started,
        logicalReadSearches: execution.logicalReadSearches,
        ...(execution.result.status.mode === "UNAVAILABLE" || execution.result.diagnostics.embedding.failure
          ? { errorCategory: "RETRIEVAL_FAILURE" as const }
          : {}),
      });
      const embeddingFailure = execution.result.diagnostics.embedding.failure;
      if (embeddingFailure) {
        stopReason = embeddingFailure === "RATE_LIMIT" ? "PROVIDER_RATE_LIMITED" : "PROVIDER_FAILURE";
      }
    } catch {
      embeddingCalls += 1;
      if (embeddingCalls > embeddingBudget) throw new Error("Embedding call budget exceeded");
      cases.push({
        ...base,
        executionStatus: "FAILURE",
        embedding: { ...base.embedding, calls: 1 },
        vectorTop20: [],
        ftsTop20: [],
        rrf: { k: RRF_K, rankings: [] },
        finalTop6: [],
        latencyMs: (dependencies.now?.() ?? performance.now()) - started,
        logicalReadSearches: 0,
        errorCategory: "RETRIEVAL_FAILURE",
      });
      if (options.fullDatasetAuthorized) stopReason = "RETRIEVAL_FAILURE";
    }
    await persist(stopReason ? "STOPPED" : "IN_PROGRESS");
    if (stopReason) break;
  }

  const evidence = createEvidence(stopReason ? "STOPPED" : "COMPLETED");
  await persist(evidence.runStatus);
  return { evidence, artifactPath };
}
