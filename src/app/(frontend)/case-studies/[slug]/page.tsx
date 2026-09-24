// File: src/app/case-studies/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Building2,
  Calendar,
} from "lucide-react";
import { getCaseStudies, getCaseStudyBySlug } from "@/lib/content";
import { MetricCards } from "@/components/case-studies/metric-cards";
import { ArchitectureDiagram } from "@/components/case-studies/architecture-diagram";
import { FadeIn } from "@/components/shared/fade-in";
import { CTASection } from "@/components/layout/cta-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getCaseStudies()).map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) return { title: "Case Study Not Found" };
  return createPageMetadata({
    title: cs.title,
    description: cs.summary,
    path: `/case-studies/${cs.slug}`,
  });
}

export default async function CaseStudyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const caseStudies = await getCaseStudies();
  const currentIndex = caseStudies.findIndex((c) => c.slug === slug);
  const prev = currentIndex > 0 ? caseStudies[currentIndex - 1] : null;
  const next =
    currentIndex < caseStudies.length - 1 ? caseStudies[currentIndex + 1] : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Case Studies", item: absoluteUrl("/case-studies") },
            { "@type": "ListItem", position: 3, name: cs.title, item: absoluteUrl(`/case-studies/${cs.slug}`) },
          ],
        }}
      />
      {/* Hero Banner */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br ${cs.coverGradient} pb-20 pt-32`}
      >
        <div className="absolute inset-0 bg-navy/20" />
        <div className="dot-pattern absolute inset-0" />
        <div className="container-main relative z-10">
          <FadeIn>
            <Link
              href="/case-studies"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Tất cả Case Studies
            </Link>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">
                {cs.industry}
              </Badge>
              <Badge className="border-white/20 bg-white/10 text-white/80 backdrop-blur-sm">
                <Calendar className="mr-1 h-3 w-3" />
                {cs.year}
              </Badge>
            </div>
            <h1 className="heading-lg max-w-3xl text-white">{cs.title}</h1>
            <div className="mt-4 flex items-center gap-2 text-white/70">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">{cs.client}</span>
            </div>
            <p className="body-lg mt-4 max-w-2xl text-white/80">{cs.summary}</p>
          </FadeIn>
        </div>
      </section>

      {/* Metrics */}
      <section className="relative z-10 -mt-10 pb-16">
        <div className="container-main">
          <MetricCards metrics={cs.metrics} />
        </div>
      </section>

      {/* Challenge & Solution */}
      <section className="pb-16">
        <div className="container-main">
          <div className="grid gap-8 lg:grid-cols-2">
            <FadeIn>
              <Card className="h-full">
                <CardContent className="p-8">
                  <h2 className="mb-4 text-xl font-bold text-navy">
                    Thách thức khách hàng
                  </h2>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {cs.challenge}
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.1}>
              <Card className="h-full border-primary/20 bg-primary/5">
                <CardContent className="p-8">
                  <h2 className="mb-4 text-xl font-bold text-navy">Giải pháp</h2>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {cs.solution}
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <FadeIn>
            <h2 className="heading-sm mb-8 text-center">System Architecture</h2>
          </FadeIn>
          <ArchitectureDiagram nodes={cs.architecture} />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16">
        <div className="container-main">
          <FadeIn>
            <h2 className="heading-sm mb-6 text-center">Technology Stack</h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {cs.techStack.map((tech) => (
                <Badge key={tech} variant="secondary" className="px-4 py-2 text-sm">
                  {tech}
                </Badge>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Implementation Flow */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <FadeIn>
            <h2 className="heading-sm mb-8 text-center">Implementation Flow</h2>
          </FadeIn>
          <div className="mx-auto max-w-3xl space-y-4">
            {cs.implementationFlow.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.08}>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-white shadow-glow">
                    {step.step}
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-surface-light p-4">
                    <h3 className="text-sm font-semibold text-navy">{step.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="section-padding">
        <div className="container-main">
          <FadeIn>
            <h2 className="heading-sm mb-8 text-center">Business Results</h2>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2">
            {cs.results.map((result, i) => (
              <FadeIn key={result.title} delay={i * 0.08}>
                <Card className="h-full">
                  <CardContent className="flex gap-3 p-6">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-navy">
                        {result.title}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {result.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation between cases */}
      <section className="border-t border-border py-8">
        <div className="container-main flex items-center justify-between">
          {prev ? (
            <Button asChild variant="ghost">
              <Link href={`/case-studies/${prev.slug}`}>
                <ArrowLeft className="h-4 w-4" />
                {prev.title}
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {next ? (
            <Button asChild variant="ghost">
              <Link href={`/case-studies/${next.slug}`}>
                {next.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </div>
      </section>

      <CTASection
        title="Muốn triển khai giải pháp tương tự?"
        description="Liên hệ đội ngũ Infratek để thảo luận về dự án AI cho doanh nghiệp của bạn."
      />
    </>
  );
}
