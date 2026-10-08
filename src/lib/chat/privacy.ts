import type { RedactedInput } from "./types";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const VIETNAMESE_MOBILE_PATTERN = /(?<!\d)(?:\+84|0)[\s.-]*[35789](?:[\s.-]*\d){8}(?!\d)/g;
const LOOSE_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+\s*@\s*[A-Z0-9.-]+(?:\s*\.\s*[A-Z]{2,})+\b/iu;
const LOOSE_PHONE_PATTERN = /(?<!\d)(?:\+\s*84|0)(?:[\s().-]*\d){9}(?!\d)/u;

function replaceAndCount(input: string, pattern: RegExp, replacement: string) {
  let count = 0;
  const value = input.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { value, count };
}

export function redactEmail(input: string): string {
  return input.replace(EMAIL_PATTERN, "[EMAIL]");
}

export function redactVietnamesePhone(input: string): string {
  return input.replace(VIETNAMESE_MOBILE_PATTERN, "[SDT]");
}

// Canonicalize only obvious email/phone formatting variants before the existing redaction pass.
export function normalizePiiVariants(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/gu, "")
    .replace(new RegExp(LOOSE_EMAIL_PATTERN.source, "giu"), (candidate) => candidate.replace(/\s+/gu, ""))
    .replace(new RegExp(LOOSE_PHONE_PATTERN.source, "gu"), (candidate) => candidate.replace(/[\s().-]/gu, ""));
}

// This deliberately uses independent, looser detectors rather than trusting the redaction regexes.
export function verifyPiiRedaction(input: string): boolean {
  return !LOOSE_EMAIL_PATTERN.test(input) && !LOOSE_PHONE_PATTERN.test(input);
}

export function redactPii(input: string): RedactedInput {
  const normalized = normalizePiiVariants(input);
  const emailResult = replaceAndCount(normalized, EMAIL_PATTERN, "[EMAIL]");
  const phoneResult = replaceAndCount(emailResult.value, VIETNAMESE_MOBILE_PATTERN, "[SDT]");

  return {
    value: phoneResult.value,
    containsPii: emailResult.count + phoneResult.count > 0,
    redactions: { emails: emailResult.count, phones: phoneResult.count },
    safe: verifyPiiRedaction(phoneResult.value),
  };
}

export function normalizeQuestionForHash(question: string): string {
  const redacted = redactPii(question);
  if (!redacted.safe) throw new Error("Unsafe PII remained after redaction");
  return redacted.value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}
