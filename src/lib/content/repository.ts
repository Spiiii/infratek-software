import { blogPosts } from "@/data/blog";
import { caseStudies } from "@/data/case-studies";
import { company } from "@/data/company";
import { solutions } from "@/data/solutions";
import { downloadResources, innovationProjects } from "@/data/technologies";
import type { Author as PayloadAuthor, CaseStudy as PayloadCaseStudy, Post as PayloadPost, Solution as PayloadSolution } from "@/payload-types";
import type { BlogPost, CaseStudy as CaseStudyDomain } from "@/types";
import type { ContentBlock, ContentRepository, SolutionDomain } from "./types";

const placeholder = (note: string): ContentBlock => ({ status: "placeholder", items: [], note });
const placeholderNote = "Đang cập nhật — liên hệ để biết thêm chi tiết.";

const relatedCases: Record<string, string[]> = {
  "ai-consulting": [],
  "software-development": ["pms-project-management", "interview-ai"],
  "it-outsourcing": [],
  "digital-transformation": ["ocr-document-intelligence", "camera-ai-transformation"],
};

const solutionSeo: Record<string, { title: string; description: string }> = {
  "ai-consulting": { title: "Tư vấn AI cho doanh nghiệp | Infratek Software", description: "Đánh giá mức độ sẵn sàng, xác định use case và xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu doanh nghiệp." },
  "software-development": { title: "Phát triển phần mềm tích hợp AI cho doanh nghiệp | Infratek Software", description: "Thiết kế và phát triển web app, nền tảng phần mềm và hệ thống tích hợp AI theo nhu cầu doanh nghiệp." },
  "it-outsourcing": { title: "Dịch vụ IT Outsourcing cho doanh nghiệp | Infratek", description: "Bổ sung nhân sự kỹ thuật hoặc dedicated team để hỗ trợ phát triển và vận hành sản phẩm phần mềm." },
  "digital-transformation": { title: "Chuyển đổi số và tự động hóa bằng AI cho doanh nghiệp", description: "Số hóa tài liệu, tự động hóa quy trình và xây dựng nền tảng dữ liệu hỗ trợ vận hành doanh nghiệp." },
};

const staticSolutions: SolutionDomain[] = solutions.map((item) => ({
  id: item.id, slug: item.slug, title: item.title, shortTitle: item.shortTitle,
  description: item.description, seoTitle: solutionSeo[item.slug].title,
  seoDescription: solutionSeo[item.slug].description, icon: item.icon, color: item.color,
  quickAnswer: item.solution, needSignals: [item.problem], deliverables: placeholder(placeholderNote),
  process: item.process, outcomes: item.businessValue, relatedCaseStudySlugs: relatedCases[item.slug] ?? [],
  audienceFit: placeholder(placeholderNote), timelineAndInvestment: placeholder(placeholderNote),
  faq: placeholder(placeholderNote), techStack: item.techStack,
}));

const staticCases: CaseStudyDomain[] = caseStudies.map((item) => ({ ...item, dataClassification: "illustrative" }));
const block = (value: PayloadSolution["deliverables"]): ContentBlock => ({ status: value.status, items: value.items ?? [], note: value.note ?? undefined });

const mapSolution = (item: PayloadSolution): SolutionDomain => ({
  id: String(item.id), slug: item.slug, title: item.title, shortTitle: item.shortTitle,
  description: item.description, seoTitle: item.seoTitle, seoDescription: item.seoDescription,
  icon: item.icon, color: item.color, quickAnswer: item.quickAnswer, needSignals: item.needSignals,
  deliverables: block(item.deliverables),
  process: item.process.map(({ step, title, description }) => ({ step, title, description })),
  outcomes: item.outcomes,
  relatedCaseStudySlugs: (item.relatedCaseStudies ?? []).filter((entry): entry is PayloadCaseStudy => typeof entry === "object").map((entry) => entry.slug),
  audienceFit: block(item.audienceFit), timelineAndInvestment: block(item.timelineAndInvestment),
  faq: block(item.faq), techStack: item.techStack ?? [],
});

const mapCase = (item: PayloadCaseStudy): CaseStudyDomain => ({
  id: String(item.id), slug: item.slug, title: item.title, client: item.clientName,
  industry: item.industry, summary: item.tldr, challenge: item.challenge, solution: item.solution,
  architecture: (item.architecture ?? []).map((node) => ({ id: node.nodeId, label: node.label, type: node.nodeType, description: node.description })),
  techStack: item.techStack ?? [],
  implementationFlow: (item.timeline ?? []).map(({ step, title, description }) => ({ step, title, description })),
  results: (item.results ?? []).map(({ title, description }) => ({ title, description })),
  metrics: (item.metrics ?? []).map((metric) => ({ label: metric.label, value: metric.value, suffix: metric.unit, prefix: metric.prefix ?? undefined, description: metric.howMeasured ?? "" })),
  gallery: (item.media ?? []).flatMap((entry) => typeof entry === "object" && entry.url ? [entry.url] : []),
  featured: item.featured ?? false, coverGradient: item.coverGradient ?? "from-blue-600 to-sky-400",
  year: item.year, dataClassification: item.dataClassification,
});

