import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { getPayload } from "payload";
import { blogPosts } from "../src/data/blog";
import { caseStudies } from "../src/data/case-studies";
import { solutions } from "../src/data/solutions";
import config from "../payload.config";

nextEnv.loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");
const allowConflicts = process.argv.includes("--allow-conflicts");
const payload = await getPayload({ config });
const report = { create: 0, update: 0, unchanged: 0, conflict: 0 };

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["id", "createdAt", "updatedAt", "_status", "sourceHash", "sourceKey", "seededContentHash"].includes(key))
    .map(([key, entry]) => [key, clean(entry)]));
};
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(clean(value))).digest("hex");
const projectShape = (value: unknown, shape: unknown): unknown => {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [];
    return shape.length > 0 ? value.map((entry) => projectShape(entry, shape[0])) : value;
  }
  if (!shape || typeof shape !== "object" || !value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(shape as Record<string, unknown>).map((key) => [
    key,
    projectShape((value as Record<string, unknown>)[key], (shape as Record<string, unknown>)[key]),
  ]));
};

type SeedCollection = "solutions" | "case-studies" | "posts";
const upsert = async (collection: SeedCollection, slug: string, coreData: Record<string, unknown>) => {
  const sourceHash = hash(coreData);
  const data = { ...coreData, sourceKey: slug, sourceHash, seededContentHash: sourceHash };
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true });
  const existing = found.docs[0] as unknown as Record<string, unknown> | undefined;
  if (!existing) {
    report.create += 1;
    console.log(`${dryRun ? "[dry-run] " : ""}create ${collection}/${slug}`);
    if (!dryRun) await payload.create({ collection, data: data as never, overrideAccess: true });
    return;
  }
  if (existing.sourceHash === sourceHash) {
    report.unchanged += 1;
    console.log(`unchanged ${collection}/${slug}`);
    return;
  }
  if (!existing.seededContentHash || hash(projectShape(existing, coreData)) !== existing.seededContentHash) {
    report.conflict += 1;
    console.warn(`conflict ${collection}/${slug}: CMS content changed; skipped`);
    return;
  }
  report.update += 1;
  console.log(`${dryRun ? "[dry-run] " : ""}update ${collection}/${slug}`);
  if (!dryRun) await payload.update({ collection, id: existing.id as number, data: data as never, overrideAccess: true });
};

const ensureAuthor = async (name: string, role: string) => {
  const slug = slugify(name);
  const found = await payload.find({ collection: "authors", where: { slug: { equals: slug } }, limit: 1, overrideAccess: true });
  if (found.docs[0]) return found.docs[0].id;
  // Relations are not persisted during a dry run, but a stable numeric
  // placeholder lets the post itself participate in the create/update report.
  if (dryRun) return -1;
  return (await payload.create({ collection: "authors", data: { name, role, slug }, overrideAccess: true })).id;
};

const ensureTechnology = async (name: string) => {
  const slug = slugify(name);
  const found = await payload.find({ collection: "technologies", where: { slug: { equals: slug } }, limit: 1, overrideAccess: true });
  if (found.docs[0]) return found.docs[0].id;
  if (dryRun) return undefined;
  return (await payload.create({ collection: "technologies", data: { name, slug }, overrideAccess: true })).id;
};

type CasePackage = {
  title: string; slug: string; industry: string; year: string; clientName: string;
  clientDisplay: "named" | "anonymized"; dataClassification: "verified" | "anonymized" | "illustrative";
  tldr: string; challenge: string; solution: string;
  architecture: Array<{ nodeId: string; label: string; nodeType: "input" | "process" | "storage" | "output" | "ai"; description: string }>;
  timeline: Array<{ step: number; title: string; description: string }>;
  results: Array<{ title: string; description: string }>;
  metrics: Array<{ value: number; unit: string; prefix?: string; label: string; howMeasured: string; measuredAt: string }>;
  solutionSlugs: string[]; techStack: string[]; featured: boolean; coverGradient: string;
  seoTitle: string; seoDescription: string; reviewState: "editing"; _status: "draft";
  images?: Array<{ file: string; altText: string }>;
};

