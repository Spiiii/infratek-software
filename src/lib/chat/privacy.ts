import type { RedactedInput } from "./types";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const VIETNAMESE_MOBILE_PATTERN = /(?<!\d)(?:\+84|0)[\s.-]*[35789](?:[\s.-]*\d){8}(?!\d)/g;

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

export function redactPii(input: string): RedactedInput {
  const emailResult = replaceAndCount(input, EMAIL_PATTERN, "[EMAIL]");
  const phoneResult = replaceAndCount(emailResult.value, VIETNAMESE_MOBILE_PATTERN, "[SDT]");

  return {
    value: phoneResult.value,
    containsPii: emailResult.count + phoneResult.count > 0,
    redactions: { emails: emailResult.count, phones: phoneResult.count },
  };
}

export function normalizeQuestionForHash(question: string): string {
  return redactPii(question).value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}
