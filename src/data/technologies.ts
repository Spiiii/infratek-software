// File: src/data/technologies.ts
import type { Technology, AICoreNode, TimelineStep, DownloadResource, InnovationProject } from "@/types";

export const technologies: Technology[] = [
  { id: "openai", name: "OpenAI", category: "ai", description: "GPT models, embeddings, Assistants API" },
  { id: "python", name: "Python", category: "backend", description: "AI/ML pipelines, data processing, APIs" },
  { id: "dotnet", name: ".NET", category: "backend", description: "Enterprise backend, microservices" },
  { id: "react", name: "React", category: "frontend", description: "Modern web applications & dashboards" },
  { id: "docker", name: "Docker", category: "devops", description: "Containerization & deployment" },
  { id: "kubernetes", name: "Kubernetes", category: "devops", description: "Container orchestration at scale" },
  { id: "azure", name: "Azure", category: "cloud", description: "Cloud infrastructure & AI services" },
  { id: "aws", name: "AWS", category: "cloud", description: "Cloud compute, storage & ML" },
  { id: "yolo", name: "YOLO", category: "ai", description: "Real-time object detection" },
  { id: "opencv", name: "OpenCV", category: "ai", description: "Computer vision processing" },
  { id: "redis", name: "Redis", category: "data", description: "Caching, pub/sub, real-time data" },
  { id: "kafka", name: "Kafka", category: "data", description: "Event streaming platform" },
  { id: "tensorrt", name: "TensorRT", category: "ai", description: "GPU inference optimization" },
  { id: "postgresql", name: "PostgreSQL", category: "data", description: "Primary relational database" },
];

export const trustedLogos = [
  "OpenAI",
  "Microsoft Azure",
  "AWS",
  "NVIDIA",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "React",
];

export const aiCoreNodes: AICoreNode[] = [
  {
    id: "camera-ai",
    label: "Camera AI",
    description: "Phát hiện đối tượng, phân tích hành vi và cảnh báo real-time từ camera network.",
    angle: 0,
    distance: 180,
  },
  {
    id: "ocr",
    label: "OCR",
    description: "Trích xuất thông minh từ chứng từ, hóa đơn, hợp đồng với accuracy 98%+.",
    angle: 60,
    distance: 180,
  },
  {
    id: "interview-ai",
    label: "Interview AI",
    description: "Đánh giá ứng viên tự động bằng NLP, speech analysis và competency scoring.",
    angle: 120,
    distance: 180,
  },
  {
    id: "pms",
    label: "PMS",
    description: "Quản lý dự án thông minh với risk prediction và resource optimization.",
    angle: 180,
    distance: 180,
  },
  {
    id: "automation",
    label: "Automation",
    description: "Tự động hóa quy trình nghiệp vụ end-to-end với AI-powered workflows.",
    angle: 240,
    distance: 180,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Phân tích dữ liệu thông minh, predictive insights và decision support.",
    angle: 300,
    distance: 180,
  },
];

export const transformationTimeline: TimelineStep[] = [
  {
    id: "analysis",
    title: "Business Analysis",
    description: "Phân tích quy trình, pain points, data landscape và xác định AI opportunities.",
    icon: "Search",
  },
  {
    id: "data",
    title: "Data Collection",
    description: "Thu thập, làm sạch, label dữ liệu và xây dựng data pipeline chất lượng.",
    icon: "Database",
  },
  {
    id: "training",
    title: "Model Training",
    description: "Train, fine-tune và evaluate AI models trên data thực tế của doanh nghiệp.",
    icon: "Brain",
  },
  {
    id: "deploy",
    title: "Deployment",
    description: "Deploy production-ready với CI/CD, monitoring, scaling và security.",
    icon: "Rocket",
  },
  {
    id: "monitor",
    title: "Monitoring",
    description: "Theo dõi model performance, data drift, system health và business KPIs.",
    icon: "Activity",
  },
  {
    id: "improve",
    title: "Continuous Improvement",
    description: "Feedback loop, retraining, optimization và expand sang use cases mới.",
    icon: "TrendingUp",
  },
];

export const downloadResources: DownloadResource[] = [
  {
    id: "company-profile",
    title: "Company Profile",
    description: "Hồ sơ năng lực Infratek Software — tổng quan dịch vụ, dự án và đội ngũ.",
    type: "pdf",
    size: "2.4 MB",
    category: "Company",
  },
  {
    id: "service-brochure",
    title: "Service Brochure",
    description: "Brochure chi tiết các giải pháp AI, Software Development và IT Outsourcing.",
    type: "pdf",
    size: "3.1 MB",
    category: "Services",
  },
  {
    id: "ai-whitepaper",
    title: "AI Whitepaper",
    description: "Whitepaper: Chiến lược triển khai AI cho doanh nghiệp vừa và lớn tại Việt Nam.",
    type: "pdf",
    size: "1.8 MB",
    category: "AI",
  },
  {
    id: "ocr-guide",
    title: "OCR Implementation Guide",
    description: "Hướng dẫn triển khai OCR/Document AI từ PoC đến production.",
    type: "pdf",
    size: "2.0 MB",
    category: "OCR",
  },
  {
    id: "ai-checklist",
    title: "Enterprise AI Checklist",
    description: "Checklist 50 điểm đánh giá AI readiness và preparation cho doanh nghiệp.",
    type: "checklist",
    size: "0.5 MB",
    category: "AI",
  },
];

export const innovationProjects: InnovationProject[] = [
  {
    id: "ai-agent",
    title: "Enterprise AI Agent",
    description: "Autonomous agent thực hiện multi-step business tasks với tool use, memory và human oversight.",
    status: "prototype",
    tags: ["LLM", "Agents", "Tool Use"],
  },
  {
    id: "voice-ai",
    title: "Voice AI Platform",
    description: "Real-time voice conversation AI cho customer service, với Vietnamese STT/TTS tối ưu.",
    status: "research",
    tags: ["Speech", "NLP", "Real-time"],
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Orchestration",
    description: "Framework điều phối multiple specialized agents cho complex enterprise workflows.",
    status: "prototype",
    tags: ["Multi-Agent", "Orchestration", "LLM"],
  },
  {
    id: "vlm",
    title: "Vision Language Models",
    description: "VLM applications cho document understanding, visual QA và scene analysis.",
    status: "research",
    tags: ["VLM", "Computer Vision", "Multimodal"],
  },
  {
    id: "document-ai",
    title: "Document AI Suite",
    description: "End-to-end document intelligence: classification, extraction, validation, generation.",
    status: "production",
    tags: ["OCR", "Document AI", "NLP"],
  },
  {
    id: "llm-apps",
    title: "LLM Application Framework",
    description: "Internal framework để build, evaluate và deploy LLM applications nhanh chóng.",
    status: "production",
    tags: ["LLM", "RAG", "Framework"],
  },
];