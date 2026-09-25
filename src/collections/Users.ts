import type { CollectionConfig } from "payload";
import { isAdmin } from "../cms/access";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    },
  },
  access: {
    read: ({ req }) => isAdmin(req.user),
    create: async ({ req }) => {
      if (isAdmin(req.user)) return true;
      const { totalDocs } = await req.payload.count({ collection: "users" });
      return totalDocs === 0;
    },
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
    unlock: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const { totalDocs } = await req.payload.count({ collection: "users" });
        return totalDocs === 0 ? { ...data, role: "admin" } : data;
      },
    ],
  },
  fields: [
    {
      name: "role",
      type: "select",
      defaultValue: "author",
      options: ["admin", "reviewer", "author"],
      required: true,
    },
  ],
};
