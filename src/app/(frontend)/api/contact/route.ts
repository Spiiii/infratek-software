import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestsByClient = new Map<string, number[]>();

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string, now = Date.now()) {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (requestsByClient.get(key) || []).filter((time) => time > cutoff);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestsByClient.set(key, recent);
    return true;
  }

  requestsByClient.set(key, [...recent, now]);
  return false;
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request);
    if (isRateLimited(clientKey)) {
      return Response.json(
        { error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const body: unknown = await request.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "website" in body &&
      typeof body.website === "string" &&
      body.website.trim().length > 0
    ) {
      return Response.json({ success: true });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Dịch vụ email chưa được cấu hình." },
        { status: 503 }
      );
    }

    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Dữ liệu biểu mẫu không hợp lệ." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "Website Infratek <admin@infratek.vn>",
      to: [process.env.CONTACT_RECIPIENT || "trong.ngo@infratek.vn"],
      replyTo: data.email,
      subject: `[Website] Liên hệ mới từ ${data.name}`,
      text: [
        `Họ tên: ${data.name}`,
        `Email: ${data.email}`,
        `Số điện thoại: ${data.phone}`,
        `Công ty: ${data.company}`,
        `Chức vụ: ${data.position}`,
        "",
        "Tin nhắn:",
        data.message,
      ].join("\n"),
    });

    if (error) {
      console.error(error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Có lỗi xảy ra." }, { status: 500 });
  }
}
