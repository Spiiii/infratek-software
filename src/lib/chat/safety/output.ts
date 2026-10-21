export type UnsupportedOutputCategory =
  | "UNSUPPORTED_NUMBER"
  | "UNSUPPORTED_PHONE"
  | "UNSUPPORTED_EMAIL"
  | "UNSUPPORTED_PROPER_NAME"
  | "UNSUPPORTED_RISKY_CLAIM";

export type ProtectedOutputValidationResult =
  | { state: "SUPPORTED"; unsupported: false }
  | { state: "SAFE_FALLBACK"; unsupported: true; categories: UnsupportedOutputCategory[] };

export type ProtectedOutputEvidence = {
  citedContext: string;
  approvedPhones?: readonly string[];
  approvedEmails?: readonly string[];
  approvedPublicEntities?: readonly string[];
};

type ClaimClass =
  | "ORDINARY_CAPABILITY"
  | "QUALITATIVE_BENEFIT"
  | "CASE_RESULT"
  | "COMMERCIAL_COMMITMENT"
  | "UNIVERSAL_GUARANTEE";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE = /(?<!\d)(?:\+84|0)[\s.-]*[35789](?:[\s.-]*\d){8}(?!\d)/gu;
const CITATION = /\[S\d+\]/giu;
const NUMBER = /(?<![\p{L}\p{N}])(?:₫|đ|vnd|usd|\$)?\s*\d+(?:[.,]\d+)*(?:\s*(?:%|₫|đ|vnd|usd|ngày|tuần|tháng|năm|giờ|phút|triệu|tỷ|đồng))?/giu;
const PROPER_NAME = /\b\p{Lu}[\p{L}\p{M}\d&.-]*(?:\s+(?:\p{Lu}[\p{L}\p{M}\d&.-]*|\d+))+\b/gu;

const APPROVED_PUBLIC_ENTITIES = [
  "Infratek", "Infratek Software", "AI Consulting", "Software Development", "IT Outsourcing",
  "OCR", "Document AI", "Core Banking", "Artificial Intelligence", "Machine Learning",
  "Cloud Computing", "Data Analytics", "Digital Transformation",
] as const;
const GENERIC_CAPITALIZED_TOKENS = new Set([
  "ai", "bao", "chuyen", "cong", "dam", "dich", "dien", "doanh", "doi", "dong", "du", "giai",
  "he", "hoa", "hoc", "lieu", "may", "nghiep", "nghe", "phan", "phap", "mem", "quan", "so",
  "thong", "tin", "toan", "tri", "tue", "tu", "van", "vu",
]);
const LEGAL_ENTITY_SUFFIXES = new Set([
  "company", "corp", "corporation", "inc", "jsc", "limited", "llc", "ltd",
]);
const ENTITY_CUES = [
  "khach hang", "doi tac", "du an", "chung nhan", "cong ty",
  "customer", "client", "partner", "project", "certification",
] as const;
const ENTITY_STOP_TOKENS = new Set([
  "cua", "da", "dang", "duoc", "la", "se", "su", "trien", "voi", "uses", "used", "is", "was",
]);
const QUALITATIVE_BENEFITS = [
  "tiet kiem", "giam thoi gian", "tang hieu qua", "cai thien", "nang cao", "toi uu",
  "loi ich", "loi nhuan", "ket qua", "roi", "save time", "reduce time", "improve", "optimize",
] as const;
const COMMERCIAL_COMMITMENTS = [
  "chi phi", "gia", "sla", "hop dong", "cam ket", "bao dam", "dam bao", "chac chan",
  "bao hanh", "mien phi", "tron doi", "deadline", "fixed price", "binding price", "contract",
  "guarantee", "guaranteed", "warranty",
] as const;
const ABSOLUTE_GUARANTEE_PHRASES = [
  "dam bao", "bao dam", "guarantee", "guaranteed",
] as const;
const UNIVERSAL_SUBJECTS = [
  "moi du an", "moi khach hang", "moi doanh nghiep", "tat ca du an", "tat ca khach hang",
  "tat ca doanh nghiep", "toan bo du an", "toan bo khach hang", "luon luon", "all projects",
  "all customers", "every project", "every customer", "always",
] as const;
const CASE_SCOPE = [
  "case study", "truong hop", "du an nay", "du an da", "ghi nhan", "da dat", "historical result",
] as const;
const OUTCOME_TERMS = [
  ...QUALITATIVE_BENEFITS,
  "do chinh xac", "hieu suat", "hoan thanh", "thanh cong", "accuracy", "performance", "result",
] as const;

