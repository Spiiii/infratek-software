// File: src/components/layout/section-heading.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
}

export function SectionHeading({
  label,
  title,
  description,
  align = "center",
  className,
  light = false,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "mx-auto max-w-3xl text-center",
        className
      )}
    >
      {label && (
        <span className="section-label mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {label}
        </span>
      )}
      <h2
        className={cn(
          "heading-lg text-balance",
          light ? "text-white" : "text-navy"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "body-lg mt-4 text-balance",
            light ? "text-white/70" : "text-text-secondary"
          )}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}