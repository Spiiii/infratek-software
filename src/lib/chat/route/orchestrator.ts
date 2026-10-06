import { prepareMultiTurnRetrieval } from "../conversation/multi-turn.ts";
import type {
  ActiveConversationResult,
  ConversationHistoryResult,
  ConversationPersistenceResult,
} from "../conversation/types.ts";
import type { RelevanceDecisionPolicy } from "../decision/types.ts";
import type { ChatGenerationAdapter } from "../generation/types.ts";
import type { CitedPublicSource } from "../grounding/citations.ts";
import type { RetrievalResult } from "../retrieval/types.ts";
import type { UnsupportedOutputCategory } from "../safety/output.ts";
import type {
  ChatSecurityResult,
  ClientIpResolver,
  ContactFallbackMetadata,
  SessionCookieContract,
} from "../security/types.ts";
import { generateGroundedAnswer } from "../service/grounded-answer.ts";
import { containsObviousAttackPattern } from "./attack-filter.ts";
import {
  DEPENDENCY_FALLBACK,
  NO_CONTEXT_FALLBACK,
  publicChatRequestSchema,
  type PublicChatResponse,
} from "./contracts.ts";

type PersistInput = {
  userMessage: string;
  assistantMessage?: string;
  sources?: CitedPublicSource[];
  unsupportedCategories?: readonly UnsupportedOutputCategory[];
};

export type ChatRouteDependencies = {
  clientIpResolver: ClientIpResolver;
  security: {
    authorize(input: {
      sessionToken?: string | null;
      turnstileToken?: string | null;
      clientIp: ReturnType<ClientIpResolver["resolve"]>;
      production?: boolean;
    }): Promise<ChatSecurityResult>;
  };
  conversations: {
    findActive(sessionId: string): Promise<ActiveConversationResult>;
    history(conversationId: string): Promise<ConversationHistoryResult>;
    create(input: PersistInput & { sessionId: string }): Promise<ConversationPersistenceResult>;
    append(input: PersistInput & { conversationId: string }): Promise<ConversationPersistenceResult>;
  };
  retrieve(question: string): Promise<RetrievalResult>;
  decisionPolicy: RelevanceDecisionPolicy;
  generator: ChatGenerationAdapter;
  unanswered: {
    record(input: { trigger: "NO_CONTEXT" | "NO_ANSWER"; question: string }): Promise<unknown>;
  };
  production?: boolean;
  environment?: Record<string, string | undefined>;
};

