import type { Metadata } from "next";
import { AIReadinessAssessment } from "@/components/features/ai-readiness-assessment";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "AI Readiness Assessment", description: "Tự đánh giá mức độ sẵn sàng AI và nhận gợi ý tham khảo cho doanh nghiệp.", path: "/tools/ai-readiness" });
export default function AIReadinessPage() { return <><section className="relative overflow-hidden pb-14 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">AI Readiness</span><h1 className="heading-lg">Đánh giá mức độ sẵn sàng AI</h1><p className="body-lg mt-4">Trả lời các câu hỏi để nhận kết quả và khuyến nghị tham khảo.</p></div></FadeIn></div></section><section className="section-padding pt-0"><div className="container-main"><AIReadinessAssessment /></div></section><CTASection /></>; }
