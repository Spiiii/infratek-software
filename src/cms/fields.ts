import type { Field } from "payload";

export const reviewStateField: Field = {
  name: "reviewState",
  type: "select",
  defaultValue: "editing",
  required: true,
  options: [
    { label: "Đang biên tập", value: "editing" },
    { label: "Chờ duyệt", value: "in_review" },
    { label: "Đã duyệt", value: "approved" },
  ],
};

export const contentBlockField = (name: string, label: string): Field => ({
  name,
  label,
  type: "group",
  fields: [
    {
      name: "status",
      type: "select",
      defaultValue: "placeholder",
      required: true,
      options: ["verified", "placeholder"],
    },
    { name: "items", type: "text", hasMany: true },
    { name: "note", type: "textarea" },
  ],
});

export const sourceTrackingFields: Field[] = [
  { name: "sourceHash", type: "text", admin: { readOnly: true } },
  { name: "seededContentHash", type: "text", admin: { readOnly: true } },
  { name: "sourceKey", type: "text", admin: { readOnly: true } },
];
