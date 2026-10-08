import { ChatLeadRepository } from "@/lib/chat/lead/repository";
import { createLeadPostHandler, createMemoryLeadRateLimiter } from "@/lib/chat/lead/route";
import { createChatLeadService } from "@/lib/chat/lead/service";
import { createLazyPayloadExecutor } from "@/lib/chat/route/runtime";
import { createResendLeadNotifier } from "@/lib/leads/notification";

export const runtime = "nodejs";
const service = createChatLeadService(
  new ChatLeadRepository(createLazyPayloadExecutor()),
  createResendLeadNotifier(),
);
export const POST = createLeadPostHandler({ service, limiter: createMemoryLeadRateLimiter() });
