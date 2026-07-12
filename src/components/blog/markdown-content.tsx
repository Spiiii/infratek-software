"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText(
      (children as { props: { children?: React.ReactNode } }).props.children
    );
  }
  return "";
}

const components: Components = {
  h2: ({ children }) => {
    const text = extractText(children);
    const id = slugifyHeading(text);
    return (
      <h2 id={id} className="scroll-mt-28">
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const text = extractText(children);
    const id = slugifyHeading(text);
    return (
      <h3 id={id} className="scroll-mt-28">
        {children}
      </h3>
    );
  },
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose-infratek", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}