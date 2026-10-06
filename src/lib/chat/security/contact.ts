import { company } from "../../../data/company.ts";

import type { ContactFallbackMetadata, DistributedRateLimitResult } from "./types.ts";

export const CHAT_CONTACT = { phone: company.phone, email: company.email } as const;

export function mapRateLimitFallback(
  result: Exclude<DistributedRateLimitResult, { state: "ALLOWED" }>,
): ContactFallbackMetadata {
  if (result.state === "DEPENDENCY_UNAVAILABLE") {
    return { kind: "SERVICE_FALLBACK_WITH_CONTACT", contact: CHAT_CONTACT };
  }
  if (result.reason === "IP_MINUTE_LIMIT") return { kind: "RETRY_LATER" };
  return { kind: "CONTACT_FALLBACK", contact: CHAT_CONTACT };
}
