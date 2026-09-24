import { ImageResponse } from "next/og";
import { getCompany } from "@/lib/content";

export const dynamic = "force-static";

export async function GET() {
  const company = await getCompany();
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #07152f 0%, #1648bd 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ color: "#67e8f9", display: "flex", fontSize: 28 }}>
          INFRATEK SOFTWARE
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.12, marginTop: 28 }}>
          {company.tagline}
        </div>
        <div style={{ color: "#dbeafe", display: "flex", fontSize: 28, marginTop: 34 }}>
          AI Consulting · Software Development · Digital Transformation
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
