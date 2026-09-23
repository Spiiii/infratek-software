// File: src/components/shared/animated-counter.tsx
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
  className,
}: AnimatedCounterProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {value.toLocaleString("vi-VN")}
      {suffix}
    </span>
  );
}
