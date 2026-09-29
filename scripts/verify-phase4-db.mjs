import pg from "pg";

const connectionString = process.env.PREVIEW_DATABASE_URL;
if (!connectionString) throw new Error("PREVIEW_DATABASE_URL is required");

const slugs = [
  "crm-system", "dms-document-management", "hrm-human-resource-management",
  "e-pos-system", "e-office", "microsoft-365-deployment", "odoo-erp-implementation",
];
const client = new pg.Client({ connectionString });
await client.connect();
const records = await client.query(
  "SELECT slug, data_classification, review_state, _status FROM case_studies WHERE slug = ANY($1) ORDER BY slug",
  [slugs],
);
await client.end();

if (records.rows.length !== slugs.length) throw new Error(`Expected ${slugs.length} draft cases, found ${records.rows.length}`);
for (const row of records.rows) {
  const expectedClassification = row.slug === "crm-system" ? "verified" : "illustrative";
  if (row.data_classification !== expectedClassification || row.review_state !== "editing" || row._status !== "draft") {
    throw new Error(`Unexpected state for ${row.slug}: ${JSON.stringify(row)}`);
  }
}
console.log(JSON.stringify(records.rows, null, 2));
