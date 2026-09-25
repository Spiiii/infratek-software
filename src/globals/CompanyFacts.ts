import type { GlobalConfig } from "payload";
import { authenticated } from "../cms/access";

export const CompanyFacts: GlobalConfig = {
  slug: "company-facts",
  access: { read: () => true, update: authenticated },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "tagline", type: "text" },
    { name: "missionVi", type: "textarea" },
    { name: "director", type: "text" },
    { name: "email", type: "email" },
    { name: "phone", type: "text" },
    { name: "address", type: "textarea" },
  ],
};

