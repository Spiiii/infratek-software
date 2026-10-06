import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import type { ClientIpResolver } from "./types.ts";

export function normalizeTrustedClientIp(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return isIP(normalized) === 0 ? null : normalized;
}

export function deriveIpLimiterKey(normalizedIp: string, secret: string): string {
  if (isIP(normalizedIp) === 0) throw new Error("Trusted client IP must be normalized before derivation");
  return createHmac("sha256", secret).update(normalizedIp).digest("base64url");
}

// Forwarding headers remain untrusted until the authoritative Vercel source is verified on Preview.
export const deploymentGatedClientIpResolver: ClientIpResolver = {
  resolve: () => ({ state: "DEPLOYMENT_VERIFICATION_REQUIRED" }),
};
