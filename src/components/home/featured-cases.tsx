// File: src/components/home/featured-cases.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { caseStudies } from "@/data/case-studies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/shared/animated-counter";

export function FeaturedCases() {
  const featured = caseStudies.filter((cs) => cs.featured).slice(0, 3);

  return (
    <section className="section-padding">
      <div className="container-main">
        <SectionHeading
          label="Case Studies"
          title="Dự án AI thực tế, kết quả đo lường được"
          description="Khám phá cách chúng tôi giúp doanh nghiệp chuyển đổi bằng AI — từ Camera AI, OCR đến Interview AI và PMS."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {featured.map((cs, i) => (
            <motion.div
              key={cs.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={`/case-studies/${cs.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div
                  className={`relative flex h-40 items-end bg-gradient-to-br ${cs.coverGradient} p-6`}
                >
                  <div className="absolute inset-0 bg-navy/10" />
                  <div className="relative">
                    <Badge className="mb-2 border-white/20 bg-white/20 text-white backdrop-blur-sm">
                      {cs.industry}
                    </Badge>
                    <h3 className="text-xl font-bold text-white">{cs.title}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                    {cs.summary}
                  </p>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {cs.metrics.slice(0, 2).map((m) => (
                      <div key={m.label} className="rounded-xl bg-surface-light p-3">
                        <p className="text-lg font-bold text-primary">
                          <AnimatedCounter
                            value={m.value}
                            prefix={m.prefix}
                            suffix={m.suffix}
                          />
                        </p>
                        <p className="text-[11px] text-text-secondary">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                    Xem chi tiết
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="secondary">
            <Link href="/case-studies">
              Tất cả Case Studies
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}