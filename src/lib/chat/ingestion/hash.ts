import { createHash } from "node:crypto";

export function contentHash(headingPath: string[], normalizedContent: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ headingPath, content: normalizedContent }))
    .digest("hex");
}
