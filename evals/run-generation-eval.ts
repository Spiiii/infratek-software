import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { Pool } from "pg";

import { prepareRetrievalQuery } from "../src/lib/chat/retrieval/query.ts";
import type { SelectedSource } from "../src/lib/chat/retrieval/types.ts";
import { createLiveGeminiChatAdapter } from "../src/lib/chat/generation/gemini.ts";
import { generateGroundedAnswer } from "../src/lib/chat/service/grounded-answer.ts";
import { assertMigrationTarget } from "../scripts/migration-target-guard.ts";
import {
  EVAL_ONLY_POLICY_VERSION,
  runHydrationPreflight,
  runGenerationEvaluation,
  validateGenerationRunnerOptions,
  type GenerationExecution,
  type GenerationRunnerOptions,
  type HydratedChunkRow,
  type RecordedCandidate,
} from "./generation-runner.ts";
import { loadAndValidateChatDataset, type ChatEvalDataset } from "./validate-chat-dataset.ts";

function values(name: string): string[] {
  return process.argv.flatMap((value, index) => value === name ? [process.argv[index + 1] ?? ""] : []);
}

function value(name: string): string | undefined {
  return values(name).at(-1);
}

function required(name: string): string {
  const result = value(name)?.trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function positiveInteger(name: string, fallback?: number): number {
  const raw = value(name);
  if (!raw && fallback !== undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} requires a positive integer`);
  return parsed;
}

type SelectedHydrationCase = {
  datasetCase: ChatEvalDataset["cases"][number];
  artifactCase: { finalTop6: RecordedCandidate[] };
};

type HydrationClient = {
  query(sql: string, parameters?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
  release(): void;
};

type HydrationPool = {
  connect(): Promise<HydrationClient>;
  end(): Promise<void>;
};

export function assertPreviewDatabase(environment: Record<string, string | undefined>): string {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for live hydration");
  assertMigrationTarget("preview", databaseUrl);
  let database: string;
  try {
    database = new URL(databaseUrl).pathname.replace(/^\//u, "");
  } catch {
    throw new Error("DATABASE_URL is invalid");
  }
  if (database !== "neondb") throw new Error("Generation evaluation requires Preview database neondb");
  return databaseUrl;
}

export async function loadHydrationRowsReadOnly(
  pool: HydrationPool,
  candidates: RecordedCandidate[],
): Promise<HydratedChunkRow[]> {
  const unique = new Map(candidates.map((candidate) => [
    `${candidate.docType}\u0000${candidate.docId}\u0000${candidate.chunkKey}`,
    candidate,
  ]));
  const requested = [...unique.values()];
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN READ ONLY");
    transactionOpen = true;
    const result = await client.query(
      `WITH wanted AS (
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
           AS requested(doc_type, doc_id, chunk_key)
       )
       SELECT chunks.doc_type, chunks.doc_id, chunks.chunk_key, chunks.url,
              chunks.title, chunks.heading_path, chunks.content, chunks.content_hash
       FROM rag_chunks AS chunks
       INNER JOIN wanted USING (doc_type, doc_id, chunk_key)`,
      [
        requested.map((item) => item.docType),
        requested.map((item) => item.docId),
        requested.map((item) => item.chunkKey),
      ],
    );
    await client.query("ROLLBACK");
    transactionOpen = false;
    return result.rows.map((row) => ({
      docType: String(row.doc_type),
      docId: String(row.doc_id),
      chunkKey: String(row.chunk_key),
      url: String(row.url),
      title: row.title === null ? null : String(row.title),
      headingPath: Array.isArray(row.heading_path) ? row.heading_path.map(String) : [],
      content: String(row.content),
      contentHash: String(row.content_hash),
    }));
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function withHydrationResource<T>(
  pool: HydrationPool,
  operation: (pool: HydrationPool) => Promise<T>,
): Promise<T> {
  try {
    return await operation(pool);
  } finally {
    await pool.end();
  }
}

export async function hydrateSelectedCases(
  selected: SelectedHydrationCase[],
  environment: Record<string, string | undefined>,
): Promise<Map<string, HydratedChunkRow[]>> {
  const databaseUrl = assertPreviewDatabase(environment);
  const pool = new Pool({ connectionString: databaseUrl, max: 1 }) as unknown as HydrationPool;
  const candidates = selected.flatMap(({ artifactCase }) => artifactCase.finalTop6);
  const rows = await withHydrationResource(pool, (active) => loadHydrationRowsReadOnly(active, candidates));
  const byIdentity = new Map(rows.map((row) => [`${row.docType}\u0000${row.docId}\u0000${row.chunkKey}`, row]));
  return new Map(selected.map(({ datasetCase, artifactCase }) => [
    datasetCase.id,
    artifactCase.finalTop6.flatMap((candidate) => {
      const row = byIdentity.get(`${candidate.docType}\u0000${candidate.docId}\u0000${candidate.chunkKey}`);
      return row ? [row] : [];
    }),
  ]));
}

export function createGenerationExecutor(environment: Record<string, string | undefined>) {
  const generator = createLiveGeminiChatAdapter(environment);
  return async (
    item: ChatEvalDataset["cases"][number],
    sources: SelectedSource[],
  ): Promise<GenerationExecution> => {
    const question = prepareRetrievalQuery(item.question, environment);
    const callsBefore = generator.calls;
    const result = await generateGroundedAnswer({
      decision: { state: "ANSWER", sources, policyVersion: EVAL_ONLY_POLICY_VERSION },
      question,
      generator,
      environment,
    });
    const physicalCalls = generator.calls - callsBefore;
    const sanitizedOutput = result.state === "ANSWER"
      ? result.answer
      : result.state === "NO_ANSWER"
        ? "KHONG_CO_THONG_TIN"
        : null;
    return { result, physicalCalls, sanitizedOutput };
  };
}

export function assertRetrievalArtifactIntegrity(
  actual: Array<{ sha256: string }>,
  expectedSha256: string[],
): void {
  if (actual.length !== expectedSha256.length || actual.length === 0) {
    throw new Error("Expected one SHA-256 value for every retrieval artifact");
  }
  actual.forEach((item, index) => {
    const expected = expectedSha256[index]?.trim().toLowerCase();
    if (!expected || !/^[a-f0-9]{64}$/u.test(expected)) {
      throw new Error("Expected retrieval artifact SHA-256 is invalid");
    }
    if (item.sha256.toLowerCase() !== expected) {
      throw new Error("Retrieval artifact SHA-256 mismatch");
    }
  });
}

export async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  nextEnv.loadEnvConfig(repositoryRoot);
  const runId = required("--run-id");
  const live = process.argv.includes("--live");
  const hydrateOnly = process.argv.includes("--hydrate-only");
  const allowP52RetrievalForP53Generation = process.argv.includes(
    "--allow-p52-retrieval-for-p53-generation",
  );
  if (live && hydrateOnly) throw new Error("--live and --hydrate-only are mutually exclusive");
  const caseIds = values("--case-id").map((item) => item.trim()).filter(Boolean);
  const maxCases = positiveInteger("--max-cases");
  const maxGenerationCalls = value("--max-generation-calls")
    ? positiveInteger("--max-generation-calls")
    : undefined;
  const outputDirectory = resolve(
    value("--output-dir") ?? resolve(tmpdir(), `infratek-p5.7e-generation-${runId}`),
  );
  const retrievalArtifactPaths = values("--retrieval-artifact").map((item) => item.trim()).filter(Boolean);
  if (retrievalArtifactPaths.length === 0) throw new Error("--retrieval-artifact is required");
  const artifactFiles = await Promise.all(retrievalArtifactPaths.map(async (path) => {
    const buffer = await readFile(resolve(path));
    const raw = JSON.parse(buffer.toString("utf8")) as unknown;
    const runId = typeof raw === "object" && raw !== null && "runId" in raw
      ? String((raw as { runId: unknown }).runId)
      : "";
    return {
      raw,
      integrity: {
        runId,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        bytes: buffer.byteLength,
      },
    };
  }));
  const rawArtifacts = artifactFiles.map((item) => item.raw);
  const expectedRetrievalHashes = values("--expected-retrieval-sha256");
  if (allowP52RetrievalForP53Generation) {
    assertRetrievalArtifactIntegrity(
      artifactFiles.map((item) => item.integrity),
      expectedRetrievalHashes,
    );
  } else if (expectedRetrievalHashes.length > 0) {
    throw new Error("--expected-retrieval-sha256 requires the explicit p5.2-to-p5.3 opt-in");
  }
  const dataset = await loadAndValidateChatDataset();
  const options: GenerationRunnerOptions = {
    runId,
    outputDirectory,
    repositoryRoot,
    live,
    caseIds,
    maxCases,
    maxGenerationCalls,
    allowP52RetrievalForP53Generation,
  };
  validateGenerationRunnerOptions(options);
  if (hydrateOnly) {
    const result = await runHydrationPreflight(dataset, rawArtifacts, options, {
      environment: process.env,
      hydrateCases: (selected) => hydrateSelectedCases(selected, process.env),
      sourceArtifactIntegrity: artifactFiles.map((item) => item.integrity),
    });
    process.stdout.write(`${JSON.stringify({
      runId: result.evidence.runId,
      mode: "HYDRATION_ONLY",
      cases: result.evidence.cases.length,
      expectedChunks: result.evidence.configuration.expectedChunkReferences,
      resolvedChunks: result.evidence.configuration.resolvedChunkReferences,
      generationCalls: 0,
      embeddingCalls: 0,
      artifactPath: result.artifactPath,
    })}\n`);
    return;
  }
  const result = await runGenerationEvaluation(dataset, rawArtifacts, options, {
    environment: process.env,
    ...(live ? {
      hydrateCases: (selected) => hydrateSelectedCases(selected, process.env),
      executeGeneration: createGenerationExecutor(process.env),
    } : {}),
  });
  process.stdout.write(`${JSON.stringify({
    runId: result.evidence.runId,
    mode: result.evidence.mode,
    cases: result.evidence.cases.length,
    generationCalls: result.evidence.cases.reduce((sum, item) => sum + item.physicalGenerationCalls, 0),
    embeddingCalls: result.evidence.configuration.embeddingCalls,
    artifactPath: result.artifactPath,
  })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