const contentRoot = path.join(process.cwd(), "content", "case-studies");
const packageDirectories = await readdir(contentRoot, { withFileTypes: true });
const casePackages = await Promise.all(packageDirectories.filter((entry) => entry.isDirectory()).map(async (entry) => {
  const packagePath = path.join(contentRoot, entry.name, "index.yml");
  return { directory: path.dirname(packagePath), data: JSON.parse(await readFile(packagePath, "utf8")) as CasePackage };
}));

const mimeType = (filename: string) => filename.endsWith(".svg") ? "image/svg+xml" : "image/png";
const ensureMedia = async (directory: string, image: { file: string; altText: string }) => {
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to seed Phase 4 media; refusing local-disk fallback.");
  }
  const absolutePath = path.join(directory, image.file);
  const data = await readFile(absolutePath);
  const name = path.basename(absolutePath);
  const found = await payload.find({ collection: "media", where: { filename: { equals: name } }, limit: 1, overrideAccess: true });
  const existing = found.docs[0];
  if (existing) {
    if (existing.altText !== image.altText && !dryRun) await payload.update({ collection: "media", id: existing.id, data: { altText: image.altText }, overrideAccess: true });
    return existing.id;
  }
  if (dryRun) return undefined;
  return (await payload.create({
    collection: "media", data: { altText: image.altText }, overrideAccess: true,
    file: { data, mimetype: mimeType(name), name, size: data.byteLength },
  })).id;
};

const solutionIds = new Map<string, number>();
for (const item of solutions) {
  const seo = {
    "ai-consulting": ["Tư vấn AI cho doanh nghiệp | Infratek Software", "Đánh giá mức độ sẵn sàng, xác định use case và xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu doanh nghiệp."],
    "software-development": ["Phát triển phần mềm tích hợp AI cho doanh nghiệp | Infratek Software", "Thiết kế và phát triển web app, nền tảng phần mềm và hệ thống tích hợp AI theo nhu cầu doanh nghiệp."],
    "it-outsourcing": ["Dịch vụ IT Outsourcing cho doanh nghiệp | Infratek", "Bổ sung nhân sự kỹ thuật hoặc dedicated team để hỗ trợ phát triển và vận hành sản phẩm phần mềm."],
    "digital-transformation": ["Chuyển đổi số và tự động hóa bằng AI cho doanh nghiệp", "Số hóa tài liệu, tự động hóa quy trình và xây dựng nền tảng dữ liệu hỗ trợ vận hành doanh nghiệp."],
  }[item.slug] as [string, string];
  await upsert("solutions", item.slug, {
    slug: item.slug, title: item.title, shortTitle: item.shortTitle, description: item.description,
    seoTitle: seo[0], seoDescription: seo[1], icon: item.icon, color: item.color,
    quickAnswer: item.solution, needSignals: [item.problem],
    deliverables: { status: "placeholder", items: [], note: "Đang cập nhật — liên hệ để biết thêm chi tiết." },
    process: item.process, outcomes: item.businessValue,
    audienceFit: { status: "placeholder", items: [], note: "Đang cập nhật — liên hệ để biết thêm chi tiết." },
    timelineAndInvestment: { status: "placeholder", items: [], note: "Đang cập nhật — liên hệ để biết thêm chi tiết." },
    faq: { status: "placeholder", items: [], note: "Đang cập nhật — liên hệ để biết thêm chi tiết." },
    techStack: item.techStack, reviewState: "approved", _status: "published",
  });
}

for (const item of await payload.find({ collection: "solutions", limit: 100, depth: 0, overrideAccess: true }).then((result) => result.docs)) solutionIds.set(item.slug, item.id);

