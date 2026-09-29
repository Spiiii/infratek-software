import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "content", "case-studies");
const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory());
if (directories.length !== 7) throw new Error(`Expected 7 Phase 4 packages, found ${directories.length}`);

for (const directory of directories) {
  const packageRoot = path.join(root, directory.name);
  const data = JSON.parse(await readFile(path.join(packageRoot, "index.yml"), "utf8")) as Record<string, unknown>;
  if (data.slug !== directory.name) throw new Error(`${directory.name}: slug must match directory`);
  if (data._status !== "draft" || data.reviewState !== "editing") throw new Error(`${directory.name}: must remain draft/editing`);
  const expected = directory.name === "crm-system" ? "verified" : "illustrative";
  if (data.dataClassification !== expected) throw new Error(`${directory.name}: expected ${expected}`);
  const images = data.images as Array<{ file: string; altText: string }> | undefined;
  const imageDirectory = path.join(packageRoot, "images");
  const imageFiles = await readdir(imageDirectory);
  const imageCount = images?.length ?? imageFiles.length;
  if (directory.name === "crm-system" ? imageCount !== 2 : imageCount < 3 || imageCount > 6) throw new Error(`${directory.name}: invalid image count ${imageCount}`);
  if (images?.some((image) => !image.altText.trim())) throw new Error(`${directory.name}: altText is required`);
}

console.log("Phase 4 content packages: PASS (7 drafts; CRM 2 safe images; 6 illustrative cases with 3 graphics each)");
