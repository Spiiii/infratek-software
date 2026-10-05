import assert from "node:assert/strict";
import test from "node:test";

import type {
  RetrievalDiagnostics,
  RetrievalResult,
  RetrievalStatus,
  SelectedSource,
} from "../retrieval/types.ts";
import { decideAnswer, preCalibrationDecisionPolicy } from "./policy.ts";
import { PRE_CALIBRATION_POLICY_VERSION } from "./types.ts";

const source: SelectedSource = {
  source: {
    label: "S1",
    docType: "solution",
    docId: "solution-1",
    chunkKey: "overview",
    title: "AI Consulting",
    headingPath: ["Tổng quan"],
    content: "Nội dung nguồn đã xuất bản.",
    url: "/solutions/ai-consulting",
  },
  diagnostics: {
    vectorRank: 1,
    ftsRank: 20,
    vectorDistance: 0.01,
    vectorSimilarity: 0.99,
    ftsScore: 100,
    rrfScore: 1,
  },
};

function diagnostics(mode: RetrievalDiagnostics["mode"]): RetrievalDiagnostics {
  return {
    mode,
    vectorCandidateCount: 0,
    ftsCandidateCount: 0,
    fusedCandidateCount: 0,
    selectedSourceCount: 0,
    queryEmbeddingCalls: 0,
    queryRewriteCalls: 0,
    chatModelCalls: 0,
    failures: [],
    embedding: { attempted: true, physicalCalls: 0, model: "test", dimension: 768 },
    vector: { attempted: false, succeeded: false, candidateCount: 0 },
    fts: { attempted: true, succeeded: false, candidateCount: 0 },
    fusion: {
      fusedCandidateCount: 0,
      selectedCount: 0,
      distinctDocumentCount: 0,
      maxChunksFromSingleDocument: 0,
    },
  };
}

function result(status: RetrievalStatus, sources: SelectedSource[] = []): RetrievalResult {
  return { status, sources, diagnostics: diagnostics(status.mode) };
}

const currentStatuses: Array<{ name: string; status: RetrievalStatus; expected: string }> = [
  {
    name: "hybrid candidates",
    status: { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "FTS-only candidates",
    status: { mode: "FTS_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "vector-only candidates",
    status: { mode: "VECTOR_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "hybrid candidates marked accepted by a future retriever",
    status: { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "ACCEPTED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "FTS-only candidates marked accepted by a future retriever",
    status: { mode: "FTS_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "ACCEPTED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "vector-only candidates marked accepted by a future retriever",
    status: { mode: "VECTOR_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "ACCEPTED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "hybrid structural zero",
    status: { mode: "HYBRID", candidateState: "NO_CANDIDATES", relevanceState: "NO_CONTEXT" },
    expected: "NO_CONTEXT",
  },
  {
    name: "FTS-only zero",
    status: { mode: "FTS_ONLY", candidateState: "NO_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "vector-only zero",
    status: { mode: "VECTOR_ONLY", candidateState: "NO_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    expected: "CALIBRATION_REQUIRED",
  },
  {
    name: "unavailable",
    status: { mode: "UNAVAILABLE", candidateState: "UNKNOWN", relevanceState: "UNAVAILABLE" },
    expected: "DEPENDENCY_FALLBACK",
  },
];

test("default pre-calibration policy maps every production retrieval status safely", () => {
  for (const fixture of currentStatuses) {
    const sources = fixture.status.candidateState === "HAS_CANDIDATES" ? [source] : [];
    const decision = decideAnswer(result(fixture.status, sources));
    assert.equal(decision.state, fixture.expected, fixture.name);
    assert.equal(decision.policyVersion, PRE_CALIBRATION_POLICY_VERSION, fixture.name);
    assert.notEqual(decision.state, "ANSWER", fixture.name);
  }
});

test("structural zero and unavailable decisions never fabricate sources", () => {
  const structuralZero = decideAnswer(
    result({ mode: "HYBRID", candidateState: "NO_CANDIDATES", relevanceState: "NO_CONTEXT" }),
  );
  const unavailable = decideAnswer(
    result({ mode: "UNAVAILABLE", candidateState: "UNKNOWN", relevanceState: "UNAVAILABLE" }),
  );

  assert.deepEqual(structuralZero, {
    state: "NO_CONTEXT",
    reason: "STRUCTURAL_ZERO",
    policyVersion: PRE_CALIBRATION_POLICY_VERSION,
  });
  assert.deepEqual(unavailable, {
    state: "DEPENDENCY_FALLBACK",
    reason: "RETRIEVAL_UNAVAILABLE",
    policyVersion: PRE_CALIBRATION_POLICY_VERSION,
  });
  assert.equal("sources" in structuralZero, false);
  assert.equal("sources" in unavailable, false);
});

test("candidate decisions preserve the retrieval sources without mutation", () => {
  const sources = [structuredClone(source)];
  const input = result(
    { mode: "HYBRID", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    sources,
  );
  const before = structuredClone(input);
  const decision = decideAnswer(input);

  assert.equal(decision.state, "CALIBRATION_REQUIRED");
  if (decision.state !== "CALIBRATION_REQUIRED") return;
  assert.equal(decision.sources, sources);
  assert.deepEqual(input, before);
});

test("retrieval scores and diagnostics cannot influence the pre-calibration decision", () => {
  const lowScore = structuredClone(source);
  lowScore.diagnostics = {
    vectorDistance: 999,
    vectorSimilarity: -999,
    ftsScore: -999,
    rrfScore: -999,
  };
  const highScore = structuredClone(source);
  highScore.diagnostics = {
    vectorDistance: 0,
    vectorSimilarity: 1,
    ftsScore: Number.MAX_SAFE_INTEGER,
    rrfScore: Number.MAX_SAFE_INTEGER,
  };
  const status: RetrievalStatus = {
    mode: "HYBRID",
    candidateState: "HAS_CANDIDATES",
    relevanceState: "UN_CALIBRATED",
  };

  assert.equal(decideAnswer(result(status, [lowScore])).state, "CALIBRATION_REQUIRED");
  assert.equal(decideAnswer(result(status, [highScore])).state, "CALIBRATION_REQUIRED");
});

test("the default policy remains deterministic", () => {
  const input = result(
    { mode: "FTS_ONLY", candidateState: "HAS_CANDIDATES", relevanceState: "UN_CALIBRATED" },
    [source],
  );
  assert.deepEqual(decideAnswer(input), decideAnswer(input));
  assert.equal(preCalibrationDecisionPolicy.version, PRE_CALIBRATION_POLICY_VERSION);
});

test("an invalid runtime status fails closed without leaking its shape", () => {
  const invalid = result(
    {
      mode: "HYBRID",
      candidateState: "UNKNOWN",
      relevanceState: "ACCEPTED",
    } as unknown as RetrievalStatus,
    [source],
  );
  const decision = decideAnswer(invalid);
  assert.deepEqual(decision, {
    state: "DEPENDENCY_FALLBACK",
    reason: "INVALID_RETRIEVAL_STATE",
    policyVersion: PRE_CALIBRATION_POLICY_VERSION,
  });
});
