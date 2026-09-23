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
