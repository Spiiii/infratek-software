// File: src/components/features/transformation-timeline.tsx
"use client";

import { motion } from "framer-motion";
import {
  Search,
  Database,
  Brain,
  Rocket,
  Activity,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { transformationTimeline } from "@/data/technologies";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Search,
  Database,
  Brain,
  Rocket,
  Activity,
  TrendingUp,
};

export function TransformationTimeline() {
  return (
    <div className="relative">
      {/* Desktop horizontal line */}
      <div className="absolute left-0 right-0 top-10 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {transformationTimeline.map((step, i) => {
          const Icon = iconMap[step.icon] || Brain;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 mb-4 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-primary/5 transition-colors group-hover:bg-primary/10" />
                <div
                  className={cn(
                    "relative flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-white shadow-soft transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-glow"
                  )}
                >
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-white shadow-glow">
                  {i + 1}
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-navy">{step.title}</h3>
              <p className="text-xs leading-relaxed text-text-secondary">
                {step.description}
              </p>
              {i < transformationTimeline.length - 1 && (
                <div className="mt-4 h-6 w-0.5 bg-primary/20 lg:hidden" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}