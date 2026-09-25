import type { CollectionConfig } from "payload";
import { authenticated, publishedOrAuthenticated, reviewerOrAdmin } from "../cms/access";
import { reviewStateField, sourceTrackingFields } from "../cms/fields";
import { enforceEditorialWorkflow } from "../cms/workflow";

export const CaseStudies: CollectionConfig = {
  slug: "case-studies",
  admin: {
    useAsTitle: "title",
    preview: ({ slug }) => `/api/preview?path=/case-studies/${slug}`,
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
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "industry", type: "text", required: true },
    { name: "year", type: "text", required: true },
    { name: "clientName", type: "text", required: true },
    {
      name: "clientDisplay",
      type: "select",
      defaultValue: "anonymized",
      required: true,
      options: ["named", "anonymized"],
    },
    {
      name: "dataClassification",
      type: "select",
      defaultValue: "illustrative",
      required: true,
      options: ["verified", "anonymized", "illustrative"],
    },
    { name: "tldr", type: "textarea", required: true },
    { name: "challenge", type: "textarea", required: true },
    { name: "solution", type: "textarea", required: true },
    {
      name: "architecture",
      type: "array",
      fields: [
        { name: "nodeId", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "nodeType", type: "select", required: true, options: ["input", "process", "storage", "output", "ai"] },
        { name: "description", type: "textarea", required: true },
      ],
    },
    {
      name: "timeline",
      type: "array",
      fields: [
        { name: "step", type: "number", required: true },
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
    { name: "teamSize", type: "number" },
    {
      name: "results",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
    {
      name: "metrics",
      type: "array",
      fields: [
        { name: "value", type: "number", required: true },
        { name: "unit", type: "text", required: true },
        { name: "prefix", type: "text" },
        { name: "label", type: "text", required: true },
        { name: "howMeasured", type: "textarea" },
        { name: "measuredAt", type: "date" },
      ],
    },
    {
      name: "media",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
    },
    { name: "solutions", type: "relationship", relationTo: "solutions", hasMany: true },
    { name: "technologies", type: "relationship", relationTo: "technologies", hasMany: true },
    { name: "techStack", type: "text", hasMany: true },
    { name: "featured", type: "checkbox", defaultValue: false },
    { name: "coverGradient", type: "text" },
    { name: "seoTitle", type: "text" },
    { name: "seoDescription", type: "textarea" },
    { name: "publishedAt", type: "date" },
    reviewStateField,
    ...sourceTrackingFields,
  ],
};

