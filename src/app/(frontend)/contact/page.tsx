// File: src/app/contact/page.tsx
import type { Metadata } from "next";
import { Mail, Phone, MapPin, User } from "lucide-react";
import { getCompany } from "@/lib/content";
import { ContactForm } from "@/components/contact/contact-form";
import { FadeIn } from "@/components/shared/fade-in";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  return createPageMetadata({
    title: "Liên hệ",
    description: `Liên hệ ${company.name} — ${company.director}, ${company.email}, ${company.phone}. ${company.fullAddress}`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const company = await getCompany();
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-32">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="container-main relative z-10">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-label mb-4">Contact</span>
              <h1 className="heading-lg text-balance">
                Hãy để chúng tôi{" "}
                <span className="gradient-text">đồng hành cùng bạn</span>
              </h1>
              <p className="body-lg mt-4 text-balance">
                Sẵn sàng thảo luận về thách thức AI và chuyển đổi số của doanh
                nghiệp. Đội ngũ Infratek sẽ phản hồi trong 24 giờ.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-main">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Contact info */}
            <FadeIn className="lg:col-span-2">
              <div className="space-y-8">
                <div>
                  <h2 className="mb-6 text-xl font-bold text-navy">
                    Thông tin liên hệ
                  </h2>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-secondary">
                          Director
                        </p>
                        <p className="text-base font-semibold text-navy">
                          {company.director}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-start gap-4 transition-colors hover:opacity-80"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-secondary">
                          Email
                        </p>
                        <p className="text-base font-semibold text-navy">
                          {company.email}
                        </p>
                      </div>
                    </a>

                    <a
                      href={`tel:${company.phoneRaw}`}
                      className="flex items-start gap-4 transition-colors hover:opacity-80"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-secondary">
                          Điện thoại
                        </p>
                        <p className="text-base font-semibold text-navy">
                          {company.phone}
                        </p>
                      </div>
                    </a>

                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text-secondary">
                          Địa chỉ
                        </p>
                        <p className="text-base font-semibold text-navy">
                          {company.address}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {company.ward}, {company.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="overflow-hidden rounded-2xl border border-border shadow-soft">
                  <iframe
                    src="https://maps.google.com/maps?q=31-33+Phan+Huy+Ich+Tan+Son+Ho+Chi+Minh&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="280"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Infratek Software Location"
                    className="grayscale-[30%] transition-all hover:grayscale-0"
                  />
                </div>
              </div>
            </FadeIn>

            {/* Form */}
            <FadeIn delay={0.15} className="lg:col-span-3">
              <ContactForm />
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
