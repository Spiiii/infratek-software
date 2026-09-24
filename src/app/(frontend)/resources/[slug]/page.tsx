import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { CTASection } from "@/components/layout/cta-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getResourceBySlug, getResources } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

interface PageProps { params: Promise<{ slug: string }>; }
export async function generateStaticParams() { return (await getResources()).map((resource) => ({ slug: resource.slug })); }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> { const resource = await getResourceBySlug((await params).slug); return resource ? createPageMetadata({ title: resource.title, description: resource.description, path: `/resources/${resource.slug}` }) : { title: "Resource Not Found" }; }
export default async function ResourceDetailPage({ params }: PageProps) { const resource = await getResourceBySlug((await params).slug); if (!resource) notFound(); return <><section className="pb-16 pt-32"><div className="container-main"><Link href="/resources" className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary"><ArrowLeft className="h-4 w-4" /> Tất cả tài nguyên</Link><Card className="mx-auto max-w-3xl"><CardContent className="p-8"><FileText className="mb-5 h-10 w-10 text-primary" /><Badge variant="secondary">{resource.category}</Badge><h1 className="heading-md mt-4">{resource.title}</h1><p className="body-md mt-4">{resource.description}</p><div className="mt-6 rounded-xl border border-dashed border-border bg-surface-light p-5 text-sm text-text-secondary">Tài liệu đang được cập nhật và chưa có tệp tải xuống.</div></CardContent></Card></div></section><CTASection /></>; }
