// File: src/components/home/latest-insights.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { getLatestPosts } from "@/data/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function LatestInsights() {
  const posts = getLatestPosts(3);

  return (
    <section className="section-padding bg-white">
      <div className="container-main">
        <SectionHeading
          label="AI Insights"
          title="Kiến thức AI mới nhất"
          description="Chia sẻ kinh nghiệm thực tế về AI, Computer Vision, LLM và Digital Transformation từ đội ngũ Infratek."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface-light p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <Badge variant="default" className="mb-4 w-fit">
                  {post.category}
                </Badge>
                <h3 className="mb-3 text-lg font-semibold text-navy transition-colors group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(post.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingTime} phút đọc
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="secondary">
            <Link href="/blog">
              Xem tất cả bài viết
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}