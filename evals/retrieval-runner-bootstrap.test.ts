import assert from "node:assert/strict";
import test from "node:test";

import {
  createLiveExecutor,
  loadPayloadRuntimeModules,
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

test("live executor construction is provider-free and database-lazy", async () => {
  let getPayloadCalls = 0;
  const executor = await createLiveExecutor(environment, async () => ({
    getPayload: (() => {
      getPayloadCalls += 1;
      throw new Error("Database initialization must remain lazy");
    }) as never,
    payloadConfig: {} as never,
  }));
  assert.equal(typeof executor, "function");
  assert.equal(getPayloadCalls, 0);
});
