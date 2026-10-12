import { cleanupExpiredChatData } from "@/lib/chat/retention/cleanup";
import { createRetentionCleanupHandler } from "@/lib/chat/retention/handler";
import { createLazyPayloadExecutor } from "@/lib/chat/route/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const handler = createRetentionCleanupHandler({
    secret: process.env.CRON_SECRET,
    cleanup: (now) => cleanupExpiredChatData(createLazyPayloadExecutor(), now),
  });
  return handler(request);
}
