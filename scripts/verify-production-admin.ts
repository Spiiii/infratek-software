import nextEnv from "@next/env";
import { getPayload } from "payload";

nextEnv.loadEnvConfig(process.cwd());
const { default: config } = await import("../payload.config");

const email = process.env.PAYLOAD_ADMIN_EMAIL;
const password = process.env.PAYLOAD_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error("PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD are required");
}

const payload = await getPayload({ config });
try {
  const result = await payload.login({
    collection: "users",
    data: { email, password },
  });
  if (!result.user) throw new Error("Production admin login returned no user");
  if (result.user.role !== "admin") {
    throw new Error(`Production admin role is ${String(result.user.role)}, expected admin`);
  }
  console.log(JSON.stringify({ login: "passed", email: result.user.email, role: result.user.role }));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  process.exit(process.exitCode ?? 0);
}
