import type { CollectionBeforeChangeHook } from "payload";
import { getUserRole } from "./access";

export const enforceEditorialWorkflow: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const role = getUserRole(req.user);
  const nextStatus = data?._status ?? originalDoc?._status;
  const nextReviewState = data?.reviewState ?? originalDoc?.reviewState;

  if (nextStatus === "published" && nextReviewState !== "approved") {
    throw new Error("Chỉ có thể publish nội dung có reviewState = approved.");
  }

  if (role === "author") {
    if (nextStatus === "published" || originalDoc?._status === "published") {
      throw new Error("Author không có quyền publish hoặc gỡ publish nội dung.");
    }
    if (
      data?.reviewState === "approved" &&
      originalDoc?.reviewState !== "approved"
    ) {
      throw new Error("Author không có quyền duyệt nội dung.");
    }
  }

  return data;
};

