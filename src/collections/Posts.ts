import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated, reviewerOrAdmin } from "../cms/access";
import { reviewStateField, sourceTrackingFields } from "../cms/fields";
import { enforceEditorialWorkflow } from "../cms/workflow";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    preview: ({ slug }) => `/api/preview?path=/blog/${slug}`,
  },
  access: { read: publishedOrAuthenticated, create: authenticated, update: authenticated, delete: reviewerOrAdmin },
  versions: { drafts: { validate: false } },
  hooks: { beforeChange: [enforceEditorialWorkflow] },
  fields: [
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "title", type: "text", required: true },
    { name: "excerpt", type: "textarea", required: true },
    { name: "content", type: "textarea", required: true },
    { name: "category", type: "text", required: true },
    { name: "tags", type: "text", hasMany: true },
    { name: "author", type: "relationship", relationTo: "authors", required: true },
    { name: "publishedAt", type: "date", required: true },
    { name: "readingTime", type: "number", required: true },
    { name: "featured", type: "checkbox", defaultValue: false },
    { name: "coverImage", type: "upload", relationTo: "media" },
    { name: "seoTitle", type: "text" },
    { name: "seoDescription", type: "textarea" },
    reviewStateField,
    ...sourceTrackingFields,
  ],
};

