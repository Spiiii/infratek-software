import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";

import { createLiveQueryEmbeddingAdapter } from "../src/lib/chat/retrieval/query-embedding.ts";
import { FtsRetrievalRepository, VectorRetrievalRepository } from "../src/lib/chat/retrieval/repository.ts";
import { retrieve } from "../src/lib/chat/retrieval/retrieve.ts";
import type { FtsCandidate, VectorCandidate } from "../src/lib/chat/retrieval/types.ts";
import {
  runRetrievalEvaluation,
  validateRetrievalRunnerOptions,
  type RetrievalCaseExecutor,
  type RetrievalRunnerOptions,
} from "./retrieval-runner.ts";
import { loadAndValidateChatDataset } from "./validate-chat-dataset.ts";

function values(name: string): string[] {
  return process.argv.flatMap((value, index) => value === name ? [process.argv[index + 1] ?? ""] : []);
}

function value(name: string): string | undefined {
  return values(name).at(-1);
}

function positiveInteger(name: string, fallback?: number): number {
  const raw = value(name);
  if (!raw && fallback !== undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} requires a positive integer`);
  return parsed;
}

function required(name: string): string {
  const result = value(name)?.trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

type PayloadRuntimeModules = {
  getPayload: typeof import("payload")["getPayload"];
  payloadConfig: Awaited<typeof import("../payload.config.ts")>["default"];
};

export async function createEvaluationPayloadConfig(
  payloadConfig: PayloadRuntimeModules["payloadConfig"],
): Promise<Awaited<PayloadRuntimeModules["payloadConfig"]>> {
  const resolvedConfig = await payloadConfig;
  return {
    ...resolvedConfig,
    typescript: {
      ...resolvedConfig.typescript,
      autoGenerate: false,
    },
  };
}

export function initializeEvaluationPayload(
  getPayload: PayloadRuntimeModules["getPayload"],
  payloadConfig: PayloadRuntimeModules["payloadConfig"],
): ReturnType<PayloadRuntimeModules["getPayload"]> {
  return getPayload({ config: createEvaluationPayloadConfig(payloadConfig) });
}

export async function loadPayloadRuntimeModules(): Promise<PayloadRuntimeModules> {
  const [{ getPayload }, { default: payloadConfig }] = await Promise.all([
    import("payload"),
    import("../payload.config.ts"),
  ]);
  return { getPayload, payloadConfig };
}

export type ManagedRetrievalExecutor = {
  executeCase: RetrievalCaseExecutor;
  close(): Promise<void>;
};

export async function createLiveExecutor(
  environment: Record<string, string | undefined>,
  loadModules: () => Promise<PayloadRuntimeModules> = loadPayloadRuntimeModules,
): Promise<ManagedRetrievalExecutor> {
  const { getPayload, payloadConfig } = await loadModules();
  let payloadPromise: ReturnType<typeof getPayload> | undefined;
  const payload = () => {
    payloadPromise ??= initializeEvaluationPayload(getPayload, payloadConfig);
    return payloadPromise;
  };
  const executor = {
    async query(sql: string, parameters: unknown[]) {
      const result = await (await payload()).db.pool.query(sql, parameters);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  };
  const queryEmbedding = createLiveQueryEmbeddingAdapter(environment);
  const vector = new VectorRetrievalRepository(executor, environment);
  const fts = new FtsRetrievalRepository(executor);

  const executeCase: RetrievalCaseExecutor = async (item) => {
    let vectorCandidates: VectorCandidate[] = [];
    let ftsCandidates: FtsCandidate[] = [];
    const result = await retrieve(item.question, {
      queryEmbedding,
      vectorRepository: {
        async findTopCandidates(embedding) {
          const response = await vector.findTopCandidates(embedding);
          vectorCandidates = response.candidates;
          return response;
        },
      },
      ftsRepository: {
        async findTopCandidates(query) {
          const response = await fts.findTopCandidates(query);
          ftsCandidates = response.candidates;
          return response;
        },
      },
    }, environment);
    return { result, vectorCandidates, ftsCandidates };
  };

  return {
    executeCase,
    async close() {
      const initializedPayload = payloadPromise;
      payloadPromise = undefined;
      if (!initializedPayload) return;
      const instance = await initializedPayload.catch(() => undefined);
      if (instance) await instance.destroy();
    },
  };
}

export async function withManagedRetrievalExecutor<T>(
  executor: ManagedRetrievalExecutor,
  operation: (executeCase: RetrievalCaseExecutor) => Promise<T>,
): Promise<T> {
  try {
    return await operation(executor.executeCase);
  } finally {
    await executor.close();
  }
}

export async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  nextEnv.loadEnvConfig(repositoryRoot);
  const runId = required("--run-id");
  const live = process.argv.includes("--live");
  const caseIds = values("--case-id").map((item) => item.trim()).filter(Boolean);
  const maxCases = positiveInteger("--max-cases", live ? undefined : 120);
  const maxEmbeddingCalls = value("--max-embedding-calls")
    ? positiveInteger("--max-embedding-calls")
    : undefined;
  const outputDirectory = resolve(
    value("--output-dir") ?? resolve(tmpdir(), "infratek-p5.7e", runId),
  );
  const dataset = await loadAndValidateChatDataset();
  const options: RetrievalRunnerOptions = {
    runId,
    outputDirectory,
    repositoryRoot,
    live,
    caseIds,
    maxCases,
    maxEmbeddingCalls,
  };
  validateRetrievalRunnerOptions(options);
  const datasetIds = new Set(dataset.cases.map((item) => item.id));
  for (const caseId of caseIds) {
    if (!datasetIds.has(caseId)) throw new Error(`Unknown case id: ${caseId}`);
  }
  const execute = (executeCase?: RetrievalCaseExecutor) => runRetrievalEvaluation(
    dataset,
    options,
    { environment: process.env, executeCase },
  );
  const result = live
    ? await withManagedRetrievalExecutor(await createLiveExecutor(process.env), execute)
    : await execute();
  const { evidence, artifactPath } = result;

  process.stdout.write(`${JSON.stringify({
    runId: evidence.runId,
    mode: evidence.mode,
    cases: evidence.cases.length,
    embeddingCalls: evidence.cases.reduce((sum, item) => sum + item.embedding.calls, 0),
    generationCalls: evidence.configuration.generationCalls,
    artifactPath,
  })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