function normalizeText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi").replace(CITATION, "")
    .replace(/[“”"'`()[\]{}:;,.!?]/gu, " ").replace(/\s+/gu, " ").trim();
}

function canonicalizeVietnameseTokens(value: string): string {
  return value.normalize("NFD").replace(/\p{M}+/gu, "").toLocaleLowerCase("vi").replace(/đ/gu, "d")
    .replace(CITATION, " ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function containsTokenPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

function containsAnyPhrase(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => containsTokenPhrase(text, phrase));
}

function sentenceValues(value: string): string[] {
  return value.split(/[!?\n]+|\.+(?!\d)/u).map((sentence) => sentence.trim()).filter(Boolean);
}

function canonicalTokens(value: string): string[] {
  return canonicalizeVietnameseTokens(value).split(" ").filter(Boolean);
}

function tokenCoverage(claim: string, evidence: string): number {
  const claimTokens = [...new Set(canonicalTokens(claim))];
  const evidenceTokens = new Set(canonicalTokens(evidence));
  return claimTokens.length === 0 ? 0
    : claimTokens.filter((token) => evidenceTokens.has(token)).length / claimTokens.length;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}

function normalizeNumber(value: string): string {
  const normalized = normalizeText(value).replace(/^\$\s*/u, "usd ")
    .replace(/^(?:₫|đ)\s*/u, "vnd ").replace(/\s*(?:₫|đ)$/u, " vnd");
  return normalized.replace(/(?<=\d)[.,](?=\d{3}(?:\D|$))/gu, "").replace(/,/gu, ".");
}

function values(pattern: RegExp, text: string, normalize: (value: string) => string): Set<string> {
  return new Set([...text.matchAll(pattern)].map((match) => normalize(match[0])));
}

function withoutContacts(value: string): string {
  return value.replace(EMAIL, " ").replace(PHONE, " ");
}

function containsPriceKeyword(text: string): boolean {
  const tokens = text.split(" ").filter(Boolean);
  return tokens.some((token, index) => token === "gia" && tokens[index - 1] !== "danh");
}

function commercialPhrases(sentence: string): string[] {
  const canonical = canonicalizeVietnameseTokens(sentence);
  const phrases: string[] = COMMERCIAL_COMMITMENTS.filter(
    (phrase) => phrase !== "gia" && containsTokenPhrase(canonical, phrase),
  );
  if (containsPriceKeyword(canonical)) phrases.push("gia");
  const hasDuration = values(NUMBER, sentence, normalizeNumber).size > 0 &&
    containsAnyPhrase(canonical, ["trien khai", "hoan tat", "thoi gian", "deadline"]);
  if (hasDuration) phrases.push("trien khai");
  return [...new Set(phrases)];
}

function resolveEvidence(evidence: string | ProtectedOutputEvidence): Required<ProtectedOutputEvidence> {
  return typeof evidence === "string"
    ? { citedContext: evidence, approvedPhones: [], approvedEmails: [], approvedPublicEntities: [] }
    : {
        citedContext: evidence.citedContext,
        approvedPhones: evidence.approvedPhones ?? [],
        approvedEmails: evidence.approvedEmails ?? [],
        approvedPublicEntities: evidence.approvedPublicEntities ?? [],
      };
}

function hasUnsupportedPhone(answer: string, evidence: Required<ProtectedOutputEvidence>): boolean {
  const supported = values(PHONE, evidence.citedContext, normalizePhone);
  for (const phone of evidence.approvedPhones) supported.add(normalizePhone(phone));
  return [...values(PHONE, answer, normalizePhone)].some((phone) => !supported.has(phone));
}

function hasUnsupportedEmail(answer: string, evidence: Required<ProtectedOutputEvidence>): boolean {
  const normalize = (value: string) => value.toLocaleLowerCase("en");
  const supported = values(EMAIL, evidence.citedContext, normalize);
  for (const email of evidence.approvedEmails) supported.add(normalize(email));
  return [...values(EMAIL, answer, normalize)].some((email) => !supported.has(email));
}

function isGenericCapitalizedPhrase(candidate: string): boolean {
  const tokens = canonicalTokens(candidate);
  return tokens.length > 0 && tokens.every((token) => GENERIC_CAPITALIZED_TOKENS.has(token));
}

function roleBoundEntities(answer: string): Set<string> {
  const tokens = canonicalTokens(answer);
  const entities = new Set<string>();
  for (const cue of ENTITY_CUES) {
    const cueTokens = cue.split(" ");
    for (let index = 0; index <= tokens.length - cueTokens.length; index += 1) {
      if (!cueTokens.every((token, offset) => tokens[index + offset] === token)) continue;
      const collected: string[] = [];
      for (const token of tokens.slice(index + cueTokens.length, index + cueTokens.length + 5)) {
        if (ENTITY_STOP_TOKENS.has(token)) break;
        collected.push(token);
      }
      if (collected.length > 0) entities.add(collected.join(" "));
    }
  }
  return entities;
}

function hasUnsupportedProperName(answer: string, evidence: Required<ProtectedOutputEvidence>): boolean {
  const canonicalContext = canonicalizeVietnameseTokens(evidence.citedContext);
  const approved = new Set(
    [...APPROVED_PUBLIC_ENTITIES, ...evidence.approvedPublicEntities].map(canonicalizeVietnameseTokens),
  );
  const roleEntities = roleBoundEntities(answer);
  const candidates = values(PROPER_NAME, answer, canonicalizeVietnameseTokens);
  for (const entity of roleEntities) candidates.add(entity);

  return [...candidates].some((candidate) => {
    if (approved.has(candidate) || containsTokenPhrase(canonicalContext, candidate)) return false;
    const explicitlyProtected = [...roleEntities].some(
      (entity) => entity === candidate || entity.startsWith(`${candidate} `) || candidate.startsWith(`${entity} `),
    );
    const legalEntity = candidate.split(" ").some((token) => LEGAL_ENTITY_SUFFIXES.has(token));
    return explicitlyProtected || legalEntity || !isGenericCapitalizedPhrase(candidate);
  });
}

function claimClass(sentence: string): ClaimClass {
  const canonical = canonicalizeVietnameseTokens(sentence);
  const absoluteGuarantee = values(NUMBER, sentence, normalizeNumber).has("100%") &&
    containsAnyPhrase(canonical, ABSOLUTE_GUARANTEE_PHRASES);
  const universal = containsAnyPhrase(canonical, UNIVERSAL_SUBJECTS) || absoluteGuarantee;
  const outcome = containsAnyPhrase(canonical, OUTCOME_TERMS) || values(NUMBER, sentence, normalizeNumber).size > 0;
  if (universal && outcome) return "UNIVERSAL_GUARANTEE";
  if (commercialPhrases(sentence).length > 0) return "COMMERCIAL_COMMITMENT";
  if (containsAnyPhrase(canonical, CASE_SCOPE) && values(NUMBER, sentence, normalizeNumber).size > 0) {
    return "CASE_RESULT";
  }
  if (containsAnyPhrase(canonical, QUALITATIVE_BENEFITS)) return "QUALITATIVE_BENEFIT";
  return "ORDINARY_CAPABILITY";
}

function nearVerbatimSupport(sentence: string, contextSentences: readonly string[], requiredPhrases: readonly string[]): boolean {
  const canonicalSentence = canonicalizeVietnameseTokens(sentence);
  const presentPhrases = requiredPhrases.filter((phrase) => containsTokenPhrase(canonicalSentence, phrase));
  return contextSentences.some((contextSentence) => {
    const canonicalContext = canonicalizeVietnameseTokens(contextSentence);
    return presentPhrases.every((phrase) => containsTokenPhrase(canonicalContext, phrase)) &&
      tokenCoverage(sentence, contextSentence) >= 0.75;
  });
}

function numericClaimSupported(sentence: string, contextSentences: readonly string[]): boolean {
  const claimNumbers = values(NUMBER, withoutContacts(sentence), normalizeNumber);
  if (claimNumbers.size === 0) return true;
  const canonicalContext = canonicalizeVietnameseTokens(contextSentences.join(" "));
  for (const entity of values(PROPER_NAME, sentence, canonicalizeVietnameseTokens)) {
    if (!containsTokenPhrase(canonicalContext, entity)) continue;
    for (const number of values(NUMBER, entity, normalizeNumber)) claimNumbers.delete(number);
  }
  if (claimNumbers.size === 0) return true;
  return contextSentences.some((contextSentence) => {
    const evidenceNumbers = values(NUMBER, withoutContacts(contextSentence), normalizeNumber);
    return [...claimNumbers].every((number) => evidenceNumbers.has(number)) &&
      tokenCoverage(withoutContacts(sentence), withoutContacts(contextSentence)) >= 0.45;
  });
}

function validationForRiskyClaims(answer: string, citedContext: string): {
  unsupportedNumber: boolean;
  unsupportedRiskyClaim: boolean;
} {
  const contextSentences = sentenceValues(citedContext);
  let unsupportedNumber = false;
  let unsupportedRiskyClaim = false;

  for (const sentence of sentenceValues(answer)) {
    const classification = claimClass(sentence);
    const numericSupported = numericClaimSupported(sentence, contextSentences);
    if (!numericSupported) unsupportedNumber = true;
    if (classification === "UNIVERSAL_GUARANTEE") {
      unsupportedRiskyClaim = true;
    } else if (classification === "COMMERCIAL_COMMITMENT") {
      if (
        !numericSupported ||
        !nearVerbatimSupport(sentence, contextSentences, commercialPhrases(sentence))
      ) unsupportedRiskyClaim = true;
    } else if (classification === "QUALITATIVE_BENEFIT") {
      if (!nearVerbatimSupport(sentence, contextSentences, QUALITATIVE_BENEFITS)) unsupportedRiskyClaim = true;
    } else if (
      classification === "CASE_RESULT" &&
      (!numericSupported || !nearVerbatimSupport(sentence, contextSentences, CASE_SCOPE))
    ) {
      unsupportedRiskyClaim = true;
    }
  }
  return { unsupportedNumber, unsupportedRiskyClaim };
}

export function validateProtectedOutput(
  answer: string,
  trustedEvidence: string | ProtectedOutputEvidence,
): ProtectedOutputValidationResult {
  const categories = new Set<UnsupportedOutputCategory>();
  const answerWithoutCitations = answer.replace(CITATION, " ");
  const evidence = resolveEvidence(trustedEvidence);
  if (hasUnsupportedPhone(answerWithoutCitations, evidence)) categories.add("UNSUPPORTED_PHONE");
  if (hasUnsupportedEmail(answerWithoutCitations, evidence)) categories.add("UNSUPPORTED_EMAIL");
  const claims = validationForRiskyClaims(answerWithoutCitations, evidence.citedContext);
  if (claims.unsupportedNumber) categories.add("UNSUPPORTED_NUMBER");
  if (
    hasUnsupportedProperName(
      withoutContacts(answerWithoutCitations),
      { ...evidence, citedContext: withoutContacts(evidence.citedContext) },
    )
  ) categories.add("UNSUPPORTED_PROPER_NAME");
  if (claims.unsupportedRiskyClaim) categories.add("UNSUPPORTED_RISKY_CLAIM");
  return categories.size === 0
    ? { state: "SUPPORTED", unsupported: false }
    : { state: "SAFE_FALLBACK", unsupported: true, categories: [...categories] };
}
