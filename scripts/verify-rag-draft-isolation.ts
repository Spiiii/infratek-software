import nextEnv from "@next/env";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { assertMigrationTarget } from "./migration-target-guard.ts";

const fixtures = [
  ["crm-system", "CRM quản lý xuất khẩu nông sản", "crm-dashboard-summary.png", "crm-permissions-rbac.png"],
  ["dms-document-management", "DMS quản lý tài liệu doanh nghiệp", "dms-document-management-1.svg"],
  ["hrm-human-resource-management", "HRM quản lý nhân sự tập trung", "hrm-human-resource-management-1.svg"],
  ["e-pos-system", "E-POS quản lý điểm bán hàng", "e-pos-system-1.svg"],
  ["e-office", "E-Office số hóa quy trình văn phòng", "e-office-1.svg"],
  ["microsoft-365-deployment", "Triển khai Microsoft 365 cho doanh nghiệp", "microsoft-365-deployment-1.svg"],
  ["odoo-erp-implementation", "Triển khai Odoo ERP cho vận hành doanh nghiệp", "odoo-erp-implementation-1.svg"],
] as const;

nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
assertMigrationTarget("preview", databaseUrl);
const payload = await getPayload({ config });

try {
  let matches = 0;
  for (const fixture of fixtures) {
    const tokens = fixture.map((value) => value.toLocaleLowerCase("vi"));
    const result = await payload.db.pool.query(
      `SELECT count(*)::int AS matches FROM rag_chunks
       WHERE lower(doc_id) = ANY($1)
          OR lower(url) = ANY($1)
          OR lower(title) = ANY($1)
          OR lower(content) = ANY($1)
          OR EXISTS (SELECT 1 FROM unnest($1::text[]) token
                     WHERE lower(url) LIKE '%' || token || '%'
                        OR lower(title) LIKE '%' || token || '%'
                        OR lower(content) LIKE '%' || token || '%')`,
      [tokens],
    );
    matches += Number(result.rows[0]?.matches ?? 0);
  }
  if (matches > 0) throw new Error(`Draft isolation failed: ${matches} matching chunk(s)`);
  console.log(`RAG draft isolation: PASS (${fixtures.length}/${fixtures.length} fixtures absent)`);
} finally {
  await payload.db.destroy?.();
}
