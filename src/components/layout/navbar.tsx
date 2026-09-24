// File: src/components/layout/navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNav } from "@/data/navigation";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-white/80 shadow-soft backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <nav className="container-main flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-sm font-bold text-white">IFTS</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-0 blur-lg transition-opacity group-hover:opacity-50" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-navy">
              Infratek
            </span>
            <span className="-mt-0.5 text-[10px] font-medium tracking-wider text-text-secondary uppercase">
              Software
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return <div key={item.href} className="group relative">
              <Link href={item.href} className={cn("relative flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors", isActive ? "text-primary" : "text-text-secondary hover:text-navy")}>
                {item.title}{item.children && <ChevronDown className="h-3.5 w-3.5" />}
                {isActive && <motion.div layoutId="nav-indicator" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-primary" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              </Link>
              {item.children && <div className="invisible absolute left-0 top-full z-50 min-w-64 translate-y-2 rounded-xl border border-border bg-white p-2 opacity-0 shadow-elevated transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">{item.children.map((child) => <Link key={child.href} href={child.href} className="block rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-light hover:text-navy">{child.title}</Link>)}</div>}
            </div>;
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild size="sm">
            <Link href="/contact">
              Tư vấn miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy transition-colors hover:bg-primary/5 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-b border-border bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-main flex flex-col gap-1 py-4">
              {mainNav.map((item, i) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div
                      className={cn(
                        "rounded-xl transition-colors",
                        isActive
                          ? "bg-primary/5 text-primary"
                          : "text-navy hover:bg-surface-light"
                      )}
                    >
                      <div className="flex items-center gap-1 px-4 py-3"><Link href={item.href} onClick={() => setMobileOpen(false)} className="flex-1"><span className="text-sm font-semibold">{item.title}</span></Link>{item.children && <button type="button" aria-label={`Mở menu ${item.title}`} aria-expanded={mobileGroup === item.href} onClick={() => setMobileGroup(mobileGroup === item.href ? null : item.href)} className="p-2"><ChevronDown className={cn("h-4 w-4 transition-transform", mobileGroup === item.href && "rotate-180")} /></button>}</div>
                      {item.description && !item.children && (
                        <span className="mt-0.5 text-xs text-text-secondary">
                          {item.description}
                        </span>
                      )}
                      {item.children && mobileGroup === item.href && <div className="border-t border-border/60 px-3 py-2">{item.children.map((child) => <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-white">{child.title}</Link>)}</div>}
                    </div>
                  </motion.div>
                );
              })}
              <div className="mt-2 px-4 pb-2">
                <Button asChild className="w-full">
                  <Link href="/contact">
                    Tư vấn miễn phí
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
