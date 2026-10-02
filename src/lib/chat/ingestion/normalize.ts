const WHITESPACE = /[\t\f\v ]+/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(WHITESPACE, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function lexicalText(value: unknown): string {
  const lines: string[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") lines.push(record.text);
    if (Array.isArray(record.children)) {
      for (const child of record.children) visit(child);
      if (record.type === "paragraph" || record.type === "heading") lines.push("\n");
    }
  };

  visit(value);
  return normalizeText(lines.join(" ").replace(/\s*\n\s*/g, "\n"));
}

export function nonEmpty(values: Array<string | null | undefined>): string[] {
  return values.map((value) => normalizeText(value ?? "")).filter(Boolean);
}
