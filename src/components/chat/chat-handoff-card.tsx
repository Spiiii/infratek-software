import Link from "next/link";

import type { PublicSalesContact } from "@/lib/chat/route/contracts";

export function ChatHandoffCard({ contact }: { contact: PublicSalesContact }) {
  return (
    <aside className="mt-4 rounded-xl border border-border bg-surface-light p-4" aria-label="Thông tin tư vấn trực tiếp">
      <p className="font-semibold text-navy">{contact.name}</p>
      <p className="text-xs text-text-secondary">{contact.role}</p>
      <dl className="mt-3 grid gap-1 text-sm">
        <div><dt className="inline font-medium">Điện thoại: </dt><dd className="inline"><a className="text-primary hover:underline" href="tel:0901671671">{contact.phone}</a></dd></div>
        <div><dt className="inline font-medium">Email: </dt><dd className="inline"><a className="text-primary hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>
        <div><dt className="inline font-medium">Zalo: </dt><dd className="inline">{contact.zalo}</dd></div>
      </dl>
      <Link href={contact.route} className="mt-3 inline-flex font-semibold text-primary underline-offset-4 hover:underline">
        Trao đổi về dự án
      </Link>
    </aside>
  );
}
