"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { aiCoreNodes } from "@/data/technologies";
import { cn } from "@/lib/utils";

interface AICoreProps {
className?: string;
size?: number;
}

export function AICore({ className, size = 420 }: AICoreProps) {
const [activeNode, setActiveNode] = useState<string | null>(null);
const center = size / 2;
const coreRadius = 48;

const nodes = useMemo(
() =>
aiCoreNodes.map((node) => {
const rad = (node.angle * Math.PI) / 180;
const dist = size < 360 ? node.distance * 0.7 : node.distance;
return {
...node,
x: center + Math.cos(rad) * dist,
y: center + Math.sin(rad) * dist,
};
}),
[center, size]
);

const active = nodes.find((n) => n.id === activeNode);

return (
<div
className={cn("relative mx-auto select-none", className)}
style={{ width: size, height: size }}
>
{/* Ambient glow */}
<div className="absolute inset-0 flex items-center justify-center">
<motion.div
className="h-48 w-48 rounded-full bg-primary/20 blur-[60px]"
animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
/>
</div>

<svg width={size} height={size} className="absolute inset-0">
    <defs>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.3" />
      </linearGradient>
      <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="60%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Connection lines */}
    {nodes.map((node) => (
      <motion.line
        key={`line-${node.id}`}
        x1={center}
        y1={center}
        x2={node.x}
        y2={node.y}
        stroke="url(#lineGrad)"
        strokeWidth={activeNode === node.id ? 2 : 1}
        strokeDasharray="4 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: activeNode === node.id ? 0.9 : 0.35,
        }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
    ))}

    {/* Orbit ring */}
    <motion.circle
      cx={center}
      cy={center}
      r={size < 360 ? 126 : 180}
      fill="none"
      stroke="#2563EB"
      strokeWidth="0.5"
      strokeOpacity="0.15"
      strokeDasharray="2 6"
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: `${center}px ${center}px` }}
    />

    {/* Core sphere */}
    <motion.circle
      cx={center}
      cy={center}
      r={coreRadius}
      fill="url(#coreGrad)"
      filter="url(#glow)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
    />
    <motion.circle
      cx={center}
      cy={center}
      r={coreRadius + 12}
      fill="none"
      stroke="#38BDF8"
      strokeWidth="1"
      strokeOpacity="0.3"
      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
      transition={{ duration: 3, repeat: Infinity }}
      style={{ transformOrigin: `${center}px ${center}px` }}
    />
    <motion.circle
      cx={center}
      cy={center}
      r={coreRadius + 24}
      fill="none"
      stroke="#2563EB"
      strokeWidth="0.5"
      strokeOpacity="0.15"
      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.05, 0.15] }}
      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      style={{ transformOrigin: `${center}px ${center}px` }}
    />

    {/* Core label */}
    <text
      x={center}
      y={center + 1}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-white text-[11px] font-bold"
      style={{ fontSize: 11, fontWeight: 700 }}
    >
      AI CORE
    </text>
  </svg>

  {/* Node buttons */}
  {nodes.map((node, i) => (
    <motion.button
      key={node.id}
      className={cn(
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold shadow-soft transition-all duration-300",
        activeNode === node.id
          ? "border-primary bg-primary text-white shadow-glow scale-110"
          : "border-border bg-white/90 text-navy backdrop-blur-sm hover:border-primary/40 hover:shadow-card"
      )}
      style={{ left: node.x, top: node.y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 200 }}
      onMouseEnter={() => setActiveNode(node.id)}
      onMouseLeave={() => setActiveNode(null)}
      onFocus={() => setActiveNode(node.id)}
      onBlur={() => setActiveNode(null)}
    >
      {node.label}
    </motion.button>
  ))}

  {/* Description tooltip */}
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="absolute bottom-0 left-1/2 z-20 w-64 -translate-x-1/2 translate-y-full rounded-xl border border-border bg-white/95 p-4 shadow-elevated backdrop-blur-sm"
      >
        <p className="text-sm font-semibold text-navy">{active.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {active.description}
        </p>
      </motion.div>
    )}
  </AnimatePresence>
</div>
);
}