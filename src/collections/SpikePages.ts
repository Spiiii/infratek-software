import type { CollectionConfig } from "payload";

export const SpikePages: CollectionConfig = {
  slug: "spike-pages",
  admin: {
    useAsTitle: "title",
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "summary", type: "textarea" },
    { name: "content", type: "richText" },
  ],
};
