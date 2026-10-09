import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";

export const EXPECTED_GROUP_COUNTS = {
  ANSWERABLE: 45,
  MISSING_CONTEXT: 30,
  INJECTION_UNSUPPORTED: 20,
  LANGUAGE_VARIANT: 15,
  AMBIGUOUS_BOUNDARY: 10,
} as const;

export const VERIFIED_SOURCE_REFS = new Set([
  "/solutions/ai-consulting",
  "/solutions/software-development",
  "/solutions/it-outsourcing",
  "/solutions/digital-transformation",
  "/case-studies/camera-ai-transformation",
  "/case-studies/ocr-document-intelligence",
  "/case-studies/interview-ai",
  "/case-studies/pms-project-management",
  "/blog/enterprise-ai-adoption-roadmap-2025",
  "/blog/ocr-accuracy-optimization-guide",
  "/blog/yolo-tensorrt-edge-deployment",
  "/blog/llm-rag-enterprise-knowledge",
  "/blog/digital-transformation-ai-first",
  "/blog/multi-agent-systems-enterprise",
]);

const groupSchema = z.enum(["ANSWERABLE", "MISSING_CONTEXT", "INJECTION_UNSUPPORTED", "LANGUAGE_VARIANT", "AMBIGUOUS_BOUNDARY"]);
const caseSchema = z.object({
  id: z.string().regex(/^chat-eval-(ans|mis|inj|lang|bnd)-\d{3}$/),
  group: groupSchema,
  question: z.string().trim().min(8).max(500),
  expectedDecision: z.enum(["ANSWER", "NO_CONTEXT"]),
  sourceRefs: z.array(z.string().regex(/^\/(solutions|case-studies|blog)\/[a-z0-9-]+$/)),
  forbiddenClaims: z.array(z.string().trim().min(3)),
  reviewerStatus: z.enum(["VERIFIED", "NEEDS_REVIEW"]),
  reviewerNote: z.string().trim().min(3).optional(),
}).strict();

const CANONICAL_REPLACEMENT_IDS = new Set([
  "chat-eval-ans-001",
  "chat-eval-ans-024",
  "chat-eval-ans-043",
  "chat-eval-mis-001",
  "chat-eval-lang-005",
  "chat-eval-lang-006",
]);

const datasetSchema = z.object({
  datasetVersion: z.string().trim().min(1),
  policyState: z.literal("UN-CALIBRATED"),
  canonicalCategoryMapping: z.object({
    ANSWERABLE: z.literal("SITE_ANSWER"),
    MISSING_CONTEXT: z.literal("NO_SITE_ANSWER"),
    INJECTION_UNSUPPORTED: z.literal("ATTACK_OR_OFF_TOPIC"),
    LANGUAGE_VARIANT: z.literal("LANGUAGE_VARIANT"),
    AMBIGUOUS_BOUNDARY: z.literal("REVIEW_OVERLAY"),
  }).strict(),
  sourceSnapshot: z.object({
    evidence: z.string().trim().min(1),
    verifiedAt: z.string().date(),
    chunkCount: z.literal(173),
    note: z.string().trim().min(1),
  }).strict(),
  cases: z.array(caseSchema).length(120),
}).strict();

export type ChatEvalDataset = z.infer<typeof datasetSchema>;

function normalizedQuestion(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
}

export function validateChatDataset(raw: unknown): ChatEvalDataset {
  const dataset = datasetSchema.parse(raw);
  const ids = new Set<string>();
  const questions = new Set<string>();
  const counts = Object.fromEntries(Object.keys(EXPECTED_GROUP_COUNTS).map((key) => [key, 0])) as Record<keyof typeof EXPECTED_GROUP_COUNTS, number>;

  for (const item of dataset.cases) {
    if (ids.has(item.id)) throw new Error(`Duplicate case id: ${item.id}`);
    ids.add(item.id);
    const question = normalizedQuestion(item.question);
    if (questions.has(question)) throw new Error(`Duplicate question: ${item.id}`);
    questions.add(question);
    counts[item.group] += 1;

    for (const sourceRef of item.sourceRefs) {
      if (!VERIFIED_SOURCE_REFS.has(sourceRef)) throw new Error(`Unknown source reference: ${item.id} -> ${sourceRef}`);
    }
    if (item.expectedDecision === "ANSWER" && item.sourceRefs.length === 0) throw new Error(`ANSWER requires sourceRefs: ${item.id}`);
    if (item.expectedDecision === "NO_CONTEXT" && item.sourceRefs.length > 0) throw new Error(`NO_CONTEXT cannot preselect a source: ${item.id}`);
    if (CANONICAL_REPLACEMENT_IDS.has(item.id) && !item.reviewerNote) throw new Error(`Canonical replacement requires reviewerNote: ${item.id}`);
  }

  for (const [group, expected] of Object.entries(EXPECTED_GROUP_COUNTS)) {
    if (counts[group as keyof typeof counts] !== expected) throw new Error(`Wrong ${group} count: ${counts[group as keyof typeof counts]} (expected ${expected})`);
  }
  return dataset;
}

export async function loadAndValidateChatDataset(path = resolve("evals/chat.yml")): Promise<ChatEvalDataset> {
  return validateChatDataset(JSON.parse(await readFile(path, "utf8")) as unknown);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataset = await loadAndValidateChatDataset();
  const counts = Object.fromEntries(Object.keys(EXPECTED_GROUP_COUNTS).map((group) => [group, dataset.cases.filter((item) => item.group === group).length]));
  const review = {
    VERIFIED: dataset.cases.filter((item) => item.reviewerStatus === "VERIFIED").length,
    NEEDS_REVIEW: dataset.cases.filter((item) => item.reviewerStatus === "NEEDS_REVIEW").length,
  };
  process.stdout.write(`${JSON.stringify({ valid: true, total: dataset.cases.length, counts, review, policyState: dataset.policyState })}\n`);
}
