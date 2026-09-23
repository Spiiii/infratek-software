import type { Metadata } from "next";
import { company } from "@/data/company";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://infratek.vn"
).replace(/\/$/, "");

export const defaultOgImage = {
  url: "/og-image",
  width: 1200,
  height: 630,
  alt: `${company.name} — ${company.tagline}`,
};

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteUrl}/`).toString();
}

export function structuredDate(value: string) {
  return value.includes("T") ? value : `${value}T00:00:00+07:00`;
}

export function createPageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      locale: "vi_VN",
      siteName: company.name,
      title,
      description,
      url,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage.url],
    },
  };
}
