// File: src/components/blog/blog-card.tsx
import Link from "next/link";
import { Clock, Calendar } from "lucide-react";
import type { BlogPost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
  className?: string;
}

export function BlogCard({ post, featured = false, className }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated",
        featured && "md:flex-row md:items-stretch",
        className
      )}
    >
      {featured && (
        <div className="flex h-48 items-end bg-gradient-to-br from-primary to-primary-accent p-6 md:h-auto md:w-2/5 md:rounded-l-2xl md:rounded-r-none">
          <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
            Featured
          </Badge>
        </div>
      )}
      <div className={cn("flex flex-1 flex-col p-6", featured && "md:p-8")}>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="default">{post.category}</Badge>
          {post.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="hidden sm:inline-flex">
              {tag}
            </Badge>
          ))}
        </div>
        <h3
          className={cn(
            "mb-2 font-semibold text-navy transition-colors group-hover:text-primary",
            featured ? "text-xl md:text-2xl" : "text-lg"
          )}
        >
          {post.title}
        </h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="font-medium text-navy">{post.author.name}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(post.publishedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTime} phút
          </span>
        </div>
      </div>
    </Link>
  );
}