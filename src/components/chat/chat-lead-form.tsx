"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = "IDLE" | "SENDING" | "SAVED" | "SAVED_NOTIFICATION_FAILED" | "ERROR";

export function ChatLeadForm({ conversationId, onClose }: { conversationId: string; onClose(): void }) {
  const [state, setState] = useState<State>("IDLE");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    if (!email && !phone) { setError("Vui lòng nhập email hoặc số điện thoại."); return; }
    setError(""); setState("SENDING");
    try {
      const response = await fetch("/api/chat/lead", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""), email, phone,
          company: String(data.get("company") ?? ""),
          message: String(data.get("message") ?? ""),
          website: String(data.get("website") ?? ""), conversationId,
        }),
      });
      const body = await response.json() as { status?: string };
      if (body.status === "SAVED") { form.reset(); setState("SAVED"); return; }
      if (body.status === "SAVED_NOTIFICATION_FAILED") { form.reset(); setState("SAVED_NOTIFICATION_FAILED"); return; }
      throw new Error("lead failed");
    } catch { setState("ERROR"); }
  };

  if (state === "SAVED" || state === "SAVED_NOTIFICATION_FAILED") return (
    <div className="border-t border-border bg-emerald-50/60 px-4 py-4 sm:px-6" role="status">
      <p className="text-sm font-medium text-navy">{state === "SAVED" ? "Thông tin đã được ghi nhận." : "Thông tin đã được lưu, nhưng email thông báo chưa gửi được."}</p>
      <div className="mt-2 flex gap-3"><Button type="button" size="sm" variant="secondary" onClick={onClose}>Đóng</Button><Button asChild size="sm" variant="ghost"><Link href="/contact">Trang liên hệ</Link></Button></div>
    </div>
  );

  return (
    <form onSubmit={submit} className="border-t border-border bg-blue-50/60 px-4 py-4 sm:px-6" aria-label="Đăng ký tư vấn">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-navy">Đăng ký tư vấn</h3><Button type="button" size="sm" variant="ghost" onClick={onClose}>Đóng</Button></div>
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><Label htmlFor="chat-lead-website">Website</Label><Input id="chat-lead-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="chat-lead-name">Họ và tên *</Label><Input id="chat-lead-name" name="name" required minLength={2} maxLength={100} /></div>
        <div><Label htmlFor="chat-lead-company">Công ty *</Label><Input id="chat-lead-company" name="company" required minLength={2} maxLength={100} /></div>
        <div><Label htmlFor="chat-lead-email">Email</Label><Input id="chat-lead-email" name="email" type="email" maxLength={254} /></div>
        <div><Label htmlFor="chat-lead-phone">Số điện thoại</Label><Input id="chat-lead-phone" name="phone" maxLength={20} /></div>
        <div className="sm:col-span-2"><Label htmlFor="chat-lead-message">Nội dung (không bắt buộc)</Label><Textarea id="chat-lead-message" name="message" maxLength={2000} rows={3} /></div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      {state === "ERROR" && <p className="mt-2 text-sm text-red-600" role="alert">Chưa gửi được thông tin. Bạn có thể thử lại hoặc dùng trang liên hệ.</p>}
      <div className="mt-3 flex flex-wrap gap-3"><Button type="submit" size="sm" disabled={state === "SENDING"}>{state === "SENDING" ? "Đang gửi..." : "Gửi thông tin"}</Button><Button asChild size="sm" variant="ghost"><Link href="/contact">Trang liên hệ</Link></Button></div>
    </form>
  );
}
