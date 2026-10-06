export type UnsupportedOutputCategory =
  | "UNSUPPORTED_NUMBER"
  | "UNSUPPORTED_PHONE"
  | "UNSUPPORTED_EMAIL"
  | "UNSUPPORTED_PROPER_NAME"
  | "UNSUPPORTED_RISKY_CLAIM";

export type ProtectedOutputValidationResult =
  | { state: "SUPPORTED"; unsupported: false }
  | {
      state: "SAFE_FALLBACK";
      unsupported: true;
      categories: UnsupportedOutputCategory[];
    };

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE = /(?<!\d)(?:\+84|0)[\s.-]*[35789](?:[\s.-]*\d){8}(?!\d)/gu;
const CITATION = /\[S\d+\]/giu;
const NUMBER = /(?<![\p{L}\p{N}])(?:₫|đ|vnd|usd|\$)?\s*\d+(?:[.,]\d+)*(?:\s*(?:%|₫|đ|vnd|usd|ngày|tuần|tháng|năm|giờ|phút|triệu|tỷ|đồng))?/giu;
const PROPER_NAME = /\b\p{Lu}[\p{L}\p{M}\d&.-]*(?:\s+(?:\p{Lu}[\p{L}\p{M}\d&.-]*|\d+))+\b/gu;
const RISKY_KEYWORDS = [
  "giá",
  "chi phí",
  "roi",
  "lợi nhuận",
  "tiết kiệm",
  "kết quả",
  "triển khai",
  "cam kết",
  "bảo đảm",
  "đảm bảo",
  "chắc chắn",
] as const;

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(CITATION, "")
    .replace(/[“”"'`()[\]{}:;,.!?]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

function normalizeNumber(value: string): string {
  const normalized = normalizeText(value)
    .replace(/^\$\s*/u, "usd ")
    .replace(/^(?:₫|đ)\s*/u, "vnd ")
    .replace(/\s*(?:₫|đ)$/u, " vnd");
  return normalized.replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/gu, "").replace(/,/gu, ".");
}

function values(pattern: RegExp, text: string, normalize: (value: string) => string): Set<string> {
  return new Set([...text.matchAll(pattern)].map((match) => normalize(match[0])));
}

function unsupportedValues(
  answer: string,
  context: string,
  pattern: RegExp,
  normalize: (value: string) => string,
): boolean {
  const supported = values(pattern, context, normalize);
  return [...values(pattern, answer, normalize)].some((value) => !supported.has(value));
}

function withoutContacts(value: string): string {
  return value.replace(EMAIL, " ").replace(PHONE, " ");
}

function hasUnsupportedRiskyClaim(answer: string, context: string): boolean {
  const normalizedContext = normalizeText(context);
  const contextNumbers = values(NUMBER, withoutContacts(context), normalizeNumber);
  const sentences = answer.split(/[.!?\n]+/u).map((sentence) => sentence.trim()).filter(Boolean);

  return sentences.some((sentence) => {
    const normalizedSentence = normalizeText(sentence);
    const keywords = RISKY_KEYWORDS.filter((keyword) => normalizedSentence.includes(keyword));
    if (keywords.length === 0) return false;
    const claimNumbers = values(NUMBER, withoutContacts(sentence), normalizeNumber);
    if (claimNumbers.size > 0) {
      return (
        keywords.some((keyword) => !normalizedContext.includes(keyword)) ||
        [...claimNumbers].some((value) => !contextNumbers.has(value))
      );
    }
    return !normalizedContext.includes(normalizedSentence);
  });
}

export function validateProtectedOutput(
  answer: string,
  trustedContext: string,
): ProtectedOutputValidationResult {
  const categories = new Set<UnsupportedOutputCategory>();
  const answerWithoutCitations = answer.replace(CITATION, " ");

  if (unsupportedValues(answerWithoutCitations, trustedContext, PHONE, normalizePhone)) {
    categories.add("UNSUPPORTED_PHONE");
  }
  if (unsupportedValues(answerWithoutCitations, trustedContext, EMAIL, (value) => value.toLowerCase())) {
    categories.add("UNSUPPORTED_EMAIL");
  }
  if (
    unsupportedValues(
      withoutContacts(answerWithoutCitations),
      withoutContacts(trustedContext),
      NUMBER,
      normalizeNumber,
    )
  ) {
    categories.add("UNSUPPORTED_NUMBER");
  }
  if (
    unsupportedValues(
      withoutContacts(answerWithoutCitations),
      withoutContacts(trustedContext),
      PROPER_NAME,
      normalizeText,
    )
  ) {
    categories.add("UNSUPPORTED_PROPER_NAME");
  }
  if (hasUnsupportedRiskyClaim(answerWithoutCitations, trustedContext)) {
    categories.add("UNSUPPORTED_RISKY_CLAIM");
  }

  return categories.size === 0
    ? { state: "SUPPORTED", unsupported: false }
    : { state: "SAFE_FALLBACK", unsupported: true, categories: [...categories] };
}
