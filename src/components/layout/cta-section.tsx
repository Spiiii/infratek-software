// File: src/components/layout/cta-section.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function CTASection({
  title = "Sẵn sàng chuyển đổi doanh nghiệp với AI?",
  description = "Hãy để Infratek Software đồng hành cùng bạn trên hành trình AI transformation — từ strategy đến production systems tạo giá trị thực.",
  primaryLabel = "Tư vấn miễn phí",
  primaryHref = "/contact",
  secondaryLabel = "Xem Case Studies",
  secondaryHref = "/case-studies",
}: CTASectionProps) {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-navy" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-primary-accent/20 blur-[100px]" />
      </div>
      <div className="dot-pattern absolute inset-0" />

      <div className="container-main relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="heading-lg text-balance text-white">{title}</h2>
          <p className="body-lg mt-4 text-balance text-white/70">{description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href={primaryHref}>
                <MessageSquare className="h-4 w-4" />
                {primaryLabel}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-w-[200px] border-white/20 text-white hover:bg-white/10"
            >
              <Link href={secondaryHref}>
                {secondaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}