import { contentHash } from "./hash.ts";
import { normalizeText } from "./normalize.ts";
import type { IndexableDocument, PreparedChunk } from "./types.ts";

const TARGET_MAX_WORDS = 350;

function semanticSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "overview";
}

function splitLongSection(content: string): string[] {
  const paragraphs = content.split(/\n{2,}|\n(?=[-•])/).map(normalizeText).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const paragraph of paragraphs.length ? paragraphs : [content]) {
    const paragraphWords = paragraph.split(/\s+/);
    if (paragraphWords.length > TARGET_MAX_WORDS) {
      if (current.length) chunks.push(current.join("\n"));
      current = [];
      words = 0;
      for (let index = 0; index < paragraphWords.length; index += TARGET_MAX_WORDS) {
        chunks.push(paragraphWords.slice(index, index + TARGET_MAX_WORDS).join(" "));
      }
      continue;
    }
    if (words + paragraphWords.length > TARGET_MAX_WORDS && current.length) {
      chunks.push(current.join("\n"));
      current = [];
      words = 0;
    }
    current.push(paragraph);
    words += paragraphWords.length;
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

export function chunkDocument(document: IndexableDocument): PreparedChunk[] {
  const headingOccurrences = new Map<string, number>();
  const chunks: PreparedChunk[] = [];

  for (const section of document.sections) {
    const content = normalizeText(section.content);
    if (!content) continue;
    const headingPath = section.headingPath.map(normalizeText).filter(Boolean);
    const headingIdentity = headingPath.map(semanticSlug).join("/") || "overview";
    const occurrence = (headingOccurrences.get(headingIdentity) ?? 0) + 1;
    headingOccurrences.set(headingIdentity, occurrence);

    splitLongSection(content).forEach((part, partIndex) => {
      const base = occurrence === 1 ? headingIdentity : `${headingIdentity}~${occurrence}`;
      const chunkKey = partIndex === 0 ? base : `${base}/part-${partIndex + 1}`;
      const sectionTitle = headingPath.at(-1) ?? document.title;
      const embeddingInput = `title: ${document.title} — ${sectionTitle} | text: ${part}`;
      chunks.push({
        docType: document.docType,
        docId: document.docId,
        chunkKey,
        url: document.url,
        title: document.title,
        headingPath,
        content: part,
        contentPlain: part,
        contentHash: contentHash(headingPath, part),
        embeddingInput,
      });
    });
  }

  return chunks;
}
