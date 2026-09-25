import config from "@payload-config";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

const allowedPath = /^\/(solutions|case-studies|blog)\/[a-z0-9-]+$/;

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !allowedPath.test(path)) {
    return new Response("Invalid preview path", { status: 400 });
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user || !["admin", "reviewer"].includes(user.role)) {
    return new Response("Reviewer or admin authentication required", { status: 403 });
  }

  (await draftMode()).enable();
  redirect(path);
}

export async function POST() {
  (await draftMode()).disable();
  redirect("/");
}

