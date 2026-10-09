import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { readChatBuildSafeConfig } from "../src/lib/chat/config.ts";
import { RRF_K } from "../src/lib/chat/retrieval/config.ts";
import { fuseCandidates } from "../src/lib/chat/retrieval/fusion.ts";
import type { FtsCandidate, RetrievalResult, VectorCandidate } from "../src/lib/chat/retrieval/types.ts";
import type { ChatEvalDataset } from "./validate-chat-dataset.ts";

export const RETRIEVAL_EVIDENCE_FILENAME = "retrieval-evidence.json";

export type RetrievalRunnerOptions = {
  runId: string;
  outputDirectory: string;
  repositoryRoot: string;
  live: boolean;
  caseIds: string[];
  maxCases: number;
  maxEmbeddingCalls?: number;
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
  errorCategory?: "RETRIEVAL_FAILURE";
};

export type RetrievalEvidence = {
  kind: "P5.7-E_RETRIEVAL_EVIDENCE";
  runId: string;
  runTimestamp: string;
  datasetVersion: string;
  synthetic: boolean;
  mode: "DRY_RUN" | "LIVE";
  configuration: {
    vectorLimit: 20;
    ftsLimit: 20;
    rrfK: 60;
    finalLimit: 6;
    maximumCases: number;
    maximumEmbeddingCalls: number;
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
  if (options.maxCases >= 120 || options.caseIds.length >= 120) {
    throw new Error("A full 120-case live run is forbidden");
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
): Omit<RetrievalEvidenceCase, "executionStatus" | "vectorTop20" | "ftsTop20" | "rrf" | "finalTop6"> {
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
    synthetic?: boolean;
  } = {},
): Promise<{ evidence: RetrievalEvidence; artifactPath: string }> {
  validateRetrievalRunnerOptions(options);
  const outputDirectory = assertSafeOutputDirectory(options.outputDirectory, options.repositoryRoot);
  const selected = selectCases(dataset, options);
  const environment = dependencies.environment ?? process.env;
  const config = readChatBuildSafeConfig(environment);
  const embeddingBudget = options.live ? options.maxEmbeddingCalls ?? 0 : 0;
  const cases: RetrievalEvidenceCase[] = [];
  let embeddingCalls = 0;

  for (const item of selected) {
    const base = baseCase(item, environment);
    if (!options.live) {
      cases.push({
        ...base,
        executionStatus: "DRY_RUN",
        vectorTop20: [],
        ftsTop20: [],
        rrf: { k: RRF_K, rankings: [] },
        finalTop6: [],
      });
      continue;
    }
    if (!dependencies.executeCase) throw new Error("Live mode requires a retrieval executor");
    if (embeddingCalls >= embeddingBudget) throw new Error("Embedding call budget exhausted");
    const started = dependencies.now?.() ?? performance.now();
    try {
      const execution = await dependencies.executeCase(item);
      const physicalCalls = execution.result.diagnostics.queryEmbeddingCalls;
      embeddingCalls += physicalCalls;
      if (physicalCalls > 1 || embeddingCalls > embeddingBudget) {
        throw new Error("Embedding call budget exceeded");
      }
      const rankings = fusedEvidence(execution.vectorCandidates, execution.ftsCandidates);
      cases.push({
        ...base,
        executionStatus: execution.result.status.mode === "UNAVAILABLE" ? "FAILURE" : "SUCCESS",
        retrievalStatus: execution.result.status,
        embedding: { ...base.embedding, calls: physicalCalls },
        vectorTop20: execution.vectorCandidates.slice(0, 20).map(candidateEvidence),
        ftsTop20: execution.ftsCandidates.slice(0, 20).map(candidateEvidence),
        rrf: { k: RRF_K, rankings },
        finalTop6: rankings.slice(0, 6),
        diagnostics: execution.result.diagnostics,
        latencyMs: (dependencies.now?.() ?? performance.now()) - started,
        ...(execution.result.status.mode === "UNAVAILABLE"
          ? { errorCategory: "RETRIEVAL_FAILURE" as const }
          : {}),
      });
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
        errorCategory: "RETRIEVAL_FAILURE",
      });
    }
  }

  const evidence: RetrievalEvidence = {
    kind: "P5.7-E_RETRIEVAL_EVIDENCE",
    runId: options.runId,
    runTimestamp: options.timestamp ?? new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    synthetic: dependencies.synthetic ?? false,
    mode: options.live ? "LIVE" : "DRY_RUN",
    configuration: {
      vectorLimit: 20,
      ftsLimit: 20,
      rrfK: RRF_K,
      finalLimit: 6,
      maximumCases: options.maxCases,
      maximumEmbeddingCalls: embeddingBudget,
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
  };
  await mkdir(outputDirectory, { recursive: true });
  const artifactPath = resolve(outputDirectory, RETRIEVAL_EVIDENCE_FILENAME);
  await writeFile(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { evidence, artifactPath };
}
