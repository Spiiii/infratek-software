"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import {
  contactFormSchema,
  type ContactFormValues,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormValues) => {
    setLoading(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          website,
        }),
        headers: {
           "Content-Type": "application/json",
           Accept: "application/json", 
          },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể gửi tin nhắn.");
      }

      reset();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Không thể gửi tin nhắn. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white/80 p-12 text-center shadow-elevated backdrop-blur-xl"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-navy">
          Gửi thành công!
        </h3>
        <p className="mb-6 text-sm text-text-secondary">
          Cảm ơn bạn đã liên hệ. Đội ngũ Infratek sẽ phản hồi trong vòng 24 giờ.
        </p>
        <Button variant="secondary" onClick={() => setSubmitted(false)}>
          Gửi tin nhắn khác
        </Button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8"
    >
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <h3 className="mb-6 text-xl font-bold text-navy">Gửi tin nhắn</h3>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Họ và tên *</Label>
          <Input
            id="name"
            className="mt-1.5"
            placeholder="Nguyễn Văn A"
            {...register("name")}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            placeholder="email@company.com"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Số điện thoại *</Label>
          <Input
            id="phone"
            className="mt-1.5"
            placeholder="0901 234 567"
            {...register("phone")}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="company">Công ty *</Label>
          <Input
            id="company"
            className="mt-1.5"
            placeholder="Tên công ty"
            {...register("company")}
          />
          {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="position">Chức vụ *</Label>
          <Input
            id="position"
            className="mt-1.5"
            placeholder="CEO, CTO, IT Manager..."
            {...register("position")}
          />
          {errors.position && <p className="mt-1 text-xs text-red-500">{errors.position.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="message">Tin nhắn *</Label>
          <Textarea
            id="message"
            className="mt-1.5"
            placeholder="Mô tả nhu cầu của bạn về AI, phần mềm hoặc chuyển đổi số..."
            rows={5}
            {...register("message")}
          />
          {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
        </div>
      </div>

      {submitError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {submitError}
        </p>
      )}

      <Button type="submit" className="mt-6 w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang gửi...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Gửi tin nhắn
          </>
        )}
      </Button>
    </form>
  );
}
