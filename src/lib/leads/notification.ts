import { Resend } from "resend";

export type LeadNotification = { name: string; email?: string; phone?: string; company: string; message?: string };
export interface LeadNotifier { notify(lead: LeadNotification): Promise<"SENT" | "FAILED">; }

export function createResendLeadNotifier(environment: Record<string, string | undefined> = process.env): LeadNotifier {
  return {
    async notify(lead) {
      const key = environment.RESEND_API_KEY?.trim();
      if (!key) return "FAILED";
      try {
        const resend = new Resend(key);
        const { error } = await resend.emails.send({
          from: "Website Infratek <admin@infratek.vn>",
          to: [environment.CONTACT_RECIPIENT || "trong.ngo@infratek.vn"],
          ...(lead.email ? { replyTo: lead.email } : {}),
          subject: `[Chatbot] Lead mới từ ${lead.name}`,
          text: [
            `Họ tên: ${lead.name}`,
            `Email: ${lead.email || "Không cung cấp"}`,
            `Số điện thoại: ${lead.phone || "Không cung cấp"}`,
            `Công ty: ${lead.company}`,
            "",
            "Nội dung:",
            lead.message || "Không cung cấp",
          ].join("\n"),
        });
        return error ? "FAILED" : "SENT";
      } catch { return "FAILED"; }
    },
  };
}
