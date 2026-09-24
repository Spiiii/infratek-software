import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSolutions } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Giải pháp AI & Software",
  description:
    "AI Consulting, Software Development, IT Outsourcing và Digital Transformation — giải pháp toàn diện cho doanh nghiệp.",
  path: "/solutions",
});

export default async function SolutionsPage() {
  const solutions = await getSolutions();

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-32">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="container-main relative z-10">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-label mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Our Solutions
              </span>
              <h1 className="heading-lg text-balance">
                Giải pháp AI tạo <span className="gradient-text">giá trị kinh doanh</span>
              </h1>
              <p className="body-lg mt-4 text-balance">
                Khám phá bốn hướng triển khai dựa trên nhu cầu, năng lực hiện tại
                và mục tiêu chuyển đổi của doanh nghiệp.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="mb-10 rounded-2xl border border-primary/15 bg-primary/5 p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <Compass className="h-6 w-6 text-primary" />
              <h2 className="heading-sm">Bạn đang ở tình huống nào?</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {solutions.map((solution) => (
                <Link
                  key={solution.slug}
                  href={`/solutions/${solution.slug}`}
                  className="group flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-text-secondary shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <strong className="block text-navy">{solution.title}</strong>
                    {solution.needSignals[0]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {solutions.map((solution, index) => (
              <FadeIn key={solution.id} delay={index * 0.08}>
                <Card className="card-hover h-full border-border">
                  <CardContent className="flex h-full flex-col p-7">
                    <Badge variant="secondary" className="mb-4 w-fit">
                      {solution.shortTitle}
                    </Badge>
                    <h2 className="text-xl font-bold text-navy">{solution.title}</h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                      {solution.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {solution.techStack.slice(0, 4).map((tech) => (
                        <Badge key={tech} variant="outline">{tech}</Badge>
                      ))}
                    </div>
                    <Link
                      href={`/solutions/${solution.slug}`}
                      className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                    >
                      Xem giải pháp
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Chưa chắc giải pháp nào phù hợp?"
        description="Trao đổi nhu cầu thực tế để xác định hướng tiếp cận phù hợp cho doanh nghiệp của bạn."
      />
    </>
  );
}
