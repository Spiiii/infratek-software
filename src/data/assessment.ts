// File: src/data/assessment.ts
import type { AssessmentQuestion } from "@/types";

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: "q1",
    question: "Doanh nghiệp của bạn hiện đang ở giai đoạn nào với dữ liệu?",
    options: [
      { label: "Dữ liệu chủ yếu trên giấy / Excel rời rạc", score: 1 },
      { label: "Có hệ thống phần mềm nhưng data phân mảnh", score: 2 },
      { label: "Có data warehouse / data lake cơ bản", score: 3 },
      { label: "Data platform hoàn chỉnh, governed và accessible", score: 4 },
    ],
  },
  {
    id: "q2",
    question: "Mức độ số hóa quy trình nghiệp vụ hiện tại?",
    options: [
      { label: "Hầu hết quy trình vẫn thủ công", score: 1 },
      { label: "Một số quy trình đã có phần mềm hỗ trợ", score: 2 },
      { label: "Phần lớn quy trình đã được số hóa", score: 3 },
      { label: "Quy trình digital-native với automation", score: 4 },
    ],
  },
  {
    id: "q3",
    question: "Doanh nghiệp đã từng triển khai dự án AI/ML nào chưa?",
    options: [
      { label: "Chưa từng, mới tìm hiểu", score: 1 },
      { label: "Đã thử PoC nhưng chưa production", score: 2 },
      { label: "Có 1–2 use case đang chạy production", score: 3 },
      { label: "Nhiều AI systems, có MLOps practice", score: 4 },
    ],
  },
  {
    id: "q4",
    question: "Năng lực AI trong đội ngũ nội bộ?",
    options: [
      { label: "Chưa có ai có kinh nghiệm AI/ML", score: 1 },
      { label: "Có 1–2 người quan tâm / tự học", score: 2 },
      { label: "Có data/AI team nhỏ", score: 3 },
      { label: "Có AI team chuyên biệt với production experience", score: 4 },
    ],
  },
  {
    id: "q5",
    question: "Leadership commitment với AI transformation?",
    options: [
      { label: "Chưa có discussion ở mức leadership", score: 1 },
      { label: "Có quan tâm nhưng chưa có budget/plan", score: 2 },
      { label: "Đã có budget và sponsor rõ ràng", score: 3 },
      { label: "AI là strategic priority với OKRs", score: 4 },
    ],
  },
  {
    id: "q6",
    question: "Hạ tầng IT hiện tại sẵn sàng cho AI như thế nào?",
    options: [
      { label: "On-premise truyền thống, chưa cloud", score: 1 },
      { label: "Đang migrate cloud / hybrid", score: 2 },
      { label: "Cloud-first với basic ML services", score: 3 },
      { label: "Cloud-native với GPU capacity và MLOps", score: 4 },
    ],
  },
];

export function calculateAssessmentResult(scores: number[]) {
  const total = scores.reduce((a, b) => a + b, 0);
  const maxScore = assessmentQuestions.length * 4;
  const percentage = Math.round((total / maxScore) * 100);

  let level: "beginner" | "intermediate" | "advanced" | "leader";
  let recommendations: string[];
  let solutions: string[];

  if (percentage <= 35) {
    level = "beginner";
    recommendations = [
      "Bắt đầu với AI Readiness Assessment chi tiết",
      "Số hóa quy trình và xây dựng data foundation trước",
      "Xác định 1–2 quick-win use cases có data sẵn",
      "Đầu tư AI literacy cho leadership và team key",
    ];
    solutions = ["AI Consulting", "Digital Transformation"];
  } else if (percentage <= 55) {
    level = "intermediate";
    recommendations = [
      "Tập trung vào data quality và process standardization",
      "Chạy PoC cho 2–3 use cases ưu tiên cao",
      "Xây dựng AI governance framework cơ bản",
      "Consider partner với AI specialist team",
    ];
    solutions = ["AI Consulting", "Software Development", "OCR"];
  } else if (percentage <= 75) {
    level = "advanced";
    recommendations = [
      "Scale các use case đã proven sang production",
      "Xây dựng MLOps pipeline và AI platform nội bộ",
      "Expand sang multi-agent và advanced AI capabilities",
      "Đo lường ROI và optimize continuous",
    ];
    solutions = ["Software Development", "Camera AI", "IT Outsourcing"];
  } else {
    level = "leader";
    recommendations = [
      "Xây dựng AI Center of Excellence",
      "Explore cutting-edge: multi-agent, VLM, autonomous systems",
      "Share knowledge và contribute to AI ecosystem",
      "Optimize cost-efficiency của AI infrastructure",
    ];
    solutions = ["AI Innovation Lab", "Multi-Agent Systems", "IT Outsourcing"];
  }

  return { score: percentage, level, recommendations, solutions };
}