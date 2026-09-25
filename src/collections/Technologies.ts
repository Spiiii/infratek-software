import type { CollectionConfig } from "payload";
import { authenticated, reviewerOrAdmin } from "../cms/access";

export const Technologies: CollectionConfig = {
  slug: "technologies",
  admin: { useAsTitle: "name" },
  access: { read: () => true, create: authenticated, update: authenticated, delete: reviewerOrAdmin },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "category", type: "select", options: ["ai", "frontend", "backend", "cloud", "data", "devops"] },
    { name: "description", type: "textarea" },
  ],
};

