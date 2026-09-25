import type { Access } from "payload";

export type UserRole = "admin" | "reviewer" | "author";

export const getUserRole = (user: unknown): UserRole | undefined => {
  if (!user || typeof user !== "object" || !("role" in user)) return undefined;
  const role = (user as { role?: unknown }).role;
  return role === "admin" || role === "reviewer" || role === "author"
    ? role
    : undefined;
};

export const isAdmin = (user: unknown) => getUserRole(user) === "admin";
export const isReviewer = (user: unknown) => getUserRole(user) === "reviewer";
export const isEditorialUser = (user: unknown) => Boolean(getUserRole(user));

export const authenticated: Access = ({ req }) => isEditorialUser(req.user);
export const reviewerOrAdmin: Access = ({ req }) =>
  isReviewer(req.user) || isAdmin(req.user);
export const adminOnly: Access = ({ req }) => isAdmin(req.user);

export const publishedOrAuthenticated: Access = ({ req }) => {
  if (isEditorialUser(req.user)) return true;
  return { _status: { equals: "published" } };
};

