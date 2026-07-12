// File: src/data/solutions.ts
import type { Solution } from "@/types";

export const solutions: Solution[] = [
  {
    id: "ai-consulting",
    slug: "ai-consulting",
    title: "AI Consulting",
    shortTitle: "AI Consulting",
    description:
      "Tư vấn chiến lược AI toàn diện — từ đánh giá readiness, xác định use case đến roadmap triển khai đo lường được ROI.",
    problem:
      "Doanh nghiệp muốn áp dụng AI nhưng không biết bắt đầu từ đâu, use case nào mang lại giá trị thật, và làm sao để tránh thất bại trong các dự án AI.",
    solution:
      "Chúng tôi phân tích quy trình nghiệp vụ, dữ liệu hiện có và mục tiêu kinh doanh để thiết kế chiến lược AI phù hợp — ưu tiên use case có ROI cao nhất, xây dựng roadmap rõ ràng và khung đo lường hiệu quả.",
    icon: "Brain",
    process: [
      {
        step: 1,
        title: "AI Readiness Assessment",
        description: "Đánh giá mức độ sẵn sàng về dữ liệu, quy trình, hạ tầng và con người.",
      },
      {
        step: 2,
        title: "Use Case Discovery",
        description: "Xác định và ưu tiên các use case AI dựa trên impact, feasibility và ROI.",
      },
      {
        step: 3,
        title: "Strategy & Roadmap",
        description: "Thiết kế chiến lược AI 12–24 tháng với milestones, budget và KPI rõ ràng.",
      },
      {
        step: 4,
        title: "PoC & Validation",
        description: "Xây dựng Proof of Concept nhanh để validate giả định trước khi scale.",
      },
      {
        step: 5,
        title: "Governance Framework",
        description: "Thiết lập khung quản trị AI, ethics, data privacy và change management.",
      },
    ],
    techStack: ["OpenAI", "Python", "Azure AI", "AWS SageMaker", "LangChain", "Vector DB"],
    businessValue: [
      "Giảm 60% rủi ro thất bại dự án AI",
      "Xác định use case ROI cao trong 2–4 tuần",
      "Roadmap rõ ràng với budget và timeline",
      "Framework đo lường hiệu quả AI",
    ],
    color: "#2563EB",
  },
  {
    id: "software-development",
    slug: "software-development",
    title: "Software Development",
    shortTitle: "Software Dev",
    description:
      "Phát triển phần mềm enterprise-grade với AI-native architecture — từ web app, mobile đến platform AI phức tạp.",
    problem:
      "Doanh nghiệp cần hệ thống phần mềm tùy chỉnh tích hợp AI, nhưng đội ngũ nội bộ thiếu chuyên môn AI/ML hoặc không đủ capacity để deliver đúng tiến độ.",
    solution:
      "Đội ngũ full-stack + AI engineer của Infratek thiết kế và xây dựng hệ thống end-to-end: architecture, backend, frontend, AI models, DevOps và maintenance — với quy trình Agile và chất lượng production-ready.",
    icon: "Code2",
    process: [
      {
        step: 1,
        title: "Requirements & Architecture",
        description: "Phân tích yêu cầu, thiết kế system architecture và AI pipeline.",
      },
      {
        step: 2,
        title: "Agile Development",
        description: "Sprint 2 tuần, demo liên tục, feedback loop chặt chẽ với stakeholders.",
      },
      {
        step: 3,
        title: "AI Integration",
        description: "Tích hợp models, APIs, vector stores và inference pipeline.",
      },
      {
        step: 4,
        title: "QA & Security",
        description: "Automated testing, security audit, performance optimization.",
      },
      {
        step: 5,
        title: "Deploy & Support",
        description: "CI/CD, monitoring, SLA support và continuous improvement.",
      },
    ],
    techStack: ["React", "Next.js", ".NET", "Python", "PostgreSQL", "Docker", "Kubernetes"],
    businessValue: [
      "Time-to-market nhanh hơn 40%",
      "Architecture scale được theo business growth",
      "Code quality enterprise với test coverage cao",
      "Tích hợp AI native, không phải bolt-on",
    ],
    color: "#1D4ED8",
  },
  {
    id: "it-outsourcing",
    slug: "it-outsourcing",
    title: "IT Outsourcing",
    shortTitle: "IT Outsourcing",
    description:
      "Mở rộng đội ngũ engineering với các chuyên gia AI, full-stack và DevOps — linh hoạt, chất lượng cao, chi phí tối ưu.",
    problem:
      "Tuyển dụng talent AI/tech khó khăn, tốn thời gian và chi phí. Doanh nghiệp cần scale team nhanh mà vẫn đảm bảo quality và cultural fit.",
    solution:
      "Cung cấp dedicated team hoặc staff augmentation với engineers đã được vetting kỹ lưỡng. Quản lý delivery, communication và quality theo chuẩn quốc tế.",
    icon: "Users",
    process: [
      {
        step: 1,
        title: "Need Analysis",
        description: "Hiểu skill set, seniority, timezone và working model cần thiết.",
      },
      {
        step: 2,
        title: "Talent Matching",
        description: "Matching engineers phù hợp trong 1–2 tuần từ pool đã vetting.",
      },
      {
        step: 3,
        title: "Onboarding",
        description: "Tích hợp team vào workflow, tools và culture của client.",
      },
      {
        step: 4,
        title: "Delivery Management",
        description: "PM dedicated, sprint reporting, quality gate và SLA tracking.",
      },
      {
        step: 5,
        title: "Scale & Optimize",
        description: "Scale up/down linh hoạt, performance review và continuous improvement.",
      },
    ],
    techStack: ["React", ".NET", "Python", "Node.js", "Azure", "AWS", "Docker"],
    businessValue: [
      "Giảm 50% chi phí so với tuyển dụng in-house",
      "Team sẵn sàng trong 1–2 tuần",
      "Flexible scaling theo project demand",
      "Access to specialized AI talent",
    ],
    color: "#38BDF8",
  },
  {
    id: "digital-transformation",
    slug: "digital-transformation",
    title: "Digital Transformation",
    shortTitle: "Digital Transform",
    description:
      "Chuyển đổi số toàn diện lấy AI làm trung tâm — tự động hóa quy trình, số hóa tài liệu, và tối ưu vận hành bằng data-driven decisions.",
    problem:
      "Quy trình thủ công, dữ liệu phân mảnh, thiếu visibility — doanh nghiệp mất lợi thế cạnh tranh vì chưa số hóa và chưa tận dụng AI để tối ưu operations.",
    solution:
      "Chúng tôi thiết kế và triển khai chương trình chuyển đổi số end-to-end: process reengineering, document AI, workflow automation, data platform và AI-powered decision systems.",
    icon: "Sparkles",
    process: [
      {
        step: 1,
        title: "Digital Maturity Assessment",
        description: "Đánh giá hiện trạng số hóa, pain points và opportunity map.",
      },
      {
        step: 2,
        title: "Process Reengineering",
        description: "Tái thiết kế quy trình với automation-first mindset.",
      },
      {
        step: 3,
        title: "Platform Implementation",
        description: "Xây dựng data platform, document AI, workflow engine.",
      },
      {
        step: 4,
        title: "Change Management",
        description: "Training, adoption program và cultural transformation.",
      },
      {
        step: 5,
        title: "Continuous Optimization",
        description: "KPI monitoring, AI model improvement và process refinement.",
      },
    ],
    techStack: ["OCR", "RPA", "Kafka", "Redis", "PostgreSQL", "Power BI", "Azure"],
    businessValue: [
      "Giảm 70% thời gian xử lý quy trình thủ công",
      "Tăng accuracy và giảm human error",
      "Real-time visibility vào operations",
      "Foundation cho AI scale trong tương lai",
    ],
    color: "#2563EB",
  },
];