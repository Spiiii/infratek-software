"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { BlogCategory, BlogPost } from "@/types";
import { blogCategories } from "@/data/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BlogExplorer({ posts }: { posts: BlogPost[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<BlogCategory | "all">("all");
  const query = search.trim().toLocaleLowerCase("vi");
  const filtered = posts.filter((post) => {
    const matchesCategory = category === "all" || post.category === category;
    const matchesSearch = !query || post.title.toLocaleLowerCase("vi").includes(query) ||
      post.excerpt.toLocaleLowerCase("vi").includes(query) ||
      post.tags.some((tag) => tag.toLocaleLowerCase("vi").includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="section-padding pt-0">
      <div className="container-main">
        <div className="mx-auto mb-8 max-w-md">
          <label htmlFor="blog-search" className="sr-only">Tìm kiếm bài viết</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input id="blog-search" placeholder="Tìm kiếm bài viết..." className="pl-10"
              value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        <div className="mb-8 flex flex-wrap items-center gap-2" aria-label="Lọc bài viết theo chủ đề">
          <button type="button" onClick={() => setCategory("all")} className={filterClass(category === "all")}>
            Tất cả
          </button>
          {blogCategories.map((item) => (
            <button type="button" key={item} onClick={() => setCategory(item)} className={filterClass(category === item)}>
              {item}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-secondary">Không tìm thấy bài viết phù hợp.</p>
            <Button variant="secondary" className="mt-4" onClick={() => { setSearch(""); setCategory("all"); }}>
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => <BlogCard key={post.id} post={post} className="h-full" />)}
          </div>
        )}
      </div>
    </section>
  );
}

function filterClass(active: boolean) {
  return cn(
    "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
    active ? "bg-primary text-white shadow-glow" : "border border-border bg-white text-text-secondary hover:border-primary/30"
  );
}
