import { UNCALIBRATED_THRESHOLD_VERSION } from "../config.ts";

export const VECTOR_CANDIDATE_LIMIT = 20;
export const FTS_CANDIDATE_LIMIT = 20;
export const FINAL_SOURCE_LIMIT = 6;
export const RRF_K = 60;

export const RETRIEVAL_THRESHOLD = {
  state: UNCALIBRATED_THRESHOLD_VERSION,
} as const;

export const INTERACTIVE_EMBEDDING_CONFIG = {
  requestDelayMs: 0,
  maxRetries: 0,
  maxPhysicalCallsPerQuestion: 1,
  queryRewriteCalls: 0,
  chatModelCalls: 0,
} as const;
