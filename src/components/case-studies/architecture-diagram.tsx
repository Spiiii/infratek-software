// File: src/components/case-studies/architecture-diagram.tsx
"use client";

import { motion } from "framer-motion";
import type { ArchitectureNode } from "@/types";
import { cn } from "@/lib/utils";

interface ArchitectureDiagramProps {
  nodes: ArchitectureNode[];
}

const typeStyles: Record<string, string> = {
  input: "border-sky-300 bg-sky-50 text-sky-800",
  ai: "border-primary/30 bg-primary/5 text-primary",
  process: "border-blue-300 bg-blue-50 text-blue-800",
  storage: "border-slate-300 bg-slate-50 text-slate-700",
  output: "border-indigo-300 bg-indigo-50 text-indigo-800",
};

const typeLabels: Record<string, string> = {
  input: "Input",
  ai: "AI",
  process: "Process",
  storage: "Storage",
  output: "Output",
};

export function ArchitectureDiagram({ nodes }: ArchitectureDiagramProps) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        {Object.entries(typeLabels).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              typeStyles[key]
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="relative flex flex-wrap items-center justify-center gap-3 md:gap-0">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative z-10 w-36 rounded-2xl border-2 p-4 text-center shadow-soft transition-shadow hover:shadow-card sm:w-40",
                typeStyles[node.type]
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wide opacity-60">
                {typeLabels[node.type]}
              </p>
              <p className="mt-1 text-sm font-semibold">{node.label}</p>
              <p className="mt-1 text-[10px] leading-relaxed opacity-70">
                {node.description}
              </p>
            </motion.div>
            {i < nodes.length - 1 && (
              <div className="mx-1 hidden h-0.5 w-6 bg-primary/30 md:block lg:w-8">
                <div className="relative">
                  <div className="absolute -right-1 -top-1 h-2 w-2 rotate-45 border-r-2 border-t-2 border-primary/40" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}