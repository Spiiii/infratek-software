import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated, reviewerOrAdmin } from "../cms/access";
import { reviewStateField } from "../cms/fields";
import { enforceEditorialWorkflow } from "../cms/workflow";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: { useAsTitle: "title" },
  access: { read: publishedOrAuthenticated, create: authenticated, update: authenticated, delete: reviewerOrAdmin },
  versions: { drafts: { validate: false } },
  hooks: { beforeChange: [enforceEditorialWorkflow] },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "summary", type: "textarea" },
    { name: "content", type: "richText" },
    { name: "seoTitle", type: "text" },
    { name: "seoDescription", type: "textarea" },
    reviewStateField,
  ],
};

