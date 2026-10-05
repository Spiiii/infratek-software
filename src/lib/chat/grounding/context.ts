import type { SelectedSource, SourceLabel } from "../retrieval/types.ts";

const ALLOWED_LABELS = new Set<SourceLabel>(["S1", "S2", "S3", "S4", "S5", "S6"]);

export type ContextBuildFailure =
  | "NO_SOURCES"
  | "TOO_MANY_SOURCES"
  | "INVALID_SOURCE_LABEL"
  | "DUPLICATE_SOURCE_LABEL";

export type ContextBuildResult =
  | {
      state: "READY";
      content: string;
      labels: readonly SourceLabel[];
      sources: readonly SelectedSource[];
    }
  | { state: "INVALID"; reason: ContextBuildFailure };

function isSourceLabel(value: unknown): value is SourceLabel {
  return typeof value === "string" && ALLOWED_LABELS.has(value as SourceLabel);
}

// Every untrusted value remains on one logical line and cannot emit trusted wrapper or label syntax.
export function escapeContextValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("<", "\\u003C")
    .replaceAll(">", "\\u003E")
    .replaceAll("[", "\\u005B")
    .replaceAll("]", "\\u005D");
}

function serializeSource(selected: SelectedSource): string {
  const { source } = selected;
  const title = source.title ?? "";
  const heading = source.headingPath.join(" > ");

  return [
    `[${source.label}]`,
    `title: ${escapeContextValue(title)}`,
    `heading: ${escapeContextValue(heading)}`,
    `url: ${escapeContextValue(source.url)}`,
    `content: ${escapeContextValue(source.content)}`,
  ].join("\n");
}

export function buildGroundingContext(sources: readonly SelectedSource[]): ContextBuildResult {
  if (sources.length === 0) return { state: "INVALID", reason: "NO_SOURCES" };
  if (sources.length > 6) return { state: "INVALID", reason: "TOO_MANY_SOURCES" };

  const labels: SourceLabel[] = [];
  const seen = new Set<SourceLabel>();
  for (const selected of sources) {
    const label: unknown = selected.source.label;
    if (!isSourceLabel(label)) return { state: "INVALID", reason: "INVALID_SOURCE_LABEL" };
    if (seen.has(label)) return { state: "INVALID", reason: "DUPLICATE_SOURCE_LABEL" };
    seen.add(label);
    labels.push(label);
  }

  return {
    state: "READY",
    content: sources.map(serializeSource).join("\n\n"),
    labels,
    sources,
  };
}
