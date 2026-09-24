import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCompany } from "@/lib/content";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";
import Script from "next/script";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  return {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://infratek.vn"
  ),
  title: {
    default: `${company.name} — ${company.tagline}`,
    template: `%s | ${company.name}`,
  },
  description: company.missionVi,
  alternates: { canonical: "/" },
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
    url: "/",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${company.name} — ${company.tagline}`,
    description: company.missionVi,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
  },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompany();
  const analyticsId = process.env.NEXT_PUBLIC_GA_ID;
  const organizationId = absoluteUrl("/#organization");

  return (
    <html lang="vi">
      <head>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": organizationId,
              name: company.name,
              url: absoluteUrl("/"),
              email: company.email,
              telephone: company.phoneRaw,
              address: {
                "@type": "PostalAddress",
                streetAddress: company.address,
                addressLocality: company.city,
                addressCountry: "VN",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": absoluteUrl("/#website"),
              url: absoluteUrl("/"),
              name: company.name,
              publisher: { "@id": organizationId },
              inLanguage: "vi-VN",
            },
          ]}
        />
        {analyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${analyticsId}');
              `}
            </Script>
          </>
        )}
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
