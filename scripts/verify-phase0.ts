import nextEnv from "@next/env";
import { getPayload } from "payload";

nextEnv.loadEnvConfig(process.cwd());
const { default: config } = await import("../payload.config");
const payload = await getPayload({ config });

const slug = `phase-0-check-${Date.now()}`;
const created = await payload.create({
  collection: "spike-pages",
  data: {
    title: "Phase 0 CRUD check",
    slug,
    summary: "Created by the Phase 0 verification script.",
  },
});

const read = await payload.findByID({
  collection: "spike-pages",
  id: created.id,
});

if (read.slug !== slug) throw new Error("CRUD read check failed");

const updated = await payload.update({
  collection: "spike-pages",
  id: created.id,
  data: { title: "Phase 0 CRUD check passed" },
});

if (updated.title !== "Phase 0 CRUD check passed") {
  throw new Error("CRUD update check failed");
}

await payload.delete({ collection: "spike-pages", id: created.id });
const remaining = await payload.count({
  collection: "spike-pages",
  where: { slug: { equals: slug } },
});

if (remaining.totalDocs !== 0) throw new Error("CRUD delete check failed");

console.log("Phase 0 Neon CRUD verification passed.");
process.exit(0);
