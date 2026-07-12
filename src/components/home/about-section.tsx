// File: src/components/home/about-section.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Target, Lightbulb, Shield, Users } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { company } from "@/data/company";

const values = [
  {
    icon: Target,
    title: "Business Value First",
    description: "Mọi giải pháp AI đều hướng đến ROI đo lường được, không phải technology for technology.",
  },
  {
    icon: Lightbulb,
    title: "Practical Innovation",
    description: "Áp dụng AI thực tiễn vào quy trình doanh nghiệp — từ PoC nhanh đến production scale.",
  },
  {
    icon: Shield,
    title: "Enterprise Trust",
    description: "Bảo mật, compliance, và reliability đạt chuẩn enterprise trong mọi hệ thống.",
  },
  {
    icon: Users,
    title: "Partnership",
    description: "Đồng hành dài hạn — không chỉ deliver project mà build capability cho client.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="section-padding">
      <div className="container-main">
        <SectionHeading
          label="Về Infratek"
          title="Chúng tôi xây dựng Enterprise AI"
          description={company.missionVi}
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-2xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 transition-colors group-hover:bg-primary/10">
                <value.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-navy">{value.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="secondary">
            <Link href="/solutions">
              Khám phá giải pháp
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}