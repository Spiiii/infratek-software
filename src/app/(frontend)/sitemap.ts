// File: src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { caseStudies } from "@/data/case-studies";
import { blogPosts } from "@/data/blog";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://infratek.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/solutions`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/case-studies`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.7 },
  ];

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

  return [...staticPages, ...caseStudyPages, ...blogPages];
}
