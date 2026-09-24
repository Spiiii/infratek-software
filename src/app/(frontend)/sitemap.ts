// File: src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getCaseStudies, getPosts, getResources, getSolutions } from "@/lib/content";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://infratek.vn";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [caseStudies, blogPosts, solutions, resources] = await Promise.all([
    getCaseStudies(), getPosts(), getSolutions(), getResources(),
  ]);
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/solutions`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/case-studies`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about/team`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/tools/roi-calculator`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tools/ai-readiness`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/resources`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/ai-lab`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const solutionPages: MetadataRoute.Sitemap = solutions.map((solution) => ({ url: `${baseUrl}/solutions/${solution.slug}`, changeFrequency: "monthly" as const, priority: 0.8 }));
  const resourcePages: MetadataRoute.Sitemap = resources.map((resource) => ({ url: `${baseUrl}/resources/${resource.slug}`, changeFrequency: "monthly" as const, priority: 0.6 }));

  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${baseUrl}/case-studies/${cs.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...solutionPages, ...caseStudyPages, ...blogPages, ...resourcePages];
}
