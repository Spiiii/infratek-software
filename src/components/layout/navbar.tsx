// File: src/components/layout/navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNav } from "@/data/navigation";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-text-secondary hover:text-navy"
                )}
              >
                {item.title}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
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
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex flex-col rounded-xl px-4 py-3 transition-colors",
                        isActive
                          ? "bg-primary/5 text-primary"
                          : "text-navy hover:bg-surface-light"
                      )}
                    >
                      <span className="text-sm font-semibold">{item.title}</span>
                      {item.description && (
                        <span className="mt-0.5 text-xs text-text-secondary">
                          {item.description}
                        </span>
                      )}
                    </Link>
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
