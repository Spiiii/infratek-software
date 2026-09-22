// File: src/app/blog/page.tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { blogPosts, blogCategories, getFeaturedPosts } from "@/data/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { FadeIn } from "@/components/shared/fade-in";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/layout/cta-section";
import type { BlogCategory } from "@/types";
import { cn } from "@/lib/utils";

export default function BlogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<BlogCategory | "all">("all");
  const featured = getFeaturedPosts();

  const filtered = blogPosts.filter((post) => {
    const matchCategory = category === "all" || post.category === category;
    const matchSearch =
      !search ||
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-32">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="container-main relative z-10">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-label mb-4">AI Insights</span>
              <h1 className="heading-lg text-balance">
                Kiến thức{" "}
                <span className="gradient-text">Artificial Intelligence</span>
              </h1>
              <p className="body-lg mt-4 text-balance">
                Chia sẻ kinh nghiệm thực tế về AI, Computer Vision, LLM,
                Automation và Digital Transformation.
              </p>
            </div>
          </FadeIn>

          {/* Search */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Input
                placeholder="Tìm kiếm bài viết..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {category === "all" && !search && featured.length > 0 && (
        <section className="pb-12">
          <div className="container-main">
            <h2 className="mb-6 text-lg font-semibold text-navy">
              Bài viết nổi bật
            </h2>
            <div className="space-y-6">
              {featured.slice(0, 1).map((post) => (
                <FadeIn key={post.id}>
                  <BlogCard post={post} featured />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category filter + posts */}
      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory("all")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                category === "all"
                  ? "bg-primary text-white shadow-glow"
                  : "border border-border bg-white text-text-secondary hover:border-primary/30"
              )}
            >
              Tất cả
            </button>
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  category === cat
                    ? "bg-primary text-white shadow-glow"
                    : "border border-border bg-white text-text-secondary hover:border-primary/30"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-text-secondary">
                Không tìm thấy bài viết phù hợp.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post, i) => (
                <FadeIn key={post.id} delay={i * 0.05}>
                  <BlogCard post={post} className="h-full" />
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-border bg-white py-16">
        <div className="container-main">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="heading-sm mb-3">Đăng ký nhận AI Insights</h2>
            <p className="body-md mb-6">
              Nhận bài viết mới nhất về AI, Computer Vision và Digital
              Transformation vào inbox.
            </p>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Cảm ơn bạn đã đăng ký! (Demo)");
              }}
            >
              <Input
                type="email"
                placeholder="email@company.com"
                required
                className="flex-1"
              />
              <Button type="submit">Đăng ký</Button>
            </form>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
