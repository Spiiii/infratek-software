import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getResources } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "Tài nguyên", description: "Tài nguyên về AI, phần mềm và chuyển đổi số từ Infratek Software.", path: "/resources" });
export default async function ResourcesPage() {
  const resources = await getResources();
  return <><section className="relative overflow-hidden pb-16 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">Resources</span><h1 className="heading-lg">Tài nguyên chuyên môn</h1><p className="body-lg mt-4">Danh mục tài liệu đang được chuẩn bị để phát hành.</p></div></FadeIn></div></section><section className="section-padding pt-0"><div className="container-main grid gap-5 md:grid-cols-2 lg:grid-cols-3">{resources.map((resource) => <Card key={resource.slug} className="card-hover"><CardContent className="flex h-full flex-col p-6"><div className="mb-4 flex items-center justify-between"><FileText className="h-6 w-6 text-primary" /><Badge variant="secondary">{resource.category}</Badge></div><h2 className="font-semibold text-navy">{resource.title}</h2><p className="mt-2 flex-1 text-sm text-text-secondary">{resource.description}</p><Badge variant="outline" className="mt-4 w-fit">Sắp có</Badge><Link href={`/resources/${resource.slug}`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">Xem thông tin <ArrowRight className="h-4 w-4" /></Link></CardContent></Card>)}</div></section><CTASection /></>;
}
