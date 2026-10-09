import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluateRecordedResults, formatHumanReport } from "./offline-evaluator.ts";
import { loadAndValidateChatDataset } from "./validate-chat-dataset.ts";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath = process.argv[2];
if (!inputPath || inputPath.startsWith("--")) {
  throw new Error("Usage: npm run eval:chat:offline -- <recorded-results.json> [--json output.json] [--report output.md]");
}

const dataset = await loadAndValidateChatDataset();
const recorded = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
const summary = evaluateRecordedResults(dataset, recorded);
const humanReport = formatHumanReport(summary);
const jsonPath = option("--json");
const reportPath = option("--report");

if (jsonPath) await writeFile(resolve(jsonPath), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (reportPath) await writeFile(resolve(reportPath), humanReport, "utf8");

process.stdout.write(`${JSON.stringify(summary)}\n\n${humanReport}`);
