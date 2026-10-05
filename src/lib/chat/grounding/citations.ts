import { NO_INFORMATION_FALLBACK } from "../prompt.ts";
import type { PublicSource, SelectedSource, SourceLabel } from "../retrieval/types.ts";

export type CitationInvalidReason =
  | "MISSING_CITATION"
  | "CITATION_MISMATCH"
  | "MALFORMED_CITATION"
  | "INVALID_OUTPUT";

export type CitationValidationResult =
  | { state: "VALID_ANSWER"; citedLabels: readonly SourceLabel[] }
  | { state: "VALID_NO_ANSWER" }
  | { state: "INVALID"; reason: CitationInvalidReason };

export type CitedPublicSource = Pick<
  PublicSource,
  "label" | "title" | "headingPath" | "url"
>;

const EXACT_CITATION = /\[S(\d+)\]/g;
const MALFORMED_BRACKETED_CITATION = /\[[^\]\r\n]*[sS]\s*\d+[^\]\r\n]*\]/;
const MALFORMED_UNBRACKETED_CITATION = /\b[sS]\s*\d+\b/;

function extractExactLabels(text: string): string[] {
  return [...text.matchAll(EXACT_CITATION)].map((match) => `S${match[1]}`);
}

function containsMalformedCitation(text: string): boolean {
  const withoutExact = text.replace(EXACT_CITATION, "");
  return (
    MALFORMED_BRACKETED_CITATION.test(withoutExact) ||
    MALFORMED_UNBRACKETED_CITATION.test(withoutExact)
  );
}

export function validateGeneratedCitations(
  generatedText: unknown,
  suppliedLabels: readonly SourceLabel[],
): CitationValidationResult {
  if (typeof generatedText !== "string") return { state: "INVALID", reason: "INVALID_OUTPUT" };

  const text = generatedText.trim();
  if (!text) return { state: "INVALID", reason: "INVALID_OUTPUT" };
  if (text === NO_INFORMATION_FALLBACK) return { state: "VALID_NO_ANSWER" };
  if (text.includes(NO_INFORMATION_FALLBACK)) {
    return { state: "INVALID", reason: "INVALID_OUTPUT" };
  }

  const extracted = extractExactLabels(text);
  if (containsMalformedCitation(text)) {
    return { state: "INVALID", reason: "MALFORMED_CITATION" };
  }
  if (extracted.length === 0) return { state: "INVALID", reason: "MISSING_CITATION" };

  const supplied = new Set<string>(suppliedLabels);
  if (extracted.some((label) => !supplied.has(label))) {
    return { state: "INVALID", reason: "CITATION_MISMATCH" };
  }

  const citedLabels = [...new Set(extracted)] as SourceLabel[];
  return { state: "VALID_ANSWER", citedLabels };
}

export function mapCitedPublicSources(
  sources: readonly SelectedSource[],
  citedLabels: readonly SourceLabel[],
): CitedPublicSource[] {
  const cited = new Set<SourceLabel>(citedLabels);
  return sources.flatMap(({ source }) =>
    cited.has(source.label)
      ? [
          {
            label: source.label,
            title: source.title,
            headingPath: [...source.headingPath],
            url: source.url,
          },
        ]
      : [],
  );
}
