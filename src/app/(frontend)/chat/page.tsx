import type { Metadata } from "next";
import Link from "next/link";

import { ChatShell } from "@/components/chat/chat-shell";

export const metadata: Metadata = {
  title: "Trợ lý AI beta",
  description: "Trợ lý beta giúp tìm hiểu giải pháp, case study và quy trình triển khai của Infratek Software.",
  alternates: { canonical: "/chat" },
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <section className="relative min-h-screen overflow-hidden pb-16 pt-28 sm:pt-32">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="grid-pattern absolute inset-0 opacity-40" />
      <div className="container-main relative z-10">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <span className="section-label">Chatbot beta</span>
          <h1 className="heading-lg text-balance">Tìm hiểu giải pháp cùng trợ lý Infratek</h1>
          <p className="body-md mt-4 text-balance">
            Hỏi về giải pháp, case study và quy trình triển khai đã được công bố trên website. Với nhu cầu cụ thể, bạn có thể <Link href="/contact" className="font-semibold text-primary hover:underline">liên hệ trực tiếp đội ngũ Infratek</Link>.
          </p>
        </div>
        <ChatShell turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
        <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-text-secondary">
          Bản beta có thể từ chối câu hỏi khi chưa đủ nguồn. Hệ thống có che một số định dạng email và số điện thoại,
          nhưng không bảo đảm loại bỏ mọi thông tin cá nhân hoặc dữ liệu nhạy cảm.
        </p>
      </div>
    </section>
  );
}
