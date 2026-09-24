import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileCheck2, HelpCircle, Users } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { JsonLd } from "@/components/seo/json-ld";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCaseStudies, getSolutionBySlug, getSolutions } from "@/lib/content";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";

interface PageProps { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return (await getSolutions()).map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const solution = await getSolutionBySlug((await params).slug);
  if (!solution) return { title: "Solution Not Found" };
  return createPageMetadata({ title: solution.title, description: solution.description, path: `/solutions/${solution.slug}` });
}

function PendingBlock({ note }: { note?: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-surface-light p-5 text-sm text-text-secondary">{note ?? "Đang cập nhật — liên hệ để biết thêm chi tiết."}</div>;
}

export default async function SolutionDetailPage({ params }: PageProps) {
  const solution = await getSolutionBySlug((await params).slug);
  if (!solution) notFound();
  const relatedSlugs = new Set(solution.relatedCaseStudySlugs);
  const relatedCases = (await getCaseStudies()).filter((item) => relatedSlugs.has(item.slug));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", "@id": absoluteUrl(`/solutions/${solution.slug}#service`), name: solution.title, description: solution.description, url: absoluteUrl(`/solutions/${solution.slug}`), provider: { "@id": absoluteUrl("/#organization") }, areaServed: { "@type": "Country", name: "Vietnam" }, serviceType: solution.title }} />
      <section className="relative overflow-hidden pb-16 pt-32">
        <div className="absolute inset-0 bg-gradient-hero" /><div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="container-main relative z-10"><FadeIn>
          <Link href="/solutions" className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"><ArrowLeft className="h-4 w-4" /> Tất cả giải pháp</Link>
          <Badge variant="secondary" className="mb-4 block w-fit">{solution.shortTitle}</Badge>
          <h1 className="heading-lg max-w-4xl">{solution.title}</h1><p className="body-lg mt-5 max-w-3xl">{solution.description}</p>
        </FadeIn></div>
      </section>
      <section className="section-padding pt-0"><div className="container-main space-y-14">
        <section><h2 className="heading-sm mb-4">Câu trả lời nhanh</h2><Card className="border-primary/20 bg-primary/5"><CardContent className="p-6 text-text-secondary">{solution.quickAnswer}</CardContent></Card></section>
        <section><h2 className="heading-sm mb-4">Dấu hiệu doanh nghiệp cần giải pháp này</h2><ul className="space-y-3">{solution.needSignals.map((item) => <li key={item} className="flex gap-3 text-sm text-text-secondary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></section>
        <section><h2 className="heading-sm mb-4 flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary" />Sản phẩm bàn giao</h2><PendingBlock note={solution.deliverables.note} /></section>
        <section><h2 className="heading-sm mb-6">Quy trình triển khai</h2><div className="grid gap-4 md:grid-cols-2">{solution.process.map((step) => <Card key={step.step}><CardContent className="p-5"><span className="text-xs font-bold text-primary">BƯỚC {step.step}</span><h3 className="mt-2 font-semibold text-navy">{step.title}</h3><p className="mt-2 text-sm text-text-secondary">{step.description}</p></CardContent></Card>)}</div></section>
        <section><h2 className="heading-sm mb-4">Kết quả hướng tới</h2><ul className="grid gap-3 md:grid-cols-2">{solution.outcomes.map((item) => <li key={item} className="flex gap-3 rounded-xl border border-border bg-white p-4 text-sm text-text-secondary"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></section>
        <section><h2 className="heading-sm mb-4">Case study liên quan</h2>{relatedCases.length ? <div className="grid gap-4 md:grid-cols-2">{relatedCases.map((item) => <Link key={item.slug} href={`/case-studies/${item.slug}`} className="rounded-xl border border-border bg-white p-5 shadow-soft"><strong className="text-navy">{item.title}</strong><span className="mt-2 block text-sm text-text-secondary">{item.summary}</span><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Xem case study <ArrowRight className="h-4 w-4" /></span></Link>)}</div> : <PendingBlock note="Chưa có case study công khai phù hợp để chứng minh giải pháp này." />}</section>
        <section><h2 className="heading-sm mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Phù hợp / chưa phù hợp với ai</h2><PendingBlock note={solution.audienceFit.note} /></section>
        <section><h2 className="heading-sm mb-4 flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Thời gian và mức đầu tư sơ bộ</h2><PendingBlock note={solution.timelineAndInvestment.note} /></section>
        <section><h2 className="heading-sm mb-4 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Câu hỏi thường gặp</h2><PendingBlock note={solution.faq.note} /></section>
        <section><h2 className="heading-sm mb-4">Technology Stack</h2><div className="flex flex-wrap gap-2">{solution.techStack.map((tech) => <Badge key={tech} variant="secondary">{tech}</Badge>)}</div></section>
      </div></section>
      <CTASection title={`Trao đổi về ${solution.title}`} description="Liên hệ để làm rõ nhu cầu, phạm vi và bước tiếp theo phù hợp." />
    </>
  );
}
