import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { CitedPublicSource } from "@/lib/chat/grounding/citations";

export function ChatSources({ sources }: { sources: readonly CitedPublicSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Nguồn tham khảo</p>
      <ul className="space-y-2">
        {sources.map((source) => {
          const external = /^https?:\/\//u.test(source.url);
          return (
            <li key={source.label}>
              <Link
                href={source.url}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex max-w-full items-start gap-2 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="shrink-0">[{source.label}]</span>
                <span className="break-words">{source.title}{source.headingPath.length ? ` — ${source.headingPath.join(" › ")}` : ""}</span>
                {external && <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
