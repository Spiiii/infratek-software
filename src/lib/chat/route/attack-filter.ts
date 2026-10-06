const OBVIOUS_ATTACK_PATTERNS = [
  "ignore previous instructions",
  "system prompt",
] as const;

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").trim().replace(/\s+/gu, " ");
}

export function containsObviousAttackPattern(value: string): boolean {
  const normalized = normalize(value);
  return OBVIOUS_ATTACK_PATTERNS.some((pattern) => normalized.includes(pattern));
}
