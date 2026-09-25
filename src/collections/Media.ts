import type { CollectionConfig } from "payload";
import { authenticated } from "../cms/access";

export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "altText" },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    mimeTypes: ["image/*"],
  },
  fields: [
    { name: "altText", type: "text", required: true },
    { name: "caption", type: "textarea" },
  ],
};

