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

export const vercelClientIpResolver: ClientIpResolver = {
  resolve(request) {
    const value = request.headers.get("x-vercel-forwarded-for");
    if (value === null || value.includes(",")) {
      return { state: "DEPLOYMENT_VERIFICATION_REQUIRED" };
    }
    const normalizedIp = normalizeTrustedClientIp(value);
    return normalizedIp
      ? { state: "RESOLVED", normalizedIp }
      : { state: "DEPLOYMENT_VERIFICATION_REQUIRED" };
  },
};

// Kept as an explicit fail-closed option for non-Vercel or unverified deployments.
export const deploymentGatedClientIpResolver: ClientIpResolver = {
  resolve: () => ({ state: "DEPLOYMENT_VERIFICATION_REQUIRED" }),
};
