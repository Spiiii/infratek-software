"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { company } from "@/data/company";

const AICore = dynamic(
  () => import("@/components/features/ai-core").then((m) => m.AICore),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto flex items-center justify-center"
        style={{ width: 320, height: 320 }}
        aria-hidden
      >
        <div className="h-24 w-24 animate-pulse rounded-full bg-primary/20 blur-xl" />
      </div>
    ),
  }
);

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="grid-pattern absolute inset-0 opacity-60" />
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-primary-accent/10 blur-[100px]" />

      <div className="container-main relative z-10 flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-16 lg:flex-row lg:gap-8 lg:py-0">
        {/* Text content */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Enterprise AI Solutions
            </span>
          </motion.div>

          <motion.h1
            className="heading-xl text-balance"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="gradient-text">{company.tagline}</span>
          </motion.h1>

          <motion.p
            className="body-lg mx-auto mt-6 max-w-xl text-balance lg:mx-0"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {company.missionVi}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button asChild size="lg">
              <Link href="/contact">
                Bắt đầu ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/case-studies">
                <Play className="h-4 w-4" />
                Xem Case Studies
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-10 flex items-center justify-center gap-6 lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { value: "50+", label: "Dự án AI" },
              { value: "30+", label: "Doanh nghiệp" },
              { value: "98%", label: "Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-2xl font-bold text-navy">{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* AI Core — chỉ render trên client (tránh hydration mismatch) */}
        <motion.div
          className="relative mt-12 flex flex-1 items-center justify-center lg:mt-0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="hidden lg:block">
            <AICore size={440} />
          </div>
          <div className="lg:hidden">
            <AICore size={320} />
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-[10px] font-medium tracking-widest text-text-secondary uppercase">
          Scroll
        </span>
        <motion.div
          className="h-8 w-5 rounded-full border border-border"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="mx-auto mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}