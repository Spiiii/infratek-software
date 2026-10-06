import type { TurnstileVerifier, TurnstileVerificationResult } from "./types.ts";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function createTurnstileVerifier(input: {
  secretKey: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}): TurnstileVerifier {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async verify(token: string): Promise<TurnstileVerificationResult> {
      if (!token || token.length > 2048) return { state: "INVALID" };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

      try {
        const body = new URLSearchParams({ secret: input.secretKey, response: token });
        const response = await fetchImpl(SITEVERIFY_URL, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          signal: controller.signal,
        });
        if (!response.ok) return { state: "UNAVAILABLE" };
        const payload = (await response.json()) as { success?: unknown };
        if (typeof payload.success !== "boolean") return { state: "UNAVAILABLE" };
        return payload.success ? { state: "VERIFIED" } : { state: "INVALID" };
      } catch (error) {
        return error instanceof Error && error.name === "AbortError"
          ? { state: "TIMEOUT" }
          : { state: "UNAVAILABLE" };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
