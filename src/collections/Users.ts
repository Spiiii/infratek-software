import type { CollectionConfig } from "payload";

const isAdmin = (user: unknown): boolean =>
  Boolean(
    user &&
      typeof user === "object" &&
      "role" in user &&
      (user as { role?: string }).role === "admin"
  );

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
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
    unlock: ({ req, id }) =>
      Boolean(
        req.user &&
          (isAdmin(req.user) || String(req.user.id) === String(id))
      ),
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
      defaultValue: "editor",
      options: ["admin", "editor"],
      required: true,
    },
  ],
};
