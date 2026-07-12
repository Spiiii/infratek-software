// File: src/components/features/innovation-lab.tsx
"use client";

import { motion } from "framer-motion";
import { FlaskConical, Beaker, Rocket } from "lucide-react";
import { innovationProjects } from "@/data/technologies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  research: {
    label: "Research",
    icon: Beaker,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  prototype: {
    label: "Prototype",
    icon: FlaskConical,
    className: "border-primary/20 bg-primary/5 text-primary",
  },
  production: {
    label: "Production",
    icon: Rocket,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export function InnovationLab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {innovationProjects.map((project, i) => {
        const status = statusConfig[project.status];
        const StatusIcon = status.icon;
        return (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="card-hover h-full border-border">
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5">
                    <StatusIcon className="h-5 w-5 text-navy" />
                  </div>
                  <Badge className={cn(status.className)}>{status.label}</Badge>
                </div>
                <h3 className="mb-2 text-base font-semibold text-navy">
                  {project.title}
                </h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}