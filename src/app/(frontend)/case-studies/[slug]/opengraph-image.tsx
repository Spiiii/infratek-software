import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getCaseStudyBySlug } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const caseStudy = await getCaseStudyBySlug((await params).slug);
  if (!caseStudy) notFound();

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg,#071a33,#0f5fd7)", color: "white", padding: "72px" }}>
      <div style={{ display: "flex", fontSize: 28, color: "#93c5fd" }}>INFRATEK SOFTWARE · CASE STUDY</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.08 }}>{caseStudy.title}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#dbeafe" }}>{caseStudy.industry} · {caseStudy.year}</div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#bfdbfe" }}>{caseStudy.dataClassification === "illustrative" ? "Tình huống minh họa" : "Case study đã xác minh"}</div>
    </div>,
    size,
  );
}
