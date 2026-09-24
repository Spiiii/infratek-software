import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent } from "@/components/ui/card";
import { getCompany } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "Đội ngũ", description: "Thông tin đội ngũ Infratek Software.", path: "/about/team" });

export default async function TeamPage() {
  const company = await getCompany();
  return <><section className="relative overflow-hidden pb-16 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">Our Team</span><h1 className="heading-lg">Đội ngũ Infratek</h1><p className="body-lg mt-4">Thông tin được công bố dựa trên dữ liệu hiện có của website.</p></div></FadeIn></div></section><section className="section-padding pt-0"><div className="container-main"><Card className="mx-auto max-w-xl"><CardContent className="flex items-center gap-5 p-7"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><UserRound className="h-8 w-8 text-primary" /></div><div><h2 className="text-xl font-bold text-navy">{company.director}</h2><p className="text-sm text-text-secondary">Director</p></div></CardContent></Card><p className="mx-auto mt-6 max-w-xl rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-secondary">Thông tin thành viên khác đang được cập nhật.</p></div></section><CTASection /></>;
}
