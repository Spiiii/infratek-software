// File: src/data/navigation.ts
import type { NavItem } from "@/types";

export const mainNav: NavItem[] = [
  {
    title: "Trang chủ",
    href: "/",
  },
  {
    title: "Giải pháp",
    href: "/solutions",
    description: "AI Consulting, Software Development, IT Outsourcing & Digital Transformation",
    children: [
      { title: "AI Consulting", href: "/solutions/ai-consulting" },
      { title: "Software Development", href: "/solutions/software-development" },
      { title: "IT Outsourcing", href: "/solutions/it-outsourcing" },
      { title: "Digital Transformation", href: "/solutions/digital-transformation" },
    ],
  },
  {
    title: "Công cụ",
    href: "/tools/roi-calculator",
    description: "ROI Calculator và AI Readiness Assessment",
    children: [
      { title: "ROI Calculator", href: "/tools/roi-calculator" },
      { title: "AI Readiness", href: "/tools/ai-readiness" },
    ],
  },
  {
    title: "Case Studies",
    href: "/case-studies",
    description: "Các dự án AI thực tế đã triển khai thành công",
  },
  {
    title: "Blog",
    href: "/blog",
    description: "Kiến thức AI, Computer Vision, LLM và Digital Transformation",
  },
  {
    title: "Liên hệ",
    href: "/contact",
    description: "Kết nối với đội ngũ Infratek Software",
  },
];

export const footerNav = {
  solutions: [
    { title: "AI Consulting", href: "/solutions/ai-consulting" },
    { title: "Software Development", href: "/solutions/software-development" },
    { title: "IT Outsourcing", href: "/solutions/it-outsourcing" },
    { title: "Digital Transformation", href: "/solutions/digital-transformation" },
  ],
  company: [
    { title: "Về chúng tôi", href: "/about" },
    { title: "Đội ngũ", href: "/about/team" },
    { title: "Case Studies", href: "/case-studies" },
    { title: "Blog", href: "/blog" },
    { title: "Liên hệ", href: "/contact" },
  ],
  resources: [
    { title: "Tài nguyên", href: "/resources" },
    { title: "AI Innovation Lab", href: "/ai-lab" },
    { title: "ROI Calculator", href: "/tools/roi-calculator" },
    { title: "AI Readiness", href: "/tools/ai-readiness" },
  ],
};
