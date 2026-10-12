import { timingSafeEqual } from "node:crypto";

import type { RetentionCleanupResult } from "./cleanup.ts";

type Cleanup = (now: Date) => Promise<RetentionCleanupResult>;

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const actual = Buffer.from(header, "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export function createRetentionCleanupHandler(options: {
  secret: string | undefined;
  cleanup: Cleanup;
  now?: () => Date;
}) {
  return async (request: Request): Promise<Response> => {
    if (!authorized(request.headers.get("authorization"), options.secret)) {
      return json({ error: "UNAUTHORIZED" }, 401);
    }
    try {
      const deleted = await options.cleanup((options.now ?? (() => new Date()))());
      return json({ ok: true, deleted }, 200);
    } catch {
      return json({ error: "CLEANUP_UNAVAILABLE" }, 503);
    }
  };
}
