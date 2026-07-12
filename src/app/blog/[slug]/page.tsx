import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import {
  blogPosts,
  getPostBySlug,
  getRelatedPosts,
} from "@/data/blog";
import { MarkdownContent } from "@/components/blog/markdown-content";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { BlogCard } from "@/components/blog/blog-card";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post);

  return (
    <>
      <ReadingProgress />

      <article className="pb-20 pt-28">
        <div className="container-main">
          {/* Header */}
          <FadeIn>
            <div className="mx-auto max-w-3xl">
              <Link
                href="/blog"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Tất cả bài viết
              </Link>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="default">{post.category}</Badge>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="heading-md text-balance">{post.title}</h1>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {post.author.name}
                  <span className="text-text-secondary/50">·</span>
                  {post.author.role}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {post.readingTime} phút đọc
                </span>
              </div>
            </div>
          </FadeIn>

          {/* Content + TOC — dùng content gốc, id heading gắn trong MarkdownContent */}
          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_240px]">
            <FadeIn delay={0.1}>
              <div className="mx-auto max-w-3xl lg:mx-0">
                <MarkdownContent content={post.content} />
              </div>
            </FadeIn>

            <aside className="hidden lg:block">
              <TableOfContents content={post.content} />
            </aside>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-white py-16">
          <div className="container-main">
            <h2 className="mb-8 text-xl font-bold text-navy">
              Bài viết liên quan
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} className="h-full" />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}