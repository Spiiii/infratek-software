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
  "chi phí",
  "roi",
  "lợi nhuận",
  "tiết kiệm",
  "kết quả",
  "cam kết",
  "bảo đảm",
  "đảm bảo",
  "chắc chắn",
  "sla",
  "hợp đồng",
] as const;
const QUANTIFIED_RISKY_KEYWORDS = ["triển khai"] as const;
const PRICE_KEYWORD = "gia";

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(CITATION, "")
    .replace(/[“”"'`()[\]{}:;,.!?]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function canonicalizeVietnameseTokens(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/đ/gu, "d")
    .replace(CITATION, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsTokenPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

function containsPriceKeyword(text: string): boolean {
  const tokens = text.split(" ").filter(Boolean);
  return tokens.some((token, index) => token === PRICE_KEYWORD && tokens[index - 1] !== "danh");
}

function hasUnsupportedProperName(answer: string, context: string): boolean {
  const canonicalContext = canonicalizeVietnameseTokens(context);
  const candidates = values(PROPER_NAME, answer, canonicalizeVietnameseTokens);

  return [...candidates].some((candidate) => !containsTokenPhrase(canonicalContext, candidate));
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
  const canonicalContext = canonicalizeVietnameseTokens(context);
  const canonicalKeywords = RISKY_KEYWORDS.map(canonicalizeVietnameseTokens);
  const canonicalQuantifiedKeywords = QUANTIFIED_RISKY_KEYWORDS.map(canonicalizeVietnameseTokens);
  const contextNumbers = values(NUMBER, withoutContacts(context), normalizeNumber);
  const sentences = answer.split(/[.!?\n]+/u).map((sentence) => sentence.trim()).filter(Boolean);

  return sentences.some((sentence) => {
    const canonicalSentence = canonicalizeVietnameseTokens(sentence);
    const keywords = canonicalKeywords.filter((keyword) =>
      containsTokenPhrase(canonicalSentence, keyword)
    );
    if (containsPriceKeyword(canonicalSentence)) keywords.push(PRICE_KEYWORD);
    const claimNumbers = values(NUMBER, withoutContacts(sentence), normalizeNumber);
    const quantifiedKeywords = claimNumbers.size > 0
      ? canonicalQuantifiedKeywords.filter((keyword) => containsTokenPhrase(canonicalSentence, keyword))
      : [];
    const guardedKeywords = [...keywords, ...quantifiedKeywords];
    if (guardedKeywords.length === 0) return false;
    if (claimNumbers.size > 0) {
      return (
        guardedKeywords.some((keyword) =>
          keyword === PRICE_KEYWORD
            ? !containsPriceKeyword(canonicalContext)
            : !containsTokenPhrase(canonicalContext, keyword)
        ) ||
        [...claimNumbers].some((value) => !contextNumbers.has(value))
      );
    }
    return !containsTokenPhrase(canonicalContext, canonicalSentence);
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
    hasUnsupportedProperName(
      withoutContacts(answerWithoutCitations),
      withoutContacts(trustedContext),
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
