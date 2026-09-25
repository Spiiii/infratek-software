import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Authors } from "./src/collections/Authors";
import { CaseStudies } from "./src/collections/CaseStudies";
import { Media } from "./src/collections/Media";
import { Pages } from "./src/collections/Pages";
import { Posts } from "./src/collections/Posts";
import { Solutions } from "./src/collections/Solutions";
import { Technologies } from "./src/collections/Technologies";
import { Users } from "./src/collections/Users";
import { CompanyFacts } from "./src/globals/CompanyFacts";
import { Faq } from "./src/globals/Faq";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Solutions,
    CaseStudies,
    Posts,
    Pages,
    Technologies,
    Authors,
  ],
  globals: [CompanyFacts, Faq],
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URL ??
        "postgresql://payload:payload@127.0.0.1:5432/infratek_phase0",
    },
  }),
  editor: lexicalEditor(),
  maxDepth: 3,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: {
          prefix: "infratek-media",
        },
      },
      clientUploads: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? "phase-0-spike-only-not-for-production",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});