const mapPost = (item: PayloadPost): BlogPost => {
  const author = typeof item.author === "object" ? item.author as PayloadAuthor : undefined;
  return {
    id: String(item.id), slug: item.slug, title: item.title, excerpt: item.excerpt, content: item.content,
    category: item.category as BlogPost["category"], tags: item.tags ?? [],
    author: { name: author?.name ?? "Infratek", role: author?.role ?? "Editorial Team", avatar: author?.avatar && typeof author.avatar === "object" ? author.avatar.url ?? undefined : undefined },
    publishedAt: item.publishedAt, updatedAt: item.updatedAt, readingTime: item.readingTime,
    featured: item.featured ?? false, coverImage: item.coverImage && typeof item.coverImage === "object" ? item.coverImage.url ?? undefined : undefined,
  };
};

const staticRepository: ContentRepository = {
  async getCompany() { return company; },
  async getSolutions() { return staticSolutions; },
  async getSolutionBySlug(slug) { return staticSolutions.find((item) => item.slug === slug); },
  async getCaseStudies() { return staticCases; },
  async getCaseStudyBySlug(slug) { return staticCases.find((item) => item.slug === slug); },
  async getPosts() { return blogPosts; },
  async getPostBySlug(slug) { return blogPosts.find((item) => item.slug === slug); },
  async getResources() { return downloadResources.map((item) => ({ ...item, slug: item.id, availability: "coming-soon" as const })); },
  async getResourceBySlug(slug) { return (await this.getResources()).find((item) => item.slug === slug); },
  async getInnovationProjects() { return innovationProjects; },
};

const payloadClient = async () => {
  const [{ getPayload }, { default: config }] = await Promise.all([import("payload"), import("../../../payload.config")]);
  return getPayload({ config });
};
const readContext = async (payload: Awaited<ReturnType<typeof payloadClient>>) => {
  const { draftMode, headers } = await import("next/headers");
  // Static generation has no request store. In that context, read published
  // CMS content instead of treating the missing Draft Mode context as a DB
  // failure and falling back to the legacy static dataset.
  let enabled = false;
  try {
    enabled = (await draftMode()).isEnabled;
  } catch {
    return { isDraft: false as const };
  }
  if (!enabled) return { isDraft: false as const };
  const { user } = await payload.auth({ headers: await headers() });
  if (!user || !["admin", "reviewer"].includes(user.role)) return { isDraft: false as const };
  return { isDraft: true as const, user };
};
const shouldUsePayload = () => process.env.CONTENT_SOURCE === "payload";
const fallback = async <T>(operation: () => Promise<T>, staticRead: () => Promise<T>) => {
  if (!shouldUsePayload()) return staticRead();
  try { return await operation(); }
  catch (error) {
    console.error("[content] Payload unavailable; static fallback active.", error instanceof Error ? error.message : "Unknown error");
    return staticRead();
  }
};
const published = { _status: { equals: "published" as const } };

export const getSolutions = () => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "solutions", ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { where: published, overrideAccess: true }), depth: 1, limit: 100 }); return r.docs.map(mapSolution); }, () => staticRepository.getSolutions());
export const getSolutionBySlug = (slug: string) => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "solutions", where: ctx.isDraft ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, published] }, ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { overrideAccess: true }), depth: 1, limit: 1 }); return r.docs[0] ? mapSolution(r.docs[0]) : undefined; }, () => staticRepository.getSolutionBySlug(slug));
export const getCaseStudies = () => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "case-studies", ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { where: published, overrideAccess: true }), depth: 1, limit: 100 }); return r.docs.map(mapCase); }, () => staticRepository.getCaseStudies());
export const getCaseStudyBySlug = (slug: string) => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "case-studies", where: ctx.isDraft ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, published] }, ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { overrideAccess: true }), depth: 1, limit: 1 }); return r.docs[0] ? mapCase(r.docs[0]) : undefined; }, () => staticRepository.getCaseStudyBySlug(slug));
export const getPosts = () => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "posts", ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { where: published, overrideAccess: true }), depth: 1, limit: 100, sort: "-publishedAt" }); return r.docs.map(mapPost); }, () => staticRepository.getPosts());
export const getPostBySlug = (slug: string) => fallback(async () => { const payload = await payloadClient(); const ctx = await readContext(payload); const r = await payload.find({ collection: "posts", where: ctx.isDraft ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, published] }, ...(ctx.isDraft ? { draft: true, overrideAccess: false, user: ctx.user } : { overrideAccess: true }), depth: 1, limit: 1 }); return r.docs[0] ? mapPost(r.docs[0]) : undefined; }, () => staticRepository.getPostBySlug(slug));
export const getCompany = () => staticRepository.getCompany();
export const getResources = () => staticRepository.getResources();
export const getResourceBySlug = (slug: string) => staticRepository.getResourceBySlug(slug);
export const getInnovationProjects = () => staticRepository.getInnovationProjects();
