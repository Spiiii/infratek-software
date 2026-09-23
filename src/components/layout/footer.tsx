// File: src/components/layout/footer.tsx
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { company } from "@/data/company";
import { footerNav } from "@/data/navigation";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-navy text-white">
      <div className="container-main">
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-3 lg:py-20">
          <div className="lg:col-span-1">
            <Link href="/" className="mb-6 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                <span className="text-sm font-bold text-white">IFTS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight">Infratek</span>
                <span className="-mt-0.5 text-[10px] font-medium tracking-wider text-white/50 uppercase">
                  Software
                </span>
              </div>
            </Link>
            <p className="mb-6 text-sm leading-relaxed text-white/60">
              {company.tagline}. {company.missionVi}
            </p>
            <div className="space-y-3">
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-2.5 text-sm text-white/60 transition-colors hover:text-primary-accent"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {company.email}
              </a>
              <a
                href={`tel:${company.phoneRaw}`}
                className="flex items-center gap-2.5 text-sm text-white/60 transition-colors hover:text-primary-accent"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {company.phone}
              </a>
              <div className="flex items-start gap-2.5 text-sm text-white/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{company.fullAddress}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white/90 uppercase">
              Giải pháp
            </h4>
            <ul className="space-y-3">
              {footerNav.solutions.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    {item.title}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white/90 uppercase">
              Công ty
            </h4>
            <ul className="space-y-3">
              {footerNav.company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    {item.title}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © {year} {company.name}. All rights reserved.
          </p>
          <p className="text-xs text-white/40">
            Director: {company.director}
          </p>
        </div>
      </div>
    </footer>
  );
}
