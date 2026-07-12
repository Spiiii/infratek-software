// File: src/components/shared/animated-counter.tsx
"use client";

import { useCounter } from "@/hooks/use-counter";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2000,
  className,
}: AnimatedCounterProps) {
  const { ref, isVisible } = useScrollReveal<HTMLSpanElement>();
  const count = useCounter(value, { duration, enabled: isVisible });

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {count.toLocaleString("vi-VN")}
      {suffix}
    </span>
  );
}