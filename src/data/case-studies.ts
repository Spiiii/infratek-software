// File: src/data/case-studies.ts
import type { CaseStudy } from "@/types";

export const caseStudies: CaseStudy[] = [
  {
    id: "camera-ai",
    slug: "camera-ai-transformation",
    title: "Camera AI Transformation",
    client: "Enterprise Manufacturing",
    industry: "Manufacturing & Security",
    summary:
      "Hệ thống Camera AI thông minh giám sát an ninh, phát hiện bất thường và phân tích hành vi theo thời gian thực cho nhà máy sản xuất quy mô lớn.",
    challenge:
      "Nhà máy có hơn 200 camera nhưng vẫn phụ thuộc hoàn toàn vào giám sát viên. Không thể phát hiện kịp thời các sự cố an ninh, vi phạm an toàn lao động, và không có dữ liệu analytics để tối ưu operations. Chi phí nhân sự giám sát cao nhưng hiệu quả thấp.",
    solution:
      "Xây dựng platform Camera AI end-to-end: edge inference với YOLO + TensorRT, central management dashboard, real-time alert system, và analytics engine. Hệ thống phát hiện người lạ, PPE compliance, zone intrusion, fire/smoke và crowd density — xử lý song song trên toàn bộ camera network.",
    architecture: [
      {
        id: "cameras",
        label: "IP Camera Network",
        type: "input",
        description: "200+ camera RTSP streams",
      },
      {
        id: "edge",
        label: "Edge Inference",
        type: "ai",
        description: "YOLO + TensorRT on GPU edge devices",
      },
      {
        id: "kafka",
        label: "Event Stream",
        type: "process",
        description: "Kafka real-time event pipeline",
      },
      {
        id: "api",
        label: "AI Platform API",
        type: "process",
        description: ".NET Core microservices",
      },
      {
        id: "db",
        label: "Data Store",
        type: "storage",
        description: "PostgreSQL + Redis + Object Storage",
      },
      {
        id: "dashboard",
        label: "Command Center",
        type: "output",
        description: "React real-time dashboard & alerts",
      },
    ],
    techStack: [
      "YOLO",
      "TensorRT",
      "OpenCV",
      "Python",
      ".NET",
      "React",
      "Kafka",
      "Redis",
      "PostgreSQL",
      "Docker",
      "NVIDIA GPU",
    ],
    implementationFlow: [
      {
        step: 1,
        title: "Camera Audit & Network Design",
        description: "Survey 200+ cameras, bandwidth analysis, edge device placement.",
      },
      {
        step: 2,
        title: "Model Training & Optimization",
        description: "Custom dataset, YOLO fine-tuning, TensorRT optimization for edge.",
      },
      {
        step: 3,
        title: "Edge Deployment",
        description: "Deploy inference pipeline trên GPU edge servers tại site.",
      },
      {
        step: 4,
        title: "Platform & Dashboard",
        description: "Build central API, real-time dashboard, alert rules engine.",
      },
      {
        step: 5,
        title: "Integration & Go-live",
        description: "Integrate với security system, training operators, go-live phased.",
      },
    ],
    results: [
      {
        title: "Phát hiện real-time",
        description: "Cảnh báo sự cố trong < 2 giây thay vì phụ thuộc giám sát viên.",
      },
      {
        title: "Giảm chi phí nhân sự",
        description: "Giảm 60% số lượng giám sát viên cần thiết cho cùng coverage.",
      },
      {
        title: "PPE Compliance",
        description: "Tự động phát hiện vi phạm an toàn lao động 24/7.",
      },
      {
        title: "Analytics Insights",
        description: "Heatmap, traffic flow và occupancy data cho operations optimization.",
      },
    ],
    metrics: [
      {
        label: "Detection Accuracy",
        value: 96,
        suffix: "%",
        description: "Độ chính xác phát hiện trung bình",
      },
      {
        label: "Alert Latency",
        value: 2,
        suffix: "s",
        prefix: "<",
        description: "Thời gian từ sự kiện đến cảnh báo",
      },
      {
        label: "Cost Reduction",
        value: 60,
        suffix: "%",
        description: "Giảm chi phí giám sát nhân sự",
      },
      {
        label: "Cameras Covered",
        value: 200,
        suffix: "+",
        description: "Số camera được AI hóa",
      },
    ],
    gallery: [],
    featured: true,
    coverGradient: "from-blue-600 to-sky-400",
    year: "2024",
    dataClassification: "illustrative",
  },
  {
    id: "ocr",
    slug: "ocr-document-intelligence",
    title: "OCR Document Intelligence",
    client: "Financial Services Group",
    industry: "Finance & Banking",
    summary:
      "Hệ thống OCR thông minh trích xuất và xử lý tự động hàng ngàn chứng từ tài chính mỗi ngày với độ chính xác cao.",
    challenge:
      "Mỗi ngày phòng ban xử lý hàng nghìn hóa đơn, hợp đồng, giấy tờ tùy thân bằng tay. Thời gian xử lý chậm, lỗi nhập liệu cao, bottleneck nghiêm trọng trong quy trình phê duyệt và không scale được khi volume tăng.",
    solution:
      "Xây dựng Document AI platform: multi-model OCR pipeline (printed + handwritten), intelligent document classification, key-value extraction, validation rules engine, và human-in-the-loop review UI. Tích hợp trực tiếp vào core banking workflow.",
    architecture: [
      {
        id: "upload",
        label: "Document Intake",
        type: "input",
        description: "Scan, email, API upload",
      },
      {
        id: "classify",
        label: "Doc Classification",
        type: "ai",
        description: "CNN + LLM classification",
      },
      {
        id: "ocr",
        label: "OCR Engine",
        type: "ai",
        description: "Multi-engine OCR pipeline",
      },
      {
        id: "extract",
        label: "Data Extraction",
        type: "ai",
        description: "Key-value + table extraction",
      },
      {
        id: "validate",
        label: "Validation Engine",
        type: "process",
        description: "Business rules + confidence scoring",
      },
      {
        id: "review",
        label: "Human Review",
        type: "output",
        description: "Exception handling UI",
      },
    ],
    techStack: [
      "Python",
      "OpenCV",
      "PaddleOCR",
      "Transformers",
      ".NET",
      "React",
      "PostgreSQL",
      "Redis",
      "Azure",
      "Docker",
    ],
    implementationFlow: [
      {
        step: 1,
        title: "Document Analysis",
        description: "Phân loại 50+ loại chứng từ, xác định fields cần extract.",
      },
      {
        step: 2,
        title: "OCR Pipeline Build",
        description: "Multi-engine OCR, preprocessing, layout analysis.",
      },
      {
        step: 3,
        title: "Extraction Models",
        description: "Train/fine-tune extraction models cho từng document type.",
      },
      {
        step: 4,
        title: "Workflow Integration",
        description: "API integration với core system, review UI, audit trail.",
      },
      {
        step: 5,
        title: "Production & Tuning",
        description: "Go-live, continuous accuracy improvement từ feedback loop.",
      },
    ],
    results: [
      {
        title: "Tự động hóa 85%",
        description: "85% chứng từ được xử lý hoàn toàn tự động không cần human review.",
      },
      {
        title: "Giảm thời gian xử lý",
        description: "Từ 15 phút/chứng từ xuống còn dưới 30 giây.",
      },
      {
        title: "Accuracy cao",
        description: "Field-level accuracy đạt 98%+ trên printed documents.",
      },
      {
        title: "Scale linh hoạt",
        description: "Xử lý peak load 10x mà không cần thêm nhân sự.",
      },
    ],
    metrics: [
      {
        label: "Automation Rate",
        value: 85,
        suffix: "%",
        description: "Tỷ lệ xử lý tự động hoàn toàn",
      },
      {
        label: "Accuracy",
        value: 98,
        suffix: "%",
        description: "Field-level extraction accuracy",
      },
      {
        label: "Time per Doc",
        value: 30,
        suffix: "s",
        prefix: "<",
        description: "Thời gian xử lý mỗi chứng từ",
      },
      {
        label: "Daily Volume",
        value: 5000,
        suffix: "+",
        description: "Số chứng từ xử lý mỗi ngày",
      },
    ],
    gallery: [],
    featured: true,
    coverGradient: "from-blue-700 to-blue-400",
    year: "2024",
    dataClassification: "illustrative",
  },
  {
    id: "interview-ai",
    slug: "interview-ai",
    title: "Interview AI",
    client: "HR Tech Platform",
    industry: "Human Resources",
    summary:
      "Nền tảng AI hỗ trợ phỏng vấn tuyển dụng — đánh giá ứng viên tự động, phân tích câu trả lời và ranking thông minh.",
    challenge:
      "Quy trình tuyển dụng tốn nhiều thời gian của HR và hiring manager. Screening CV thủ công, phỏng vấn sơ bộ lặp lại, bias trong đánh giá, và thiếu data-driven insights để cải thiện hiring quality.",
    solution:
      "Xây dựng Interview AI platform: AI-powered CV screening, automated video interview với speech-to-text + NLP analysis, competency scoring, bias detection, và ranking dashboard. Hiring managers nhận structured assessment reports thay vì phải phỏng vấn tất cả.",
    architecture: [
      {
        id: "cv",
        label: "CV Intake",
        type: "input",
        description: "Resume parsing & screening",
      },
      {
        id: "video",
        label: "Video Interview",
        type: "input",
        description: "Async video responses",
      },
      {
        id: "stt",
        label: "Speech-to-Text",
        type: "ai",
        description: "Whisper / Azure STT",
      },
      {
        id: "nlp",
        label: "NLP Analysis",
        type: "ai",
        description: "LLM competency scoring",
      },
      {
        id: "rank",
        label: "Ranking Engine",
        type: "process",
        description: "Multi-criteria ranking",
      },
      {
        id: "report",
        label: "Assessment Report",
        type: "output",
        description: "Structured hiring insights",
      },
    ],
    techStack: [
      "OpenAI",
      "Whisper",
      "Python",
      "LangChain",
      "React",
      "Next.js",
      ".NET",
      "PostgreSQL",
      "Azure",
      "Redis",
    ],
    implementationFlow: [
      {
        step: 1,
        title: "Hiring Process Mapping",
        description: "Map competencies, interview questions, scoring rubrics.",
      },
      {
        step: 2,
        title: "CV Screening Engine",
        description: "Build resume parser, skill matching, ranking model.",
      },
      {
        step: 3,
        title: "Interview AI Pipeline",
        description: "Video capture, STT, NLP analysis, competency scoring.",
      },
      {
        step: 4,
        title: "Dashboard & Reports",
        description: "HR dashboard, candidate ranking, assessment reports.",
      },
      {
        step: 5,
        title: "Bias Audit & Launch",
        description: "Fairness testing, bias mitigation, pilot với real hiring.",
      },
    ],
    results: [
      {
        title: "Giảm 70% thời gian screening",
        description: "HR tiết kiệm hàng chục giờ mỗi tuần cho CV screening và phone screen.",
      },
      {
        title: "Hiring quality tăng",
        description: "Structured assessment giúp giảm bad hires và tăng retention.",
      },
      {
        title: "Consistent evaluation",
        description: "Mọi ứng viên được đánh giá theo cùng criteria, giảm bias.",
      },
      {
        title: "Candidate experience",
        description: "Async interview linh hoạt, feedback nhanh hơn cho ứng viên.",
      },
    ],
    metrics: [
      {
        label: "Time Saved",
        value: 70,
        suffix: "%",
        description: "Giảm thời gian screening & phone interview",
      },
      {
        label: "Screening Accuracy",
        value: 92,
        suffix: "%",
        description: "Độ chính xác matching ứng viên",
      },
      {
        label: "Candidates/Month",
        value: 1000,
        suffix: "+",
        description: "Số ứng viên xử lý mỗi tháng",
      },
      {
        label: "Bias Reduction",
        value: 45,
        suffix: "%",
        description: "Giảm variance trong scoring giữa evaluators",
      },
    ],
    gallery: [],
    featured: true,
    coverGradient: "from-sky-600 to-blue-500",
    year: "2023",
    dataClassification: "illustrative",
  },
  {
    id: "pms",
    slug: "pms-project-management",
    title: "PMS — AI Project Management",
    client: "Multi-industry Enterprises",
    industry: "Enterprise Software",
    summary:
      "Hệ thống quản lý dự án thông minh tích hợp AI — dự đoán rủi ro, tối ưu resource allocation và tự động hóa reporting.",
    challenge:
      "Quản lý nhiều dự án song song thiếu visibility, resource conflict thường xuyên, risk phát hiện muộn, và reporting thủ công tốn thời gian. PM dành quá nhiều thời gian cho admin thay vì strategic work.",
    solution:
      "Xây dựng AI-powered PMS: intelligent resource matching, risk prediction models, automated status reporting từ work activity, smart scheduling, và executive dashboard với predictive insights. Tích hợp AI assistant hỗ trợ PM ra quyết định.",
    architecture: [
      {
        id: "projects",
        label: "Project Data",
        type: "input",
        description: "Tasks, resources, timelines",
      },
      {
        id: "activity",
        label: "Activity Stream",
        type: "input",
        description: "Commits, time logs, updates",
      },
      {
        id: "ai-engine",
        label: "AI Engine",
        type: "ai",
        description: "Risk prediction + optimization",
      },
      {
        id: "scheduler",
        label: "Smart Scheduler",
        type: "process",
        description: "Resource optimization engine",
      },
      {
        id: "db",
        label: "Project DB",
        type: "storage",
        description: "PostgreSQL + event store",
      },
      {
        id: "dashboard",
        label: "PM Dashboard",
        type: "output",
        description: "Predictive insights & reports",
      },
    ],
    techStack: [
      "React",
      "Next.js",
      ".NET",
      "Python",
      "PostgreSQL",
      "Redis",
      "OpenAI",
      "Docker",
      "Azure",
    ],
    implementationFlow: [
      {
        step: 1,
        title: "Process & Data Audit",
        description: "Map project workflows, data sources, pain points.",
      },
      {
        step: 2,
        title: "Core PMS Build",
        description: "Project, task, resource, timeline management modules.",
      },
      {
        step: 3,
        title: "AI Features",
        description: "Risk models, resource optimization, auto-reporting.",
      },
      {
        step: 4,
        title: "Integrations",
        description: "Git, Slack, email, calendar, existing tools.",
      },
      {
        step: 5,
        title: "Rollout & Adoption",
        description: "Phased rollout, training, feedback-driven iteration.",
      },
    ],
    results: [
      {
        title: "Visibility real-time",
        description: "Executive và PM có real-time view across all projects.",
      },
      {
        title: "Risk early warning",
        description: "AI phát hiện project risk trung bình sớm hơn 2 tuần.",
      },
      {
        title: "Reporting tự động",
        description: "Giảm 80% thời gian tạo status report hàng tuần.",
      },
      {
        title: "Resource utilization",
        description: "Tăng 25% resource utilization nhờ smart allocation.",
      },
    ],
    metrics: [
      {
        label: "Risk Early Detect",
        value: 14,
        suffix: " days",
        description: "Phát hiện risk sớm hơn trung bình",
      },
      {
        label: "Report Time Saved",
        value: 80,
        suffix: "%",
        description: "Giảm thời gian tạo reports",
      },
      {
        label: "Utilization Gain",
        value: 25,
        suffix: "%",
        description: "Tăng resource utilization",
      },
      {
        label: "Projects Managed",
        value: 100,
        suffix: "+",
        description: "Số dự án đồng thời trên platform",
      },
    ],
    gallery: [],
    featured: true,
    coverGradient: "from-blue-800 to-sky-500",
    year: "2023",
    dataClassification: "illustrative",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((cs) => cs.slug === slug);
}
