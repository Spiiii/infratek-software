import type { Metadata } from "next";
import { ROICalculator } from "@/components/features/roi-calculator";
import { CTASection } from "@/components/layout/cta-section";
import { FadeIn } from "@/components/shared/fade-in";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({ title: "ROI Calculator", description: "Công cụ ước tính giá trị tham khảo từ tự động hóa và AI dựa trên dữ liệu đầu vào.", path: "/tools/roi-calculator" });
export default function ROICalculatorPage() { return <><section className="relative overflow-hidden pb-14 pt-32"><div className="absolute inset-0 bg-gradient-hero" /><div className="container-main relative z-10"><FadeIn><div className="mx-auto max-w-3xl text-center"><span className="section-label mb-4">ROI Calculator</span><h1 className="heading-lg">Ước tính giá trị AI mang lại</h1><p className="body-lg mt-4">Kết quả chỉ mang tính tham khảo và phụ thuộc vào dữ liệu đầu vào.</p></div></FadeIn></div></section><section className="section-padding pt-0"><div className="container-main"><ROICalculator /></div></section><CTASection /></>; }
