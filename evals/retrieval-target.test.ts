import assert from "node:assert/strict";
import test from "node:test";

import { assertRetrievalPreviewDatabase } from "./retrieval-target.ts";

const preview = "postgresql://test:test@ep-nameless-leaf-b3fc4hoi-pooler.example.neon.tech/neondb?sslmode=require";

test("live retrieval accepts only the pinned Preview endpoint and neondb", () => {
  assert.equal(assertRetrievalPreviewDatabase({ DATABASE_URL: preview }), preview);
  assert.throws(() => assertRetrievalPreviewDatabase({
    DATABASE_URL: "postgresql://test:test@ep-still-fog-b3h6yj1y-pooler.example.neon.tech/neondb?sslmode=require",
  }), /Refusing preview migration/u);
  assert.throws(() => assertRetrievalPreviewDatabase({
    DATABASE_URL: "postgresql://test:test@ep-nameless-leaf-b3fc4hoi.example.neon.tech/other",
  }), /requires Preview database neondb/u);
});