const caseSolutions: Record<string, string[]> = {
  "camera-ai-transformation": ["digital-transformation"],
  "ocr-document-intelligence": ["digital-transformation"],
  "interview-ai": ["software-development"],
  "pms-project-management": ["software-development"],
};
const caseIds = new Map<string, number>();
for (const item of caseStudies) {
  const technologyIds = (await Promise.all(item.techStack.map(ensureTechnology))).filter((id): id is number => typeof id === "number");
  await upsert("case-studies", item.slug, {
    title: item.title, slug: item.slug, industry: item.industry, year: item.year,
    clientName: item.client, clientDisplay: "anonymized", dataClassification: "illustrative",
    tldr: item.summary, challenge: item.challenge, solution: item.solution,
    architecture: item.architecture.map(({ id, label, type, description }) => ({ nodeId: id, label, nodeType: type, description })),
    timeline: item.implementationFlow, results: item.results,
    metrics: item.metrics.map((metric) => ({ value: metric.value, unit: metric.suffix, prefix: metric.prefix, label: metric.label, howMeasured: `${metric.description} Nguồn: bộ dữ liệu minh họa Giai đoạn 3.`, measuredAt: "2026-09-29T00:00:00.000Z" })),
    solutions: (caseSolutions[item.slug] ?? []).flatMap((slug) => solutionIds.get(slug) ?? []),
    technologies: technologyIds, techStack: item.techStack, featured: item.featured,
    coverGradient: item.coverGradient, seoTitle: item.title, seoDescription: item.summary,
    publishedAt: "2026-09-29T00:00:00.000Z", reviewState: "approved", _status: "published",
  });
}

for (const item of casePackages) {
  const value = item.data;
  const technologyIds = (await Promise.all(value.techStack.map(ensureTechnology))).filter((id): id is number => typeof id === "number");
  const discoveredImages = value.images ?? (await readdir(path.join(item.directory, "images"))).sort().map((filename, index) => ({
    file: `images/${filename}`,
    altText: `${value.title}: đồ họa minh họa ${index + 1}, không phải ảnh chụp sản phẩm thật`,
  }));
  const mediaIds = (await Promise.all(discoveredImages.map((image) => ensureMedia(item.directory, image)))).filter((id): id is number => typeof id === "number");
  await upsert("case-studies", value.slug, {
    title: value.title, slug: value.slug, industry: value.industry, year: value.year,
    clientName: value.clientName, clientDisplay: value.clientDisplay, dataClassification: value.dataClassification,
    tldr: value.tldr, challenge: value.challenge, solution: value.solution,
    architecture: value.architecture, timeline: value.timeline, results: value.results, metrics: value.metrics,
    media: mediaIds, solutions: value.solutionSlugs.flatMap((slug) => solutionIds.get(slug) ?? []),
    technologies: technologyIds, techStack: value.techStack, featured: value.featured,
    coverGradient: value.coverGradient, seoTitle: value.seoTitle, seoDescription: value.seoDescription,
    reviewState: "editing", _status: "draft",
  });
}

for (const item of await payload.find({ collection: "case-studies", limit: 100, depth: 0, overrideAccess: true }).then((result) => result.docs)) caseIds.set(item.slug, item.id);
const solutionCases: Record<string, string[]> = {
  "ai-consulting": [], "software-development": ["pms-project-management", "interview-ai", "crm-system", "hrm-human-resource-management", "e-pos-system", "odoo-erp-implementation"],
  "it-outsourcing": [], "digital-transformation": ["ocr-document-intelligence", "camera-ai-transformation"],
};
solutionCases["digital-transformation"].push("crm-system", "dms-document-management", "e-pos-system", "e-office", "microsoft-365-deployment", "odoo-erp-implementation");
if (!dryRun) {
  for (const [slug, caseSlugs] of Object.entries(solutionCases)) {
    const id = solutionIds.get(slug);
    if (id) await payload.update({ collection: "solutions", id, data: { relatedCaseStudies: caseSlugs.flatMap((caseSlug) => caseIds.get(caseSlug) ?? []) }, overrideAccess: true });
  }
}

for (const item of blogPosts) {
  const authorId = await ensureAuthor(item.author.name, item.author.role);
  await upsert("posts", item.slug, {
    slug: item.slug, title: item.title, excerpt: item.excerpt, content: item.content,
    category: item.category, tags: item.tags, author: authorId, publishedAt: item.publishedAt,
    readingTime: item.readingTime, featured: item.featured, seoTitle: item.title,
    seoDescription: item.excerpt, reviewState: "approved", _status: "published",
  });
}

console.log(JSON.stringify({ dryRun, ...report }, null, 2));
// Payload's Postgres adapter keeps background handles alive in this standalone
// script, so terminate explicitly after every awaited write has completed.
await new Promise((resolve) => setTimeout(resolve, 50));
process.exit(report.conflict > 0 && !allowConflicts ? 2 : 0);
