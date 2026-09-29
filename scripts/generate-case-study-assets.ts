import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const cases = [
  ["dms-document-management", "DMS", "Tài liệu và quy trình", "#2563eb"],
  ["hrm-human-resource-management", "HRM", "Hồ sơ nhân sự", "#7c3aed"],
  ["e-pos-system", "E-POS", "Điểm bán hàng", "#ea580c"],
  ["e-office", "E-Office", "Văn phòng số", "#0891b2"],
  ["microsoft-365-deployment", "Microsoft 365", "Triển khai công cụ làm việc", "#0369a1"],
  ["odoo-erp-implementation", "Odoo ERP", "Quản trị nguồn lực", "#6d28d9"],
] as const;

const labels = ["Tổng quan giải pháp", "Luồng xử lý minh họa", "Kết quả kỳ vọng"];

for (const [slug, title, subtitle, accent] of cases) {
  const directory = path.join(process.cwd(), "content", "case-studies", slug, "images");
  await mkdir(directory, { recursive: true });
  for (const [index, label] of labels.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc">
<title id="title">${title}: ${label}</title><desc id="desc">Đồ họa minh họa, không phải ảnh chụp sản phẩm thật.</desc>
<rect width="1200" height="675" fill="#f8fafc"/><rect x="70" y="70" width="1060" height="535" rx="36" fill="#fff" stroke="#e2e8f0" stroke-width="3"/>
<circle cx="180" cy="180" r="62" fill="${accent}" opacity=".14"/><path d="M150 180h60M180 150v60" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
<text x="280" y="175" font-family="Arial,sans-serif" font-size="54" font-weight="700" fill="#0f172a">${title}</text>
<text x="280" y="225" font-family="Arial,sans-serif" font-size="26" fill="#475569">${subtitle}</text>
<rect x="130" y="310" width="280" height="150" rx="24" fill="${accent}" opacity=".10"/><rect x="460" y="310" width="280" height="150" rx="24" fill="${accent}" opacity=".16"/><rect x="790" y="310" width="280" height="150" rx="24" fill="${accent}" opacity=".22"/>
<path d="M410 385h50M740 385h50" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
<text x="130" y="535" font-family="Arial,sans-serif" font-size="30" font-weight="600" fill="#0f172a">${label}</text>
<text x="130" y="570" font-family="Arial,sans-serif" font-size="20" fill="#64748b">Hình minh họa nội bộ • không phải giao diện sản phẩm</text></svg>`;
    await writeFile(path.join(directory, `${slug}-${index + 1}.svg`), svg, "utf8");
  }
}
