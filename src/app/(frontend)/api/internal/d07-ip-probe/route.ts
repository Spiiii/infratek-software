import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENTINELS = {
  xForwardedFor: "192.0.2.10",
  xRealIp: "198.51.100.20",
  candidate: "203.0.113.30",
} as const;
const ephemeralKey = randomBytes(32);
const priorIdentities = new Map<string, string>();

function singleIp(value: string | null): string | null {
  if (value === null || value.includes(",")) return null;
  const normalized = value.trim().toLowerCase();
  return isIP(normalized) === 0 ? null : normalized;
}

function identity(value: string): string {
  return createHmac("sha256", ephemeralKey).update(value).digest("base64url");
}

export function GET(request: Request): Response {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response(null, { status: 404 });
  }

  const candidateRaw = request.headers.get("x-vercel-forwarded-for");
  const candidate = singleIp(candidateRaw);
  const xff = singleIp(request.headers.get("x-forwarded-for"));
  const xRealIp = singleIp(request.headers.get("x-real-ip"));
  const probeId = request.headers.get("x-infratek-d07-probe-id")?.trim();
  let priorAvailable = false;
  let sameOpaqueIdentity = false;

  if (candidate && probeId && /^[a-z0-9-]{8,64}$/i.test(probeId)) {
    const current = identity(candidate);
    const prior = priorIdentities.get(probeId);
    priorAvailable = prior !== undefined;
    sameOpaqueIdentity = prior === current;
    priorIdentities.set(probeId, current);
    if (priorIdentities.size > 100) priorIdentities.clear();
  }

  return Response.json({
    candidatePresent: candidateRaw !== null,
    candidateValidIp: candidate !== null,
    candidateSingleValue: candidateRaw !== null && !candidateRaw.includes(","),
    xffSpoofMatched: xff === SENTINELS.xForwardedFor,
    xRealIpSpoofMatched: xRealIp === SENTINELS.xRealIp,
    candidateSpoofMatched: candidate === SENTINELS.candidate,
    priorAvailable,
    sameOpaqueIdentity,
  }, { headers: { "cache-control": "no-store" } });
}
