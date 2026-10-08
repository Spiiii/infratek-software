import { ChatFeedbackRepository } from "@/lib/chat/feedback/repository";
import { createFeedbackPostHandler } from "@/lib/chat/feedback/route";
import { createFeedbackService } from "@/lib/chat/feedback/service";
import { createLazyPayloadExecutor } from "@/lib/chat/route/runtime";

export const runtime = "nodejs";
const service = createFeedbackService(new ChatFeedbackRepository(createLazyPayloadExecutor()));
export const POST = createFeedbackPostHandler({ service });
