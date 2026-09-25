import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated, reviewerOrAdmin } from "../cms/access";
import { contentBlockField, reviewStateField, sourceTrackingFields } from "../cms/fields";
import { enforceEditorialWorkflow } from "../cms/workflow";

export const Solutions: CollectionConfig = {
  slug: "solutions",
  admin: {
    useAsTitle: "title",
    preview: ({ slug }) => `/api/preview?path=/solutions/${slug}`,
  },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: reviewerOrAdmin,
  },
  versions: { drafts: { validate: false } },
  hooks: { beforeChange: [enforceEditorialWorkflow] },
  fields: [
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "title", type: "text", required: true },
    { name: "shortTitle", type: "text", required: true },
    { name: "description", type: "textarea", required: true },
    { name: "seoTitle", type: "text", required: true },
    { name: "seoDescription", type: "textarea", required: true },
    { name: "icon", type: "text", required: true },
    { name: "color", type: "text", required: true },
    { name: "quickAnswer", type: "textarea", required: true },
    { name: "needSignals", type: "text", hasMany: true, required: true },
    contentBlockField("deliverables", "Sản phẩm bàn giao"),
    {
      name: "process",
      type: "array",
      required: true,
      fields: [
        { name: "step", type: "number", required: true },
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
    { name: "outcomes", type: "text", hasMany: true, required: true },
    {
      name: "relatedCaseStudies",
      type: "relationship",
      relationTo: "case-studies",
      hasMany: true,
    },
    contentBlockField("audienceFit", "Đối tượng phù hợp/chưa phù hợp"),
    contentBlockField("timelineAndInvestment", "Thời gian và đầu tư"),
    contentBlockField("faq", "FAQ"),
    { name: "techStack", type: "text", hasMany: true },
    reviewStateField,
    ...sourceTrackingFields,
  ],
};

