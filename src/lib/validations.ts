// File: src/lib/validations.ts
import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(100, "Họ tên không quá 100 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z
    .string()
    .min(10, "Số điện thoại phải có ít nhất 10 số")
    .max(15, "Số điện thoại không hợp lệ")
    .regex(/^[0-9+\-\s()]+$/, "Số điện thoại không hợp lệ"),
  company: z
    .string()
    .min(2, "Tên công ty phải có ít nhất 2 ký tự")
    .max(100, "Tên công ty không quá 100 ký tự"),
  position: z
    .string()
    .min(2, "Chức vụ phải có ít nhất 2 ký tự")
    .max(100, "Chức vụ không quá 100 ký tự"),
  message: z
    .string()
    .min(10, "Tin nhắn phải có ít nhất 10 ký tự")
    .max(2000, "Tin nhắn không quá 2000 ký tự"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const chatLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(8).max(20).regex(/^[0-9+\-\s()]+$/).optional().or(z.literal("")),
  company: z.string().trim().min(2).max(100),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  conversationId: z.string().uuid().optional(),
  website: z.string().max(200).optional(),
}).strict().refine((value) => Boolean(value.email || value.phone), {
  message: "Cần cung cấp email hoặc số điện thoại",
  path: ["email"],
});

export type ChatLeadValues = z.infer<typeof chatLeadSchema>;
