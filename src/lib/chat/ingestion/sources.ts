import type { Payload } from "payload";
import type { CaseStudy, CompanyFact, Faq, Page, Post, Solution } from "../../../payload-types.ts";
import { lexicalText, nonEmpty, normalizeText } from "./normalize.ts";
import type { IndexableDocument, IndexableSection } from "./types.ts";

type Publishable = { _status?: "draft" | "published" | null };

export type SourceSnapshot = {
  solutions: Solution[];
  caseStudies: CaseStudy[];
  posts: Post[];
  pages: Page[];
  faq?: Faq | null;
  companyFacts?: CompanyFact | null;
};

const pageRoutes: Record<string, string> = {
  about: "/about",
  "about-team": "/about/team",
  contact: "/contact",
  resources: "/resources",
  "ai-lab": "/ai-lab",
};

const isPublished = <T extends Publishable>(value: T): boolean => value._status === "published";
const section = (heading: string | string[], content: string): IndexableSection => ({
  headingPath: Array.isArray(heading) ? heading : [heading],
  content: normalizeText(content),
});

function verifiedBlock(
  heading: string,
  block: { status: "verified" | "placeholder"; items?: string[] | null },
): IndexableSection[] {
  if (block.status !== "verified") return [];
  const values = nonEmpty(block.items ?? []);
  return values.length ? [section(heading, values.join("\n"))] : [];
}

function solutionDocument(value: Solution): IndexableDocument {
  return {
    docType: "solution",
    docId: String(value.id),
    slug: value.slug,
    url: `/solutions/${value.slug}`,
    title: value.title,
    updatedAt: value.updatedAt,
    sections: [
      section("Tổng quan", nonEmpty([value.description, value.quickAnswer]).join("\n")),
      section("Khi nào cần giải pháp", nonEmpty(value.needSignals).join("\n")),
      ...verifiedBlock("Sản phẩm bàn giao", value.deliverables),
      ...value.process.map((item) => section(["Quy trình", item.title], item.description)),
      section("Kết quả kỳ vọng", nonEmpty(value.outcomes).join("\n")),
      ...verifiedBlock("Đối tượng phù hợp", value.audienceFit),
      ...verifiedBlock("Thời gian và đầu tư", value.timelineAndInvestment),
      ...verifiedBlock("Câu hỏi thường gặp", value.faq),
      section("Công nghệ", nonEmpty(value.techStack ?? []).join(", ")),
    ].filter((item) => item.content),
  };
}

function caseStudyDocument(value: CaseStudy): IndexableDocument {
  const client = value.clientDisplay === "named" ? value.clientName : "Khách hàng được ẩn danh";
  return {
    docType: "case_study",
    docId: String(value.id),
    slug: value.slug,
    url: `/case-studies/${value.slug}`,
    title: value.title,
    updatedAt: value.updatedAt,
    sections: [
      section("Tóm tắt", nonEmpty([value.tldr, `Ngành: ${value.industry}`, `Năm: ${value.year}`, `Khách hàng: ${client}`]).join("\n")),
      section("Thách thức", value.challenge),
      section("Giải pháp", value.solution),
      ...(value.architecture ?? []).map((item) => section(["Kiến trúc", item.label], item.description)),
      ...(value.timeline ?? []).map((item) => section(["Lộ trình", item.title], item.description)),
      ...(value.results ?? []).map((item) => section(["Kết quả", item.title], item.description)),
      ...(value.metrics ?? []).map((item) =>
        section(
          ["Chỉ số", item.label],
          nonEmpty([
            `${item.prefix ?? ""}${item.value}${item.unit}`,
            item.howMeasured,
            item.measuredAt ? `Đo lường: ${item.measuredAt}` : undefined,
          ]).join("\n"),
        ),
      ),
      section("Công nghệ", nonEmpty(value.techStack ?? []).join(", ")),
    ].filter((item) => item.content),
  };
}

