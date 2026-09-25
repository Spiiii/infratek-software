import nextEnv from "@next/env";
import { getPayload } from "payload";
import config from "../payload.config";

nextEnv.loadEnvConfig(process.cwd());

const payload = await getPayload({ config });
const suffix = Date.now();
const password = `Phase3-${suffix}-Aa!`;
const adminEmail = `phase3-admin-${suffix}@example.test`;
const reviewerEmail = `phase3-reviewer-${suffix}@example.test`;
const authorEmail = `phase3-author-${suffix}@example.test`;
const slug = `phase3-workflow-${suffix}`;
const createdUserIds: number[] = [];
let caseStudyId: number | undefined;

const expectRejected = async (label: string, operation: () => Promise<unknown>) => {
  try {
    await operation();
    throw new Error(`${label}: unexpectedly allowed`);
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("unexpectedly allowed")) throw error;
    console.log(`PASS ${label}`);
  }
};

try {
  for (const [email, role] of [
    [adminEmail, "admin"],
    [reviewerEmail, "reviewer"],
    [authorEmail, "author"],
  ] as const) {
    const user = await payload.create({
      collection: "users",
      data: { email, password, role },
      overrideAccess: true,
    });
    createdUserIds.push(user.id);
  }

  const [reviewer, author] = await Promise.all(
    createdUserIds.slice(1).map((id) =>
      payload.findByID({ collection: "users", id, overrideAccess: true }),
    ),
  );

  await expectRejected("Author cannot unlock admin", () =>
    payload.unlock({
      collection: "users",
      data: { email: adminEmail, password },
      overrideAccess: false,
      req: { user: author },
    }),
  );
  await expectRejected("Reviewer cannot unlock admin", () =>
    payload.unlock({
      collection: "users",
      data: { email: adminEmail, password },
      overrideAccess: false,
      req: { user: reviewer },
    }),
  );

  const draft = await payload.create({
    collection: "case-studies",
    data: {
      title: "Phase 3 workflow verification",
      slug,
      industry: "Testing",
      year: "2026",
      clientName: "Internal",
      clientDisplay: "anonymized",
      dataClassification: "illustrative",
      tldr: "Temporary workflow verification record.",
      challenge: "Verify access and editorial workflow.",
      solution: "Exercise Local API with user context and access enabled.",
      reviewState: "editing",
      _status: "draft",
    },
    overrideAccess: false,
    user: author,
  });
  caseStudyId = draft.id;
  console.log("PASS Author can create draft");

  await expectRejected("Author cannot approve or publish", () =>
    payload.update({
      collection: "case-studies",
      id: draft.id,
      data: { reviewState: "approved", _status: "published" },
      overrideAccess: false,
      user: author,
    }),
  );

  const published = await payload.update({
    collection: "case-studies",
    id: draft.id,
    data: { reviewState: "approved", _status: "published" },
    overrideAccess: false,
    user: reviewer,
  });
  if (published.reviewState !== "approved" || published._status !== "published") {
    throw new Error("Reviewer publish did not persist independent workflow states");
  }
  console.log("PASS Reviewer can approve and publish");

  const publicPublished = await payload.find({
    collection: "case-studies",
    where: { slug: { equals: slug } },
    overrideAccess: false,
  });
  if (publicPublished.totalDocs !== 1) throw new Error("Published case is not public");
  console.log("PASS Public query sees published case");

  await payload.update({
    collection: "case-studies",
    id: draft.id,
    data: { _status: "draft" },
    overrideAccess: false,
    user: reviewer,
  });
  const publicDraft = await payload.find({
    collection: "case-studies",
    where: { slug: { equals: slug } },
    overrideAccess: false,
  });
  if (publicDraft.totalDocs !== 0) throw new Error("Draft case leaked through public query");
  console.log("PASS Reviewer can unpublish; public query excludes draft");

  await expectRejected("Media requires alt text", () =>
    {
      const image = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      );
      return payload.create({
      collection: "media",
      data: {},
      file: {
        data: image,
        mimetype: "image/png",
        name: `phase3-${suffix}.png`,
        size: image.length,
      },
      overrideAccess: false,
      user: author,
      } as never);
    },
  );

  console.log("Phase 3 workflow verification passed.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (caseStudyId) {
    await payload.delete({ collection: "case-studies", id: caseStudyId, overrideAccess: true });
  }
  for (const id of createdUserIds.reverse()) {
    await payload.delete({ collection: "users", id, overrideAccess: true });
  }
  process.exit(process.exitCode ?? 0);
}
