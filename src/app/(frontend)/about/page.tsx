import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Target } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCompany } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "Về Infratek Software", description: "Thông tin tổng quan về Infratek Software.", path: "/about" });

export default async function AboutPage() {
  const company = await getCompany();
  return <>
    <section className="relative overflow-hidden pb-16 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="grid-pattern absolute inset-0 opacity-40" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">About Infratek</span><h1 className="heading-lg">Về <span className="gradient-text">Infratek Software</span></h1><p className="body-lg mt-4">{company.missionVi}</p></div></FadeIn></div></section>
    <section className="section-padding pt-0"><div className="container-main grid gap-6 md:grid-cols-3">
      <Card><CardContent className="p-6"><Building2 className="mb-4 h-6 w-6 text-primary" /><h2 className="font-semibold text-navy">Doanh nghiệp</h2><p className="mt-2 text-sm text-text-secondary">{company.name}</p></CardContent></Card>
      <Card><CardContent className="p-6"><Target className="mb-4 h-6 w-6 text-primary" /><h2 className="font-semibold text-navy">Sứ mệnh</h2><p className="mt-2 text-sm text-text-secondary">{company.missionVi}</p></CardContent></Card>
      <Card><CardContent className="p-6"><MapPin className="mb-4 h-6 w-6 text-primary" /><h2 className="font-semibold text-navy">Địa chỉ</h2><p className="mt-2 text-sm text-text-secondary">{company.fullAddress}</p></CardContent></Card>
    </div><div className="container-main mt-10 text-center"><Button asChild variant="secondary"><Link href="/about/team">Tìm hiểu đội ngũ <ArrowRight className="h-4 w-4" /></Link></Button></div></section>
    <CTASection />
  </>;
}
