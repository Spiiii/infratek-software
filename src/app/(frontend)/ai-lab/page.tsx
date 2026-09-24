import type { Metadata } from "next";
import { Beaker, FlaskConical, Rocket } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getInnovationProjects } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "AI Innovation Lab", description: "Các hướng nghiên cứu và thử nghiệm AI hiện có của Infratek Software.", path: "/ai-lab" });
const status = { research: { label: "Research", icon: Beaker }, prototype: { label: "Prototype", icon: FlaskConical }, production: { label: "Production", icon: Rocket } };
export default async function AILabPage() { const projects = await getInnovationProjects(); return <><section className="relative overflow-hidden pb-16 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">AI Innovation Lab</span><h1 className="heading-lg">Nghiên cứu và thử nghiệm AI</h1><p className="body-lg mt-4">Các dự án R&amp;D đang được theo dõi theo trạng thái hiện có.</p></div></FadeIn></div></section><section className="section-padding pt-0"><div className="container-main grid gap-5 md:grid-cols-2 lg:grid-cols-3">{projects.map((project) => { const item = status[project.status]; const Icon = item.icon; return <Card key={project.id}><CardContent className="p-6"><div className="mb-4 flex items-center justify-between"><Icon className="h-6 w-6 text-primary" /><Badge variant="secondary">{item.label}</Badge></div><h2 className="font-semibold text-navy">{project.title}</h2><p className="mt-2 text-sm text-text-secondary">{project.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{project.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div></CardContent></Card>; })}</div></section><CTASection /></>; }
