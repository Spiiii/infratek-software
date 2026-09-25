import type { CollectionConfig } from "payload";
import { authenticated, reviewerOrAdmin } from "../cms/access";

export const Authors: CollectionConfig = {
  slug: "authors",
  admin: { useAsTitle: "name" },
  access: { read: () => true, create: authenticated, update: authenticated, delete: reviewerOrAdmin },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "role", type: "text", required: true },
    { name: "avatar", type: "upload", relationTo: "media" },
  ],
};

