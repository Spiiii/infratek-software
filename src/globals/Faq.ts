import type { GlobalConfig } from "payload";
import { authenticated } from "../cms/access";

export const Faq: GlobalConfig = {
  slug: "faq",
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: "items",
      type: "array",
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
  ],
};

