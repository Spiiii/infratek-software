import assert from "node:assert/strict";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createEvaluationPayloadConfig,
  createLiveExecutor,
  initializeEvaluationPayload,
  loadPayloadRuntimeModules,
  withManagedRetrievalExecutor,
} from "./run-retrieval-eval.ts";

const environment = {
  GOOGLE_GENERATIVE_AI_API_KEY: "synthetic-provider-key-not-called",
  EMBED_MODEL: "gemini-embedding-2",
  EMBED_DIMENSION: "768",
  EMBED_VERSION: "gemini-embedding-2-768-p5.3",
  INGESTION_VERSION: "p5.3-v1",
  THRESHOLD_VERSION: "UN-CALIBRATED",
};

test("tsx resolves the real Payload config import chain", async () => {
  const modules = await loadPayloadRuntimeModules();
  assert.equal(typeof modules.getPayload, "function");
  assert.equal(typeof modules.payloadConfig, "object");
});

test("evaluation config disables type generation without mutating Payload config", async () => {
  const databaseAdapter = { name: "synthetic-db" };
  const collections = [{ slug: "synthetic-collection" }];
  const plugins = [() => undefined];
  const originalTypescript = {
    autoGenerate: true,
    outputFile: "src/payload-types.ts",
  };
  const original = {
    db: databaseAdapter,
    collections,
    plugins,
    typescript: originalTypescript,
  };

  const evaluation = await createEvaluationPayloadConfig(Promise.resolve(original) as never);

  assert.notEqual(evaluation, original);
  assert.notEqual(evaluation.typescript, originalTypescript);
  assert.equal(evaluation.typescript.autoGenerate, false);
  assert.equal(originalTypescript.autoGenerate, true);
  assert.equal(evaluation.db, databaseAdapter);
  assert.equal(evaluation.collections, collections);
  assert.equal(evaluation.plugins, plugins);
});

test("evaluation initialization passes only the no-generation config to Payload", async () => {
  const original = {
    collections: [],
    plugins: [],
    typescript: {
      autoGenerate: true,
      outputFile: "src/payload-types.ts",
    },
  };
  let receivedConfigPromise: Promise<typeof original> | undefined;
  const payload = Promise.resolve({ synthetic: true });
  const result = initializeEvaluationPayload(((options: { config: Promise<typeof original> }) => {
    receivedConfigPromise = options.config;
    return payload;
  }) as never, Promise.resolve(original) as never);

  assert.equal(result, payload);
  assert.ok(receivedConfigPromise);
  const receivedConfig = await receivedConfigPromise;
  assert.equal(receivedConfig?.typescript.autoGenerate, false);
  assert.equal(original.typescript.autoGenerate, true);
});

test("live executor construction is provider-free and database-lazy", async () => {
  let getPayloadCalls = 0;
  const executor = await createLiveExecutor(environment, async () => ({
    getPayload: (() => {
      getPayloadCalls += 1;
      throw new Error("Database initialization must remain lazy");
    }) as never,
    payloadConfig: {} as never,
  }));
  assert.equal(typeof executor.executeCase, "function");
  assert.equal(typeof executor.close, "function");
  assert.equal(getPayloadCalls, 0);
});

test("successful operation writes evidence before releasing resources", async () => {
  const directory = await mkdtemp(join(tmpdir(), "infratek-p5.7e-lifecycle-success-"));
  const artifact = join(directory, "retrieval-evidence.json");
  const order: string[] = [];
  let embeddingCalls = 0;
  const result = await withManagedRetrievalExecutor({
    async executeCase() {
      embeddingCalls += 1;
      throw new Error("not invoked by lifecycle harness");
    },
    async close() {
      await access(artifact);
      order.push("cleanup");
    },
  }, async () => {
    embeddingCalls += 1;
    await writeFile(artifact, "{\"synthetic\":true}\n", "utf8");
    order.push("evidence");
    return "complete";
  });
  assert.equal(result, "complete");
  assert.deepEqual(order, ["evidence", "cleanup"]);
  assert.equal(embeddingCalls, 1);
});

test("error path releases resources without retrying the operation", async () => {
  let operations = 0;
  let cleanups = 0;
  await assert.rejects(
    withManagedRetrievalExecutor({
      async executeCase() {
        throw new Error("not invoked by lifecycle harness");
      },
      async close() {
        cleanups += 1;
      },
    }, async () => {
      operations += 1;
      throw new Error("synthetic operation failure");
    }),
    /synthetic operation failure/u,
  );
  assert.equal(operations, 1);
  assert.equal(cleanups, 1);
});
