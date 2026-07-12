import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { TrustedTech } from "@/components/home/trusted-tech";
import { AboutSection } from "@/components/home/about-section";
import { TimelineSection } from "@/components/home/timeline-section";
import { SolutionsOverview } from "@/components/home/solutions-overview";
import { TechNetworkSection } from "@/components/home/tech-network-section";
import { FeaturedCases } from "@/components/home/featured-cases";
import { StatisticsSection } from "@/components/home/statistics-section";
import { LatestInsights } from "@/components/home/latest-insights";
import { CTASection } from "@/components/layout/cta-section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ROICalculator } from "@/components/features/roi-calculator";
import { AIReadinessAssessment } from "@/components/features/ai-readiness-assessment";
import { DownloadCenter } from "@/components/features/download-center";
import { InnovationLab } from "@/components/features/innovation-lab";
import { company } from "@/data/company";
export const metadata: Metadata = {
  title: `${company.name} — ${company.tagline}`,
  description: company.missionVi,
};
export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustedTech />
      <AboutSection />
      <TimelineSection />
      <SolutionsOverview />
      <TechNetworkSection />
      <FeaturedCases />
      <StatisticsSection />
      {/* ROI Calculator */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <SectionHeading
            label="ROI Calculator"
            title="Ước tính giá trị AI mang lại"
            description="Nhập thông tin doanh nghiệp để ước tính thời gian tiết kiệm, giảm chi phí và ROI từ việc triển khai AI."
          />
          <ROICalculator />
        </div>
      </section>
      {/* AI Readiness Assessment */}
      <section className="section-padding">
        <div className="container-main">
          <SectionHeading
            label="AI Readiness"
            title="Đánh giá mức độ sẵn sàng AI"
            description="Trả lời vài câu hỏi ngắn để nhận AI Readiness Score và khuyến nghị giải pháp phù hợp."
          />
          <AIReadinessAssessment />
        </div>
      </section>
      {/* Download Center */}
      <section id="download" className="section-padding bg-white">
        <div className="container-main">
          <SectionHeading
            label="Download Center"
            title="Tài nguyên miễn phí"
            description="Tải xuống company profile, whitepaper, guides và checklist để bắt đầu hành trình AI."
          />
          <DownloadCenter />
        </div>
      </section>
      {/* AI Innovation Lab */}
      <section className="section-padding">
        <div className="container-main">
          <SectionHeading
            label="AI Innovation Lab"
            title="Nghiên cứu & Phát triển"
            description="Khám phá các dự án R&D nội bộ — từ AI Agents, Voice AI đến Vision Language Models."
          />
          <InnovationLab />
        </div>
      </section>
      <LatestInsights />
      <CTASection />
    </>
  );
}