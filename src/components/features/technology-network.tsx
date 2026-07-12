
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { technologies } from "@/data/technologies";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const categoryColors: Record<string, string> = {
  ai: "border-primary/30 bg-primary/5 text-primary",
  frontend: "border-sky-300/50 bg-sky-50 text-sky-700",
  backend: "border-blue-300/50 bg-blue-50 text-blue-700",
  cloud: "border-indigo-300/40 bg-indigo-50 text-indigo-700",
  data: "border-slate-300 bg-slate-50 text-slate-700",
  devops: "border-cyan-300/50 bg-cyan-50 text-cyan-700",
};

const categories = [
  { id: "all", label: "Tất cả" },
  { id: "ai", label: "AI / ML" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "cloud", label: "Cloud" },
  { id: "data", label: "Data" },
  { id: "devops", label: "DevOps" },
];

export function TechnologyNetwork() {
  const [filter, setFilter] = useState("all");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? technologies
      : technologies.filter((t) => t.category === filter);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              filter === cat.id
                ? "bg-primary text-white shadow-glow"
                : "bg-white text-text-secondary border border-border hover:border-primary/30 hover:text-navy"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Background network lines */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <svg className="h-full w-full">
            {filtered.slice(0, 8).map((t, i) => (
              <line
                key={t.id}
                x1={`${20 + (i % 4) * 25}%`}
                y1={`${20 + Math.floor(i / 4) * 40}%`}
                x2={`${30 + ((i + 1) % 4) * 20}%`}
                y2={`${30 + Math.floor((i + 1) / 4) * 35}%`}
                stroke="#2563EB"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
          </svg>
        </div>

        <motion.div layout className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((tech, i) => (
            <motion.div
              key={tech.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onMouseEnter={() => setHovered(tech.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
                hovered === tech.id
                  ? "border-primary/40 shadow-glow"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-transform duration-300 group-hover:scale-110",
                  categoryColors[tech.category]
                )}
              >
                {tech.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-center text-sm font-semibold text-navy">
                {tech.name}
              </span>
              {hovered === tech.id && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-center text-[11px] leading-relaxed text-text-secondary"
                >
                  {tech.description}
                </motion.p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {Object.entries(categoryColors).map(([key]) => (
          <Badge key={key} variant="secondary" className="capitalize">
            {key === "ai" ? "AI / ML" : key}
          </Badge>
        ))}
      </div>
    </div>
  );
}