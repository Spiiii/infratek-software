// File: src/app/case-studies/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCaseStudies } from "@/lib/content";
import { FadeIn } from "@/components/shared/fade-in";
import { CTASection } from "@/components/layout/cta-section";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Case Studies",
  description:
    "Khám phá các dự án AI thực tế: Camera AI, OCR Document Intelligence, Interview AI và PMS — kết quả đo lường được.",
  path: "/case-studies",
});

export default async function CaseStudiesPage() {
  const caseStudies = await getCaseStudies();
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-32">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="container-main relative z-10">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-label mb-4">Case Studies</span>
              <h1 className="heading-lg text-balance">
                Dự án AI thực tế,{" "}
                <span className="gradient-text">kết quả đo lường được</span>
              </h1>
              <p className="body-lg mt-4 text-balance">
                Từ Camera AI giám sát nhà máy đến OCR xử lý hàng nghìn chứng từ
                mỗi ngày — khám phá cách chúng tôi tạo giá trị bằng AI.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="grid gap-8 md:grid-cols-2">
            {caseStudies.map((cs, i) => (
              <FadeIn key={cs.id} delay={i * 0.1}>
                <Link
                  href={`/case-studies/${cs.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
                >
                  <div
                    className={`relative flex h-48 items-end bg-gradient-to-br ${cs.coverGradient} p-6`}
                  >
                    <div className="absolute inset-0 bg-navy/10 transition-colors group-hover:bg-navy/5" />
                    <div className="relative">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                          {cs.industry}
                        </Badge>
                        <Badge className="border-white/20 bg-white/10 text-white/80 backdrop-blur-sm">
                          {cs.year}
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-bold text-white">{cs.title}</h2>
                      <p className="mt-1 text-sm text-white/70">{cs.client}</p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-6 flex-1 text-sm leading-relaxed text-text-secondary">
                      {cs.summary}
                    </p>

                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {cs.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-xl bg-surface-light p-3 text-center"
                        >
                          <p className="text-lg font-bold text-primary">
                            <AnimatedCounter
                              value={m.value}
                              prefix={m.prefix}
                              suffix={m.suffix}
                            />
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-secondary">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {cs.techStack.slice(0, 5).map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-[10px]">
                          {tech}
                        </Badge>
                      ))}
                      {cs.techStack.length > 5 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{cs.techStack.length - 5}
                        </Badge>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                      Xem case study
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Muốn kết quả tương tự cho doanh nghiệp?"
        description="Liên hệ để thảo luận về thách thức của bạn và khám phá cách AI có thể tạo giá trị."
      />
    </>
  );
}
