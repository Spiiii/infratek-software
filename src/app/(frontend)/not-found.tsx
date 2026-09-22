// File: src/app/not-found.tsx
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold gradient-text">404</p>
        <h1 className="mt-4 text-2xl font-bold text-navy">
          Trang không tồn tại
        </h1>
        <p className="mt-2 text-text-secondary">
          Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">
              <ArrowLeft className="h-4 w-4" />
              Liên hệ
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}