// File: src/app/solutions/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Code2,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { solutions } from "@/data/solutions";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Giải pháp AI & Software",
  description:
    "AI Consulting, Software Development, IT Outsourcing và Digital Transformation — giải pháp toàn diện cho doanh nghiệp.",
  path: "/solutions",
});

const iconMap = {
  Brain,
  Code2,
  Users,
  Sparkles,
};

export default function SolutionsPage() {
  return (
    <>
      {/* Hero */}
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
                Giải pháp AI tạo{" "}
                <span className="gradient-text">giá trị kinh doanh</span>
              </h1>
              <p className="body-lg mt-4 text-balance">
                Không phải danh sách dịch vụ — mà là các giải pháp nghiệp vụ
                được thiết kế để giải quyết thách thức thực tế và mang lại ROI
                đo lường được.
              </p>
            </div>
          </FadeIn>

          {/* Quick nav */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {solutions.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-navy shadow-soft transition-all hover:border-primary/30 hover:shadow-card"
              >
                {s.shortTitle}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions detail */}
      {solutions.map((solution, index) => {
        const Icon = iconMap[solution.icon as keyof typeof iconMap] || Brain;
        const isEven = index % 2 === 0;

        return (
          <section
            key={solution.id}
            id={solution.id}
            className={`section-padding ${isEven ? "bg-white" : ""}`}
          >
            <div className="container-main">
              <FadeIn>
                <div className="mb-12 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="heading-md">{solution.title}</h2>
                    <p className="body-md mt-2 max-w-2xl">{solution.description}</p>
                  </div>
                </div>
              </FadeIn>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Problem & Solution */}
                <FadeIn delay={0.1}>
                  <Card className="h-full border-red-100 bg-red-50/30">
                    <CardContent className="p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <h3 className="text-base font-semibold text-navy">
                          Thách thức
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed text-text-secondary">
                        {solution.problem}
                      </p>
                    </CardContent>
                  </Card>
                </FadeIn>

                <FadeIn delay={0.15}>
                  <Card className="h-full border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <h3 className="text-base font-semibold text-navy">
                          Giải pháp
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed text-text-secondary">
                        {solution.solution}
                      </p>
                    </CardContent>
                  </Card>
                </FadeIn>
              </div>

              {/* Process Timeline */}
              <FadeIn delay={0.2}>
                <div className="mt-12">
                  <h3 className="mb-6 text-lg font-semibold text-navy">
                    Quy trình triển khai
                  </h3>
                  <div className="relative">
                    <div className="absolute left-6 top-0 hidden h-full w-0.5 bg-primary/15 md:block" />
                    <div className="space-y-4">
                      {solution.process.map((step) => (
                        <div key={step.step} className="flex gap-4 md:gap-6">
                          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-white shadow-glow">
                            {step.step}
                          </div>
                          <div className="flex-1 rounded-xl border border-border bg-white p-4 shadow-soft">
                            <h4 className="text-sm font-semibold text-navy">
                              {step.title}
                            </h4>
                            <p className="mt-1 text-sm text-text-secondary">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Tech Stack & Business Value */}
              <div className="mt-12 grid gap-8 lg:grid-cols-2">
                <FadeIn delay={0.25}>
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-navy">
                      Technology Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {solution.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="px-3 py-1.5">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FadeIn>

                <FadeIn delay={0.3}>
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-navy">
                      Giá trị kinh doanh
                    </h3>
                    <ul className="space-y-2.5">
                      {solution.businessValue.map((v) => (
                        <li
                          key={v}
                          className="flex items-start gap-2.5 text-sm text-text-secondary"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              </div>

              <FadeIn delay={0.35}>
                <div className="mt-10">
                  <Button asChild>
                    <Link href="/contact">
                      Tư vấn {solution.shortTitle}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </section>
        );
      })}

      <CTASection
        title="Không chắc giải pháp nào phù hợp?"
        description="Hãy để chúng tôi tư vấn miễn phí — phân tích nhu cầu và đề xuất giải pháp AI tối ưu cho doanh nghiệp của bạn."
      />
    </>
  );
}
