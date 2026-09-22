// File: src/hooks/use-counter.ts
"use client";

import { useEffect, useState } from "react";

export function useCounter(
  end: number,
  options: { duration?: number; start?: number; enabled?: boolean } = {}
) {
  const { duration = 2000, start = 0, enabled = true } = options;
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (!enabled) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start, enabled]);

  return enabled ? count : start;
}