type RouteResult = {
  response: PublicChatResponse;
  status: number;
  cookie?: SessionCookieContract;
  retryAfterSeconds?: number;
};

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function serializeCookie(cookie: SessionCookieContract): string {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    `Max-Age=${cookie.options.maxAge}`,
    `Expires=${cookie.options.expires.toUTCString()}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (cookie.options.secure) parts.push("Secure");
  return parts.join("; ");
}

function json(result: RouteResult): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (result.cookie) headers.set("set-cookie", serializeCookie(result.cookie));
  if (result.retryAfterSeconds) headers.set("retry-after", String(result.retryAfterSeconds));
  return new Response(JSON.stringify(result.response), { status: result.status, headers });
}

function invalid(cookie?: SessionCookieContract): Response {
  return json({ response: { status: "INVALID_REQUEST" }, status: 400, cookie });
}

function dependencyFallback(cookie?: SessionCookieContract): Response {
  return json({
    response: { status: "DEPENDENCY_FALLBACK", fallback: DEPENDENCY_FALLBACK },
    status: 503,
    cookie,
  });
}

function publicRateFallback(metadata: ContactFallbackMetadata): string {
  if (metadata.kind === "RETRY_LATER") {
    return "Bạn đã gửi câu hỏi quá nhanh. Vui lòng thử lại sau.";
  }
  if (metadata.contact) {
    return `Vui lòng liên hệ Infratek qua ${metadata.contact.phone} hoặc ${metadata.contact.email}.`;
  }
  return DEPENDENCY_FALLBACK;
}

async function persist(
  dependencies: ChatRouteDependencies,
  active: ActiveConversationResult,
  sessionId: string,
  input: PersistInput,
): Promise<ConversationPersistenceResult> {
  if (active.state === "FOUND") {
    return dependencies.conversations.append({ conversationId: active.conversationId, ...input });
  }
  return dependencies.conversations.create({ sessionId, ...input });
}

export function createChatPostHandler(dependencies: ChatRouteDependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      return invalid();
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return invalid();
    }
    const parsed = publicChatRequestSchema.safeParse(raw);
    if (!parsed.success) return invalid();

    const security = await dependencies.security.authorize({
      sessionToken: cookieValue(request, "infratek_chat_session"),
      turnstileToken: parsed.data.turnstileToken,
      clientIp: dependencies.clientIpResolver.resolve(request),
      production: dependencies.production,
    });
    const cookie = "setCookie" in security ? security.setCookie : undefined;

    if (security.state === "DEPLOYMENT_VERIFICATION_REQUIRED") return dependencyFallback();
    if (security.state === "VERIFICATION_REQUIRED") {
      return json({ response: { status: "VERIFICATION_REQUIRED" }, status: 403 });
    }
    if (security.state === "DEPENDENCY_UNAVAILABLE") {
      return json({
        response: {
          status: "DEPENDENCY_FALLBACK",
          fallback: publicRateFallback(security.fallback),
        },
        status: 503,
        cookie,
      });
    }
    if (security.state === "RATE_LIMITED") {
      return json({
        response: {
          status: "RATE_LIMITED",
          fallback: publicRateFallback(security.fallback),
          ...(security.retryAfterSeconds ? { retryAfterSeconds: security.retryAfterSeconds } : {}),
        },
        status: 429,
        cookie,
        retryAfterSeconds: security.retryAfterSeconds,
      });
    }

    if (containsObviousAttackPattern(parsed.data.question)) return invalid(cookie);

    const active = await dependencies.conversations.findActive(security.sessionId);
    if (active.state === "FAILURE") return dependencyFallback(cookie);
    const history = active.state === "FOUND"
      ? await dependencies.conversations.history(active.conversationId)
      : { state: "READY" as const, messages: [] };
    if (history.state === "FAILURE") return dependencyFallback(cookie);

    const prepared = prepareMultiTurnRetrieval(
      parsed.data.question,
      history.messages,
      dependencies.environment,
    );
    let retrieval: RetrievalResult;
    try {
      retrieval = await dependencies.retrieve(prepared.retrievalText);
    } catch {
      return dependencyFallback(cookie);
    }
    const decision = dependencies.decisionPolicy.decide(retrieval);
    const answer = await generateGroundedAnswer({
      decision,
      question: prepared.currentQuestion,
      generator: dependencies.generator,
    });

    if (answer.state === "CALIBRATION_REQUIRED") {
      return json({ response: { status: "CALIBRATION_REQUIRED" }, status: 200, cookie });
    }
    if (answer.state === "DEPENDENCY_FALLBACK") return dependencyFallback(cookie);

    if (answer.state === "ANSWER") {
      const saved = await persist(dependencies, active, security.sessionId, {
        userMessage: parsed.data.question,
        assistantMessage: answer.answer,
        sources: answer.sources,
      });
      if (saved.state !== "SAVED") return dependencyFallback(cookie);
      return json({
        response: {
          status: "ANSWER",
          answer: answer.answer,
          sources: answer.sources,
          conversationId: saved.conversationId,
        },
        status: 200,
        cookie,
      });
    }

    if (answer.state === "SAFE_FALLBACK") {
      const saved = await persist(dependencies, active, security.sessionId, {
        userMessage: parsed.data.question,
        unsupportedCategories: answer.categories,
      });
      if (saved.state !== "SAVED") return dependencyFallback(cookie);
      return json({
        response: { status: "SAFE_FALLBACK", conversationId: saved.conversationId },
        status: 200,
        cookie,
      });
    }

    const trigger = answer.state === "NO_ANSWER" ? "NO_ANSWER" : "NO_CONTEXT";
    const saved = await persist(dependencies, active, security.sessionId, {
      userMessage: parsed.data.question,
      assistantMessage: NO_CONTEXT_FALLBACK,
    });
    if (saved.state !== "SAVED") return dependencyFallback(cookie);
    await dependencies.unanswered.record({ trigger, question: parsed.data.question });
    return json({
      response: {
        status: "NO_CONTEXT",
        fallback: NO_CONTEXT_FALLBACK,
        conversationId: saved.conversationId,
      },
      status: 200,
      cookie,
    });
  };
}
