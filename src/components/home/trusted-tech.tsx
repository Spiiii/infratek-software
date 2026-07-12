// File: src/components/home/trusted-tech.tsx
"use client";

import { motion } from "framer-motion";
import { trustedLogos } from "@/data/technologies";

export function TrustedTech() {
  const logos = [...trustedLogos, ...trustedLogos];

  return (
    <section className="border-y border-border bg-white py-12">
      <div className="container-main">
        <p className="mb-8 text-center text-sm font-medium tracking-wide text-text-secondary uppercase">
          Công nghệ & nền tảng chúng tôi sử dụng
        </p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-white to-transparent" />
          <motion.div
            className="flex gap-12"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {logos.map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="flex shrink-0 items-center justify-center"
              >
                <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-navy/30 transition-colors hover:text-navy/60">
                  {logo}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}