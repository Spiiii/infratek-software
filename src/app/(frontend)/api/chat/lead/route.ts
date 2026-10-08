import { ChatLeadRepository } from "@/lib/chat/lead/repository";
import { createLeadPostHandler } from "@/lib/chat/lead/route";
import { createChatLeadService } from "@/lib/chat/lead/service";
import { createLazyPayloadExecutor } from "@/lib/chat/route/runtime";
import { readChatSecuritySecrets } from "@/lib/chat/config";
import { vercelClientIpResolver } from "@/lib/chat/security/ip";
import { createConfiguredUpstashLeadRateLimiter } from "@/lib/chat/security/rate-limit";
import { createResendLeadNotifier } from "@/lib/leads/notification";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const secrets = readChatSecuritySecrets();
    const service = createChatLeadService(
      new ChatLeadRepository(createLazyPayloadExecutor()),
      createResendLeadNotifier(),
    );
    return await createLeadPostHandler({
      service,
      limiter: createConfiguredUpstashLeadRateLimiter({ url: secrets.upstashUrl, token: secrets.upstashToken }),
      clientIpResolver: vercelClientIpResolver,
      ipHmacSecret: secrets.ipHmacSecret,
    })(request);
  } catch {
    return Response.json(
      { status: "DEPENDENCY_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
