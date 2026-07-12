// File: src/components/home/timeline-section.tsx
"use client";

import { SectionHeading } from "@/components/layout/section-heading";
import { TransformationTimeline } from "@/components/features/transformation-timeline";

export function TimelineSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-main">
        <SectionHeading
          label="AI Transformation Journey"
          title="Hành trình triển khai AI"
          description="Quy trình 6 bước đã được chứng minh — từ phân tích nghiệp vụ đến continuous improvement."
        />
        <TransformationTimeline />
      </div>
    </section>
  );
}