export type ChatSource = {
  id: string;
  title: string;
  url: string;
  kind: "solution" | "case-study" | "post" | "page";
};

export type RetrievedChunk = {
  id: string;
  content: string;
  source: ChatSource;
  scores?: {
    vector?: number;
    keyword?: number;
    rrf?: number;
  };
};

export type Citation = {
  label: `[S${number}]`;
  source: ChatSource;
};

export type RedactedInput = {
  value: string;
  containsPii: boolean;
  redactions: { emails: number; phones: number };
};

export type ChatVersionMetadata = {
  chatModelVersion: string;
  embeddingVersion: string;
  promptVersion: string;
  thresholdVersion: "UN-CALIBRATED" | string;
  ingestionVersion: string;
};

export type ChatFailureReason =
  | "NO_CONTEXT"
  | "EMBEDDING_ERROR"
  | "GENERATION_RATE_LIMIT"
  | "GENERATION_ERROR"
  | "DATABASE_ERROR"
  | "RATE_LIMIT_ERROR"
  | "TURNSTILE_ERROR"
  | "CITATION_MISMATCH";
