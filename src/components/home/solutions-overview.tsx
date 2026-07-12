// File: src/components/home/solutions-overview.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Code2, Users, Sparkles, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { solutions } from "@/data/solutions";
import { cn } from "@/lib/utils";

const iconMap = {
  Brain,
  Code2,
  Users,
  Sparkles,
};

export function SolutionsOverview() {
  return (
    <section className="section-padding bg-white">
      <div className="container-main">
        <SectionHeading
          label="Giải pháp"
          title="AI Solutions cho mọi thách thức"
          description="Từ tư vấn chiến lược đến triển khai production — chúng tôi cung cấp giải pháp AI toàn diện tạo giá trị kinh doanh thực."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {solutions.map((solution, i) => {
            const Icon = iconMap[solution.icon as keyof typeof iconMap] || Brain;
            return (
              <motion.div
                key={solution.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/solutions#${solution.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface-light p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:shadow-glow"
                      )}
                    >
                      <Icon className="h-7 w-7 text-primary transition-colors group-hover:text-white" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-text-secondary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-navy">{solution.title}</h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                    {solution.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {solution.businessValue.slice(0, 2).map((v) => (
                      <span
                        key={v}
                        className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-text-secondary border border-border"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}