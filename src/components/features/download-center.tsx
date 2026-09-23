// File: src/components/features/download-center.tsx
"use client";

import { motion } from "framer-motion";
import { FileText, CheckSquare, File } from "lucide-react";
import { downloadResources } from "@/data/technologies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const typeIcons = {
  pdf: FileText,
  docx: File,
  checklist: CheckSquare,
};

export function DownloadCenter() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {downloadResources.map((resource, i) => {
        const Icon = typeIcons[resource.type] || FileText;
        return (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="card-hover h-full border-border">
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{resource.category}</Badge>
                </div>
                <h3 className="mb-2 text-base font-semibold text-navy">
                  {resource.title}
                </h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                  {resource.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{resource.size}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                  >
                    Sắp có
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
