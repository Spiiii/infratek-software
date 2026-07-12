// File: src/components/home/tech-network-section.tsx
"use client";

import { SectionHeading } from "@/components/layout/section-heading";
import { TechnologyNetwork } from "@/components/features/technology-network";

export function TechNetworkSection() {
  return (
    <section className="section-padding">
      <div className="container-main">
        <SectionHeading
          label="Technology Stack"
          title="Mạng lưới công nghệ"
          description="Chúng tôi sử dụng stack công nghệ hiện đại nhất — từ AI frameworks đến cloud infrastructure — để xây dựng hệ thống enterprise-grade."
        />
        <TechnologyNetwork />
      </div>
    </section>
  );
}