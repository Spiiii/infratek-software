// File: src/components/case-studies/metric-cards.tsx
"use client";

import { motion } from "framer-motion";
import type { Metric } from "@/types";
import { AnimatedCounter } from "@/components/shared/animated-counter";

interface MetricCardsProps {
  metrics: Metric[];
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="rounded-2xl border border-border bg-white p-6 text-center shadow-soft"
        >
          <p className="text-3xl font-bold text-primary md:text-4xl">
            <AnimatedCounter
              value={metric.value}
              prefix={metric.prefix}
              suffix={metric.suffix}
            />
          </p>
          <p className="mt-2 text-sm font-semibold text-navy">{metric.label}</p>
          <p className="mt-1 text-xs text-text-secondary">{metric.description}</p>
        </motion.div>
      ))}
    </div>
  );
}