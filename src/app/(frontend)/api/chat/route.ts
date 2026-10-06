import { createChatPostHandler } from "@/lib/chat/route/orchestrator";
import { DEPENDENCY_FALLBACK } from "@/lib/chat/route/contracts";
import { createChatRuntimeDependencies } from "@/lib/chat/route/runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    return await createChatPostHandler(createChatRuntimeDependencies())(request);
  } catch {
    return Response.json(
      { status: "DEPENDENCY_FALLBACK", fallback: DEPENDENCY_FALLBACK },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
