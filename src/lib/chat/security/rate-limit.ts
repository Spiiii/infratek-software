import { randomUUID } from "node:crypto";

import { Redis } from "@upstash/redis";

import type {
  DistributedRateLimiter,
  DistributedRateLimitInput,
  DistributedRateLimitResult,
  RateLimitReason,
} from "./types.ts";

export const CHAT_RATE_LIMIT_SCRIPT = `
local now = tonumber(ARGV[1])
local request_id = ARGV[2]
local minute_limit = tonumber(ARGV[3])
local ip_daily_limit = tonumber(ARGV[4])
local session_limit = tonumber(ARGV[5])
local global_daily_limit = tonumber(ARGV[6])
local minute_end = tonumber(ARGV[7])
local utc_day_end = tonumber(ARGV[8])
local session_end = tonumber(ARGV[9])

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 60000)
local minute_count = redis.call('ZCARD', KEYS[1])
local ip_daily_count = tonumber(redis.call('GET', KEYS[2]) or '0')
local session_count = tonumber(redis.call('GET', KEYS[3]) or '0')
local global_daily_count = tonumber(redis.call('GET', KEYS[4]) or '0')

if minute_count >= minute_limit then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local retry = 1
  if oldest[2] then retry = math.max(1, math.ceil((tonumber(oldest[2]) + 60000 - now) / 1000)) end
  return {0, 'IP_MINUTE_LIMIT', retry}
end
if ip_daily_count >= ip_daily_limit then
  return {0, 'IP_DAILY_LIMIT', math.max(1, math.ceil((utc_day_end - now) / 1000))}
end
if session_count >= session_limit then
  return {0, 'SESSION_LIMIT', math.max(1, math.ceil((session_end - now) / 1000))}
end
if global_daily_count >= global_daily_limit then
  return {0, 'GLOBAL_DAILY_LIMIT', math.max(1, math.ceil((utc_day_end - now) / 1000))}
end

redis.call('ZADD', KEYS[1], now, request_id)
redis.call('PEXPIREAT', KEYS[1], minute_end)
redis.call('INCR', KEYS[2])
redis.call('PEXPIREAT', KEYS[2], utc_day_end)
redis.call('INCR', KEYS[3])
redis.call('PEXPIREAT', KEYS[3], session_end)
redis.call('INCR', KEYS[4])
redis.call('PEXPIREAT', KEYS[4], utc_day_end)
return {1, 'ALLOWED', 0}
`;

type RedisEval = (script: string, keys: string[], args: unknown[]) => Promise<unknown>;

function utcDay(input: number): { key: string; end: number } {
  const now = new Date(input);
  const key = now.toISOString().slice(0, 10);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return { key, end };
}

function isReason(value: unknown): value is RateLimitReason {
  return ["IP_MINUTE_LIMIT", "IP_DAILY_LIMIT", "SESSION_LIMIT", "GLOBAL_DAILY_LIMIT"].includes(
    String(value),
  );
}

export function createUpstashRateLimiter(evalCommand: RedisEval): DistributedRateLimiter {
  return {
    async consume(input: DistributedRateLimitInput): Promise<DistributedRateLimitResult> {
      if (input.sessionExpiresAt <= input.now) return { state: "DEPENDENCY_UNAVAILABLE" };
      const day = utcDay(input.now);
      const keys = [
        `chat:rl:ip-minute:${input.ipKey}`,
        `chat:rl:ip-day:${day.key}:${input.ipKey}`,
        `chat:rl:session:${input.sessionId}`,
        `chat:rl:global:${day.key}`,
      ];
      const args = [
        input.now,
        randomUUID(),
        input.limits.perMinute,
        input.limits.ipDaily,
        input.limits.session,
        input.limits.globalDaily,
        input.now + 60_000,
        day.end,
        input.sessionExpiresAt,
      ];

      try {
        const raw = await evalCommand(CHAT_RATE_LIMIT_SCRIPT, keys, args);
        if (!Array.isArray(raw) || raw.length < 2) return { state: "DEPENDENCY_UNAVAILABLE" };
        if (Number(raw[0]) === 1 && raw[1] === "ALLOWED") return { state: "ALLOWED" };
        if (Number(raw[0]) !== 0 || !isReason(raw[1])) return { state: "DEPENDENCY_UNAVAILABLE" };
        const retry = Number(raw[2]);
        return {
          state: "LIMITED",
          reason: raw[1],
          ...(Number.isSafeInteger(retry) && retry > 0 ? { retryAfterSeconds: retry } : {}),
        };
      } catch {
        return { state: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export function createConfiguredUpstashRateLimiter(input: {
  url: string;
  token: string;
}): DistributedRateLimiter {
  const redis = new Redis({
    url: input.url,
    token: input.token,
    enableTelemetry: false,
    retry: false,
  });
  return createUpstashRateLimiter((script, keys, args) => redis.eval(script, keys, args));
}
