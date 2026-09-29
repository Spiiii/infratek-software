export {};

const baseUrl = (process.env.PHASE4_BASE_URL ?? process.argv.find((value) => value.startsWith("http")) ?? "http://localhost:3000").replace(/\/$/, "");

const drafts = [
  { slug: "crm-system", tokens: ["CRM quản lý xuất khẩu nông sản", "crm-dashboard-summary.png", "crm-permissions-rbac.png"] },
  { slug: "dms-document-management", tokens: ["DMS quản lý tài liệu doanh nghiệp", "dms-document-management-1.svg"] },
  { slug: "hrm-human-resource-management", tokens: ["HRM quản lý nhân sự tập trung", "hrm-human-resource-management-1.svg"] },
  { slug: "e-pos-system", tokens: ["E-POS quản lý điểm bán hàng", "e-pos-system-1.svg"] },
  { slug: "e-office", tokens: ["E-Office số hóa quy trình văn phòng", "e-office-1.svg"] },
  { slug: "microsoft-365-deployment", tokens: ["Triển khai Microsoft 365 cho doanh nghiệp", "microsoft-365-deployment-1.svg"] },
  { slug: "odoo-erp-implementation", tokens: ["Triển khai Odoo ERP cho vận hành doanh nghiệp", "odoo-erp-implementation-1.svg"] },
];

const publicSurfaces = [
  "/", "/case-studies", "/sitemap.xml",
  "/solutions/ai-consulting", "/solutions/software-development",
  "/solutions/it-outsourcing", "/solutions/digital-transformation",
  "/api/case-studies?limit=100&depth=3", "/api/solutions?limit=100&depth=3",
];

const failures: string[] = [];
for (const route of publicSurfaces) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const body = await response.text();
  if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
  for (const draft of drafts) {
    for (const token of [draft.slug, ...draft.tokens]) {
      if (body.toLocaleLowerCase("vi").includes(token.toLocaleLowerCase("vi"))) failures.push(`${route}: leaked ${token}`);
    }
  }
}

for (const draft of drafts) {
  const page = await fetch(`${baseUrl}/case-studies/${draft.slug}`, { redirect: "manual" });
  if (page.status !== 404) failures.push(`/case-studies/${draft.slug}: expected 404, got ${page.status}`);
  const api = await fetch(`${baseUrl}/api/case-studies?where%5Bslug%5D%5Bequals%5D=${encodeURIComponent(draft.slug)}&depth=3`);
  const apiBody = await api.text();
  if (!api.ok) failures.push(`/api/case-studies (${draft.slug}): HTTP ${api.status}`);
  if ([draft.slug, ...draft.tokens].some((token) => apiBody.toLocaleLowerCase("vi").includes(token.toLocaleLowerCase("vi")))) {
    failures.push(`/api/case-studies: leaked ${draft.slug}`);
  }
}

if (failures.length) {
  console.error("Phase 4 draft isolation: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 4 draft isolation: PASS (${drafts.length} draft slugs, ${publicSurfaces.length} public surfaces)`);
