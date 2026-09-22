import nextEnv from "@next/env";
import { getPayload } from "payload";

nextEnv.loadEnvConfig(process.cwd());
const { default: config } = await import("../payload.config");

const email = process.env.PAYLOAD_ADMIN_EMAIL;
const password = process.env.PAYLOAD_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error(
    "PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD must be set in .env.local"
  );
}

const payload = await getPayload({ config });
const existingUsers = await payload.count({ collection: "users" });

if (existingUsers.totalDocs > 0) {
  console.log("Admin bootstrap skipped: the users collection is not empty.");
  process.exit(0);
}

await payload.create({
  collection: "users",
  data: {
    email,
    password,
    role: "admin",
  },
});

console.log(`Initial Payload admin created for ${email}.`);
process.exit(0);
