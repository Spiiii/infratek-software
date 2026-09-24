import type { Metadata } from "next";
import { getPosts } from "@/lib/content";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogExplorer } from "@/components/blog/blog-explorer";
import { FadeIn } from "@/components/shared/fade-in";
import { CTASection } from "@/components/layout/cta-section";
import { createPageMetadata } from "@/lib/seo";

const title = "Kiến thức Artificial Intelligence";
const description =
  "Chia sẻ kinh nghiệm thực tế về AI, Computer Vision, LLM, Automation và Digital Transformation.";

export const metadata: Metadata = createPageMetadata({ title, description, path: "/blog" });

export default async function BlogPage() {
  const blogPosts = await getPosts();
  const featured = blogPosts.filter((post) => post.featured);
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
                Kiến thức <span className="gradient-text">Artificial Intelligence</span>
              </h1>
              <p className="body-lg mt-4 text-balance">{description}</p>
            </div>
          </FadeIn>
        </div>
      </section>
      {featured.length > 0 && (
        <section className="pb-12">
          <div className="container-main">
            <h2 className="mb-6 text-lg font-semibold text-navy">Bài viết nổi bật</h2>
            <FadeIn><BlogCard post={featured[0]} featured /></FadeIn>
          </div>
        </section>
      )}
      <BlogExplorer posts={blogPosts} />
      <section className="border-t border-border bg-white py-16">
        <div className="container-main">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="heading-sm mb-3">Đăng ký nhận AI Insights</h2>
            <p className="body-md">
              Tính năng đăng ký đang được hoàn thiện. Các bài viết mới hiện được
              cập nhật trực tiếp tại trang này.
            </p>
          </div>
        </div>
      </section>
      <CTASection />
    </>
  );
}
