// File: src/components/home/statistics-section.tsx
"use client";

import { motion } from "framer-motion";
import { statistics } from "@/data/company";
import { AnimatedCounter } from "@/components/shared/animated-counter";

export function StatisticsSection() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-navy" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-primary blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary-accent blur-[100px]" />
      </div>

      <div className="container-main relative z-10">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {statistics.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-white md:text-5xl">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-white/60">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}