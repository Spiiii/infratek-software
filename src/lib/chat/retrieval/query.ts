import { readChatBuildSafeConfig } from "../config.ts";
import { redactPii } from "../privacy.ts";

export type RetrievalQueryValidationCode = "INVALID_TYPE" | "EMPTY" | "TOO_LONG";

export class RetrievalQueryValidationError extends Error {
  readonly code: RetrievalQueryValidationCode;

  constructor(code: RetrievalQueryValidationCode) {
    super("Invalid retrieval query: " + code);
    this.name = "RetrievalQueryValidationError";
    this.code = code;
  }
}

declare const preparedRetrievalQueryValue: unique symbol;

export type PreparedRetrievalQueryValue = string & {
  readonly [preparedRetrievalQueryValue]: true;
};

export type PreparedRetrievalQuery = {
  value: PreparedRetrievalQueryValue;
  containsPii: boolean;
  redactions: { emails: number; phones: number };
  inputLength: number;
};

export function prepareRetrievalQuery(
  input: unknown,
  environment: Record<string, string | undefined> = process.env,
): PreparedRetrievalQuery {
  if (typeof input !== "string") throw new RetrievalQueryValidationError("INVALID_TYPE");

  const maxLength = readChatBuildSafeConfig(environment).limits.inputMaxLength;
  if (input.length > maxLength) throw new RetrievalQueryValidationError("TOO_LONG");

  const redacted = redactPii(input);
  const value = redacted.value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!value) throw new RetrievalQueryValidationError("EMPTY");

  return {
    value: value as PreparedRetrievalQueryValue,
    containsPii: redacted.containsPii,
    redactions: redacted.redactions,
    inputLength: input.length,
  };
}