function markdownSections(content: string): IndexableSection[] {
  const sections: IndexableSection[] = [];
  let headings: string[] = [];
  let body: string[] = [];
  const flush = () => {
    const value = normalizeText(body.join("\n"));
    if (value) sections.push(section(headings.length ? headings : ["Nội dung"], value));
    body = [];
  };

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) {
      body.push(line);
      continue;
    }
    flush();
    const level = match[1].length;
    const heading = normalizeText(match[2]);
    headings = level === 2 ? [heading] : [headings[0] ?? "Nội dung", heading];
  }
  flush();
  return sections;
}

function postDocument(value: Post): IndexableDocument {
  return {
    docType: "post",
    docId: String(value.id),
    slug: value.slug,
    url: `/blog/${value.slug}`,
    title: value.title,
    updatedAt: value.updatedAt,
    sections: [section("Tóm tắt", value.excerpt), ...markdownSections(value.content)],
  };
}

function pageDocument(value: Page): IndexableDocument | null {
  const url = pageRoutes[value.slug];
  if (!url) return null;
  const content = lexicalText(value.content);
  const sections = [section("Tóm tắt", value.summary ?? ""), section("Nội dung", content)].filter(
    (item) => item.content,
  );
  if (!sections.length) return null;
  return {
    docType: "page",
    docId: String(value.id),
    slug: value.slug,
    url,
    title: value.title,
    updatedAt: value.updatedAt,
    sections,
  };
}

function faqDocument(value?: Faq | null): IndexableDocument | null {
  const items = value?.items ?? [];
  if (!items.length) return null;
  return {
    docType: "faq",
    docId: "faq",
    slug: "faq",
    url: "/",
    title: "Câu hỏi thường gặp",
    updatedAt: value?.updatedAt ?? undefined,
    sections: items.map((item) => section(item.question, item.answer)).filter((item) => item.content),
  };
}

function companyFactsDocument(value?: CompanyFact | null): IndexableDocument | null {
  if (!value?.name?.trim()) return null;
  const facts = nonEmpty([
    value.tagline,
    value.missionVi,
    value.director ? `Giám đốc: ${value.director}` : undefined,
    value.email ? `Email: ${value.email}` : undefined,
    value.phone ? `Điện thoại: ${value.phone}` : undefined,
    value.address ? `Địa chỉ: ${value.address}` : undefined,
  ]);
  if (!facts.length) return null;
  return {
    docType: "company_fact",
    docId: "company-facts",
    slug: "company-facts",
    url: "/",
    title: value.name,
    updatedAt: value.updatedAt ?? undefined,
    sections: [section("Thông tin doanh nghiệp", facts.join("\n"))],
  };
}

export function documentsFromSnapshot(snapshot: SourceSnapshot): IndexableDocument[] {
  const globals = [faqDocument(snapshot.faq), companyFactsDocument(snapshot.companyFacts)].filter(
    (value): value is IndexableDocument => Boolean(value),
  );
  return [
    ...snapshot.solutions.filter(isPublished).map(solutionDocument),
    ...snapshot.caseStudies.filter(isPublished).map(caseStudyDocument),
    ...snapshot.posts.filter(isPublished).map(postDocument),
    ...snapshot.pages.filter(isPublished).map(pageDocument).filter((value): value is IndexableDocument => Boolean(value)),
    ...globals,
  ];
}

export async function readPublishedDocuments(payload: Payload): Promise<IndexableDocument[]> {
  // This is an admin-only CLI path. Local API access is intentionally overridden,
  // while every versioned collection still has an explicit published-only filter.
  const published = { _status: { equals: "published" as const } };
  const [solutions, caseStudies, posts, pages, faq, companyFacts] = await Promise.all([
    payload.find({ collection: "solutions", where: published, limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: "case-studies", where: published, limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: "posts", where: published, limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: "pages", where: published, limit: 1000, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: "faq", depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: "company-facts", depth: 0, overrideAccess: true }),
  ]);

  return documentsFromSnapshot({
    solutions: solutions.docs,
    caseStudies: caseStudies.docs,
    posts: posts.docs,
    pages: pages.docs,
    faq,
    companyFacts,
  });
}
