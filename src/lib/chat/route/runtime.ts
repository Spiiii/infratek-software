import { readChatBuildSafeConfig, readChatSecuritySecrets } from "../config.ts";
import { ChatConversationRepository } from "../conversation/repository.ts";
import { createConversationService } from "../conversation/service.ts";
import { preCalibrationDecisionPolicy } from "../decision/policy.ts";
import { createLiveGeminiChatAdapter } from "../generation/gemini.ts";
import { createLiveQueryEmbeddingAdapter } from "../retrieval/query-embedding.ts";
import { FtsRetrievalRepository, VectorRetrievalRepository } from "../retrieval/repository.ts";
import { retrieve } from "../retrieval/retrieve.ts";
import { vercelClientIpResolver } from "../security/ip.ts";
import { createConfiguredUpstashRateLimiter } from "../security/rate-limit.ts";
import { createChatSecurityService } from "../security/service.ts";
import { createTurnstileVerifier } from "../security/turnstile.ts";
import { ChatUnansweredRepository } from "../unanswered/repository.ts";
import { createUnansweredService } from "../unanswered/service.ts";
import type { ChatRouteDependencies } from "./orchestrator.ts";

type QueryResult = { rows: Array<Record<string, unknown>>; rowCount?: number | null };

function createLazyPayloadExecutor() {
  let payloadPromise: Promise<Awaited<ReturnType<typeof import("payload")["getPayload"]>>> | undefined;

  const payload = () => {
    payloadPromise ??= Promise.all([
      import("payload"),
      import("../../../../payload.config"),
    ]).then(([{ getPayload }, { default: config }]) => getPayload({ config }));
    return payloadPromise;
  };

  return {
    async query(sql: string, parameters: unknown[]): Promise<QueryResult> {
      const result = await (await payload()).db.pool.query(sql, parameters);
      return {
        rows: result.rows as Array<Record<string, unknown>>,
        rowCount: result.rowCount,
      };
    },
  };
}

export function createChatRuntimeDependencies(
  environment: Record<string, string | undefined> = process.env,
): ChatRouteDependencies {
  const config = readChatBuildSafeConfig(environment);
  const secrets = readChatSecuritySecrets(environment);
  const executor = createLazyPayloadExecutor();
  const queryEmbedding = createLiveQueryEmbeddingAdapter(environment);
  const vectorRepository = new VectorRetrievalRepository(executor, environment);
  const ftsRepository = new FtsRetrievalRepository(executor);

  return {
    clientIpResolver: vercelClientIpResolver,
    security: createChatSecurityService({
      sessionSigningSecret: secrets.sessionSigningSecret,
      ipHmacSecret: secrets.ipHmacSecret,
      verifier: createTurnstileVerifier({
        secretKey: secrets.turnstileSecretKey,
        timeoutMs: config.limits.turnstileTimeoutMs,
      }),
      limiter: createConfiguredUpstashRateLimiter({
        url: secrets.upstashUrl,
        token: secrets.upstashToken,
      }),
      limits: {
        perMinute: config.limits.perMinute,
        ipDaily: config.limits.ipDaily,
        session: config.limits.session,
        globalDaily: config.limits.daily,
      },
    }),
    conversations: createConversationService(new ChatConversationRepository(executor), environment),
    retrieve: (question) => retrieve(question, { queryEmbedding, vectorRepository, ftsRepository }, environment),
    decisionPolicy: preCalibrationDecisionPolicy,
    generator: createLiveGeminiChatAdapter(environment),
    unanswered: createUnansweredService(new ChatUnansweredRepository(executor), environment),
    production: environment.NODE_ENV === "production",
    environment,
  };
}
