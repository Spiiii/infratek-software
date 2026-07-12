import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Dữ liệu biểu mẫu không hợp lệ." },
        { status: 400 }
      );
    }

    const data = parsed.data;

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