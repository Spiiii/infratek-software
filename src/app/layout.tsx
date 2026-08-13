import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { company } from "@/data/company";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://infratek.vn"
  ),
  title: {
    default: `${company.name} — ${company.tagline}`,
    template: `%s | ${company.name}`,
  },
  description: company.missionVi,
  keywords: [
    "AI",
    "Artificial Intelligence",
    "Enterprise AI",
    "OCR",
    "Computer Vision",
    "Software Development",
    "IT Outsourcing",
    "Digital Transformation",
    "Infratek Software",
    "Vietnam AI",
  ],
  authors: [{ name: company.director }],
  creator: company.name,
  icons: {                 
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: company.name,
    title: `${company.name} — ${company.tagline}`,
    description: company.missionVi,
  },
  twitter: {
    card: "summary_large_image",
    title: `${company.name} — ${company.tagline}`,
    description: company.missionVi,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        {/*Google Analytics script */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SMCJS2288K"
          strategy="afterInteractive" // chỉ chạy sau khi trang render
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SMCJS2288K');
          `}
        </Script>
      </head>
      <body className="min-h-screen font-sans">
        <TooltipProvider delayDuration={200}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </TooltipProvider>
      </body>
    </html>
  );
}